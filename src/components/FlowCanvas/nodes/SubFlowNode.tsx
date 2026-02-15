import { memo, useCallback } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { GitMerge, ExternalLink } from 'lucide-react';
import type { DddNodeData } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';
import { useSheetStore } from '../../../stores/sheet-store';

type SubFlowNodeType = Node<DddNodeData, 'sub_flow'>;

function SubFlowNodeComponent({ data, selected }: NodeProps<SubFlowNodeType>) {
  const flowRef = (data.spec as any)?.flow_ref as string | undefined;
  const navigateToFlow = useSheetStore((s) => s.navigateToFlow);

  const handleNavigate = useCallback(() => {
    if (!flowRef || !flowRef.includes('/')) return;
    const [domainId, flowId] = flowRef.split('/');
    if (domainId && flowId) {
      navigateToFlow(domainId, flowId);
    }
  }, [flowRef, navigateToFlow]);

  const canNavigate = flowRef && flowRef.includes('/');

  return (
    <div
      className={`relative min-w-[160px] max-w-[240px] bg-bg-secondary border-l-4 border-l-violet-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
        selected ? 'ring-2 ring-accent' : ''
      }`}
      onDoubleClick={canNavigate ? handleNavigate : undefined}
    >
      <NodeValidationDot issues={data.validationIssues} />
      <Handle
        type="target"
        position={Position.Top}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
      <div className="flex items-center gap-2">
        <GitMerge className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {flowRef && (
        <div className="flex items-center gap-1 mt-0.5">
          <span className="text-[10px] text-text-muted truncate max-w-[120px]">
            {flowRef}
          </span>
          {canNavigate && (
            <ExternalLink className="w-2.5 h-2.5 text-violet-400 shrink-0" />
          )}
        </div>
      )}
      <Handle
        type="source"
        position={Position.Bottom}
        className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
      />
    </div>
  );
}

export const SubFlowNode = memo(SubFlowNodeComponent);
