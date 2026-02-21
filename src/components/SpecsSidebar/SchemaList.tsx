import { useState } from 'react';
import { Plus, Trash2, ChevronRight, FileText } from 'lucide-react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import { SchemaEditor } from './SchemaEditor';

export function SchemaList() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const schemas = useSpecsStore((s) => s.schemas);
  const baseSchema = useSpecsStore((s) => s.baseSchema);
  const addSchema = useSpecsStore((s) => s.addSchema);
  const deleteSchema = useSpecsStore((s) => s.deleteSchema);

  const [selectedSchema, setSelectedSchema] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!projectPath) return null;

  const schemaNames = Object.keys(schemas).sort();

  if (selectedSchema !== null) {
    const schema = selectedSchema === '_base' ? baseSchema : schemas[selectedSchema];
    if (!schema) {
      setSelectedSchema(null);
      return null;
    }
    return (
      <SchemaEditor
        name={selectedSchema}
        schema={schema}
        onBack={() => setSelectedSchema(null)}
      />
    );
  }

  const handleAdd = async () => {
    const name = newName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!name) return;
    await addSchema(projectPath, name);
    setNewName('');
    setShowAdd(false);
    setSelectedSchema(name);
  };

  const handleDelete = async (name: string) => {
    await deleteSchema(projectPath, name);
    setConfirmDelete(null);
  };

  return (
    <div className="flex flex-col">
      {/* Base schema entry */}
      {baseSchema && (
        <button
          className="flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors border-b border-border group"
          onClick={() => setSelectedSchema('_base')}
        >
          <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary">Base Fields</div>
            <div className="text-[10px] text-text-muted truncate">
              {baseSchema.fields?.length ?? 0} fields (inherited)
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        </button>
      )}

      {/* Schema entries */}
      {schemaNames.map((name) => {
        const schema = schemas[name];
        return (
          <div key={name} className="group relative">
            {confirmDelete === name ? (
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-danger/10">
                <span className="text-xs text-danger flex-1">Delete {name}?</span>
                <button
                  className="text-[10px] text-danger hover:text-danger font-medium"
                  onClick={() => handleDelete(name)}
                >
                  Yes
                </button>
                <button
                  className="text-[10px] text-text-muted hover:text-text-primary"
                  onClick={() => setConfirmDelete(null)}
                >
                  No
                </button>
              </div>
            ) : (
              <button
                className="flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors border-b border-border w-full"
                onClick={() => setSelectedSchema(name)}
              >
                <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-text-primary">
                    {schema.name || name}
                  </div>
                  <div className="text-[10px] text-text-muted truncate">
                    {schema.fields?.length ?? 0} fields
                    {schema.relationships?.length ? `, ${schema.relationships.length} rels` : ''}
                  </div>
                </div>
                <button
                  className="btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                  onClick={(e) => {
                    e.stopPropagation();
                    setConfirmDelete(name);
                  }}
                  title="Delete schema"
                >
                  <Trash2 className="w-3 h-3 text-danger" />
                </button>
                <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
              </button>
            )}
          </div>
        );
      })}

      {/* Empty state */}
      {schemaNames.length === 0 && !baseSchema && (
        <div className="px-4 py-8 text-center">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted mb-1">No schemas yet</p>
          <p className="text-[10px] text-text-muted">
            Add schemas or use /ddd-create to generate them
          </p>
        </div>
      )}

      {/* Add schema */}
      {showAdd ? (
        <div className="px-3 py-2 border-t border-border">
          <input
            className="input text-xs w-full mb-2"
            placeholder="Schema name (e.g. User)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
            autoFocus
          />
          <div className="flex gap-2">
            <button className="btn-primary text-xs flex-1" onClick={handleAdd}>
              Add
            </button>
            <button className="btn-secondary text-xs" onClick={() => setShowAdd(false)}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <button
          className="flex items-center gap-2 px-3 py-2 text-xs text-accent hover:bg-bg-hover transition-colors"
          onClick={() => setShowAdd(true)}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Schema
        </button>
      )}
    </div>
  );
}
