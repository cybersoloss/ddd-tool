import type { FlowDocument } from '../types/flow';
import type { Position } from '../types/sheet';

const Y_SPACING = 150;
const X_SPACING = 280;
const CENTER_X = 400;

/**
 * Compute a top-to-bottom DAG layout for flow nodes.
 * BFS from the trigger to assign layers (depth), then spread
 * nodes horizontally within each layer.
 */
export function computeDagLayout(flow: FlowDocument): Map<string, Position> {
  const allNodes = [flow.trigger, ...flow.nodes];

  // Build adjacency: nodeId -> child nodeIds
  const children = new Map<string, string[]>();
  for (const node of allNodes) {
    children.set(node.id, (node.connections ?? []).map((c) => c.targetNodeId));
  }

  // BFS from trigger to assign layers (max depth from root)
  const layers = new Map<string, number>();
  const queue = [flow.trigger.id];
  layers.set(flow.trigger.id, 0);

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    const layer = layers.get(nodeId)!;
    for (const childId of children.get(nodeId) ?? []) {
      const existing = layers.get(childId);
      if (existing === undefined || existing < layer + 1) {
        layers.set(childId, layer + 1);
        queue.push(childId);
      }
    }
  }

  // Unconnected nodes go after the last layer
  const maxLayer = Math.max(0, ...layers.values());
  for (const node of allNodes) {
    if (!layers.has(node.id)) {
      layers.set(node.id, maxLayer + 1);
    }
  }

  // Group by layer
  const layerGroups = new Map<number, string[]>();
  for (const [nodeId, layer] of layers) {
    const group = layerGroups.get(layer) ?? [];
    group.push(nodeId);
    layerGroups.set(layer, group);
  }

  // Assign positions (centered horizontally per layer)
  const positions = new Map<string, Position>();
  for (const [layer, nodeIds] of layerGroups) {
    const totalWidth = (nodeIds.length - 1) * X_SPACING;
    const startX = CENTER_X - totalWidth / 2;
    nodeIds.forEach((nodeId, i) => {
      positions.set(nodeId, {
        x: startX + i * X_SPACING,
        y: 50 + layer * Y_SPACING,
      });
    });
  }

  return positions;
}
