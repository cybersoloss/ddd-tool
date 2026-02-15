import { Plus, Trash2 } from 'lucide-react';
import type { GuardrailSpec, GuardrailCheck } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: GuardrailSpec;
  onChange: (spec: GuardrailSpec) => void;
}

const CHECK_TYPES = ['content_filter', 'pii_detection', 'topic_restriction', 'prompt_injection', 'custom'];
const CHECK_ACTIONS: GuardrailCheck['action'][] = ['block', 'warn', 'log'];

export function GuardrailSpecEditor({ spec, onChange }: Props) {
  const checks = Array.isArray(spec.checks) ? spec.checks : [];

  const addCheck = () => {
    const check: GuardrailCheck = { type: 'content_filter', action: 'block' };
    onChange({ ...spec, checks: [...checks, check] });
  };

  const updateCheck = (index: number, updates: Partial<GuardrailCheck>) => {
    const updated = checks.map((c, i) => (i === index ? { ...c, ...updates } : c));
    onChange({ ...spec, checks: updated });
  };

  const removeCheck = (index: number) => {
    onChange({ ...spec, checks: checks.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Position */}
      <div>
        <label className="label">Position</label>
        <div className="flex gap-2">
          {(['input', 'output'] as const).map((pos) => (
            <button
              key={pos}
              type="button"
              className={`flex-1 px-3 py-1.5 rounded text-sm border transition-colors ${
                (spec.position ?? 'input') === pos
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-text-muted'
              }`}
              onClick={() => onChange({ ...spec, position: pos })}
            >
              {pos.charAt(0).toUpperCase() + pos.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* On Block */}
      <div>
        <label className="label">On Block Action</label>
        <input
          className="input"
          value={spec.on_block ?? ''}
          onChange={(e) => onChange({ ...spec, on_block: e.target.value })}
          placeholder="e.g. reject, escalate"
        />
      </div>

      {/* Checks */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Checks</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addCheck} title="Add check">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {checks.length === 0 && (
          <p className="text-xs text-text-muted">No checks defined</p>
        )}
        <div className="space-y-2">
          {checks.map((check, i) => (
            <div key={i} className="bg-bg-primary rounded p-2 flex items-center gap-2">
              <select
                className="input py-1 text-xs flex-1"
                value={check.type}
                onChange={(e) => updateCheck(i, { type: e.target.value })}
              >
                {CHECK_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              <select
                className="input py-1 text-xs w-20"
                value={check.action}
                onChange={(e) => updateCheck(i, { action: e.target.value as GuardrailCheck['action'] })}
              >
                {CHECK_ACTIONS.map((a) => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
              <button type="button" className="btn-icon !p-0.5" onClick={() => removeCheck(i)}>
                <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="guardrail" onChange={onChange} />
    </div>
  );
}
