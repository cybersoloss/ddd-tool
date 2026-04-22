import { useState } from 'react';
import { useDiagramStore } from '../../stores/diagram-store';
import { useSheetStore } from '../../stores/sheet-store';
import { useAppStore } from '../../stores/app-store';

export function DiagramSidebar() {
  const diagrams = useDiagramStore((s) => s.diagrams);
  const currentDiagramId = useDiagramStore((s) => s.currentDiagramId);
  const createDiagram = useDiagramStore((s) => s.createDiagram);
  const duplicateDiagram = useDiagramStore((s) => s.duplicateDiagram);
  const deleteDiagram = useDiagramStore((s) => s.deleteDiagram);
  const navigateToDiagram = useSheetStore((s) => s.navigateToDiagram);
  const projectPath = useAppStore((s) => s.currentProjectPath);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!newName.trim() || !projectPath) return;
    const id = await createDiagram(projectPath, newName.trim(), newDesc.trim() || undefined);
    navigateToDiagram(id);
    setShowCreate(false);
    setNewName('');
    setNewDesc('');
  };

  const handleDelete = async (diagramId: string) => {
    if (!projectPath) return;
    await deleteDiagram(projectPath, diagramId);
    setConfirmDelete(null);
  };

  return (
    <div className="w-56 border-r border-border bg-surface flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-border">
        <h3 className="text-xs font-semibold text-text-primary">Diagrams</h3>
        <button
          onClick={() => setShowCreate(true)}
          className="text-xs text-primary hover:text-primary/80 font-medium"
          title="New diagram"
        >
          + New
        </button>
      </div>

      {showCreate && (
        <div className="p-2 border-b border-border bg-surface-hover space-y-2">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Diagram name"
            className="input-field text-xs w-full"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleCreate();
              if (e.key === 'Escape') setShowCreate(false);
            }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            className="input-field text-xs w-full"
          />
          <div className="flex gap-1">
            <button onClick={handleCreate} className="btn-primary text-[10px] px-2 py-0.5">
              Create
            </button>
            <button onClick={() => setShowCreate(false)} className="btn-secondary text-[10px] px-2 py-0.5">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {diagrams.length === 0 && !showCreate && (
          <div className="p-3 text-center">
            <p className="text-xs text-text-muted">No diagrams yet.</p>
            <p className="text-[10px] text-text-muted mt-1">Click "+ New" to create one.</p>
          </div>
        )}
        {diagrams.map((d) => (
          <div
            key={d.id}
            className={`group flex items-center px-3 py-2 cursor-pointer hover:bg-surface-hover border-b border-border/50 ${
              currentDiagramId === d.id ? 'bg-accent/15 border-l-2 border-l-primary' : ''
            }`}
            onClick={() => navigateToDiagram(d.id)}
          >
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-text-primary truncate">{d.name}</p>
              {d.description && (
                <p className="text-[10px] text-text-muted truncate">{d.description}</p>
              )}
              {d.tags && d.tags.length > 0 && (
                <div className="flex gap-1 mt-0.5">
                  {d.tags.slice(0, 3).map((tag) => (
                    <span key={tag} className="text-[9px] bg-slate-100 text-slate-600 px-1 rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (projectPath) duplicateDiagram(projectPath, d.id).catch(() => {});
              }}
              className="opacity-0 group-hover:opacity-100 text-text-muted text-[10px] ml-1 hover:text-text-primary"
              title="Duplicate diagram"
            >
              dup
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setConfirmDelete(d.id);
              }}
              className="opacity-0 group-hover:opacity-100 text-danger text-xs ml-1 hover:text-danger/80"
              title="Delete diagram"
            >
              x
            </button>
          </div>
        ))}
      </div>

      {confirmDelete && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center z-50">
          <div className="bg-surface border border-border rounded-lg p-4 shadow-lg max-w-xs">
            <p className="text-xs text-text-primary mb-3">Delete this diagram? This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="btn-secondary text-xs px-2 py-1">
                Cancel
              </button>
              <button
                onClick={() => handleDelete(confirmDelete)}
                className="bg-danger text-white text-xs px-2 py-1 rounded hover:bg-danger/90"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
