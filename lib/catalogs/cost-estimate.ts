export const TOKENS_PER_IMAGE_ESTIMATE = 2000
export const GEMINI_FLASH_25_PRICE_USD_PER_1K = 0.0004
export const COST_THRESHOLD_BRL = 50

export interface ModelPricing {
  priceUsdPer1k: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'google/gemini-flash-2.5': { priceUsdPer1k: GEMINI_FLASH_25_PRICE_USD_PER_1K },
  'google/gemini-pro-2.5': { priceUsdPer1k: 0.0015 },
  'openai/gpt-4o': { priceUsdPer1k: 0.0025 },
  'anthropic/claude-3-5-sonnet': { priceUsdPer1k: 0.003 },
}

const DEFAULT_MODEL = 'google/gemini-flash-2.5'

export function calculateExtractionCost(
  pages: number,
  modelId: string,
): { estimatedCostUsd: number; estimatedCostBrl: number } {
  const pricing = MODEL_PRICING[modelId] ?? MODEL_PRICING[DEFAULT_MODEL]
  const rate = parseFloat(process.env.BRL_USD_RATE ?? '5.80')
  const estimatedCostUsd = pages * TOKENS_PER_IMAGE_ESTIMATE * (pricing.priceUsdPer1k / 1000)
  return { estimatedCostUsd, estimatedCostBrl: estimatedCostUsd * rate }
}

export function exceedsThreshold(estimatedCostBrl: number): boolean {
  return estimatedCostBrl > COST_THRESHOLD_BRL
}
