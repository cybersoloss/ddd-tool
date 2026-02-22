import { useMemo } from 'react';
import { useNodes, useEdges, useViewport } from '@xyflow/react';
import type { Node, Edge } from '@xyflow/react';

const DEFAULT_NODE_WIDTH = 200;
const DEFAULT_NODE_HEIGHT = 80;

// Pink for parallel, cyan for smart_router
const COLORS: Record<string, string> = {
  parallel: '#ec4899',
  smart_router: '#06b6d4',
};

interface Bracket {
  parentId: string;
  parentCenterX: number;
  parentBottomY: number;
  childPoints: { x: number; topY: number; bottomY: number }[];
  color: string;
  // collect: branch bottoms → done target top (parallel only)
  collectTarget?: { x: number; topY: number };
}

function buildBrackets(nodes: Node[], edges: Edge[]): Bracket[] {
  const result: Bracket[] = [];

  for (const node of nodes) {
    const color = COLORS[node.type ?? ''];
    if (!color) continue;

    // For parallel: only branch-* handles; for smart_router: all outgoing edges
    const branchEdges = edges.filter((e) => {
      if (e.source !== node.id) return false;
      if (node.type === 'parallel') return e.sourceHandle?.startsWith('branch-') ?? false;
      return true; // smart_router: every route handle
    });

    if (branchEdges.length < 2) continue;

    const children = branchEdges
      .map((e) => nodes.find((n) => n.id === e.target))
      .filter((n): n is Node => n != null);

    if (children.length < 2) continue;

    const parentW = node.measured?.width ?? DEFAULT_NODE_WIDTH;
    const parentH = node.measured?.height ?? DEFAULT_NODE_HEIGHT;

    // Collect target: only for parallel, via the `done` handle
    let collectTarget: Bracket['collectTarget'];
    if (node.type === 'parallel') {
      const doneEdge = edges.find((e) => e.source === node.id && e.sourceHandle === 'done');
      if (doneEdge) {
        const doneNode = nodes.find((n) => n.id === doneEdge.target);
        if (doneNode) {
          collectTarget = {
            x: doneNode.position.x + (doneNode.measured?.width ?? DEFAULT_NODE_WIDTH) / 2,
            topY: doneNode.position.y,
          };
        }
      }
    }

    result.push({
      parentId: node.id,
      parentCenterX: node.position.x + parentW / 2,
      parentBottomY: node.position.y + parentH,
      childPoints: children.map((c) => ({
        x: c.position.x + (c.measured?.width ?? DEFAULT_NODE_WIDTH) / 2,
        topY: c.position.y,
        bottomY: c.position.y + (c.measured?.height ?? DEFAULT_NODE_HEIGHT),
      })),
      color,
      collectTarget,
    });
  }

  return result;
}

export function BracketOverlay() {
  const nodes = useNodes();
  const edges = useEdges();
  const { x: vpX, y: vpY, zoom } = useViewport();

  const brackets = useMemo(() => buildBrackets(nodes, edges), [nodes, edges]);

  if (brackets.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
        overflow: 'visible',
      }}
    >
      <g transform={`translate(${vpX},${vpY}) scale(${zoom})`}>
        {brackets.map(({ parentId, parentCenterX, parentBottomY, childPoints, color, collectTarget }) => {
          const minChildTopY = Math.min(...childPoints.map((p) => p.topY));
          const fanOutBarY = parentBottomY + (minChildTopY - parentBottomY) * 0.4;
          const leftX = Math.min(...childPoints.map((p) => p.x));
          const rightX = Math.max(...childPoints.map((p) => p.x));

          // Collect bar: sits between child bottoms and done target top
          const maxChildBottomY = Math.max(...childPoints.map((p) => p.bottomY));
          const collectBarY = collectTarget
            ? maxChildBottomY + (collectTarget.topY - maxChildBottomY) * 0.4
            : null;

          return (
            <g key={parentId}>
              {/* ── Fan-out bracket ── */}
              {/* Stem: parent bottom → fan-out bar */}
              <line
                x1={parentCenterX} y1={parentBottomY}
                x2={parentCenterX} y2={fanOutBarY}
                stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                strokeDasharray="5 3"
              />
              {/* Horizontal fan-out bar */}
              <line
                x1={leftX} y1={fanOutBarY}
                x2={rightX} y2={fanOutBarY}
                stroke={color} strokeWidth={2} strokeOpacity={0.5}
              />
              {/* Drops: fan-out bar → each child top */}
              {childPoints.map((pt, i) => (
                <line
                  key={i}
                  x1={pt.x} y1={fanOutBarY}
                  x2={pt.x} y2={pt.topY}
                  stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                  strokeDasharray="5 3"
                />
              ))}
              {/* Junction dots on fan-out bar */}
              {childPoints.map((pt, i) => (
                <circle key={`fdot-${i}`} cx={pt.x} cy={fanOutBarY} r={3} fill={color} fillOpacity={0.55} />
              ))}

              {/* ── Collect bracket (parallel only) ── */}
              {collectTarget && collectBarY !== null && (
                <>
                  {/* Rises: each child bottom → collect bar */}
                  {childPoints.map((pt, i) => (
                    <line
                      key={`cr-${i}`}
                      x1={pt.x} y1={pt.bottomY}
                      x2={pt.x} y2={collectBarY}
                      stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                      strokeDasharray="5 3"
                    />
                  ))}
                  {/* Horizontal collect bar */}
                  <line
                    x1={leftX} y1={collectBarY}
                    x2={rightX} y2={collectBarY}
                    stroke={color} strokeWidth={2} strokeOpacity={0.5}
                  />
                  {/* Junction dots on collect bar */}
                  {childPoints.map((pt, i) => (
                    <circle key={`cdot-${i}`} cx={pt.x} cy={collectBarY} r={3} fill={color} fillOpacity={0.55} />
                  ))}
                  {/* Stem: collect bar → done target top */}
                  <line
                    x1={collectTarget.x} y1={collectBarY}
                    x2={collectTarget.x} y2={collectTarget.topY}
                    stroke={color} strokeWidth={1.5} strokeOpacity={0.4}
                    strokeDasharray="5 3"
                  />
                </>
              )}
            </g>
          );
        })}
      </g>
    </svg>
  );
}
