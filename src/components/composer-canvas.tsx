"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';
import { useIsMobile } from '@/hooks/use-mobile';

interface ComposerCanvasProps {
  backgroundImage: HTMLImageElement | null;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
}

export const ComposerCanvas = React.forwardRef<HTMLCanvasElement, ComposerCanvasProps>(
  ({ backgroundImage, texts, setTexts, selectedTextId, setSelectedTextId }, ref) => {
    const isMobile = useIsMobile();
    const canvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);

    const [draggingState, setDraggingState] = React.useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

    React.useImperativeHandle(ref, () => canvasRef.current as HTMLCanvasElement);

    const getTextMetrics = React.useCallback((ctx: CanvasRenderingContext2D, text: TextElement) => {
      ctx.font = `${text.fontSize}px ${text.fontFamily}`;
      const metrics = ctx.measureText(text.text);
      return {
        width: metrics.width,
        height: text.fontSize,
      };
    }, []);

    const redrawCanvas = React.useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = 'hsl(var(--card))';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      if (backgroundImage) {
        const hRatio = canvas.width / backgroundImage.width;
        const vRatio = canvas.height / backgroundImage.height;
        const ratio = Math.min(hRatio, vRatio);
        const centerShift_x = (canvas.width - backgroundImage.width * ratio) / 2;
        const centerShift_y = (canvas.height - backgroundImage.height * ratio) / 2;
        ctx.drawImage(backgroundImage, 0, 0, backgroundImage.width, backgroundImage.height, centerShift_x, centerShift_y, backgroundImage.width * ratio, backgroundImage.height * ratio);
      } else {
        ctx.fillStyle = 'hsl(var(--muted-foreground))'
        ctx.font = '14px Inter';
        ctx.textAlign = 'center';
        ctx.fillText('Upload a background image to start', canvas.width / 2, canvas.height / 2);
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
          ctx.lineWidth = 2;
          ctx.setLineDash([6, 3]);
          ctx.strokeRect(text.x - 4, text.y - 4, width + 8, height + 8);
          ctx.setLineDash([]);
        }
      });
    }, [backgroundImage, texts, selectedTextId, getTextMetrics]);

    React.useEffect(() => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!container || !canvas) return;

      const resizeObserver = new ResizeObserver(() => {
        const dpr = window.devicePixelRatio || 1;
        const rect = container.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        const ctx = canvas.getContext('2d');
        ctx?.scale(dpr, dpr);
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;
        redrawCanvas();
      });

      resizeObserver.observe(container);
      return () => resizeObserver.disconnect();
    }, [redrawCanvas]);

    React.useEffect(() => {
      redrawCanvas();
    }, [redrawCanvas]);

    const getMousePos = (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      return {
        x: (clientX - rect.left),
        y: (clientY - rect.top),
      };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const pos = getMousePos(e);
      const ctx = canvasRef.current?.getContext('2d');
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
      <div ref={containerRef} className="w-full h-full rounded-lg bg-card shadow-inner overflow-hidden touch-none">
        <canvas
          ref={canvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onTouchEnd={handleMouseUp}
          className="cursor-grab"
          style={{
            cursor: draggingState ? 'grabbing' : (selectedTextId ? 'pointer' : 'default'),
          }}
        />
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
