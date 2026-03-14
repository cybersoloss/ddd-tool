import ELK from 'elkjs/lib/elk.bundled.js';
import type { FlowDocument, DddFlowNode } from '../types/flow';
import type { Position } from '../types/sheet';

const NODE_W = 220;
const NODE_H = 90;
const AGENT_LOOP_W = 400;
const AGENT_LOOP_H = 200;

const elk = new ELK();

/**
 * Compute layout using ELK (Eclipse Layout Kernel).
 * Handles hierarchical graphs, container nodes, and complex branching natively.
 *
 * Returns a promise — the flow store calls this and applies positions.
 */
export async function computeElkLayout(flow: FlowDocument): Promise<Map<string, Position>> {
  const allNodes: DddFlowNode[] = [flow.trigger, ...flow.nodes];
  const nodeMap = new Map<string, DddFlowNode>();
  for (const n of allNodes) nodeMap.set(n.id, n);

  // Determine which nodes are containers (have children via parentId)
  const containerIds = new Set<string>();
  const childToParent = new Map<string, string>();
  for (const node of allNodes) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      containerIds.add(node.parentId);
      childToParent.set(node.id, node.parentId);
    }
  }

  // Collect all edges from connections arrays + spec-embedded connections
  const edges: { id: string; source: string; target: string }[] = [];
  const edgeSet = new Set<string>();

  for (const node of allNodes) {
    for (const conn of node.connections ?? []) {
      const key = `${node.id}->${conn.targetNodeId}`;
      if (!edgeSet.has(key) && nodeMap.has(conn.targetNodeId)) {
        edgeSet.add(key);
        edges.push({ id: key, source: node.id, target: conn.targetNodeId });
      }
    }

    // Spec-embedded connections
    if (node.spec && typeof node.spec === 'object') {
      const spec = node.spec as Record<string, unknown>;
      if (Array.isArray(spec.connections)) {
        for (const c of spec.connections) {
          const target = (c as Record<string, unknown>).targetNodeId as string
            ?? (c as Record<string, unknown>).target as string;
          if (target && nodeMap.has(target)) {
            const key = `${node.id}->${target}`;
            if (!edgeSet.has(key)) {
              edgeSet.add(key);
              edges.push({ id: key, source: node.id, target });
            }
          }
        }
      }
    }
  }

  // Build ELK node size helper
  function nodeSize(node: DddFlowNode): { width: number; height: number } {
    if (node.type === 'agent_loop') return { width: AGENT_LOOP_W, height: AGENT_LOOP_H };
    if (containerIds.has(node.id)) return { width: 300, height: 200 }; // ELK will expand
    return { width: NODE_W, height: NODE_H };
  }

  // Build hierarchical ELK graph
  // Top-level nodes + their children nested inside
  function buildElkChildren(parentId?: string) {
    const nodes = allNodes.filter((n) => {
      if (parentId) return childToParent.get(n.id) === parentId;
      return !childToParent.has(n.id);
    });

    return nodes.map((n) => {
      const size = nodeSize(n);
      const elkNode: Record<string, unknown> = {
        id: n.id,
        width: size.width,
        height: size.height,
      };

      if (containerIds.has(n.id)) {
        elkNode.children = buildElkChildren(n.id);
        elkNode.edges = edges
          .filter((e) => childToParent.get(e.source) === n.id && childToParent.get(e.target) === n.id)
          .map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] }));
        elkNode.layoutOptions = {
          'elk.algorithm': 'layered',
          'elk.direction': 'DOWN',
          'elk.spacing.nodeNode': '40',
          'elk.layered.spacing.nodeNodeBetweenLayers': '50',
          'elk.padding': '[top=50,left=30,bottom=30,right=30]',
        };
      }

      return elkNode;
    });
  }

  // Top-level edges (between nodes that share the same parent scope)
  const topEdges = edges.filter((e) => {
    const sp = childToParent.get(e.source);
    const tp = childToParent.get(e.target);
    return !sp && !tp; // both are top-level
  });

  const elkGraph = {
    id: 'root',
    layoutOptions: {
      'elk.algorithm': 'layered',
      'elk.direction': 'DOWN',
      'elk.spacing.nodeNode': '50',
      'elk.layered.spacing.nodeNodeBetweenLayers': '60',
      'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
      'elk.separateConnectedComponents': 'true',
      'elk.spacing.componentComponent': '80',
      'elk.padding': '[top=50,left=50,bottom=50,right=50]',
    },
    children: buildElkChildren(),
    edges: topEdges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] })),
  };

  const layout = await elk.layout(elkGraph as unknown as Parameters<typeof elk.layout>[0]);

  // Extract positions recursively
  const positions = new Map<string, Position>();

  function extractPositions(children: typeof layout.children, offsetX = 0, offsetY = 0) {
    for (const child of children ?? []) {
      const x = (child.x ?? 0) + offsetX;
      const y = (child.y ?? 0) + offsetY;
      positions.set(child.id, { x, y });

      if (child.children) {
        extractPositions(child.children, x, y);
      }
    }
  }

  extractPositions(layout.children);

  return positions;
}

/**
 * Synchronous fallback — used by flow-store which expects sync.
 * Starts the async ELK layout and returns current positions immediately.
 * The actual positions are applied via a callback.
 */
export function computeDagLayout(flow: FlowDocument): Map<string, Position> {
  // Return existing positions as-is — the async version will update them
  const allNodes = [flow.trigger, ...flow.nodes];
  const positions = new Map<string, Position>();
  for (const n of allNodes) {
    positions.set(n.id, n.position ?? { x: 0, y: 0 });
  }
  return positions;
}
