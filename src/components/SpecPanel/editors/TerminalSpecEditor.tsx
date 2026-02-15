import type { TerminalSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: TerminalSpec;
  onChange: (spec: TerminalSpec) => void;
}

export function TerminalSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Outcome</label>
        <input
          className="input"
          value={spec.outcome ?? ''}
          onChange={(e) => onChange({ ...spec, outcome: e.target.value })}
          placeholder="e.g. Order Confirmed"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this terminal state..."
        />
      </div>
      <div>
        <label className="label">Status</label>
        <input
          className="input"
          type="number"
          value={spec.status ?? ''}
          onChange={(e) => onChange({ ...spec, status: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 200, 201, 400"
        />
      </div>
      <div>
        <label className="label">Response Type</label>
        <select
          className="input"
          value={spec.response_type ?? ''}
          onChange={(e) => onChange({ ...spec, response_type: (e.target.value || undefined) as TerminalSpec['response_type'] })}
        >
          <option value="">Default</option>
          <option value="json">JSON</option>
          <option value="stream">Stream</option>
          <option value="sse">SSE</option>
          <option value="empty">Empty</option>
        </select>
      </div>
      <div>
        <label className="label">Response Body</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.body ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, body: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder="{}"
        />
      </div>
      <div>
        <label className="label">Headers</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.headers ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, headers: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"Content-Type": "application/json"}'
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="terminal" onChange={onChange} />
    </div>
  );
}
