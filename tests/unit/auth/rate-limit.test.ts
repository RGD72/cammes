import { describe, it, expect, vi, afterEach } from 'vitest'
import { checkRateLimit, recordFailure, resetOnSuccess } from '@/lib/auth/rate-limit'

describe('rate-limit', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('não bloqueia com menos de 5 tentativas', () => {
    const ip = 'test-ip-1'
    for (let i = 0; i < 4; i++) recordFailure(ip)
    expect(checkRateLimit(ip)).toBe(false)
    resetOnSuccess(ip)
  })

  it('bloqueia após 5 ou mais falhas no mesmo minuto', () => {
    const ip = 'test-ip-2'
    for (let i = 0; i < 5; i++) recordFailure(ip)
    expect(checkRateLimit(ip)).toBe(true)
    resetOnSuccess(ip)
  })

  it('reseta o contador após sucesso', () => {
    const ip = 'test-ip-3'
    for (let i = 0; i < 5; i++) recordFailure(ip)
    expect(checkRateLimit(ip)).toBe(true)
    resetOnSuccess(ip)
    expect(checkRateLimit(ip)).toBe(false)
  })

  it('não bloqueia quando a janela de tempo expirou', () => {
    const ip = 'test-ip-4'
    const realNow = Date.now()

    // Simula falhas há 2 minutos atrás
    vi.spyOn(Date, 'now').mockReturnValue(realNow - 120_000)
    for (let i = 0; i < 5; i++) recordFailure(ip)

    // Avança o tempo para agora (janela expirada)
    vi.spyOn(Date, 'now').mockReturnValue(realNow)

    expect(checkRateLimit(ip)).toBe(false)
    resetOnSuccess(ip)
  })

  it('exatamente 6 tentativas no mesmo minuto bloqueia', () => {
    const ip = 'test-ip-5'
    for (let i = 0; i < 6; i++) recordFailure(ip)
    expect(checkRateLimit(ip)).toBe(true)
    resetOnSuccess(ip)
  })
})
