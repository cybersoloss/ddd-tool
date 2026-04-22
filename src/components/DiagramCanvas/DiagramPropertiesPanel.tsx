import { useDiagramStore } from '../../stores/diagram-store';
import type {
  DiagramNode,
  DiagramEdge,
  DiagramNodeShape,
  DiagramEdgeDirection,
  DiagramEdgeStyle,
  DiagramEdgeWeight,
  DiagramNodeStatus,
  DiagramLayoutType,
} from '../../types/diagram';
import { COLOR_GROUPS } from '../../utils/diagram-layout';

const SHAPES: DiagramNodeShape[] = [
  'rectangle', 'rounded-rectangle', 'circle', 'diamond', 'hexagon',
  'cylinder', 'cloud', 'person', 'document', 'folder', 'stack', 'custom',
  'server', 'database', 'browser', 'mobile', 'api', 'queue',
  'lock', 'gear', 'lightning', 'globe',
];

const DIRECTIONS: DiagramEdgeDirection[] = ['one-way', 'two-way', 'conditional'];
const EDGE_STYLES: DiagramEdgeStyle[] = ['solid', 'dashed', 'dotted'];
const WEIGHTS: DiagramEdgeWeight[] = ['primary', 'secondary'];
const STATUSES: DiagramNodeStatus[] = ['draft', 'active', 'deprecated'];
const COLOR_GROUP_OPTIONS = ['', ...Object.keys(COLOR_GROUPS)];
const LAYOUT_TYPES: { value: DiagramLayoutType | ''; label: string }[] = [
  { value: '', label: 'Default (Mind Map)' },
  { value: 'mind-map', label: 'Mind Map' },
  { value: 'org-chart', label: 'Org Chart' },
  { value: 'tree-chart', label: 'Tree Chart' },
  { value: 'logic-chart', label: 'Logic Chart' },
];

interface DiagramPropertiesPanelProps {
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  onDeleteNode?: (nodeId: string) => void;
  onDeleteEdge?: (edgeId: string) => void;
}

export function DiagramPropertiesPanel({ selectedNodeId, selectedEdgeId, onDeleteNode, onDeleteEdge }: DiagramPropertiesPanelProps) {
  const currentDiagram = useDiagramStore((s) => s.currentDiagram);
  const updateNode = useDiagramStore((s) => s.updateNode);
  const updateEdge = useDiagramStore((s) => s.updateEdge);
  const updateTextBox = useDiagramStore((s) => s.updateTextBox);

  if (!currentDiagram) return null;

  // Check if selected is a text box
  const textBox = selectedNodeId
    ? (currentDiagram.text_boxes || []).find((t) => t.id === selectedNodeId)
    : null;

  if (textBox) {
    return (
      <div className="w-64 border-l border-border bg-surface p-3 overflow-y-auto">
        <h3 className="text-xs font-semibold text-text-primary mb-3">Text Box</h3>
        <div className="space-y-3">
          <Field label="Text">
            <textarea
              value={textBox.text}
              onChange={(e) => updateTextBox(textBox.id, { text: e.target.value })}
              className="input-field text-xs h-20 resize-none"
            />
          </Field>
          <Field label="Size">
            <select
              value={textBox.style?.size || 'medium'}
              onChange={(e) => updateTextBox(textBox.id, {
                style: { ...textBox.style, size: e.target.value as 'small' | 'medium' | 'large' },
              })}
              className="input-field text-xs"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
            </select>
          </Field>
          <Field label="Border">
            <label className="flex items-center gap-2 text-xs text-text-secondary">
              <input
                type="checkbox"
                checked={textBox.style?.border ?? false}
                onChange={(e) => updateTextBox(textBox.id, {
                  style: { ...textBox.style, border: e.target.checked },
                })}
              />
              Show border
            </label>
          </Field>
        </div>
      </div>
    );
  }

  // Check if selected is a node
  const node = selectedNodeId
    ? currentDiagram.nodes.find((n) => n.id === selectedNodeId)
    : null;

  if (node) {
    return (
      <div className="w-64 border-l border-border bg-surface p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-primary">Node Properties</h3>
          {onDeleteNode && (
            <button
              onClick={() => onDeleteNode(node.id)}
              className="text-[10px] text-danger hover:text-danger/80 px-1.5 py-0.5 rounded hover:bg-danger/10"
            >
              Delete
            </button>
          )}
        </div>
        <NodeProperties node={node} onUpdate={(updates) => updateNode(node.id, updates)} />
      </div>
    );
  }

  // Check if selected is an edge
  const edge = selectedEdgeId
    ? currentDiagram.edges.find((e) => e.id === selectedEdgeId)
    : null;

  if (edge) {
    return (
      <div className="w-64 border-l border-border bg-surface p-3 overflow-y-auto">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-text-primary">Edge Properties</h3>
          {onDeleteEdge && (
            <button
              onClick={() => onDeleteEdge(edge.id)}
              className="text-[10px] text-danger hover:text-danger/80 px-1.5 py-0.5 rounded hover:bg-danger/10"
            >
              Delete
            </button>
          )}
        </div>
        <EdgeProperties edge={edge} onUpdate={(updates) => updateEdge(edge.id, updates)} />
      </div>
    );
  }

  return (
    <div className="w-64 border-l border-border bg-surface p-3">
      <p className="text-xs text-text-muted">Select a node or edge to edit its properties.</p>
    </div>
  );
}

function NodeProperties({ node, onUpdate }: {
  node: DiagramNode;
  onUpdate: (updates: Partial<Omit<DiagramNode, 'id'>>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Label">
        <input
          type="text"
          value={node.label}
          onChange={(e) => onUpdate({ label: e.target.value })}
          className="input-field text-xs"
        />
      </Field>
      <Field label="Shape">
        <select
          value={node.shape || 'rectangle'}
          onChange={(e) => onUpdate({ shape: e.target.value as DiagramNodeShape })}
          className="input-field text-xs"
        >
          {SHAPES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Description">
        <textarea
          value={node.description || ''}
          onChange={(e) => onUpdate({ description: e.target.value || undefined })}
          className="input-field text-xs h-16 resize-none"
          placeholder="Optional description..."
        />
      </Field>
      <Field label="Notes">
        <textarea
          value={node.notes || ''}
          onChange={(e) => onUpdate({ notes: e.target.value || undefined })}
          className="input-field text-xs h-16 resize-none"
          placeholder="Extended notes..."
        />
      </Field>
      <Field label="Status">
        <select
          value={node.status || ''}
          onChange={(e) => onUpdate({ status: (e.target.value || undefined) as DiagramNodeStatus | undefined })}
          className="input-field text-xs"
        >
          <option value="">None</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Icon">
        <input
          type="text"
          value={node.icon || ''}
          onChange={(e) => onUpdate({ icon: e.target.value || undefined })}
          className="input-field text-xs"
          placeholder="Lucide icon name"
        />
      </Field>
      <Field label="Link">
        <input
          type="text"
          value={node.link || ''}
          onChange={(e) => onUpdate({ link: e.target.value || undefined })}
          className="input-field text-xs"
          placeholder="diagrams/id or domains/flow-id"
        />
      </Field>
      <Field label="Color Group">
        <select
          value={node.color_group || ''}
          onChange={(e) => onUpdate({ color_group: e.target.value || undefined })}
          className="input-field text-xs"
        >
          {COLOR_GROUP_OPTIONS.map((g) => (
            <option key={g} value={g}>
              {g || 'None'}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Branch Layout">
        <select
          value={node.layout_type || ''}
          onChange={(e) => onUpdate({ layout_type: (e.target.value || undefined) as DiagramLayoutType | undefined })}
          className="input-field text-xs"
        >
          {LAYOUT_TYPES.map((lt) => (
            <option key={lt.value} value={lt.value}>{lt.label}</option>
          ))}
        </select>
      </Field>
      <div className="border-t border-border pt-2">
        <p className="text-[10px] font-semibold text-text-muted mb-1">Style</p>
        <div className="space-y-2">
          <Field label="Fill Color">
            <input
              type="color"
              value={node.style?.fill_color || '#f8fafc'}
              onChange={(e) => onUpdate({ style: { ...node.style, fill_color: e.target.value } })}
              className="w-8 h-6 border border-border rounded cursor-pointer"
            />
          </Field>
          <Field label="Border Color">
            <input
              type="color"
              value={node.style?.border_color || '#64748b'}
              onChange={(e) => onUpdate({ style: { ...node.style, border_color: e.target.value } })}
              className="w-8 h-6 border border-border rounded cursor-pointer"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function EdgeProperties({ edge, onUpdate }: {
  edge: DiagramEdge;
  onUpdate: (updates: Partial<Omit<DiagramEdge, 'from' | 'to'>>) => void;
}) {
  return (
    <div className="space-y-3">
      <Field label="Direction">
        <select
          value={edge.direction || 'one-way'}
          onChange={(e) => onUpdate({ direction: e.target.value as DiagramEdgeDirection })}
          className="input-field text-xs"
        >
          {DIRECTIONS.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </Field>
      <Field label="Style">
        <select
          value={edge.style || 'solid'}
          onChange={(e) => onUpdate({ style: e.target.value as DiagramEdgeStyle })}
          className="input-field text-xs"
        >
          {EDGE_STYLES.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </Field>
      <Field label="Weight">
        <select
          value={edge.weight || ''}
          onChange={(e) => onUpdate({ weight: (e.target.value || undefined) as DiagramEdgeWeight | undefined })}
          className="input-field text-xs"
        >
          <option value="">Default</option>
          {WEIGHTS.map((w) => (
            <option key={w} value={w}>{w}</option>
          ))}
        </select>
      </Field>
      <Field label="Labels">
        <input
          type="text"
          value={(edge.labels || []).join(', ')}
          onChange={(e) => onUpdate({
            labels: e.target.value ? e.target.value.split(',').map((l) => l.trim()) : [],
          })}
          className="input-field text-xs"
          placeholder="Comma-separated labels"
        />
      </Field>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted block mb-0.5">{label}</label>
      {children}
    </div>
  );
}
