import { nanoid } from 'nanoid';
import { Plus, Trash2 } from 'lucide-react';
import type { HumanGateSpec, ApprovalOption } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: HumanGateSpec;
  onChange: (spec: HumanGateSpec) => void;
}

const TIMEOUT_ACTIONS = ['escalate', 'auto_approve', 'auto_reject'] as const;

export function HumanGateSpecEditor({ spec, onChange }: Props) {
  const options = Array.isArray(spec.approval_options) ? spec.approval_options : [];
  const timeout = spec.timeout ?? { duration: 3600, action: 'escalate' };

  const addOption = () => {
    const opt: ApprovalOption = {
      id: nanoid(6),
      label: '',
    };
    onChange({ ...spec, approval_options: [...options, opt] });
  };

  const updateOption = (index: number, updates: Partial<ApprovalOption>) => {
    const updated = options.map((o, i) => (i === index ? { ...o, ...updates } : o));
    onChange({ ...spec, approval_options: updated });
  };

  const removeOption = (index: number) => {
    onChange({ ...spec, approval_options: options.filter((_, i) => i !== index) });
  };

  return (
    <div className="space-y-4">
      {/* Notification Channels */}
      <div>
        <label className="label">Notification Channels</label>
        <input
          className="input"
          value={(Array.isArray(spec.notification_channels) ? spec.notification_channels : []).join(', ')}
          onChange={(e) =>
            onChange({
              ...spec,
              notification_channels: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Comma-separated, e.g. slack, email"
        />
      </div>

      {/* Approval Options */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="label !mb-0">Approval Options</label>
          <button type="button" className="btn-icon !p-0.5" onClick={addOption} title="Add option">
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
        {options.length === 0 && (
          <p className="text-xs text-text-muted">No approval options</p>
        )}
        <div className="space-y-2">
          {options.map((opt, i) => (
            <div key={opt.id} className="bg-bg-primary rounded p-2 space-y-1.5">
              <div className="flex items-center gap-1">
                <input
                  className="input py-1 text-xs flex-1"
                  value={opt.label}
                  onChange={(e) => updateOption(i, { label: e.target.value })}
                  placeholder="Label (e.g. Approve)"
                />
                <button type="button" className="btn-icon !p-0.5" onClick={() => removeOption(i)}>
                  <Trash2 className="w-3 h-3 text-text-muted hover:text-red-400" />
                </button>
              </div>
              <input
                className="input py-1 text-xs"
                value={opt.description ?? ''}
                onChange={(e) => updateOption(i, { description: e.target.value })}
                placeholder="Description (optional)"
              />
              <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
                <input
                  type="checkbox"
                  className="accent-accent"
                  checked={opt.requires_input ?? false}
                  onChange={(e) => updateOption(i, { requires_input: e.target.checked })}
                />
                Requires input
              </label>
            </div>
          ))}
        </div>
      </div>

      {/* Timeout */}
      <div>
        <label className="label">Timeout Duration (seconds)</label>
        <input
          type="number"
          className="input"
          min={0}
          value={timeout.duration ?? 3600}
          onChange={(e) =>
            onChange({
              ...spec,
              timeout: { ...timeout, duration: parseInt(e.target.value) || 3600 },
            })
          }
        />
      </div>

      <div>
        <label className="label">Timeout Action</label>
        <select
          className="input"
          value={timeout.action ?? 'escalate'}
          onChange={(e) =>
            onChange({
              ...spec,
              timeout: { ...timeout, action: e.target.value as (typeof TIMEOUT_ACTIONS)[number] },
            })
          }
        >
          {TIMEOUT_ACTIONS.map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, ' ')}</option>
          ))}
        </select>
      </div>

      {/* Context for Human */}
      <div>
        <label className="label">Context for Human</label>
        <input
          className="input"
          value={(Array.isArray(spec.context_for_human) ? spec.context_for_human : []).join(', ')}
          onChange={(e) =>
            onChange({
              ...spec,
              context_for_human: e.target.value
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean),
            })
          }
          placeholder="Comma-separated context keys"
        />
      </div>

      <ExtraFieldsEditor spec={spec} nodeType="human_gate" onChange={onChange} />
    </div>
  );
}
