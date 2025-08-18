import { useState, useCallback } from 'react';
import type { TextElement } from '@/lib/types';

// State shape stored in history
export interface HistoryState {
  texts: TextElement[];
  selectedId?: string;
}

// Optional metadata for history entries
export interface HistoryMeta {
  description?: string;
  timestamp?: number;
}

export interface UseHistoryOptions {
  maxSize?: number;
}

export interface UseHistoryReturn {
  // Current state
  present: HistoryState | null;
  
  // History navigation
  canUndo: boolean;
  canRedo: boolean;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  
  // History management
  push: (state: HistoryState, meta?: HistoryMeta) => void;
  pushReplace: (state: HistoryState, meta?: HistoryMeta) => void; // Replace current without growing history
  clear: () => void;
  
  // Utility
  serializeTexts: (texts: TextElement[]) => TextElement[];
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const { maxSize = 100 } = options;
  
  const [past, setPast] = useState<HistoryState[]>([]);
  const [present, setPresent] = useState<HistoryState | null>(null);
  const [future, setFuture] = useState<HistoryState[]>([]);
  
  // Remove ephemeral fields from texts for lighter history snapshots
  const serializeTexts = useCallback((texts: TextElement[]): TextElement[] => {
    return texts.map(text => {
      // Remove any ephemeral fields like _layout if they exist
      const { ...serializedText } = text;
      return serializedText;
    });
  }, []);
  
  const push = useCallback((state: HistoryState, meta?: HistoryMeta) => {
    const serializedState: HistoryState = {
      ...state,
      texts: serializeTexts(state.texts),
    };
    
    setPast(prev => {
      const newPast = present ? [...prev, present] : prev;
      // Enforce max size
      return newPast.length >= maxSize ? newPast.slice(1) : newPast;
    });
    setPresent(serializedState);
    setFuture([]); // Clear future when new state is pushed
  }, [present, maxSize, serializeTexts]);
  
  const pushReplace = useCallback((state: HistoryState, meta?: HistoryMeta) => {
    const serializedState: HistoryState = {
      ...state,
      texts: serializeTexts(state.texts),
    };
    
    setPresent(serializedState);
    // Don't modify past or future - just replace current
  }, [serializeTexts]);
  
  const undo = useCallback(() => {
    if (past.length === 0) return null;
    
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setPast(newPast);
    setFuture(prev => present ? [present, ...prev] : prev);
    setPresent(previous);
    
    return previous;
  }, [past, present]);
  
  const redo = useCallback(() => {
    if (future.length === 0) return null;
    
    const next = future[0];
    const newFuture = future.slice(1);
    
    setFuture(newFuture);
    setPast(prev => present ? [...prev, present] : prev);
    setPresent(next);
    
    return next;
  }, [future, present]);
  
  const clear = useCallback(() => {
    setPast([]);
    setPresent(null);
    setFuture([]);
  }, []);
  
  return {
    present,
    canUndo: past.length > 0,
    canRedo: future.length > 0,
    undo,
    redo,
    push,
    pushReplace,
    clear,
    serializeTexts,
  };
}