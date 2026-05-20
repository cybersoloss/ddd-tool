import { useState, useRef, useEffect } from 'react';
import { useDiagramStore } from '../../stores/diagram-store';

export function SheetTabBar() {
  const currentDiagram = useDiagramStore((s) => s.currentDiagram);
  const currentSheetIndex = useDiagramStore((s) => s.currentSheetIndex);
  const addSheet = useDiagramStore((s) => s.addSheet);
  const switchSheet = useDiagramStore((s) => s.switchSheet);
  const renameSheet = useDiagramStore((s) => s.renameSheet);
  const deleteSheet = useDiagramStore((s) => s.deleteSheet);
  const duplicateSheet = useDiagramStore((s) => s.duplicateSheet);

  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editValue, setEditValue] = useState('');
  const [contextMenu, setContextMenu] = useState<{ index: number; x: number; y: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editingIndex !== null && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editingIndex]);

  // Close context menu on outside click
  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    window.addEventListener('click', close);
    return () => window.removeEventListener('click', close);
  }, [contextMenu]);

  if (!currentDiagram) return null;

  const sheets = currentDiagram.sheets;
  // Legacy single-sheet: show nothing (no tabs needed)
  const hasSheets = sheets && sheets.length > 0;

  const commitRename = () => {
    if (editingIndex !== null) {
      const trimmed = editValue.trim();
      if (trimmed) renameSheet(editingIndex, trimmed);
      setEditingIndex(null);
    }
  };

  return (
    <div className="flex items-center border-t border-border bg-surface px-1 py-0.5 gap-0.5 min-h-[28px] shrink-0">
      {hasSheets && sheets.map((sheet, i) => (
        <div key={sheet.id} className="relative">
          {editingIndex === i ? (
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') commitRename();
                if (e.key === 'Escape') setEditingIndex(null);
              }}
              onBlur={commitRename}
              className="text-[11px] bg-slate-800 text-white border border-blue-400 rounded px-2 py-0.5 outline-none min-w-[60px] max-w-[120px]"
            />
          ) : (
            <button
              className={`text-[11px] px-2.5 py-1 rounded-t transition-colors whitespace-nowrap ${
                i === currentSheetIndex
                  ? 'bg-surface-hover text-text-primary border-b-2 border-primary font-medium'
                  : 'text-text-muted hover:text-text-secondary hover:bg-surface-hover/50'
              }`}
              onClick={() => switchSheet(i)}
              onDoubleClick={() => {
                setEditValue(sheet.name);
                setEditingIndex(i);
              }}
              onContextMenu={(e) => {
                e.preventDefault();
                setContextMenu({ index: i, x: e.clientX, y: e.clientY });
              }}
              title={`${sheet.name} — double-click to rename, right-click for options`}
            >
              {sheet.name}
            </button>
          )}
        </div>
      ))}

      <button
        onClick={addSheet}
        className="text-[11px] text-text-muted hover:text-text-primary px-1.5 py-1 rounded hover:bg-surface-hover/50"
        title="Add sheet"
      >
        +
      </button>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-slate-800 border border-slate-600 rounded shadow-lg py-1 min-w-[120px]"
          style={{ left: contextMenu.x, top: contextMenu.y - 80 }}
        >
          <button
            className="w-full text-left text-[11px] text-slate-200 hover:bg-slate-700 px-3 py-1"
            onClick={() => {
              setEditValue(sheets![contextMenu.index].name);
              setEditingIndex(contextMenu.index);
              setContextMenu(null);
            }}
          >
            Rename
          </button>
          <button
            className="w-full text-left text-[11px] text-slate-200 hover:bg-slate-700 px-3 py-1"
            onClick={() => {
              switchSheet(contextMenu.index);
              setTimeout(() => duplicateSheet(), 0);
              setContextMenu(null);
            }}
          >
            Duplicate
          </button>
          {sheets && sheets.length > 1 && (
            <button
              className="w-full text-left text-[11px] text-red-400 hover:bg-slate-700 px-3 py-1"
              onClick={() => {
                deleteSheet(contextMenu.index);
                setContextMenu(null);
              }}
            >
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  );
}
