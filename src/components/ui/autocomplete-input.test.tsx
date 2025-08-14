import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { AutocompleteInput } from './autocomplete-input';

describe('AutocompleteInput', () => {
  beforeEach(() => {
    localStorage.clear();
    (HTMLCanvasElement.prototype as any).getContext = () => ({
      measureText: () => ({ width: 0 }),
    });
  });

  afterEach(() => {
    cleanup();
  });

  it('displays suggestions from localStorage and selects with keyboard', () => {
    localStorage.setItem('autocomplete:test', JSON.stringify(['alpha', 'beta']));
    render(<AutocompleteInput storageKey="test" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'a' } });
    const option = screen.getByText('alpha');
    expect(option).toBeTruthy();
    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });
    expect((input as HTMLInputElement).value).toBe('alpha');
  });

  it('allows selecting suggestion with mouse', () => {
    localStorage.setItem('autocomplete:mouse', JSON.stringify(['cat']));
    render(<AutocompleteInput storageKey="mouse" />);
    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'c' } });
    const option = screen.getByText('cat');
    fireEvent.mouseDown(option);
    expect((input as HTMLInputElement).value).toBe('cat');
  });
});
