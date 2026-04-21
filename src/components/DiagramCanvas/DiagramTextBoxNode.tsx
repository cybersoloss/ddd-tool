import { memo, useState, useRef, useEffect } from 'react';
import { type NodeProps } from '@xyflow/react';
import type { TextBoxStyle } from '../../types/diagram';

export interface DiagramTextBoxNodeData {
  text: string;
  style?: TextBoxStyle;
  onTextChange?: (text: string) => void;
  [key: string]: unknown;
}

export const DiagramTextBoxNode = memo(function DiagramTextBoxNode({
  data,
  selected,
}: NodeProps) {
  const nodeData = data as unknown as DiagramTextBoxNodeData;
  const { text, style, onTextChange } = nodeData;
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(text);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setEditText(text);
  }, [text]);

  useEffect(() => {
    if (editing && textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, [editing]);

  const sizeClass = style?.size === 'small' ? 'text-[10px]' : style?.size === 'large' ? 'text-sm' : 'text-xs';
  const borderClass = style?.border ? 'border border-slate-300' : 'border border-slate-200';
  const bgClass = style?.background || '#ffffff';

  const handleDoubleClick = () => {
    setEditing(true);
  };

  const handleBlur = () => {
    setEditing(false);
    if (editText !== text && onTextChange) {
      onTextChange(editText);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setEditText(text);
      setEditing(false);
    }
    // Don't propagate to prevent React Flow from handling it
    e.stopPropagation();
  };

  if (editing) {
    return (
      <textarea
        ref={textareaRef}
        value={editText}
        onChange={(e) => setEditText(e.target.value)}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
        className={`${sizeClass} ${borderClass} rounded p-2 resize min-w-[100px] min-h-[40px] outline-none ring-2 ring-blue-400 bg-white text-slate-700`}
        style={{ backgroundColor: bgClass !== 'transparent' ? bgClass : '#fff' }}
      />
    );
  }

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`${sizeClass} ${borderClass} rounded p-2 min-w-[60px] min-h-[24px] cursor-text text-slate-900 font-medium whitespace-pre-wrap shadow-sm ${
        selected ? 'ring-2 ring-blue-400' : ''
      }`}
      style={{ backgroundColor: bgClass }}
    >
      {text || <span className="text-slate-400 italic">Double-click to edit</span>}
    </div>
  );
});
