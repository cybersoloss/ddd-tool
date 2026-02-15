import { create } from 'zustand';
import { invoke } from '@tauri-apps/api/core';
import { stringify, parse } from 'yaml';
import { nanoid } from 'nanoid';
import type {
  FlowDocument,
  DddFlowNode,
  DddNodeType,
  NodeSpec,
  DataStoreSpec,
  ServiceCallSpec,
  EventNodeSpec,
  LoopSpec,
  ParallelSpec,
  SubFlowSpec,
  LlmCallSpec,
  DelaySpec,
  CacheSpec,
  TransformSpec,
  CollectionSpec,
  ParseSpec,
  CryptoSpec,
  BatchSpec,
  TransactionSpec,
  AgentLoopSpec,
  GuardrailSpec,
  HumanGateSpec,
  OrchestratorSpec,
  SmartRouterSpec,
  HandoffSpec,
  AgentGroupSpec,
} from '../types/flow';
import type { Position } from '../types/sheet';

// --- Skip-undo flag (used by undo-store to prevent loops) ---
let _skipUndo = false;
export function setSkipUndo(v: boolean) { _skipUndo = v; }
export function getSkipUndo() { return _skipUndo; }

interface FlowState {
  currentFlow: FlowDocument | null;
  domainId: string | null;
  projectPath: string | null;
  selectedNodeId: string | null;
  loading: boolean;

  loadFlow: (domainId: string, flowId: string, projectPath: string, flowType?: 'traditional' | 'agent') => Promise<void>;
  unloadFlow: () => void;
  restoreFlow: (doc: FlowDocument) => void;
  addNode: (type: DddNodeType, position: Position, parentId?: string) => void;
  moveNode: (nodeId: string, position: Position) => void;
  deleteNode: (nodeId: string) => void;
  selectNode: (nodeId: string | null) => void;
  addConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string, targetHandle?: string) => void;
  removeConnection: (sourceNodeId: string, targetNodeId: string, sourceHandle?: string) => void;
  updateNodeSpec: (nodeId: string, spec: NodeSpec) => void;
  updateNodeLabel: (nodeId: string, label: string) => void;
  reparentNode: (nodeId: string, parentId: string | undefined) => void;
}

let saveTimer: ReturnType<typeof setTimeout> | null = null;
let autoSaveTimer: ReturnType<typeof setInterval> | null = null;

// Undo integration: registered lazily to avoid circular imports
let _pushSnapshotFn: ((flowId: string, description: string) => void) | null = null;
let _clearFlowUndoFn: ((flowId: string) => void) | null = null;
export function registerUndoPush(fn: (flowId: string, description: string) => void) {
  _pushSnapshotFn = fn;
}
export function registerUndoClear(fn: (flowId: string) => void) {
  _clearFlowUndoFn = fn;
}

function pushUndo(flowId: string, description: string) {
  if (_skipUndo || !_pushSnapshotFn) return;
  _pushSnapshotFn(flowId, description);
}

function defaultSpec(type: DddNodeType): NodeSpec {
  switch (type) {
    case 'trigger':
      return { event: '', source: '', description: '' };
    case 'input':
      return { fields: [], validation: '', description: '' };
    case 'process':
      return { action: '', service: '', description: '' };
    case 'decision':
      return { condition: '', trueLabel: 'Yes', falseLabel: 'No', description: '' };
    case 'terminal':
      return { outcome: '', description: '' };
    case 'agent_loop':
      return {
        model: 'claude-sonnet',
        system_prompt: '',
        max_iterations: 10,
        temperature: 0.7,
        stop_conditions: [],
        tools: [],
        memory: [],
        on_max_iterations: 'respond',
      } satisfies AgentLoopSpec;
    case 'guardrail':
      return {
        position: 'input',
        checks: [],
        on_block: 'reject',
      } satisfies GuardrailSpec;
    case 'human_gate':
      return {
        notification_channels: [],
        approval_options: [
          { id: 'approve', label: 'Approve' },
          { id: 'reject', label: 'Reject' },
        ],
        timeout: { duration: 3600, action: 'escalate' },
        context_for_human: [],
      } satisfies HumanGateSpec;
    case 'orchestrator':
      return {
        strategy: 'supervisor',
        model: 'claude-sonnet',
        supervisor_prompt: '',
        agents: [],
        fallback_chain: [],
        shared_memory: [],
        supervision: { monitor_iterations: 5, intervene_on: [] },
        result_merge_strategy: 'last_wins',
      } satisfies OrchestratorSpec;
    case 'smart_router':
      return {
        rules: [],
        llm_routing: { enabled: false, model: 'claude-haiku', routing_prompt: '', confidence_threshold: 0.8, routes: {} },
        fallback_chain: [],
        policies: {
          retry: { max_attempts: 3, on_failure: 'fallback' },
          timeout: { per_route: 30, total: 120 },
          circuit_breaker: { enabled: false, failure_threshold: 5, timeout_seconds: 60 },
        },
      } satisfies SmartRouterSpec;
    case 'handoff':
      return {
        mode: 'transfer',
        target: { flow: '', domain: '' },
        context_transfer: { include_types: [], max_context_tokens: 4000 },
        on_complete: { return_to: '', merge_strategy: 'replace' },
        on_failure: { action: 'escalate', timeout: 30 },
        notify_customer: false,
      } satisfies HandoffSpec;
    case 'agent_group':
      return {
        name: '',
        description: '',
        members: [],
        shared_memory: [],
        coordination: {
          communication: 'via_orchestrator',
          max_active_agents: 3,
          selection_strategy: 'round_robin',
          sticky_session: false,
        },
      } satisfies AgentGroupSpec;
    case 'data_store':
      return {
        operation: 'read',
        model: '',
        data: {},
        query: {},
        description: '',
      } satisfies DataStoreSpec;
    case 'service_call':
      return {
        method: 'GET',
        url: '',
        headers: {},
        body: {},
        timeout_ms: 5000,
        retry: { max_attempts: 3, backoff_ms: 1000 },
        error_mapping: {},
        description: '',
      } satisfies ServiceCallSpec;
    case 'event':
      return {
        direction: 'emit',
        event_name: '',
        payload: {},
        async: true,
        description: '',
      } satisfies EventNodeSpec;
    case 'loop':
      return {
        collection: '',
        iterator: 'item',
        break_condition: '',
        description: '',
      } satisfies LoopSpec;
    case 'parallel':
      return {
        branches: [],
        join: 'all',
        timeout_ms: 30000,
        description: '',
      } satisfies ParallelSpec;
    case 'sub_flow':
      return {
        flow_ref: '',
        input_mapping: {},
        output_mapping: {},
        description: '',
      } satisfies SubFlowSpec;
    case 'llm_call':
      return {
        model: 'claude-sonnet',
        system_prompt: '',
        prompt_template: '',
        temperature: 0.7,
        max_tokens: 4096,
        structured_output: {},
        retry: { max_attempts: 3, backoff_ms: 1000 },
        description: '',
      } satisfies LlmCallSpec;
    case 'delay':
      return {
        min_ms: 1000,
        max_ms: 5000,
        strategy: 'random',
        description: '',
      } satisfies DelaySpec;
    case 'cache':
      return {
        key: '',
        ttl_ms: 3600000,
        store: 'redis',
        description: '',
      } satisfies CacheSpec;
    case 'transform':
      return {
        input_schema: '',
        output_schema: '',
        field_mappings: {},
        description: '',
      } satisfies TransformSpec;
    case 'collection':
      return {
        operation: 'filter',
        input: '',
        output: '',
        description: '',
      } satisfies CollectionSpec;
    case 'parse':
      return {
        format: 'json',
        input: '',
        output: '',
        description: '',
      } satisfies ParseSpec;
    case 'crypto':
      return {
        operation: 'encrypt',
        algorithm: 'aes-256-gcm',
        key_source: { env: '' },
        input_fields: [],
        output_field: '',
        description: '',
      } satisfies CryptoSpec;
    case 'batch':
      return {
        input: '',
        operation_template: { type: 'service_call', dispatch_field: '', configs: {} },
        concurrency: 3,
        on_error: 'continue',
        output: '',
        description: '',
      } satisfies BatchSpec;
    case 'transaction':
      return {
        isolation: 'read_committed',
        steps: [],
        rollback_on_error: true,
        description: '',
      } satisfies TransactionSpec;
  }
}

function defaultLabel(type: DddNodeType): string {
  switch (type) {
    case 'trigger':
      return 'Trigger';
    case 'input':
      return 'Input';
    case 'process':
      return 'Process';
    case 'decision':
      return 'Decision';
    case 'terminal':
      return 'Terminal';
    case 'agent_loop':
      return 'Agent Loop';
    case 'guardrail':
      return 'Guardrail';
    case 'human_gate':
      return 'Human Gate';
    case 'orchestrator':
      return 'Orchestrator';
    case 'smart_router':
      return 'Smart Router';
    case 'handoff':
      return 'Handoff';
    case 'agent_group':
      return 'Agent Group';
    case 'data_store':
      return 'Data Store';
    case 'service_call':
      return 'Service Call';
    case 'event':
      return 'Event';
    case 'loop':
      return 'Loop';
    case 'parallel':
      return 'Parallel';
    case 'sub_flow':
      return 'Sub-Flow';
    case 'llm_call':
      return 'LLM Call';
    case 'delay':
      return 'Delay';
    case 'cache':
      return 'Cache';
    case 'transform':
      return 'Transform';
    case 'collection':
      return 'Collection';
    case 'parse':
      return 'Parse';
    case 'crypto':
      return 'Crypto';
    case 'batch':
      return 'Batch';
    case 'transaction':
      return 'Transaction';
  }
}

function createDefaultFlow(domainId: string, flowId: string, flowName: string, flowType: 'traditional' | 'agent' = 'traditional'): FlowDocument {
  const now = new Date().toISOString();
  const doc: FlowDocument = {
    flow: {
      id: flowId,
      name: flowName,
      type: flowType,
      domain: domainId,
    },
    trigger: {
      id: 'trigger-' + nanoid(8),
      type: 'trigger',
      position: { x: 250, y: 50 },
      connections: [],
      spec: defaultSpec('trigger'),
      label: 'Trigger',
    },
    nodes: [],
    metadata: {
      created: now,
      modified: now,
    },
  };

  // Agent flows get a pre-placed agent_loop node
  if (flowType === 'agent') {
    const agentNode: DddFlowNode = {
      id: 'agent_loop-' + nanoid(8),
      type: 'agent_loop',
      position: { x: 200, y: 200 },
      connections: [],
      spec: defaultSpec('agent_loop'),
      label: 'Agent Loop',
    };
    doc.nodes.push(agentNode);
    doc.trigger.connections.push({ targetNodeId: agentNode.id });
  }

  return doc;
}

/**
 * Normalize a raw YAML-parsed document into the internal FlowDocument shape.
 * Handles two external YAML conventions:
 *   - connections using `target` or `targetId` instead of `targetNodeId`
 *   - spec fields inlined on the node instead of nested under `spec:`
 *   - trigger embedded inside `nodes:` array (older format)
 *   - `properties:` used instead of `spec:` (older format)
 */
function normalizeFlowDocument(raw: Record<string, unknown>, domainId: string, flowId: string, flowType?: string): FlowDocument {
  const doc = raw as unknown as FlowDocument;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const normalizeNode = (n: any): DddFlowNode => {
    // Normalize connections: target / targetId → targetNodeId
    const rawConns: Array<Record<string, unknown>> = n.connections ?? [];
    const connections = rawConns.map((c: Record<string, unknown>) => {
      // Normalize "default" handle to undefined (React Flow's unnamed handle)
      const sh = c.sourceHandle as string | undefined;
      const th = c.targetHandle as string | undefined;
      return {
        targetNodeId: (c.targetNodeId ?? c.target ?? c.targetId ?? '') as string,
        sourceHandle: sh === 'default' ? undefined : sh,
        targetHandle: th === 'default' ? undefined : th,
      };
    });

    // Normalize spec: pull from `spec:`, `properties:`, `config:`, or inlined fields
    let spec = n.spec ?? n.properties ?? n.config ?? {};
    if (typeof spec !== 'object' || spec === null) spec = {};

    // If no explicit spec/properties/config, collect inlined spec-like fields
    const STRUCTURAL_KEYS = new Set([
      'id', 'type', 'label', 'position', 'connections', 'parentId',
      'spec', 'properties', 'config', 'observability', 'security',
    ]);
    if (!n.spec && !n.properties && !n.config) {
      const inlined: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(n)) {
        if (!STRUCTURAL_KEYS.has(k)) inlined[k] = v;
      }
      if (Object.keys(inlined).length > 0) spec = { ...spec, ...inlined };
    }

    return {
      id: n.id,
      type: n.type,
      position: n.position ?? { x: 0, y: 0 },
      connections,
      spec,
      label: n.label ?? n.id,
      parentId: n.parentId,
      observability: n.observability,
      security: n.security,
    };
  };

  // Handle older format: trigger metadata at top level, trigger node inside nodes[]
  let trigger = doc.trigger;
  let nodes: unknown[] = (doc.nodes as unknown[]) ?? [];

  if (!trigger || !trigger.id) {
    // Look for trigger node inside the nodes array
    const triggerIdx = (nodes as Array<Record<string, unknown>>).findIndex(
      (n) => n.type === 'trigger'
    );
    if (triggerIdx >= 0) {
      trigger = (nodes as Array<Record<string, unknown>>)[triggerIdx] as unknown as typeof trigger;
      nodes = [...(nodes as unknown[]).slice(0, triggerIdx), ...(nodes as unknown[]).slice(triggerIdx + 1)];
    }
  }

  const normalizedTrigger = trigger ? normalizeNode(trigger) : {
    id: 'trigger-default',
    type: 'trigger' as const,
    position: { x: 250, y: 50 },
    connections: [],
    spec: {},
    label: 'Trigger',
  };

  const normalizedNodes = (nodes as Array<Record<string, unknown>>).map(normalizeNode);

  return {
    flow: doc.flow ?? {
      id: (raw as Record<string, unknown>).name as string ?? flowId,
      name: (raw as Record<string, unknown>).name as string ?? flowId,
      type: (flowType as 'traditional' | 'agent') ?? 'traditional',
      domain: (raw as Record<string, unknown>).domain as string ?? domainId,
      description: (raw as Record<string, unknown>).description as string,
    },
    trigger: normalizedTrigger,
    nodes: normalizedNodes,
    metadata: doc.metadata ?? {
      created: new Date().toISOString(),
      modified: new Date().toISOString(),
    },
  };
}

function getFlowPath(projectPath: string, domainId: string, flowId: string): string {
  return `${projectPath}/specs/domains/${domainId}/flows/${flowId}.yaml`;
}

function getAutoSavePath(projectPath: string, flowId: string): string {
  return `${projectPath}/.ddd/autosave/${flowId}.yaml`;
}

function debouncedSave(state: FlowState) {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(async () => {
    const { currentFlow, domainId, projectPath } = state;
    if (!currentFlow || !currentFlow.flow || !domainId || !projectPath) return;

    const updated: FlowDocument = {
      ...currentFlow,
      metadata: { ...(currentFlow.metadata ?? {}), modified: new Date().toISOString() },
    };

    try {
      await invoke('write_file', {
        path: getFlowPath(projectPath, domainId, currentFlow.flow?.id ?? ''),
        contents: stringify(updated),
      });
    } catch {
      // Silent — save is best-effort
    }
  }, 500);
}

// Lazily-bound reference to app-store to avoid circular imports
let _getAutoSaveInterval: (() => number) | null = null;
export function registerAutoSaveIntervalGetter(fn: () => number) {
  _getAutoSaveInterval = fn;
}

function startAutoSave(_projectPath: string, flowId: string) {
  stopAutoSave();
  const intervalSec = _getAutoSaveInterval ? _getAutoSaveInterval() : 30;

  autoSaveTimer = setInterval(async () => {
    const state = useFlowStore.getState();
    if (!state.currentFlow || !state.projectPath) return;
    try {
      await invoke('write_file', {
        path: getAutoSavePath(state.projectPath, flowId),
        contents: stringify(state.currentFlow),
      });
    } catch {
      // Silent
    }
  }, intervalSec * 1000);
}

function stopAutoSave() {
  if (autoSaveTimer) {
    clearInterval(autoSaveTimer);
    autoSaveTimer = null;
  }
}

async function cleanupAutoSave(projectPath: string, flowId: string) {
  try {
    await invoke('delete_file', { path: getAutoSavePath(projectPath, flowId) });
  } catch {
    // Silent
  }
}

export const useFlowStore = create<FlowState>((set, get) => ({
  currentFlow: null,
  domainId: null,
  projectPath: null,
  selectedNodeId: null,
  loading: false,

  loadFlow: async (domainId, flowId, projectPath, flowType?) => {
    set({ loading: true, domainId, projectPath, selectedNodeId: null });

    const flowPath = getFlowPath(projectPath, domainId, flowId);

    try {
      const exists: boolean = await invoke('path_exists', { path: flowPath });
      if (exists) {
        const content: string = await invoke('read_file', { path: flowPath });
        const raw = parse(content) as Record<string, unknown>;
        const doc = normalizeFlowDocument(raw, domainId, flowId, flowType);
        set({ currentFlow: doc, loading: false });
      } else {
        // Create default flow document
        const doc = createDefaultFlow(domainId, flowId, flowId, flowType);
        await invoke('write_file', {
          path: flowPath,
          contents: stringify(doc),
        });
        set({ currentFlow: doc, loading: false });
      }
    } catch {
      // Fallback: create default
      const doc = createDefaultFlow(domainId, flowId, flowId, flowType);
      set({ currentFlow: doc, loading: false });
    }

    // Start auto-save interval
    startAutoSave(projectPath, flowId);
  },

  unloadFlow: () => {
    if (saveTimer) clearTimeout(saveTimer);
    const { projectPath, currentFlow } = get();
    if (projectPath && currentFlow && currentFlow.flow) {
      cleanupAutoSave(projectPath, currentFlow.flow.id);
      // Clear undo/redo stacks for this flow
      if (_clearFlowUndoFn) _clearFlowUndoFn(currentFlow.flow.id);
    }
    stopAutoSave();
    set({
      currentFlow: null,
      domainId: null,
      projectPath: null,
      selectedNodeId: null,
      loading: false,
    });
  },

  restoreFlow: (doc) => {
    set({ currentFlow: doc });
    debouncedSave(get());
  },

  addNode: (type, position, parentId?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', `Add ${defaultLabel(type)} node`);

    const node: DddFlowNode = {
      id: type + '-' + nanoid(8),
      type,
      position,
      connections: [],
      spec: defaultSpec(type),
      label: defaultLabel(type),
      parentId,
    };

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: [...currentFlow.nodes, node],
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  moveNode: (nodeId, position) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Move node');

    // Check trigger
    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, position },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    // Check nodes
    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, position } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  deleteNode: (nodeId) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    // Cannot delete the trigger node
    if (currentFlow.trigger.id === nodeId) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Delete node');

    // Remove node and clean up any connections referencing it
    // If deleting a loop node, clear parentId on children
    const updated: FlowDocument = {
      ...currentFlow,
      trigger: {
        ...currentFlow.trigger,
        connections: (currentFlow.trigger?.connections ?? []).filter(
          (c) => c.targetNodeId !== nodeId
        ),
      },
      nodes: (currentFlow.nodes ?? [])
        .filter((n) => n.id !== nodeId)
        .map((n) => ({
          ...n,
          connections: (n.connections ?? []).filter((c) => c.targetNodeId !== nodeId),
          parentId: n.parentId === nodeId ? undefined : n.parentId,
        })),
    };
    set({ currentFlow: updated, selectedNodeId: null });
    debouncedSave(get());
  },

  selectNode: (nodeId) => {
    set({ selectedNodeId: nodeId });
  },

  addConnection: (sourceNodeId, targetNodeId, sourceHandle?, targetHandle?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Add connection');

    const conn = { targetNodeId, sourceHandle, targetHandle };

    if (currentFlow.trigger.id === sourceNodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: {
          ...currentFlow.trigger,
          connections: [...(currentFlow.trigger?.connections ?? []), conn],
        },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: (currentFlow.nodes ?? []).map((n) =>
        n.id === sourceNodeId
          ? { ...n, connections: [...(n.connections ?? []), conn] }
          : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  removeConnection: (sourceNodeId, targetNodeId, sourceHandle?) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Remove connection');

    const matchConn = (c: { targetNodeId: string; sourceHandle?: string }) =>
      !(c.targetNodeId === targetNodeId && c.sourceHandle === sourceHandle);

    if (currentFlow.trigger.id === sourceNodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: {
          ...currentFlow.trigger,
          connections: (currentFlow.trigger?.connections ?? []).filter(matchConn),
        },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: (currentFlow.nodes ?? []).map((n) =>
        n.id === sourceNodeId
          ? { ...n, connections: (n.connections ?? []).filter(matchConn) }
          : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  updateNodeSpec: (nodeId, spec) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Update spec');

    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, spec },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, spec } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  updateNodeLabel: (nodeId, label) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Update label');

    if (currentFlow.trigger.id === nodeId) {
      const updated: FlowDocument = {
        ...currentFlow,
        trigger: { ...currentFlow.trigger, label },
      };
      set({ currentFlow: updated });
      debouncedSave(get());
      return;
    }

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, label } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },

  reparentNode: (nodeId, parentId) => {
    const { currentFlow } = get();
    if (!currentFlow) return;

    pushUndo(currentFlow.flow?.id ?? '', 'Reparent node');

    const updated: FlowDocument = {
      ...currentFlow,
      nodes: currentFlow.nodes.map((n) =>
        n.id === nodeId ? { ...n, parentId } : n
      ),
    };
    set({ currentFlow: updated });
    debouncedSave(get());
  },
}));
