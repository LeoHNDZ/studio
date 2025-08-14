/** @vitest-environment jsdom */
import React from "react";
import { render, fireEvent } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import { AutocompleteInput } from "../autocomplete-input";
import { AutocompleteTextarea } from "../autocomplete-textarea";

const STORAGE_KEY = "test";

function populate(component: React.ReactElement) {
  const { getByRole } = render(component);
  let input: HTMLInputElement | HTMLTextAreaElement;
  try {
    input = getByRole("textbox") as HTMLInputElement | HTMLTextAreaElement;
  } catch {
    input = getByRole("combobox") as HTMLInputElement | HTMLTextAreaElement;
  }
  for (let i = 0; i < 60; i++) {
    input.value = `item${i}`;
    fireEvent.blur(input);
  }
}

describe("autocomplete suggestions cap", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("trims input suggestions to 50 entries", () => {
    populate(<AutocompleteInput storageKey={STORAGE_KEY} id="input" />);
    const stored = JSON.parse(localStorage.getItem(`autocomplete:${STORAGE_KEY}`) || "[]");
    expect(stored.length).toBe(50);
    expect(stored[0]).toBe("item10");
    expect(stored[49]).toBe("item59");
  });

  it("trims textarea suggestions to 50 entries", () => {
    populate(<AutocompleteTextarea storageKey={STORAGE_KEY} id="textarea" />);
    const stored = JSON.parse(localStorage.getItem(`autocomplete:${STORAGE_KEY}`) || "[]");
    expect(stored.length).toBe(50);
    expect(stored[0]).toBe("item10");
    expect(stored[49]).toBe("item59");
  });
});
