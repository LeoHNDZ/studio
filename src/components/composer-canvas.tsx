"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';

interface ComposerCanvasProps {
  backgroundImage: HTMLImageElement | null;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
  canvasWidth: number | null;
  canvasHeight: number | null;
}

export interface ComposerCanvasHandle {
  getCanvas: () => HTMLCanvasElement | null;
  resetView: () => void;
}


export const ComposerCanvas = React.forwardRef<ComposerCanvasHandle, ComposerCanvasProps>(
  ({ backgroundImage, texts, setTexts, selectedTextId, setSelectedTextId, canvasWidth, canvasHeight }, ref) => {
    const internalCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const [draggingState, setDraggingState] = React.useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    
    const viewStateRef = React.useRef({
      scale: 1,
      pan: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
    });

    const getTextMetrics = React.useCallback((ctx: CanvasRenderingContext2D, text: TextElement) => {
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      const metrics = ctx.measureText(text.text);
      return {
        width: metrics.width,
        height: text.fontSize,
      };
    }, []);

    const redrawCanvas = React.useCallback(() => {
      const canvas = internalCanvasRef.current;
      if (!canvas || !containerRef.current) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { scale, pan } = viewStateRef.current;
      const dpr = window.devicePixelRatio || 1;
      
      const containerWidth = containerRef.current.clientWidth;
      const containerHeight = containerRef.current.clientHeight;

      const effectiveCanvasWidth = canvasWidth || containerWidth;
      const effectiveCanvasHeight = canvasHeight || containerHeight;

      if (canvas.width !== Math.floor(effectiveCanvasWidth * dpr) || canvas.height !== Math.floor(effectiveCanvasHeight * dpr)) {
         canvas.width = Math.floor(effectiveCanvasWidth * dpr);
         canvas.height = Math.floor(effectiveCanvasHeight * dpr);
         canvas.style.width = `${effectiveCanvasWidth}px`;
         canvas.style.height = `${effectiveCanvasHeight}px`;
         ctx.scale(dpr,dpr);
      }
      
      ctx.save();
      ctx.clearRect(0, 0, effectiveCanvasWidth, effectiveCanvasHeight);
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, 0, effectiveCanvasWidth, effectiveCanvasHeight);
      
      if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvasWidth!, canvasHeight!);
      } else {
         // No background image specific placeholder text has been removed to keep it clean.
      }
      
      texts.forEach((text) => {
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text.text, text.x, text.y);

        if (text.id === selectedTextId) {
          const { width, height } = getTextMetrics(ctx, text);
          ctx.strokeStyle = 'hsl(var(--ring))';
          ctx.lineWidth = 2 / scale;
          ctx.setLineDash([6 / scale, 3 / scale]);
          ctx.strokeRect(text.x - 4, text.y - 4, width + 8, height + 8);
          ctx.setLineDash([]);
        }
      });

      ctx.restore();
    }, [backgroundImage, texts, selectedTextId, getTextMetrics, canvasWidth, canvasHeight]);
    
    const resetView = React.useCallback(() => {
        const container = containerRef.current;
        if (!container || !canvasWidth || !canvasHeight) {
            viewStateRef.current = {
                scale: 1,
                pan: { x: 0, y: 0 },
                isPanning: false,
                panStart: { x: 0, y: 0 },
            };
            redrawCanvas();
            return;
        }

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95; 

        const panX = (containerWidth - (canvasWidth * scale)) / 2;
        const panY = (containerHeight - (canvasHeight * scale)) / 2;

        const dpr = window.devicePixelRatio || 1;

        viewStateRef.current = {
            scale: scale,
            pan: { x: panX / dpr, y: panY / dpr },
            isPanning: false,
            panStart: { x: 0, y: 0 },
        };
        redrawCanvas();
    }, [canvasWidth, canvasHeight, redrawCanvas]);

     React.useImperativeHandle(ref, () => ({
        getCanvas: () => internalCanvasRef.current,
        resetView,
     }));

    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => {
           redrawCanvas();
        });
        resizeObserver.observe(container);
        return () => {
            resizeObserver.disconnect();
        };
    }, [redrawCanvas]);

    React.useEffect(() => {
      if (backgroundImage) {
        resetView();
      }
    }, [backgroundImage, resetView]);

    React.useEffect(() => {
      redrawCanvas();
    }, [texts, selectedTextId, redrawCanvas]);

    const getTransformedMousePos = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
      const rect = canvas.getBoundingClientRect();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const canvasX = (clientX - rect.left);
      const canvasY = (clientY - rect.top);
      
      const { scale, pan } = viewStateRef.current;
      const dpr = window.devicePixelRatio || 1;

      const transformedX = (canvasX - pan.x * dpr) / scale / dpr;
      const transformedY = (canvasY - pan.y * dpr) / scale / dpr;

      
      return { x: transformedX, y: transformedY, clientX, clientY };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      const { x, y, clientX, clientY } = getTransformedMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      let hit = false;
      // Iterate backwards to select the top-most element
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        const { width, height } = getTextMetrics(ctx, text);
        if (x >= text.x && x <= text.x + width && y >= text.y && y <= text.y + height) {
          setSelectedTextId(text.id);
          setDraggingState({
            id: text.id,
            offsetX: x - text.x,
            offsetY: y - text.y,
          });
          hit = true;
          break;
        }
      }
      if (!hit) {
        setSelectedTextId(null);
        // Middle mouse button for panning
        if (e.nativeEvent instanceof MouseEvent && (e.nativeEvent.button === 1)) { 
             e.preventDefault();
             viewStateRef.current.isPanning = true;
             viewStateRef.current.panStart = { x: clientX, y: clientY };
        }
      }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const { x, y, clientX, clientY } = getTransformedMousePos(e);

      if (viewStateRef.current.isPanning) {
        const dpr = window.devicePixelRatio || 1;
        const { panStart, pan } = viewStateRef.current;
        const dx = clientX - panStart.x;
        const dy = clientY - panStart.y;
        viewStateRef.current.pan.x = pan.x + dx / dpr;
        viewStateRef.current.pan.y = pan.y + dy / dpr;
        viewStateRef.current.panStart = { x: clientX, y: clientY };
        redrawCanvas();
        return;
      }
      
      if (!draggingState) return;
      
      setTexts((prev) =>
        prev.map((t) =>
          t.id === draggingState.id
            ? { ...t, x: x - draggingState.offsetX, y: y - draggingState.offsetY }
            : t
        )
      );
    };

    const handleMouseUp = React.useCallback(() => {
        if (viewStateRef.current.isPanning) {
          viewStateRef.current.isPanning = false;
        }
        if (draggingState) {
          setDraggingState(null);
        }
    }, [draggingState]);

    const handleWheel = React.useCallback((e: WheelEvent) => {
      e.preventDefault();
      const canvas = internalCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const clientX = e.clientX;
      const clientY = e.clientY;

      const canvasX = (clientX - rect.left);
      const canvasY = (clientY - rect.top);
      
      const mouseX = (canvasX - viewStateRef.current.pan.x * dpr) / viewStateRef.current.scale / dpr;
      const mouseY = (canvasY - viewStateRef.current.pan.y * dpr) / viewStateRef.current.scale / dpr;

      if (e.ctrlKey || e.metaKey || e.shiftKey) { // Zoom
        const zoomFactor = 1.1;
        const { scale } = viewStateRef.current;
        const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
        
        const newPanX = viewStateRef.current.pan.x - (mouseX * (newScale - scale) * dpr) / newScale;
        const newPanY = viewStateRef.current.pan.y - (mouseY * (newScale - scale) * dpr) / newScale;


        viewStateRef.current.scale = newScale;
        viewStateRef.current.pan = {x: newPanX, y: newPanY};
      } else { // Pan
        const { pan, scale } = viewStateRef.current;
        viewStateRef.current.pan.x = pan.x - e.deltaX / scale;
        viewStateRef.current.pan.y = pan.y - e.deltaY / scale;
      }
      
      redrawCanvas();
    }, [redrawCanvas]);

    React.useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;

        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        
        return () => {
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mouseup', handleMouseUp);
        }
    }, [handleWheel, handleMouseUp]);

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg bg-card shadow-inner overflow-hidden flex justify-center items-center"
        style={{ cursor: viewStateRef.current.isPanning ? 'grabbing' : 'default' }}
      >
        <canvas
          ref={internalCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className="touch-none"
          style={{
            cursor: viewStateRef.current.isPanning ? 'grabbing' : (draggingState ? 'grabbing' : (selectedTextId ? 'pointer' : 'default')),
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
