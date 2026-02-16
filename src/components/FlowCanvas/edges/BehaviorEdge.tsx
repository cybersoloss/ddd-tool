import { useState } from 'react';
import { BaseEdge, getBezierPath, type EdgeProps } from '@xyflow/react';
import { RefreshCcw, Zap, Square, ArrowRight } from 'lucide-react';

interface DataField {
  name: string;
  type: string;
}

interface BehaviorEdgeData {
  behavior?: string;
  dataFields?: DataField[];
  [key: string]: unknown;
}

const behaviorConfig: Record<string, { Icon: typeof RefreshCcw; color: string; label: string }> = {
  retry: { Icon: RefreshCcw, color: '#f59e0b', label: 'Retry' },
  circuit_break: { Icon: Zap, color: '#ef4444', label: 'Circuit Break' },
  stop: { Icon: Square, color: '#ef4444', label: 'Stop' },
  continue: { Icon: ArrowRight, color: '#22c55e', label: 'Continue' },
};

export function BehaviorEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  markerEnd,
  data,
}: EdgeProps) {
  const edgeData = data as BehaviorEdgeData | undefined;
  const behavior = edgeData?.behavior;
  const dataFields = Array.isArray(edgeData?.dataFields) ? edgeData.dataFields : [];
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });

  const config = behavior ? behaviorConfig[behavior] : null;

  return (
    <>
      <BaseEdge id={id} path={edgePath} style={style} markerEnd={markerEnd} />
      {config && (
        <foreignObject
          width={24}
          height={24}
          x={labelX - 12}
          y={labelY - 12}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            title={config.label}
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 17, 23, 0.9)',
              border: `2px solid ${config.color}`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 2,
              cursor: 'default',
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            <config.Icon style={{ width: 10, height: 10, color: config.color }} />
          </div>
        </foreignObject>
      )}
      {dataFields.length > 0 && (
        <foreignObject
          width={24}
          height={24}
          x={labelX - 12 + (config ? 26 : 0)}
          y={labelY - 12}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              backgroundColor: 'rgba(15, 17, 23, 0.9)',
              border: '2px solid #6366f1',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: 2,
              cursor: 'default',
              fontSize: 9,
              color: '#6366f1',
              fontWeight: 600,
            }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
          >
            D
          </div>
        </foreignObject>
      )}
      {hovered && dataFields.length > 0 && (
        <foreignObject
          width={200}
          height={dataFields.length * 22 + 16}
          x={labelX + (config ? 30 : 16)}
          y={labelY - 8}
          requiredExtensions="http://www.w3.org/1999/xhtml"
        >
          <div
            style={{
              backgroundColor: 'rgba(15, 17, 23, 0.95)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: 6,
              padding: '6px 8px',
              fontSize: 10,
              color: '#a1a1aa',
              pointerEvents: 'none',
            }}
          >
            {dataFields.map((field, i) => (
              <div key={i} style={{ display: 'flex', gap: 4, lineHeight: '18px' }}>
                <span style={{ color: '#e5e7eb', fontWeight: 500 }}>{field.name}</span>
                <span style={{ color: '#6366f1' }}>{field.type}</span>
              </div>
            ))}
          </div>
        </foreignObject>
      )}
    </>
  );
}
