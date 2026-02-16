import { useState, useCallback } from 'react';
import { useReactFlow } from '@xyflow/react';
import { FormInput, Cog, GitFork, Square, RotateCw, Shield, Hand, Network, GitBranch, ArrowLeftRight, Box, Undo2, Redo2, Database, ExternalLink, Zap, Repeat, Columns, GitMerge, BrainCircuit, Copy, Check, RotateCcw, Clock, HardDrive, Shuffle, Filter, FileText, Lock, Layers, ShieldCheck, LayoutGrid, Settings, Terminal } from 'lucide-react';
import type { DddNodeType } from '../../types/flow';
import { useSheetStore } from '../../stores/sheet-store';
import { useUndoStore } from '../../stores/undo-store';
import { useFlowStore } from '../../stores/flow-store';
import { useProjectStore } from '../../stores/project-store';
import { ValidationBadge } from '../Validation/ValidationBadge';

interface ToolbarItem {
  type: DddNodeType;
  label: string;
  icon: React.ElementType;
  borderColor: string;
  iconColor: string;
}

const TRADITIONAL_ITEMS: ToolbarItem[] = [
  { type: 'input', label: 'Input', icon: FormInput, borderColor: 'border-l-green-500', iconColor: 'text-green-400' },
  { type: 'process', label: 'Process', icon: Cog, borderColor: 'border-l-text-muted', iconColor: 'text-text-secondary' },
  { type: 'decision', label: 'Decision', icon: GitFork, borderColor: 'border-l-yellow-500', iconColor: 'text-yellow-400' },
  { type: 'data_store', label: 'Data Store', icon: Database, borderColor: 'border-l-emerald-500', iconColor: 'text-emerald-400' },
  { type: 'service_call', label: 'Service Call', icon: ExternalLink, borderColor: 'border-l-orange-500', iconColor: 'text-orange-400' },
  { type: 'ipc_call', label: 'IPC Call', icon: Terminal, borderColor: 'border-l-cyan-500', iconColor: 'text-cyan-400' },
  { type: 'event', label: 'Event', icon: Zap, borderColor: 'border-l-purple-500', iconColor: 'text-purple-400' },
  { type: 'loop', label: 'Loop', icon: Repeat, borderColor: 'border-l-teal-500', iconColor: 'text-teal-400' },
  { type: 'parallel', label: 'Parallel', icon: Columns, borderColor: 'border-l-pink-500', iconColor: 'text-pink-400' },
  { type: 'sub_flow', label: 'Sub-Flow', icon: GitMerge, borderColor: 'border-l-violet-500', iconColor: 'text-violet-400' },
  { type: 'llm_call', label: 'LLM Call', icon: BrainCircuit, borderColor: 'border-l-sky-500', iconColor: 'text-sky-400' },
  { type: 'delay', label: 'Delay', icon: Clock, borderColor: 'border-l-blue-600', iconColor: 'text-blue-500' },
  { type: 'cache', label: 'Cache', icon: HardDrive, borderColor: 'border-l-amber-500', iconColor: 'text-amber-400' },
  { type: 'transform', label: 'Transform', icon: Shuffle, borderColor: 'border-l-indigo-500', iconColor: 'text-indigo-400' },
  { type: 'collection', label: 'Collection', icon: Filter, borderColor: 'border-l-cyan-500', iconColor: 'text-cyan-400' },
  { type: 'parse', label: 'Parse', icon: FileText, borderColor: 'border-l-lime-500', iconColor: 'text-lime-400' },
  { type: 'crypto', label: 'Crypto', icon: Lock, borderColor: 'border-l-fuchsia-500', iconColor: 'text-fuchsia-400' },
  { type: 'batch', label: 'Batch', icon: Layers, borderColor: 'border-l-rose-500', iconColor: 'text-rose-400' },
  { type: 'transaction', label: 'Transaction', icon: ShieldCheck, borderColor: 'border-l-amber-600', iconColor: 'text-amber-500' },
  { type: 'terminal', label: 'Terminal', icon: Square, borderColor: 'border-l-red-500', iconColor: 'text-red-400' },
];

const AGENT_ITEMS: ToolbarItem[] = [
  { type: 'agent_loop', label: 'Agent Loop', icon: RotateCw, borderColor: 'border-l-blue-500', iconColor: 'text-blue-400' },
  { type: 'guardrail', label: 'Guardrail', icon: Shield, borderColor: 'border-l-yellow-500', iconColor: 'text-yellow-400' },
  { type: 'human_gate', label: 'Human Gate', icon: Hand, borderColor: 'border-l-red-600', iconColor: 'text-red-400' },
  { type: 'orchestrator', label: 'Orchestrator', icon: Network, borderColor: 'border-l-indigo-500', iconColor: 'text-indigo-400' },
  { type: 'smart_router', label: 'Smart Router', icon: GitBranch, borderColor: 'border-l-cyan-500', iconColor: 'text-cyan-400' },
  { type: 'handoff', label: 'Handoff', icon: ArrowLeftRight, borderColor: 'border-l-amber-500', iconColor: 'text-amber-400' },
  { type: 'agent_group', label: 'Agent Group', icon: Box, borderColor: 'border-l-gray-500', iconColor: 'text-gray-400' },
  { type: 'terminal', label: 'Terminal', icon: Square, borderColor: 'border-l-red-500', iconColor: 'text-red-400' },
];

interface Props {
  pendingType: DddNodeType | null;
  onSelectType: (type: DddNodeType | null) => void;
  flowType?: 'traditional' | 'agent';
  onOpenFlowSettings?: () => void;
}

export function NodeToolbar({ pendingType, onSelectType, flowType = 'traditional', onOpenFlowSettings }: Props) {
  const TOOLBAR_ITEMS = flowType === 'agent' ? AGENT_ITEMS : TRADITIONAL_ITEMS;
  const current = useSheetStore((s) => s.current);
  const flowId = useFlowStore((s) => s.currentFlow?.flow?.id);
  const undoStacks = useUndoStore((s) => flowId ? s.stacks[flowId] : undefined);
  const undo = useUndoStore((s) => s.undo);
  const redo = useUndoStore((s) => s.redo);

  const reloadProject = useProjectStore((s) => s.reloadProject);
  const autoLayout = useFlowStore((s) => s.autoLayout);
  const getLastDescription = useUndoStore((s) => s.getLastDescription);
  const { fitView } = useReactFlow();

  const canUndo = (undoStacks?.undoStack.length ?? 0) > 0;
  const canRedo = (undoStacks?.redoStack.length ?? 0) > 0;
  const undoDesc = flowId ? getLastDescription(flowId, 'undo') : null;
  const redoDesc = flowId ? getLastDescription(flowId, 'redo') : null;

  const [copied, setCopied] = useState(false);
  const [reloading, setReloading] = useState(false);

  const handleCopyCommand = useCallback(() => {
    if (!current.domainId || !current.flowId) return;
    navigator.clipboard.writeText(`/ddd-implement ${current.domainId}/${current.flowId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [current.domainId, current.flowId]);

  const handleAutoLayout = useCallback(() => {
    autoLayout();
    setTimeout(() => fitView({ duration: 300 }), 0);
  }, [autoLayout, fitView]);

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await reloadProject();
    } finally {
      setTimeout(() => setReloading(false), 600);
    }
  }, [reloadProject]);

  return (
    <div className="absolute left-3 top-3 z-10 bg-bg-secondary/90 backdrop-blur border border-border rounded-lg p-2 space-y-1">
      <p className="text-[10px] uppercase tracking-wider text-text-muted px-2 py-1">
        Nodes
      </p>
      {TOOLBAR_ITEMS.map((item) => {
        const Icon = item.icon;
        const isActive = pendingType === item.type;
        return (
          <div
            key={item.type}
            className={`flex items-center gap-2 px-3 py-2 border-l-4 ${item.borderColor} rounded cursor-pointer transition-colors ${
              isActive ? 'bg-accent/20 ring-1 ring-accent' : 'hover:bg-bg-hover'
            }`}
            onClick={() => onSelectType(isActive ? null : item.type)}
          >
            <Icon className={`w-4 h-4 ${item.iconColor}`} />
            <span className="text-sm text-text-primary">{item.label}</span>
          </div>
        );
      })}
      {pendingType && (
        <p className="text-[10px] text-accent px-2 pt-1">
          Click canvas to place
        </p>
      )}
      <div className="w-full h-px bg-border my-1" />
      <ValidationBadge />
      <div className="w-full h-px bg-border my-1" />
      <div
        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-bg-hover"
        onClick={handleCopyCommand}
        title={`Copy /ddd-implement ${current.domainId}/${current.flowId} to clipboard`}
      >
        {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-text-secondary" />}
        <span className="text-sm text-text-primary">{copied ? 'Copied!' : 'Copy Command'}</span>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-bg-hover"
        onClick={handleReload}
        title="Reload project from disk (Cmd+R)"
      >
        <RotateCcw className={`w-4 h-4 text-text-secondary ${reloading ? 'animate-spin' : ''}`} />
        <span className="text-sm text-text-primary">{reloading ? 'Reloading…' : 'Reload'}</span>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-bg-hover"
        onClick={handleAutoLayout}
        title="Auto-arrange nodes top-to-bottom by connection depth"
      >
        <LayoutGrid className="w-4 h-4 text-text-secondary" />
        <span className="text-sm text-text-primary">Auto Layout</span>
      </div>
      <div
        className="flex items-center gap-2 px-3 py-2 rounded cursor-pointer transition-colors hover:bg-bg-hover"
        onClick={onOpenFlowSettings}
        title="Flow settings (template, parameters, contract)"
      >
        <Settings className="w-4 h-4 text-text-secondary" />
        <span className="text-sm text-text-primary">Flow Settings</span>
      </div>
      <div className="w-full h-px bg-border my-1" />
      <div className="flex items-center gap-1 px-2">
        <button
          className={`btn-icon p-1.5 ${!canUndo ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={!canUndo}
          onClick={() => flowId && undo(flowId)}
          title={canUndo ? `Undo: ${undoDesc} (Cmd+Z)` : 'Nothing to undo'}
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          className={`btn-icon p-1.5 ${!canRedo ? 'opacity-30 cursor-not-allowed' : ''}`}
          disabled={!canRedo}
          onClick={() => flowId && redo(flowId)}
          title={canRedo ? `Redo: ${redoDesc} (Cmd+Shift+Z)` : 'Nothing to redo'}
        >
          <Redo2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
