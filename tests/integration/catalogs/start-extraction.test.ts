import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock next/headers antes de qualquer import que dependa de Next.js
vi.mock('next/headers', () => ({
  cookies: vi.fn().mockResolvedValue({ getAll: () => [], set: vi.fn() }),
}))

// Tipos do mock do supabase para reutilização
type SupabaseMockRow = Record<string, unknown>

function makeSupabaseMock(overrides: {
  settingsRow?: SupabaseMockRow | null
  catalogRow?: SupabaseMockRow | null
  jobInsertId?: string | null
  jobInsertError?: { message: string } | null
}) {
  const { settingsRow, catalogRow, jobInsertId, jobInsertError } = overrides

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'admin_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: settingsRow ?? null }),
        }
      }
      if (table === 'catalogs') {
        const catalogSelectChain = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: catalogRow ?? null }),
          update: vi.fn().mockReturnThis(),
        }
        // update chain
        const updateChain = {
          update: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
        return {
          select: () => catalogSelectChain,
          update: () => updateChain.update(),
        }
      }
      if (table === 'extraction_jobs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: jobInsertId ? { id: jobInsertId } : null,
                error: jobInsertError ?? null,
              }),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }
      }
      return {}
    }),
  }
}

// Mocks de módulos
vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(),
}))

vi.mock('@/lib/openrouter/crypto', () => ({
  decryptKey: vi.fn().mockResolvedValue('sk-or-decrypted-test-key'),
}))

import { startExtractionJob } from '@/lib/catalogs/extraction-actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

const mockCreateServerClient = vi.mocked(createServerSupabaseClient)
const mockCreateServiceRoleClient = vi.mocked(createServiceRoleSupabaseClient)

const TEST_ADMIN_ID = 'admin-uuid-test'
const TEST_CATALOG_ID = 'catalog-uuid-test'
const TEST_BRAND_ID = 'brand-uuid-test'
const TEST_JOB_ID = 'job-uuid-test'
const TEST_FILE_PATH = 'brand-uuid-test/catalog.pdf'

function setupAuthMock() {
  mockCreateServerClient.mockResolvedValue({
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: TEST_ADMIN_ID } } }),
    },
  } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://localhost:54321')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key-test')
})

describe('startExtractionJob — happy path (fetch 200)', () => {
  it('cria extraction_job com status queued e retorna jobId', async () => {
    setupAuthMock()

    const supabaseMock = makeSupabaseMock({
      settingsRow: { openrouter_key_encrypted: 'encrypted-key', openrouter_model: 'google/gemini-2.5-flash' },
      catalogRow: { file_path: TEST_FILE_PATH },
      jobInsertId: TEST_JOB_ID,
    })
    // Para a atualização de catalogs.status, precisamos de um mock mais flexível
    const catalogUpdateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    ;(supabaseMock.from as ReturnType<typeof vi.fn>).mockImplementation((table: string) => {
      if (table === 'admin_settings') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({
            data: { openrouter_key_encrypted: 'encrypted-key', openrouter_model: 'google/gemini-2.5-flash' },
          }),
        }
      }
      if (table === 'catalogs') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { file_path: TEST_FILE_PATH } }),
            }),
          }),
          update: catalogUpdateMock,
        }
      }
      if (table === 'extraction_jobs') {
        return {
          insert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({ data: { id: TEST_JOB_ID }, error: null }),
            }),
          }),
          delete: vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) }),
        }
      }
      return {}
    })

    mockCreateServiceRoleClient.mockReturnValue(supabaseMock as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    const result = await startExtractionJob(TEST_CATALOG_ID, TEST_BRAND_ID, 10)

    expect(result.jobId).toBe(TEST_JOB_ID)
    expect(result.error).toBeNull()

    // Verifica que fetch foi chamado para a Edge Function
    expect(fetchMock).toHaveBeenCalledOnce()
    const [url, opts] = fetchMock.mock.calls[0] as [string, RequestInit & { headers: Record<string, string> }]
    expect(url).toContain('/functions/v1/extract-catalog')
    expect(opts.headers['X-OpenRouter-Key']).toBe('sk-or-decrypted-test-key')
    const body = JSON.parse(opts.body as string)
    expect(body.jobId).toBe(TEST_JOB_ID)
    expect(body.pagesTotal).toBe(10)
  })
})

describe('startExtractionJob — Edge Function retorna 500', () => {
  it('retorna error e reverte catalogs.status para awaiting_extraction', async () => {
    setupAuthMock()

    const jobDeleteMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })
    const catalogUpdateMock = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({ error: null }) })

    mockCreateServiceRoleClient.mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'admin_settings') {
          return {
            select: vi.fn().mockReturnThis(),
            eq: vi.fn().mockReturnThis(),
            single: vi.fn().mockResolvedValue({
              data: { openrouter_key_encrypted: 'encrypted-key', openrouter_model: null },
            }),
          }
        }
        if (table === 'catalogs') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { file_path: TEST_FILE_PATH } }),
              }),
            }),
            update: catalogUpdateMock,
          }
        }
        if (table === 'extraction_jobs') {
          return {
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: { id: TEST_JOB_ID }, error: null }),
              }),
            }),
            delete: jobDeleteMock,
          }
        }
        return {}
      }),
    } as unknown as ReturnType<typeof createServiceRoleSupabaseClient>)

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 500 }))

    const result = await startExtractionJob(TEST_CATALOG_ID, TEST_BRAND_ID, 5)

    expect(result.jobId).toBeNull()
    expect(result.error).toBe('Não foi possível iniciar a extração.')

    // Verifica rollback do job
    expect(jobDeleteMock).toHaveBeenCalled()

    // Verifica que catalogs.status foi revertido para awaiting_extraction
    const updateCalls = catalogUpdateMock.mock.calls as Array<[Record<string, unknown>]>
    const rollbackCall = updateCalls.find((call) => call[0]?.status === 'awaiting_extraction')
    expect(rollbackCall).toBeDefined()
  })
})

describe('startExtractionJob — usuário não autenticado', () => {
  it('retorna error sem tocar no banco', async () => {
    mockCreateServerClient.mockResolvedValue({
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
      },
    } as unknown as Awaited<ReturnType<typeof createServerSupabaseClient>>)

    const result = await startExtractionJob(TEST_CATALOG_ID, TEST_BRAND_ID, 3)

    expect(result.jobId).toBeNull()
    expect(result.error).toBe('Usuário não autenticado.')
    expect(mockCreateServiceRoleClient).not.toHaveBeenCalled()
  })
})
