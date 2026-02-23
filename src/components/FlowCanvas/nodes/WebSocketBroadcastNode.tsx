import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Radio } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type WebSocketBroadcastNodeType = Node<DddNodeData, 'websocket_broadcast'>;

function WebSocketBroadcastNodeComponent({ data, selected }: NodeProps<WebSocketBroadcastNodeType>) {
  const spec = data.spec as any;
  const channel = typeof spec?.channel === 'string' ? spec.channel : '';
  const eventName = typeof spec?.event_name === 'string' ? spec.event_name : '';

  const subtitle = channel
    ? `→ ${channel}${eventName ? ` (${eventName})` : ''}`
    : eventName || '';

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-violet-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Radio className="w-4 h-4 text-violet-500" />
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
        id="done"
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const WebSocketBroadcastNode = memo(WebSocketBroadcastNodeComponent);
