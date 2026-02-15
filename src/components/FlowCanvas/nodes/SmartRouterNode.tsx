import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitBranch } from 'lucide-react';
import type { DddNodeData, SmartRouterSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type SmartRouterNodeType = Node<DddNodeData, 'smart_router'>;

function SmartRouterNodeComponent({ data, selected }: NodeProps<SmartRouterNodeType>) {
  const spec = (data.spec ?? {}) as SmartRouterSpec;
  const rules = spec.rules ?? [];
  const llm = spec.llm_routing;
  const policies = spec.policies;
  const fallback = spec.fallback_chain ?? [];

  // Collect unique route names for dynamic source handles
  const routeNames = useMemo(() => {
    const names = new Set<string>();
    rules.forEach((r) => { if (r.route) names.add(r.route); });
    if (llm?.routes) Object.keys(llm.routes).forEach((k) => names.add(k));
    return Array.from(names);
  }, [rules, llm?.routes]);

  return (
    <div
      className={`relative min-w-[380px] bg-bg-secondary border-l-4 border-l-cyan-500 border border-border rounded-lg shadow-lg px-4 py-3 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-2">
        <GitBranch className="w-4 h-4 text-cyan-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
        <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
          {rules.length} rule{rules.length !== 1 ? 's' : ''}
        </span>
        {llm?.enabled && (
          <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">
            LLM
          </span>
        )}
      </div>

      {/* Policy badges */}
      {policies && (
        <div className="flex flex-wrap gap-1 mb-2">
          {policies.circuit_breaker?.enabled && (
            <span className="text-[10px] bg-red-500/20 text-red-300 px-2 py-0.5 rounded-full">
              CB
            </span>
          )}
          {policies.retry?.max_attempts && (
            <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
              retry:{policies.retry.max_attempts}
            </span>
          )}
          {policies.timeout?.total && (
            <span className="text-[10px] bg-bg-tertiary text-text-muted px-2 py-0.5 rounded-full">
              timeout:{policies.timeout.total}s
            </span>
          )}
        </div>
      )}

      {/* Rule list preview */}
      {rules.length > 0 && (
        <div className="mb-2">
          <p className="text-[10px] uppercase tracking-wider text-text-muted mb-1">Rules</p>
          <div className="space-y-0.5">
            {rules.slice(0, 5).map((rule) => (
              <div key={rule.id} className="text-[11px] text-text-secondary bg-bg-primary rounded px-2 py-0.5">
                {rule.condition} → <span className="text-cyan-300">{rule.route}</span>
              </div>
            ))}
            {rules.length > 5 && (
              <div className="text-[10px] text-text-muted px-2">+{rules.length - 5} more</div>
            )}
          </div>
        </div>
      )}

      {/* Fallback chain */}
      {fallback.length > 0 && (
        <div className="text-[10px] text-text-muted mb-2">
          Fallback: {fallback.join(' → ')}
        </div>
      )}

      {/* Route output handles */}
      {routeNames.length > 0 ? (
        <>
          <div className="flex justify-around text-[10px] text-text-muted mt-2 px-1">
            {routeNames.map((name) => (
              <span key={name}>{name}</span>
            ))}
          </div>
          {routeNames.map((name, i) => (
            <Handle
              key={name}
              type="source"
              position={Position.Bottom}
              id={name}
              className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-bg-secondary"
              style={{ left: `${((i + 1) / (routeNames.length + 1)) * 100}%` }}
            />
          ))}
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-cyan-500 !border-2 !border-bg-secondary"
        />
      )}
    </div>
  );
}

export const SmartRouterNode = memo(SmartRouterNodeComponent);
