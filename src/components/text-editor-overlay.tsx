import React, { useMemo } from 'react';
import type { TextModel } from '@/types/text';
import { CanvasAutocomplete, type AutocompleteSuggestion } from '@/components/ui/canvas-autocomplete';

export interface TextEditorOverlayProps {
  editingText: TextModel;
  scale: number;
  pan: { x: number; y: number };
  onChange: (newValue: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  suggestions: AutocompleteSuggestion[];
  canvasRect?: DOMRect;
}

export function TextEditorOverlay({
  editingText,
  scale,
  pan,
  onChange,
  onCommit,
  onCancel,
  suggestions,
  canvasRect,
}: TextEditorOverlayProps) {
  // Calculate the transformed position of the text element
  const overlayStyle = useMemo((): React.CSSProperties => {
    if (!canvasRect) {
      return { display: 'none' };
    }

    // Transform canvas coordinates to screen coordinates
    const screenX = editingText.x * scale + pan.x;
    const screenY = editingText.y * scale + pan.y;

    // Position relative to the canvas
    const left = canvasRect.left + screenX;
    const top = canvasRect.top + screenY;

    return {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
      fontSize: `${editingText.fontSize * scale}px`,
      fontFamily: editingText.fontFamily,
      color: editingText.color,
      minWidth: '20px',
      minHeight: `${editingText.fontSize * scale}px`,
      lineHeight: `${(editingText.lineHeight || editingText.fontSize * 1.2) * scale}px`,
      zIndex: 1000,
      pointerEvents: 'auto',
    };
  }, [editingText, scale, pan, canvasRect]);

  const handleChange = (newValue: string) => {
    onChange(newValue);
  };

  return (
    <div style={overlayStyle}>
      <CanvasAutocomplete
        value={editingText.text}
        onChange={handleChange}
        onCommit={onCommit}
        onCancel={onCancel}
        suggestions={suggestions}
        placeholder="Type text..."
      />
    </div>
  );
}