import * as React from "react"
import { useAutocomplete } from "@/hooks/use-autocomplete"
import { Textarea } from "./textarea"

interface AutocompleteTextareaProps extends React.ComponentProps<typeof Textarea> {
  storageKey: string
}

export function AutocompleteTextarea({
  storageKey,
  id,
  onBlur,
  ...props
}: AutocompleteTextareaProps) {
  const listId = React.useMemo(() => `${id || storageKey}-list`, [id, storageKey])
  const { suggestions, addSuggestion } = useAutocomplete(storageKey)

  const handleBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onBlur?.(e)
    const value = e.target.value.trim()
    if (!value) return
    addSuggestion(value)
  }

  return (
    <>
      <Textarea {...props} id={id} list={listId} onBlur={handleBlur} />
      {suggestions.length > 0 && (
        <datalist id={listId}>
          {suggestions.map(s => (
            <option key={s} value={s} />
          ))}
        </datalist>
      )}
    </>
  )
}
