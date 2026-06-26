import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/audit/log-event', () => ({
  logAuditEvent: vi.fn().mockResolvedValue(undefined),
}))

import {
  listAdminCustomers,
  inviteCustomer,
  grantBrandAccess,
  revokeBrandAccess,
  deactivateCustomer,
  acceptInviteTerms,
} from '@/lib/customers/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

// ---- fixtures ---------------------------------------------------------------

const ADMIN_ID = '00000000-0000-0000-0000-000000000001'
const CUSTOMER_ID = '00000000-0000-0000-0000-000000000002'
const BRAND_ID_A = '00000000-0000-0000-0000-000000000010'
const BRAND_ID_B = '00000000-0000-0000-0000-000000000011'

const MOCK_BRANDS = [
  { id: BRAND_ID_A, name: 'Marca Alpha' },
  { id: BRAND_ID_B, name: 'Marca Beta' },
]

const MOCK_ACCESSES = [
  { user_id: CUSTOMER_ID, brand_id: BRAND_ID_A, revoked_at: null },
]

const MOCK_PROFILE = {
  id: CUSTOMER_ID,
  full_name: 'Ana Silva',
  email: 'ana@loja.com',
  is_active: true,
  terms_accepted_at: null,
}

// ---- helpers ----------------------------------------------------------------

function makeAuthUser() {
  return { data: { user: { id: ADMIN_ID } } }
}

function makeNoAuth() {
  return { data: { user: null } }
}

function makeChain(result: unknown) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {}
  const fluent = ['select', 'eq', 'in', 'insert', 'update', 'upsert', 'delete', 'order']
  fluent.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(result)
  chain['maybeSingle'] = vi.fn().mockResolvedValue(result)
  // terminal resolving for insert/update/upsert
  fluent.forEach((m) => {
    if (['insert', 'update', 'upsert'].includes(m)) {
      // also resolve when nothing chains after
      const original = chain[m]
      chain[m] = vi.fn().mockImplementation((...args: unknown[]) => {
        const next = original(...args)
        // make the chain itself thenable (resolves to result)
        Object.assign(next, {
          then: (res: (v: unknown) => unknown) => Promise.resolve(result).then(res),
          catch: (rej: (e: unknown) => unknown) => Promise.resolve(result).catch(rej),
        })
        return next
      })
    }
  })
  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
})

// ---- listAdminCustomers -----------------------------------------------------

describe('listAdminCustomers', () => {
  it('P-CUST-1: retorna somente clientes cujas marcas pertencem ao admin autenticado', async () => {
    const brandsChain = makeChain({ data: MOCK_BRANDS, error: null })
    const accessChain = makeChain({ data: MOCK_ACCESSES, error: null })
    const profileChain = makeChain({ data: [MOCK_PROFILE], error: null })

    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') {
          return {
            select: vi.fn().mockResolvedValue({ data: MOCK_BRANDS, error: null }),
          }
        }
        if (table === 'user_brand_access') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockResolvedValue({ data: MOCK_ACCESSES, error: null }),
          }
        }
        if (table === 'users_profile') {
          return {
            select: vi.fn().mockReturnThis(),
            in: vi.fn().mockReturnThis(),
            eq: vi.fn().mockResolvedValue({ data: [MOCK_PROFILE], error: null }),
          }
        }
        return makeChain({ data: null, error: null })
      }),
    }

    const adminClient = {
      auth: {
        admin: {
          listUsers: vi.fn().mockResolvedValue({
            data: { users: [{ id: CUSTOMER_ID, last_sign_in_at: '2026-05-20T10:00:00Z' }] },
          }),
        },
      },
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await listAdminCustomers()

    expect(result.ok).toBe(true)
    if (!result.ok) return

    // Must only include customers from this admin's brands
    expect(result.data).toHaveLength(1)
    expect(result.data[0].id).toBe(CUSTOMER_ID)
    expect(result.data[0].last_sign_in_at).toBe('2026-05-20T10:00:00Z')
  })
})

// ---- inviteCustomer ---------------------------------------------------------

describe('inviteCustomer', () => {
  it('P-CUST-2: chama createUser com senha padrão e concede acesso a todas as marcas do admin por padrão', async () => {
    const brandAccessUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') {
          return { select: vi.fn().mockResolvedValue({ data: MOCK_BRANDS, error: null }) }
        }
        if (table === 'user_brand_access') {
          return { upsert: brandAccessUpsert }
        }
        return makeChain({ data: null, error: null })
      }),
    }

    const createUser = vi.fn().mockResolvedValue({
      data: { user: { id: CUSTOMER_ID } },
      error: null,
    })
    const usersProfileTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const adminClient = {
      auth: { admin: { createUser, listUsers: vi.fn(), updateUserById: vi.fn() } },
      from: vi.fn().mockImplementation((table: string) =>
        table === 'users_profile' ? usersProfileTable : { upsert: vi.fn() },
      ),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await inviteCustomer({
      email: 'ana@loja.com',
      fullName: 'Ana Silva',
      phone: '11999999999',
    })

    expect(createUser).toHaveBeenCalledOnce()
    const [opts] = createUser.mock.calls[0]
    expect(opts.email).toBe('ana@loja.com')
    expect(opts.password).toBe('123456')
    expect(opts.email_confirm).toBe(true)
    expect(opts.user_metadata).toEqual({ full_name: 'Ana Silva' })

    expect(usersProfileTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: CUSTOMER_ID, phone: '11999999999' }),
      { onConflict: 'id' },
    )

    expect(brandAccessUpsert).toHaveBeenCalledOnce()
    const [rows] = brandAccessUpsert.mock.calls[0]
    expect(rows.map((r: { brand_id: string }) => r.brand_id).sort()).toEqual(
      [BRAND_ID_A, BRAND_ID_B].sort(),
    )

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.userId).toBe(CUSTOMER_ID)
    expect(result.data.defaultPassword).toBe('123456')
  })

  it('P-CUST-6: retorna CONFLICT quando o e-mail já tem users_profile (duplicata real)', async () => {
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue(makeChain({ data: null, error: null })),
    }

    const createUser = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
    })
    const usersProfileTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: { id: CUSTOMER_ID }, error: null }),
    }
    const adminClient = {
      auth: { admin: { createUser, listUsers: vi.fn(), updateUserById: vi.fn() } },
      from: vi.fn().mockImplementation((table: string) =>
        table === 'users_profile' ? usersProfileTable : { upsert: vi.fn() },
      ),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await inviteCustomer({ email: 'ana@loja.com', fullName: 'Ana Silva' })

    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('CONFLICT')
  })

  it('P-CUST-7: recupera usuário órfão em auth.users (sem users_profile) e completa o convite', async () => {
    const ORPHAN_ID = '00000000-0000-0000-0000-000000000099'
    const brandAccessUpsert = vi.fn().mockResolvedValue({ data: null, error: null })
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'brands') {
          return { select: vi.fn().mockResolvedValue({ data: MOCK_BRANDS, error: null }) }
        }
        if (table === 'user_brand_access') {
          return { upsert: brandAccessUpsert }
        }
        return makeChain({ data: null, error: null })
      }),
    }

    const createUser = vi.fn().mockResolvedValue({
      data: null,
      error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
    })
    const listUsers = vi.fn().mockResolvedValue({
      data: { users: [{ id: ORPHAN_ID, email: 'orfao@loja.com' }] },
      error: null,
    })
    const updateUserById = vi.fn().mockResolvedValue({ data: { user: { id: ORPHAN_ID } }, error: null })
    const usersProfileTable = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      upsert: vi.fn().mockResolvedValue({ data: null, error: null }),
    }
    const adminClient = {
      auth: { admin: { createUser, listUsers, updateUserById } },
      from: vi.fn().mockImplementation((table: string) =>
        table === 'users_profile' ? usersProfileTable : { upsert: vi.fn() },
      ),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)
    vi.mocked(createServiceRoleSupabaseClient).mockReturnValue(adminClient as never)

    const result = await inviteCustomer({ email: 'orfao@loja.com', fullName: 'Órfão Recuperado' })

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.data.userId).toBe(ORPHAN_ID)
    expect(updateUserById).toHaveBeenCalledWith(ORPHAN_ID, {
      password: '123456',
      email_confirm: true,
    })
    expect(usersProfileTable.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ id: ORPHAN_ID }),
      { onConflict: 'id' },
    )
  })
})

// ---- grantBrandAccess -------------------------------------------------------

describe('grantBrandAccess', () => {
  it('P-CUST-3: insere em user_brand_access com granted_by = auth.uid()', async () => {
    const upsertFn = vi.fn().mockResolvedValue({ data: null, error: null })

    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue({ upsert: upsertFn }),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    await grantBrandAccess(CUSTOMER_ID, BRAND_ID_A)

    expect(upsertFn).toHaveBeenCalledOnce()
    const [row] = upsertFn.mock.calls[0]
    expect(row.user_id).toBe(CUSTOMER_ID)
    expect(row.brand_id).toBe(BRAND_ID_A)
    expect(row.granted_by).toBe(ADMIN_ID)
    expect(row.revoked_at).toBeNull()
  })
})

// ---- revokeBrandAccess ------------------------------------------------------

describe('revokeBrandAccess', () => {
  it('P-CUST-4: atualiza revoked_at = now() sem deletar o registro', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateChain = {
      eq: vi.fn().mockReturnValue({ eq: eqFn }),
    }
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) }),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    await revokeBrandAccess(CUSTOMER_ID, BRAND_ID_A)

    // verify update was called (not delete)
    expect(serverClient.from).toHaveBeenCalledWith('user_brand_access')
    const updateFn = serverClient.from.mock.results[0].value.update
    const updateArg = updateFn.mock.calls[0][0]
    expect(updateArg).toHaveProperty('revoked_at')
    expect(typeof updateArg.revoked_at).toBe('string')
  })
})

// ---- deactivateCustomer -----------------------------------------------------

describe('deactivateCustomer', () => {
  it('P-CUST-5: seta is_active = false sem deletar o usuário', async () => {
    const eqFn = vi.fn().mockResolvedValue({ data: null, error: null })
    const updateChain = {
      eq: vi.fn().mockReturnValue({ eq: eqFn }),
    }
    const serverClient = {
      auth: { getUser: vi.fn().mockResolvedValue(makeAuthUser()) },
      from: vi.fn().mockReturnValue({ update: vi.fn().mockReturnValue(updateChain) }),
    }

    vi.mocked(createServerSupabaseClient).mockResolvedValue(serverClient as never)

    await deactivateCustomer(CUSTOMER_ID)

    expect(serverClient.from).toHaveBeenCalledWith('users_profile')
    const updateFn = serverClient.from.mock.results[0].value.update
    expect(updateFn).toHaveBeenCalledWith({ is_active: false })
  })
})

// ---- PERMISSION_DENIED ------------------------------------------------------

describe('N-CUST-1: PERMISSION_DENIED quando user é null', () => {
  const noAuthClient = {
    auth: { getUser: vi.fn().mockResolvedValue(makeNoAuth()) },
    from: vi.fn(),
  }

  beforeEach(() => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue(noAuthClient as never)
  })

  it('listAdminCustomers retorna PERMISSION_DENIED', async () => {
    const result = await listAdminCustomers()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('inviteCustomer retorna PERMISSION_DENIED', async () => {
    const result = await inviteCustomer({ email: 'x@x.com', fullName: 'X' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('grantBrandAccess retorna PERMISSION_DENIED', async () => {
    const result = await grantBrandAccess(CUSTOMER_ID, BRAND_ID_A)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('revokeBrandAccess retorna PERMISSION_DENIED', async () => {
    const result = await revokeBrandAccess(CUSTOMER_ID, BRAND_ID_A)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('deactivateCustomer retorna PERMISSION_DENIED', async () => {
    const result = await deactivateCustomer(CUSTOMER_ID)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })

  it('acceptInviteTerms retorna PERMISSION_DENIED', async () => {
    const result = await acceptInviteTerms()
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error.code).toBe('PERMISSION_DENIED')
  })
})
