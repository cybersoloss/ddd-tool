import { useCallback, useRef } from 'react';
import {
  type EdgeProps,
  BaseEdge,
  EdgeLabelRenderer,
  getStraightPath,
  getSmoothStepPath,
  getBezierPath,
  useReactFlow,
} from '@xyflow/react';
import type {
  DiagramEdgeRouting,
  DiagramEdgeWaypoint,
} from '../../types/diagram';
import { useDiagramStore } from '../../stores/diagram-store';

export interface DiagramEdgeData {
  routing?: DiagramEdgeRouting;
  waypoints?: DiagramEdgeWaypoint[];
  label?: string;
  labelStyle?: React.CSSProperties;
  labelBgStyle?: React.CSSProperties;
  [key: string]: unknown;
}

/**
 * Build an SVG path string that visits each waypoint in order.
 * routing controls how segments are drawn between consecutive points:
 *   - straight / bezier  → straight L segments (bezier with waypoints behaves as a polyline)
 *   - orthogonal         → H/V Manhattan segments at each waypoint
 *   - smoothstep         → straight L segments with small rounded corners at each waypoint
 */
function buildWaypointPath(
  sx: number,
  sy: number,
  tx: number,
  ty: number,
  waypoints: DiagramEdgeWaypoint[],
  routing: DiagramEdgeRouting,
): string {
  const pts = [{ x: sx, y: sy }, ...waypoints, { x: tx, y: ty }];

  if (routing === 'orthogonal') {
    // Manhattan: alternate H then V between each pair of points.
    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 1; i < pts.length; i++) {
      const prev = pts[i - 1];
      const cur = pts[i];
      d += ` L ${cur.x} ${prev.y} L ${cur.x} ${cur.y}`;
    }
    return d;
  }

  // straight, bezier, smoothstep all render as polylines through waypoints.
  // (smoothstep adds tiny corner radii — kept simple here with straight L's.)
  return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
}

function buildPlainPath(
  sx: number, sy: number, tx: number, ty: number,
  sp: EdgeProps['sourcePosition'], tp: EdgeProps['targetPosition'],
  routing: DiagramEdgeRouting,
): string {
  if (routing === 'straight') {
    const [d] = getStraightPath({ sourceX: sx, sourceY: sy, targetX: tx, targetY: ty });
    return d;
  }
  if (routing === 'bezier') {
    const [d] = getBezierPath({
      sourceX: sx, sourceY: sy, sourcePosition: sp,
      targetX: tx, targetY: ty, targetPosition: tp,
    });
    return d;
  }
  // orthogonal === step with borderRadius 0; smoothstep uses default radius
  const [d] = getSmoothStepPath({
    sourceX: sx, sourceY: sy, sourcePosition: sp,
    targetX: tx, targetY: ty, targetPosition: tp,
    borderRadius: routing === 'orthogonal' ? 0 : 5,
  });
  return d;
}

export function DiagramEdgeRouter(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style,
    markerEnd,
    markerStart,
    selected,
    data,
  } = props;

  const d = (data ?? {}) as DiagramEdgeData;
  const routing: DiagramEdgeRouting = d.routing ?? 'bezier';
  const waypoints = d.waypoints ?? [];

  const updateEdge = useDiagramStore((s) => s.updateEdge);
  const { screenToFlowPosition } = useReactFlow();

  const dragIndexRef = useRef<number | null>(null);

  const path =
    waypoints.length > 0
      ? buildWaypointPath(sourceX, sourceY, targetX, targetY, waypoints, routing)
      : buildPlainPath(sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, routing);

  const onWaypointPointerDown = useCallback(
    (e: React.PointerEvent, index: number) => {
      e.stopPropagation();
      if (e.button !== 0) return;
      dragIndexRef.current = index;
      (e.target as Element).setPointerCapture(e.pointerId);
    },
    [],
  );

  const onWaypointPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndexRef.current === null) return;
      const pos = screenToFlowPosition({ x: e.clientX, y: e.clientY });
      const idx = dragIndexRef.current;
      const next = waypoints.map((w, i) => (i === idx ? pos : w));
      updateEdge(id, { waypoints: next });
    },
    [id, waypoints, updateEdge, screenToFlowPosition],
  );

  const onWaypointPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (dragIndexRef.current === null) return;
      dragIndexRef.current = null;
      try { (e.target as Element).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    },
    [],
  );

  const onWaypointContextMenu = useCallback(
    (e: React.MouseEvent, index: number) => {
      e.preventDefault();
      e.stopPropagation();
      const next = waypoints.filter((_, i) => i !== index);
      updateEdge(id, { waypoints: next.length > 0 ? next : undefined });
    },
    [id, waypoints, updateEdge],
  );

  return (
    <>
      <BaseEdge id={id} path={path} style={style} markerEnd={markerEnd} markerStart={markerStart} />
      {d.label && (
        <EdgeLabelRenderer>
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${(sourceX + targetX) / 2}px, ${(sourceY + targetY) / 2}px)`,
              pointerEvents: 'all',
              ...d.labelBgStyle,
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 11,
              fontWeight: 500,
              ...d.labelStyle,
            }}
            className="nodrag nopan"
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
      {/* Waypoint handles — visible when edge is selected or always small */}
      {waypoints.map((w, i) => (
        <g key={i}>
          <circle
            cx={w.x}
            cy={w.y}
            r={selected ? 6 : 4}
            fill={selected ? '#60a5fa' : '#94a3b8'}
            stroke="#0f172a"
            strokeWidth={1.5}
            style={{ cursor: 'grab', pointerEvents: 'all' }}
            onPointerDown={(e) => onWaypointPointerDown(e, i)}
            onPointerMove={onWaypointPointerMove}
            onPointerUp={onWaypointPointerUp}
            onContextMenu={(e) => onWaypointContextMenu(e, i)}
          />
        </g>
      ))}
    </>
  );
}
