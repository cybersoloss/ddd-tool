import { useRef, useCallback, useState, useEffect } from 'react';
import { Layers, GripVertical, User, Database, Cog, Globe } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import type { SystemMapDomain } from '../../types/domain';
import type { Position } from '../../types/sheet';

interface Props {
  domain: SystemMapDomain;
  selected: boolean;
  isLocked?: boolean;
  scale?: number;
  animating?: boolean;
  onSelect: (domainId: string) => void;
  onPositionChange: (domainId: string, position: Position) => void;
  onDoubleClick: (domainId: string) => void;
  onRename: (domainId: string, newName: string) => void;
  onContextMenu?: (domainId: string, x: number, y: number) => void;
  onStartConnect?: (domainId: string, clientX: number, clientY: number) => void;
  editingExternal?: boolean;
}

export function DomainBlock({ domain, selected, isLocked, scale = 1, animating, onSelect, onPositionChange, onDoubleClick, onRename, onContextMenu, onStartConnect, editingExternal }: Props) {
  const domainResult = useValidationStore((s) => s.domainResults[domain.id]);

  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const didDrag = useRef(false);
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  useEffect(() => {
    if (editingExternal && !isLocked) {
      setDraft(domain.name);
      setEditing(true);
    }
  }, [editingExternal, domain.name, isLocked]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (editing) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(domain.id);
      if (isLocked) return;
      dragging.current = true;
      didDrag.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { x: domain.position.x, y: domain.position.y };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const rawDx = me.clientX - dragStart.current.x;
        const rawDy = me.clientY - dragStart.current.y;
        if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3) didDrag.current = true;
        onPositionChange(domain.id, {
          x: posStart.current.x + rawDx / scaleRef.current,
          y: posStart.current.y + rawDy / scaleRef.current,
        });
      };

      const handleMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [domain.id, domain.position.x, domain.position.y, onPositionChange, onSelect, editing, isLocked]
  );

  const handleBlockDoubleClick = useCallback(() => {
    if (!didDrag.current) onDoubleClick(domain.id);
  }, [domain.id, onDoubleClick]);

  const startEditing = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setDraft(domain.name);
    setEditing(true);
  }, [domain.name, isLocked]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== domain.name) {
      onRename(domain.id, trimmed);
    }
    setEditing(false);
  }, [draft, domain.name, domain.id, onRename]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        commitRename();
      } else if (e.key === 'Escape') {
        setEditing(false);
      }
    },
    [commitRename]
  );

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (onContextMenu) onContextMenu(domain.id, e.clientX, e.clientY);
    },
    [domain.id, onContextMenu]
  );

  return (
    <div
      className={`absolute group ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: domain.position.x,
        top: domain.position.y,
        minWidth: 200,
        maxWidth: 320,
        transition: animating ? 'left 300ms ease, top 300ms ease' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleBlockDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={`bg-bg-secondary border rounded-xl p-4 transition-colors shadow-lg ${
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-border group-hover:border-accent'
      } ${domain.role === 'entity' ? 'border-l-4 border-l-emerald-500' : domain.role === 'process' ? 'border-l-4 border-l-blue-500' : domain.role === 'interface' ? 'border-l-4 border-l-amber-500' : domain.role === 'orchestration' ? 'border-l-4 border-l-purple-500' : ''}`}>
        {/* Human touchpoint marker */}
        {domain.hasHumanTouchpoint && (
          <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-amber-500 flex items-center justify-center z-10" title="Human interaction point">
            <User className="w-3 h-3 text-white" />
          </div>
        )}
        {/* Header */}
        <div className="flex items-center gap-2 mb-2">
          <GripVertical className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          <Layers className="w-4 h-4 text-accent" />
          {editing ? (
            <input
              className="text-sm font-semibold text-text-primary bg-bg-primary border border-accent rounded px-1 py-0 outline-none w-full"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={commitRename}
              onKeyDown={handleKeyDown}
              onMouseDown={(e) => e.stopPropagation()}
              autoFocus
            />
          ) : (
            <span
              className="text-sm font-semibold text-text-primary truncate cursor-text"
              onDoubleClick={startEditing}
            >
              {domain.name}
            </span>
          )}
        </div>

        {/* Description */}
        {domain.description && (
          <p className="text-xs text-text-secondary mb-3 line-clamp-2">
            {domain.description}
          </p>
        )}

        {/* Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full flex items-center gap-1">
            {domain.flowCount} {domain.flowCount === 1 ? 'flow' : 'flows'}
            {domainResult && (
              domainResult.errorCount > 0
                ? <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title={`${domainResult.errorCount} error(s)`} />
                : domainResult.warningCount > 0
                  ? <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" title={`${domainResult.warningCount} warning(s)`} />
                  : <span className="w-2 h-2 rounded-full bg-green-500 inline-block" title="All valid" />
            )}
          </span>
          {domain.role && (
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-0.5 ${
              domain.role === 'entity' ? 'bg-emerald-500/10 text-emerald-400' :
              domain.role === 'process' ? 'bg-blue-500/10 text-blue-400' :
              domain.role === 'interface' ? 'bg-amber-500/10 text-amber-400' :
              'bg-purple-500/10 text-purple-400'
            }`}>
              {domain.role === 'entity' ? <Database className="w-2.5 h-2.5" /> :
               domain.role === 'process' ? <Cog className="w-2.5 h-2.5" /> :
               domain.role === 'interface' ? <Globe className="w-2.5 h-2.5" /> :
               <Layers className="w-2.5 h-2.5" />}
              {domain.role}
            </span>
          )}
          {domain.owns_schemas && domain.owns_schemas.length > 0 && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title={domain.owns_schemas.join(', ')}>
              <Database className="w-2.5 h-2.5" />
              {domain.owns_schemas.length}
            </span>
          )}
        </div>

        {/* Connection handles */}
        {!isLocked && onStartConnect && (
          <>
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-bg-secondary opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect(domain.id, e.clientX, e.clientY); }}
            />
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-bg-secondary opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect(domain.id, e.clientX, e.clientY); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
