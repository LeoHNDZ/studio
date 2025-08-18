import { useState, useCallback, useMemo } from 'react';
import type { TextElement } from '@/lib/types';
import type { TextModel } from '@/types/text';
import { invalidateLayout } from '@/lib/text-layout';

export interface TextStoreOperations {
  addText: (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => string;
  updateText: (id: string, newProps: Partial<TextElement>) => void;
  deleteText: (id: string) => void;
  selectText: (id: string | null) => void;
  startEditing: (id: string) => void;
  finishEditing: () => void;
  cancelEditing: () => void;
}

export interface TextStoreState {
  selectedId: string | null;
  editingId: string | null;
  selectedText: TextModel | null;
  editingText: TextModel | null;
}

export interface UseTextStoreOptions {
  texts: TextElement[];
  onUpdateTexts: (texts: TextElement[]) => void;
}

export function useTextStore({ texts, onUpdateTexts }: UseTextStoreOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);

  // Convert TextElement[] to TextModel[] (add optional fields)
  const textModels = useMemo((): TextModel[] => {
    return texts.map(text => ({
      ...text,
      alignment: (text as any).alignment || 'left',
      lineHeight: (text as any).lineHeight || text.fontSize * 1.2,
    } as TextModel));
  }, [texts]);

  // Derived state
  const selectedText = useMemo(() => {
    return selectedId ? textModels.find(t => t.id === selectedId) || null : null;
  }, [selectedId, textModels]);

  const editingText = useMemo(() => {
    return editingId ? textModels.find(t => t.id === editingId) || null : null;
  }, [editingId, textModels]);

  // Operations
  const addText = useCallback((text: string, options: Partial<Omit<TextElement, 'id' | 'text'>> = {}): string => {
    const { nanoid } = require('nanoid');
    const newText: TextElement = {
      id: nanoid(),
      text,
      x: options.x ?? 100,
      y: options.y ?? 100,
      fontSize: options.fontSize ?? 47,
      fontFamily: options.fontFamily ?? 'Inter',
      color: options.color ?? '#000000',
      ...options,
    };
    
    const newTexts = [...texts, newText];
    onUpdateTexts(newTexts);
    return newText.id;
  }, [texts, onUpdateTexts]);

  const updateText = useCallback((id: string, newProps: Partial<TextElement>) => {
    const newTexts = texts.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...newProps };
        // Strip private fields before updating ticket
        const { _layout, _layoutVersion, ...cleanProps } = updated as any;
        return cleanProps;
      }
      return t;
    });
    
    // Invalidate layout for the updated text
    const textModel = textModels.find(t => t.id === id);
    if (textModel) {
      invalidateLayout(textModel);
    }
    
    onUpdateTexts(newTexts);
  }, [texts, textModels, onUpdateTexts]);

  const deleteText = useCallback((id: string) => {
    const newTexts = texts.filter(t => t.id !== id);
    onUpdateTexts(newTexts);
    
    // Clear selection/editing if deleted text was selected/editing
    if (selectedId === id) {
      setSelectedId(null);
    }
    if (editingId === id) {
      setEditingId(null);
    }
  }, [texts, selectedId, editingId, onUpdateTexts]);

  const selectText = useCallback((id: string | null) => {
    setSelectedId(id);
  }, []);

  const startEditing = useCallback((id: string) => {
    setEditingId(id);
    setSelectedId(id);
  }, []);

  const finishEditing = useCallback(() => {
    // Delete text if it's empty
    if (editingId && editingText?.text.trim() === '') {
      deleteText(editingId);
    }
    setEditingId(null);
  }, [editingId, editingText, deleteText]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const operations: TextStoreOperations = {
    addText,
    updateText,
    deleteText,
    selectText,
    startEditing,
    finishEditing,
    cancelEditing,
  };

  const state: TextStoreState = {
    selectedId,
    editingId,
    selectedText,
    editingText,
  };

  return {
    ...operations,
    ...state,
    texts: textModels,
  };
}