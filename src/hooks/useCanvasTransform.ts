import { useState, useCallback, useEffect, useRef, useMemo, type RefObject, type CSSProperties } from 'react';
import { useUiStore } from '../stores/ui-store';

const MIN_SCALE = 0.1;
const MAX_SCALE = 3.0;
const ZOOM_STEP = 0.1;
const ZOOM_SENSITIVITY = 0.005;
const FIT_PADDING = 60;

interface Transform {
  scale: number;
  tx: number;
  ty: number;
}

interface CanvasTransformResult {
  transform: Transform;
  transformStyle: CSSProperties;
  screenToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  fitView: (positions: { x: number; y: number }[], blockWidth: number, blockHeight: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  resetView: () => void;
  handleCanvasMouseDown: (e: React.MouseEvent) => void;
}

export function useCanvasTransform(containerRef: RefObject<HTMLDivElement | null>, persistKey?: string): CanvasTransformResult {
  const [transform, setTransform] = useState<Transform>(() => {
    if (persistKey) {
      const saved = useUiStore.getState().getViewport(persistKey);
      if (saved) return { scale: saved.zoom, tx: saved.x, ty: saved.y };
    }
    return { scale: 1, tx: 0, ty: 0 };
  });
  const transformRef = useRef(transform);
  transformRef.current = transform;

  // Debounce-save transform to ui-store
  const saveTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (!persistKey) return;
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      useUiStore.getState().setViewport(persistKey, {
        x: transform.tx,
        y: transform.ty,
        zoom: transform.scale,
      });
    }, 200);
    return () => clearTimeout(saveTimerRef.current);
  }, [persistKey, transform]);

  // Wheel handler: Ctrl/Cmd+scroll = zoom, plain scroll = pan
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();

      const t = transformRef.current;

      if (e.ctrlKey || e.metaKey) {
        // Zoom centered on cursor
        const rect = el.getBoundingClientRect();
        const cursorX = e.clientX - rect.left;
        const cursorY = e.clientY - rect.top;

        const delta = -e.deltaY * ZOOM_SENSITIVITY;
        const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, t.scale * (1 + delta)));
        const ratio = newScale / t.scale;

        setTransform({
          scale: newScale,
          tx: cursorX - ratio * (cursorX - t.tx),
          ty: cursorY - ratio * (cursorY - t.ty),
        });
      } else {
        // Pan
        setTransform({
          ...t,
          tx: t.tx - e.deltaX,
          ty: t.ty - e.deltaY,
        });
      }
    };

    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [containerRef]);

  // Middle-click pan
  const handleCanvasMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (e.button !== 1) return; // middle click only
      e.preventDefault();

      const startX = e.clientX;
      const startY = e.clientY;
      const startTx = transformRef.current.tx;
      const startTy = transformRef.current.ty;

      const handleMouseMove = (me: MouseEvent) => {
        setTransform((prev) => ({
          ...prev,
          tx: startTx + (me.clientX - startX),
          ty: startTy + (me.clientY - startY),
        }));
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    []
  );

  // Convert screen (viewport) coordinates to canvas coordinates
  const screenToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return { x: clientX, y: clientY };
      const rect = el.getBoundingClientRect();
      const t = transformRef.current;
      return {
        x: (clientX - rect.left - t.tx) / t.scale,
        y: (clientY - rect.top - t.ty) / t.scale,
      };
    },
    [containerRef]
  );

  // Fit all content in viewport
  const fitView = useCallback(
    (positions: { x: number; y: number }[], blockWidth: number, blockHeight: number) => {
      const el = containerRef.current;
      if (!el || positions.length === 0) return;

      const rect = el.getBoundingClientRect();
      const minX = Math.min(...positions.map((p) => p.x));
      const minY = Math.min(...positions.map((p) => p.y));
      const maxX = Math.max(...positions.map((p) => p.x)) + blockWidth;
      const maxY = Math.max(...positions.map((p) => p.y)) + blockHeight;

      const contentW = maxX - minX;
      const contentH = maxY - minY;
      if (contentW <= 0 || contentH <= 0) return;

      const scaleX = (rect.width - FIT_PADDING * 2) / contentW;
      const scaleY = (rect.height - FIT_PADDING * 2) / contentH;
      const newScale = Math.min(Math.max(Math.min(scaleX, scaleY), MIN_SCALE), MAX_SCALE);

      const newTx = (rect.width - contentW * newScale) / 2 - minX * newScale;
      const newTy = (rect.height - contentH * newScale) / 2 - minY * newScale;

      setTransform({ scale: newScale, tx: newTx, ty: newTy });
    },
    [containerRef]
  );

  const zoomIn = useCallback(() => {
    setTransform((prev) => {
      const el = containerRef.current;
      if (!el) return prev;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const newScale = Math.min(MAX_SCALE, prev.scale + ZOOM_STEP);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        tx: cx - ratio * (cx - prev.tx),
        ty: cy - ratio * (cy - prev.ty),
      };
    });
  }, [containerRef]);

  const zoomOut = useCallback(() => {
    setTransform((prev) => {
      const el = containerRef.current;
      if (!el) return prev;
      const rect = el.getBoundingClientRect();
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const newScale = Math.max(MIN_SCALE, prev.scale - ZOOM_STEP);
      const ratio = newScale / prev.scale;
      return {
        scale: newScale,
        tx: cx - ratio * (cx - prev.tx),
        ty: cy - ratio * (cy - prev.ty),
      };
    });
  }, [containerRef]);

  const resetView = useCallback(() => {
    setTransform({ scale: 1, tx: 0, ty: 0 });
  }, []);

  const transformStyle = useMemo<CSSProperties>(
    () => ({
      transformOrigin: '0 0',
      transform: `translate(${transform.tx}px, ${transform.ty}px) scale(${transform.scale})`,
    }),
    [transform]
  );

  return {
    transform,
    transformStyle,
    screenToCanvas,
    fitView,
    zoomIn,
    zoomOut,
    resetView,
    handleCanvasMouseDown,
  };
}
