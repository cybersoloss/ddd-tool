import { useState } from 'react';
import type { DiagramNodeShape } from '../../types/diagram';

interface DiagramToolbarProps {
  onAddShape: (shape: DiagramNodeShape) => void;
  onAddTextBox: () => void;
  connectMode: boolean;
  onToggleConnect: () => void;
}

const SHAPES: { shape: DiagramNodeShape; label: string; icon: string }[] = [
  { shape: 'rectangle', label: 'Rectangle', icon: '▬' },
  { shape: 'rounded-rectangle', label: 'Rounded', icon: '▢' },
  { shape: 'circle', label: 'Circle', icon: '●' },
  { shape: 'diamond', label: 'Diamond', icon: '◆' },
  { shape: 'hexagon', label: 'Hexagon', icon: '⬡' },
  { shape: 'cylinder', label: 'Database', icon: '⏣' },
  { shape: 'cloud', label: 'Cloud', icon: '☁' },
  { shape: 'person', label: 'Actor', icon: '👤' },
  { shape: 'document', label: 'Document', icon: '📄' },
  { shape: 'folder', label: 'Folder', icon: '📁' },
  { shape: 'stack', label: 'Stack', icon: '▤' },
];

export function DiagramToolbar({ onAddShape, onAddTextBox, connectMode, onToggleConnect }: DiagramToolbarProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={() => setExpanded(!expanded)}
          className="bg-surface border border-border rounded-lg px-3 py-1.5 text-xs font-medium text-text-primary hover:bg-surface-hover shadow-sm"
          title="Shape palette"
        >
          Shapes {expanded ? '▼' : '▶'}
        </button>
        <button
          onClick={onToggleConnect}
          className={`border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
            connectMode
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-surface border-border text-text-primary hover:bg-surface-hover'
          }`}
          title="Click two nodes to connect them (or drag handles for single connections)"
        >
          Connect
        </button>
      </div>

      {expanded && (
        <div className="bg-surface border border-border rounded-lg p-2 shadow-lg grid grid-cols-3 gap-1 w-[180px]">
          {SHAPES.map(({ shape, label, icon }) => (
            <button
              key={shape}
              onClick={() => onAddShape(shape)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-surface-hover text-text-primary"
              title={label}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[9px] text-text-muted">{label}</span>
            </button>
          ))}
          <button
            onClick={onAddTextBox}
            className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-surface-hover text-text-primary"
            title="Text Box"
          >
            <span className="text-base leading-none">T</span>
            <span className="text-[9px] text-text-muted">Text</span>
          </button>
        </div>
      )}
    </div>
  );
}
