/**
 * Tests for lib/utils.ts
 */

import { truncateText, formatDate, cn } from '@/lib/utils'

describe('truncateText', () => {
  it('returns original text when shorter than maxLength', () => {
    expect(truncateText('hello', 10)).toBe('hello')
  })

  it('returns original text when equal to maxLength', () => {
    expect(truncateText('hello', 5)).toBe('hello')
  })

  it('truncates text longer than maxLength with ellipsis', () => {
    expect(truncateText('hello world', 5)).toBe('hello...')
  })

  it('handles empty string', () => {
    expect(truncateText('', 5)).toBe('')
  })

  it('handles single character max length', () => {
    expect(truncateText('hello', 1)).toBe('h...')
  })

  it('handles zero max length', () => {
    expect(truncateText('hello', 0)).toBe('...')
  })
})

describe('formatDate', () => {
  it('formats Date object correctly', () => {
    const date = new Date('2024-06-15')
    const formatted = formatDate(date)
    expect(formatted).toContain('June')
    expect(formatted).toContain('15')
    expect(formatted).toContain('2024')
  })

  it('formats date string correctly', () => {
    const formatted = formatDate('2024-01-01')
    expect(formatted).toContain('January')
    expect(formatted).toContain('1')
    expect(formatted).toContain('2024')
  })

  it('formats ISO string correctly', () => {
    const formatted = formatDate('2024-12-25T00:00:00.000Z')
    expect(formatted).toContain('December')
    expect(formatted).toContain('2024')
  })
})

describe('cn (className merger)', () => {
  it('merges multiple class names', () => {
    expect(cn('foo', 'bar')).toBe('foo bar')
  })

  it('handles conditional classes', () => {
    expect(cn('base', true && 'active', false && 'inactive')).toBe('base active')
  })

  it('merges Tailwind classes correctly', () => {
    // twMerge should deduplicate conflicting classes
    expect(cn('px-2 py-1', 'px-4')).toBe('py-1 px-4')
  })

  it('handles arrays of classes', () => {
    expect(cn(['foo', 'bar'], 'baz')).toBe('foo bar baz')
  })

  it('handles undefined and null values', () => {
    expect(cn('foo', undefined, null, 'bar')).toBe('foo bar')
  })

  it('handles empty input', () => {
    expect(cn()).toBe('')
  })
})
