import { useMemo } from 'react';
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  BackgroundVariant,
  type Node,
  type Edge,
  MarkerType,
} from '@xyflow/react';
import type { FlowDocument } from '../../types/flow';

const nodeColors: Record<string, string> = {
  trigger: '#3b82f6',
  input: '#22c55e',
  process: '#6b7280',
  decision: '#eab308',
  terminal: '#ef4444',
  agent_loop: '#3b82f6',
  guardrail: '#eab308',
  human_gate: '#ef4444',
  orchestrator: '#6366f1',
  smart_router: '#06b6d4',
  handoff: '#f59e0b',
  agent_group: '#9ca3af',
  data_store: '#10b981',
  service_call: '#f97316',
  event: '#a855f7',
  loop: '#14b8a6',
  parallel: '#ec4899',
  sub_flow: '#8b5cf6',
  llm_call: '#0ea5e9',
};

function SimpleNode({ data }: { data: { label: string; color: string } }) {
  return (
    <div
      style={{
        background: data.color,
        color: '#fff',
        padding: '4px 8px',
        borderRadius: 4,
        fontSize: 9,
        fontWeight: 500,
        whiteSpace: 'nowrap',
        maxWidth: 120,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
    >
      {data.label}
    </div>
  );
}

const previewNodeTypes = { default: SimpleNode };

interface Props {
  flow: FlowDocument;
  height?: number;
}

function FlowPreviewInner({ flow, height = 200 }: Props) {
  const { nodes, edges } = useMemo(() => {
    const nodes: Node[] = [];
    const edges: Edge[] = [];

    const addNode = (n: { id: string; type: string; position: { x: number; y: number }; label: string }) => {
      nodes.push({
        id: n.id,
        type: 'default',
        position: n.position,
        data: { label: n.label, color: nodeColors[n.type] ?? '#6b7280' },
        draggable: false,
        selectable: false,
        connectable: false,
      });
    };

    const addEdges = (node: { id: string; connections?: Array<{ targetNodeId: string }> }) => {
      for (const conn of node.connections ?? []) {
        edges.push({
          id: `${node.id}->${conn.targetNodeId}`,
          source: node.id,
          target: conn.targetNodeId,
          style: { stroke: '#4b5563', strokeWidth: 1 },
          markerEnd: { type: MarkerType.ArrowClosed, color: '#4b5563', width: 10, height: 10 },
        });
      }
    };

    addNode(flow.trigger);
    addEdges(flow.trigger);

    for (const n of flow.nodes) {
      addNode(n);
      addEdges(n);
    }

    return { nodes, edges };
  }, [flow]);

  return (
    <div style={{ width: '100%', height, borderRadius: 6, overflow: 'hidden' }} className="bg-bg-primary border border-border mt-1.5">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={previewNodeTypes}
        fitView
        panOnDrag={false}
        zoomOnScroll={false}
        zoomOnPinch={false}
        zoomOnDoubleClick={false}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={15} size={0.5} color="#374151" />
      </ReactFlow>
    </div>
  );
}

export function FlowPreview(props: Props) {
  return (
    <ReactFlowProvider>
      <FlowPreviewInner {...props} />
    </ReactFlowProvider>
  );
}
