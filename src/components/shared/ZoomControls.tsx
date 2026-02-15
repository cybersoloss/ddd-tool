import { Minus, Plus, Maximize2 } from 'lucide-react';

interface Props {
  scale: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onFitView: () => void;
}

export function ZoomControls({ scale, onZoomIn, onZoomOut, onFitView }: Props) {
  return (
    <div className="absolute bottom-14 left-4 z-10 flex items-center gap-1 bg-bg-secondary/90 backdrop-blur border border-border rounded-lg px-1.5 py-1 shadow-lg">
      <button
        className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        onClick={onZoomOut}
        title="Zoom out"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
      <span className="text-[11px] text-text-secondary w-10 text-center tabular-nums select-none">
        {Math.round(scale * 100)}%
      </span>
      <button
        className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        onClick={onZoomIn}
        title="Zoom in"
      >
        <Plus className="w-3.5 h-3.5" />
      </button>
      <div className="w-px h-4 bg-border mx-0.5" />
      <button
        className="p-1 rounded hover:bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
        onClick={onFitView}
        title="Fit view"
      >
        <Maximize2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}
