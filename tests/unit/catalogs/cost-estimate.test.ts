import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  calculateExtractionCost,
  exceedsThreshold,
  TOKENS_PER_IMAGE_ESTIMATE,
  GEMINI_FLASH_25_PRICE_USD_PER_1K,
  COST_THRESHOLD_BRL,
} from '@/lib/catalogs/cost-estimate'

const DEFAULT_MODEL = 'google/gemini-2.5-flash'
const UNKNOWN_MODEL = 'unknown/model-xyz'

function expectedUsd(pages: number): number {
  return pages * TOKENS_PER_IMAGE_ESTIMATE * (GEMINI_FLASH_25_PRICE_USD_PER_1K / 1000)
}

describe('calculateExtractionCost', () => {
  beforeEach(() => {
    vi.unstubAllEnvs()
  })

  it('retorna custo zero para 0 páginas', () => {
    const result = calculateExtractionCost(0, DEFAULT_MODEL)
    expect(result.estimatedCostUsd).toBe(0)
    expect(result.estimatedCostBrl).toBe(0)
  })

  it('calcula corretamente para 1 página (Gemini Flash 2.5, taxa 5.80)', () => {
    vi.stubEnv('BRL_USD_RATE', '5.80')
    const result = calculateExtractionCost(1, DEFAULT_MODEL)
    const usd = expectedUsd(1)
    expect(result.estimatedCostUsd).toBeCloseTo(usd, 10)
    expect(result.estimatedCostBrl).toBeCloseTo(usd * 5.80, 10)
  })

  it('calcula corretamente para 30 páginas', () => {
    vi.stubEnv('BRL_USD_RATE', '5.80')
    const result = calculateExtractionCost(30, DEFAULT_MODEL)
    const usd = expectedUsd(30)
    expect(result.estimatedCostUsd).toBeCloseTo(usd, 10)
    expect(result.estimatedCostBrl).toBeCloseTo(usd * 5.80, 10)
  })

  it('calcula corretamente para 100 páginas', () => {
    vi.stubEnv('BRL_USD_RATE', '5.80')
    const result = calculateExtractionCost(100, DEFAULT_MODEL)
    const usd = expectedUsd(100) // 100 * 2000 * 0.0004 / 1000 = 0.08
    expect(result.estimatedCostUsd).toBeCloseTo(0.08, 10)
    expect(result.estimatedCostBrl).toBeCloseTo(0.08 * 5.80, 10)
  })

  it('usa BRL_USD_RATE customizado da env var', () => {
    vi.stubEnv('BRL_USD_RATE', '6.50')
    const result = calculateExtractionCost(100, DEFAULT_MODEL)
    expect(result.estimatedCostBrl).toBeCloseTo(0.08 * 6.50, 10)
  })

  it('usa taxa default 5.80 quando BRL_USD_RATE não está definida', () => {
    vi.unstubAllEnvs()
    const result = calculateExtractionCost(100, DEFAULT_MODEL)
    expect(result.estimatedCostBrl).toBeCloseTo(0.08 * 5.80, 10)
  })

  it('faz fallback para Gemini Flash 2.5 quando modelo é desconhecido', () => {
    vi.stubEnv('BRL_USD_RATE', '5.80')
    const resultDefault = calculateExtractionCost(100, DEFAULT_MODEL)
    const resultUnknown = calculateExtractionCost(100, UNKNOWN_MODEL)
    expect(resultUnknown.estimatedCostUsd).toBeCloseTo(resultDefault.estimatedCostUsd, 10)
    expect(resultUnknown.estimatedCostBrl).toBeCloseTo(resultDefault.estimatedCostBrl, 10)
  })
})

describe('exceedsThreshold', () => {
  it('retorna false para custo abaixo do limite', () => {
    expect(exceedsThreshold(COST_THRESHOLD_BRL - 0.01)).toBe(false)
  })

  it('retorna false para custo exatamente no limite (não excede)', () => {
    expect(exceedsThreshold(COST_THRESHOLD_BRL)).toBe(false)
  })

  it('retorna true para custo acima do limite', () => {
    expect(exceedsThreshold(COST_THRESHOLD_BRL + 0.01)).toBe(true)
  })

  it('retorna false para custo zero', () => {
    expect(exceedsThreshold(0)).toBe(false)
  })
})
