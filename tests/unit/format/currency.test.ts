import { describe, it, expect } from 'vitest'
import { parsePriceInputBRL } from '@/lib/format/currency'

describe('parsePriceInputBRL', () => {
  it('parses plain integer', () => {
    expect(parsePriceInputBRL('100')).toBe(100)
  })

  it('parses BR decimal with thousand separator', () => {
    expect(parsePriceInputBRL('1.234,56')).toBe(1234.56)
  })

  it('parses BR decimal without thousand separator', () => {
    expect(parsePriceInputBRL('100,00')).toBe(100)
  })

  it('returns null for empty input', () => {
    expect(parsePriceInputBRL('')).toBeNull()
  })

  it('rejects malformed input with trailing letters', () => {
    expect(parsePriceInputBRL('1,2abc')).toBeNull()
  })

  it('rejects malformed input with multiple decimal separators', () => {
    expect(parsePriceInputBRL('1,2,3')).toBeNull()
  })
})
