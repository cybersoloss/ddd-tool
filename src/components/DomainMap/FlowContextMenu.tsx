import { useEffect, useRef } from 'react';
import { PenLine, Trash2, Cable, ArrowRight, Copy, FolderInput, RefreshCw } from 'lucide-react';

interface FlowContextMenuProps {
  x: number;
  y: number;
  flowId: string;
  isLocked: boolean;
  onClose: () => void;
  onNavigate: () => void;
  onRename: () => void;
  onDelete: () => void;
  onStartConnect: () => void;
  onDuplicate?: () => void;
  onMove?: () => void;
  onChangeType?: () => void;
}

export function FlowContextMenu({
  x,
  y,
  flowId: _flowId,
  isLocked,
  onClose,
  onNavigate,
  onRename,
  onDelete,
  onStartConnect,
  onDuplicate,
  onMove,
  onChangeType,
}: FlowContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    }
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: x,
    top: y,
    zIndex: 100,
  };

  return (
    <div ref={menuRef} style={menuStyle}>
      <div className="bg-bg-secondary border border-border rounded-lg shadow-lg py-1 min-w-[180px]">
        <button
          className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-text-secondary hover:text-text-primary hover:bg-bg-hover transition-colors text-left"
          onClick={() => { onClose(); onNavigate(); }}
        >
          <ArrowRight className="w-3.5 h-3.5 shrink-0" />
          Edit Flow
        </button>

        <button
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
            isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => { onClose(); onRename(); }}
          disabled={isLocked}
        >
          <PenLine className="w-3.5 h-3.5 shrink-0" />
          Rename
        </button>

        {onDuplicate && (
          <button
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
              isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={() => { onClose(); onDuplicate(); }}
            disabled={isLocked}
          >
            <Copy className="w-3.5 h-3.5 shrink-0" />
            Duplicate
          </button>
        )}

        {onMove && (
          <button
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
              isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={() => { onClose(); onMove(); }}
            disabled={isLocked}
          >
            <FolderInput className="w-3.5 h-3.5 shrink-0" />
            Move to Domain...
          </button>
        )}

        {onChangeType && (
          <button
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
              isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
            }`}
            onClick={() => { onClose(); onChangeType(); }}
            disabled={isLocked}
          >
            <RefreshCw className="w-3.5 h-3.5 shrink-0" />
            Change Flow Type...
          </button>
        )}

        <button
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
            isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-danger hover:text-danger hover:bg-bg-hover'
          }`}
          onClick={() => { onClose(); onDelete(); }}
          disabled={isLocked}
        >
          <Trash2 className="w-3.5 h-3.5 shrink-0" />
          Delete
        </button>

        <div className="border-t border-border my-1" />

        <button
          className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs transition-colors text-left ${
            isLocked ? 'text-text-muted opacity-50 pointer-events-none' : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          onClick={() => { onClose(); onStartConnect(); }}
          disabled={isLocked}
        >
          <Cable className="w-3.5 h-3.5 shrink-0" />
          Draw Event Arrow
        </button>
      </div>
    </div>
  );
}
