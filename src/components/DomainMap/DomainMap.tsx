import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Plus, RotateCcw, Copy, Check, Database } from 'lucide-react';
import { useSheetStore } from '../../stores/sheet-store';
import { useProjectStore } from '../../stores/project-store';
import { useImplementationStore } from '../../stores/implementation-store';
import { useUiStore } from '../../stores/ui-store';
import { useMemoryStore } from '../../stores/memory-store';
import { buildDomainMapData } from '../../utils/domain-parser';
import { FlowBlock } from './FlowBlock';
import { PortalNode } from './PortalNode';
import { DomainEventArrow } from './DomainEventArrow';
import { AddFlowDialog } from './AddFlowDialog';
import { FlowContextMenu } from './FlowContextMenu';
import { NewFlowEventDialog } from './NewFlowEventDialog';
import type { Position } from '../../types/sheet';

const FLOW_WIDTH = 180;
const FLOW_HEIGHT = 80;

export function DomainMap() {
  const domainId = useSheetStore((s) => s.current.domainId);
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const updateFlowPosition = useProjectStore((s) => s.updateFlowPosition);
  const updatePortalPosition = useProjectStore((s) => s.updatePortalPosition);
  const navigateToFlow = useSheetStore((s) => s.navigateToFlow);
  const navigateToDomain = useSheetStore((s) => s.navigateToDomain);

  const addFlow = useProjectStore((s) => s.addFlow);
  const deleteFlow = useProjectStore((s) => s.deleteFlow);
  const renameFlow = useProjectStore((s) => s.renameFlow);
  const reloadProject = useProjectStore((s) => s.reloadProject);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ flowId: string; x: number; y: number } | null>(null);
  const [renamingFlowId, setRenamingFlowId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ sourceFlowId: string; currentX: number; currentY: number } | null>(null);
  const [newEventDialog, setNewEventDialog] = useState<{ sourceFlowId: string; targetFlowId: string } | null>(null);
  const canvasRef = useRef<HTMLDivElement>(null);

  const isLocked = useUiStore((s) => s.isLocked);
  const implementationStatus = useMemoryStore((s) => s.implementationStatus);
  const driftItems = useImplementationStore((s) => s.driftItems);

  const staleFlowKeys = useMemo(() => {
    const keys = new Set<string>();
    // Check drift items from implementation store
    for (const drift of driftItems) {
      keys.add(drift.flowKey);
    }
    // Also check memory store's implementation status
    if (implementationStatus) {
      for (const [key, status] of Object.entries(implementationStatus.flows)) {
        if (status.status === 'stale') {
          keys.add(key);
        }
      }
    }
    return keys;
  }, [driftItems, implementationStatus]);

  const domainConfig = domainId ? domainConfigs[domainId] : null;

  const handleCreateFlow = useCallback(
    async (name: string, description: string, flowType: 'traditional' | 'agent', templateId?: string) => {
      if (!domainId || isLocked) return;
      try {
        const flowId = await addFlow(domainId, name, description || undefined, flowType, templateId);
        setShowAddDialog(false);
        navigateToFlow(domainId, flowId);
      } catch {
        // TODO: error toast
      }
    },
    [domainId, addFlow, navigateToFlow, isLocked]
  );

  const handleDeleteFlow = useCallback(
    (flowId: string) => {
      setPendingDelete(flowId);
    },
    []
  );

  const confirmDelete = useCallback(async () => {
    if (!domainId || !pendingDelete || isLocked) return;
    try {
      await deleteFlow(domainId, pendingDelete);
    } catch {
      // Silent
    }
    setPendingDelete(null);
    setSelectedFlowId(null);
  }, [domainId, pendingDelete, deleteFlow, isLocked]);

  // Backspace/Delete to prompt delete confirmation for selected flow
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedFlowId || isLocked) return;
      if (showAddDialog || pendingDelete) return;
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        setPendingDelete(selectedFlowId);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedFlowId, showAddDialog, pendingDelete, isLocked]);

  const mapData = useMemo(() => {
    if (!domainId || !domainConfig) return null;
    return buildDomainMapData(domainId, domainConfig, domainConfigs);
  }, [domainId, domainConfig, domainConfigs]);

  const handleFlowPositionChange = useCallback(
    (flowId: string, position: Position) => {
      if (domainId) updateFlowPosition(domainId, flowId, position);
    },
    [domainId, updateFlowPosition]
  );

  const handlePortalPositionChange = useCallback(
    (portalId: string, position: Position) => {
      if (domainId) updatePortalPosition(domainId, portalId, position);
    },
    [domainId, updatePortalPosition]
  );

  const handleFlowDoubleClick = useCallback(
    (flowId: string) => {
      if (domainId) navigateToFlow(domainId, flowId);
    },
    [domainId, navigateToFlow]
  );

  const handlePortalDoubleClick = useCallback(
    (portalId: string) => {
      navigateToDomain(portalId);
    },
    [navigateToDomain]
  );

  const handleRenameFlow = useCallback(
    async (flowId: string, newName: string) => {
      if (!domainId || isLocked) return;
      setRenamingFlowId(null);
      try {
        await renameFlow(domainId, flowId, newName);
      } catch {
        // Silent
      }
    },
    [domainId, renameFlow, isLocked]
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
    if (!domainId) return;
    navigator.clipboard.writeText(`/ddd-implement ${domainId}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [domainId]);

  const handleFlowContextMenu = useCallback(
    (flowId: string, x: number, y: number) => {
      setContextMenu({ flowId, x, y });
    },
    []
  );

  const handleStartConnect = useCallback(
    (flowId: string, clientX: number, clientY: number) => {
      if (isLocked || !domainId) return;
      setConnecting({ sourceFlowId: flowId, currentX: clientX, currentY: clientY });

      const handleMouseMove = (e: MouseEvent) => {
        setConnecting((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
      };

      const handleMouseUp = (e: MouseEvent) => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);

        const canvasEl = canvasRef.current;
        if (!canvasEl) { setConnecting(null); return; }
        const rect = canvasEl.getBoundingClientRect();
        const cx = e.clientX - rect.left;
        const cy = e.clientY - rect.top;

        const configs = useProjectStore.getState().domainConfigs;
        const domain = configs[domainId!];
        if (!domain) { setConnecting(null); return; }
        const flowLayout = domain.layout.flows;

        let targetId: string | null = null;
        for (const f of domain.flows) {
          if (f.id === flowId) continue;
          const pos = flowLayout[f.id];
          if (!pos) continue;
          if (cx >= pos.x && cx <= pos.x + FLOW_WIDTH && cy >= pos.y && cy <= pos.y + FLOW_HEIGHT) {
            targetId = f.id;
            break;
          }
        }

        setConnecting(null);
        if (targetId) {
          setNewEventDialog({ sourceFlowId: flowId, targetFlowId: targetId });
        }
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [isLocked, domainId]
  );

  if (!mapData || (mapData.flows.length === 0 && mapData.portals.length === 0)) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <div className="text-center text-text-muted">
          <p className="text-lg font-medium mb-2">No Flows</p>
          <p className="text-sm mb-4">
            This domain has no flows yet.
          </p>
          <button
            className="btn-primary"
            onClick={() => setShowAddDialog(true)}
          >
            <Plus className="w-4 h-4" />
            Add Flow
          </button>
        </div>
        {showAddDialog && (
          <AddFlowDialog
            onClose={() => setShowAddDialog(false)}
            onCreate={handleCreateFlow}
          />
        )}
      </div>
    );
  }

  return (
    <div ref={canvasRef} className="relative flex-1 overflow-hidden bg-bg-primary" onClick={() => { setSelectedFlowId(null); setContextMenu(null); }}>
      {/* SVG arrow overlay */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        <defs>
          <marker
            id="domain-arrowhead"
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
          <DomainEventArrow
            key={arrow.id}
            arrow={arrow}
            flows={mapData.flows}
            portals={mapData.portals}
          />
        ))}
        {connecting && (() => {
          const sourceFlow = mapData.flows.find((f) => f.id === connecting.sourceFlowId);
          if (!sourceFlow) return null;
          const rect = canvasRef.current?.getBoundingClientRect();
          const offsetX = rect?.left ?? 0;
          const offsetY = rect?.top ?? 0;
          return (
            <line
              x1={sourceFlow.position.x + FLOW_WIDTH / 2}
              y1={sourceFlow.position.y + FLOW_HEIGHT / 2}
              x2={connecting.currentX - offsetX}
              y2={connecting.currentY - offsetY}
              stroke="var(--color-accent)"
              strokeWidth={2}
              strokeDasharray="6 3"
            />
          );
        })()}
      </svg>

      {/* Flow blocks */}
      {mapData.flows.map((flow) => (
        <FlowBlock
          key={flow.id}
          flow={flow}
          selected={selectedFlowId === flow.id}
          isStale={domainId ? staleFlowKeys.has(`${domainId}/${flow.id}`) : false}
          isLocked={isLocked}
          onSelect={setSelectedFlowId}
          onPositionChange={handleFlowPositionChange}
          onDoubleClick={handleFlowDoubleClick}
          onDelete={handleDeleteFlow}
          onRename={handleRenameFlow}
          onContextMenu={handleFlowContextMenu}
          onStartConnect={handleStartConnect}
          editingExternal={renamingFlowId === flow.id}
        />
      ))}

      {/* Portal nodes */}
      {mapData.portals.map((portal) => (
        <PortalNode
          key={portal.id}
          portal={portal}
          onPositionChange={handlePortalPositionChange}
          onDoubleClick={handlePortalDoubleClick}
        />
      ))}

      {/* Schema ownership badge */}
      {domainConfig?.owns_schemas && domainConfig.owns_schemas.length > 0 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-bg-secondary/90 backdrop-blur border border-border rounded-lg px-3 py-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider mr-1">Schemas:</span>
          {domainConfig.owns_schemas.map((s) => (
            <span key={s} className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {/* Flow groups / swimlanes */}
      {domainConfig?.groups?.map((group) => {
        const groupFlows = mapData.flows.filter((f) => group.flow_ids.includes(f.id));
        if (groupFlows.length === 0) return null;
        const minX = Math.min(...groupFlows.map((f) => f.position.x)) - 20;
        const minY = Math.min(...groupFlows.map((f) => f.position.y)) - 30;
        const maxX = Math.max(...groupFlows.map((f) => f.position.x)) + FLOW_WIDTH + 20;
        const maxY = Math.max(...groupFlows.map((f) => f.position.y)) + FLOW_HEIGHT + 20;
        return (
          <div
            key={group.id}
            className="absolute border border-dashed border-text-muted/20 rounded-xl pointer-events-none"
            style={{ left: minX, top: minY, width: maxX - minX, height: maxY - minY }}
          >
            <span className="absolute -top-3 left-3 px-2 bg-bg-primary text-[10px] text-text-muted uppercase tracking-wider">
              {group.name}
            </span>
          </div>
        );
      })}

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
          title={`Copy /ddd-implement ${domainId} to clipboard`}
        >
          {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
          {copied ? 'Copied!' : 'Implement'}
        </button>
      </div>

      {/* Add Flow button */}
      <button
        className="absolute bottom-4 right-4 z-10 btn-primary rounded-full w-12 h-12 p-0 shadow-lg"
        onClick={() => setShowAddDialog(true)}
        title="Add Flow"
        disabled={isLocked}
        style={isLocked ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
      >
        <Plus className="w-5 h-5" />
      </button>

      {showAddDialog && (
        <AddFlowDialog
          onClose={() => setShowAddDialog(false)}
          onCreate={handleCreateFlow}
        />
      )}

      {pendingDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="card p-6 w-[360px] space-y-4">
            <h3 className="text-sm font-semibold text-text-primary">Delete Flow</h3>
            <p className="text-sm text-text-secondary">
              Are you sure you want to delete <strong>{pendingDelete}</strong>? This will remove the flow and its YAML file.
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
        <FlowContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          flowId={contextMenu.flowId}
          isLocked={isLocked}
          onClose={() => setContextMenu(null)}
          onNavigate={() => { if (domainId) navigateToFlow(domainId, contextMenu.flowId); }}
          onRename={() => setRenamingFlowId(contextMenu.flowId)}
          onDelete={() => setPendingDelete(contextMenu.flowId)}
          onStartConnect={() => handleStartConnect(contextMenu.flowId, contextMenu.x, contextMenu.y)}
        />
      )}

      {newEventDialog && domainId && (
        <NewFlowEventDialog
          domainId={domainId}
          sourceFlowId={newEventDialog.sourceFlowId}
          targetFlowId={newEventDialog.targetFlowId}
          onClose={() => setNewEventDialog(null)}
        />
      )}
    </div>
  );
}
