
"use client";

import React, { useRef, useEffect } from "react";
import { Textarea } from "./textarea";
import Textcomplete from "@yuku/textcomplete";
import { cn } from "@/lib/utils";

export interface CanvasAutocompleteProps extends React.ComponentPropsWithoutRef<typeof Textarea> {
  suggestions: string[];
}

const CanvasAutocomplete: React.FC<CanvasAutocompleteProps> = ({
  value,
  onChange,
  placeholder,
  suggestions,
  className,
  ...props
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!textareaRef.current) return;

    const textcomplete = new Textcomplete(textareaRef.current, [
      {
        match: /(^|\s)@(\w*)$/,
        search: (term: string, callback: (results: string[]) => void) => {
          const filtered = suggestions.filter((s) =>
            s.toLowerCase().startsWith(term.toLowerCase())
          );
          callback(filtered);
        },
        index: 2,
        replace: (word: string) => {
          return `$1@${word} `;
        },
      },
    ], {
        dropdown: {
            className: "textcomplete-dropdown",
        },
        option: {
             className: "textcomplete-item",
            activeClassName: "textcomplete-item-active",
        }
    });

    return () => {
      try {
        textcomplete.destroy();
      } catch(e) {
        // ignore
      }
    };
  }, [suggestions]);

  return (
    <Textarea
      ref={textareaRef}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      className={className}
      {...props}
    />
  );
};

export default CanvasAutocomplete;
