import { memo, useState, useRef, useEffect } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DiagramNodeShape, DiagramNodeStyle, DiagramNodeStatus, BranchDirection, MindMapChild } from '../../types/diagram';

export interface DiagramShapeNodeData {
  label: string;
  shape: DiagramNodeShape;
  description?: string;
  style?: DiagramNodeStyle;
  icon?: string;
  status?: DiagramNodeStatus;
  children?: MindMapChild[];
  branch_direction?: BranchDirection;
  selected?: boolean;
  onLabelChange?: (label: string) => void;
  onAddBranch?: (label: string, parentPath: number[] | null) => void;
  [key: string]: unknown;
}

function getShapePath(shape: DiagramNodeShape): string | null {
  switch (shape) {
    case 'diamond':
      return 'M 50 0 L 100 50 L 50 100 L 0 50 Z';
    case 'hexagon':
      return 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z';
    case 'document':
      return 'M 0 0 L 100 0 L 100 85 Q 75 75 50 85 Q 25 95 0 85 Z';
    default:
      return null;
  }
}

function ShapeWrapper({ shape, style, children }: {
  shape: DiagramNodeShape;
  style?: DiagramNodeStyle;
  children: React.ReactNode;
}) {
  const borderColor = style?.border_color || '#64748b';
  const fillColor = style?.fill_color || '#f8fafc';
  const fillOpacity = style?.fill_opacity ?? 1;
  const borderThickness = style?.border_thickness ?? 2;
  const shadow = style?.shadow;

  const baseClasses = `relative flex items-center justify-center text-center min-w-[100px] min-h-[60px] px-3 py-2 ${shadow ? 'shadow-md' : ''}`;

  switch (shape) {
    case 'circle':
      return (
        <div
          className={baseClasses}
          style={{
            borderRadius: '50%',
            border: `${borderThickness}px solid ${borderColor}`,
            backgroundColor: fillColor,
            opacity: fillOpacity,
            width: 80,
            height: 80,
          }}
        >
          {children}
        </div>
      );

    case 'cylinder':
      return (
        <div className="relative flex flex-col items-center">
          <div
            className="w-full h-3 rounded-t-full"
            style={{ backgroundColor: borderColor }}
          />
          <div
            className={`${baseClasses} rounded-none`}
            style={{
              border: `${borderThickness}px solid ${borderColor}`,
              borderTop: 'none',
              backgroundColor: fillColor,
              opacity: fillOpacity,
            }}
          >
            {children}
          </div>
          <div
            className="w-full h-3 rounded-b-full"
            style={{ backgroundColor: borderColor }}
          />
        </div>
      );

    case 'cloud':
      return (
        <div
          className={`${baseClasses} rounded-[40px]`}
          style={{
            border: `${borderThickness}px solid ${borderColor}`,
            backgroundColor: fillColor,
            opacity: fillOpacity,
            padding: '16px 24px',
          }}
        >
          {children}
        </div>
      );

    case 'person':
      return (
        <div className="flex flex-col items-center gap-1">
          <div
            className="rounded-full"
            style={{
              width: 32,
              height: 32,
              border: `${borderThickness}px solid ${borderColor}`,
              backgroundColor: fillColor,
              opacity: fillOpacity,
            }}
          />
          <div
            className={`${baseClasses} rounded`}
            style={{
              border: `${borderThickness}px solid ${borderColor}`,
              backgroundColor: fillColor,
              opacity: fillOpacity,
              minWidth: 80,
            }}
          >
            {children}
          </div>
        </div>
      );

    case 'folder':
      return (
        <div className="relative">
          <div
            className="absolute -top-2 left-2 h-3 w-12 rounded-t"
            style={{
              backgroundColor: fillColor,
              border: `${borderThickness}px solid ${borderColor}`,
              borderBottom: 'none',
            }}
          />
          <div
            className={`${baseClasses} rounded`}
            style={{
              border: `${borderThickness}px solid ${borderColor}`,
              backgroundColor: fillColor,
              opacity: fillOpacity,
            }}
          >
            {children}
          </div>
        </div>
      );

    case 'stack':
      return (
        <div className="relative">
          <div
            className="absolute top-1 left-1 w-full h-full rounded"
            style={{
              border: `${borderThickness}px solid ${borderColor}`,
              backgroundColor: fillColor,
              opacity: 0.5,
            }}
          />
          <div
            className={`${baseClasses} rounded relative`}
            style={{
              border: `${borderThickness}px solid ${borderColor}`,
              backgroundColor: fillColor,
              opacity: fillOpacity,
            }}
          >
            {children}
          </div>
        </div>
      );

    case 'diamond':
    case 'hexagon':
    case 'document': {
      const path = getShapePath(shape)!;
      return (
        <div className="relative" style={{ width: 120, height: 80 }}>
          <svg
            viewBox="0 0 100 100"
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
          >
            <path
              d={path}
              fill={fillColor}
              stroke={borderColor}
              strokeWidth={borderThickness}
              fillOpacity={fillOpacity}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">
            {children}
          </div>
        </div>
      );
    }

    case 'rounded-rectangle':
      return (
        <div
          className={`${baseClasses} rounded-xl`}
          style={{
            border: `${borderThickness}px solid ${borderColor}`,
            backgroundColor: fillColor,
            opacity: fillOpacity,
          }}
        >
          {children}
        </div>
      );

    case 'rectangle':
    case 'custom':
    default:
      return (
        <div
          className={`${baseClasses} rounded`}
          style={{
            border: `${borderThickness}px solid ${borderColor}`,
            backgroundColor: fillColor,
            opacity: fillOpacity,
          }}
        >
          {children}
        </div>
      );
  }
}

// Recursive branch tree for mind-map style rendering
function BranchTree({ items, side, path = [], onBranchClick, selectedPath }: {
  items: MindMapChild[];
  side: 'left' | 'right' | 'up' | 'down';
  path?: number[];
  onBranchClick?: (path: number[]) => void;
  selectedPath?: number[] | null;
}) {
  const isVert = side === 'down' || side === 'up';
  const isLeft = side === 'left';

  const isSelected = (itemPath: number[]) =>
    selectedPath && selectedPath.length === itemPath.length &&
    selectedPath.every((v, i) => v === itemPath[i]);

  return (
    <div className={`flex ${isVert ? 'flex-row gap-4' : 'flex-col gap-1'} ${
      isLeft ? 'items-end' : 'items-start'
    }`}>
      {items.map((child, i) => {
        const itemPath = [...path, i];
        return (
          <div key={i} className={`flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-start gap-0`}>
            <div className={`flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-center gap-1`}>
              <div className={`${isVert ? 'h-3 w-px' : 'w-3 h-px'} bg-slate-400 shrink-0`} />
              <span
                className={`text-[10px] whitespace-nowrap leading-tight cursor-pointer px-0.5 rounded ${
                  isSelected(itemPath)
                    ? 'text-blue-300 bg-blue-500/20 ring-1 ring-blue-400'
                    : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
                }`}
                onClick={(e) => { e.stopPropagation(); onBranchClick?.(itemPath); }}
              >
                {child.label}
              </span>
            </div>
            {child.children && child.children.length > 0 && (
              <div className={`flex ${isLeft ? 'flex-row-reverse' : 'flex-row'} items-center gap-0`}>
                <div className={`${isVert ? 'h-2 w-px' : 'w-2 h-px'} bg-slate-500 shrink-0`} />
                <BranchTree items={child.children} side={side} path={itemPath} onBranchClick={onBranchClick} selectedPath={selectedPath} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DiagramShapeNode = memo(function DiagramShapeNode({
  data,
}: NodeProps) {
  const nodeData = data as unknown as DiagramShapeNodeData;
  const { label, shape, status, children: childLabels, onLabelChange, onAddBranch } = nodeData;
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [addingBranch, setAddingBranch] = useState(false);
  const [branchInput, setBranchInput] = useState('');
  const [selectedBranchPath, setSelectedBranchPath] = useState<number[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const branchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditLabel(label);
  }, [label]);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  useEffect(() => {
    if (addingBranch && branchInputRef.current) {
      branchInputRef.current.focus();
    }
  }, [addingBranch]);

  const handleBranchClick = (path: number[]) => {
    setSelectedBranchPath(path);
    setAddingBranch(true);
  };

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== label && onLabelChange) {
      onLabelChange(trimmed);
    } else {
      setEditLabel(label);
    }
  };

  const statusBadge = status && status !== 'active' ? (
    <span className={`absolute -top-2 -right-2 text-[9px] px-1 rounded ${
      status === 'deprecated' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'
    }`}>
      {status}
    </span>
  ) : null;

  const dir = nodeData.branch_direction || (childLabels && childLabels.length > 0 ? 'both' : undefined);
  const hasChildren = childLabels && childLabels.length > 0;
  const isHorizontal = dir === 'right' || dir === 'left' || dir === 'both';
  const isVertical = dir === 'down' || dir === 'up';

  // Normalize children: support old string[] format
  const normalizedChildren: MindMapChild[] | undefined = hasChildren
    ? childLabels!.map((c) => typeof c === 'string' ? { label: c } : c)
    : undefined;

  // Split children for "both" mode
  const mid = normalizedChildren ? Math.ceil(normalizedChildren.length / 2) : 0;
  const leftItems = dir === 'both' && normalizedChildren ? normalizedChildren.slice(0, mid) : normalizedChildren;
  const rightItems = dir === 'both' && normalizedChildren ? normalizedChildren.slice(mid) : normalizedChildren;

  const shapeContent = (
    <ShapeWrapper shape={shape || 'rectangle'} style={nodeData.style}>
      <div className="flex flex-col items-center gap-0.5">
        {editing ? (
          <input
            ref={inputRef}
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEdit();
              if (e.key === 'Escape') { setEditLabel(label); setEditing(false); }
              e.stopPropagation();
            }}
            className="text-xs font-medium text-slate-800 bg-white border border-blue-400 rounded px-1 py-0 outline-none text-center w-full min-w-[60px]"
          />
        ) : (
          <span
            className="text-xs font-medium text-slate-800 leading-tight cursor-text"
            onDoubleClick={() => setEditing(true)}
          >
            {label}
          </span>
        )}
      </div>
    </ShapeWrapper>
  );

  return (
    <div
      className="relative"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Tab' && !editing && !addingBranch && onAddBranch) {
          e.preventDefault();
          e.stopPropagation();
          setSelectedBranchPath(null);
          setAddingBranch(true);
        }
      }}
    >
      <Handle type="target" position={Position.Top} id="top-target" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Top} id="top-source" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Right} id="right-target" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Right} id="right-source" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Bottom} id="bottom-target" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Bottom} id="bottom-source" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="target" position={Position.Left} id="left-target" className="!w-2 !h-2 !bg-slate-400" />
      <Handle type="source" position={Position.Left} id="left-source" className="!w-2 !h-2 !bg-slate-400" />

      {hasChildren && isHorizontal ? (
        <div className="flex flex-row items-center gap-2">
          {(dir === 'left' || dir === 'both') && <BranchTree items={dir === 'both' ? leftItems! : normalizedChildren!} side="left" onBranchClick={handleBranchClick} selectedPath={selectedBranchPath} />}
          {(dir === 'left' || dir === 'both') && <div className="w-3 h-px bg-slate-400" />}
          {shapeContent}
          {(dir === 'right' || dir === 'both') && <div className="w-3 h-px bg-slate-400" />}
          {(dir === 'right' || dir === 'both') && <BranchTree items={dir === 'both' ? rightItems! : normalizedChildren!} side="right" onBranchClick={handleBranchClick} selectedPath={selectedBranchPath} />}
        </div>
      ) : hasChildren && isVertical ? (
        <div className="flex flex-col items-center gap-2">
          {dir === 'up' && <BranchTree items={normalizedChildren!} side="up" onBranchClick={handleBranchClick} selectedPath={selectedBranchPath} />}
          {dir === 'up' && <div className="h-3 w-px bg-slate-400" />}
          {shapeContent}
          {dir === 'down' && <div className="h-3 w-px bg-slate-400" />}
          {dir === 'down' && <BranchTree items={normalizedChildren!} side="down" onBranchClick={handleBranchClick} selectedPath={selectedBranchPath} />}
        </div>
      ) : (
        shapeContent
      )}

      {statusBadge}

      {addingBranch && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
          {selectedBranchPath && (
            <span className="text-[9px] text-blue-300">sub</span>
          )}
          <input
            ref={branchInputRef}
            value={branchInput}
            onChange={(e) => setBranchInput(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && branchInput.trim()) {
                e.preventDefault();
                onAddBranch?.(branchInput.trim(), selectedBranchPath);
                setBranchInput('');
              }
              if (e.key === 'Escape') {
                setAddingBranch(false);
                setBranchInput('');
                setSelectedBranchPath(null);
              }
            }}
            onBlur={() => {
              if (branchInput.trim()) onAddBranch?.(branchInput.trim(), selectedBranchPath);
              setAddingBranch(false);
              setBranchInput('');
              setSelectedBranchPath(null);
            }}
            placeholder={selectedBranchPath ? 'Sub-branch...' : 'Branch...'}
            className="text-[10px] bg-slate-800 text-white border border-blue-400 rounded px-2 py-0.5 outline-none min-w-[140px] shadow-lg"
          />
        </div>
      )}
    </div>
  );
});
