import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useHistory } from '@/hooks/use-history';

describe('useHistory', () => {
  it('should initialize with empty history', () => {
    const { result } = renderHook(() => useHistory<string>());
    
    expect(result.current.canUndo()).toBe(false);
    expect(result.current.canRedo()).toBe(false);
  });

  it('should push and undo states correctly', () => {
    const { result } = renderHook(() => useHistory<string>());
    
    act(() => {
      result.current.push('first', 'initial');
      result.current.push('second', 'update');
    });
    
    expect(result.current.canUndo()).toBe(true);
    expect(result.current.canRedo()).toBe(false);
    
    let undoResult: string | null = null;
    act(() => {
      undoResult = result.current.undo();
    });
    
    expect(undoResult).toBe('first');
    expect(result.current.canUndo()).toBe(false);
    expect(result.current.canRedo()).toBe(true);
  });

  it('should redo states correctly', () => {
    const { result } = renderHook(() => useHistory<string>());
    
    act(() => {
      result.current.push('first', 'initial');
      result.current.push('second', 'update');
      result.current.undo();
    });
    
    let redoResult: string | null = null;
    act(() => {
      redoResult = result.current.redo();
    });
    
    expect(redoResult).toBe('second');
    expect(result.current.canUndo()).toBe(true);
    expect(result.current.canRedo()).toBe(false);
  });

  it('should respect max history limit', () => {
    const { result } = renderHook(() => useHistory<string>(2));
    
    act(() => {
      result.current.push('first');
      result.current.push('second'); 
      result.current.push('third');
      result.current.push('fourth'); // should evict 'first'
    });
    
    // Should only be able to undo 2 times (to 'third', then 'second')
    act(() => {
      result.current.undo(); // back to 'third'
      result.current.undo(); // back to 'second'  
    });
    
    expect(result.current.canUndo()).toBe(false); // can't go back to 'first'
  });

  it('should clear future when pushing after undo', () => {
    const { result } = renderHook(() => useHistory<string>());
    
    act(() => {
      result.current.push('first');
      result.current.push('second');
      result.current.push('third');
      result.current.undo(); // back to 'second'
      result.current.undo(); // back to 'first'
    });
    
    expect(result.current.canRedo()).toBe(true);
    
    act(() => {
      result.current.push('new-branch'); // should clear future
    });
    
    expect(result.current.canRedo()).toBe(false);
  });
});