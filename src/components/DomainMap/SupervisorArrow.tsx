import type { DomainMapFlow } from '../../types/domain';

interface Props {
  sourceFlowId: string;
  targetFlowId: string;
  flows: DomainMapFlow[];
  flowWidth: number;
  flowHeight: number;
}

export function SupervisorArrow({ sourceFlowId, targetFlowId, flows, flowWidth, flowHeight }: Props) {
  const source = flows.find((f) => f.id === sourceFlowId);
  const target = flows.find((f) => f.id === targetFlowId);
  if (!source || !target) return null;

  const sx = source.position.x + flowWidth / 2;
  const sy = source.position.y + flowHeight / 2;
  const tx = target.position.x + flowWidth / 2;
  const ty = target.position.y + flowHeight / 2;

  return (
    <line
      x1={sx}
      y1={sy}
      x2={tx}
      y2={ty}
      stroke="var(--color-accent)"
      strokeWidth={2}
      markerEnd="url(#supervisor-arrowhead)"
      opacity={0.7}
    />
  );
}
