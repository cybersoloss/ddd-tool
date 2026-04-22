// Layout engine for rendering a shape's children tree visually.
// Each layout computes { x, y } offsets relative to the parent shape center
// for each child label, plus connector line segments.

import type { MindMapChild, DiagramLayoutType } from '../types/diagram';

export interface ChildPosition {
  label: string;
  x: number;
  y: number;
  children?: ChildPosition[];
}

export interface ConnectorLine {
  x1: number; y1: number;
  x2: number; y2: number;
}

export interface LayoutResult {
  items: ChildPosition[];
  lines: ConnectorLine[];
  width: number;
  height: number;
}


// ─── Mind Map ───────────────────────────────────────────────────────────────
// Children radiate left/right from center. Odd-index right, even-index left.
function layoutMindMap(children: MindMapChild[]): LayoutResult {
  const items: ChildPosition[] = [];
  const lines: ConnectorLine[] = [];
  const H = 140; // horizontal gap per level
  const V = 28;  // vertical gap between siblings

  function layoutSide(
    kids: MindMapChild[], startX: number, startY: number, dir: 1 | -1, fromX: number, fromY: number,
  ): ChildPosition[] {
    const result: ChildPosition[] = [];
    const totalH = (kids.length - 1) * V;
    let y = startY - totalH / 2;
    for (const child of kids) {
      const cx = startX + dir * H;
      lines.push({ x1: fromX, y1: fromY, x2: cx, y2: y });
      const sub = child.children?.length
        ? layoutSide(child.children, cx, y, dir, cx, y)
        : [];
      result.push({ label: child.label, x: cx, y, children: sub });
      y += V;
    }
    return result;
  }

  // Split: even-indexed right, odd-indexed left
  const rightKids = children.filter((_, i) => i % 2 === 0);
  const leftKids = children.filter((_, i) => i % 2 !== 0);

  items.push(...layoutSide(rightKids, 0, 0, 1, 0, 0));
  items.push(...layoutSide(leftKids, 0, 0, -1, 0, 0));

  const allX = items.flatMap(function getX(p: ChildPosition): number[] {
    return [p.x, ...(p.children?.flatMap(getX) || [])];
  });
  const allY = items.flatMap(function getY(p: ChildPosition): number[] {
    return [p.y, ...(p.children?.flatMap(getY) || [])];
  });

  const minX = Math.min(0, ...allX);
  const maxX = Math.max(0, ...allX);
  const minY = Math.min(0, ...allY);
  const maxY = Math.max(0, ...allY);

  return { items, lines, width: maxX - minX + 120, height: maxY - minY + 40 };
}

// ─── Org Chart ──────────────────────────────────────────────────────────────
// Children below, centered horizontally, vertical connectors.
function layoutOrgChart(children: MindMapChild[]): LayoutResult {
  const items: ChildPosition[] = [];
  const lines: ConnectorLine[] = [];
  const H = 100;
  const V = 50;

  function layout(kids: MindMapChild[], cx: number, cy: number, fromX: number, fromY: number): ChildPosition[] {
    const result: ChildPosition[] = [];
    const totalW = (kids.length - 1) * H;
    let x = cx - totalW / 2;
    for (const child of kids) {
      const ny = cy + V;
      lines.push({ x1: fromX, y1: fromY, x2: x, y2: ny });
      const sub = child.children?.length
        ? layout(child.children, x, ny, x, ny)
        : [];
      result.push({ label: child.label, x, y: ny, children: sub });
      x += H;
    }
    return result;
  }

  items.push(...layout(children, 0, 0, 0, 0));

  const allX = items.flatMap(function getX(p: ChildPosition): number[] {
    return [p.x, ...(p.children?.flatMap(getX) || [])];
  });
  const allY = items.flatMap(function getY(p: ChildPosition): number[] {
    return [p.y, ...(p.children?.flatMap(getY) || [])];
  });

  return {
    items, lines,
    width: (Math.max(0, ...allX) - Math.min(0, ...allX)) + 120,
    height: (Math.max(0, ...allY) - Math.min(0, ...allY)) + 40,
  };
}

// ─── Tree Chart ─────────────────────────────────────────────────────────────
// Children below-right with vertical trunk + horizontal branches.
function layoutTreeChart(children: MindMapChild[]): LayoutResult {
  const items: ChildPosition[] = [];
  const lines: ConnectorLine[] = [];
  const H = 140;
  const V = 30;
  let nextY = V;

  function layout(kids: MindMapChild[], depth: number, fromX: number, fromY: number): ChildPosition[] {
    const result: ChildPosition[] = [];
    for (const child of kids) {
      const cx = depth * H;
      const cy = nextY;
      lines.push({ x1: fromX, y1: fromY, x2: cx, y2: cy });
      nextY += V;
      const sub = child.children?.length
        ? layout(child.children, depth + 1, cx, cy)
        : [];
      result.push({ label: child.label, x: cx, y: cy, children: sub });
    }
    return result;
  }

  items.push(...layout(children, 1, 0, 0));
  return { items, lines, width: 400, height: nextY + 10 };
}

// ─── Logic Chart ────────────────────────────────────────────────────────────
// Children to the right in vertical stack, bracket connectors.
function layoutLogicChart(children: MindMapChild[]): LayoutResult {
  const items: ChildPosition[] = [];
  const lines: ConnectorLine[] = [];
  const H = 160;
  const V = 30;
  let nextY = 0;

  function layout(kids: MindMapChild[], depth: number, fromX: number, fromY: number): ChildPosition[] {
    const result: ChildPosition[] = [];
    for (const child of kids) {
      const cx = depth * H;
      const cy = nextY;
      nextY += V;
      const sub = child.children?.length
        ? layout(child.children, depth + 1, cx, cy)
        : [];
      result.push({ label: child.label, x: cx, y: cy, children: sub });
    }
    // Bracket connector from parent to children group
    if (result.length > 0) {
      lines.push({ x1: fromX, y1: fromY, x2: fromX + H / 2, y2: fromY });
      lines.push({ x1: fromX + H / 2, y1: result[0].y, x2: fromX + H / 2, y2: result[result.length - 1].y });
      for (const r of result) {
        lines.push({ x1: fromX + H / 2, y1: r.y, x2: r.x, y2: r.y });
      }
    }
    return result;
  }

  items.push(...layout(children, 1, 0, 0));
  return { items, lines, width: 500, height: nextY + 10 };
}

/** Compute child layout for a shape based on its layout_type */
export function computeChildLayout(
  layoutType: DiagramLayoutType | undefined,
  children: MindMapChild[],
): LayoutResult {
  if (!children.length) return { items: [], lines: [], width: 0, height: 0 };
  const lt = layoutType || 'mind-map';
  switch (lt) {
    case 'mind-map': return layoutMindMap(children);
    case 'org-chart': return layoutOrgChart(children);
    case 'tree-chart': return layoutTreeChart(children);
    case 'logic-chart': return layoutLogicChart(children);
    default: return layoutMindMap(children);
  }
}

/** Color group palette */
export const COLOR_GROUPS: Record<string, string> = {
  white: '#e2e8f0',
  red: '#ef4444',
  blue: '#3b82f6',
  yellow: '#eab308',
  green: '#22c55e',
  purple: '#a855f7',
  orange: '#f97316',
  pink: '#ec4899',
  cyan: '#06b6d4',
};

export function colorGroupToColor(group: string | undefined): string | undefined {
  if (!group) return undefined;
  return COLOR_GROUPS[group.toLowerCase()] || group;
}
