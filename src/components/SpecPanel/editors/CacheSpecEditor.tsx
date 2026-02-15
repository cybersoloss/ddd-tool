import type { CacheSpec } from '../../../types/flow';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: CacheSpec;
  onChange: (spec: CacheSpec) => void;
}

export function CacheSpecEditor({ spec, onChange }: Props) {
  return (
    <div className="space-y-3">
      <div>
        <label className="label">Cache Key</label>
        <input
          className="input"
          value={spec.key ?? ''}
          onChange={(e) => onChange({ ...spec, key: e.target.value })}
          placeholder="e.g. search:${query}"
        />
      </div>
      <div>
        <label className="label">TTL (ms)</label>
        <input
          className="input"
          type="number"
          value={spec.ttl_ms ?? ''}
          onChange={(e) => onChange({ ...spec, ttl_ms: e.target.value ? Number(e.target.value) : undefined })}
          placeholder="e.g. 3600000"
        />
      </div>
      <div>
        <label className="label">Store</label>
        <select
          className="input"
          value={spec.store ?? 'redis'}
          onChange={(e) => onChange({ ...spec, store: e.target.value as 'redis' | 'memory' })}
        >
          <option value="redis">Redis</option>
          <option value="memory">In-Memory</option>
        </select>
      </div>
      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this cache lookup..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="cache" onChange={onChange} />
    </div>
  );
}
