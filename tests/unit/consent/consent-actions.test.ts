import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

vi.mock('@/lib/audit/log-event', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

import { recordConsent } from '@/lib/consent/actions'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { headers } from 'next/headers'

// ---- helpers ----------------------------------------------------------------

function makeChain(terminalResult: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['from', 'select', 'eq', 'insert', 'update', 'upsert', 'single', 'order', 'limit', 'in']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(terminalResult).catch(rej),
  })
  return chain
}

function makeSessionClient(userId: string | null, sessionChainResult: unknown = { error: null }) {
  const sessionChain = makeChain(sessionChainResult)
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue(sessionChain),
    _sessionChain: sessionChain,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- P-CONSENT-1: insere em consent_log com campos corretos ------------------

describe('recordConsent', () => {
  it('P-CONSENT-1: insere em consent_log com user_id, document_version e ip_address corretos', async () => {
    const serviceChain = makeChain({ error: null })
    const insertSpy = serviceChain.insert as ReturnType<typeof vi.fn>
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(serviceChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const sessionClient = makeSessionClient('user-123')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      sessionClient as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'x-forwarded-for') return '10.0.0.1, 10.0.0.2'
        return null
      }),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const result = await recordConsent('1.0')

    expect(result.ok).toBe(true)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-123',
        document_version: '1.0',
        ip_address: '10.0.0.1',
      }),
    )
  })

  // ---- P-CONSENT-2: atualiza users_profile.consented_version ------------------

  it('P-CONSENT-2: atualiza users_profile.consented_version após insert', async () => {
    const serviceChain = makeChain({ error: null })
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(serviceChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const sessionClient = makeSessionClient('user-456')
    const updateSpy = sessionClient._sessionChain.update as ReturnType<typeof vi.fn>
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      sessionClient as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const result = await recordConsent('1.0')

    expect(result.ok).toBe(true)
    expect(updateSpy).toHaveBeenCalledWith({ consented_version: '1.0' })
  })

  // ---- N-CONSENT-1: usuário não autenticado -----------------------------------

  it('N-CONSENT-1: retorna PERMISSION_DENIED quando usuário não autenticado', async () => {
    const sessionClient = makeSessionClient(null)
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      sessionClient as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const result = await recordConsent('1.0')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  // ---- N-CONSENT-2: INSERT falha — retorna INTERNAL ---------------------------

  it('N-CONSENT-2: retorna Result<never> com code INTERNAL quando INSERT em consent_log falha', async () => {
    const serviceChain = makeChain({ error: { message: 'db constraint violation' } })
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(serviceChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const sessionClient = makeSessionClient('user-789')
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      sessionClient as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    const result = await recordConsent('1.0')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('INTERNAL')
      expect(result.error.message).toBe('db constraint violation')
    }
  })
})
