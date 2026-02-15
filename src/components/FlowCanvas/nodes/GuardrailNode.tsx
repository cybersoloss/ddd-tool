import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Shield } from 'lucide-react';
import type { DddNodeData, GuardrailSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type GuardrailNodeType = Node<DddNodeData, 'guardrail'>;

function GuardrailNodeComponent({ data, selected }: NodeProps<GuardrailNodeType>) {
  const spec = (data.spec ?? {}) as GuardrailSpec;
  const checks = Array.isArray(spec.checks) ? spec.checks : [];
  const positionLabel = spec.position === 'output' ? 'Output Guardrail' : 'Input Guardrail';

  return (
    <div
      className={`relative min-w-[200px] max-w-[280px] bg-bg-secondary border-l-4 border-l-yellow-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-yellow-500 !border-2 !border-bg-secondary"
      />

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <Shield className="w-4 h-4 text-yellow-400" />
        <span className="text-sm font-medium text-text-primary flex-1">
          {data.label}
        </span>
      </div>

      {/* Position badge */}
      <span className="inline-block text-[10px] bg-yellow-500/20 text-yellow-300 px-2 py-0.5 rounded-full mb-1">
        {positionLabel}
      </span>

      {/* Checks summary */}
      {checks.length > 0 && (
        <div className="text-xs text-text-secondary mt-1">
          {checks.length} check{checks.length !== 1 ? 's' : ''}: {checks.map((c) => c.type).join(', ')}
        </div>
      )}

      {/* Two output handles: pass/valid and block/invalid */}
      <div className="flex justify-between text-[10px] text-text-muted mt-2 px-1">
        <span>Pass</span>
        <span>Block</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="pass"
        className="!w-3 !h-3 !bg-green-500 !border-2 !border-bg-secondary"
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="valid"
        className="!w-0 !h-0 !bg-transparent !border-0"
        style={{ left: '25%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="block"
        className="!w-3 !h-3 !bg-red-500 !border-2 !border-bg-secondary"
        style={{ left: '75%' }}
      />
      <Handle
        type="source"
        position={Position.Bottom}
        id="invalid"
        className="!w-0 !h-0 !bg-transparent !border-0"
        style={{ left: '75%' }}
      />
    </div>
  );
}

export const GuardrailNode = memo(GuardrailNodeComponent);
