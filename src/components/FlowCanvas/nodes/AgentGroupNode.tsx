import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Box, Diamond } from 'lucide-react';
import type { DddNodeData, AgentGroupSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type AgentGroupNodeType = Node<DddNodeData, 'agent_group'>;

function AgentGroupNodeComponent({ data, selected }: NodeProps<AgentGroupNodeType>) {
  const spec = (data.spec ?? {}) as AgentGroupSpec;
  const members = spec.members ?? [];
  const sharedMemory = spec.shared_memory ?? [];
  const coordination = spec.coordination;

  return (
    <div
      className={`relative min-w-[400px] bg-bg-secondary border-2 border-dashed border-gray-600 rounded-lg shadow-lg px-4 py-3 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Box className="w-4 h-4 text-gray-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {spec.name || data.label}
        </span>
        <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
          {members.length} member{members.length !== 1 ? 's' : ''}
        </span>
        {coordination?.communication && (
          <span className="text-[10px] bg-gray-500/20 text-gray-300 px-2 py-0.5 rounded-full">
            {coordination.communication.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Description */}
      {spec.description && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-2">
          {spec.description}
        </p>
      )}

      {/* Members */}
      {members.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Members</p>
          <div className="space-y-0.5">
            {members.map((member, i) => (
              <div
                key={i}
                className="text-[11px] text-text-secondary bg-bg-primary rounded px-2 py-1"
              >
                {member.domain && <span className="text-text-muted">{member.domain}/</span>}
                {member.flow}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared memory */}
      {sharedMemory.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Shared Memory</p>
          <div className="flex flex-wrap gap-1">
            {sharedMemory.map((mem) => (
              <span
                key={mem.name}
                className="inline-flex items-center gap-1 text-[11px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded"
              >
                <Diamond className="w-3 h-3" />
                {mem.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-gray-400 !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const AgentGroupNode = memo(AgentGroupNodeComponent);
