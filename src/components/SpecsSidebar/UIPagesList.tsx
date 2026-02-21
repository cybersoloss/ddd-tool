import { useState } from 'react';
import { Plus, Trash2, ChevronRight, FileText, Settings } from 'lucide-react';
import { useSpecsStore } from '../../stores/specs-store';
import { useProjectStore } from '../../stores/project-store';
import { UIPagesConfigEditor } from './UIPagesConfigEditor';
import { UIPageEditor } from './UIPageEditor';

export function UIPagesList() {
  const projectPath = useProjectStore((s) => s.projectPath);
  const pagesConfig = useSpecsStore((s) => s.pagesConfig);
  const pageSpecs = useSpecsStore((s) => s.pageSpecs);
  const addPage = useSpecsStore((s) => s.addPage);
  const deletePage = useSpecsStore((s) => s.deletePage);

  const [view, setView] = useState<'list' | 'config' | string>('list');
  const [showAdd, setShowAdd] = useState(false);
  const [newId, setNewId] = useState('');
  const [newName, setNewName] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  if (!projectPath) return null;

  // Config editor view
  if (view === 'config') {
    return <UIPagesConfigEditor onBack={() => setView('list')} />;
  }

  // Page editor view
  if (view !== 'list') {
    const spec = pageSpecs[view];
    if (!spec) {
      setView('list');
      return null;
    }
    return <UIPageEditor pageId={view} spec={spec} onBack={() => setView('list')} />;
  }

  const pages = pagesConfig?.pages ?? [];

  const handleAdd = async () => {
    const id = newId.trim().toLowerCase().replace(/\s+/g, '-');
    const name = newName.trim();
    if (!id || !name) return;
    await addPage(projectPath, id, name);
    setNewId('');
    setNewName('');
    setShowAdd(false);
    setView(id);
  };

  const handleDelete = async (pageId: string) => {
    await deletePage(projectPath, pageId);
    setConfirmDelete(null);
  };

  return (
    <div className="flex flex-col">
      {/* Config summary */}
      {pagesConfig && (
        <button
          className="flex items-center gap-2 px-3 py-2 text-left hover:bg-bg-hover transition-colors border-b border-border group"
          onClick={() => setView('config')}
        >
          <Settings className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="text-xs font-medium text-text-primary">App Config</div>
            <div className="text-[10px] text-text-muted truncate">
              {[pagesConfig.app_type, pagesConfig.framework].filter(Boolean).join(' / ') || 'Not configured'}
            </div>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
        </button>
      )}

      {/* Page entries */}
      {pages.map((page) => (
        <div key={page.id} className="group relative">
          {confirmDelete === page.id ? (
            <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-danger/10">
              <span className="text-xs text-danger flex-1">Delete {page.name}?</span>
              <button
                className="text-[10px] text-danger hover:text-danger font-medium"
                onClick={() => handleDelete(page.id)}
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
              onClick={() => setView(page.id)}
            >
              <FileText className="w-3.5 h-3.5 text-text-muted flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="text-xs font-medium text-text-primary">{page.name}</div>
                <div className="text-[10px] text-text-muted truncate">
                  {page.route}
                  {page.layout ? ` (${page.layout})` : ''}
                </div>
              </div>
              <button
                className="btn-icon !p-0.5 opacity-0 group-hover:opacity-100"
                onClick={(e) => {
                  e.stopPropagation();
                  setConfirmDelete(page.id);
                }}
                title="Delete page"
              >
                <Trash2 className="w-3 h-3 text-danger" />
              </button>
              <ChevronRight className="w-3.5 h-3.5 text-text-muted" />
            </button>
          )}
        </div>
      ))}

      {/* Empty state */}
      {pages.length === 0 && !pagesConfig && (
        <div className="px-4 py-8 text-center">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-2" />
          <p className="text-xs text-text-muted mb-1">No UI pages yet</p>
          <p className="text-[10px] text-text-muted">
            Add pages or use /ddd-create to generate them
          </p>
        </div>
      )}

      {/* Add page */}
      {showAdd ? (
        <div className="px-3 py-2 border-t border-border space-y-2">
          <input
            className="input text-xs w-full"
            placeholder="Page ID (e.g. dashboard)"
            value={newId}
            onChange={(e) => setNewId(e.target.value)}
            autoFocus
          />
          <input
            className="input text-xs w-full"
            placeholder="Page name (e.g. Dashboard)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd();
              if (e.key === 'Escape') setShowAdd(false);
            }}
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
          Add Page
        </button>
      )}
    </div>
  );
}
