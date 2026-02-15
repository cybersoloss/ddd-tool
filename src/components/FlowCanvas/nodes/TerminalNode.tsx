import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Square } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type TerminalNodeType = Node<DddNodeData, 'terminal'>;

function TerminalNodeComponent({ data, selected }: NodeProps<TerminalNodeType>) {
  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-red-500 border border-border rounded-2xl shadow-lg px-3 py-2 ${
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
        <Square className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
    </div>
  );
}

export const TerminalNode = memo(TerminalNodeComponent);
