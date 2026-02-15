import { Plus, Trash2 } from 'lucide-react';
import type { ParallelSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ParallelSpec;
  onChange: (spec: ParallelSpec) => void;
}

export function ParallelSpecEditor({ spec, onChange }: Props) {
  const branches = spec.branches ?? [];

  const addBranch = () => onChange({ ...spec, branches: [...branches, ''] });
  const removeBranch = (i: number) =>
    onChange({ ...spec, branches: branches.filter((_, idx) => idx !== i) });
  const updateBranch = (i: number, val: string) =>
    onChange({ ...spec, branches: branches.map((b, idx) => (idx === i ? val : b)) });

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label">Branches</label>
          <button
            className="btn-icon !p-0.5 text-accent"
            onClick={addBranch}
            title="Add branch"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-1.5">
          {branches.map((branch, i) => (
            <div key={i} className="flex items-center gap-1.5 group">
              <input
                className="input flex-1 text-xs"
                value={typeof branch === 'string' ? branch : branch.label}
                onChange={(e) => updateBranch(i, e.target.value)}
                placeholder={`Branch ${i + 1}`}
              />
              <button
                className="btn-icon !p-0.5 opacity-0 group-hover:opacity-100 transition-opacity text-danger"
                onClick={() => removeBranch(i)}
                title="Remove branch"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          {branches.length === 0 && (
            <p className="text-xs text-text-muted italic">No branches yet. Click + to add one.</p>
          )}
        </div>
      </div>
      <div>
        <label className="label">Join Strategy</label>
        <select
          className="input"
          value={spec.join ?? 'all'}
          onChange={(e) => onChange({ ...spec, join: e.target.value as ParallelSpec['join'] })}
        >
          <option value="all">All</option>
          <option value="any">Any</option>
          <option value="n_of">N of</option>
        </select>
      </div>
      {spec.join === 'n_of' && (
        <div>
          <label className="label">Join Count</label>
          <input
            type="number"
            className="input"
            value={spec.join_count ?? 1}
            onChange={(e) => onChange({ ...spec, join_count: Number(e.target.value) })}
          />
        </div>
      )}
      <div>
        <label className="label">Timeout (ms)</label>
        <input
          type="number"
          className="input"
          value={spec.timeout_ms ?? 30000}
          onChange={(e) => onChange({ ...spec, timeout_ms: Number(e.target.value) })}
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this parallel execution..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="parallel" onChange={onChange} />
    </div>
  );
}
