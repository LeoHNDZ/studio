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

      const dpr = window.devicePixelRatio || 1;
      const displayWidth = canvas.clientWidth;
      const displayHeight = canvas.clientHeight;
      
      if (canvas.width !== Math.floor(displayWidth * dpr) || canvas.height !== Math.floor(displayHeight * dpr)) {
         canvas.width = Math.floor(displayWidth * dpr);
         canvas.height = Math.floor(displayHeight * dpr);
      }


      ctx.clearRect(0, 0, canvas.width, canvas.height);

      if (backgroundImage) {
        ctx.drawImage(backgroundImage, 0, 0, canvas.width, canvas.height);
      } else {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'hsl(var(--muted-foreground))'
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('Upload a background image to start', canvas.width / 2, canvas.height / 2);
      }

      const scaleX = canvas.width / (backgroundImage?.width || canvas.width);
      const scaleY = canvas.height / (backgroundImage?.height || canvas.height);
      
      texts.forEach((text) => {
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        ctx.fillStyle = text.color;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        ctx.fillText(text.text, text.x, text.y);

        if (text.id === selectedTextId) {
          const { width, height } = getTextMetrics(ctx, text);
          ctx.strokeStyle = 'hsl(var(--ring))';
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(text.x - 4, text.y - 4, width + 8, height + 8);
          ctx.setLineDash([]);
        }
      });
    }, [backgroundImage, texts, selectedTextId, getTextMetrics]);


    React.useEffect(() => {
        const canvas = internalCanvasRef.current;
        const container = containerRef.current;
        if (!container || !canvas) return;

        const resizeObserver = new ResizeObserver(entries => {
            if (!backgroundImage) {
                for (let entry of entries) {
                    const { width, height } = entry.contentRect;
                    canvas.style.width = `${width}px`;
                    canvas.style.height = `${height}px`;
                    redrawCanvas();
                }
            }
        });

        if (!backgroundImage) {
            resizeObserver.observe(container);
        }

        return () => resizeObserver.disconnect();
    }, [backgroundImage, redrawCanvas]);

    React.useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (canvas && backgroundImage) {
            canvas.style.width = 'auto';
            canvas.style.height = 'auto';
            canvas.style.maxWidth = '100%';
            canvas.style.maxHeight = '100%';
            canvas.width = backgroundImage.width;
            canvas.height = backgroundImage.height;
        }
        redrawCanvas();
    }, [backgroundImage, redrawCanvas]);

    React.useEffect(() => {
      redrawCanvas();
    }, [texts, selectedTextId, redrawCanvas]);

    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const canvasX = (clientX - rect.left) * (canvas.width / rect.width);
      const canvasY = (clientY - rect.top) * (canvas.height / rect.height);
      
      return { x: canvasX, y: canvasY };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      let hit = false;
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        const { width, height } = getTextMetrics(ctx, text);
        if (pos.x >= text.x && pos.x <= text.x + width && pos.y >= text.y && pos.y <= text.y + height) {
          setSelectedTextId(text.id);
          setDraggingState({
            id: text.id,
            offsetX: pos.x - text.x,
            offsetY: pos.y - text.y,
          });
          hit = true;
          break;
        }
      }
      if (!hit) {
        setSelectedTextId(null);
      }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      if (!draggingState) return;
      e.preventDefault();
      const pos = getMousePos(e);
      setTexts((prev) =>
        prev.map((t) =>
          t.id === draggingState.id
            ? { ...t, x: pos.x - draggingState.offsetX, y: pos.y - draggingState.offsetY }
            : t
        )
      );
    };

    const handleMouseUp = () => {
      setDraggingState(null);
    };

    return (
      <div ref={containerRef} className="w-full h-full rounded-lg bg-card shadow-inner overflow-auto flex justify-center items-center touch-none">
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
            cursor: draggingState ? 'grabbing' : (selectedTextId ? 'pointer' : 'default'),
            objectFit: 'contain'
          }}
        />
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
