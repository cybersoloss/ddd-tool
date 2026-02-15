import type { LoopSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: LoopSpec;
  onChange: (spec: LoopSpec) => void;
}

export function LoopSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Collection</label>
        <input
          className="input"
          value={spec.collection ?? ''}
          onChange={(e) => onChange({ ...spec, collection: e.target.value })}
          placeholder="e.g. order.items"
        />
      </div>
      <div>
        <label className="label">Iterator</label>
        <input
          className="input"
          value={spec.iterator ?? ''}
          onChange={(e) => onChange({ ...spec, iterator: e.target.value })}
          placeholder="e.g. item"
        />
      </div>
      <div>
        <label className="label">Break Condition</label>
        <input
          className="input"
          value={spec.break_condition ?? ''}
          onChange={(e) => onChange({ ...spec, break_condition: e.target.value })}
          placeholder="e.g. item.quantity > 100"
        />
      </div>
      <div>
        <label className="label">On Error</label>
        <select
          className="input"
          value={spec.on_error ?? 'continue'}
          onChange={(e) => onChange({ ...spec, on_error: e.target.value as LoopSpec['on_error'] })}
        >
          <option value="continue">Continue</option>
          <option value="break">Break</option>
          <option value="fail">Fail</option>
        </select>
      </div>
      <div className="border-t border-border/50 pt-3">
        <p className="text-[10px] uppercase tracking-wider text-text-muted font-medium mb-2">Accumulate</p>
        <div className="space-y-2">
          <div>
            <label className="label">Field</label>
            <input
              className="input text-xs"
              value={spec.accumulate?.field ?? ''}
              onChange={(e) => onChange({ ...spec, accumulate: { ...spec.accumulate, field: e.target.value } })}
              placeholder="e.g. item.total"
            />
          </div>
          <div>
            <label className="label">Strategy</label>
            <select
              className="input text-xs"
              value={spec.accumulate?.strategy ?? 'append'}
              onChange={(e) => onChange({ ...spec, accumulate: { ...spec.accumulate, strategy: e.target.value as 'append' | 'merge' | 'sum' | 'last' } })}
            >
              <option value="append">Append</option>
              <option value="merge">Merge</option>
              <option value="sum">Sum</option>
              <option value="last">Last</option>
            </select>
          </div>
          <div>
            <label className="label">Output</label>
            <input
              className="input text-xs"
              value={spec.accumulate?.output ?? ''}
              onChange={(e) => onChange({ ...spec, accumulate: { ...spec.accumulate, output: e.target.value } })}
              placeholder="e.g. accumulated_totals"
            />
          </div>
        </div>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this loop..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="loop" onChange={onChange} />
    </div>
  );
}
