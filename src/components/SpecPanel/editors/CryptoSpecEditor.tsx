import type { CryptoSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: CryptoSpec;
  onChange: (spec: CryptoSpec) => void;
}

export function CryptoSpecEditor({ spec, onChange }: Props) {
  const keySource = spec.key_source ?? { env: '' };

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Operation</label>
        <select
          className="input"
          value={spec.operation ?? 'encrypt'}
          onChange={(e) => onChange({ ...spec, operation: e.target.value as CryptoSpec['operation'] })}
        >
          <option value="encrypt">Encrypt</option>
          <option value="decrypt">Decrypt</option>
          <option value="hash">Hash</option>
          <option value="sign">Sign</option>
          <option value="verify">Verify</option>
          <option value="generate_key">Generate Key</option>
        </select>
      </div>
      <div>
        <label className="label">Algorithm</label>
        <input
          className="input"
          value={spec.algorithm ?? ''}
          onChange={(e) => onChange({ ...spec, algorithm: e.target.value })}
          placeholder="e.g. aes-256-gcm, sha256"
        />
      </div>
      <div>
        <label className="label">Key Source (env)</label>
        <input
          className="input"
          value={keySource.env ?? ''}
          onChange={(e) => onChange({ ...spec, key_source: { ...keySource, env: e.target.value } })}
          placeholder="e.g. ENCRYPTION_KEY"
        />
      </div>
      <div>
        <label className="label">Key Source (vault)</label>
        <input
          className="input"
          value={keySource.vault ?? ''}
          onChange={(e) => onChange({ ...spec, key_source: { ...keySource, vault: e.target.value } })}
          placeholder="e.g. secret/data/keys"
        />
      </div>
      <div>
        <label className="label">Input Fields (comma-separated)</label>
        <input
          className="input"
          value={(spec.input_fields ?? []).join(', ')}
          onChange={(e) => onChange({ ...spec, input_fields: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
          placeholder="e.g. email, phone"
        />
      </div>
      <div>
        <label className="label">Output Field</label>
        <input
          className="input"
          value={spec.output_field ?? ''}
          onChange={(e) => onChange({ ...spec, output_field: e.target.value })}
          placeholder="e.g. encrypted_data"
        />
      </div>
      <div>
        <label className="label">Encoding</label>
        <select
          className="input"
          value={spec.encoding ?? 'base64'}
          onChange={(e) => onChange({ ...spec, encoding: e.target.value as CryptoSpec['encoding'] })}
        >
          <option value="base64">Base64</option>
          <option value="hex">Hex</option>
        </select>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this crypto operation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="crypto" onChange={onChange} />
    </div>
  );
}
