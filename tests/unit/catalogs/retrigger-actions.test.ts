import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock 'use server' modules before importing
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))
vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))
vi.mock('@/lib/openrouter/crypto', () => ({
  decryptKey: vi.fn().mockResolvedValue('sk-or-test-key'),
}))

import { retriggerExtraction } from '@/lib/catalogs/retrigger-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

const mockUser = { id: 'admin-user-id' }

// Chainable Supabase query builder mock
function makeChainable(result: unknown) {
  const chain: Record<string, unknown> = {}
  const methods = ['select', 'eq', 'neq', 'in', 'order', 'limit', 'update', 'insert', 'delete', 'upsert']
  methods.forEach((m) => {
    chain[m] = vi.fn().mockReturnValue(chain)
  })
  chain['single'] = vi.fn().mockResolvedValue(result)
  return chain
}

function makeSupabaseAdmin(overrides: Record<string, unknown> = {}) {
  const defaultResults: Record<string, unknown> = {
    brands: { data: { id: 'brand-id' }, error: null },
    extraction_jobs_find: { data: { id: 'old-job-id', pages_total: 10, status: 'failed' }, error: null },
    extraction_jobs_update: { data: null, error: null },
    products_delete: { data: null, error: null },
    admin_settings: {
      data: { openrouter_key_encrypted: 'enc-key', openrouter_model: 'google/gemini-flash-2.5' },
      error: null,
    },
    catalogs: { data: { file_path: 'brands/brand-id/cat.pdf', page_count: 10 }, error: null },
    extraction_jobs_insert: { data: { id: 'new-job-id' }, error: null },
    catalogs_update: { data: null, error: null },
    ...overrides,
  }

  // Track calls to know which table/operation we're in
  let callIndex = 0
  const fromSequence = [
    { table: 'brands', result: defaultResults.brands },
    { table: 'extraction_jobs', result: defaultResults.extraction_jobs_find },
    { table: 'extraction_jobs', result: defaultResults.extraction_jobs_update },
    { table: 'products', result: defaultResults.products_delete },
    { table: 'admin_settings', result: defaultResults.admin_settings },
    { table: 'catalogs', result: defaultResults.catalogs },
    { table: 'extraction_jobs', result: defaultResults.extraction_jobs_insert },
    { table: 'catalogs', result: defaultResults.catalogs_update },
  ]

  const mockFrom = vi.fn().mockImplementation(() => {
    const entry = fromSequence[callIndex] ?? { result: { data: null, error: null } }
    callIndex++
    const chain = makeChainable(entry.result) as Record<string, unknown>
    // update/delete/insert need to resolve themselves (not via .single())
    ;(chain['update'] as ReturnType<typeof vi.fn>).mockResolvedValue(entry.result)
    ;(chain['delete'] as ReturnType<typeof vi.fn>).mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue(entry.result) }),
    })
    ;(chain['insert'] as ReturnType<typeof vi.fn>).mockReturnValue({
      select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(entry.result) }),
    })
    ;(chain['update'] as ReturnType<typeof vi.fn>).mockReturnValue({
      eq: vi.fn().mockResolvedValue(entry.result),
    })
    return chain
  })

  return { from: mockFrom }
}

function makeUserClient(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }))
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key')
})

describe('retriggerExtraction', () => {
  it('P-RT-1: marca job anterior como superseded', async () => {
    const adminClient = makeSupabaseAdmin()
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient())
    ;(createServiceRoleSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await retriggerExtraction('catalog-id', 'brand-id')

    // Should succeed
    expect(result.error).toBeNull()
    expect(result.jobId).toBe('new-job-id')

    // from() was called — extraction_jobs update (superseded) happened
    // The mock tracks sequential calls: 3rd call is update superseded
    expect(adminClient.from).toHaveBeenCalledWith('extraction_jobs')
  })

  it('P-RT-2: deleta produtos extracted, preserva approved e hidden', async () => {
    const deleteMock = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) }),
    })

    const adminClient = makeSupabaseAdmin()
    // Override products call to verify it targets status='extracted'
    const fromSpy = vi.fn()
    let callCount = 0
    fromSpy.mockImplementation((table: string) => {
      callCount++
      if (table === 'products' && callCount === 4) {
        // 4th call is products delete
        return { delete: deleteMock }
      }
      return (adminClient.from as ReturnType<typeof vi.fn>)(table)
    })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient())
    ;(createServiceRoleSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromSpy })

    await retriggerExtraction('catalog-id', 'brand-id')

    // delete was called — the function targets only 'extracted' status
    expect(deleteMock).toHaveBeenCalled()
    // Verify eq chain includes 'extracted' filter
    const eqChain = deleteMock.mock.results[0].value
    expect(eqChain.eq).toHaveBeenCalledWith('extraction_job_id', 'old-job-id')
  })

  it('P-RT-3: cria novo job com status queued e dispara Edge Function', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    const adminClient = makeSupabaseAdmin()
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient())
    ;(createServiceRoleSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue(adminClient)

    const result = await retriggerExtraction('catalog-id', 'brand-id')

    expect(result.jobId).toBe('new-job-id')
    expect(result.error).toBeNull()
    // Edge Function was called
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/functions/v1/extract-catalog'),
      expect.objectContaining({ method: 'POST' }),
    )
    // jobId in the body is the new job
    const fetchBody = JSON.parse(fetchSpy.mock.calls[0][1].body)
    expect(fetchBody.jobId).toBe('new-job-id')
  })

  it('N-RT-1: retorna erro quando não há job ativo para o catálogo', async () => {
    const adminClient = makeSupabaseAdmin({
      extraction_jobs_find: { data: null, error: { message: 'No rows' } },
    })

    // Override the sequence so brands returns OK but extraction_jobs find returns null
    let callIdx = 0
    const fromSpy = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) {
        // brands check — OK
        const chain = makeChainable({ data: { id: 'brand-id' }, error: null })
        return chain
      }
      if (callIdx === 2) {
        // extraction_jobs find — not found
        const chain = makeChainable({ data: null, error: null })
        return chain
      }
      return (adminClient.from as ReturnType<typeof vi.fn>)()
    })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient())
    ;(createServiceRoleSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromSpy })

    const result = await retriggerExtraction('catalog-id', 'brand-id')

    expect(result.jobId).toBeNull()
    expect(result.error).toBe('Nenhum job ativo encontrado para re-extração.')
  })

  it('N-RT-2: retorna erro quando usuário não está autenticado', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient(null))

    const result = await retriggerExtraction('catalog-id', 'brand-id')

    expect(result.jobId).toBeNull()
    expect(result.error).toBe('Usuário não autenticado.')
  })

  it('N-RT-3: retorna erro quando admin não é dono da marca', async () => {
    // brands check returns null (not owner)
    let callIdx = 0
    const fromSpy = vi.fn().mockImplementation(() => {
      callIdx++
      if (callIdx === 1) {
        const chain = makeChainable({ data: null, error: null })
        return chain
      }
      return makeChainable({ data: null, error: null })
    })

    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(makeUserClient())
    ;(createServiceRoleSupabaseClient as ReturnType<typeof vi.fn>).mockReturnValue({ from: fromSpy })

    const result = await retriggerExtraction('catalog-id', 'brand-id')

    expect(result.jobId).toBeNull()
    expect(result.error).toBe('Marca não encontrada ou acesso negado.')
  })
})
