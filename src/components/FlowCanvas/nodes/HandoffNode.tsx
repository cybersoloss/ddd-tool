import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { ArrowRight, ArrowLeftRight, Users } from 'lucide-react';
import type { DddNodeData, HandoffSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type HandoffNodeType = Node<DddNodeData, 'handoff'>;

const MODE_CONFIG = {
  transfer: { border: 'border-l-amber-500', badge: 'bg-amber-500/20 text-amber-300', handle: '!bg-amber-500', icon: ArrowRight },
  consult: { border: 'border-l-teal-500', badge: 'bg-teal-500/20 text-teal-300', handle: '!bg-teal-500', icon: ArrowLeftRight },
  collaborate: { border: 'border-l-pink-500', badge: 'bg-pink-500/20 text-pink-300', handle: '!bg-pink-500', icon: Users },
} as const;

function HandoffNodeComponent({ data, selected }: NodeProps<HandoffNodeType>) {
  const spec = (data.spec ?? {}) as HandoffSpec;
  const mode = spec.mode ?? 'transfer';
  const config = MODE_CONFIG[mode];
  const Icon = config.icon;

  return (
    <div
      className={`relative min-w-[220px] bg-bg-secondary border-l-4 ${config.border} border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className={`!w-3 !h-3 ${config.handle} !border-2 !border-bg-secondary`}
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4 text-text-secondary" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
      </div>

      {/* Mode badge */}
      <span className={`inline-block text-[10px] ${config.badge} px-2 py-0.5 rounded-full mb-1`}>
        {mode}
      </span>

      {/* Target */}
      {(spec.target?.flow || spec.target?.domain) && (
        <div className="text-xs text-text-secondary mt-1">
          {spec.target.domain && <span className="text-text-muted">{spec.target.domain}/</span>}
          {spec.target.flow}
        </div>
      )}

      {/* Context tokens */}
      {spec.context_transfer?.max_context_tokens && (
        <div className="text-[10px] text-text-muted mt-1">
          max {spec.context_transfer.max_context_tokens} tokens
        </div>
      )}

      {/* Timeout */}
      {spec.on_failure?.timeout && (
        <div className="text-[10px] text-text-muted">
          timeout: {spec.on_failure.timeout}s
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className={`!w-3 !h-3 ${config.handle} !border-2 !border-bg-secondary`}
      />
    </div>
  );
}

export const HandoffNode = memo(HandoffNodeComponent);
