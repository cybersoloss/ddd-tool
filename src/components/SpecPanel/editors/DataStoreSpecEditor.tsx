import { useMemo } from 'react';
import { Plus, Trash2 } from 'lucide-react';
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
          {storeType === 'memory' ? (
            <>
              <option value="get">Get</option>
              <option value="set">Set</option>
              <option value="merge">Merge</option>
              <option value="reset">Reset</option>
              <option value="subscribe">Subscribe</option>
              <option value="update_where">Update Where</option>
              <optgroup label="CRUD (legacy)">
                <option value="read">Read</option>
                <option value="create">Create</option>
                <option value="update">Update</option>
                <option value="delete">Delete</option>
              </optgroup>
            </>
          ) : (
            <>
              <option value="create">Create</option>
              <option value="read">Read</option>
              <option value="update">Update</option>
              <option value="delete">Delete</option>
              <option value="upsert">Upsert</option>
              <option value="create_many">Create Many</option>
              <option value="update_many">Update Many</option>
              <option value="delete_many">Delete Many</option>
              <option value="aggregate">Aggregate</option>
            </>
          )}
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
          <div>
            <label className="label">Optional Filters</label>
            <div className="space-y-1">
              {(spec.filters ?? []).map((f, i) => (
                <div key={i} className="flex gap-1 items-center">
                  <input
                    className="input text-xs w-24"
                    value={f.field}
                    onChange={(e) => {
                      const updated = [...(spec.filters ?? [])];
                      updated[i] = { ...updated[i], field: e.target.value };
                      onChange({ ...spec, filters: updated });
                    }}
                    placeholder="field"
                  />
                  <input
                    className="input text-xs flex-1"
                    value={f.value}
                    onChange={(e) => {
                      const updated = [...(spec.filters ?? [])];
                      updated[i] = { ...updated[i], value: e.target.value };
                      onChange({ ...spec, filters: updated });
                    }}
                    placeholder="$.value"
                  />
                  <label className="flex items-center gap-0.5 text-[10px] text-text-muted shrink-0">
                    <input
                      type="checkbox"
                      checked={f.required ?? true}
                      onChange={(e) => {
                        const updated = [...(spec.filters ?? [])];
                        updated[i] = { ...updated[i], required: e.target.checked };
                        onChange({ ...spec, filters: updated });
                      }}
                    />
                    req
                  </label>
                  <button
                    className="btn-icon !p-0.5"
                    onClick={() => {
                      const updated = (spec.filters ?? []).filter((_, j) => j !== i);
                      onChange({ ...spec, filters: updated.length ? updated : undefined });
                    }}
                  >
                    <span className="text-danger text-xs">×</span>
                  </button>
                </div>
              ))}
              <button
                className="flex items-center gap-1 text-[10px] text-accent hover:text-accent-hover"
                onClick={() => onChange({ ...spec, filters: [...(spec.filters ?? []), { field: '', value: '', required: false }] })}
              >
                + Add filter
              </button>
            </div>
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
          {spec.operation === 'aggregate' && (
            <>
              <div>
                <label className="label">Group By</label>
                <input
                  className="input"
                  value={(spec.group_by ?? []).join(', ')}
                  onChange={(e) =>
                    onChange({
                      ...spec,
                      group_by: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="Comma-separated fields, e.g. status, category"
                />
              </div>
              <div className="space-y-2">
                <label className="label">Aggregate Fields</label>
                {(spec.aggregate_fields ?? []).map((agg, idx) => (
                  <div key={idx} className="bg-surface-2 rounded p-2 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted">Field {idx + 1}</span>
                      <button
                        className="text-text-muted hover:text-red-400 transition-colors"
                        onClick={() => {
                          const next = [...(spec.aggregate_fields ?? [])];
                          next.splice(idx, 1);
                          onChange({ ...spec, aggregate_fields: next.length ? next : undefined });
                        }}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                    <div>
                      <label className="label">Function</label>
                      <select
                        className="input"
                        value={agg.function}
                        onChange={(e) => {
                          const next = [...(spec.aggregate_fields ?? [])];
                          next[idx] = { ...agg, function: e.target.value as 'count' | 'sum' | 'avg' | 'min' | 'max' };
                          onChange({ ...spec, aggregate_fields: next });
                        }}
                      >
                        <option value="count">Count</option>
                        <option value="sum">Sum</option>
                        <option value="avg">Avg</option>
                        <option value="min">Min</option>
                        <option value="max">Max</option>
                      </select>
                    </div>
                    <div>
                      <label className="label">
                        Field {agg.function === 'count' && <span className="text-text-muted">(optional for count)</span>}
                      </label>
                      <input
                        className={`input ${agg.function === 'count' ? 'opacity-50' : ''}`}
                        value={agg.field ?? ''}
                        onChange={(e) => {
                          const next = [...(spec.aggregate_fields ?? [])];
                          next[idx] = { ...agg, field: e.target.value || undefined };
                          onChange({ ...spec, aggregate_fields: next });
                        }}
                        placeholder="e.g. amount"
                      />
                    </div>
                    <div>
                      <label className="label">Alias</label>
                      <input
                        className="input"
                        value={agg.alias}
                        onChange={(e) => {
                          const next = [...(spec.aggregate_fields ?? [])];
                          next[idx] = { ...agg, alias: e.target.value };
                          onChange({ ...spec, aggregate_fields: next });
                        }}
                        placeholder="e.g. total_amount"
                      />
                    </div>
                  </div>
                ))}
                <button
                  className="flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors"
                  onClick={() => onChange({ ...spec, aggregate_fields: [...(spec.aggregate_fields ?? []), { function: 'count', alias: '' }] })}
                >
                  <Plus className="w-3 h-3" />
                  Add Aggregate Field
                </button>
              </div>
            </>
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
          {spec.operation === 'update_where' && (
            <>
              <div>
                <label className="label">Predicate</label>
                <input
                  className="input"
                  value={spec.predicate ?? ''}
                  onChange={(e) => onChange({ ...spec, predicate: e.target.value })}
                  placeholder="e.g. $.id === targetId"
                />
              </div>
              <div>
                <label className="label">Patch</label>
                <textarea
                  className="input min-h-[60px] resize-y font-mono text-xs"
                  value={JSON.stringify(spec.patch ?? {}, null, 2)}
                  onChange={(e) => {
                    try {
                      onChange({ ...spec, patch: JSON.parse(e.target.value) });
                    } catch {
                      // Keep raw while editing
                    }
                  }}
                  placeholder='{"dismissed": true}'
                />
              </div>
            </>
          )}
        </>
      )}

      {/* Safety mode (for reads) */}
      {(spec.operation === 'read' || spec.operation === 'get' || spec.operation === 'subscribe') && (
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
