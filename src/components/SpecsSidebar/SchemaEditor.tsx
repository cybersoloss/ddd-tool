import { useCallback, useRef } from 'react';
import { ArrowLeft, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import type {
  SchemaSpec,
  SchemaField,
  SchemaRelationship,
  SchemaIndex,
  SchemaTransition,
  SchemaSeed,
} from '../../types/specs';

const FIELD_TYPES = ['string', 'number', 'decimal', 'boolean', 'uuid', 'datetime', 'enum', 'json', 'text'];
const RELATIONSHIP_TYPES = ['has_many', 'has_one', 'belongs_to', 'many_to_many'];
const INDEX_TYPES = ['btree', 'hash', 'gin', 'gist'];
const SEED_STRATEGIES = ['migration', 'fixture', 'script'];
const ON_INVALID_OPTIONS = ['reject', 'warn', 'log'];

interface Props {
  name: string;
  schema: SchemaSpec;
  onBack: () => void;
}

export function SchemaEditor({ name, schema, onBack }: Props) {
  const projectPath = useProjectStore((s) => s.projectPath);
  const saveSchema = useSpecsStore((s) => s.saveSchema);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fields: true,
    relationships: false,
    indexes: false,
    transitions: false,
    seed: false,
  });

  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const save = useCallback(
    (updated: SchemaSpec) => {
      if (!projectPath) return;
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        saveSchema(projectPath, name, updated);
      }, 500);
    },
    [projectPath, name, saveSchema],
  );

  const toggleSection = (section: string) => {
    setExpandedSections((s) => ({ ...s, [section]: !s[section] }));
  };

  const updateField = (index: number, updates: Partial<SchemaField>) => {
    const fields = [...(schema.fields ?? [])];
    fields[index] = { ...fields[index], ...updates };
    const updated = { ...schema, fields };
    save(updated);
  };

  const addField = () => {
    const fields = [...(schema.fields ?? []), { name: '', type: 'string' }];
    save({ ...schema, fields });
  };

  const removeField = (index: number) => {
    const fields = (schema.fields ?? []).filter((_, i) => i !== index);
    save({ ...schema, fields });
  };

  const updateRelationship = (index: number, updates: Partial<SchemaRelationship>) => {
    const relationships = [...(schema.relationships ?? [])];
    relationships[index] = { ...relationships[index], ...updates };
    save({ ...schema, relationships });
  };

  const addRelationship = () => {
    const relationships = [
      ...(schema.relationships ?? []),
      { name: '', type: 'has_many', target: '', foreign_key: '' },
    ];
    save({ ...schema, relationships });
  };

  const removeRelationship = (index: number) => {
    const relationships = (schema.relationships ?? []).filter((_, i) => i !== index);
    save({ ...schema, relationships });
  };

  const updateIndex = (index: number, updates: Partial<SchemaIndex>) => {
    const indexes = [...(schema.indexes ?? [])];
    indexes[index] = { ...indexes[index], ...updates };
    save({ ...schema, indexes });
  };

  const addIndex = () => {
    const indexes = [...(schema.indexes ?? []), { fields: [], unique: false }];
    save({ ...schema, indexes });
  };

  const removeIndex = (index: number) => {
    const indexes = (schema.indexes ?? []).filter((_, i) => i !== index);
    save({ ...schema, indexes });
  };

  const updateTransitions = (updates: Partial<SchemaTransition>) => {
    const transitions = { ...(schema.transitions ?? { field: '', states: [], on_invalid: 'reject' }), ...updates };
    save({ ...schema, transitions });
  };

  const updateSeed = (index: number, updates: Partial<SchemaSeed>) => {
    const seed = [...(schema.seed ?? [])];
    seed[index] = { ...seed[index], ...updates };
    save({ ...schema, seed });
  };

  const addSeed = () => {
    const seed = [...(schema.seed ?? []), { name: '', strategy: 'fixture' }];
    save({ ...schema, seed });
  };

  const removeSeed = (index: number) => {
    const seed = (schema.seed ?? []).filter((_, i) => i !== index);
    save({ ...schema, seed });
  };

  const SectionHeader = ({ id, label, count }: { id: string; label: string; count: number }) => (
    <button
      className="flex items-center gap-2 w-full px-3 py-2 text-xs font-medium text-text-secondary hover:bg-bg-hover transition-colors"
      onClick={() => toggleSection(id)}
    >
      {expandedSections[id] ? (
        <ChevronDown className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
      {label}
      <span className="text-[10px] text-text-muted">({count})</span>
    </button>
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2 border-b border-border">
        <button className="btn-icon !p-1" onClick={onBack}>
          <ArrowLeft className="w-3.5 h-3.5" />
        </button>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-medium text-text-primary truncate">
            {name === '_base' ? 'Base Fields' : schema.name || name}
          </div>
        </div>
      </div>

      {/* Meta */}
      <div className="px-3 py-2 space-y-2 border-b border-border">
        <div>
          <label className="label">Name</label>
          <input
            className="input text-xs w-full"
            value={schema.name ?? ''}
            onChange={(e) => save({ ...schema, name: e.target.value })}
          />
        </div>
        <div>
          <label className="label">Description</label>
          <textarea
            className="input text-xs w-full min-h-[40px] resize-y"
            value={schema.description ?? ''}
            onChange={(e) => save({ ...schema, description: e.target.value })}
          />
        </div>
        {name !== '_base' && (
          <div>
            <label className="label">Inherits</label>
            <input
              className="input text-xs w-full"
              value={schema.inherits ?? ''}
              onChange={(e) => save({ ...schema, inherits: e.target.value || undefined })}
              placeholder="_base"
            />
          </div>
        )}
      </div>

      <div className="flex-1 overflow-y-auto">
        {/* Fields */}
        <SectionHeader id="fields" label="Fields" count={schema.fields?.length ?? 0} />
        {expandedSections.fields && (
          <div className="px-3 pb-2 space-y-2">
            {(schema.fields ?? []).map((field, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeField(i)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    value={field.name}
                    onChange={(e) => updateField(i, { name: e.target.value })}
                    placeholder="name"
                  />
                  <select
                    className="input text-xs w-24"
                    value={field.type}
                    onChange={(e) => updateField(i, { type: e.target.value })}
                  >
                    {FIELD_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[10px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={field.required ?? false}
                      onChange={(e) => updateField(i, { required: e.target.checked })}
                    />
                    required
                  </label>
                  <label className="flex items-center gap-1 text-[10px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={field.encrypted ?? false}
                      onChange={(e) => updateField(i, { encrypted: e.target.checked })}
                    />
                    encrypted
                  </label>
                </div>
                <input
                  className="input text-xs w-full"
                  value={field.description ?? ''}
                  onChange={(e) => updateField(i, { description: e.target.value })}
                  placeholder="description"
                />
                {field.type === 'enum' && (
                  <input
                    className="input text-xs w-full"
                    value={(field.values ?? []).join(', ')}
                    onChange={(e) =>
                      updateField(i, {
                        values: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                      })
                    }
                    placeholder="values (comma-separated)"
                  />
                )}
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addField}
            >
              <Plus className="w-3 h-3" /> Add field
            </button>
          </div>
        )}

        {/* Relationships */}
        <SectionHeader id="relationships" label="Relationships" count={schema.relationships?.length ?? 0} />
        {expandedSections.relationships && (
          <div className="px-3 pb-2 space-y-2">
            {(schema.relationships ?? []).map((rel, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeRelationship(i)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <div className="flex gap-2">
                  <input
                    className="input text-xs flex-1"
                    value={rel.name}
                    onChange={(e) => updateRelationship(i, { name: e.target.value })}
                    placeholder="name"
                  />
                  <select
                    className="input text-xs w-28"
                    value={rel.type}
                    onChange={(e) => updateRelationship(i, { type: e.target.value })}
                  >
                    {RELATIONSHIP_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <input
                  className="input text-xs w-full"
                  value={rel.target}
                  onChange={(e) => updateRelationship(i, { target: e.target.value })}
                  placeholder="target model"
                />
                <input
                  className="input text-xs w-full"
                  value={rel.foreign_key}
                  onChange={(e) => updateRelationship(i, { foreign_key: e.target.value })}
                  placeholder="foreign_key"
                />
                {rel.type === 'many_to_many' && (
                  <div className="flex gap-2">
                    <input
                      className="input text-xs flex-1"
                      value={rel.join_table ?? ''}
                      onChange={(e) => updateRelationship(i, { join_table: e.target.value })}
                      placeholder="join_table"
                    />
                    <input
                      className="input text-xs flex-1"
                      value={rel.target_key ?? ''}
                      onChange={(e) => updateRelationship(i, { target_key: e.target.value })}
                      placeholder="target_key"
                    />
                  </div>
                )}
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addRelationship}
            >
              <Plus className="w-3 h-3" /> Add relationship
            </button>
          </div>
        )}

        {/* Indexes */}
        <SectionHeader id="indexes" label="Indexes" count={schema.indexes?.length ?? 0} />
        {expandedSections.indexes && (
          <div className="px-3 pb-2 space-y-2">
            {(schema.indexes ?? []).map((idx, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeIndex(i)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <input
                  className="input text-xs w-full"
                  value={(idx.fields ?? []).join(', ')}
                  onChange={(e) =>
                    updateIndex(i, {
                      fields: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                    })
                  }
                  placeholder="fields (comma-separated)"
                />
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1 text-[10px] text-text-muted">
                    <input
                      type="checkbox"
                      checked={idx.unique ?? false}
                      onChange={(e) => updateIndex(i, { unique: e.target.checked })}
                    />
                    unique
                  </label>
                  <select
                    className="input text-xs w-20"
                    value={idx.type ?? 'btree'}
                    onChange={(e) => updateIndex(i, { type: e.target.value })}
                  >
                    {INDEX_TYPES.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                <input
                  className="input text-xs w-full"
                  value={idx.description ?? ''}
                  onChange={(e) => updateIndex(i, { description: e.target.value })}
                  placeholder="description"
                />
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addIndex}
            >
              <Plus className="w-3 h-3" /> Add index
            </button>
          </div>
        )}

        {/* Transitions */}
        <SectionHeader
          id="transitions"
          label="Transitions"
          count={schema.transitions?.states?.length ?? 0}
        />
        {expandedSections.transitions && (
          <div className="px-3 pb-2 space-y-2">
            <div>
              <label className="label">Field</label>
              <input
                className="input text-xs w-full"
                value={schema.transitions?.field ?? ''}
                onChange={(e) => updateTransitions({ field: e.target.value })}
                placeholder="status field name"
              />
            </div>
            <div>
              <label className="label">On Invalid</label>
              <select
                className="input text-xs w-full"
                value={schema.transitions?.on_invalid ?? 'reject'}
                onChange={(e) => updateTransitions({ on_invalid: e.target.value })}
              >
                {ON_INVALID_OPTIONS.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </select>
            </div>
            {(schema.transitions?.states ?? []).map((state, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => {
                    const states = (schema.transitions?.states ?? []).filter((_, si) => si !== i);
                    updateTransitions({ states });
                  }}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <input
                  className="input text-xs w-full"
                  value={state.from}
                  onChange={(e) => {
                    const states = [...(schema.transitions?.states ?? [])];
                    states[i] = { ...states[i], from: e.target.value };
                    updateTransitions({ states });
                  }}
                  placeholder="from state"
                />
                <input
                  className="input text-xs w-full"
                  value={(state.to ?? []).join(', ')}
                  onChange={(e) => {
                    const states = [...(schema.transitions?.states ?? [])];
                    states[i] = {
                      ...states[i],
                      to: e.target.value.split(',').map((v) => v.trim()).filter(Boolean),
                    };
                    updateTransitions({ states });
                  }}
                  placeholder="to states (comma-separated)"
                />
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={() => {
                const states = [...(schema.transitions?.states ?? []), { from: '', to: [] }];
                updateTransitions({ states });
              }}
            >
              <Plus className="w-3 h-3" /> Add transition
            </button>
          </div>
        )}

        {/* Seed */}
        <SectionHeader id="seed" label="Seed Data" count={schema.seed?.length ?? 0} />
        {expandedSections.seed && (
          <div className="px-3 pb-2 space-y-2">
            {(schema.seed ?? []).map((seed, i) => (
              <div key={i} className="border border-border rounded p-2 space-y-1.5 group relative">
                <button
                  className="absolute top-1 right-1 btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={() => removeSeed(i)}
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <input
                  className="input text-xs w-full"
                  value={seed.name}
                  onChange={(e) => updateSeed(i, { name: e.target.value })}
                  placeholder="name"
                />
                <select
                  className="input text-xs w-full"
                  value={seed.strategy}
                  onChange={(e) => updateSeed(i, { strategy: e.target.value })}
                >
                  {SEED_STRATEGIES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <input
                  className="input text-xs w-full"
                  value={seed.description ?? ''}
                  onChange={(e) => updateSeed(i, { description: e.target.value })}
                  placeholder="description"
                />
                <input
                  className="input text-xs w-full"
                  value={seed.source ?? ''}
                  onChange={(e) => updateSeed(i, { source: e.target.value || undefined })}
                  placeholder="source (optional)"
                />
              </div>
            ))}
            <button
              className="flex items-center gap-1 text-xs text-accent hover:text-accent-hover"
              onClick={addSeed}
            >
              <Plus className="w-3 h-3" /> Add seed
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
