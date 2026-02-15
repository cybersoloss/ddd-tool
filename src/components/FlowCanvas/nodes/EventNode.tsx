import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Zap } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type EventNodeType = Node<DddNodeData, 'event'>;

function EventNodeComponent({ data, selected }: NodeProps<EventNodeType>) {
  const direction = (data.spec as any)?.direction;

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-purple-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
      <div className="flex items-center gap-2">
        <Zap className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {direction && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {direction}
        </span>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const EventNode = memo(EventNodeComponent);
