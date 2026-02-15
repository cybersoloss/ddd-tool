import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Network, Diamond } from 'lucide-react';
import type { DddNodeData, OrchestratorSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type OrchestratorNodeType = Node<DddNodeData, 'orchestrator'>;

function OrchestratorNodeComponent({ data, selected }: NodeProps<OrchestratorNodeType>) {
  const spec = (data.spec ?? {}) as OrchestratorSpec;
  const agents = spec.agents ?? [];
  const sharedMemory = spec.shared_memory ?? [];

  return (
    <div
      className={`relative min-w-[450px] bg-bg-secondary border-l-4 border-l-indigo-500 border border-border rounded-lg shadow-lg px-4 py-3 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <Network className="w-4 h-4 text-indigo-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
        {spec.strategy && (
          <span className="text-[10px] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
            {spec.strategy}
          </span>
        )}
        {spec.model && (
          <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
            {spec.model}
          </span>
        )}
      </div>

      {/* Supervisor prompt preview */}
      {spec.supervisor_prompt && (
        <p className="text-xs text-text-secondary line-clamp-2 mb-2 bg-bg-primary/50 rounded px-2 py-1">
          {spec.supervisor_prompt}
        </p>
      )}

      {/* Agent cards */}
      {agents.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Agents</p>
          <div className="space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className="flex items-center gap-2 text-[11px] bg-bg-primary rounded px-2 py-1"
              >
                <span className="text-text-primary font-medium">{agent.flow || agent.id}</span>
                {agent.specialization && (
                  <span className="text-text-muted truncate flex-1">{agent.specialization}</span>
                )}
                {agent.priority != null && (
                  <span className="text-text-muted">P{agent.priority}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shared memory */}
      {sharedMemory.length > 0 && (
        <div className="mb-2">
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

      {/* Result merge strategy */}
      {spec.result_merge_strategy && (
        <div className="text-[10px] text-text-muted">
          Merge: {spec.result_merge_strategy.replace(/_/g, ' ')}
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-indigo-500 !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const OrchestratorNode = memo(OrchestratorNodeComponent);
