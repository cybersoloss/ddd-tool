import type { IpcCallSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: IpcCallSpec;
  onChange: (spec: IpcCallSpec) => void;
}

export function IpcCallSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Command</label>
        <input
          className="input"
          value={spec.command ?? ''}
          onChange={(e) => onChange({ ...spec, command: e.target.value })}
          placeholder="e.g. git_status, compute_file_hash"
        />
      </div>
      <div>
        <label className="label">Arguments</label>
        <textarea
          className="input min-h-[60px] resize-y font-mono text-xs"
          value={JSON.stringify(spec.args ?? {}, null, 2)}
          onChange={(e) => {
            try {
              onChange({ ...spec, args: JSON.parse(e.target.value) });
            } catch {
              // Keep raw while editing
            }
          }}
          placeholder='{"path": "$.file_path"}'
        />
      </div>
      <div>
        <label className="label">Return Type</label>
        <input
          className="input"
          value={spec.return_type ?? ''}
          onChange={(e) => onChange({ ...spec, return_type: e.target.value })}
          placeholder="e.g. string, GitStatus, boolean"
        />
      </div>
      <div>
        <label className="label">Timeout (ms)</label>
        <input
          type="number"
          className="input"
          value={spec.timeout_ms ?? ''}
          onChange={(e) => onChange({ ...spec, timeout_ms: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 5000"
        />
      </div>
      <div>
        <label className="label">Bridge</label>
        <input
          className="input"
          value={spec.bridge ?? ''}
          onChange={(e) => onChange({ ...spec, bridge: e.target.value || undefined })}
          placeholder="e.g. tauri, electron, react-native"
        />
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this IPC call..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="ipc_call" onChange={onChange} />
    </div>
  );
}
