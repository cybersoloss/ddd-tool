import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  applyNodeChanges,
  applyEdgeChanges,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  type OnNodesDelete,
  type OnEdgesDelete,
  BackgroundVariant,
  MarkerType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useFlowStore } from '../../stores/flow-store';
import { useSheetStore } from '../../stores/sheet-store';
import { useProjectStore } from '../../stores/project-store';
import { useValidationStore } from '../../stores/validation-store';
import { useImplementationStore } from '../../stores/implementation-store';
import { useUiStore } from '../../stores/ui-store';
import { nodeTypes } from './nodes';
import { CircuitBreakerEdge } from './edges/CircuitBreakerEdge';
import { NodeToolbar } from './NodeToolbar';
import { SpecPanel } from '../SpecPanel/SpecPanel';
import { NodeContextMenu } from './NodeContextMenu';
import { ValidationPanel } from '../Validation/ValidationPanel';
import { StaleBanner } from './StaleBanner';
import type { DddNodeData, DddNodeType, SmartRouterSpec } from '../../types/flow';

const edgeTypes = {
  circuit_breaker: CircuitBreakerEdge,
};

const defaultEdgeOptions = {
  animated: true,
  style: { stroke: 'var(--color-text-muted)', strokeWidth: 2 },
  markerEnd: { type: MarkerType.ArrowClosed, color: 'var(--color-text-muted)' },
};

/** Build React Flow nodes from the flow store document, injecting validation issues */
function buildNodes(
  flow: ReturnType<typeof useFlowStore.getState>['currentFlow'],
  nodeIssuesMap?: Map<string, import('../../types/validation').ValidationIssue[]>
): Node<DddNodeData>[] {
  if (!flow) return [];

  const result: Node<DddNodeData>[] = [];

  const t = flow.trigger;
  result.push({
    id: t.id,
    type: t.type,
    position: t.position,
    data: { label: t.label, spec: t.spec, dddType: t.type, validationIssues: nodeIssuesMap?.get(t.id) },
    deletable: false,
  });

  for (const n of flow.nodes) {
    const rfNode: Node<DddNodeData> = {
      id: n.id,
      type: n.type,
      position: n.position,
      data: { label: n.label, spec: n.spec, dddType: n.type, validationIssues: nodeIssuesMap?.get(n.id) },
    };

    if (n.parentId) {
      rfNode.parentId = n.parentId;
      rfNode.extent = 'parent';
    }

    result.push(rfNode);
  }

  return result;
}

/** Build React Flow edges from the flow store document */
function buildEdges(flow: ReturnType<typeof useFlowStore.getState>['currentFlow']): Edge[] {
  if (!flow) return [];

  const result: Edge[] = [];

  const addEdges = (node: { id: string; type: string; spec: unknown; connections: Array<{ targetNodeId: string; sourceHandle?: string; targetHandle?: string }> }) => {
    for (const conn of node.connections) {
      const edge: Edge = {
        id: `${node.id}->${conn.targetNodeId}${conn.sourceHandle ? `-${conn.sourceHandle}` : ''}`,
        source: node.id,
        target: conn.targetNodeId,
        sourceHandle: conn.sourceHandle ?? null,
        targetHandle: conn.targetHandle ?? null,
      };

      // Circuit breaker edge for smart_router nodes
      if (node.type === 'smart_router') {
        const spec = node.spec as SmartRouterSpec;
        if (spec.policies?.circuit_breaker?.enabled) {
          edge.type = 'circuit_breaker';
          edge.data = { cbState: spec.policies.circuit_breaker.runtime_state ?? 'closed' };
        }
      }

      result.push(edge);
    }
  };

  addEdges(flow.trigger);
  for (const n of flow.nodes) {
    addEdges(n);
  }

  return result;
}

function FlowCanvasInner() {
  const current = useSheetStore((s) => s.current);
  const projectPath = useProjectStore((s) => s.projectPath);
  const currentFlow = useFlowStore((s) => s.currentFlow);
  const loading = useFlowStore((s) => s.loading);
  const loadFlow = useFlowStore((s) => s.loadFlow);
  const unloadFlow = useFlowStore((s) => s.unloadFlow);
  const moveNode = useFlowStore((s) => s.moveNode);
  const addNode = useFlowStore((s) => s.addNode);
  const deleteNode = useFlowStore((s) => s.deleteNode);
  const selectNode = useFlowStore((s) => s.selectNode);
  const selectedNodeId = useFlowStore((s) => s.selectedNodeId);
  const addConnection = useFlowStore((s) => s.addConnection);
  const removeConnection = useFlowStore((s) => s.removeConnection);
  const validateCurrentFlow = useValidationStore((s) => s.validateCurrentFlow);
  const validationPanelOpen = useValidationStore((s) => s.panelOpen);
  const getCurrentFlowResult = useValidationStore((s) => s.getCurrentFlowResult);
  const driftItems = useImplementationStore((s) => s.driftItems);
  const minimapVisible = useUiStore((s) => s.minimapVisible);
  const isLocked = useUiStore((s) => s.isLocked);

  const { screenToFlowPosition } = useReactFlow();
  const loadedRef = useRef<string | null>(null);
  const [pendingNodeType, setPendingNodeType] = useState<DddNodeType | null>(null);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string | null; x: number; y: number } | null>(null);

  // React Flow controlled nodes/edges state
  const [rfNodes, setRfNodes] = useState<Node<DddNodeData>[]>([]);
  const [rfEdges, setRfEdges] = useState<Edge[]>([]);

  const domainId = current.domainId;
  const flowId = current.flowId;

  // Determine flow type from domain config
  const domainConfigs = useProjectStore((s) => s.domainConfigs);
  const flowType: 'traditional' | 'agent' = (() => {
    if (!domainId) return 'traditional';
    const domain = domainConfigs[domainId];
    if (!domain) return 'traditional';
    const entry = domain.flows.find((f) => f.id === flowId);
    return entry?.type ?? 'traditional';
  })();

  // Load flow on mount
  useEffect(() => {
    if (!domainId || !flowId || !projectPath) return;
    const key = `${domainId}/${flowId}`;
    if (loadedRef.current === key) return;
    loadedRef.current = key;

    loadFlow(domainId, flowId, projectPath, flowType);

    return () => {
      loadedRef.current = null;
      unloadFlow();
    };
  }, [domainId, flowId, projectPath, flowType, loadFlow, unloadFlow]);

  // Auto-validate on flow changes (debounced 300ms)
  useEffect(() => {
    if (!currentFlow) return;
    const timer = setTimeout(() => {
      validateCurrentFlow();
    }, 300);
    return () => clearTimeout(timer);
  }, [currentFlow, validateCurrentFlow]);

  // Build node issues map from validation results
  const flowResult = getCurrentFlowResult();
  const nodeIssuesMap = useMemo(() => {
    const map = new Map<string, import('../../types/validation').ValidationIssue[]>();
    if (!flowResult) return map;
    for (const issue of flowResult.issues) {
      if (issue.nodeId) {
        const existing = map.get(issue.nodeId) ?? [];
        existing.push(issue);
        map.set(issue.nodeId, existing);
      }
    }
    return map;
  }, [flowResult]);

  // Sync flow store → React Flow state (preserving selection)
  useEffect(() => {
    const nodes = buildNodes(currentFlow, nodeIssuesMap);
    setRfNodes((prev) => {
      const selectedIds = new Set(prev.filter((n) => n.selected).map((n) => n.id));
      return nodes.map((n) => ({ ...n, selected: selectedIds.has(n.id) }));
    });
    setRfEdges(buildEdges(currentFlow));
  }, [currentFlow, nodeIssuesMap]);

  // Handle all node changes (position, selection, etc.)
  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setRfNodes((nds) => applyNodeChanges(changes, nds) as Node<DddNodeData>[]);

      for (const change of changes) {
        if (change.type === 'position' && change.position && !change.dragging) {
          moveNode(change.id, change.position);
        }
        if (change.type === 'select' && change.selected) {
          selectNode(change.id);
        }
      }
    },
    [moveNode, selectNode]
  );

  // Handle edge changes (selection, removal via React Flow internals)
  const onEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      setRfEdges((eds) => applyEdgeChanges(changes, eds));
    },
    []
  );

  // Handle node deletion
  const onNodesDelete: OnNodesDelete = useCallback(
    (deleted) => {
      for (const node of deleted) {
        deleteNode(node.id);
      }
    },
    [deleteNode]
  );

  // Handle edge deletion
  const onEdgesDelete: OnEdgesDelete = useCallback(
    (deleted) => {
      for (const edge of deleted) {
        removeConnection(edge.source, edge.target, edge.sourceHandle ?? undefined);
      }
    },
    [removeConnection]
  );

  // Handle new connection
  const onConnect = useCallback(
    (connection: Connection) => {
      if (!connection.source || !connection.target) return;
      addConnection(
        connection.source,
        connection.target,
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined
      );
    },
    [addConnection]
  );

  // Click-to-place: click on canvas pane to place a pending node
  const onPaneClick = useCallback(
    (event: React.MouseEvent) => {
      if (pendingNodeType) {
        const position = screenToFlowPosition({
          x: event.clientX,
          y: event.clientY,
        });
        addNode(pendingNodeType, position);
        setPendingNodeType(null);
      } else {
        // Deselect node when clicking empty canvas
        selectNode(null);
      }
    },
    [pendingNodeType, screenToFlowPosition, addNode, selectNode]
  );

  // Context menu handlers
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node<DddNodeData>) => {
      event.preventDefault();
      selectNode(node.id);
      setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
    },
    [selectNode]
  );

  const onPaneContextMenu = useCallback(
    (event: MouseEvent | React.MouseEvent) => {
      event.preventDefault();
      setContextMenu({ nodeId: null, x: event.clientX, y: event.clientY });
    },
    []
  );

  const currentFlowKey = domainId && flowId ? `${domainId}/${flowId}` : null;
  const isCurrentFlowStale = currentFlowKey ? driftItems.some((d) => d.flowKey === currentFlowKey) : false;

  if (loading || !currentFlow) {
    return (
      <div className="flex-1 flex items-center justify-center bg-bg-primary">
        <p className="text-sm text-text-muted">Loading flow...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row h-full overflow-hidden">
      <div className="flex-1 relative">
        {isCurrentFlowStale && currentFlowKey && (
          <StaleBanner flowKey={currentFlowKey} />
        )}
        {!isLocked && (
          <NodeToolbar
            pendingType={pendingNodeType}
            onSelectType={setPendingNodeType}
            flowType={currentFlow.flow.type ?? flowType}
          />
        )}
        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onConnect={onConnect}
          onPaneClick={onPaneClick}
          onNodeContextMenu={onNodeContextMenu}
          onPaneContextMenu={onPaneContextMenu}
          nodesDraggable={!isLocked}
          nodesConnectable={!isLocked}
          colorMode="dark"
          snapToGrid
          snapGrid={[20, 20]}
          fitView
          deleteKeyCode={isLocked ? [] : ['Backspace', 'Delete']}
          proOptions={{ hideAttribution: true }}
          className={pendingNodeType ? 'cursor-crosshair' : ''}
          style={{ width: '100%', height: '100%' }}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls />
          {minimapVisible && (
            <MiniMap
              nodeColor="#1a1d27"
              maskColor="rgba(0,0,0,0.6)"
              style={{ background: '#0f1117' }}
            />
          )}
        </ReactFlow>
        {contextMenu && (
          <NodeContextMenu
            x={contextMenu.x}
            y={contextMenu.y}
            nodeId={contextMenu.nodeId}
            onClose={() => setContextMenu(null)}
          />
        )}
      </div>
      {selectedNodeId && <SpecPanel />}
      {validationPanelOpen && <ValidationPanel />}
    </div>
  );
}

export function FlowCanvas() {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner />
    </ReactFlowProvider>
  );
}
