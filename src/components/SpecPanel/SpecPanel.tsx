import { useState, useEffect, useCallback } from 'react';
import { X, Zap, FormInput, Cog, GitFork, Square, RotateCw, Shield, Hand, Network, GitBranch, ArrowLeftRight, Box, Database, ExternalLink, Repeat, Columns, GitMerge, BrainCircuit, Clock, HardDrive, Shuffle, Filter, FileText, Lock, Layers, ShieldCheck } from 'lucide-react';
import { useFlowStore } from '../../stores/flow-store';
import { specEditors } from './editors';
import { CrossCuttingEditor } from './editors/CrossCuttingEditor';
import type { DddNodeType, DddFlowNode, NodeSpec } from '../../types/flow';
import type { ObservabilityConfig, SecurityConfig } from '../../types/crosscutting';

const nodeIcons: Record<DddNodeType, { icon: React.ElementType; color: string }> = {
  trigger: { icon: Zap, color: 'text-blue-400' },
  input: { icon: FormInput, color: 'text-green-400' },
  process: { icon: Cog, color: 'text-text-secondary' },
  decision: { icon: GitFork, color: 'text-yellow-400' },
  terminal: { icon: Square, color: 'text-red-400' },
  data_store: { icon: Database, color: 'text-emerald-400' },
  service_call: { icon: ExternalLink, color: 'text-orange-400' },
  event: { icon: Zap, color: 'text-purple-400' },
  loop: { icon: Repeat, color: 'text-teal-400' },
  parallel: { icon: Columns, color: 'text-pink-400' },
  sub_flow: { icon: GitMerge, color: 'text-violet-400' },
  llm_call: { icon: BrainCircuit, color: 'text-sky-400' },
  agent_loop: { icon: RotateCw, color: 'text-blue-400' },
  guardrail: { icon: Shield, color: 'text-yellow-400' },
  human_gate: { icon: Hand, color: 'text-red-400' },
  orchestrator: { icon: Network, color: 'text-indigo-400' },
  smart_router: { icon: GitBranch, color: 'text-cyan-400' },
  handoff: { icon: ArrowLeftRight, color: 'text-amber-400' },
  agent_group: { icon: Box, color: 'text-gray-400' },
  delay: { icon: Clock, color: 'text-blue-500' },
  cache: { icon: HardDrive, color: 'text-amber-400' },
  transform: { icon: Shuffle, color: 'text-indigo-400' },
  collection: { icon: Filter, color: 'text-cyan-400' },
  parse: { icon: FileText, color: 'text-lime-400' },
  crypto: { icon: Lock, color: 'text-fuchsia-400' },
  batch: { icon: Layers, color: 'text-rose-400' },
  transaction: { icon: ShieldCheck, color: 'text-amber-500' },
};

function findNode(flow: ReturnType<typeof useFlowStore.getState>['currentFlow'], nodeId: string): DddFlowNode | null {
  if (!flow) return null;
  if (flow.trigger.id === nodeId) return flow.trigger;
  return flow.nodes.find((n) => n.id === nodeId) ?? null;
}

export function SpecPanel() {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const selectNode = useFlowStore((s) => s.selectNode);
  const updateNodeSpec = useFlowStore((s) => s.updateNodeSpec);
  const updateNodeLabel = useFlowStore((s) => s.updateNodeLabel);

  const node = selectedNodeId ? findNode(currentFlow, selectedNodeId) : null;

  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  // Reset label editing when node changes
  useEffect(() => {
    setEditingLabel(false);
    if (node) setLabelDraft(node.label);
  }, [node?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const commitLabel = useCallback(() => {
    if (node && labelDraft.trim() && labelDraft !== node.label) {
      updateNodeLabel(node.id, labelDraft.trim());
    }
    setEditingLabel(false);
  }, [node, labelDraft, updateNodeLabel]);

  const handleSpecChange = useCallback(
    (spec: NodeSpec) => {
      if (node) updateNodeSpec(node.id, spec);
    },
    [node, updateNodeSpec]
  );

  const handleCrossCuttingChange = useCallback(
    (obs: ObservabilityConfig | undefined, sec: SecurityConfig | undefined) => {
      if (!node) return;
      const flowState = useFlowStore.getState();
      const { currentFlow } = flowState;
      if (!currentFlow) return;

      const updateNode = (n: DddFlowNode): DddFlowNode => ({
        ...n,
        observability: obs,
        security: sec,
      });

      if (currentFlow.trigger.id === node.id) {
        flowState.restoreFlow({
          ...currentFlow,
          trigger: updateNode(currentFlow.trigger),
        });
      } else {
        flowState.restoreFlow({
          ...currentFlow,
          nodes: currentFlow.nodes.map((n) =>
            n.id === node.id ? updateNode(n) : n
          ),
        });
      }
    },
    [node]
  );

  if (!node) return null;

  const { icon: Icon, color } = nodeIcons[node.type];
  const Editor = specEditors[node.type];

  return (
    <div className="w-[320px] bg-bg-secondary border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <Icon className={`w-4 h-4 ${color} shrink-0`} />
        {editingLabel ? (
          <input
            className="input py-1 px-2 text-sm font-medium flex-1"
            value={labelDraft}
            onChange={(e) => setLabelDraft(e.target.value)}
            onBlur={commitLabel}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitLabel();
              if (e.key === 'Escape') setEditingLabel(false);
            }}
            autoFocus
          />
        ) : (
          <span
            className="text-sm font-medium text-text-primary flex-1 cursor-pointer hover:text-accent truncate"
            onDoubleClick={() => {
              setLabelDraft(node.label);
              setEditingLabel(true);
            }}
            title="Double-click to edit"
          >
            {node.label}
          </span>
        )}
        <span className="text-[10px] uppercase text-text-muted tracking-wider shrink-0">
          {node.type}
        </span>
        <button
          className="btn-icon !p-1 shrink-0"
          onClick={() => selectNode(null)}
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        <Editor spec={node.spec} onChange={handleSpecChange} />
        <CrossCuttingEditor
          observability={node.observability}
          security={node.security}
          onChange={handleCrossCuttingChange}
        />
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[10px] text-text-muted truncate">ID: {node.id}</p>
      </div>
    </div>
  );
}
