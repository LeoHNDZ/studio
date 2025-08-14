import { describe, expect, it } from 'vitest'
import { cn } from './utils'

describe('cn', () => {
  it('merges class names and removes duplicates', () => {
    expect(cn('a', 'b', ['c'])).toBe('a b c')
    expect(cn('p-2', 'p-4', 'm-2', ['m-2'])).toBe('p-4 m-2')
  })
})
