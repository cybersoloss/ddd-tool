import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { RotateCw, Wrench, Diamond } from 'lucide-react';
import type { DddNodeData, AgentLoopSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type AgentLoopNodeType = Node<DddNodeData, 'agent_loop'>;

function AgentLoopNodeComponent({ data, selected }: NodeProps<AgentLoopNodeType>) {
  const spec = (data.spec ?? {}) as AgentLoopSpec;
  const tools = spec.tools ?? [];
  const memory = spec.memory ?? [];

  return (
    <div
      className={`relative min-w-[360px] bg-bg-secondary border-l-4 border-l-blue-500 border border-border rounded-lg shadow-lg px-4 py-3 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <RotateCw className="w-4 h-4 text-blue-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
        {spec.model && (
          <span className="text-[10px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full">
            {spec.model}
          </span>
        )}
        {spec.max_iterations && (
          <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
            max {spec.max_iterations}
          </span>
        )}
      </div>

      {/* System prompt preview */}
      {spec.system_prompt && (
        <p className="text-xs text-text-secondary line-clamp-3 mb-2 bg-bg-primary/50 rounded px-2 py-1">
          {spec.system_prompt}
        </p>
      )}

      {/* Reasoning cycle banner */}
      <div className="text-[10px] text-text-muted text-center bg-bg-primary/50 rounded px-2 py-1 mb-2">
        Reason → Select Tool → Execute → Observe → Repeat
      </div>

      {/* Tools */}
      {tools.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Tools</p>
          <div className="flex flex-wrap gap-1">
            {tools.map((tool) => (
              <span
                key={tool.id}
                className="inline-flex items-center gap-1 text-[11px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded"
              >
                <Wrench className="w-3 h-3" />
                {tool.name}
                {tool.is_terminal && <span title="Terminal tool">⏹</span>}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Memory */}
      {memory.length > 0 && (
        <div>
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Memory</p>
          <div className="flex flex-wrap gap-1">
            {memory.map((mem) => (
              <span
                key={mem.name}
                className="inline-flex items-center gap-1 text-[11px] bg-bg-tertiary text-text-secondary px-2 py-0.5 rounded"
              >
                <Diamond className="w-3 h-3" />
                {mem.name}
                <span className="text-text-muted">({mem.type.replace(/_/g, ' ')})</span>
              </span>
            ))}
          </div>
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-blue-500 !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const AgentLoopNode = memo(AgentLoopNodeComponent);
