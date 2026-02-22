import { useMemo, useState, useEffect } from 'react';
import { CheckCircle2, Columns, Plus } from 'lucide-react';
import { useFlowStore } from '../../../stores/flow-store';
import type { ProcessSpec, DddFlowNode } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

// ── Helpers ───────────────────────────────────────────────────────────────────

function labelToVarName(label: string): string {
  return label
    .toLowerCase()
    .replace(/[''']/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

interface BranchEntry {
  id: string;
  label: string;
  nodeType: string;
  varName: string;
  alreadyAdded: boolean;
  checked: boolean;
}

// ── Parallel inputs section ───────────────────────────────────────────────────

interface ParallelInputsSectionProps {
  parallelLabel: string;
  branches: BranchEntry[];
  onAdd: (varNames: string[]) => void;
}

function ParallelInputsSection({ parallelLabel, branches, onAdd }: ParallelInputsSectionProps) {
  const [rows, setRows] = useState<BranchEntry[]>(branches);

  // Re-sync when branches change (e.g. inputs updated externally)
  useEffect(() => {
    setRows((prev) =>
      branches.map((b) => {
        const existing = prev.find((r) => r.id === b.id);
        return {
          ...b,
          varName: existing?.varName ?? b.varName,
          checked: existing?.checked ?? b.checked,
        };
      })
    );
  }, [branches]);

  const pending = rows.filter((r) => !r.alreadyAdded);
  const checkedPending = pending.filter((r) => r.checked);

  const toggleAll = () => {
    const allChecked = pending.every((r) => r.checked);
    setRows((prev) =>
      prev.map((r) => (r.alreadyAdded ? r : { ...r, checked: !allChecked }))
    );
  };

  const handleAdd = () => {
    const names = checkedPending.map((r) => r.varName).filter(Boolean);
    if (names.length) onAdd(names);
  };

  return (
    <div className="border border-pink-500/30 rounded-lg overflow-hidden mb-3">
      {/* Header */}
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-pink-500/10 border-b border-pink-500/20">
        <Columns className="w-3 h-3 text-pink-400 shrink-0" />
        <span className="text-[11px] font-medium text-pink-300 flex-1 truncate">
          Parallel inputs from <span className="text-pink-200">{parallelLabel}</span>
        </span>
      </div>

      {/* Branch rows */}
      <div className="divide-y divide-border">
        {rows.map((row) => (
          <div key={row.id} className="flex items-center gap-2 px-2.5 py-1.5">
            {row.alreadyAdded ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-green-400 shrink-0" />
            ) : (
              <input
                type="checkbox"
                checked={row.checked}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, checked: e.target.checked } : r))
                  )
                }
                className="shrink-0 accent-pink-500"
              />
            )}
            <span
              className={`text-[11px] flex-1 truncate ${
                row.alreadyAdded ? 'text-text-muted line-through' : 'text-text-secondary'
              }`}
              title={row.label}
            >
              {row.label}
            </span>
            {!row.alreadyAdded && (
              <input
                className="input text-[11px] w-32 py-0.5 h-6"
                value={row.varName}
                onChange={(e) =>
                  setRows((prev) =>
                    prev.map((r) => (r.id === row.id ? { ...r, varName: e.target.value } : r))
                  )
                }
                placeholder="var_name"
              />
            )}
            {row.alreadyAdded && (
              <span className="text-[11px] text-text-muted font-mono">{row.varName}</span>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      {pending.length > 0 && (
        <div className="flex items-center gap-2 px-2.5 py-1.5 bg-bg-tertiary border-t border-border">
          <button
            className="text-[10px] text-text-muted hover:text-text-secondary underline"
            onClick={toggleAll}
          >
            {pending.every((r) => r.checked) ? 'Deselect all' : 'Select all'}
          </button>
          <div className="flex-1" />
          <button
            disabled={checkedPending.length === 0}
            className="flex items-center gap-1 text-[11px] text-pink-300 hover:text-pink-200 disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleAdd}
          >
            <Plus className="w-3 h-3" />
            Add {checkedPending.length > 0 ? checkedPending.length : ''} to inputs
          </button>
        </div>
      )}
    </div>
  );
}

// ── Main editor ───────────────────────────────────────────────────────────────

interface Props {
  spec: ProcessSpec;
  onChange: (spec: ProcessSpec) => void;
}

export function ProcessSpecEditor({ spec, onChange }: Props) {
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const currentFlow = useFlowStore((s) => s.currentFlow);

  // Detect if this node is the `done` target of a parallel node
  const parallelContext = useMemo(() => {
    if (!currentFlow || !selectedNodeId) return null;

    const allNodes: DddFlowNode[] = [
      currentFlow.trigger,
      ...(currentFlow.nodes ?? []),
    ];

    for (const node of allNodes) {
      if (node.type !== 'parallel') continue;

      const doneConn = (node.connections ?? []).find(
        (c) => c.sourceHandle === 'done' && c.targetNodeId === selectedNodeId
      );
      if (!doneConn) continue;

      // This node is the done target — collect branch children
      const branchConns = (node.connections ?? []).filter(
        (c) => c.sourceHandle?.startsWith('branch-')
      );

      const branches: Omit<BranchEntry, 'alreadyAdded' | 'checked'>[] = branchConns
        .map((c) => allNodes.find((n) => n.id === c.targetNodeId))
        .filter((n): n is DddFlowNode => n != null)
        .map((n) => ({
          id: n.id,
          label: n.label,
          nodeType: n.type,
          varName: labelToVarName(n.label),
        }));

      if (branches.length === 0) return null;

      return { parallelLabel: node.label, branches };
    }

    return null;
  }, [currentFlow, selectedNodeId]);

  // Merge alreadyAdded + checked state into branch entries
  const branchEntries: BranchEntry[] | null = useMemo(() => {
    if (!parallelContext) return null;
    const existing = new Set(spec.inputs ?? []);
    return parallelContext.branches.map((b) => ({
      ...b,
      alreadyAdded: existing.has(b.varName),
      checked: !existing.has(b.varName),
    }));
  }, [parallelContext, spec.inputs]);

  const handleAddInputs = (names: string[]) => {
    const current = spec.inputs ?? [];
    onChange({ ...spec, inputs: [...new Set([...current, ...names])] });
  };

  return (
    <div className="space-y-3">
      {/* Parallel inputs panel — shown only when context detected */}
      {parallelContext && branchEntries && (
        <ParallelInputsSection
          parallelLabel={parallelContext.parallelLabel}
          branches={branchEntries}
          onAdd={handleAddInputs}
        />
      )}

      <div>
        <label className="label">Action</label>
        <input
          className="input"
          value={spec.action ?? ''}
          onChange={(e) => onChange({ ...spec, action: e.target.value })}
          placeholder="e.g. validatePayment"
        />
      </div>
      <div>
        <label className="label">Service</label>
        <input
          className="input"
          value={spec.service ?? ''}
          onChange={(e) => onChange({ ...spec, service: e.target.value })}
          placeholder="e.g. PaymentService"
        />
      </div>
      <div>
        <label className="label">Category</label>
        <select
          className="input"
          value={spec.category ?? ''}
          onChange={(e) => onChange({ ...spec, category: (e.target.value || undefined) as ProcessSpec['category'] })}
        >
          <option value="">— None —</option>
          <option value="security">Security</option>
          <option value="transform">Transform</option>
          <option value="integration">Integration</option>
          <option value="business_logic">Business Logic</option>
          <option value="infrastructure">Infrastructure</option>
        </select>
      </div>
      <div>
        <label className="label">Inputs (comma-separated)</label>
        <input
          className="input"
          value={(Array.isArray(spec.inputs) ? spec.inputs : []).join(', ')}
          onChange={(e) =>
            onChange({ ...spec, inputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          placeholder="e.g. order, user"
        />
      </div>
      <div>
        <label className="label">Outputs (comma-separated)</label>
        <input
          className="input"
          value={(Array.isArray(spec.outputs) ? spec.outputs : []).join(', ')}
          onChange={(e) =>
            onChange({ ...spec, outputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
          }
          placeholder="e.g. validated_order"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this process..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="process" onChange={onChange} />
    </div>
  );
}
