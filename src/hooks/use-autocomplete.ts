import * as React from "react"

export const MAX_SUGGESTIONS = 20

export function useAutocomplete(storageKey: string) {
  const [suggestions, setSuggestions] = React.useState<string[]>([])

  React.useEffect(() => {
    try {
      const stored = localStorage.getItem(`autocomplete:${storageKey}`)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (Array.isArray(parsed)) {
          setSuggestions(parsed)
        }
      }
    } catch (error) {
      console.error("Failed to load autocomplete suggestions", error)
    }
  }, [storageKey])

  const addSuggestion = React.useCallback(
    (value: string) => {
      setSuggestions(prev => {
        if (prev.includes(value)) return prev
        const updated = [...prev, value].slice(-MAX_SUGGESTIONS)
        try {
          localStorage.setItem(
            `autocomplete:${storageKey}`,
            JSON.stringify(updated)
          )
        } catch (error) {
          console.error("Failed to save autocomplete suggestions", error)
        }
        return updated
      })
    },
    [storageKey]
  )

  return { suggestions, addSuggestion }
}
