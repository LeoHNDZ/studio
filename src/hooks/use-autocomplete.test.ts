import { renderHook, act } from "@testing-library/react"
import { describe, it, expect, beforeEach } from "vitest"
import { useAutocomplete, MAX_SUGGESTIONS } from "./use-autocomplete"

describe("useAutocomplete", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("loads suggestions from localStorage", () => {
    localStorage.setItem("autocomplete:test", JSON.stringify(["a", "b"]))
    const { result } = renderHook(() => useAutocomplete("test"))
    expect(result.current.suggestions).toEqual(["a", "b"])
  })

  it("adds suggestions and caps the list", () => {
    const { result } = renderHook(() => useAutocomplete("test"))
    act(() => {
      for (let i = 0; i < MAX_SUGGESTIONS + 5; i++) {
        result.current.addSuggestion(`item${i}`)
      }
    })
    expect(result.current.suggestions.length).toBe(MAX_SUGGESTIONS)
    expect(JSON.parse(localStorage.getItem("autocomplete:test") || "[]").length).toBe(MAX_SUGGESTIONS)
  })

  it("does not duplicate suggestions", () => {
    const { result } = renderHook(() => useAutocomplete("test"))
    act(() => {
      result.current.addSuggestion("foo")
      result.current.addSuggestion("foo")
    })
    expect(result.current.suggestions).toEqual(["foo"])
  })
})
