import { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  Controls,
  ConnectionMode,
  type Node,
  type Edge,
  type NodeChange,
  type EdgeChange,
  type Connection,
  BackgroundVariant,
  MarkerType,
  useReactFlow,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { useDiagramStore } from '../../stores/diagram-store';
import { useSheetStore } from '../../stores/sheet-store';
import { useAppStore } from '../../stores/app-store';
import { DiagramShapeNode, type DiagramShapeNodeData } from './DiagramShapeNode';
import { DiagramTextBoxNode } from './DiagramTextBoxNode';
import { DiagramToolbar } from './DiagramToolbar';
import { DiagramPropertiesPanel } from './DiagramPropertiesPanel';
import type { DiagramNodeShape } from '../../types/diagram';

const nodeTypes = {
  diagramShape: DiagramShapeNode,
  diagramTextBox: DiagramTextBoxNode,
};

// ─── Modes ──────────────────────────────────────────────────────────────────
// The canvas has three mutually exclusive interaction modes:
//   1. Normal — drag nodes, select things, delete with Backspace
//   2. Place shape/text — click canvas to place, then return to Normal
//   3. Connect — click source node, click target node, edge created, stays in Connect

type Mode =
  | { type: 'normal' }
  | { type: 'place-shape'; shape: DiagramNodeShape }
  | { type: 'place-text' }
  | { type: 'connect-pick-source' }
  | { type: 'connect-pick-target'; sourceId: string };

function DiagramCanvasInner() {
  const { screenToFlowPosition } = useReactFlow();
  const diagramId = useSheetStore((s) => s.current.diagramId);
  const projectPath = useAppStore((s) => s.currentProjectPath);
  const currentDiagram = useDiagramStore((s) => s.currentDiagram);
  const isDirty = useDiagramStore((s) => s.isDirty);
  const loadDiagram = useDiagramStore((s) => s.loadDiagram);
  const saveDiagram = useDiagramStore((s) => s.saveDiagram);
  const storeAddNode = useDiagramStore((s) => s.addNode);
  const storeAddEdge = useDiagramStore((s) => s.addEdge);
  const storeAddTextBox = useDiagramStore((s) => s.addTextBox);
  const moveNode = useDiagramStore((s) => s.moveNode);
  const moveTextBox = useDiagramStore((s) => s.moveTextBox);
  const storeDeleteNode = useDiagramStore((s) => s.deleteNode);
  const storeDeleteEdge = useDiagramStore((s) => s.deleteEdge);
  const storeDeleteTextBox = useDiagramStore((s) => s.deleteTextBox);
  const updateNode = useDiagramStore((s) => s.updateNode);
  const updateTextBox = useDiagramStore((s) => s.updateTextBox);
  const [mode, setMode] = useState<Mode>({ type: 'normal' });
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const modeRef = useRef<Mode>(mode);
  modeRef.current = mode;

  const loadedRef = useRef<string | null>(null);

  // ─── Load diagram ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!diagramId || !projectPath) return;
    if (loadedRef.current === diagramId) return;
    loadedRef.current = diagramId;
    loadDiagram(projectPath, diagramId).catch(() => {});
    return () => { loadedRef.current = null; };
  }, [diagramId, projectPath, loadDiagram]);

  // ─── Cmd+S save ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (projectPath && isDirty) saveDiagram(projectPath);
      }
      if (e.key === 'Escape') {
        setMode({ type: 'normal' });
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [projectPath, isDirty, saveDiagram]);

  // ─── Build React Flow nodes ─────────────────────────────────────────────
  const rfNodes: Node[] = useMemo(() => {
    if (!currentDiagram) return [];
    const nodes: Node[] = [];

    for (const n of currentDiagram.nodes) {
      nodes.push({
        id: n.id,
        type: 'diagramShape',
        position: n.position || { x: 100, y: 100 },
        selected: selectedNodeId === n.id,
        data: {
          label: n.label,
          shape: n.shape || 'rectangle',
          description: n.description,
          style: n.style,
          icon: n.icon,
          status: n.status,
          children: n.children,
          branch_direction: n.branch_direction,
          onLabelChange: (label: string) => updateNode(n.id, { label }),
          onAddBranch: (branchLabel: string, parentPath: number[] | null) => {
            type MC = import('../../types/diagram').MindMapChild;
            const deepClone = (items: MC[]): MC[] =>
              items.map((item) => ({ ...item, children: item.children ? deepClone(item.children) : undefined }));
            const existing = deepClone((n.children || []) as MC[]);

            if (!parentPath) {
              // Root-level branch
              existing.push({ label: branchLabel });
            } else {
              // Navigate to the parent and add as child
              let target: MC[] = existing;
              for (let i = 0; i < parentPath.length; i++) {
                const idx = parentPath[i];
                if (idx >= target.length) break;
                if (i === parentPath.length - 1) {
                  if (!target[idx].children) target[idx].children = [];
                  target[idx].children!.push({ label: branchLabel });
                } else {
                  target = target[idx].children || [];
                }
              }
            }

            updateNode(n.id, {
              children: existing,
              branch_direction: n.branch_direction || 'both',
            });
          },
        } satisfies DiagramShapeNodeData,
      });
    }

    for (const t of currentDiagram.text_boxes || []) {
      nodes.push({
        id: t.id,
        type: 'diagramTextBox',
        position: t.position,
        selected: selectedNodeId === t.id,
        data: {
          text: t.text,
          style: t.style,
          onTextChange: (text: string) => updateTextBox(t.id, { text }),
        },
      });
    }

    return nodes;
  }, [currentDiagram, updateTextBox, updateNode, selectedNodeId]);

  // ─── Build React Flow edges ─────────────────────────────────────────────
  const rfEdges: Edge[] = useMemo(() => {
    if (!currentDiagram) return [];
    return currentDiagram.edges.map((e) => {
      const strokeWidth = e.weight === 'primary' ? 3 : e.weight === 'secondary' ? 1 : 2;
      const strokeDasharray = e.style === 'dashed' ? '6 3' : e.style === 'dotted' ? '2 2' : undefined;
      const markerEnd = e.direction !== 'two-way'
        ? { type: MarkerType.ArrowClosed, color: 'var(--color-text-muted)' }
        : undefined;
      const markerStart = e.direction === 'two-way'
        ? { type: MarkerType.ArrowClosed, color: 'var(--color-text-muted)' }
        : undefined;
      return {
        id: e.id,
        source: e.from,
        target: e.to,
        sourceHandle: e.fromHandle,
        targetHandle: e.toHandle,
        selected: selectedEdgeId === e.id,
        label: (e.labels || []).join(' / ') || undefined,
        style: { stroke: 'var(--color-text-muted)', strokeWidth, strokeDasharray },
        markerEnd,
        markerStart,
        animated: e.direction === 'conditional',
      };
    });
  }, [currentDiagram, selectedEdgeId]);

  // ─── React Flow callbacks ──────────────────────────────────────────────

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    for (const change of changes) {
      if (change.type === 'position' && change.position && change.dragging === false) {
        if (change.id.startsWith('text-')) {
          moveTextBox(change.id, change.position);
        } else {
          moveNode(change.id, change.position);
        }
      }
      // Only update selection in normal mode
      if (change.type === 'select' && change.selected && modeRef.current.type === 'normal') {
        setSelectedNodeId(change.id);
        setSelectedEdgeId(null);
      }
    }
  }, [moveNode, moveTextBox]);

  const onEdgesChange = useCallback((changes: EdgeChange[]) => {
    for (const change of changes) {
      if (change.type === 'remove') {
        storeDeleteEdge(change.id);
        setSelectedEdgeId(null);
      }
    }
  }, [storeDeleteEdge]);

  // Handle-drag connection — only works when NOT in connect mode
  const onConnect = useCallback((connection: Connection) => {
    if (modeRef.current.type.startsWith('connect')) return;
    if (connection.source && connection.target && connection.source !== connection.target) {
      storeAddEdge(
        connection.source,
        connection.target,
        connection.sourceHandle ?? undefined,
        connection.targetHandle ?? undefined,
      );
    }
  }, [storeAddEdge]);

  // Click on a node — handles connect mode source/target picking
  const onNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    const m = modeRef.current;
    if (node.id.startsWith('text-')) return;

    if (m.type === 'connect-pick-source') {
      setMode({ type: 'connect-pick-target', sourceId: node.id });
    } else if (m.type === 'connect-pick-target') {
      if (node.id !== m.sourceId) {
        storeAddEdge(m.sourceId, node.id);
      }
      // Stay in connect mode for another edge
      setMode({ type: 'connect-pick-source' });
    }
    // In normal mode, onNodesChange handles selection
  }, [storeAddEdge]);

  // Click on an edge — select it for properties panel / deletion
  const onEdgeClick = useCallback((_event: React.MouseEvent, edge: Edge) => {
    setSelectedEdgeId(edge.id);
    setSelectedNodeId(null);
  }, []);

  const onNodesDelete = useCallback((nodes: Node[]) => {
    for (const n of nodes) {
      if (n.id.startsWith('text-')) storeDeleteTextBox(n.id);
      else storeDeleteNode(n.id);
    }
    setSelectedNodeId(null);
  }, [storeDeleteNode, storeDeleteTextBox]);

  const onEdgesDelete = useCallback((edges: Edge[]) => {
    for (const e of edges) storeDeleteEdge(e.id);
    setSelectedEdgeId(null);
  }, [storeDeleteEdge]);

  // Click on empty canvas
  const onPaneClick = useCallback((event: React.MouseEvent) => {
    const m = modeRef.current;
    if (m.type === 'place-shape') {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      storeAddNode(m.shape, position);
      setMode({ type: 'normal' });
    } else if (m.type === 'place-text') {
      const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
      storeAddTextBox(position);
      setMode({ type: 'normal' });
    } else if (m.type === 'normal') {
      setSelectedNodeId(null);
      setSelectedEdgeId(null);
    }
    // In connect modes, clicking empty canvas does nothing (user must click a node or Cancel)
  }, [screenToFlowPosition, storeAddNode, storeAddTextBox]);

  // ─── Toolbar handlers ─────────────────────────────────────────────────
  const handleAddShape = useCallback((shape: DiagramNodeShape) => {
    setMode({ type: 'place-shape', shape });
  }, []);

  const handleAddTextBox = useCallback(() => {
    setMode({ type: 'place-text' });
  }, []);

  const handleToggleConnect = useCallback(() => {
    setMode((prev) =>
      prev.type.startsWith('connect')
        ? { type: 'normal' }
        : { type: 'connect-pick-source' }
    );
  }, []);

  // ─── Mode banner text ────────────────────────────────────────────────
  const isConnectMode = mode.type === 'connect-pick-source' || mode.type === 'connect-pick-target';
  const bannerText =
    mode.type === 'place-shape' ? `Click canvas to place ${mode.shape}` :
    mode.type === 'place-text' ? 'Click canvas to place text box' :
    mode.type === 'connect-pick-source' ? 'Click the source node' :
    mode.type === 'connect-pick-target' ? 'Now click the target node' :
    null;

  // ─── Render ──────────────────────────────────────────────────────────

  if (!diagramId || !currentDiagram) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center space-y-2">
          <p className="text-sm text-text-muted">Select a diagram from the sidebar</p>
          <p className="text-xs text-text-muted">or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-row overflow-hidden">
      <div className="flex-1 relative">
        {bannerText && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-blue-50 border border-blue-200 rounded-lg px-3 py-1 text-xs text-blue-700">
            {bannerText} —
            <button
              onClick={() => setMode({ type: 'normal' })}
              className="ml-2 underline"
            >
              Cancel
            </button>
          </div>
        )}

        <DiagramToolbar
          onAddShape={handleAddShape}
          onAddTextBox={handleAddTextBox}
          connectMode={isConnectMode}
          onToggleConnect={handleToggleConnect}
        />

        {isDirty && (
          <div className="absolute top-3 right-3 z-10">
            <button
              onClick={() => projectPath && saveDiagram(projectPath)}
              className="bg-primary text-white text-xs px-3 py-1 rounded shadow hover:bg-primary/90"
            >
              Save
            </button>
          </div>
        )}

        <ReactFlow
          nodes={rfNodes}
          edges={rfEdges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onEdgeClick={onEdgeClick}
          onNodesDelete={onNodesDelete}
          onEdgesDelete={onEdgesDelete}
          onPaneClick={onPaneClick}
          connectionMode={ConnectionMode.Loose}
          fitView
          deleteKeyCode={['Backspace', 'Delete']}
          edgesFocusable
          defaultEdgeOptions={{ selectable: true, focusable: true, interactionWidth: 20 }}
          className={mode.type !== 'normal' ? 'cursor-crosshair' : ''}
        >
          <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
          <Controls
            className="!bg-slate-800 !border-slate-600 !shadow-lg [&>button]:!bg-slate-700 [&>button]:!border-slate-600 [&>button]:!text-slate-200 [&>button:hover]:!bg-slate-600 [&>button>svg]:!fill-slate-200"
          />
        </ReactFlow>
      </div>

      <DiagramPropertiesPanel
        selectedNodeId={selectedNodeId}
        selectedEdgeId={selectedEdgeId}
        onDeleteNode={(id) => { storeDeleteNode(id); setSelectedNodeId(null); }}
        onDeleteEdge={(id) => { storeDeleteEdge(id); setSelectedEdgeId(null); }}
      />
    </div>
  );
}

export function DiagramCanvas() {
  return (
    <ReactFlowProvider>
      <DiagramCanvasInner />
    </ReactFlowProvider>
  );
}
