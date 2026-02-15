import type { HandoffSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: HandoffSpec;
  onChange: (spec: HandoffSpec) => void;
}

const MODES: HandoffSpec['mode'][] = ['transfer', 'consult', 'collaborate'];
const FAILURE_ACTIONS = ['escalate', 'retry', 'fallback', 'error'];
const MERGE_STRATEGIES = ['replace', 'merge', 'append'];

export function HandoffSpecEditor({ spec, onChange }: Props) {
  const target = spec.target ?? { flow: '', domain: '' };
  const contextTransfer = spec.context_transfer ?? { include_types: [], max_context_tokens: 4000 };
  const onComplete = spec.on_complete ?? { return_to: '', merge_strategy: 'replace' };
  const onFailure = spec.on_failure ?? { action: 'escalate', timeout: 30 };

  return (
    <div className="space-y-4">
      {/* Mode */}
      <div>
        <label className="label">Mode</label>
        <div className="flex gap-2">
          {MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              className={`flex-1 px-3 py-1.5 rounded text-sm border transition-colors ${
                (spec.mode ?? 'transfer') === mode
                  ? 'border-accent bg-accent/10 text-accent'
                  : 'border-border text-text-secondary hover:border-text-muted'
              }`}
              onClick={() => onChange({ ...spec, mode })}
            >
              {mode!.charAt(0).toUpperCase() + mode!.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Target */}
      <div>
        <label className="label">Target Flow</label>
        <input
          className="input"
          value={target.flow ?? ''}
          onChange={(e) => onChange({ ...spec, target: { ...target, flow: e.target.value } })}
          placeholder="Flow name"
        />
      </div>
      <div>
        <label className="label">Target Domain</label>
        <input
          className="input"
          value={target.domain ?? ''}
          onChange={(e) => onChange({ ...spec, target: { ...target, domain: e.target.value } })}
          placeholder="Domain name (optional)"
        />
      </div>

      {/* Context Transfer */}
      <div>
        <label className="label">Include Types</label>
        <input
          className="input"
          value={(Array.isArray(contextTransfer.include_types) ? contextTransfer.include_types : []).join(', ')}
          onChange={(e) =>
            onChange({
              ...spec,
              context_transfer: {
                ...contextTransfer,
                include_types: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              },
            })
          }
          placeholder="Comma-separated, e.g. messages, tool_results"
        />
      </div>
      <div>
        <label className="label">Max Context Tokens</label>
        <input
          type="number"
          className="input"
          value={contextTransfer.max_context_tokens ?? 4000}
          onChange={(e) =>
            onChange({
              ...spec,
              context_transfer: { ...contextTransfer, max_context_tokens: parseInt(e.target.value) || 4000 },
            })
          }
          min={0}
        />
      </div>

      {/* On Complete */}
      <div>
        <label className="label">Return To</label>
        <input
          className="input"
          value={onComplete.return_to ?? ''}
          onChange={(e) =>
            onChange({ ...spec, on_complete: { ...onComplete, return_to: e.target.value } })
          }
          placeholder="Flow to return to"
        />
      </div>
      <div>
        <label className="label">Merge Strategy</label>
        <select
          className="input"
          value={onComplete.merge_strategy ?? 'replace'}
          onChange={(e) =>
            onChange({ ...spec, on_complete: { ...onComplete, merge_strategy: e.target.value } })
          }
        >
          {MERGE_STRATEGIES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {/* On Failure */}
      <div>
        <label className="label">Failure Action</label>
        <select
          className="input"
          value={onFailure.action ?? 'escalate'}
          onChange={(e) =>
            onChange({ ...spec, on_failure: { ...onFailure, action: e.target.value } })
          }
        >
          {FAILURE_ACTIONS.map((a) => (
            <option key={a} value={a}>{a}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Timeout (seconds)</label>
        <input
          type="number"
          className="input"
          value={onFailure.timeout ?? 30}
          onChange={(e) =>
            onChange({ ...spec, on_failure: { ...onFailure, timeout: parseInt(e.target.value) || 30 } })
          }
          min={0}
        />
      </div>

      {/* Notify Customer */}
      <label className="flex items-center gap-1.5 text-xs text-text-secondary cursor-pointer">
        <input
          type="checkbox"
          className="accent-accent"
          checked={spec.notify_customer ?? false}
          onChange={(e) => onChange({ ...spec, notify_customer: e.target.checked })}
        />
        Notify customer on handoff
      </label>

      <ExtraFieldsEditor spec={spec} nodeType="handoff" onChange={onChange} />
    </div>
  );
}
