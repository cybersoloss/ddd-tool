import type { ProcessSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: ProcessSpec;
  onChange: (spec: ProcessSpec) => void;
}

export function ProcessSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
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
          onChange={(e) => onChange({ ...spec, inputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="e.g. order, user"
        />
      </div>
      <div>
        <label className="label">Outputs (comma-separated)</label>
        <input
          className="input"
          value={(Array.isArray(spec.outputs) ? spec.outputs : []).join(', ')}
          onChange={(e) => onChange({ ...spec, outputs: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
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
