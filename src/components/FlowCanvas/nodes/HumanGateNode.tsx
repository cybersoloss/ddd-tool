import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Hand } from 'lucide-react';
import type { DddNodeData, HumanGateSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type HumanGateNodeType = Node<DddNodeData, 'human_gate'>;

function HumanGateNodeComponent({ data, selected }: NodeProps<HumanGateNodeType>) {
  const spec = (data.spec ?? {}) as HumanGateSpec;
  const options = spec.approval_options ?? [];
  const timeout = spec.timeout;

  return (
    <div
      className={`relative min-w-[200px] bg-bg-secondary border-l-4 border-l-red-600 border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Hand className="w-4 h-4 text-red-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
      </div>

      {/* Timeout */}
      {timeout && (
        <div className="text-xs text-text-secondary mb-1">
          Timeout: {timeout.duration}s → {timeout.action ?? 'escalate'}
        </div>
      )}

      {/* Approval option badges */}
      {options.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-2">
          {options.map((opt) => (
            <span
              key={opt.id}
              className="text-[11px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded"
            >
              {opt.label}
            </span>
          ))}
        </div>
      )}

      {/* Source handles per approval option */}
      {options.length > 0 ? (
        <>
          <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
            {options.map((opt) => (
              <span key={opt.id}>{opt.label}</span>
            ))}
          </div>
          {options.map((opt, i) => (
            <Handle
              key={opt.id}
              type="source"
              position={Position.Bottom}
              id={opt.id}
              className={`!w-3 !h-3 !border-2 !border-bg-secondary ${
                opt.id === 'approve' ? '!bg-green-500' : opt.id === 'reject' ? '!bg-red-500' : '!bg-text-muted'
              }`}
              style={{ left: `${((i + 1) / (options.length + 1)) * 100}%` }}
            />
          ))}
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-red-500 !border-2 !border-bg-secondary"
        />
      )}
    </div>
  );
}

export const HumanGateNode = memo(HumanGateNodeComponent);
