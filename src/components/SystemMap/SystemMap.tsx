import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Plus, RotateCcw, Copy, Check } from 'lucide-react';
import { useProjectStore } from '../../stores/project-store';
import { useSheetStore } from '../../stores/sheet-store';
import { useUiStore } from '../../stores/ui-store';
import { buildSystemMapData } from '../../utils/domain-parser';
import { DomainBlock } from './DomainBlock';
import { EventArrow } from './EventArrow';
import { AddDomainDialog } from './AddDomainDialog';
import { DomainContextMenu } from './DomainContextMenu';
import { EventWiringDialog } from './EventWiringDialog';
import { NewEventDialog } from './NewEventDialog';
import type { Position } from '../../types/sheet';

const BLOCK_WIDTH = 200;
const BLOCK_HEIGHT = 120;

export function SystemMap() {
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const systemLayout = useProjectStore((s) => s.systemLayout);
  const updateDomainPosition = useProjectStore((s) => s.updateDomainPosition);
  const addDomain = useProjectStore((s) => s.addDomain);
  const deleteDomain = useProjectStore((s) => s.deleteDomain);
  const renameDomain = useProjectStore((s) => s.renameDomain);
  const navigateToDomain = useSheetStore((s) => s.navigateToDomain);
  const isLocked = useUiStore((s) => s.isLocked);

  const reloadProject = useProjectStore((s) => s.reloadProject);

  const [selectedDomainId, setSelectedDomainId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ domainId: string; x: number; y: number } | null>(null);
  const [eventWiringDomainId, setEventWiringDomainId] = useState<string | null>(null);
  const [renamingDomainId, setRenamingDomainId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ sourceDomainId: string; currentX: number; currentY: number } | null>(null);
  const [newEventDialog, setNewEventDialog] = useState<{ sourceDomainId: string; targetDomainId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const mapData = useMemo(
    () => buildSystemMapData(domainConfigs, systemLayout),
    [domainConfigs, systemLayout]
  );

  const confirmDelete = useCallback(async () => {
    if (!pendingDelete || isLocked) return;
    try {
      await deleteDomain(pendingDelete);
    } catch {
      // Silent
    }
    setPendingDelete(null);
    setSelectedDomainId(null);
  }, [pendingDelete, deleteDomain, isLocked]);

  const handleCreateDomain = useCallback(
    async (name: string, description: string) => {
      if (isLocked) return;
      try {
        await addDomain(name, description || undefined);
        setShowAddDialog(false);
      } catch {
        // TODO: error toast
      }
    },
    [addDomain, isLocked]
  );

  const handleRename = useCallback(
    async (domainId: string, newName: string) => {
      if (isLocked) return;
      setRenamingDomainId(null);
      try {
        await renameDomain(domainId, newName);
      } catch {
        // Silent
      }
    },
    [renameDomain, isLocked]
  );

  const handleReload = useCallback(async () => {
    setReloading(true);
    try {
      await reloadProject();
    } finally {
      setTimeout(() => setReloading(false), 600);
    }
  }, [reloadProject]);

  const handleCopyImplement = useCallback(() => {
    navigator.clipboard.writeText('/ddd-implement --all');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, []);

  // Backspace/Delete to prompt delete confirmation for selected domain
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedDomainId || isLocked) return;
      if (pendingDelete || showAddDialog) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setPendingDelete(selectedDomainId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedDomainId, pendingDelete, showAddDialog, isLocked]);

  const handlePositionChange = useCallback(
    (domainId: string, position: Position) => {
      updateDomainPosition(domainId, position);
    },
    [updateDomainPosition]
  );

  const handleDoubleClick = useCallback(
    (domainId: string) => {
      navigateToDomain(domainId);
    },
    [navigateToDomain]
  );

  const handleContextMenu = useCallback(
    (domainId: string, x: number, y: number) => {
      setContextMenu({ domainId, x, y });
    },
    []
  );

  const handleStartConnect = useCallback(
    (domainId: string, clientX: number, clientY: number) => {
      if (isLocked) return;
      setConnecting({ sourceDomainId: domainId, currentX: clientX, currentY: clientY });

      const handleMouseMove = (e: MouseEvent) => {
        setConnecting((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      };

      const handleMouseUp = (e: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        // Hit test against domain blocks
        const canvasEl = canvasRef.current;
        if (!canvasEl) { setConnecting(null); return; }
        const rect = canvasEl.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const { systemLayout: layout } = useProjectStore.getState();
        let targetId: string | null = null;
        for (const [id, pos] of Object.entries(layout.domains)) {
          if (id === domainId) continue;
          if (cx >= pos.x && cx <= pos.x + BLOCK_WIDTH && cy >= pos.y && cy <= pos.y + BLOCK_HEIGHT) {
            targetId = id;
            break;
          }
        }

        setConnecting(null);
        if (targetId) {
          setNewEventDialog({ sourceDomainId: domainId, targetDomainId: targetId });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isLocked]
  );

  if (mapData.domains.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted">
          <p className="text-lg font-medium mb-2">No Domains</p>
          <p className="text-sm mb-4">
            This project has no domains yet.
          </p>
          <button
            className="btn-primary"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Domain
          </button>
        </div>
        {showAddDialog && (
          <AddDomainDialog
            onClose={() => setShowAddDialog(false)}
            onCreate={handleCreateDomain}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="flex-1 relative overflow-hidden bg-bg-primary" onClick={() => { setSelectedDomainId(null); setContextMenu(null); }}>
      {/* SVG arrow overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="arrowhead"
            markerWidth="10"
            markerHeight="7"
            refX="10"
            refY="3.5"
            orient="auto"
          >
            <polygon
              points="0 0, 10 3.5, 0 7"
              fill="var(--color-text-muted)"
            />
          </marker>
        </defs>
        {mapData.eventArrows.map((arrow) => (
          <EventArrow
            key={arrow.id}
            arrow={arrow}
            domains={mapData.domains}
          />
        ))}
        {connecting && (() => {
          const sourceDomain = mapData.domains.find((d) => d.id === connecting.sourceDomainId);
          if (!sourceDomain) return null;
          const rect = canvasRef.current?.getBoundingClientRect();
          const offsetX = rect?.left ?? 0;
          const offsetY = rect?.top ?? 0;
          return (
            <line
              x1={sourceDomain.position.x + BLOCK_WIDTH / 2}
              y1={sourceDomain.position.y + BLOCK_HEIGHT / 2}
              x2={connecting.currentX - offsetX}
              y2={connecting.currentY - offsetY}
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          );
        })()}
      </svg>

      {/* Domain zones */}
      {mapData.zones?.map((zone) => {
        const zoneDomains = mapData.domains.filter((d) => zone.domain_ids.includes(d.id));
        if (zoneDomains.length === 0) return null;
        const minX = Math.min(...zoneDomains.map((d) => d.position.x)) - 30;
        const minY = Math.min(...zoneDomains.map((d) => d.position.y)) - 40;
        const maxX = Math.max(...zoneDomains.map((d) => d.position.x)) + BLOCK_WIDTH + 30;
        const maxY = Math.max(...zoneDomains.map((d) => d.position.y)) + BLOCK_HEIGHT + 30;
        return (
          <div
            key={zone.id}
            className="absolute border border-dashed rounded-2xl pointer-events-none"
            style={{
              left: minX,
              top: minY,
              width: maxX - minX,
              height: maxY - minY,
              borderColor: zone.color ?? 'var(--color-text-muted)',
              opacity: 0.3,
            }}
          >
            <span
              className="absolute -top-3 left-4 px-2 bg-bg-primary text-[10px] uppercase tracking-wider"
              style={{ color: zone.color ?? 'var(--color-text-muted)' }}
            >
              {zone.name}
            </span>
          </div>
        );
      })}

      {/* Domain blocks */}
      {mapData.domains.map((domain) => (
        <DomainBlock
          key={domain.id}
          domain={domain}
          selected={selectedDomainId === domain.id}
          isLocked={isLocked}
          onSelect={setSelectedDomainId}
          onPositionChange={handlePositionChange}
          onDoubleClick={handleDoubleClick}
          onRename={handleRename}
          onContextMenu={handleContextMenu}
          onStartConnect={handleStartConnect}
          editingExternal={renamingDomainId === domain.id}
        />
      ))}

      {/* Reload + Copy Implement buttons */}
      <div className="absolute bottom-4 left-4 z-10 flex gap-2">
        <button
          className="btn-secondary rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs"
          onClick={handleReload}
          title="Reload project from disk (Cmd+R)"
          disabled={reloading}
        >
          <RotateCcw className={`w-3.5 h-3.5 ${reloading ? 'animate-spin' : ''}`} />
          {reloading ? 'Reloading…' : 'Reload'}
        </button>
        <button
          className="btn-secondary rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs"
          onClick={handleCopyImplement}
          title="Copy /ddd-implement --all to clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Implement'}
        </button>
      </div>

      {/* Add Domain button */}
      <button
        className="absolute bottom-4 right-4 z-10 btn-primary rounded-full w-12 h-12 p-0 shadow-lg"
        onClick={() => setShowAddDialog(true)}
        title="Add Domain"
        disabled={isLocked}
        style={isLocked ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        <Plus className="w-5 h-5" />
      </button>

      {showAddDialog && (
        <AddDomainDialog
          onClose={() => setShowAddDialog(false)}
          onCreate={handleCreateDomain}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-[360px] space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Delete Domain</h3>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete <strong>{pendingDelete}</strong>? This will remove the domain and all its flows.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setPendingDelete(null)}>
                Cancel
              </button>
              <button className="btn-danger" onClick={confirmDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {contextMenu && (
        <DomainContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          domainId={contextMenu.domainId}
          isLocked={isLocked}
          onClose={() => setContextMenu(null)}
          onEditEvents={() => setEventWiringDomainId(contextMenu.domainId)}
          onRename={() => setRenamingDomainId(contextMenu.domainId)}
          onDelete={() => setPendingDelete(contextMenu.domainId)}
          onStartConnect={() => handleStartConnect(contextMenu.domainId, contextMenu.x, contextMenu.y)}
        />
      )}

      {eventWiringDomainId && (
        <EventWiringDialog
          domainId={eventWiringDomainId}
          isLocked={isLocked}
          onClose={() => setEventWiringDomainId(null)}
        />
      )}

      {newEventDialog && (
        <NewEventDialog
          sourceDomainId={newEventDialog.sourceDomainId}
          targetDomainId={newEventDialog.targetDomainId}
          onClose={() => setNewEventDialog(null)}
        />
      )}
    </div>
  );
}
