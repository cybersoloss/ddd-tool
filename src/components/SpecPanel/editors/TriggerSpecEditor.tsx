import type { TriggerSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: TriggerSpec;
  onChange: (spec: TriggerSpec) => void;
}

export function TriggerSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Event</label>
        <input
          className="input"
          value={spec.event ?? ''}
          onChange={(e) => onChange({ ...spec, event: e.target.value })}
          placeholder="e.g. order.placed"
        />
      </div>
      <div>
        <label className="label">Source</label>
        <input
          className="input"
          value={spec.source ?? ''}
          onChange={(e) => onChange({ ...spec, source: e.target.value })}
          placeholder="e.g. API Gateway"
        />
      </div>
      <div>
        <label className="label">Filter</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.filter ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, filter: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"status": "active"}'
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this trigger..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="trigger" onChange={onChange} />
    </div>
  );
}
