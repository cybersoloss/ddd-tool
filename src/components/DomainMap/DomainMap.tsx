import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Plus, RotateCcw, Copy, Check, Database, LayoutGrid } from 'lucide-react';
import { useSheetStore } from '../../stores/sheet-store';
import { useProjectStore } from '../../stores/project-store';
import { useImplementationStore } from '../../stores/implementation-store';
import { useUiStore } from '../../stores/ui-store';
import { useValidationStore } from '../../stores/validation-store';
import { buildDomainMapData, extractOrchestrationData } from '../../utils/domain-parser';
import { useCanvasTransform } from '../../hooks/useCanvasTransform';
import { FlowBlock } from './FlowBlock';
import { PortalNode } from './PortalNode';
import { DomainEventArrow } from './DomainEventArrow';
import { SupervisorArrow } from './SupervisorArrow';
import { HandoffArrow } from './HandoffArrow';
import { AgentGroupBoundary } from './AgentGroupBoundary';
import { AddFlowDialog } from './AddFlowDialog';
import { FlowContextMenu } from './FlowContextMenu';
import { MoveFlowDialog } from './MoveFlowDialog';
import { ChangeFlowTypeDialog } from './ChangeFlowTypeDialog';
import { NewFlowEventDialog } from './NewFlowEventDialog';
import { ZoomControls } from '../shared/ZoomControls';
import type { Position } from '../../types/sheet';
import type { DomainOrchestration } from '../../types/domain';

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
  const duplicateFlow = useProjectStore((s) => s.duplicateFlow);
  const moveFlowAction = useProjectStore((s) => s.moveFlow);
  const changeFlowType = useProjectStore((s) => s.changeFlowType);
  const reloadProject = useProjectStore((s) => s.reloadProject);
  const autoLayoutFlows = useProjectStore((s) => s.autoLayoutFlows);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFlowId, setSelectedFlowId] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);
  const [reloading, setReloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ flowId: string; x: number; y: number } | null>(null);
  const [renamingFlowId, setRenamingFlowId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState<{ sourceFlowId: string; currentX: number; currentY: number } | null>(null);
  const [newEventDialog, setNewEventDialog] = useState<{ sourceFlowId: string; targetFlowId: string } | null>(null);
  const [moveFlowId, setMoveFlowId] = useState<string | null>(null);
  const [changeTypeFlowId, setChangeTypeFlowId] = useState<string | null>(null);
  const [animating, setAnimating] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);

  const { transform, transformStyle, screenToCanvas, fitView, zoomIn, zoomOut, handleCanvasMouseDown } = useCanvasTransform(canvasRef, domainId ? `domain:${domainId}` : undefined);

  const isLocked = useUiStore((s) => s.isLocked);
  const driftItems = useImplementationStore((s) => s.driftItems);

  const staleFlowKeys = useMemo(() => {
    const keys = new Set<string>();
    for (const drift of driftItems) {
      keys.add(drift.flowKey);
    }
    return keys;
  }, [driftItems]);

  const validateDomainFlows = useValidationStore((s) => s.validateDomainFlows);

  // Validate flows in this domain on mount and when domain changes (debounced)
  useEffect(() => {
    if (!domainId) return;
    const timer = setTimeout(() => {
      validateDomainFlows(domainId);
    }, 500);
    return () => clearTimeout(timer);
  }, [domainId, domainConfigs, validateDomainFlows]);

  const [orchestration, setOrchestration] = useState<DomainOrchestration | null>(null);
  const projectPath = useProjectStore((s) => s.projectPath);

  // Load orchestration data for agent domains
  useEffect(() => {
    if (!domainId || !projectPath) {
      setOrchestration(null);
      return;
    }
    const config = domainConfigs[domainId];
    if (!config) return;

    // Only extract if domain has agent flows
    const hasAgentFlows = config.flows.some((f) => f.type === 'agent');
    if (!hasAgentFlows) {
      setOrchestration(null);
      return;
    }

    let cancelled = false;
    extractOrchestrationData(domainId, config, projectPath).then((data) => {
      if (!cancelled) setOrchestration(data);
    }).catch(() => {
      if (!cancelled) setOrchestration(null);
    });

    return () => { cancelled = true; };
  }, [domainId, domainConfigs, projectPath]);

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

  const handleDuplicateFlow = useCallback(
    async (flowId: string) => {
      if (!domainId || isLocked) return;
      try {
        await duplicateFlow(domainId, flowId);
      } catch {
        // Silent
      }
    },
    [domainId, duplicateFlow, isLocked]
  );

  const handleMoveFlow = useCallback(
    async (flowId: string, targetDomainId: string) => {
      if (!domainId || isLocked) return;
      try {
        await moveFlowAction(domainId, flowId, targetDomainId);
        setMoveFlowId(null);
      } catch {
        // Silent
      }
    },
    [domainId, moveFlowAction, isLocked]
  );

  const handleChangeFlowType = useCallback(
    async (flowId: string, newType: 'traditional' | 'agent') => {
      if (!domainId || isLocked) return;
      try {
        await changeFlowType(domainId, flowId, newType);
        setChangeTypeFlowId(null);
      } catch {
        // Silent
      }
    },
    [domainId, changeFlowType, isLocked]
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

        // Hit test using canvas coordinates
        const cursor = screenToCanvas(e.clientX, e.clientY);

        const configs = useProjectStore.getState().domainConfigs;
        const domain = configs[domainId!];
        if (!domain) { setConnecting(null); return; }
        const flowLayout = domain.layout.flows;

        let targetId: string | null = null;
        for (const f of domain.flows) {
          if (f.id === flowId) continue;
          const pos = flowLayout[f.id];
          if (!pos) continue;
          if (cursor.x >= pos.x && cursor.x <= pos.x + FLOW_WIDTH && cursor.y >= pos.y && cursor.y <= pos.y + FLOW_HEIGHT) {
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
    [isLocked, domainId, screenToCanvas]
  );

  const handleAutoLayout = useCallback(async () => {
    if (!domainId) return;
    await autoLayoutFlows(domainId);
    setAnimating(true);
    // Fit view to new positions after layout
    const configs = useProjectStore.getState().domainConfigs;
    const domain = configs[domainId];
    if (domain) {
      const flowPositions = Object.values(domain.layout.flows);
      const portalPositions = Object.values(domain.layout.portals ?? {});
      const allPositions = [...flowPositions, ...portalPositions];
      if (allPositions.length > 0) {
        fitView(allPositions, FLOW_WIDTH, FLOW_HEIGHT);
      }
    }
    setTimeout(() => setAnimating(false), 350);
  }, [domainId, autoLayoutFlows, fitView]);

  const handleFitView = useCallback(() => {
    if (!mapData) return;
    const flowPositions = mapData.flows.map((f) => f.position);
    const portalPositions = mapData.portals.map((p) => p.position);
    const allPositions = [...flowPositions, ...portalPositions];
    fitView(allPositions, FLOW_WIDTH, FLOW_HEIGHT);
  }, [mapData, fitView]);

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
    <div ref={canvasRef} className="relative flex-1 overflow-hidden bg-bg-primary" onClick={() => { setSelectedFlowId(null); setContextMenu(null); }} onMouseDown={handleCanvasMouseDown}>
      {/* Transform wrapper — contains all canvas-coordinate content */}
      <div style={transformStyle}>
        {/* SVG arrow overlay */}
        <svg className="absolute top-0 left-0 pointer-events-none" style={{ overflow: 'visible', width: 1, height: 1 }}>
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
            <marker
              id="supervisor-arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="var(--color-accent)"
              />
            </marker>
            <marker
              id="handoff-arrowhead"
              markerWidth="10"
              markerHeight="7"
              refX="10"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#a78bfa"
              />
            </marker>
            <marker
              id="handoff-arrowhead-reverse"
              markerWidth="10"
              markerHeight="7"
              refX="0"
              refY="3.5"
              orient="auto-start-reverse"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill="#a78bfa"
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
          {/* Orchestration: supervisor arrows */}
          {orchestration?.relationships
            .filter((r) => r.type === 'supervisor')
            .map((r) => (
              <SupervisorArrow
                key={`sup-${r.sourceFlowId}-${r.targetFlowId}`}
                sourceFlowId={r.sourceFlowId}
                targetFlowId={r.targetFlowId}
                flows={mapData.flows}
                flowWidth={FLOW_WIDTH}
                flowHeight={FLOW_HEIGHT}
              />
            ))}
          {/* Orchestration: handoff arrows */}
          {orchestration?.relationships
            .filter((r) => r.type === 'handoff')
            .map((r) => (
              <HandoffArrow
                key={`hoff-${r.sourceFlowId}-${r.targetFlowId}`}
                relationship={r}
                flows={mapData.flows}
                flowWidth={FLOW_WIDTH}
                flowHeight={FLOW_HEIGHT}
              />
            ))}
          {connecting && (() => {
            const sourceFlow = mapData.flows.find((f) => f.id === connecting.sourceFlowId);
            if (!sourceFlow) return null;
            const cursor = screenToCanvas(connecting.currentX, connecting.currentY);
            return (
              <line
                x1={sourceFlow.position.x + FLOW_WIDTH / 2}
                y1={sourceFlow.position.y + FLOW_HEIGHT / 2}
                x2={cursor.x}
                y2={cursor.y}
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
            domainId={domainId ?? undefined}
            selected={selectedFlowId === flow.id}
            isStale={domainId ? staleFlowKeys.has(`${domainId}/${flow.id}`) : false}
            isLocked={isLocked}
            scale={transform.scale}
            animating={animating}
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
            scale={transform.scale}
            animating={animating}
            onPositionChange={handlePortalPositionChange}
            onDoubleClick={handlePortalDoubleClick}
          />
        ))}

        {/* Orchestration: agent group boundaries */}
        {orchestration?.agentGroups.map((group) => (
          <AgentGroupBoundary
            key={group.id}
            group={group}
            flows={mapData.flows}
            flowWidth={FLOW_WIDTH}
            flowHeight={FLOW_HEIGHT}
          />
        ))}

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
      </div>

      {/* Schema ownership badge — outside transform */}
      {domainConfig?.owns_schemas && domainConfig.owns_schemas.length > 0 && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-1.5 bg-bg-secondary/90 backdrop-blur border border-border rounded-lg px-3 py-2">
          <Database className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[10px] text-text-muted uppercase tracking-wider mr-1">Schemas:</span>
          {domainConfig.owns_schemas.map((s) => (
            <span key={s} className="text-xs text-text-secondary bg-bg-tertiary px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      {/* Zoom controls */}
      <ZoomControls
        scale={transform.scale}
        onZoomIn={zoomIn}
        onZoomOut={zoomOut}
        onFitView={handleFitView}
      />

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
        {!isLocked && domainId && (
          <button
            className="btn-secondary rounded-lg px-3 py-2 shadow-lg flex items-center gap-1.5 text-xs"
            onClick={handleAutoLayout}
            title="Auto-arrange flows into a grid"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Auto Layout
          </button>
        )}
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
          onDuplicate={() => handleDuplicateFlow(contextMenu.flowId)}
          onMove={() => setMoveFlowId(contextMenu.flowId)}
          onChangeType={() => setChangeTypeFlowId(contextMenu.flowId)}
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

      {moveFlowId && domainId && (
        <MoveFlowDialog
          flowId={moveFlowId}
          currentDomainId={domainId}
          onClose={() => setMoveFlowId(null)}
          onMove={(targetDomainId) => handleMoveFlow(moveFlowId, targetDomainId)}
        />
      )}

      {changeTypeFlowId && domainId && (() => {
        const entry = domainConfig?.flows.find((f) => f.id === changeTypeFlowId);
        const currentType = (entry?.type ?? 'traditional') as 'traditional' | 'agent';
        return (
          <ChangeFlowTypeDialog
            flowId={changeTypeFlowId}
            currentType={currentType}
            onClose={() => setChangeTypeFlowId(null)}
            onConfirm={(newType) => handleChangeFlowType(changeTypeFlowId, newType)}
          />
        );
      })()}
    </div>
  );
}
