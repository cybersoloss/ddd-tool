import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Terminal } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type IpcCallNodeType = Node<DddNodeData, 'ipc_call'>;

function IpcCallNodeComponent({ data, selected }: NodeProps<IpcCallNodeType>) {
  const command = (data.spec as any)?.command;
  const bridge = (data.spec as any)?.bridge;

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
        <Terminal className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {command && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {bridge ? `${bridge}: ` : ''}{command}
        </span>
      )}
      <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
        <span>Ok</span>
        <span>Err</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="success"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-bg-secondary"
        style={{ left: '33%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="error"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-bg-secondary"
        style={{ left: '66%' }}
      />
    </div>
  );
}

export const IpcCallNode = memo(IpcCallNodeComponent);
