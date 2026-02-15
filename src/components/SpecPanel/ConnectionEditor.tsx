import { Plus, Trash2, X } from 'lucide-react';
import { useCallback } from 'react';
import { useFlowStore } from '../../stores/flow-store';

interface ConnectionData {
  name: string;
  type: string;
}

interface ConnectionMeta {
  label?: string;
  data?: ConnectionData[];
  behavior?: 'continue' | 'stop' | 'retry' | 'circuit_break';
}

interface Props {
  sourceId: string;
  targetId: string;
  sourceHandle?: string;
  onClose: () => void;
}

const BEHAVIOR_OPTIONS = [
  { value: '', label: 'Default' },
  { value: 'continue', label: 'Continue' },
  { value: 'stop', label: 'Stop' },
  { value: 'retry', label: 'Retry' },
  { value: 'circuit_break', label: 'Circuit Break' },
];

export function ConnectionEditor({ sourceId, targetId, sourceHandle, onClose }: Props) {
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const restoreFlow = useFlowStore((s) => s.restoreFlow);

  // Find the connection in the flow document
  const sourceNode = currentFlow?.trigger?.id === sourceId
    ? currentFlow.trigger
    : currentFlow?.nodes.find((n) => n.id === sourceId);

  const conn = sourceNode?.connections?.find(
    (c) => c.targetNodeId === targetId && c.sourceHandle === sourceHandle
  );

  const meta: ConnectionMeta = {
    label: conn?.label,
    data: conn?.data,
    behavior: conn?.behavior,
  };

  const updateConnection = useCallback(
    (updates: Partial<ConnectionMeta>) => {
      if (!currentFlow || !sourceNode) return;

      const updateConns = (connections: typeof sourceNode.connections) =>
        connections.map((c) => {
          if (c.targetNodeId === targetId && c.sourceHandle === sourceHandle) {
            return { ...c, ...updates };
          }
          return c;
        });

      if (currentFlow.trigger.id === sourceId) {
        restoreFlow({
          ...currentFlow,
          trigger: {
            ...currentFlow.trigger,
            connections: updateConns(currentFlow.trigger.connections ?? []),
          },
        });
      } else {
        restoreFlow({
          ...currentFlow,
          nodes: currentFlow.nodes.map((n) =>
            n.id === sourceId
              ? { ...n, connections: updateConns(n.connections ?? []) }
              : n
          ),
        });
      }
    },
    [currentFlow, sourceId, targetId, sourceHandle, sourceNode, restoreFlow]
  );

  const addDataField = useCallback(() => {
    const current = meta.data ?? [];
    updateConnection({ data: [...current, { name: '', type: 'string' }] });
  }, [meta.data, updateConnection]);

  const updateDataField = useCallback(
    (index: number, updates: Partial<ConnectionData>) => {
      const current = [...(meta.data ?? [])];
      current[index] = { ...current[index], ...updates };
      updateConnection({ data: current });
    },
    [meta.data, updateConnection]
  );

  const removeDataField = useCallback(
    (index: number) => {
      updateConnection({ data: (meta.data ?? []).filter((_, i) => i !== index) });
    },
    [meta.data, updateConnection]
  );

  // Find labels for display
  const sourceName = sourceNode?.label ?? sourceId;
  const targetNode = currentFlow?.trigger?.id === targetId
    ? currentFlow.trigger
    : currentFlow?.nodes.find((n) => n.id === targetId);
  const targetName = targetNode?.label ?? targetId;

  return (
    <div className="w-[320px] bg-bg-secondary border-l border-border flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
        <span className="text-sm font-medium text-text-primary flex-1 truncate">
          Connection
        </span>
        <button
          className="btn-icon !p-1 shrink-0"
          onClick={onClose}
          title="Close panel"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
        <div className="text-xs text-text-muted">
          <span className="text-text-secondary">{sourceName}</span>
          {sourceHandle && <span className="text-accent ml-1">:{sourceHandle}</span>}
          <span className="mx-1.5">&rarr;</span>
          <span className="text-text-secondary">{targetName}</span>
        </div>

        <div>
          <label className="label">Label</label>
          <input
            className="input"
            value={meta.label ?? ''}
            onChange={(e) => updateConnection({ label: e.target.value || undefined })}
            placeholder="e.g. success, error"
          />
        </div>

        <div>
          <label className="label">Behavior</label>
          <select
            className="input"
            value={meta.behavior ?? ''}
            onChange={(e) => updateConnection({ behavior: (e.target.value || undefined) as ConnectionMeta['behavior'] })}
          >
            {BEHAVIOR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="label !mb-0">Data Fields</label>
            <button type="button" className="btn-icon !p-0.5" onClick={addDataField} title="Add field">
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          {(meta.data ?? []).length === 0 && (
            <p className="text-xs text-text-muted">No data fields</p>
          )}
          <div className="space-y-1.5">
            {(meta.data ?? []).map((field, i) => (
              <div key={i} className="flex items-center gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={field.name}
                  onChange={(e) => updateDataField(i, { name: e.target.value })}
                  placeholder="Field name"
                />
                <input
                  className="input py-1 text-xs w-20"
                  value={field.type}
                  onChange={(e) => updateDataField(i, { type: e.target.value })}
                  placeholder="Type"
                />
                <button type="button" className="btn-icon !p-0.5" onClick={() => removeDataField(i)}>
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 border-t border-border">
        <p className="text-[10px] text-text-muted truncate">
          {sourceId} &rarr; {targetId}
        </p>
      </div>
    </div>
  );
}
