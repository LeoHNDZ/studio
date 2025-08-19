
"use client";

import * as React from 'react';
import type { TextElement } from '@/lib/types';
import type { TextModel } from '@/types/text';
import { computeLayout } from '@/lib/text-layout';
import { TextEditorOverlay } from '@/components/text-editor-overlay';
import type { AutocompleteSuggestion } from '@/components/ui/canvas-autocomplete';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

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
  onDeleteText: (id: string) => void;
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

const DELETE_ICON_SIZE = 20; // in canvas pixels
const DELETE_ICON_PADDING = 5; // in canvas pixels
const RESIZE_HANDLE_SIZE = 10; // in canvas pixels

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
    onDeleteText,
    canvasWidth, 
    canvasHeight,
    pendingText,
    onTextAdd,
    onCompleteAddText,
   }, ref) => {
    const internalCanvasRef = React.useRef<HTMLCanvasElement>(null);
    const containerRef = React.useRef<HTMLDivElement>(null);
    const textEditorRef = React.useRef<HTMLDivElement>(null);
    const hasInitialized = React.useRef(false);
    
    const [draggingState, setDraggingState] = React.useState<{ id: string; offsetX: number; offsetY: number } | null>(null);
    const [resizingState, setResizingState] = React.useState<{ id: string; startFontSize: number; startY: number } | null>(null);
    const [contextMenu, setContextMenu] = React.useState<{ open: boolean; x: number; y: number, canvasX: number, canvasY: number } | null>(null);
    const [hoverResizeHandle, setHoverResizeHandle] = React.useState<boolean>(false);
    
    const viewStateRef = React.useRef({
      scale: 1,
      pan: { x: 0, y: 0 },
      isPanning: false,
      panStart: { x: 0, y: 0 },
    });

    const handleEditingFinish = React.useCallback(() => {
      if (editingTextId && editingText?.text.trim() === '') {
        onDeleteText(editingTextId);
      }
      setEditingTextId(null);
    }, [editingTextId, editingText, onDeleteText, setEditingTextId]);

    // Local phrases extractor (n-grams up to length 4)
    const extractPhrasesFromText = React.useCallback((raw: string) => {
      const phrases = new Set<string>();
      const words = raw
        .split(/\s+/)
        .map(w => w.trim())
        .filter(w => w.length > 0);

      for (let i = 0; i < words.length; i++) {
        for (let len = 1; len <= Math.min(4, words.length - i); len++) {
          const ngram = words.slice(i, i + len).join(' ');
          if (ngram.length >= 2) {
            phrases.add(ngram);
          }
        }
      }
      return phrases;
    }, []);

    // Cache fetched ticket phrases in a ref to avoid re-fetching across renders
    const ticketPhrasesRef = React.useRef<Set<string> | null>(null);

    // State to signal ticket fetch status (for future UI / telemetry)
    const [ticketsLoaded, setTicketsLoaded] = React.useState(false);

    // Fetch recent tickets (titles + body) in the background and extract phrases.
    React.useEffect(() => {
      let mounted = true;
      if (ticketPhrasesRef.current) {
        setTicketsLoaded(true);
        return;
      }

      // Non-blocking fetch
      (async () => {
        try {
          const res = await fetch('/api/tickets');
          if (!res.ok) throw new Error('failed to fetch tickets');
          const data = await res.json();

          // Expect data to be array of { id?: string, title?: string, body?: string }
          const allPhrases = new Set<string>();
          (data || []).forEach((t: any) => {
            if (t.title) {
              extractPhrasesFromText(t.title).forEach(p => allPhrases.add(p));
            }
            if (t.body) {
              extractPhrasesFromText(t.body).forEach(p => allPhrases.add(p));
            }
          });

          if (mounted) {
            ticketPhrasesRef.current = allPhrases;
            setTicketsLoaded(true);
          }
        } catch (err) {
          // fail silently; tickets are optional
          console.error('Could not load ticket phrases for autocomplete', err);
          if (mounted) setTicketsLoaded(true);
        }
      })();

      return () => { mounted = false; };
    }, [extractPhrasesFromText]);

    // Merge local phrases and ticket phrases, mark source, dedupe and rank
    const suggestions = React.useMemo((): AutocompleteSuggestion[] => {
      // Map phrase => metadata including count, most recent updated_at (for tickets), source, originId
      const phraseMap = new Map<string, { count: number; source: string; latestUpdatedAt?: number; originId?: string }>();

      // Add local phrases first
      texts.forEach(text => {
        extractPhrasesFromText(text.text).forEach(p => {
          const key = p;
          const prev = phraseMap.get(key);
          phraseMap.set(key, { count: (prev?.count || 0) + 1, source: 'local', latestUpdatedAt: prev?.latestUpdatedAt });
        });
      });

      // Add ticket phrases (if any). Note: ticketPhrasesRef currently stores only strings; in future we can store richer objects per phrase.
      if (ticketPhrasesRef.current) {
        ticketPhrasesRef.current.forEach(p => {
          const key = p;
          const prev = phraseMap.get(key);
          if (prev) {
            // If phrase already exists locally, increment count and keep local source
            phraseMap.set(key, { count: prev.count + 1, source: prev.source, latestUpdatedAt: prev.latestUpdatedAt });
          } else {
            // ticket-sourced phrase
            phraseMap.set(key, { count: 1, source: 'ticket' });
          }
        });
      }

      // Convert to suggestions array and compute a base score using frequency, recency and source
      const arr: AutocompleteSuggestion[] = Array.from(phraseMap.entries()).map(([value, meta]) => {
        // base score: frequency weight
        let score = Math.log(1 + meta.count) * 100;
        // source weight: prefer local phrases
        if (meta.source === 'local') score += 200;
        // recency: if latestUpdatedAt present, scale into [0..100]
        if (meta.latestUpdatedAt) {
          const ageMs = Date.now() - meta.latestUpdatedAt;
          const days = ageMs / (1000 * 60 * 60 * 24);
          score += Math.max(0, 80 - days); // more recent -> higher score
        }

        return {
          value,
          source: meta.source as any,
          originId: meta.originId,
          score,
        } as AutocompleteSuggestion;
      });

      // Final sort by base score desc, then longer phrases, then alphabetic
      arr.sort((a, b) => {
        const sa = a.score || 0;
        const sb = b.score || 0;
        if (sa !== sb) return sb - sa;
        if (a.value.split(' ').length !== b.value.split(' ').length) return b.value.split(' ').length - a.value.split(' ').length;
        return a.value.localeCompare(b.value);
      });

      return arr;
    }, [texts, extractPhrasesFromText, ticketsLoaded]);

    // Get canvas rect for overlay positioning
    const [canvasRect, setCanvasRect] = React.useState<DOMRect | undefined>();

    React.useEffect(() => {
      const updateCanvasRect = () => {
        if (internalCanvasRef.current) {
          setCanvasRect(internalCanvasRef.current.getBoundingClientRect());
        }
      };

      updateCanvasRect();
      
      // Update on resize or scroll
      const handleResize = () => updateCanvasRect();
      window.addEventListener('resize', handleResize);
      window.addEventListener('scroll', handleResize);
      
      return () => {
        window.removeEventListener('resize', handleResize);
        window.removeEventListener('scroll', handleResize);
      };
    }, []);

    // Update canvas rect when view state changes
    React.useEffect(() => {
      if (internalCanvasRef.current) {
        setCanvasRect(internalCanvasRef.current.getBoundingClientRect());
      }
    }, [viewStateRef.current.scale, viewStateRef.current.pan]);
    
    const handleEditingChange = React.useCallback((newValue: string) => {
      if (editingTextId) {
        onUpdateText(editingTextId, { text: newValue });
      }
    }, [editingTextId, onUpdateText]);

    const handleEditingCancel = React.useCallback(() => {
      setEditingTextId(null);
    }, []);
    
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

        // Draw background
        ctx.fillStyle = 'transparent';
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);

        if (backgroundImage) {
            const imgAspectRatio = backgroundImage.width / backgroundImage.height;
            const canvasAspectRatio = canvasWidth / canvasHeight;
            let drawWidth, drawHeight, x, y;

            if (imgAspectRatio > canvasAspectRatio) {
                // Image is wider, fit to canvas width
                drawWidth = canvasWidth;
                drawHeight = canvasWidth / imgAspectRatio;
                x = 0;
                y = (canvasHeight - drawHeight) / 2;
            } else {
                // Image is taller or same ratio, fit to canvas height
                drawHeight = canvasHeight;
                drawWidth = canvasHeight * imgAspectRatio;
                y = 0;
                x = (canvasWidth - drawWidth) / 2;
            }
            ctx.drawImage(backgroundImage, x, y, drawWidth, drawHeight);
        }
        
        // Convert texts to TextModels for layout computation
        const textModels: TextModel[] = texts.map(text => ({
          ...text,
          alignment: (text as any).alignment || 'left',
          lineHeight: (text as any).lineHeight || text.fontSize * 1.2,
        }));

        textModels.forEach((text) => {
            // Compute layout with caching
            const layout = computeLayout(text, ctx);
            
            ctx.font = `${text.fontSize}px ${text.fontFamily}`;
            if (text.id === editingTextId) {
                ctx.globalAlpha = 0.2;
            } else {
                 ctx.globalAlpha = 1;
            }
            ctx.fillStyle = text.color;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            
            // Render each line for multiline support
            layout.lines.forEach((line, lineIndex) => {
                const lineY = text.y + (lineIndex * layout.lineHeight);
                ctx.fillText(line, text.x, lineY);
            });
            
            ctx.globalAlpha = 1;

            if (text.id === selectedTextId && text.id !== editingTextId) {
                // Use layout dimensions for selection box
                const width = layout.width;
                const height = layout.height;

                // Bounding box
                ctx.strokeStyle = 'hsl(var(--ring))';
                ctx.lineWidth = 2 / scale;
                ctx.setLineDash([6 / scale, 3 / scale]);
                ctx.strokeRect(text.x - 4 / scale, text.y - 4 / scale, width + 8 / scale, height + 8 / scale);
                ctx.setLineDash([]);
                
                // Delete Icon
                const iconSize = DELETE_ICON_SIZE / scale;
                const padding = DELETE_ICON_PADDING / scale;
                const iconX = text.x + width + padding + 4 / scale;
                const iconY = text.y - padding - 4 / scale;

                // Circle background
                ctx.beginPath();
                ctx.arc(iconX + iconSize / 2, iconY + iconSize / 2, iconSize / 2, 0, 2 * Math.PI);
                ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
                ctx.fill();
                ctx.strokeStyle = 'hsl(var(--destructive))';
                ctx.lineWidth = 1.5 / scale;
                ctx.stroke();

                // "X" mark
                ctx.beginPath();
                const crossOffset = iconSize * 0.3;
                ctx.moveTo(iconX + crossOffset, iconY + crossOffset);
                ctx.lineTo(iconX + iconSize - crossOffset, iconY + iconSize - crossOffset);
                ctx.moveTo(iconX + iconSize - crossOffset, iconY + crossOffset);
                ctx.lineTo(iconX + crossOffset, iconY + iconSize - crossOffset);
                ctx.strokeStyle = 'hsl(var(--destructive))';
                ctx.lineWidth = 2 / scale;
                ctx.stroke();

                // Resize Handle (bottom-right corner)
                const handleSize = RESIZE_HANDLE_SIZE / scale;
                const handleX = text.x + width;
                const handleY = text.y + height;

                // Handle background
                ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
                ctx.fillRect(handleX, handleY, handleSize, handleSize);
                
                // Handle border
                ctx.strokeStyle = 'hsl(var(--primary))';
                ctx.lineWidth = 1.5 / scale;
                ctx.strokeRect(handleX, handleY, handleSize, handleSize);
                
                // Handle resize icon (small diagonal lines)
                ctx.beginPath();
                ctx.strokeStyle = 'hsl(var(--primary))';
                ctx.lineWidth = 1 / scale;
                const iconPadding = handleSize * 0.2;
                // Bottom line
                ctx.moveTo(handleX + iconPadding, handleY + handleSize - iconPadding);
                ctx.lineTo(handleX + handleSize - iconPadding, handleY + handleSize - iconPadding);
                // Right line
                ctx.moveTo(handleX + handleSize - iconPadding, handleY + iconPadding);
                ctx.lineTo(handleX + handleSize - iconPadding, handleY + handleSize - iconPadding);
                // Diagonal line
                ctx.moveTo(handleX + handleSize * 0.4, handleY + handleSize - iconPadding);
                ctx.lineTo(handleX + handleSize - iconPadding, handleY + handleSize * 0.4);
                ctx.stroke();
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
          
          ctx.clearRect(0, 0, canvasWidth, canvasHeight);

          if (withBackground && backgroundImage) {
              const imgAspectRatio = backgroundImage.width / backgroundImage.height;
              const canvasAspectRatio = canvasWidth / canvasHeight;
              let drawWidth, drawHeight, x, y;

              if (imgAspectRatio > canvasAspectRatio) {
                  drawWidth = canvasWidth;
                  drawHeight = canvasWidth / imgAspectRatio;
                  x = 0;
                  y = (canvasHeight - drawHeight) / 2;
              } else {
                  drawHeight = canvasHeight;
                  drawWidth = canvasHeight * imgAspectRatio;
                  y = 0;
                  x = (canvasWidth - drawWidth) / 2;
              }
              ctx.drawImage(backgroundImage, x, y, drawWidth, drawHeight);
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

    const hitTestResizeHandle = (x: number, y: number, text: TextElement, layout: { width: number; height: number }): boolean => {
      const { scale } = viewStateRef.current;
      const handleSize = RESIZE_HANDLE_SIZE / scale;
      
      // Resize handle is at bottom-right corner of text bounding box
      const handleX = text.x + layout.width;
      const handleY = text.y + layout.height;
      
      return x >= handleX && x <= handleX + handleSize && y >= handleY && y <= handleY + handleSize;
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
      
      // Check if resize handle was clicked
      if (selectedTextId) {
        const selected = texts.find(t => t.id === selectedTextId);
        if (selected && selected.id !== editingTextId) {
          // Convert to TextModel for layout computation
          const selectedModel: TextModel = {
            ...selected,
            alignment: (selected as any).alignment || 'left',
            lineHeight: (selected as any).lineHeight || selected.fontSize * 1.2,
          };
          
          const layout = computeLayout(selectedModel, ctx);
          
          if (hitTestResizeHandle(x, y, selected, layout)) {
            setResizingState({
              id: selected.id,
              startFontSize: selected.fontSize,
              startY: y,
            });
            return;
          }
        }
      }
      
      // Check if delete icon was clicked
      if (selectedTextId) {
        const selected = texts.find(t => t.id === selectedTextId);
        if (selected) {
          // Convert to TextModel for layout computation
          const selectedModel: TextModel = {
            ...selected,
            alignment: (selected as any).alignment || 'left',
            lineHeight: (selected as any).lineHeight || selected.fontSize * 1.2,
          };
          
          const layout = computeLayout(selectedModel, ctx);
          const width = layout.width;
          const { scale } = viewStateRef.current;
          
          const iconSize = DELETE_ICON_SIZE / scale;
          const padding = DELETE_ICON_PADDING / scale;
          const iconX = selected.x + width + padding + 4 / scale;
          const iconY = selected.y - padding - 4 / scale;

          if (x >= iconX && x <= iconX + iconSize && y >= iconY && y <= iconY + iconSize) {
            onDeleteText(selectedTextId);
            return;
          }
        }
      }

      if (pendingText) {
        onTextAdd(pendingText, { x, y });
        onCompleteAddText();
        return;
      }
      
      let hit = false;
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        // Convert to TextModel for layout computation
        const textModel: TextModel = {
          ...text,
          alignment: (text as any).alignment || 'left',
          lineHeight: (text as any).lineHeight || text.fontSize * 1.2,
        };
        
        const layout = computeLayout(textModel, ctx);
        const width = layout.width;
        const height = layout.height;
        
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

      // Handle resizing
      if (resizingState) {
        const selected = texts.find(t => t.id === resizingState.id);
        if (selected) {
          const deltaY = y - resizingState.startY;
          const newFontSize = Math.max(4, Math.round(resizingState.startFontSize + deltaY));
          
          onUpdateText(resizingState.id, { fontSize: newFontSize });
        }
        return;
      }

      if (viewStateRef.current.isPanning) {
        const { panStart, pan } = viewStateRef.current;
        const dx = clientX - panStart.x;
        const dy = clientY - panStart.y;
        viewStateRef.current.pan = { x: pan.x + dx, y: pan.y + dy };
        viewStateRef.current.panStart = { x: clientX, y: clientY };
        redrawCanvas();
        return;
      }
      
      if (draggingState) {
        setTexts((prev) =>
          prev.map((t) =>
            t.id === draggingState.id
              ? { ...t, x: x - draggingState.offsetX, y: y - draggingState.offsetY }
              : t
          )
        );
        return;
      }

      // Check for resize handle hover
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (ctx && selectedTextId) {
        const selected = texts.find(t => t.id === selectedTextId);
        if (selected && selected.id !== editingTextId) {
          const selectedModel: TextModel = {
            ...selected,
            alignment: (selected as any).alignment || 'left',
            lineHeight: (selected as any).lineHeight || selected.fontSize * 1.2,
          };
          
          const layout = computeLayout(selectedModel, ctx);
          const isHoveringHandle = hitTestResizeHandle(x, y, selected, layout);
          
          if (isHoveringHandle !== hoverResizeHandle) {
            setHoverResizeHandle(isHoveringHandle);
          }
        } else if (hoverResizeHandle) {
          setHoverResizeHandle(false);
        }
      } else if (hoverResizeHandle) {
        setHoverResizeHandle(false);
      }
    };

    const handleMouseUp = React.useCallback(() => {
        if (viewStateRef.current.isPanning) {
          viewStateRef.current.isPanning = false;
        }
        if (draggingState) {
          setDraggingState(null);
        }
        if (resizingState) {
          setResizingState(null);
        }
    }, [draggingState, resizingState]);

    const handleDoubleClick = (e: React.MouseEvent) => {
      const { x, y } = getTransformedMousePos(e);
      const ctx = internalCanvasRef.current?.getContext('2d');
      if (!ctx) return;

      let hit = null;
      for (let i = texts.length - 1; i >= 0; i--) {
        const text = texts[i];
        // Convert to TextModel for layout computation
        const textModel: TextModel = {
          ...text,
          alignment: (text as any).alignment || 'left',
          lineHeight: (text as any).lineHeight || text.fontSize * 1.2,
        };
        
        const layout = computeLayout(textModel, ctx);
        const width = layout.width;
        const height = layout.height;
        
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
      if (editingTextId) return;

      const { x, y, clientX, clientY } = getTransformedMousePos(e);
      setContextMenu({ open: true, x: clientX, y: clientY, canvasX: x, canvasY: y });
    }, [editingTextId]);


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

    // Outside click detection for text editing
    React.useEffect(() => {
        if (!editingTextId) return;

        const handleOutsideClick = (e: MouseEvent) => {
            // Check if click is outside the text editor overlay
            if (textEditorRef.current && !textEditorRef.current.contains(e.target as Node)) {
                handleEditingFinish();
            }
        };

        // Use capture phase to catch the event before it reaches other handlers
        document.addEventListener('mousedown', handleOutsideClick, true);
        
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick, true);
        };
    }, [editingTextId, handleEditingFinish]);

    const getCursorStyle = () => {
      if (pendingText) return 'crosshair';
      if (viewStateRef.current.isPanning || draggingState) return 'grabbing';
      if (resizingState) return 'nwse-resize';
      if (hoverResizeHandle) return 'nwse-resize';
      // Add cursor change for delete icon hover
      return 'default';
    }
    
    const onContextMenuSelect = (option: 'text' | 'date') => {
      if (!contextMenu) return;
      const { canvasX, canvasY } = contextMenu;
      
      let textToAdd = 'New Text';
      if (option === 'date') {
        textToAdd = new Date().toLocaleDateString();
      }
      
      onTextAdd(textToAdd, { x: canvasX, y: canvasY });
      setContextMenu(null);
    }

    return (
      <div 
        ref={containerRef} 
        className="w-full h-full rounded-lg bg-card/50 shadow-inner overflow-hidden flex justify-center items-center relative"
      >
        <DropdownMenu open={contextMenu?.open} onOpenChange={(open) => setContextMenu(prev => prev ? {...prev, open} : null)}>
            <DropdownMenuTrigger asChild>
                <div style={{ position: 'fixed', left: contextMenu?.x, top: contextMenu?.y }} />
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onClick={() => onContextMenuSelect('text')}>Add Text</DropdownMenuItem>
                <DropdownMenuItem onClick={() => onContextMenuSelect('date')}>Add Date</DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

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
          <TextEditorOverlay
            ref={textEditorRef}
            editingText={{
              ...editingText,
              alignment: (editingText as any).alignment || 'left',
              lineHeight: (editingText as any).lineHeight || editingText.fontSize * 1.2,
            }}
            scale={viewStateRef.current.scale}
            pan={viewStateRef.current.pan}
            onChange={handleEditingChange}
            onCommit={handleEditingFinish}
            onCancel={handleEditingCancel}
            suggestions={suggestions}
            canvasRect={canvasRect}
          />
        )}
      </div>
    );
  }
);
ComposerCanvas.displayName = 'ComposerCanvas';
