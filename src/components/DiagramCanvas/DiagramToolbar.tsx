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
  { shape: 'cloud', label: 'Cloud', icon: '☁' },
  { shape: 'document', label: 'Document', icon: '📄' },
  { shape: 'folder', label: 'Folder', icon: '📁' },
  { shape: 'stack', label: 'Stack', icon: '▤' },
];

const OBJECTS: { shape: DiagramNodeShape; label: string; icon: string }[] = [
  { shape: 'server', label: 'Server', icon: '🖥' },
  { shape: 'database', label: 'Database', icon: '🗄' },
  { shape: 'browser', label: 'Browser', icon: '🌐' },
  { shape: 'mobile', label: 'Mobile', icon: '📱' },
  { shape: 'person', label: 'User', icon: '👤' },
  { shape: 'api', label: 'API', icon: '⚡' },
  { shape: 'queue', label: 'Queue', icon: '📨' },
  { shape: 'lock', label: 'Security', icon: '🔒' },
  { shape: 'gear', label: 'Service', icon: '⚙' },
  { shape: 'globe', label: 'Internet', icon: '🌍' },
  { shape: 'cylinder', label: 'Storage', icon: '⏣' },
  { shape: 'lightning', label: 'Event', icon: '⚡' },
];

export function DiagramToolbar({ onAddShape, onAddTextBox, connectMode, onToggleConnect }: DiagramToolbarProps) {
  const [showShapes, setShowShapes] = useState(false);
  const [showObjects, setShowObjects] = useState(false);

  return (
    <div className="absolute top-3 left-3 z-10 flex flex-col gap-1">
      <div className="flex gap-1">
        <button
          onClick={() => { setShowShapes(!showShapes); setShowObjects(false); }}
          className={`border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
            showShapes ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text-primary hover:bg-surface-hover'
          }`}
          title="Basic shapes"
        >
          Shapes {showShapes ? '▼' : '▶'}
        </button>
        <button
          onClick={() => { setShowObjects(!showObjects); setShowShapes(false); }}
          className={`border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
            showObjects ? 'bg-primary border-primary text-white' : 'bg-surface border-border text-text-primary hover:bg-surface-hover'
          }`}
          title="Architecture objects"
        >
          Objects {showObjects ? '▼' : '▶'}
        </button>
        <button
          onClick={onToggleConnect}
          className={`border rounded-lg px-3 py-1.5 text-xs font-medium shadow-sm ${
            connectMode
              ? 'bg-blue-500 border-blue-600 text-white'
              : 'bg-surface border-border text-text-primary hover:bg-surface-hover'
          }`}
          title="Click two nodes to connect them"
        >
          Connect
        </button>
      </div>

      {showShapes && (
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

      {showObjects && (
        <div className="bg-surface border border-border rounded-lg p-2 shadow-lg grid grid-cols-3 gap-1 w-[210px]">
          {OBJECTS.map(({ shape, label, icon }) => (
            <button
              key={shape + label}
              onClick={() => onAddShape(shape)}
              className="flex flex-col items-center gap-0.5 p-1.5 rounded hover:bg-surface-hover text-text-primary"
              title={label}
            >
              <span className="text-base leading-none">{icon}</span>
              <span className="text-[9px] text-text-muted">{label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
