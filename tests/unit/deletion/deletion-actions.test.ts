import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit/log-event', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('@/lib/email/send-email', () => ({
  sendEmail: vi.fn().mockResolvedValue({ ok: true }),
}))

vi.mock('@/lib/email/templates', () => ({
  deletionRequestedEmail: vi.fn().mockReturnValue('<p>email</p>'),
  deletionCompletedEmail: vi.fn().mockReturnValue('<p>done</p>'),
}))

import { requestAccountDeletion, executeAccountDeletion } from '@/lib/deletion/actions'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { logAuditEvent } from '@/lib/audit/log-event'

// ---- helpers ----------------------------------------------------------------

function makeChain(terminalResult: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = [
    'from',
    'select',
    'eq',
    'insert',
    'update',
    'upsert',
    'single',
    'maybeSingle',
    'order',
    'limit',
    'in',
  ]
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  Object.assign(chain, {
    then: (res: (v: unknown) => unknown) => Promise.resolve(terminalResult).then(res),
    catch: (rej: (e: unknown) => unknown) => Promise.resolve(terminalResult).catch(rej),
  })
  return chain
}

function makeSessionClient(userId: string | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: userId ? { id: userId } : null },
      }),
    },
    from: vi.fn().mockReturnValue(makeChain({ data: null, error: null })),
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- requestAccountDeletion -------------------------------------------------

describe('requestAccountDeletion', () => {
  it('P-DEL-1: cria registro em deletion_requests com user_id e user_email corretos', async () => {
    const insertChain = makeChain({ error: null })
    const insertSpy = insertChain.insert as ReturnType<typeof vi.fn>

    const profileChain = makeChain({ data: { full_name: 'João', email: 'joao@test.com' }, error: null })
    const noExistingChain = makeChain({ data: null, error: null })

    const serviceFromMock = vi.fn()
      .mockReturnValueOnce(profileChain)    // select profile
      .mockReturnValueOnce(noExistingChain) // check existing
      .mockReturnValueOnce(insertChain)     // insert

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: serviceFromMock,
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('user-111') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    const result = await requestAccountDeletion()

    expect(result.ok).toBe(true)
    expect(insertSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        user_id: 'user-111',
        user_email: 'joao@test.com',
      }),
    )
  })

  it('P-DEL-2: loga evento account_deletion_requested', async () => {
    const profileChain = makeChain({ data: { full_name: 'Maria', email: 'maria@test.com' }, error: null })
    const noExistingChain = makeChain({ data: null, error: null })
    const insertChain = makeChain({ error: null })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(noExistingChain)
        .mockReturnValueOnce(insertChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('user-222') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    await requestAccountDeletion()

    expect(logAuditEvent).toHaveBeenCalledWith(
      'account_deletion_requested',
      expect.objectContaining({ userId: 'user-222' }),
    )
  })

  it('N-DEL-1: retorna PERMISSION_DENIED quando usuário não autenticado', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient(null) as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    const result = await requestAccountDeletion()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  it('N-DEL-2: retorna CONFLICT quando já existe solicitação pendente', async () => {
    const profileChain = makeChain({ data: { full_name: 'Ana', email: 'ana@test.com' }, error: null })
    const existingChain = makeChain({ data: { id: 99 }, error: null })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn()
        .mockReturnValueOnce(profileChain)
        .mockReturnValueOnce(existingChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('user-333') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    const result = await requestAccountDeletion()

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('CONFLICT')
    }
  })
})

// ---- executeAccountDeletion -------------------------------------------------

describe('executeAccountDeletion', () => {
  function makeAdminServiceClient(targetEmail = 'target@test.com') {
    const callerAdminChain = makeChain({ data: { role: 'admin' }, error: null })
    const targetProfileChain = makeChain({ data: { email: targetEmail, full_name: 'Target' }, error: null })
    const updateChain = makeChain({ error: null })
    const ordersChain = makeChain({ data: [{ id: 'order-1' }], error: null })

    const fromMock = vi.fn()
      .mockReturnValueOnce(callerAdminChain)  // select caller role
      .mockReturnValueOnce(targetProfileChain) // select target profile
      .mockReturnValueOnce(updateChain)         // update users_profile
      .mockReturnValueOnce(updateChain)         // update orders
      .mockReturnValueOnce(ordersChain)         // select order ids
      .mockReturnValueOnce(updateChain)         // update order_items
      .mockReturnValueOnce(updateChain)         // update deletion_requests

    return {
      from: fromMock,
      auth: {
        admin: {
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
    }
  }

  it('P-DEL-3: anonimiza users_profile (full_name, email, phone, is_active)', async () => {
    const serviceClient = makeAdminServiceClient()
    const updateSpy = serviceClient.from as ReturnType<typeof vi.fn>

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(
      serviceClient as unknown as ReturnType<typeof createServiceRoleSupabaseClient>,
    )
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('admin-1') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    const result = await executeAccountDeletion('target-user-id')

    expect(result.ok).toBe(true)
    // 3rd call is users_profile update
    const usersProfileUpdate = updateSpy.mock.calls[2]
    expect(usersProfileUpdate[0]).toBe('users_profile')
  })

  it('P-DEL-4: loga evento account_deletion_completed', async () => {
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(
      makeAdminServiceClient() as unknown as ReturnType<typeof createServiceRoleSupabaseClient>,
    )
    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('admin-2') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    await executeAccountDeletion('target-user-id')

    expect(logAuditEvent).toHaveBeenCalledWith(
      'account_deletion_completed',
      expect.objectContaining({ targetUserId: 'target-user-id', processedBy: 'admin-2' }),
    )
  })

  it('N-DEL-3: retorna PERMISSION_DENIED quando caller não é admin', async () => {
    const callerCustomerChain = makeChain({ data: { role: 'customer' }, error: null })

    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue({
      from: vi.fn().mockReturnValueOnce(callerCustomerChain),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.mocked(createServerSupabaseClient).mockResolvedValue(
      makeSessionClient('customer-1') as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>,
    )

    const result = await executeAccountDeletion('target-user-id')

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })
})
