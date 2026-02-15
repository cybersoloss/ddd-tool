import { useRef, useCallback } from 'react';
import { ExternalLink, GripVertical } from 'lucide-react';
import type { DomainMapPortal } from '../../types/domain';
import type { Position } from '../../types/sheet';

interface Props {
  portal: DomainMapPortal;
  scale?: number;
  animating?: boolean;
  onPositionChange: (portalId: string, position: Position) => void;
  onDoubleClick: (portalId: string) => void;
}

export function PortalNode({ portal, scale = 1, animating, onPositionChange, onDoubleClick }: Props) {
  const dragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const posStart = useRef({ x: 0, y: 0 });
  const scaleRef = useRef(scale);
  scaleRef.current = scale;

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      dragging.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      posStart.current = { x: portal.position.x, y: portal.position.y };

      const handleMouseMove = (me: MouseEvent) => {
        if (!dragging.current) return;
        const rawDx = me.clientX - dragStart.current.x;
        const rawDy = me.clientY - dragStart.current.y;
        onPositionChange(portal.id, {
          x: posStart.current.x + rawDx / scaleRef.current,
          y: posStart.current.y + rawDy / scaleRef.current,
        });
      };

      const handleMouseUp = () => {
        dragging.current = false;
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [portal.id, portal.position.x, portal.position.y, onPositionChange]
  );

  return (
    <div
      className="absolute group cursor-grab active:cursor-grabbing"
      style={{
        left: portal.position.x,
        top: portal.position.y,
        minWidth: 140,
        transition: animating ? 'left 300ms ease, top 300ms ease' : 'none',
      }}
      onMouseDown={handleMouseDown}
      onDoubleClick={() => onDoubleClick(portal.id)}
    >
      <div className="bg-bg-tertiary border border-dashed border-text-muted group-hover:border-accent rounded-lg p-3 transition-colors">
        <div className="flex items-center gap-2">
          <GripVertical className="w-3.5 h-3.5 text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
          <ExternalLink className="w-3.5 h-3.5 text-text-muted" />
          <span className="text-sm text-text-secondary truncate">
            {portal.targetDomainName}
          </span>
        </div>
      </div>
    </div>
  );
}
