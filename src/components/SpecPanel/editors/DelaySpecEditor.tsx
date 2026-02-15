import type { DelaySpec, NodeSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: DelaySpec;
  onChange: (spec: DelaySpec) => void;
}

export function DelaySpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Strategy</label>
        <select
          className="input"
          value={spec.strategy ?? 'random'}
          onChange={(e) => onChange({ ...spec, strategy: e.target.value as 'random' | 'fixed' })}
        >
          <option value="random">Random</option>
          <option value="fixed">Fixed</option>
        </select>
      </div>
      <div>
        <label className="label">Min (ms)</label>
        <input
          className="input"
          type="number"
          value={spec.min_ms ?? ''}
          onChange={(e) => onChange({ ...spec, min_ms: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 1000"
        />
      </div>
      <div>
        <label className="label">Max (ms)</label>
        <input
          className="input"
          type="number"
          value={spec.max_ms ?? ''}
          onChange={(e) => onChange({ ...spec, max_ms: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 5000"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this delay..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="delay" onChange={onChange as (spec: NodeSpec) => void} />
    </div>
  );
}
