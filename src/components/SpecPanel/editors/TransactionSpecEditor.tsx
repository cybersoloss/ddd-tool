import { Plus, Trash2 } from 'lucide-react';
import type { TransactionSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: TransactionSpec;
  onChange: (spec: TransactionSpec) => void;
}

export function TransactionSpecEditor({ spec, onChange }: Props) {
  const steps = Array.isArray(spec.steps) ? spec.steps : [];

  const addStep = () => {
    onChange({ ...spec, steps: [...steps, { action: '', rollback: '' }] });
  };

  const updateStep = (index: number, field: 'action' | 'rollback', value: string) => {
    const updated = steps.map((s, i) => (i === index ? { ...s, [field]: value } : s));
    onChange({ ...spec, steps: updated });
  };

  const removeStep = (index: number) => {
    onChange({ ...spec, steps: steps.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Isolation Level</label>
        <select
          className="input"
          value={spec.isolation ?? 'read_committed'}
          onChange={(e) => onChange({ ...spec, isolation: e.target.value as TransactionSpec['isolation'] })}
        >
          <option value="read_committed">Read Committed</option>
          <option value="repeatable_read">Repeatable Read</option>
          <option value="serializable">Serializable</option>
        </select>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label">Steps</label>
          <button className="btn-icon !p-0.5 text-accent" onClick={addStep} title="Add step">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="space-y-2">
          {steps.map((step, i) => (
            <div key={i} className="bg-surface-2 rounded p-2 space-y-1.5 group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-text-muted">Step {i + 1}</span>
                <button
                  className="btn-icon !p-0.5 opacity-0 group-hover:opacity-100 text-danger"
                  onClick={() => removeStep(i)}
                  title="Remove step"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
              <input
                className="input text-xs"
                value={step.action}
                onChange={(e) => updateStep(i, 'action', e.target.value)}
                placeholder="Action (e.g. debit_account)"
              />
              <input
                className="input text-xs"
                value={step.rollback ?? ''}
                onChange={(e) => updateStep(i, 'rollback', e.target.value)}
                placeholder="Rollback (e.g. credit_account)"
              />
            </div>
          ))}
          {steps.length === 0 && (
            <p className="text-xs text-text-muted">No steps defined. Click + to add.</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <label className="label flex-1">Rollback on Error</label>
        <button
          className={`relative w-9 h-5 rounded-full transition-colors ${
            spec.rollback_on_error !== false ? 'bg-accent' : 'bg-surface-2'
          }`}
          onClick={() => onChange({ ...spec, rollback_on_error: spec.rollback_on_error === false })}
        >
          <span
            className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
              spec.rollback_on_error !== false ? 'translate-x-4' : ''
            }`}
          />
        </button>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this transaction..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="transaction" onChange={onChange} />
    </div>
  );
}
