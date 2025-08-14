import * as React from "react";
import { Textarea } from "./textarea";

interface AutocompleteTextareaProps extends React.ComponentProps<typeof Textarea> {
  /**
   * A unique key used to persist suggestions in localStorage
   */
  storageKey: string;
}

export function AutocompleteTextarea({
  storageKey,
  id,
  onBlur,
  ...props
}: AutocompleteTextareaProps) {
  const listId = React.useMemo(() => `${id || storageKey}-list`, [id, storageKey]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);
  const MAX_SUGGESTIONS = 50;

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

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onBlur?.(e);
    const value = e.target.value.trim();
    if (!value) return;

    setSuggestions((prev) => {
      if (prev.includes(value)) return prev;
      const updated = [...prev, value];
      const capped = updated.slice(-MAX_SUGGESTIONS);
      try {
        localStorage.setItem(
          `autocomplete:${storageKey}`,
          JSON.stringify(capped)
        );
      } catch (error) {
        console.error("Failed to save autocomplete suggestions", error);
      }
      return capped;
    });
  };

  return (
    <>
      <Textarea {...props} id={id} onBlur={handleBlur} />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map((s) => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  );
}
