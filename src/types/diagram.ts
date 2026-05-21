// ─── Diagram Types (specs/schemas/diagram.yaml) ────────────────────────────

export type DiagramNodeShape =
  // Basic shapes
  | 'rectangle'
  | 'rounded-rectangle'
  | 'cylinder'
  | 'diamond'
  | 'circle'
  | 'hexagon'
  | 'cloud'
  | 'person'
  | 'document'
  | 'folder'
  | 'stack'
  | 'custom'
  // Object types
  | 'server'
  | 'database'
  | 'browser'
  | 'mobile'
  | 'api'
  | 'queue'
  | 'lock'
  | 'gear'
  | 'lightning'
  | 'globe';

export type DiagramNodeStatus = 'draft' | 'active' | 'deprecated';

export type DiagramLayoutType = 'mind-map' | 'org-chart' | 'tree-chart' | 'logic-chart';

export type DiagramBranchOrientation = 'left' | 'right';

export interface MindMapChild {
  label: string;
  children?: MindMapChild[];
}

export interface DiagramNodeStyle {
  border_color?: string;
  fill_color?: string;
  fill_opacity?: number;
  border_thickness?: number;
  size?: 'small' | 'medium' | 'large';
  shadow?: boolean;
}

export interface DiagramNode {
  id: string;
  label: string;
  shape?: DiagramNodeShape;
  position?: { x: number; y: number };
  description?: string;
  notes?: string;
  style?: DiagramNodeStyle;
  icon?: string;
  color_group?: string;
  layout_type?: DiagramLayoutType;
  branch_orientation?: DiagramBranchOrientation;
  children?: MindMapChild[];
  status?: DiagramNodeStatus;
  link?: string;
  branch_max_width?: number;
}

export type DiagramEdgeDirection = 'one-way' | 'two-way' | 'conditional';
export type DiagramEdgeStyle = 'solid' | 'dashed' | 'dotted';
export type DiagramEdgeWeight = 'primary' | 'secondary';
export type DiagramEdgeRouting = 'straight' | 'orthogonal' | 'smoothstep' | 'bezier';

export interface DiagramEdgeWaypoint {
  x: number;
  y: number;
}

export interface DiagramEdge {
  id: string;
  from: string;
  to: string;
  fromHandle?: string;
  toHandle?: string;
  direction?: DiagramEdgeDirection;
  style?: DiagramEdgeStyle;
  labels?: string[];
  weight?: DiagramEdgeWeight;
  routing?: DiagramEdgeRouting;
  waypoints?: DiagramEdgeWaypoint[];
}

export type TextBoxSize = 'small' | 'medium' | 'large';

export interface TextBoxStyle {
  size?: TextBoxSize;
  border?: boolean;
  background?: string;
}

export interface DiagramTextBox {
  id: string;
  position: { x: number; y: number };
  text: string;
  style?: TextBoxStyle;
}

export interface DiagramSheet {
  id: string;
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  text_boxes?: DiagramTextBox[];
}

export interface DiagramDocument {
  name: string;
  description?: string;
  tags?: string[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  text_boxes?: DiagramTextBox[];
  sheets?: DiagramSheet[];
  metadata?: {
    created?: string;
    modified?: string;
  };
}

export interface DiagramMeta {
  id: string;
  name: string;
  description?: string;
  tags?: string[];
  sheetCount?: number;
}

// ─── Sheet content helpers ────────────────────────────────────────────────

export function getSheetContent(doc: DiagramDocument, sheetIndex: number): {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  text_boxes: DiagramTextBox[];
} {
  if (doc.sheets && doc.sheets.length > 0) {
    const idx = Math.min(sheetIndex, doc.sheets.length - 1);
    const sheet = doc.sheets[idx];
    return {
      nodes: sheet.nodes || [],
      edges: sheet.edges || [],
      text_boxes: sheet.text_boxes || [],
    };
  }
  return {
    nodes: doc.nodes || [],
    edges: doc.edges || [],
    text_boxes: doc.text_boxes || [],
  };
}

export function setSheetContent(
  doc: DiagramDocument,
  sheetIndex: number,
  content: { nodes?: DiagramNode[]; edges?: DiagramEdge[]; text_boxes?: DiagramTextBox[] },
): DiagramDocument {
  if (doc.sheets && doc.sheets.length > 0) {
    const idx = Math.min(sheetIndex, doc.sheets.length - 1);
    return {
      ...doc,
      sheets: doc.sheets.map((s, i) => (i === idx ? { ...s, ...content } : s)),
    };
  }
  return { ...doc, ...content };
}
