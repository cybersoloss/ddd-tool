import { memo, useMemo } from 'react';
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react';
import { Columns } from 'lucide-react';
import type { DddNodeData, ParallelSpec } from '../../../types/flow';
import { NodeValidationDot } from './NodeValidationDot';

type ParallelNodeType = Node<DddNodeData, 'parallel'>;

function ParallelNodeComponent({ data, selected }: NodeProps<ParallelNodeType>) {
  const spec = (data.spec ?? {}) as ParallelSpec;
  const joinStrategy = spec?.join;
  const rawBranches = spec?.branches;
  const branches = Array.isArray(rawBranches)
    ? rawBranches
    : typeof rawBranches === 'number'
      ? Array.from({ length: rawBranches }, (_, i) => `Branch ${i}`)
      : [];
  const badgeValue =
    joinStrategy && branches.length
      ? `${joinStrategy} (${branches.length} branches)`
      : joinStrategy
        ? joinStrategy
        : branches.length
          ? `${branches.length} branches`
          : null;

  // Build handle list: one per branch + "done"
  const handles = useMemo(() => {
    if (branches.length === 0) return null;
    return [
      ...branches.map((b, i) => ({ id: `branch-${i}`, label: typeof b === 'string' ? b : b.label })),
      { id: 'done', label: 'Done' },
    ];
  }, [branches]);

  return (
    <div
      className={`relative min-w-[160px] bg-bg-secondary border-l-4 border-l-pink-500 border border-border rounded-lg shadow-lg px-3 py-2 ${
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
        <Columns className="w-4 h-4 text-pink-400" />
        <span className="text-sm font-medium text-text-primary">
          {data.label}
        </span>
      </div>
      {badgeValue && (
        <span className="text-[10px] text-text-muted mt-0.5 block truncate max-w-[140px]">
          {badgeValue}
        </span>
      )}

      {/* Dynamic branch handles + done */}
      {handles ? (
        <>
          <div className="flex justify-around text-[10px] text-text-muted mt-1 px-1">
            {handles.map((h) => (
              <span key={h.id} className="truncate max-w-[60px]">{h.label}</span>
            ))}
          </div>
          {handles.map((h, i) => (
            <Handle
              key={h.id}
              type="source"
              position={Position.Bottom}
              id={h.id}
              className={`!w-3 !h-3 !border-2 !border-bg-secondary ${
                h.id === 'done' ? '!bg-text-muted' : '!bg-pink-500'
              }`}
              style={{ left: `${((i + 1) / (handles.length + 1)) * 100}%` }}
            />
          ))}
        </>
      ) : (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-text-muted !border-2 !border-bg-secondary"
        />
      )}
    </div>
  );
}

export const ParallelNode = memo(ParallelNodeComponent);
