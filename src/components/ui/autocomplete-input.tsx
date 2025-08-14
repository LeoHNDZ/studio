
import * as React from "react";
import { cn } from "@/lib/utils";
import { Input } from "./input";

type HistoryItem = { text: string; count: number; lastUsed: number };

class MemoryAutocomplete {
  private key: string;
  private maxHistory: number;
  private items: Map<string, HistoryItem> = new Map();
  private hasStorage = typeof window !== "undefined" && !!window.localStorage;

  constructor(opts?: { storageKey?: string; maxHistory?: number }) {
    this.key = opts?.storageKey ?? "autocomplete.history";
    this.maxHistory = opts?.maxHistory ?? 500;
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
    // Enforce cap
    if (this.items.size > this.maxHistory) {
      const overshoot = this.items.size - this.maxHistory;
      const ordered = Array.from(this.items.values()).sort(
        (a, b) => a.lastUsed - b.lastUsed
      );
      for (let i = 0; i < overshoot; i++) this.items.delete(ordered[i].text);
    }
    this.save();
  }

  clear() {
    this.items.clear();
    this.save();
  }

  suggest(query: string, max: number = 8): HistoryItem[] {
    const q = query.trim().toLowerCase();
    const all = Array.from(this.items.values());
    if (!q) {
      return all
        .sort((a, b) => {
          if (b.lastUsed !== a.lastUsed) return b.lastUsed - a.lastUsed;
          return b.count - a.count;
        })
        .slice(0, max);
    }
    const scored = all
      .filter((i) => i.text.toLowerCase().includes(q))
      .map((i) => ({ item: i, score: this.score(i, q) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, max)
      .map((s) => s.item);
    return scored;
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

type AutocompleteProps = Omit<React.ComponentProps<typeof Input>, 'onSubmit' | 'value' | 'defaultValue'> & {
  storageKey?: string;
  maxSuggestions?: number;
  value?: string;
  defaultValue?: string;
  onSubmit?: (value: string) => void;
  rememberOnBlur?: boolean;
};

export const AutocompleteInput = React.forwardRef<HTMLInputElement, AutocompleteProps>(
  ({ id, placeholder, storageKey, maxSuggestions, className, value: controlledValue, defaultValue, onChange, onBlur, onSubmit, rememberOnBlur = true, ...props}, ref) => {
    const engine = React.useMemo(() => new MemoryAutocomplete({ storageKey }), [storageKey]);
    
    const [internalValue, setInternalValue] = React.useState(defaultValue ?? '');
    const value = controlledValue !== undefined ? controlledValue : internalValue;
    const setValue = controlledValue !== undefined ? (val: string) => onChange?.({ target: { value: val } } as any) : setInternalValue;

    const [open, setOpen] = React.useState(false);
    const [suggestions, setSuggestions] = React.useState<HistoryItem[]>([]);
    const [highlight, setHighlight] = React.useState<number>(-1);

    const wrapRef = React.useRef<HTMLDivElement>(null);
    const listboxId = (id ?? "ac") + "-listbox";

    const refresh = (q: string) => {
      const s = engine.suggest(q, maxSuggestions);
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
      const t = text.trim();
      setValue(t);
      engine.remember(t);
      setOpen(false);
      onSubmit?.(t);
    };
    
    const handleKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
      if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
        refresh(value); setOpen(true); return;
      }
      if (!open && e.key === "Enter") {
        commit(value); return;
      }
      if (!open) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlight((h) => (h + 1) % suggestions.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlight((h) => (h - 1 + suggestions.length) % suggestions.length);
      } else if (e.key === "Enter" || e.key === "Tab") {
        if (highlight >= 0 && suggestions[highlight]) {
          e.preventDefault();
          commit(suggestions[highlight].text);
        } else if (e.key === "Enter") {
          commit(value);
        }
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const v = e.target.value;
      setValue(v);
      onChange?.(e);
      refresh(v);
    };

    const handleFocus: React.FocusEventHandler<HTMLInputElement> = (e) => {
      refresh(value);
    };
    
    const handleBlur: React.FocusEventHandler<HTMLInputElement> = (e) => {
      onBlur?.(e);
      if (rememberOnBlur && value.trim()) {
        engine.remember(value);
        onSubmit?.(value.trim());
      }
    };

    return (
      <div ref={wrapRef} className={cn("relative", className)}>
        <Input
          {...props}
          id={id}
          ref={ref}
          placeholder={placeholder}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-activedescendant={open && highlight >= 0 ? `${listboxId}-opt-${highlight}` : undefined}
          autoComplete="off"
          spellCheck={false}
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
                  <span className="ac-meta">
                    {new Date(s.lastUsed).toLocaleDateString()} • ×{s.count}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    );
});
AutocompleteInput.displayName = "AutocompleteInput";
