
"use client";

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface TextToolProps {
  text: string;
  disabled?: boolean;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  onSelect: (e: React.SyntheticEvent<HTMLTextAreaElement, Event>) => void;
  onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  onApply: () => void;
  onCancel?: () => void;
  selection: { start: number; end: number };
}

export const TextTool = ({
  text,
  disabled,
  onChange,
  onSelect,
  onKeyDown,
  onApply,
  onCancel,
  selection,
}: TextToolProps) => {
  return (
    <div className={cn("rounded-lg border p-4", disabled ? "bg-muted/50 opacity-70" : "bg-card")}>
      <Textarea
        value={text}
        disabled={disabled}
        onChange={onChange}
        onSelect={onSelect}
        onKeyDown={onKeyDown}
        rows={6}
        className={cn(
          "w-full font-mono text-base p-2 rounded border-input",
          disabled ? "bg-muted/80" : "bg-background"
        )}
        autoFocus
      />
      <div className="mt-2 text-xs text-muted-foreground">
        {selection.start !== selection.end && `Selected: [${selection.start} – ${selection.end}]`}
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {onCancel && (
          <Button onClick={onCancel} disabled={disabled} variant="ghost" size="sm">
            Cancel
          </Button>
        )}
         <Button onClick={onApply} disabled={disabled} size="sm">
            Apply
          </Button>
      </div>
    </div>
  );
};
