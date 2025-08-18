import { useState, useCallback, useMemo, useEffect } from 'react';
import type { TextElement } from '@/lib/types';
import type { TextModel } from '@/types/text';
import { invalidateLayout } from '@/lib/text-layout';
import { makeSnapshot } from '@/lib/serialize-texts';
import type { HistoryController } from './use-history';

export interface TextStoreOperations {
  addText: (text: string, options?: Partial<Omit<TextElement, 'id' | 'text'>>) => string;
  updateText: (id: string, newProps: Partial<TextElement>, opts?: { skipHistory?: boolean }) => void;
  deleteText: (id: string) => void;
  selectText: (id: string | null) => void;
  startEditing: (id: string) => void;
  finishEditing: () => void;
  cancelEditing: () => void;
  undo: () => void;
  redo: () => void;
}

export interface TextStoreState {
  selectedId: string | null;
  editingId: string | null;
  selectedText: TextModel | null;
  editingText: TextModel | null;
  canUndo: boolean;
  canRedo: boolean;
}

export interface UseTextStoreOptions {
  texts: TextElement[];
  onUpdateTexts: (texts: TextElement[]) => void;
  history?: HistoryController<{ texts: TextElement[]; selectedId: string | null; }>;
  autoSnapshot?: boolean; // default true
}

export function useTextStore({ texts, onUpdateTexts, history, autoSnapshot = true }: UseTextStoreOptions) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [initialized, setInitialized] = useState(false);

  // Push initial snapshot once (after first non-empty mount OR immediately if already have texts)
  useEffect(() => {
    if (!history || !autoSnapshot || initialized) return;
    history.push(makeSnapshot(texts, selectedId), 'init');
    setInitialized(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history, autoSnapshot, initialized]);

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
    if (autoSnapshot && history) {
      history.push(makeSnapshot(newTexts, newText.id), 'add');
    }
    setSelectedId(newText.id);
    return newText.id;
  }, [texts, onUpdateTexts, history, autoSnapshot]);

  const updateText = useCallback((id: string, newProps: Partial<TextElement>, opts?: { skipHistory?: boolean }) => {
    const newTexts = texts.map(t => {
      if (t.id === id) {
        const updated = { ...t, ...newProps };
        const { _layout, _layoutVersion, ...cleanProps } = updated as any; // strip transient
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

    if (autoSnapshot && history && !opts?.skipHistory) {
      history.push(makeSnapshot(newTexts, selectedId), 'update');
    }
  }, [texts, textModels, onUpdateTexts, history, autoSnapshot, selectedId]);

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
    if (autoSnapshot && history) {
      history.push(makeSnapshot(newTexts, null), 'delete');
    }
  }, [texts, selectedId, editingId, onUpdateTexts, history, autoSnapshot]);

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
    } else if (editingId && autoSnapshot && history) {
      history.push(makeSnapshot(texts, editingId), 'finish-edit');
    }
    setEditingId(null);
  }, [editingId, editingText, deleteText, history, autoSnapshot, texts]);

  const cancelEditing = useCallback(() => {
    setEditingId(null);
  }, []);

  const undo = useCallback(() => {
    if (!history) return;
    const prev = history.undo();
    if (!prev) return;
    onUpdateTexts(prev.texts);
    setSelectedId(prev.selectedId);
    setEditingId(null);
  }, [history, onUpdateTexts]);

  const redo = useCallback(() => {
    if (!history) return;
    const next = history.redo();
    if (!next) return;
    onUpdateTexts(next.texts);
    setSelectedId(next.selectedId);
    setEditingId(null);
  }, [history, onUpdateTexts]);

  const operations: TextStoreOperations = {
    addText,
    updateText,
    deleteText,
    selectText,
    startEditing,
    finishEditing,
    cancelEditing,
    undo,
    redo,
  };

  const state: TextStoreState = {
    selectedId,
    editingId,
    selectedText,
    editingText,
    canUndo: !!history?.canUndo(),
    canRedo: !!history?.canRedo(),
  };

  return {
    ...operations,
    ...state,
    texts: textModels,
  };
}