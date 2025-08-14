import * as React from "react";
import { Input } from "./input";

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
  ...props
}: AutocompleteInputProps) {
  const listId = React.useMemo(() => `${id || storageKey}-list`, [id, storageKey]);
  const [suggestions, setSuggestions] = React.useState<string[]>([]);

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

  const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
    onBlur?.(e);
    const value = e.target.value.trim();
    if (!value) return;

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
  };

  return (
    <>
      <Input {...props} id={id} list={listId} onBlur={handleBlur} />
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
