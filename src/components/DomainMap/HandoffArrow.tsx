import type { DomainMapFlow, OrchestrationRelationship } from '../../types/domain';

interface Props {
  relationship: OrchestrationRelationship;
  flows: DomainMapFlow[];
  flowWidth: number;
  flowHeight: number;
}

export function HandoffArrow({ relationship, flows, flowWidth, flowHeight }: Props) {
  const source = flows.find((f) => f.id === relationship.sourceFlowId);
  const target = flows.find((f) => f.id === relationship.targetFlowId);
  if (!source || !target) return null;

  const sx = source.position.x + flowWidth / 2;
  const sy = source.position.y + flowHeight / 2;
  const tx = target.position.x + flowWidth / 2;
  const ty = target.position.y + flowHeight / 2;

  const isBidirectional = relationship.mode === 'consult' || relationship.mode === 'collaborate';
  const midX = (sx + tx) / 2;
  const midY = (sy + ty) / 2;

  const modeLabel = relationship.mode ?? 'transfer';

  return (
    <g>
      <line
        x1={sx}
        y1={sy}
        x2={tx}
        y2={ty}
        stroke="#a78bfa"
        strokeWidth={1.5}
        strokeDasharray="6 3"
        markerEnd="url(#handoff-arrowhead)"
        markerStart={isBidirectional ? 'url(#handoff-arrowhead-reverse)' : undefined}
        opacity={0.7}
      />
      <text
        x={midX}
        y={midY - 6}
        textAnchor="middle"
        fill="#a78bfa"
        fontSize={9}
        opacity={0.8}
      >
        {modeLabel}
      </text>
    </g>
  );
}
