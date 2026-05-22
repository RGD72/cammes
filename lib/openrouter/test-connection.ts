export interface OpenRouterConnectionResult {
  ok: boolean
  latencyMs: number
  error?: string
}

export async function testOpenRouterConnection(key: string): Promise<OpenRouterConnectionResult> {
  const start = Date.now()
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(10_000),
    })
    const latencyMs = Date.now() - start
    if (response.ok) return { ok: true, latencyMs }
    return { ok: false, latencyMs, error: `HTTP ${response.status}: ${response.statusText}` }
  } catch (err) {
    const latencyMs = Date.now() - start
    const message = err instanceof Error ? err.message : 'Erro de rede'
    return { ok: false, latencyMs, error: message }
  }
}
