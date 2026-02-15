import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Filter } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type CollectionNodeType = Node<DddNodeData, 'collection'>;

function CollectionNodeComponent({ data, selected }: NodeProps<CollectionNodeType>) {
  const operation = (data.spec as any)?.operation;

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-cyan-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Filter className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {operation && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {operation}
        </span>
      )}
      <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
        <span>Result</span>
        <span>Empty</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="result"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-bg-secondary"
        style={{ left: '33%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="empty"
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-bg-secondary"
        style={{ left: '66%' }}
      />
    </div>
  );
}

export const CollectionNode = memo(CollectionNodeComponent);
