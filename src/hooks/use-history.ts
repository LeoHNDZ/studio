import { useCallback, useRef } from 'react';

export interface HistoryEntry<T> {
  state: T;
  reason?: string;
}

export interface HistoryController<T> {
  undo: () => T | null;
  redo: () => T | null;
  push: (state: T, reason?: string) => void;
  replaceTop: (state: T, reason?: string) => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  clear: () => void;
}

/**
 * A simple bounded history stack (present, past[], future[]).
 * push() records a new present and clears future.
 * undo() moves present to future and pops last past as new present.
 * redo() moves present to past and shifts first future as new present.
 */
export function useHistory<T>(max = 100): HistoryController<T> {
  const past = useRef<HistoryEntry<T>[]>([]);
  const present = useRef<HistoryEntry<T> | null>(null);
  const future = useRef<HistoryEntry<T>[]>([]);

  const push = useCallback((state: T, reason?: string) => {
    if (present.current) {
      past.current.push(present.current);
      if (past.current.length > max) {
        past.current.splice(0, past.current.length - max);
      }
    }
    present.current = { state, reason };
    future.current = [];
  }, [max]);

  const replaceTop = useCallback((state: T, reason?: string) => {
    if (present.current) {
      present.current = { state, reason };
    } else {
      push(state, reason);
    }
  }, [push]);

  const undo = useCallback((): T | null => {
    if (!past.current.length) return null;
    if (present.current) {
      future.current.unshift(present.current);
    }
    const entry = past.current.pop()!;
    present.current = entry;
    return entry.state;
  }, []);

  const redo = useCallback((): T | null => {
    if (!future.current.length) return null;
    if (present.current) {
      past.current.push(present.current);
    }
    const entry = future.current.shift()!;
    present.current = entry;
    return entry.state;
  }, []);

  const canUndo = useCallback(() => past.current.length > 0, []);
  const canRedo = useCallback(() => future.current.length > 0, []);
  const clear = useCallback(() => {
    past.current = [];
    present.current = null;
    future.current = [];
  }, []);

  return { undo, redo, push, replaceTop, canUndo, canRedo, clear };
}