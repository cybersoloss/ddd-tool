import { useRef, useCallback, useState, useEffect } from 'react';
import { GitBranch, GripVertical, Bot, Trash2, AlertTriangle, Clock, Globe, Zap, Keyboard } from 'lucide-react';
import { useValidationStore } from '../../stores/validation-store';
import type { DomainMapFlow } from '../../types/domain';
import type { Position } from '../../types/sheet';

interface Props {
  flow: DomainMapFlow;
  domainId?: string;
  selected: boolean;
  isStale?: boolean;
  isLocked?: boolean;
  scale?: number;
  animating?: boolean;
  onSelect: (flowId: string) => void;
  onPositionChange: (flowId: string, position: Position) => void;
  onDoubleClick: (flowId: string) => void;
  onDelete: (flowId: string) => void;
  onRename: (flowId: string, newName: string) => void;
  onContextMenu?: (flowId: string, x: number, y: number) => void;
  onStartConnect?: (flowId: string, clientX: number, clientY: number) => void;
  editingExternal?: boolean;
}

export function FlowBlock({ flow, domainId, selected, isStale, isLocked, scale = 1, animating, onSelect, onPositionChange, onDoubleClick, onDelete, onRename, onContextMenu, onStartConnect, editingExternal }: Props) {
  const flowKey = domainId ? `${domainId}/${flow.id}` : null;
  const flowValidation = useValidationStore((s) => flowKey ? s.flowResults[flowKey] ?? null : null);
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
      setDraft(flow.name);
      setEditing(true);
    }
  }, [editingExternal, flow.name, isLocked]);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      if (editing) return;
      e.preventDefault();
      e.stopPropagation();
      onSelect(flow.id);
      if (isLocked) return;
      dragging.current = true;
      didDrag.current = false;
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { x: flow.position.x, y: flow.position.y };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const rawDx = me.clientX - dragStart.current.x;
        const rawDy = me.clientY - dragStart.current.y;
        if (Math.abs(rawDx) > 3 || Math.abs(rawDy) > 3) didDrag.current = true;
        onPositionChange(flow.id, {
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
    [flow.id, flow.position.x, flow.position.y, onPositionChange, onSelect, editing, isLocked]
  );

  const handleBlockDoubleClick = useCallback(() => {
    if (!didDrag.current) onDoubleClick(flow.id);
  }, [flow.id, onDoubleClick]);

  const handleDeleteClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(flow.id);
    },
    [flow.id, onDelete]
  );

  const startEditing = useCallback((e: React.MouseEvent) => {
    if (isLocked) return;
    e.stopPropagation();
    setDraft(flow.name);
    setEditing(true);
  }, [flow.name, isLocked]);

  const commitRename = useCallback(() => {
    const trimmed = draft.trim();
    if (trimmed && trimmed !== flow.name) {
      onRename(flow.id, trimmed);
    }
    setEditing(false);
  }, [draft, flow.name, flow.id, onRename]);

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
      if (onContextMenu) onContextMenu(flow.id, e.clientX, e.clientY);
    },
    [flow.id, onContextMenu]
  );

  return (
    <div
      className={`absolute group ${isLocked ? 'cursor-default' : 'cursor-grab active:cursor-grabbing'}`}
      style={{
        left: flow.position.x,
        top: flow.position.y,
        minWidth: 180,
        maxWidth: 280,
        transition: animating ? 'left 300ms ease, top 300ms ease' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onClick={(e) => e.stopPropagation()}
      onDoubleClick={handleBlockDoubleClick}
      onContextMenu={handleContextMenu}
    >
      <div className={`bg-bg-secondary border rounded-xl p-4 transition-colors shadow-lg relative ${
        selected ? 'border-accent ring-2 ring-accent/30' : 'border-border group-hover:border-accent'
      }`}>
        {/* Delete button */}
        {!isLocked && (
          <button
            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-bg-tertiary border border-border flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-danger hover:border-danger hover:text-white text-text-muted z-10"
            onClick={handleDeleteClick}
            title="Delete flow"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        )}

        {/* Header */}
        <div className="flex items-center gap-2 mb-1">
          <GripVertical className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          <GitBranch className="w-4 h-4 text-accent" />
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
              {flow.name}
            </span>
          )}
          {isStale && (
            <span title="Spec changed since last implementation">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            </span>
          )}
          {flowValidation && (
            flowValidation.errorCount > 0
              ? <span className="w-2 h-2 rounded-full bg-red-500 shrink-0" title={`${flowValidation.errorCount} error(s)`} />
              : flowValidation.warningCount > 0
                ? <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" title={`${flowValidation.warningCount} warning(s)`} />
                : <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" title="All valid" />
          )}
        </div>

        {/* Description */}
        {flow.description && (
          <p className="text-xs text-text-secondary mb-2 line-clamp-2 ml-6">
            {flow.description}
          </p>
        )}

        {/* Type & tag badges */}
        <div className="flex items-center gap-1 ml-6 flex-wrap">
          {flow.type === 'agent' && (
            <>
              <Bot className="w-3 h-3 text-text-muted" />
              <span className="text-xs bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded-full">
                Agent
              </span>
            </>
          )}
          {flow.tags?.map((tag) => {
            const isSchedule = tag.startsWith('cron:') || tag.startsWith('schedule:');
            const isHttp = tag === 'http' || tag === 'api';
            const isEvent = tag === 'event_handler';
            const TagIcon = isSchedule ? Clock : isHttp ? Globe : isEvent ? Zap : null;
            return (
              <span key={tag} className="text-[10px] bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                {TagIcon && <TagIcon className="w-2.5 h-2.5" />}
                {tag}
              </span>
            );
          })}
          {flow.schedule && (
            <span className="text-[10px] bg-bg-tertiary text-text-muted px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
              <Clock className="w-2.5 h-2.5" />
              {flow.schedule}
            </span>
          )}
          {flow.keyboard_shortcut && (
            <span className="text-[10px] bg-purple-500/10 text-purple-400 px-1.5 py-0.5 rounded-full flex items-center gap-0.5" title={`Keyboard shortcut: ${flow.keyboard_shortcut}`}>
              <Keyboard className="w-2.5 h-2.5" />
              {flow.keyboard_shortcut}
            </span>
          )}
        </div>

        {/* Connection handles */}
        {!isLocked && onStartConnect && (
          <>
            <div
              className="absolute -right-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-bg-secondary opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect(flow.id, e.clientX, e.clientY); }}
            />
            <div
              className="absolute -left-2 top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-accent border-2 border-bg-secondary opacity-0 group-hover:opacity-100 cursor-crosshair z-20"
              onMouseDown={(e) => { e.stopPropagation(); onStartConnect(flow.id, e.clientX, e.clientY); }}
            />
          </>
        )}
      </div>
    </div>
  );
}
