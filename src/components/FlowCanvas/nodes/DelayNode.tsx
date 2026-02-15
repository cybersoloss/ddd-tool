import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Clock } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type DelayNodeType = Node<DddNodeData, 'delay'>;

function DelayNodeComponent({ data, selected }: NodeProps<DelayNodeType>) {
  const spec = data.spec as any;
  const strategy = spec?.strategy;
  const minMs = spec?.min_ms;
  const maxMs = spec?.max_ms;

  let subtitle = '';
  if (strategy === 'random' && minMs != null && maxMs != null) {
    subtitle = `${minMs}–${maxMs}ms random`;
  } else if (strategy === 'fixed' && minMs != null) {
    subtitle = `${minMs}ms fixed`;
  } else if (strategy) {
    subtitle = strategy;
  }

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-blue-600 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Clock className="w-4 h-4 text-blue-500" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {subtitle}
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

export const DelayNode = memo(DelayNodeComponent);
