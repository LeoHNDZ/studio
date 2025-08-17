
"use client";

import React, { useRef, useState, useEffect } from "react";
import { Textarea } from "./textarea";
import { Button } from "./button";

type TextToolProps = {
  initialValue?: string;
  onApply?: (text: string) => void;
  onCancel?: () => void;
  disabled?: boolean;
};

const TextTool: React.FC<TextToolProps> = ({
  initialValue = "",
  onApply,
  onCancel,
  disabled = false,
}) => {
  const [text, setText] = useState(initialValue);
  const [selection, setSelection] = useState<{ start: number; end: number }>({
    start: 0,
    end: 0,
  });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  
  // When the initialValue changes (e.g., selecting a new text element),
  // update the internal state of the tool.
  useEffect(() => {
    setText(initialValue);
  }, [initialValue]);

  useEffect(() => {
    if (textareaRef.current && selection) {
      textareaRef.current.setSelectionRange(selection.start, selection.end);
    }
  }, [selection, text]);

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setText(e.target.value);
  };

  const handleSelect = (e: React.SyntheticEvent<HTMLTextAreaElement>) => {
    const target = e.target as HTMLTextAreaElement;
    setSelection({
      start: target.selectionStart,
      end: target.selectionEnd,
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "a") {
      e.preventDefault();
      if (textareaRef.current) {
        textareaRef.current.select();
      }
    }
    if (e.key === "Escape" && onCancel) {
      onCancel();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && onApply) {
      onApply(text);
    }
  };

  return (
    <div
      className={cn(
        "rounded-lg border p-4",
        disabled ? "bg-muted/50 opacity-70" : "bg-card"
      )}
    >
      <Textarea
        ref={textareaRef}
        value={text}
        disabled={disabled}
        onChange={handleChange}
        onSelect={handleSelect}
        onKeyDown={handleKeyDown}
        rows={6}
        className={cn(
          "w-full font-mono text-base p-2 rounded border-input",
           disabled ? "bg-muted/80" : "bg-background"
        )}
        autoFocus
      />
      <div className="mt-2 text-xs text-muted-foreground">
        {selection.start !== selection.end &&
          `Selected: [${selection.start} – ${selection.end}]`}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
         {onCancel && (
          <Button
            onClick={onCancel}
            disabled={disabled}
            variant="destructive"
            size="sm"
          >
            Cancel
          </Button>
        )}
        {onApply && (
           <Button
            onClick={() => onApply(text)}
            disabled={disabled}
            size="sm"
          >
            Apply
          </Button>
        )}
      </div>
    </div>
  );
};

export default TextTool;
