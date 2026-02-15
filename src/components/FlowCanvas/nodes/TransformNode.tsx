import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Shuffle } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type TransformNodeType = Node<DddNodeData, 'transform'>;

function TransformNodeComponent({ data, selected }: NodeProps<TransformNodeType>) {
  const spec = data.spec as any;
  const inputSchema = spec?.input_schema;
  const outputSchema = spec?.output_schema;

  let subtitle = '';
  if (inputSchema && outputSchema) {
    subtitle = `${inputSchema} → ${outputSchema}`;
  } else if (inputSchema) {
    subtitle = `from ${inputSchema}`;
  } else if (outputSchema) {
    subtitle = `to ${outputSchema}`;
  }

  return (
    <div
      className={`relative min-w-[160px] bg-bg-secondary border-l-4 border-l-indigo-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Shuffle className="w-4 h-4 text-indigo-400" />
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

export const TransformNode = memo(TransformNodeComponent);
