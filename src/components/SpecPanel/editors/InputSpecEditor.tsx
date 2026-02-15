import { Plus, Trash2 } from 'lucide-react';
import type { InputSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

const VALIDATION_PRESETS: Array<{ label: string; value: string }> = [
  { label: 'Email', value: '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$' },
  { label: 'Phone', value: '^\\+?[1-9]\\d{1,14}$' },
  { label: 'Password', value: 'min:8,uppercase,lowercase,digit' },
  { label: 'URL', value: '^https?://.*' },
  { label: 'UUID', value: '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' },
];

interface Props {
  spec: InputSpec;
  onChange: (spec: InputSpec) => void;
}

export function InputSpecEditor({ spec, onChange }: Props) {
  const fields = Array.isArray(spec.fields) ? spec.fields : [];

  const addField = () => {
    onChange({ ...spec, fields: [...fields, { name: '', type: 'string', required: false }] });
  };

  const removeField = (index: number) => {
    onChange({ ...spec, fields: fields.filter((_, i) => i !== index) });
  };

  const updateField = (index: number, patch: Partial<{ name: string; type: string; required: boolean }>) => {
    onChange({
      ...spec,
      fields: fields.map((f, i) => (i === index ? { ...f, ...patch } : f)),
    });
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Fields</label>
          <button className="btn-icon !p-1" onClick={addField} title="Add field">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {fields.length === 0 && (
          <p className="text-xs text-text-muted">No fields yet. Click + to add.</p>
        )}
        <div className="space-y-2">
          {fields.map((field, i) => (
            <div key={i} className="bg-bg-primary/50 border border-border rounded-md p-2 space-y-1.5">
              <div className="flex items-center gap-1.5">
                <input
                  className="input flex-1"
                  value={field.name}
                  onChange={(e) => updateField(i, { name: e.target.value })}
                  placeholder="Field name"
                />
                <button className="btn-icon !p-1 text-danger" onClick={() => removeField(i)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  className="input flex-1"
                  value={field.type}
                  onChange={(e) => updateField(i, { type: e.target.value })}
                  placeholder="Type (e.g. string, number)"
                />
                <label className="flex items-center gap-1 text-xs text-text-secondary whitespace-nowrap">
                  <input
                    type="checkbox"
                    checked={field.required ?? false}
                    onChange={(e) => updateField(i, { required: e.target.checked })}
                    className="accent-accent"
                  />
                  required
                </label>
              </div>
            </div>
          ))}
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label mb-0">Validation</label>
          <select
            className="text-xs bg-bg-primary border border-border rounded px-1.5 py-0.5 text-text-secondary"
            value=""
            onChange={(e) => {
              if (e.target.value) {
                onChange({ ...spec, validation: e.target.value });
              }
            }}
          >
            <option value="">Presets...</option>
            {VALIDATION_PRESETS.map((p) => (
              <option key={p.label} value={p.value}>{p.label}</option>
            ))}
          </select>
        </div>
        <textarea
          className="input min-h-[60px] resize-y"
          value={spec.validation ?? ''}
          onChange={(e) => onChange({ ...spec, validation: e.target.value })}
          placeholder="Validation rules..."
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this input..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="input" onChange={onChange} />
    </div>
  );
}
