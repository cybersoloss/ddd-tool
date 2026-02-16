import { useMemo } from 'react';
import type { DataStoreSpec } from '../../../types/flow';
import { useFlowStore } from '../../../stores/flow-store';
import { ExtraFieldsEditor } from './ExtraFieldsEditor';

interface Props {
  spec: DataStoreSpec;
  onChange: (spec: DataStoreSpec) => void;
}

export function DataStoreSpecEditor({ spec, onChange }: Props) {
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const storeType = spec.store_type ?? 'database';

  // Collect model names from all data_store nodes in the flow for autocomplete
  const modelSuggestions = useMemo(() => {
    if (!currentFlow) return [];
    const models = new Set<string>();
    const allNodes = [currentFlow.trigger, ...currentFlow.nodes];
    for (const node of allNodes) {
      if (node.type === 'data_store') {
        const m = ((node.spec ?? {}) as DataStoreSpec).model;
        if (m && m.trim()) models.add(m.trim());
      }
    }
    return Array.from(models).sort();
  }, [currentFlow]);

  return (
    <div className="space-y-3">
      <div>
        <label className="label">Store Type</label>
        <select
          className="input"
          value={storeType}
          onChange={(e) => onChange({ ...spec, store_type: e.target.value as DataStoreSpec['store_type'] })}
        >
          <option value="database">Database</option>
          <option value="filesystem">Filesystem</option>
          <option value="memory">Memory</option>
        </select>
      </div>
      <div>
        <label className="label">Operation</label>
        <select
          className="input"
          value={spec.operation ?? 'read'}
          onChange={(e) => onChange({ ...spec, operation: e.target.value as DataStoreSpec['operation'] })}
        >
          <option value="create">Create</option>
          <option value="read">Read</option>
          <option value="update">Update</option>
          <option value="delete">Delete</option>
          <option value="upsert">Upsert</option>
          <option value="create_many">Create Many</option>
          <option value="update_many">Update Many</option>
          <option value="delete_many">Delete Many</option>
        </select>
      </div>

      {/* Database fields */}
      {storeType === 'database' && (
        <>
          <div>
            <label className="label">Model</label>
            <input
              className="input"
              list="model-suggestions"
              value={spec.model ?? ''}
              onChange={(e) => onChange({ ...spec, model: e.target.value })}
              placeholder="e.g. User, Order"
            />
            {modelSuggestions.length > 0 && (
              <datalist id="model-suggestions">
                {modelSuggestions.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            )}
          </div>
          <div>
            <label className="label">Data</label>
            <textarea
              className="input min-h-[60px] resize-y font-mono text-xs"
              value={JSON.stringify(spec.data ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  onChange({ ...spec, data: JSON.parse(e.target.value) });
                } catch {
                  // Keep raw while editing
                }
              }}
              placeholder="{}"
            />
          </div>
          <div>
            <label className="label">Query</label>
            <textarea
              className="input min-h-[60px] resize-y font-mono text-xs"
              value={JSON.stringify(spec.query ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  onChange({ ...spec, query: JSON.parse(e.target.value) });
                } catch {
                  // Keep raw while editing
                }
              }}
              placeholder="{}"
            />
          </div>
          {spec.operation === 'read' && (
            <>
              <div>
                <label className="label">Pagination</label>
                <textarea
                  className="input min-h-[60px] resize-y font-mono text-xs"
                  value={JSON.stringify(spec.pagination ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      onChange({ ...spec, pagination: JSON.parse(e.target.value) });
                    } catch {
                      // Keep raw while editing
                    }
                  }}
                  placeholder='{ "style": "cursor", "default_limit": 20, "max_limit": 100 }'
                />
              </div>
              <div>
                <label className="label">Sort</label>
                <textarea
                  className="input min-h-[60px] resize-y font-mono text-xs"
                  value={JSON.stringify(spec.sort ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      onChange({ ...spec, sort: JSON.parse(e.target.value) });
                    } catch {
                      // Keep raw while editing
                    }
                  }}
                  placeholder='{ "default": "created_at:desc", "allowed": [] }'
                />
              </div>
            </>
          )}
          <div>
            <label className="label">Include (relations)</label>
            <textarea
              className="input min-h-[60px] resize-y font-mono text-xs"
              value={JSON.stringify(spec.include ?? {}, null, 2)}
              onChange={(e) => {
                try {
                  onChange({ ...spec, include: JSON.parse(e.target.value) });
                } catch {
                  // Keep raw while editing
                }
              }}
              placeholder='{"posts": true, "profile": true}'
            />
          </div>
          {(spec.operation === 'create_many' || spec.operation === 'update_many' || spec.operation === 'delete_many') && (
            <>
              <div className="flex items-center gap-2">
                <label className="label flex-1">Batch</label>
                <button
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    spec.batch ? 'bg-accent' : 'bg-surface-2'
                  }`}
                  onClick={() => onChange({ ...spec, batch: !spec.batch })}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      spec.batch ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <label className="label flex-1">Returning</label>
                <button
                  className={`relative w-9 h-5 rounded-full transition-colors ${
                    spec.returning ? 'bg-accent' : 'bg-surface-2'
                  }`}
                  onClick={() => onChange({ ...spec, returning: !spec.returning })}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                      spec.returning ? 'translate-x-4' : ''
                    }`}
                  />
                </button>
              </div>
            </>
          )}
          {spec.operation === 'upsert' && (
            <div>
              <label className="label">Upsert Key</label>
              <input
                className="input"
                value={(Array.isArray(spec.upsert_key) ? spec.upsert_key : []).join(', ')}
                onChange={(e) =>
                  onChange({
                    ...spec,
                    upsert_key: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
                placeholder="Comma-separated keys, e.g. email, tenant_id"
              />
            </div>
          )}
        </>
      )}

      {/* Filesystem fields */}
      {storeType === 'filesystem' && (
        <>
          <div>
            <label className="label">Path</label>
            <input
              className="input"
              value={spec.path ?? ''}
              onChange={(e) => onChange({ ...spec, path: e.target.value })}
              placeholder="e.g. $.project_path/specs/system.yaml"
            />
          </div>
          {(spec.operation === 'create' || spec.operation === 'update') && (
            <div>
              <label className="label">Content</label>
              <textarea
                className="input min-h-[60px] resize-y font-mono text-xs"
                value={spec.content ?? ''}
                onChange={(e) => onChange({ ...spec, content: e.target.value })}
                placeholder="e.g. $.serialized_data"
              />
            </div>
          )}
          <div className="flex items-center gap-2">
            <label className="label flex-1">Create Parents</label>
            <button
              className={`relative w-9 h-5 rounded-full transition-colors ${
                spec.create_parents ? 'bg-accent' : 'bg-surface-2'
              }`}
              onClick={() => onChange({ ...spec, create_parents: !spec.create_parents })}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                  spec.create_parents ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </div>
        </>
      )}

      {/* Memory fields */}
      {storeType === 'memory' && (
        <>
          <div>
            <label className="label">Store</label>
            <input
              className="input"
              value={spec.store ?? ''}
              onChange={(e) => onChange({ ...spec, store: e.target.value })}
              placeholder="e.g. project-store, flow-store"
            />
          </div>
          <div>
            <label className="label">Selector</label>
            <input
              className="input"
              value={spec.selector ?? ''}
              onChange={(e) => onChange({ ...spec, selector: e.target.value })}
              placeholder="e.g. domains, currentFlow.nodes"
            />
          </div>
        </>
      )}

      {/* Safety mode (for reads) */}
      {spec.operation === 'read' && (
        <div>
          <label className="label">Safety</label>
          <select
            className="input"
            value={spec.safety ?? 'strict'}
            onChange={(e) => onChange({ ...spec, safety: e.target.value as DataStoreSpec['safety'] })}
          >
            <option value="strict">Strict (null-safe)</option>
            <option value="lenient">Lenient</option>
          </select>
        </div>
      )}

      <div>
        <label className="label">Description</label>
        <textarea
          className="input min-h-[80px] resize-y"
          value={spec.description ?? ''}
          onChange={(e) => onChange({ ...spec, description: e.target.value })}
          placeholder="Describe this data store operation..."
        />
      </div>
      <ExtraFieldsEditor spec={spec} nodeType="data_store" onChange={onChange} />
    </div>
  );
}
