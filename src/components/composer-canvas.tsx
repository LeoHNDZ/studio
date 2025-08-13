
"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';

interface ComposerCanvasProps {
  backgroundImage: HTMLImageElement | null;
  texts: TextElement[];
  setTexts: React.Dispatch<React.SetStateAction<TextElement[]>>;
  selectedTextId: string | null;
  setSelectedTextId: (id: string | null) => void;
  editingText: TextElement | null;
  editingTextId: string | null;
  setEditingTextId: (id: string | null) => void;
  onUpdateText: (id: string, newProps: Partial<TextElement>) => void;
  canvasWidth: number;
  canvasHeight: number;
  pendingText: string | null;
  onTextAdd: (text: string, options: Partial<Omit<TextElement, 'id' | 'text'>>) => void;
  onCompleteAddText: () => void;
}

export interface ComposerCanvasHandle {
  getCanvas: (withBackground?: boolean) => HTMLCanvasElement | null;
  resetView: () => void;
}


export const ComposerCanvas = React.forwardRef<ComposerCanvasHandle, ComposerCanvasProps>(
  ({ 
    backgroundImage, 
    texts, 
    setTexts, 
    selectedTextId, 
    setSelectedTextId,
    editingText,
    editingTextId,
    setEditingTextId,
    onUpdateText,
    canvasWidth, 
    canvasHeight,
    pendingText,
    onTextAdd,
    onCompleteAddText,
   }, ref) => {
    const internalCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const hasInitialized = React.useRef(false);
    const textareaRef = React.useRef<HTMLTextAreaElement>(null);

    const [draggingState, setDraggingState] = React.useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    
    const viewStateRef = React.useRef({
      scale: 1,
      pan: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
    });
    
    const redrawCanvas = React.useCallback(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas || !containerRef.current) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const { scale, pan } = viewStateRef.current;
        
        canvas.width = containerRef.current.clientWidth;
        canvas.height = containerRef.current.clientHeight;
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        ctx.translate(pan.x, pan.y);
        ctx.scale(scale, scale);

        if (backgroundImage) {
            ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
        } else {
            ctx.fillStyle = '#f3f4f6';
            ctx.fillRect(0, 0, canvasWidth, canvasHeight);
        }
        
        texts.forEach((text) => {
          if (text.id === editingTextId) return; // Don't draw text being edited

            ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            ctx.fillStyle = text.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(text.text, text.x, text.y);

            if (text.id === selectedTextId) {
                ctx.font = `${text.fontSize}px ${text.fontFamily}`;
                const metrics = ctx.measureText(text.text);
                const width = metrics.width;
                const height = text.fontSize;

                ctx.strokeStyle = 'hsl(var(--ring))';
                ctx.lineWidth = 2 / scale;
                ctx.setLineDash([6 / scale, 3 / scale]);
                ctx.strokeRect(text.x - 4 / scale, text.y - 4 / scale, width + 8 / scale, height + 8 / scale);
                ctx.setLineDash([]);
            }
        });

        ctx.restore();
    }, [backgroundImage, texts, selectedTextId, editingTextId, canvasWidth, canvasHeight]);
    
    const resetView = React.useCallback(() => {
        const container = containerRef.current;
        if (!container || !canvasWidth || !canvasHeight) return;

        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95; 

        const panX = (containerWidth - (canvasWidth * scale)) / 2;
        const panY = (containerHeight - (canvasHeight * scale)) / 2;
        
        viewStateRef.current = {
            ...viewStateRef.current,
            scale: scale,
            pan: { x: panX, y: panY },
        };
        redrawCanvas();
    }, [canvasWidth, canvasHeight, redrawCanvas]);

     React.useImperativeHandle(ref, () => ({
        getCanvas: (withBackground = true) => {
          if (!canvasWidth || !canvasHeight) return null;
          
          const exportCanvas = document.createElement('canvas');
          exportCanvas.width = canvasWidth;
          exportCanvas.height = canvasHeight;
          const ctx = exportCanvas.getContext('2d');
          if (!ctx) return null;
          
          if (withBackground && backgroundImage) {
              ctx.drawImage(backgroundImage, 0, 0, canvasWidth, canvasHeight);
          } else if (!withBackground) {
              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, canvasWidth, canvasHeight);
          } else {
              // transparent background for export if no image
          }


          texts.forEach((text) => {
              ctx.font = `${text.fontSize}px ${text.fontFamily}`;
              ctx.fillStyle = text.color;
              ctx.textAlign = 'left';
              ctx.textBaseline = 'top';
              ctx.fillText(text.text, text.x, text.y);
          });
          
          return exportCanvas;
        },
        resetView,
     }));

    const initializeView = React.useCallback(() => {
        const container = containerRef.current;
        if (!container || !canvasWidth || !canvasHeight || hasInitialized.current) return;
        
        hasInitialized.current = true;
        const containerWidth = container.clientWidth;
        const containerHeight = container.clientHeight;

        const scaleX = containerWidth / canvasWidth;
        const scaleY = containerHeight / canvasHeight;
        const scale = Math.min(scaleX, scaleY) * 0.95;

        const panX = (containerWidth - (canvasWidth * scale)) / 2;
        const panY = (containerHeight - (canvasHeight * scale)) / 2;

        viewStateRef.current = {
            scale: scale,
            pan: { x: panX, y: panY },
            isPanning: false,
            panStart: { x: 0, y: 0 },
        };
        redrawCanvas();
    }, [canvasWidth, canvasHeight, redrawCanvas]);


    React.useEffect(() => {
        if (canvasWidth > 0 && canvasHeight > 0) {
            initializeView();
        }
    }, [initializeView, canvasWidth, canvasHeight]);
    
    React.useEffect(() => {
        const container = containerRef.current;
        if (!container) return;
        const resizeObserver = new ResizeObserver(() => redrawCanvas());
        resizeObserver.observe(container);
        return () => resizeObserver.disconnect();
    }, [redrawCanvas]);


    const getTransformedMousePos = (e: MouseEvent | React.MouseEvent | React.TouchEvent | React.WheelEvent) => {
      const canvas = internalCanvasRef.current;
      if (!canvas) return { x: 0, y: 0, clientX: 0, clientY: 0 };
      const rect = canvas.getBoundingClientRect();
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      
      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      
      const { scale, pan } = viewStateRef.current;
      
      const transformedX = (canvasX - pan.x) / scale;
      const transformedY = (canvasY - pan.y) / scale;
      
      return { x: transformedX, y: transformedY, clientX, clientY };
    };

    const handleMouseDown = (e: React.MouseEvent | React.TouchEvent) => {
      if (editingTextId) return;
      if ('button' in e && e.button === 2) {
        // This is a right click, handled by onContextMenu
        return;
      }
      e.preventDefault();
      const { x, y, clientX, clientY } = getTransformedMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      
      if (pendingText) {
        onTextAdd(pendingText, { x, y });
        onCompleteAddText();
        return;
      }
      
      let hit = false;
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        const metrics = ctx.measureText(text.text);
        const width = metrics.width;
        const height = text.fontSize;
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
        viewStateRef.current.isPanning = true;
        viewStateRef.current.panStart = { x: clientX, y: clientY };
      }
    };

    const handleMouseMove = (e: React.MouseEvent | React.TouchEvent) => {
      e.preventDefault();
      const { x, y, clientX, clientY } = getTransformedMousePos(e);

      if (viewStateRef.current.isPanning) {
        const { panStart, pan } = viewStateRef.current;
        const dx = clientX - panStart.x;
        const dy = clientY - panStart.y;
        viewStateRef.current.pan = { x: pan.x + dx, y: pan.y + dy };
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

    const handleDoubleClick = (e: React.MouseEvent) => {
      const { x, y } = getTransformedMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;

      let hit = null;
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        ctx.font = `${text.fontSize}px ${text.fontFamily}`;
        const metrics = ctx.measureText(text.text);
        const width = metrics.width;
        const height = text.fontSize;
        if (x >= text.x && x <= text.x + width && y >= text.y && y <= text.y + height) {
          hit = text.id;
          break;
        }
      }
      
      if (hit) {
        setEditingTextId(hit);
        setSelectedTextId(hit);
      }
    };

    const handleEditingFinish = () => {
      setEditingTextId(null);
    };

    const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        handleEditingFinish();
        internalCanvasRef.current?.focus();
      }
    };

    React.useEffect(() => {
      if (editingTextId && textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.select();
      }
    }, [editingTextId]);


    const handleWheel = React.useCallback((e: WheelEvent) => {
      e.preventDefault();
      const canvas = internalCanvasRef.current;
      if (!canvas) return;

      const rect = canvas.getBoundingClientRect();
      
      const clientX = e.clientX;
      const clientY = e.clientY;

      const canvasX = clientX - rect.left;
      const canvasY = clientY - rect.top;
      
      const mouseX = (canvasX - viewStateRef.current.pan.x) / viewStateRef.current.scale;
      const mouseY = (canvasY - viewStateRef.current.pan.y) / viewStateRef.current.scale;

      const zoomFactor = 1.1;
      const { scale } = viewStateRef.current;
      const newScale = e.deltaY < 0 ? scale * zoomFactor : scale / zoomFactor;
      
      const newPanX = viewStateRef.current.pan.x - (mouseX * (newScale - scale));
      const newPanY = viewStateRef.current.pan.y - (mouseY * (newScale - scale));

      viewStateRef.current.scale = newScale;
      viewStateRef.current.pan = {x: newPanX, y: newPanY};
      
      redrawCanvas();
    }, [redrawCanvas]);

    const handleContextMenu = React.useCallback((e: MouseEvent) => {
      e.preventDefault();
      if(editingTextId) return;
      const { x, y } = getTransformedMousePos(e);
      onTextAdd('New Text', { x, y });
    }, [onTextAdd, editingTextId]);

    React.useEffect(() => {
        redrawCanvas();
    }, [texts, selectedTextId, backgroundImage, redrawCanvas]);

    React.useEffect(() => {
        const canvas = internalCanvasRef.current;
        if (!canvas) return;
        
        canvas.addEventListener('contextmenu', handleContextMenu);
        canvas.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('mouseup', handleMouseUp);
        window.addEventListener('touchend', handleMouseUp);
        
        return () => {
            canvas.removeEventListener('contextmenu', handleContextMenu);
            canvas.removeEventListener('wheel', handleWheel);
            window.removeEventListener('mouseup', handleMouseUp);
            window.removeEventListener('touchend', handleMouseUp);
        }
    }, [handleWheel, handleMouseUp, handleContextMenu]);

    const getCursorStyle = () => {
      if (pendingText) return 'crosshair';
      if (viewStateRef.current.isPanning || draggingState) return 'grabbing';
      if (selectedTextId && !editingTextId) return 'pointer';
      return 'default';
    }

    const calculateTextareaStyle = (): React.CSSProperties => {
      if (!editingText) return { display: 'none' };
      
      const { scale, pan } = viewStateRef.current;
      const canvas = internalCanvasRef.current;
      if(!canvas) return { display: 'none' };

      const rect = canvas.getBoundingClientRect();

      const tempCtx = document.createElement('canvas').getContext('2d');
      if(!tempCtx) return { display: 'none' };
      tempCtx.font = `${editingText.fontSize * scale}px ${editingText.fontFamily}`;
      const metrics = tempCtx.measureText(editingText.text);
      const textWidth = metrics.width;
      
      return {
        position: 'absolute',
        top: `${rect.top + pan.y + (editingText.y * scale)}px`,
        left: `${rect.left + pan.x + (editingText.x * scale)}px`,
        width: `${textWidth + 20 * scale}px`,
        height: 'auto',
        minHeight: `${editingText.fontSize * scale * 1.2}px`,
        background: 'rgba(255, 255, 255, 0.9)',
        border: `1px solid hsl(var(--ring))`,
        outline: 'none',
        padding: '0',
        margin: '0',
        font: `${editingText.fontSize * scale}px ${editingText.fontFamily}`,
        color: editingText.color,
        transformOrigin: 'top left',
        resize: 'none',
        overflow: 'hidden',
        lineHeight: '1.2',
        whiteSpace: 'pre-wrap',
        zIndex: 100,
      };
    };

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg bg-card shadow-inner overflow-hidden flex justify-center items-center relative"
      >
        <canvas
          ref={internalCanvasRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleMouseDown}
          onTouchMove={handleMouseMove}
          onDoubleClick={handleDoubleClick}
          className="touch-none"
          style={{ cursor: getCursorStyle() }}
        />
        {editingTextId && editingText && (
          <textarea
            ref={textareaRef}
            value={editingText.text}
            onChange={(e) => onUpdateText(editingTextId, { text: e.target.value })}
            onBlur={handleEditingFinish}
            onKeyDown={handleTextareaKeyDown}
            style={calculateTextareaStyle()}
          />
        )}
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
