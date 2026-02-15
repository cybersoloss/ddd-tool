import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Cog } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type ProcessNodeType = Node<DddNodeData, 'process'>;

function ProcessNodeComponent({ data, selected }: NodeProps<ProcessNodeType>) {
  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-text-muted border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Cog className="w-4 h-4 text-text-secondary" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const ProcessNode = memo(ProcessNodeComponent);
