import { useDiagramStore } from '../../stores/diagram-store';
import { useState } from 'react';
import type {
  DiagramNode,
  DiagramEdge,
  DiagramNodeShape,
  DiagramEdgeDirection,
  DiagramEdgeStyle,
  DiagramEdgeWeight,
  DiagramNodeStatus,
  BranchDirection,
  MindMapChild,
} from '../../types/diagram';

const SHAPES: DiagramNodeShape[] = [
  'rectangle', 'rounded-rectangle', 'circle', 'diamond', 'hexagon',
  'cylinder', 'cloud', 'person', 'document', 'folder', 'stack', 'custom',
];

const DIRECTIONS: DiagramEdgeDirection[] = ['one-way', 'two-way', 'conditional'];
const EDGE_STYLES: DiagramEdgeStyle[] = ['solid', 'dashed', 'dotted'];
const WEIGHTS: DiagramEdgeWeight[] = ['primary', 'secondary'];
const STATUSES: DiagramNodeStatus[] = ['draft', 'active', 'deprecated'];
const BRANCH_DIRECTIONS: { value: BranchDirection | ''; label: string }[] = [
  { value: '', label: 'None' },
  { value: 'right', label: 'Right' },
  { value: 'left', label: 'Left' },
  { value: 'both', label: 'Both sides' },
  { value: 'down', label: 'Down' },
  { value: 'up', label: 'Up' },
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
      <div className="border-t border-border pt-2">
        <p className="text-[10px] font-semibold text-text-muted mb-1">Branches</p>
        <div className="space-y-2">
          <Field label="Direction">
            <select
              value={node.branch_direction || ''}
              onChange={(e) => onUpdate({ branch_direction: (e.target.value || undefined) as BranchDirection | undefined })}
              className="input-field text-xs"
            >
              {BRANCH_DIRECTIONS.map((d) => (
                <option key={d.value} value={d.value}>{d.label}</option>
              ))}
            </select>
          </Field>
          <ChildrenEditor
            children={(node.children || []).map((c: string | MindMapChild) => typeof c === 'string' ? { label: c } : c)}
            onChange={(children) => onUpdate({ children: children.length > 0 ? children : undefined })}
          />
        </div>
      </div>
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

function ChildrenEditor({ children: items, onChange }: {
  children: MindMapChild[];
  onChange: (children: MindMapChild[]) => void;
}) {
  const [newItem, setNewItem] = useState('');

  const addItem = () => {
    const trimmed = newItem.trim();
    if (trimmed) {
      onChange([...items, { label: trimmed }]);
      setNewItem('');
    }
  };

  const removeItem = (index: number) => {
    onChange(items.filter((_, j) => j !== index));
  };

  const addSubChild = (index: number, label: string) => {
    const updated = items.map((item, i) =>
      i === index ? { ...item, children: [...(item.children || []), { label }] } : item,
    );
    onChange(updated);
  };

  const removeSubChild = (parentIndex: number, childIndex: number) => {
    const updated = items.map((item, i) =>
      i === parentIndex
        ? { ...item, children: (item.children || []).filter((_, j) => j !== childIndex) }
        : item,
    );
    onChange(updated);
  };

  return (
    <div>
      <label className="text-[10px] font-medium text-text-muted block mb-0.5">Branches</label>
      {items.length > 0 && (
        <div className="space-y-1 mb-1">
          {items.map((item, i) => (
            <BranchItemEditor
              key={i}
              item={item}
              onRemove={() => removeItem(i)}
              onAddChild={(label) => addSubChild(i, label)}
              onRemoveChild={(ci) => removeSubChild(i, ci)}
            />
          ))}
        </div>
      )}
      <div className="flex gap-1">
        <input
          type="text"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
          className="input-field text-[10px] flex-1"
          placeholder="Type and press Enter..."
        />
      </div>
    </div>
  );
}

function BranchItemEditor({ item, onRemove, onAddChild, onRemoveChild }: {
  item: MindMapChild;
  onRemove: () => void;
  onAddChild: (label: string) => void;
  onRemoveChild: (index: number) => void;
}) {
  const [subInput, setSubInput] = useState('');
  const [expanded, setExpanded] = useState(false);

  return (
    <div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-[9px] text-text-muted w-3"
        >
          {expanded ? '-' : '+'}
        </button>
        <span className="text-[10px] text-text-secondary flex-1 truncate">{item.label}</span>
        <button onClick={onRemove} className="text-[9px] text-danger hover:text-danger/80">x</button>
      </div>
      {expanded && (
        <div className="ml-3 mt-0.5 pl-2 border-l border-border/50">
          {(item.children || []).map((child, ci) => (
            <div key={ci} className="flex items-center gap-1">
              <span className="text-[9px] text-text-muted flex-1 truncate">{child.label}</span>
              <button onClick={() => onRemoveChild(ci)} className="text-[8px] text-danger">x</button>
            </div>
          ))}
          <div className="flex gap-1 mt-0.5">
            <input
              type="text"
              value={subInput}
              onChange={(e) => setSubInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && subInput.trim()) {
                  e.preventDefault();
                  onAddChild(subInput.trim());
                  setSubInput('');
                }
              }}
              className="input-field text-[9px] flex-1"
              placeholder="Sub-branch..."
            />
          </div>
        </div>
      )}
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
