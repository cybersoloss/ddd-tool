import { create } from 'zustand';
import { nanoid } from 'nanoid';
import { invoke } from '@tauri-apps/api/core';
import type { AgentTestSession, AgentTestStep } from '../types/agent-test';
import type { DddFlowNode, FlowDocument, AgentLoopSpec } from '../types/flow';
import { useFlowStore } from './flow-store';
import { useAppStore } from './app-store';

type PanelState = 'idle' | 'configuring' | 'running' | 'results';

interface AgentTestState {
  panelOpen: boolean;
  panelState: PanelState;
  currentSession: AgentTestSession | null;
  sessionHistory: AgentTestSession[];

  togglePanel: () => void;
  startNewTest: (flowId: string, domainId: string) => void;
  setInput: (input: Record<string, unknown>) => void;
  runTest: () => Promise<void>;
  reset: () => void;
}

function walkFlowGraph(flow: FlowDocument): DddFlowNode[] {
  if (!flow.trigger) return [];
  const allNodes = [flow.trigger, ...(flow.nodes ?? [])];
  const nodeMap = new Map(allNodes.map((n) => [n.id, n]));
  const visited = new Set<string>();
  const order: DddFlowNode[] = [];

  function dfs(nodeId: string) {
    if (visited.has(nodeId)) return;
    visited.add(nodeId);
    const node = nodeMap.get(nodeId);
    if (!node) return;
    order.push(node);
    for (const conn of node.connections ?? []) {
      dfs(conn.targetNodeId);
    }
  }

  dfs(flow.trigger.id);
  return order;
}

export const useAgentTestStore = create<AgentTestState>((set, get) => ({
  panelOpen: false,
  panelState: 'idle',
  currentSession: null,
  sessionHistory: [],

  togglePanel: () => {
    const open = !get().panelOpen;
    set({ panelOpen: open });
    if (!open) {
      set({ panelState: 'idle', currentSession: null });
    }
  },

  startNewTest: (flowId, domainId) => {
    set({
      panelState: 'configuring',
      currentSession: {
        id: nanoid(),
        flowId,
        domainId,
        status: 'configuring',
        input: {},
        steps: [],
      },
    });
  },

  setInput: (input) => {
    const session = get().currentSession;
    if (session) {
      set({ currentSession: { ...session, input } });
    }
  },

  runTest: async () => {
    const session = get().currentSession;
    if (!session) return;

    const flow = useFlowStore.getState().currentFlow;
    if (!flow) return;

    const ordered = walkFlowGraph(flow);
    const steps: AgentTestStep[] = ordered.map((node) => ({
      id: nanoid(),
      nodeId: node.id,
      nodeLabel: node.label,
      nodeType: node.type,
      status: 'pending',
    }));

    set({
      panelState: 'running',
      currentSession: {
        ...session,
        status: 'running',
        steps,
        startedAt: new Date().toISOString(),
      },
    });

    // Execute steps sequentially with simulated delays
    for (let i = 0; i < steps.length; i++) {
      const node = ordered[i];

      // Update step to running
      const updatedSteps = [...get().currentSession!.steps];
      updatedSteps[i] = { ...updatedSteps[i], status: 'running' };
      set({
        currentSession: { ...get().currentSession!, steps: updatedSteps },
      });

      const startTime = Date.now();
      let output: Record<string, unknown> = {};
      let error: string | undefined;

      try {
        if (node.type === 'agent_loop') {
          // For agent_loop nodes, call LLM
          const spec = (node.spec ?? {}) as AgentLoopSpec;
          const settings = useAppStore.getState().settings;
          const provider = settings.llm.providers.find((p) => p.enabled);

          if (provider && spec.system_prompt) {
            try {
              const response = await invoke<{ content: string }>('llm_chat', {
                providerType: provider.type,
                model: spec.model ?? provider.models[0],
                apiKeyEnvVar: provider.apiKeyEnvVar ?? null,
                baseUrl: provider.baseUrl ?? null,
                messages: [{ role: 'user', content: JSON.stringify(session.input) }],
                systemPrompt: spec.system_prompt,
                maxTokens: 1024,
              });
              output = { response: response.content };
            } catch (e) {
              output = { mock_response: 'Agent loop processed input' };
            }
          } else {
            output = { mock_response: 'Agent loop processed input' };
          }
        } else {
          // Mock execution for non-agent nodes
          await new Promise((r) => setTimeout(r, 200 + Math.random() * 300));
          output = { result: `${node.label} completed` };
        }
      } catch (e) {
        error = String(e);
      }

      const duration = Date.now() - startTime;
      const finalSteps = [...get().currentSession!.steps];
      finalSteps[i] = {
        ...finalSteps[i],
        status: error ? 'failed' : 'completed',
        output,
        duration,
        error,
        input: i === 0 ? session.input : undefined,
      };
      set({
        currentSession: { ...get().currentSession!, steps: finalSteps },
      });

      if (error) break;
    }

    const finalSession = get().currentSession!;
    const hasFailed = finalSession.steps.some((s) => s.status === 'failed');
    set({
      panelState: 'results',
      currentSession: {
        ...finalSession,
        status: hasFailed ? 'failed' : 'completed',
        completedAt: new Date().toISOString(),
      },
      sessionHistory: [...get().sessionHistory, finalSession],
    });
  },

  reset: () => {
    set({
      panelOpen: false,
      panelState: 'idle',
      currentSession: null,
      sessionHistory: [],
    });
  },
}));
