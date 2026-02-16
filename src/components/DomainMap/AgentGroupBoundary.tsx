import type { DomainMapFlow, AgentGroupVisual } from '../../types/domain';

interface Props {
  group: AgentGroupVisual;
  flows: DomainMapFlow[];
  flowWidth: number;
  flowHeight: number;
}

export function AgentGroupBoundary({ group, flows, flowWidth, flowHeight }: Props) {
  const groupFlows = flows.filter((f) => group.flowIds.includes(f.id));
  if (groupFlows.length === 0) return null;

  const padding = 16;
  const minX = Math.min(...groupFlows.map((f) => f.position.x)) - padding;
  const minY = Math.min(...groupFlows.map((f) => f.position.y)) - padding - 14;
  const maxX = Math.max(...groupFlows.map((f) => f.position.x)) + flowWidth + padding;
  const maxY = Math.max(...groupFlows.map((f) => f.position.y)) + flowHeight + padding;

  return (
    <div
      className="absolute border-2 border-dashed border-purple-400/30 rounded-xl pointer-events-none"
      style={{ left: minX, top: minY, width: maxX - minX, height: maxY - minY }}
    >
      <span className="absolute -top-3 left-3 px-2 bg-bg-primary text-[10px] text-purple-400 uppercase tracking-wider">
        {group.name}
      </span>
    </div>
  );
}
