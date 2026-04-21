// ─── Diagram Types (specs/schemas/diagram.yaml) ────────────────────────────

export type DiagramNodeShape =
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
  | 'custom';

export type DiagramNodeStatus = 'draft' | 'active' | 'deprecated';
export type BranchDirection = 'right' | 'left' | 'down' | 'both' | 'up';

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
  children?: MindMapChild[];
  branch_direction?: BranchDirection;
  status?: DiagramNodeStatus;
  link?: string;
}

export type DiagramEdgeDirection = 'one-way' | 'two-way' | 'conditional';
export type DiagramEdgeStyle = 'solid' | 'dashed' | 'dotted';
export type DiagramEdgeWeight = 'primary' | 'secondary';

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

export interface DiagramDocument {
  name: string;
  description?: string;
  tags?: string[];
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  text_boxes?: DiagramTextBox[];
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
}
