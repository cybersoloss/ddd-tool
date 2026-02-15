import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitFork } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type DecisionNodeType = Node<DddNodeData, 'decision'>;

function DecisionNodeComponent({ data, selected }: NodeProps<DecisionNodeType>) {
  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-yellow-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
      style={{ clipPath: 'none' }}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
      <div className="flex items-center gap-2">
        <GitFork className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
        <span>Yes</span>
        <span>No</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="true"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-bg-secondary"
        style={{ left: '33%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="false"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-bg-secondary"
        style={{ left: '66%' }}
      />
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);
