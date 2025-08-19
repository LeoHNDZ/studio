import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { CanvasAutocomplete, AutocompleteSuggestion } from '../canvas-autocomplete';

describe('CanvasAutocomplete', () => {
  const mockProps = {
    value: 'test',
    onChange: vi.fn(),
    onCommit: vi.fn(),
    onCancel: vi.fn(),
    suggestions: [
      {
        value: 'test suggestion',
        label: 'Test Label',
        source: 'ticket' as const,
        originId: '123'
      },
      {
        value: 'another test',
        source: 'local' as const
      },
      {
        value: 'third test',
        label: 'Third Label'
      }
    ] as AutocompleteSuggestion[],
  };

  it('should render only suggestion values without labels or source badges', () => {
    const { container } = render(<CanvasAutocomplete {...mockProps} />);
    
    // Should display suggestion.value, not suggestion.label
    expect(screen.getByText('test suggestion')).toBeDefined();
    expect(screen.getByText('another test')).toBeDefined();
    expect(screen.getByText('third test')).toBeDefined();
    
    // Should NOT display labels
    expect(screen.queryByText('Test Label')).toBeNull();
    expect(screen.queryByText('Third Label')).toBeNull();
    
    // Should NOT display source badges
    expect(container.innerHTML).not.toContain('ticket');
    expect(container.innerHTML).not.toContain('#123');
  });
});