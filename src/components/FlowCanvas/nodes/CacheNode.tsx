import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { HardDrive } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type CacheNodeType = Node<DddNodeData, 'cache'>;

function CacheNodeComponent({ data, selected }: NodeProps<CacheNodeType>) {
  const spec = data.spec as any;
  const store = spec?.store;
  const ttl = spec?.ttl_ms;

  let subtitle = '';
  if (store && ttl) {
    subtitle = `${store} · ${ttl}ms TTL`;
  } else if (store) {
    subtitle = store;
  } else if (ttl) {
    subtitle = `${ttl}ms TTL`;
  }

  return (
    <div
      className={`relative min-w-[160px] bg-bg-secondary border-l-4 border-l-amber-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <HardDrive className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {subtitle}
        </span>
      )}
      {/* Dual output: hit / miss */}
      <div className="flex justify-between text-[10px] text-text-muted mt-1 px-1">
        <span>Hit</span>
        <span>Miss</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="hit"
        style={{ left: '33%' }}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="miss"
        style={{ left: '66%' }}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const CacheNode = memo(CacheNodeComponent);
