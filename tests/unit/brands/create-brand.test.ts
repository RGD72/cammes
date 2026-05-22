import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockFrom, mockGetUser } = vi.hoisted(() => ({
  mockFrom: vi.fn(),
  mockGetUser: vi.fn(),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn().mockResolvedValue({
    auth: { getUser: mockGetUser },
    from: mockFrom,
  }),
}))

vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'test-anon-key')

import { createBrand } from '@/lib/brands/actions'

function makeInsertChain(result: { data: unknown; error: unknown }) {
  const single = vi.fn().mockResolvedValue(result)
  const select = vi.fn().mockReturnValue({ single })
  const insert = vi.fn().mockReturnValue({ select })
  return { insert, select, single }
}

describe('createBrand', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-uuid-123' } } })
  })

  it('retorna erro para slug inválido com caracteres especiais', async () => {
    const result = await createBrand({ name: 'Minha Marca', slug: 'Marca@Inválida' })
    expect(result.brand).toBeNull()
    expect(result.error).toMatch(/slug inválido/i)
  })

  it('retorna erro para slug vazio', async () => {
    const result = await createBrand({ name: 'Minha Marca', slug: '' })
    expect(result.brand).toBeNull()
    expect(result.error).toBeTruthy()
  })

  it('retorna erro quando slug está duplicado (código 23505)', async () => {
    const chain = makeInsertChain({ data: null, error: { code: '23505', message: 'duplicate key' } })
    mockFrom.mockReturnValue(chain)

    const result = await createBrand({ name: 'Minha Marca', slug: 'minha-marca' })
    expect(result.brand).toBeNull()
    expect(result.error).toMatch(/já está em uso/i)
  })

  it('retorna brand criado com sucesso', async () => {
    const fakeBrand = {
      id: 'brand-uuid-1',
      name: 'Minha Marca',
      slug: 'minha-marca',
      description: null,
      logo_url: null,
      published: false,
      owner_admin_id: 'admin-uuid-123',
      published_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    const chain = makeInsertChain({ data: fakeBrand, error: null })
    mockFrom.mockReturnValue(chain)

    const result = await createBrand({ name: 'Minha Marca', slug: 'minha-marca' })
    expect(result.error).toBeNull()
    expect(result.brand).toMatchObject({ id: 'brand-uuid-1', slug: 'minha-marca' })
  })

  it('retorna erro quando usuário não está autenticado', async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } })

    const result = await createBrand({ name: 'Minha Marca', slug: 'minha-marca' })
    expect(result.brand).toBeNull()
    expect(result.error).toMatch(/não autenticado/i)
  })

  it('retorna erro genérico para outros erros do banco', async () => {
    const chain = makeInsertChain({ data: null, error: { code: '23503', message: 'FK violation' } })
    mockFrom.mockReturnValue(chain)

    const result = await createBrand({ name: 'Minha Marca', slug: 'minha-marca' })
    expect(result.brand).toBeNull()
    expect(result.error).toMatch(/erro ao criar/i)
  })
})
