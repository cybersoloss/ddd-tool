import type { BatchSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: BatchSpec;
  onChange: (spec: BatchSpec) => void;
}

export function BatchSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Input</label>
        <input
          className="input"
          value={spec.input ?? ''}
          onChange={(e) => onChange({ ...spec, input: e.target.value })}
          placeholder="e.g. items_to_process"
        />
      </div>
      <div>
        <label className="label">Operation Template</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.operation_template ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, operation_template: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"type": "service_call", "dispatch_field": "", "configs": {}}'
        />
      </div>
      <div>
        <label className="label">Concurrency</label>
        <input
          type="number"
          className="input"
          value={spec.concurrency ?? 3}
          onChange={(e) => onChange({ ...spec, concurrency: parseInt(e.target.value, 10) || 1 })}
          min={1}
        />
      </div>
      <div>
        <label className="label">On Error</label>
        <select
          className="input"
          value={spec.on_error ?? 'continue'}
          onChange={(e) => onChange({ ...spec, on_error: e.target.value as BatchSpec['on_error'] })}
        >
          <option value="continue">Continue</option>
          <option value="stop">Stop</option>
        </select>
      </div>
      <div>
        <label className="label">Output</label>
        <input
          className="input"
          value={spec.output ?? ''}
          onChange={(e) => onChange({ ...spec, output: e.target.value })}
          placeholder="e.g. batch_results"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this batch operation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="batch" onChange={onChange} />
    </div>
  );
}
