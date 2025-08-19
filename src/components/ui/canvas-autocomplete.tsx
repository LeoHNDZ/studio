import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';

export interface AutocompleteSuggestion {
  value: string;
  // friendly display label (optional). If not provided `value` is used.
  label?: string;
  // where this suggestion came from. 'local' = current composition, 'ticket' = other issues/tickets
  source?: 'local' | 'ticket' | string;
  // optional origin identifier (e.g. ticket id) for future UI/tooling
  originId?: string;
  // precomputed base score from the source corpus (optional)
  score?: number;
}

export interface CanvasAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  suggestions: AutocompleteSuggestion[];
  className?: string;
  style?: React.CSSProperties;
  placeholder?: string;
}

export function CanvasAutocomplete({
  value,
  onChange,
  onCommit,
  onCancel,
  suggestions,
  className,
  style,
  placeholder = 'Type text...',
}: CanvasAutocompleteProps) {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const suggestionRefs = useRef<(HTMLDivElement | null)[]>([]);

  // Filter and rank suggestions based on current input and suggestion base score.
  const filteredSuggestions = React.useMemo(() => {
    if (!value || value.length < 2) return [];

    const query = value.toLowerCase();

    // compute a match score for query relative to suggestion value
    const matchScore = (s: AutocompleteSuggestion) => {
      const v = s.value.toLowerCase();
      if (v === query) return 1000 + (s.score || 0); // exact match highest
      let score = s.score || 0;
      if (v.startsWith(query)) score += 500; // strong prefix match
      // token-level prefix (each token startsWith)
      const qTokens = query.split(/\s+/).filter(Boolean);
      const vTokens = v.split(/\s+/).filter(Boolean);
      const tokenPrefixMatches = qTokens.every((qt, i) => vTokens[i]?.startsWith(qt));
      if (tokenPrefixMatches) score += 200;
      if (v.includes(query)) score += 50; // weaker contains match
      // shorter suggestion (in chars) gets a tiny bonus to favor concise phrases
      score += Math.max(0, 20 - v.length * 0.2);
      return score;
    };

    return suggestions
      .filter(s => s.value.toLowerCase().includes(query) && s.value !== value)
      .map(s => ({ s, score: matchScore(s) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(x => x.s);
  }, [value, suggestions]);

  // Show/hide suggestions based on filtered results
  useEffect(() => {
    setShowSuggestions(filteredSuggestions.length > 0);
    setSelectedIndex(-1);
  }, [filteredSuggestions]);

  // Focus textarea on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.select();
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      if (showSuggestions) {
        setShowSuggestions(false);
        setSelectedIndex(-1);
      } else {
        onCancel();
      }
      return;
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      if (showSuggestions && selectedIndex >= 0) {
        // Apply selected suggestion
        onChange(filteredSuggestions[selectedIndex].value);
        setShowSuggestions(false);
        setSelectedIndex(-1);
      } else {
        onCommit();
      }
      return;
    }

    if (showSuggestions) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev < filteredSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }

      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : filteredSuggestions.length - 1
        );
        return;
      }

      if (e.key === 'Tab') {
        e.preventDefault();
        if (selectedIndex >= 0) {
          onChange(filteredSuggestions[selectedIndex].value);
          setShowSuggestions(false);
          setSelectedIndex(-1);
        }
        return;
      }
    }
  };

  const handleSuggestionClick = (suggestion: AutocompleteSuggestion) => {
    onChange(suggestion.value);
    setShowSuggestions(false);
    setSelectedIndex(-1);
    textareaRef.current?.focus();
  };

  // Scroll selected suggestion into view
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionRefs.current[selectedIndex]) {
      suggestionRefs.current[selectedIndex]?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      });
    }
  }, [selectedIndex]);

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        style={style}
        className={cn(
          'resize-none overflow-hidden p-0 m-0 border-ring focus:border-ring focus:ring-0',
          'bg-transparent',
          className
        )}
        rows={1}
      />
      
      {showSuggestions && (
        <div className="absolute top-full left-0 mt-1 min-w-[200px] max-w-[400px] z-50">
          <div className="rounded-md border bg-popover p-1 text-popover-foreground shadow-md">
            {filteredSuggestions.map((suggestion, index) => (
              <div
                key={suggestion.value}
                ref={el => { suggestionRefs.current[index] = el; }}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors',
                  'focus:bg-accent focus:text-accent-foreground',
                  selectedIndex === index
                    ? 'bg-accent text-accent-foreground'
                    : 'hover:bg-accent hover:text-accent-foreground'
                )}
                onClick={() => handleSuggestionClick(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="truncate">
                  {suggestion.label || suggestion.value}
                </span>
                {/* subtle source badge */}
                {suggestion.source && suggestion.source !== 'local' && (
                  <span className="ml-2 text-xs text-muted-foreground lowercase pl-2 border-l border-border">
                    {suggestion.source}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}