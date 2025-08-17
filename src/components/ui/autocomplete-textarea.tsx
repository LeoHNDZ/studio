
import * as React from "react";
import { cn } from "@/lib/utils";
import { Textarea } from "./textarea";

type HistoryItem = { text: string; count: number; lastUsed: number };
export type AutocompleteSuggestion = { text: string, meta?: string };

class MemoryAutocomplete {
  private key: string;
  private maxHistory: number;
  private items: Map<string, HistoryItem> = new Map();
  private hasStorage = typeof window !== "undefined" && !!window.localStorage;

  constructor(opts?: { storageKey?: string; maxHistory?: number }) {
    this.key = `autocomplete:${opts?.storageKey ?? "history"}`;
    this.maxHistory = opts?.maxHistory ?? 50;
    this.load();
  }

  private load() {
    if (!this.hasStorage) return;
    try {
      const raw = window.localStorage.getItem(this.key);
      if (!raw) return;
      const arr: HistoryItem[] = JSON.parse(raw);
      this.items = new Map(arr.map((i) => [i.text, i]));
    } catch { /* ignore */ }
  }

  private save() {
    if (!this.hasStorage) return;
    try {
      const arr = Array.from(this.items.values())
        .sort((a, b) => b.lastUsed - a.lastUsed)
        .slice(0, this.maxHistory);
      window.localStorage.setItem(this.key, JSON.stringify(arr));
    } catch { /* ignore */ }
  }

  remember(text: string) {
    const t = text.trim();
    if (!t) return;
    const now = Date.now();
    const existing = this.items.get(t);
    if (existing) {
      existing.count += 1;
      existing.lastUsed = now;
    } else {
      this.items.set(t, { text: t, count: 1, lastUsed: now });
    }
    if (this.items.size > this.maxHistory) {
      const ordered = Array.from(this.items.values()).sort((a, b) => a.lastUsed - b.lastUsed);
      const toDelete = ordered.slice(0, this.items.size - this.maxHistory);
      for (const item of toDelete) {
        this.items.delete(item.text);
      }
    }
    this.save();
  }

  clear() {
    this.items.clear();
    this.save();
  }

  suggest(query: string, predefined: AutocompleteSuggestion[] = [], max: number = 8): AutocompleteSuggestion[] {
    const q = query.trim().toLowerCase();
    
    // Process history items
    const allHistory = Array.from(this.items.values());
    let historySuggestions: AutocompleteSuggestion[] = [];

    if (!q) {
      historySuggestions = allHistory
        .sort((a, b) => {
          if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
          return b.count - a.count;
        })
        .map(h => ({ text: h.text, meta: `Used x${h.count}`}));
    } else {
       historySuggestions = allHistory
        .filter((i) => i.text.toLowerCase().includes(q))
        .map((i) => ({ item: i, score: this.score(i, q) }))
        .sort((a, b) => b.score - a.score)
        .map((s) => ({ text: s.item.text, meta: `Used x${s.item.count}` }));
    }

    // Process predefined suggestions
    const predefinedSuggestions = predefined.filter(p => p.text.toLowerCase().includes(q));

    // Combine and deduplicate
    const combined = [...predefinedSuggestions, ...historySuggestions];
    const unique = Array.from(new Map(combined.map(item => [item.text, item])).values());
    
    return unique.slice(0, max);
}


  private score(i: HistoryItem, q: string): number {
    const text = i.text.toLowerCase();
    let base = 0;
    if (text.startsWith(q)) base += 100;
    else if (new RegExp(`(^|\\s)${escapeRegExp(q)}`).test(text)) base += 60;
    else if (text.includes(q)) base += 30;

    const freq = Math.log1p(i.count) * 20;
    const ageDays = (Date.now() - i.lastUsed) / (1000 * 60 * 60 * 24);
    const fresh = Math.max(0, 50 - ageDays);
    return base + freq + fresh;
  }
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

type AutocompleteProps = Omit<React.ComponentProps<typeof Textarea>, 'onSubmit'> & {
  storageKey?: string;
  maxSuggestions?: number;
  onSubmit?: (value: string) => void;
  rememberOnBlur?: boolean;
  suggestions?: AutocompleteSuggestion[];
};

export const AutocompleteTextarea = React.forwardRef<HTMLTextAreaElement, AutocompleteProps>(
  ({ id, placeholder, storageKey, maxSuggestions, className, value, onChange, onSubmit, rememberOnBlur = true, suggestions: predefinedSuggestions, ...props}, ref) => {
    const engine = React.useMemo(() => new MemoryAutocomplete({ storageKey }), [storageKey]);
    
    const [open, setOpen] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<AutocompleteSuggestion[]>([]);
    const [highlight, setHighlight] = React.useState<number>(-1);

    const wrapRef = React.useRef<HTMLDivElement>(null);
    const listboxId = (id ?? "ac") + "-listbox";

    const refresh = (q: string) => {
      const s = engine.suggest(q, predefinedSuggestions, maxSuggestions);
      setSuggestions(s);
      setOpen(s.length > 0);
      setHighlight(s.length ? 0 : -1);
    };

    React.useEffect(() => {
      const onDocClick = (e: MouseEvent) => {
        if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
      };
      document.addEventListener("mousedown", onDocClick);
      return () => document.removeEventListener("mousedown", onDocClick);
    }, []);

    const commit = (text: string) => {
      const t = text; // Don't trim for textarea
      if (onChange) {
        const event = {
          target: { value: t }
        } as React.ChangeEvent<HTMLTextAreaElement>;
        onChange(event);
      }
      engine.remember(t);
      setOpen(false);
      onSubmit?.(t);
    };
    
    const handleKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
      props.onKeyDown?.(e);
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        refresh(value as string); setOpen(true); return;
      }
      if (!open && e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSubmit?.(value as string);
        engine.remember(value as string);
        return;
      }
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (!e.shiftKey && highlight >= 0 && suggestions[highlight]) {
          e.preventDefault();
          commit(suggestions[highlight].text);
        } else if (e.key === "Enter" && !e.shiftKey) {
           e.preventDefault();
           onSubmit?.(value as string);
           engine.remember(value as string);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleChange: React.ChangeEventHandler<HTMLTextAreaElement> = (e) => {
      const v = e.target.value;
      if (onChange) {
        onChange(e);
      }
      refresh(v);
    };

    const handleFocus: React.FocusEventHandler<HTMLTextAreaElement> = (e) => {
      props.onFocus?.(e);
      refresh(value as string);
    };
    
    const handleBlur: React.FocusEventHandler<HTMLTextAreaElement> = (e) => {
      props.onBlur?.(e);
      if (rememberOnBlur && typeof value === 'string' && value.trim()) {
        engine.remember(value);
      }
      // onSubmit is now only called on Enter or explicit action, not blur
    };

    return (
      <div ref={wrapRef} className={cn("relative w-full h-full", className)}>
        <Textarea
          {...props}
          id={id}
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          spellCheck={false}
          className="w-full h-full"
        />
        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            role="listbox"
            className="ac-popover"
          >
            {suggestions.map((s, i) => {
              const isActive = i === highlight;
              return (
                <li
                  key={s.text}
                  id={`${listboxId}-opt-${i}`}
                  role="option"
                  aria-selected={isActive}
                  className={cn("ac-option", isActive && "is-active")}
                  onMouseEnter={() => setHighlight(i)}
                  onMouseDown={(e) => { e.preventDefault(); commit(s.text); }}
                >
                  <span className="ac-option-text">{s.text}</span>
                  {s.meta && <span className="ac-meta">{s.meta}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
});
AutocompleteTextarea.displayName = "AutocompleteTextarea";
