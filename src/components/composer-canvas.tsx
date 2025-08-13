"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';

interface ComposerCanvasProps {
  backgroundImage: HTMLImageElement | null;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
}

export const ComposerCanvas = React.forwardRef<HTMLCanvasElement, ComposerCanvasProps>(
  ({ backgroundImage, texts, setTexts, selectedTextId, setSelectedTextId }, ref) => {
    const internalCanvasRef = React.useRef<HTMLCanvasElement>(null);
    React.useImperativeHandle(ref, () => internalCanvasRef.current as HTMLCanvasElement);
    
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
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      
      const { scale, pan } = viewStateRef.current;
      const dpr = window.devicePixelRatio || 1;
      
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
         canvas.width = Math.floor(displayWidth * dpr);
         canvas.height = Math.floor(displayHeight * dpr);
         ctx.scale(dpr,dpr);
      }
      
      ctx.save();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      ctx.translate(pan.x, pan.y);
      ctx.scale(scale, scale);

      if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width / (dpr * scale), canvas.height / (dpr*scale));
        ctx.fillStyle = 'hsl(var(--muted-foreground))'
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload a background image to start', (canvas.width / dpr / scale) / 2 - (pan.x / scale) , (canvas.height / dpr / scale) / 2 - (pan.y / scale));
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
    }, [backgroundImage, texts, selectedTextId, getTextMetrics]);


    React.useEffect(() => {
      const canvas = internalCanvasRef.current;
      const container = containerRef.current;
      if (!container || !canvas) return;

      const resizeObserver = new ResizeObserver(() => {
        redrawCanvas();
      });
      resizeObserver.observe(container);

      return () => {
        resizeObserver.disconnect();
      };
    }, [redrawCanvas]);
    
    React.useEffect(() => {
        viewStateRef.current = {
            scale: 1,
            pan: { x: 0, y: 0 },
            isPanning: false,
            panStart: { x: 0, y: 0 },
        };
        redrawCanvas();
    }, [backgroundImage]);

    React.useEffect(() => {
      redrawCanvas();
    }, [texts, selectedTextId, redrawCanvas]);

    const getTransformedMousePos = (e: React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
      const rect = canvas.getBoundingClientRect();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const dpr = window.devicePixelRatio || 1;

      const canvasX = (clientX - rect.left);
      const canvasY = (clientY - rect.top);
      
      const { scale, pan } = viewStateRef.current;
      const transformedX = (canvasX - pan.x) / scale;
      const transformedY = (canvasY - pan.y) / scale;
      
      return { x: transformedX, y: transformedY, clientX, clientY };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      const { x, y, clientX, clientY } = getTransformedMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      let hit = false;
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
        if (e.nativeEvent instanceof MouseEvent && e.nativeEvent.button === 1) { 
             e.preventDefault();
             viewStateRef.current.isPanning = true;
             viewStateRef.current.panStart = { x: clientX, y: clientY };
        }
      }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      const { clientX, clientY } = getTransformedMousePos(e);

      if (viewStateRef.current.isPanning) {
        const { panStart, pan } = viewStateRef.current;
        const dx = clientX - panStart.x;
        const dy = clientY - panStart.y;
        viewStateRef.current.pan.x = pan.x + dx;
        viewStateRef.current.pan.y = pan.y + dy;
        viewStateRef.current.panStart = { x: clientX, y: clientY };
        redrawCanvas();
        return;
      }
      
      if (!draggingState) return;
      
      const { x, y } = getTransformedMousePos(e);
      setTexts((prev) =>
        prev.map((t) =>
          t.id === draggingState.id
            ? { ...t, x: x - draggingState.offsetX, y: y - draggingState.offsetY }
            : t
        )
      );
    };

    const handleMouseUp = React.useCallback(() => {
        viewStateRef.current.isPanning = false;
        if (draggingState) {
          setDraggingState(null);
        }
    }, [draggingState]);

    const handleWheel = React.useCallback((e: React.WheelEvent) => {
      e.preventDefault();
      const canvas = internalCanvasRef.current;
      if (!canvas) return;

      const { clientX, clientY } = getTransformedMousePos(e);

      if (e.ctrlKey || e.metaKey || e.shiftKey) { 
        const zoomFactor = 1.1;
        const { scale, pan } = viewStateRef.current;
        const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;

        const worldX = (mouseX - pan.x) / scale;
        const worldY = (mouseY - pan.y) / scale;

        const newPanX = mouseX - worldX * newScale;
        const newPanY = mouseY - worldY * newScale;

        viewStateRef.current.scale = newScale;
        viewStateRef.current.pan = {x: newPanX, y: newPanY};
      } else { 
        const { pan } = viewStateRef.current;
        viewStateRef.current.pan = {
            x: pan.x - e.deltaX,
            y: pan.y - e.deltaY,
        };
      }
      
      redrawCanvas();
    }, [redrawCanvas, getTransformedMousePos]);

    React.useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;

        const handleWheelEvent = (e: WheelEvent) => handleWheel(e as any);

        canvas.addEventListener('wheel', handleWheelEvent, { passive: false });
        return () => canvas.removeEventListener('wheel', handleWheelEvent);
    }, [handleWheel]);

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg bg-card shadow-inner overflow-hidden flex justify-center items-center touch-none"
      >
        <canvas
          ref={internalCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          style={{
            cursor: viewStateRef.current.isPanning ? 'grabbing' : (draggingState ? 'grabbing' : (selectedTextId ? 'pointer' : 'default')),
            objectFit: 'contain',
            width: '100%',
            height: '100%',
          }}
        />
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
