import { memo, useState, useRef, useEffect, useMemo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { DiagramNodeShape, DiagramNodeStyle, DiagramNodeStatus, DiagramLayoutType, MindMapChild } from '../../types/diagram';
import { colorGroupToColor } from '../../utils/diagram-layout';

export interface DiagramShapeNodeData {
  label: string;
  shape: DiagramNodeShape;
  description?: string;
  style?: DiagramNodeStyle;
  icon?: string;
  status?: DiagramNodeStatus;
  color_group?: string;
  layout_type?: DiagramLayoutType;
  children?: MindMapChild[];
  selected?: boolean;
  onLabelChange?: (label: string) => void;
  onAddChild?: (label: string, parentPath: number[] | null) => void;
  onDeleteChild?: (path: number[]) => void;
  onEditChild?: (path: number[], newLabel: string) => void;
  [key: string]: unknown;
}

function getShapePath(shape: DiagramNodeShape): string | null {
  switch (shape) {
    case 'diamond': return 'M 50 0 L 100 50 L 50 100 L 0 50 Z';
    case 'hexagon': return 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z';
    case 'document': return 'M 0 0 L 100 0 L 100 85 Q 75 75 50 85 Q 25 95 0 85 Z';
    default: return null;
  }
}

function ShapeWrapper({ shape, style, children }: {
  shape: DiagramNodeShape; style?: DiagramNodeStyle; children: React.ReactNode;
}) {
  const borderColor = style?.border_color || '#64748b';
  const fillColor = style?.fill_color || '#f8fafc';
  const fillOpacity = style?.fill_opacity ?? 1;
  const borderThickness = style?.border_thickness ?? 2;
  const shadow = style?.shadow;
  const base = `relative flex items-center justify-center text-center min-w-[100px] min-h-[60px] px-3 py-2 ${shadow ? 'shadow-md' : ''}`;

  switch (shape) {
    case 'circle':
      return <div className={base} style={{ borderRadius: '50%', border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity, width: 80, height: 80 }}>{children}</div>;
    case 'cylinder':
      return (
        <div className="relative flex flex-col items-center">
          <div className="w-full h-3 rounded-t-full" style={{ backgroundColor: borderColor }} />
          <div className={`${base} rounded-none`} style={{ border: `${borderThickness}px solid ${borderColor}`, borderTop: 'none', backgroundColor: fillColor, opacity: fillOpacity }}>{children}</div>
          <div className="w-full h-3 rounded-b-full" style={{ backgroundColor: borderColor }} />
        </div>
      );
    case 'cloud':
      return <div className={`${base} rounded-[40px]`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity, padding: '16px 24px' }}>{children}</div>;
    case 'person':
      return (
        <div className="flex flex-col items-center gap-1">
          <div className="rounded-full" style={{ width: 32, height: 32, border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity }} />
          <div className={`${base} rounded`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity, minWidth: 80 }}>{children}</div>
        </div>
      );
    case 'folder':
      return (
        <div className="relative">
          <div className="absolute -top-2 left-2 h-3 w-12 rounded-t" style={{ backgroundColor: fillColor, border: `${borderThickness}px solid ${borderColor}`, borderBottom: 'none' }} />
          <div className={`${base} rounded`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity }}>{children}</div>
        </div>
      );
    case 'stack':
      return (
        <div className="relative">
          <div className="absolute top-1 left-1 w-full h-full rounded" style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: 0.5 }} />
          <div className={`${base} rounded relative`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity }}>{children}</div>
        </div>
      );
    case 'diamond': case 'hexagon': case 'document': {
      const path = getShapePath(shape)!;
      return (
        <div className="relative" style={{ width: 120, height: 80 }}>
          <svg viewBox="0 0 100 100" className="absolute inset-0 w-full h-full" preserveAspectRatio="none">
            <path d={path} fill={fillColor} stroke={borderColor} strokeWidth={borderThickness} fillOpacity={fillOpacity} />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center px-4 text-center">{children}</div>
        </div>
      );
    }
    case 'rounded-rectangle':
      return <div className={`${base} rounded-xl`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity }}>{children}</div>;
    default:
      return <div className={`${base} rounded`} style={{ border: `${borderThickness}px solid ${borderColor}`, backgroundColor: fillColor, opacity: fillOpacity }}>{children}</div>;
  }
}

// ─── Branch tree rendering ──────────────────────────────────────────────────
// Renders children as HTML elements with proper positioning outside the shape.

function BranchLabel({ label, onEdit }: { label: string; onEdit?: (newLabel: string) => void }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(label);
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(label); }, [label]);
  useEffect(() => { if (editing && ref.current) { ref.current.focus(); ref.current.select(); } }, [editing]);

  if (editing) {
    return (
      <input
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          e.stopPropagation();
          if (e.key === 'Enter') {
            const trimmed = value.trim();
            if (trimmed && trimmed !== label) onEdit?.(trimmed);
            setEditing(false);
          }
          if (e.key === 'Escape') { setValue(label); setEditing(false); }
        }}
        onBlur={() => {
          const trimmed = value.trim();
          if (trimmed && trimmed !== label) onEdit?.(trimmed);
          setEditing(false);
        }}
        className="text-[10px] bg-slate-800 text-white border border-blue-400 rounded px-1 py-0 outline-none min-w-[40px] w-[80px]"
      />
    );
  }
  return (
    <span
      className="text-[10px] whitespace-nowrap leading-tight cursor-pointer px-1 py-0.5 rounded text-slate-300 hover:text-white hover:bg-slate-700/50"
      onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      title="Click: add sub | Double-click: edit | Right-click: delete"
    >
      {label}
    </span>
  );
}

function BranchTree({ items, side, lineColor, path = [], onClickBranch, onDeleteBranch, onEditBranch }: {
  items: MindMapChild[];
  side: 'left' | 'right' | 'down';
  lineColor: string;
  path?: number[];
  onClickBranch?: (path: number[]) => void;
  onDeleteBranch?: (path: number[]) => void;
  onEditBranch?: (path: number[], newLabel: string) => void;
}) {
  const isLeft = side === 'left';
  const isDown = side === 'down';

  return (
    <div className={`flex ${isDown ? 'flex-row gap-3' : 'flex-col gap-1'} ${isLeft ? 'items-end' : 'items-start'}`}>
      {items.map((child, i) => {
        const itemPath = [...path, i];
        return (
          <div key={i} className={`flex ${isDown ? 'flex-col items-center' : isLeft ? 'flex-row-reverse' : 'flex-row'} items-start gap-0`}>
            <div
              className={`flex ${isDown ? 'flex-col items-center' : isLeft ? 'flex-row-reverse' : 'flex-row'} items-center gap-1`}
              onClick={(e) => { e.stopPropagation(); onClickBranch?.(itemPath); }}
              onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); onDeleteBranch?.(itemPath); }}
            >
              <div className={`${isDown ? 'h-3 w-px' : 'w-3 h-px'} shrink-0`} style={{ backgroundColor: lineColor }} />
              <BranchLabel label={child.label} onEdit={(newLabel) => onEditBranch?.(itemPath, newLabel)} />
            </div>
            {child.children && child.children.length > 0 && (
              <div className={`flex ${isDown ? 'flex-col items-center' : isLeft ? 'flex-row-reverse' : 'flex-row'} items-center gap-0`}>
                <div className={`${isDown ? 'h-2 w-px' : 'w-2 h-px'} shrink-0`} style={{ backgroundColor: lineColor, opacity: 0.5 }} />
                <BranchTree items={child.children} side={side} lineColor={lineColor} path={itemPath} onClickBranch={onClickBranch} onDeleteBranch={onDeleteBranch} onEditBranch={onEditBranch} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export const DiagramShapeNode = memo(function DiagramShapeNode({ data }: NodeProps) {
  const d = data as unknown as DiagramShapeNodeData;
  const { label, shape, status, children: rawChildren, onLabelChange, onAddChild, onDeleteChild, onEditChild, layout_type, color_group } = d;
  const [editing, setEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(label);
  const [adding, setAdding] = useState(false);
  const [addLabel, setAddLabel] = useState('');
  const [addParentPath, setAddParentPath] = useState<number[] | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const addRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setEditLabel(label); }, [label]);
  useEffect(() => { if (editing && inputRef.current) { inputRef.current.focus(); inputRef.current.select(); } }, [editing]);
  useEffect(() => { if (adding && addRef.current) addRef.current.focus(); }, [adding]);

  const children: MindMapChild[] = useMemo(() => {
    if (!rawChildren?.length) return [];
    return rawChildren.map((c) => typeof c === 'string' ? { label: c as string } : c);
  }, [rawChildren]);

  const lineColor = colorGroupToColor(color_group) || '#64748b';
  const lt = layout_type || 'mind-map';

  const commitEdit = () => {
    setEditing(false);
    const trimmed = editLabel.trim();
    if (trimmed && trimmed !== label && onLabelChange) onLabelChange(trimmed);
    else setEditLabel(label);
  };

  const commitAdd = () => {
    const trimmed = addLabel.trim();
    if (trimmed && onAddChild) onAddChild(trimmed, addParentPath);
    setAddLabel('');
    setAdding(false);
    setAddParentPath(null);
  };

  const handleBranchClick = (path: number[]) => {
    setAddParentPath(path);
    setAdding(true);
  };

  const handleDeleteBranch = (path: number[]) => {
    if (onDeleteChild) onDeleteChild(path);
  };

  const handleEditBranch = (path: number[], newLabel: string) => {
    if (onEditChild) onEditChild(path, newLabel);
  };

  const startRootAdd = () => {
    setAddParentPath(null);
    setAdding(true);
  };

  const statusBadge = status && status !== 'active' ? (
    <span className={`absolute -top-2 -right-2 text-[9px] px-1 rounded ${status === 'deprecated' ? 'bg-amber-200 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>{status}</span>
  ) : null;

  const style = color_group ? { ...d.style, border_color: colorGroupToColor(color_group) || d.style?.border_color } : d.style;

  // Split children for mind-map "both sides" layout
  const rightKids = children.filter((_, i) => i % 2 === 0);
  const leftKids = children.filter((_, i) => i % 2 !== 0);
  // Remap paths for split sides: rightKids are even indices, leftKids are odd
  const rightPaths = children.map((_, i) => i).filter((i) => i % 2 === 0);
  const leftPaths = children.map((_, i) => i).filter((i) => i % 2 !== 0);

  const shapeContent = (
    <ShapeWrapper shape={shape || 'rectangle'} style={style}>
      <div className="flex flex-col items-center gap-0.5">
        {editing ? (
          <input
            ref={inputRef} value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') { setEditLabel(label); setEditing(false); } e.stopPropagation(); }}
            className="text-xs font-medium text-slate-800 bg-white border border-blue-400 rounded px-1 py-0 outline-none text-center w-full min-w-[60px]"
          />
        ) : (
          <span className="text-xs font-medium text-slate-800 leading-tight cursor-text" onDoubleClick={() => setEditing(true)}>{label}</span>
        )}
      </div>
    </ShapeWrapper>
  );

  return (
    <div
      className="relative"
      tabIndex={0}
      onKeyDown={(e) => {
        if ((e.key === 'Tab' || e.key === 'Enter') && !editing && !adding && onAddChild) {
          e.preventDefault();
          e.stopPropagation();
          startRootAdd();
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

      {/* Layout-specific rendering */}
      {lt === 'mind-map' && children.length > 0 ? (
        <div className="flex flex-row items-center gap-2">
          {leftKids.length > 0 && (
            <>
              <BranchTree
                items={leftKids} side="left" lineColor={lineColor}
                onClickBranch={(subPath) => handleBranchClick([leftPaths[subPath[0]], ...subPath.slice(1)])}
                onDeleteBranch={(subPath) => handleDeleteBranch([leftPaths[subPath[0]], ...subPath.slice(1)])}
                onEditBranch={(subPath, nl) => handleEditBranch([leftPaths[subPath[0]], ...subPath.slice(1)], nl)}
              />
              <div className="w-3 h-px" style={{ backgroundColor: lineColor }} />
            </>
          )}
          {shapeContent}
          {rightKids.length > 0 && (
            <>
              <div className="w-3 h-px" style={{ backgroundColor: lineColor }} />
              <BranchTree
                items={rightKids} side="right" lineColor={lineColor}
                onClickBranch={(subPath) => handleBranchClick([rightPaths[subPath[0]], ...subPath.slice(1)])}
                onDeleteBranch={(subPath) => handleDeleteBranch([rightPaths[subPath[0]], ...subPath.slice(1)])}
                onEditBranch={(subPath, nl) => handleEditBranch([rightPaths[subPath[0]], ...subPath.slice(1)], nl)}
              />
            </>
          )}
        </div>
      ) : (lt === 'org-chart' || lt === 'tree-chart') && children.length > 0 ? (
        <div className="flex flex-col items-center gap-2">
          {shapeContent}
          <div className="h-3 w-px" style={{ backgroundColor: lineColor }} />
          <BranchTree items={children} side="down" lineColor={lineColor} onClickBranch={handleBranchClick} onDeleteBranch={handleDeleteBranch} onEditBranch={handleEditBranch} />
        </div>
      ) : lt === 'logic-chart' && children.length > 0 ? (
        <div className="flex flex-row items-center gap-2">
          {shapeContent}
          <div className="w-3 h-px" style={{ backgroundColor: lineColor }} />
          <BranchTree items={children} side="right" lineColor={lineColor} onClickBranch={handleBranchClick} onDeleteBranch={handleDeleteBranch} onEditBranch={handleEditBranch} />
        </div>
      ) : (
        shapeContent
      )}

      {statusBadge}

      {/* Add child/sub-child input */}
      {adding && (
        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1">
          {addParentPath && <span className="text-[9px] text-blue-300">sub</span>}
          <input
            ref={addRef} value={addLabel}
            onChange={(e) => setAddLabel(e.target.value)}
            onKeyDown={(e) => {
              e.stopPropagation();
              if (e.key === 'Enter' && addLabel.trim()) { e.preventDefault(); commitAdd(); }
              if (e.key === 'Escape') { setAdding(false); setAddLabel(''); setAddParentPath(null); }
            }}
            onBlur={() => { if (addLabel.trim()) commitAdd(); else { setAdding(false); setAddLabel(''); setAddParentPath(null); } }}
            placeholder={addParentPath ? 'Sub-branch...' : 'Branch...'}
            className="text-[10px] bg-slate-800 text-white border border-blue-400 rounded px-2 py-0.5 outline-none min-w-[140px] shadow-lg"
          />
        </div>
      )}
    </div>
  );
});
