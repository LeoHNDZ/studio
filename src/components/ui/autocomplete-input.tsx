import * as React from "react";
import { Input } from "./input";
import { cn } from "../../lib/utils";

interface AutocompleteInputProps extends React.ComponentProps<typeof Input> {
  /**
   * A unique key used to persist suggestions in localStorage
   */
  storageKey: string;
}

export function AutocompleteInput({
  storageKey,
  id,
  onBlur,
  onChange,
  onKeyDown,
  ...props
}: AutocompleteInputProps) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const [filtered, setFiltered] = React.useState<string[]>([]);
  const [open, setOpen] = React.useState(false);
  const [highlighted, setHighlighted] = React.useState(0);
  const [position, setPosition] = React.useState({ top: 0, left: 0 });

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(`autocomplete:${storageKey}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setSuggestions(parsed);
        }
      }
    } catch (error) {
      console.error("Failed to load autocomplete suggestions", error);
    }
  }, [storageKey]);

  const updatePosition = () => {
    const input = inputRef.current;
    const container = containerRef.current;
    if (!input || !container) return;
    const style = window.getComputedStyle(input);
    const font = style.font || `${style.fontSize} ${style.fontFamily}`;
    const canvas = document.createElement("canvas");
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext("2d");
    } catch {
      ctx = null;
    }
    let left = 0;
    if (ctx) {
      ctx.font = font;
      const before = input.value.substring(0, input.selectionStart || 0);
      left = ctx.measureText(before).width;
    }
    const rect = input.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    setPosition({
      top: rect.bottom - containerRect.top,
      left: rect.left - containerRect.left + left - input.scrollLeft,
    });
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange?.(e);
    const value = e.target.value;
    const filtered = suggestions.filter((s) =>
      s.toLowerCase().startsWith(value.toLowerCase())
    );
    setFiltered(filtered);
    setOpen(filtered.length > 0);
    setHighlighted(0);
    updatePosition();
  };

  const select = (value: string) => {
    const input = inputRef.current;
    if (input) {
      input.value = value;
      input.dispatchEvent(new Event("input", { bubbles: true }));
    }
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (open) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setHighlighted((i) => (i + 1) % filtered.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setHighlighted((i) => (i - 1 + filtered.length) % filtered.length);
      } else if (e.key === "Enter") {
        e.preventDefault();
        select(filtered[highlighted]);
      } else if (e.key === "Escape") {
        setOpen(false);
      } else {
        onKeyDown?.(e);
      }
    } else {
      onKeyDown?.(e);
    }
    updatePosition();
  };

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    const value = e.target.value.trim();
    if (!value) {
      setOpen(false);
      return;
    }

    setSuggestions((prev) => {
      if (prev.includes(value)) return prev;
      const updated = [...prev, value];
      try {
        localStorage.setItem(
          `autocomplete:${storageKey}`,
          JSON.stringify(updated)
        );
      } catch (error) {
        console.error("Failed to save autocomplete suggestions", error);
      }
      return updated;
    });
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative">
      <Input
        {...props}
        id={id}
        ref={inputRef}
        onBlur={handleBlur}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <ul
          className="absolute z-10 mt-1 max-h-60 overflow-auto rounded-md border bg-background p-1 text-sm shadow"
          style={{ top: position.top, left: position.left }}
        >
          {filtered.map((s, idx) => (
            <li
              key={s}
              className={cn(
                "cursor-pointer px-2 py-1",
                idx === highlighted && "bg-accent text-accent-foreground"
              )}
              onMouseDown={(e) => {
                e.preventDefault();
                select(s);
              }}
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
