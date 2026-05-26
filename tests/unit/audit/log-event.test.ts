import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('next/headers', () => ({
  headers: vi.fn(),
}))

import { logAuditEvent } from '@/lib/audit/log-event'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { headers } from 'next/headers'

// ---- helpers ----------------------------------------------------------------

function makeChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['from', 'select', 'eq', 'insert', 'update', 'upsert']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
  })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- P-AUDIT-1: logAuditEvent inserts with correct fields -------------------

describe('logAuditEvent', () => {
  it('P-AUDIT-1: chama insert com event_type, user_id e payload corretos', async () => {
    const chain = makeChain({ error: null })
    const insertSpy = chain.insert as ReturnType<typeof vi.fn>
    const fromSpy = vi.fn().mockReturnValue(chain)

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: fromSpy,
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    await logAuditEvent('brand_published', { userId: 'u1', brandId: 'b1' })

    expect(fromSpy).toHaveBeenCalledWith('audit_logs')
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'brand_published',
        user_id: 'u1',
        payload: { userId: 'u1', brandId: 'b1' },
      }),
    )
  })

  // ---- P-AUDIT-2: IP e user-agent são extraídos dos headers ------------------

  it('P-AUDIT-2: passa ip_address e user_agent extraídos dos headers', async () => {
    const chain = makeChain({ error: null })
    const insertSpy = chain.insert as ReturnType<typeof vi.fn>

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockImplementation((key: string) => {
        if (key === 'x-forwarded-for') return '1.2.3.4, 5.6.7.8'
        if (key === 'user-agent') return 'TestAgent/1.0'
        return null
      }),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    await logAuditEvent('order_viewed', { userId: 'u2', orderId: 'o1' })

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        ip_address: '1.2.3.4',
        user_agent: 'TestAgent/1.0',
      }),
    )
  })

  // ---- N-AUDIT-1: erro no insert — função não lança --------------------------

  it('N-AUDIT-1: não lança exceção quando insert retorna erro', async () => {
    const chain = makeChain({ error: { message: 'db error' } })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(headers).mockResolvedValue({
      get: vi.fn().mockReturnValue(null),
    } as unknown as Awaited<ReturnType<typeof headers>>)

    await expect(logAuditEvent('logout', { userId: null })).resolves.toBeUndefined()
  })

  // ---- N-AUDIT-2: headers() lança — fallback null e insert ainda ocorre ------

  it('N-AUDIT-2: quando headers() lança, usa ip_address null e ainda chama insert', async () => {
    const chain = makeChain({ error: null })
    const insertSpy = chain.insert as ReturnType<typeof vi.fn>

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValue(chain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(headers).mockRejectedValue(new Error('headers unavailable outside request'))

    await logAuditEvent('login_failed', { email: 'test@test.com' })

    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        event_type: 'login_failed',
        ip_address: null,
        user_agent: null,
      }),
    )
  })
})
