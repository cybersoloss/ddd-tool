import { memo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Scissors } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type TextSplitNodeType = Node<DddNodeData, 'text_split'>;

function TextSplitNodeComponent({ data, selected }: NodeProps<TextSplitNodeType>) {
  const spec = data.spec as any;
  const strategy = spec?.split_strategy;
  const maxLength = spec?.max_length;

  let subtitle = '';
  if (strategy && maxLength != null) {
    subtitle = `${strategy} · ${maxLength} chars`;
  } else if (strategy) {
    subtitle = strategy;
  } else if (maxLength != null) {
    subtitle = `${maxLength} chars`;
  }

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-lime-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Scissors className="w-4 h-4 text-lime-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {subtitle && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {subtitle}
        </span>
      )}
      <div className="flex justify-center text-[10px] text-text-muted mt-1 px-1">
        <span>Chunks</span>
      </div>
      <Handle
        type="source"
        position={Position.Bottom}
        id="chunks"
        className="!w-3 !h-3 !bg-lime-500 !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const TextSplitNode = memo(TextSplitNodeComponent);
