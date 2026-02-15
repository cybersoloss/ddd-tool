import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { BrainCircuit } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type LlmCallNodeType = Node<DddNodeData, 'llm_call'>;

function LlmCallNodeComponent({ data, selected }: NodeProps<LlmCallNodeType>) {
  const model = (data.spec as any)?.model;

  return (
    <div
      className={`relative min-w-[160px] bg-bg-secondary border-l-4 border-l-sky-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <BrainCircuit className="w-4 h-4 text-sky-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {model && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {model}
        </span>
      )}
      {/* Output handles: unnamed default + success/error */}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="!w-0 !h-0 !bg-transparent !border-0"
        style={{ left: '50%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="!w-0 !h-0 !bg-transparent !border-0"
        style={{ left: '50%' }}
      />
    </div>
  );
}

export const LlmCallNode = memo(LlmCallNodeComponent);
