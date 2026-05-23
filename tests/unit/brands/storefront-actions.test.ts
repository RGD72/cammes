import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { getBrandBySlug } from '@/lib/brands/actions'
import { getCatalogSignedUrl } from '@/lib/catalogs/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const mockUser = { id: 'customer-user-id' }

function makeUserClient(user: typeof mockUser | null = mockUser) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

function makeSlugChain(data: Record<string, unknown> | null, error: { code: string } | null = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error })
  const eqFn = vi.fn().mockReturnValue({ single: singleFn })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  return { select: selectFn }
}

function makeCatalogChain(data: { file_path: string } | null, error: { message: string } | null = null) {
  const singleFn = vi.fn().mockResolvedValue({ data, error })
  const eqFn = vi.fn().mockReturnValue({ single: singleFn })
  const selectFn = vi.fn().mockReturnValue({ eq: eqFn })
  return { select: selectFn }
}

function makeStorageChain(signedUrl: string | null, error: { message: string } | null = null) {
  const createSignedUrlFn = vi.fn().mockResolvedValue({
    data: signedUrl ? { signedUrl } : null,
    error,
  })
  const fromFn = vi.fn().mockReturnValue({ createSignedUrl: createSignedUrlFn })
  return { from: fromFn }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('getBrandBySlug', () => {
  it('P-GSB-1: retorna marca quando slug válido e RLS permite', async () => {
    const brandData = { id: 'brand-1', slug: 'my-brand', name: 'Minha Marca', published: true }
    const fromMock = vi.fn().mockReturnValue(makeSlugChain(brandData))
    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getBrandBySlug('my-brand')

    expect(result).not.toBeNull()
    expect(result?.slug).toBe('my-brand')
    expect(result?.id).toBe('brand-1')
  })

  it('N-GSB-1: retorna null quando marca não encontrada (PGRST116)', async () => {
    const fromMock = vi.fn().mockReturnValue(makeSlugChain(null, { code: 'PGRST116' }))
    const client = { ...makeUserClient(), from: fromMock }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getBrandBySlug('slug-inexistente')

    expect(result).toBeNull()
  })
})

describe('getCatalogSignedUrl', () => {
  it('P-PDF-1: retorna URL assinada quando catálogo existe e usuário autenticado', async () => {
    const signedUrl = 'https://supabase.co/storage/v1/object/sign/catalogs/path.pdf?token=abc'
    const catalogData = { file_path: 'brand-1/catalog.pdf' }
    const fromMock = vi.fn().mockReturnValue(makeCatalogChain(catalogData))
    const storage = makeStorageChain(signedUrl)
    const client = { ...makeUserClient(), from: fromMock, storage }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getCatalogSignedUrl('cat-1')

    expect(result.error).toBeNull()
    expect(result.url).toBe(signedUrl)
  })

  it('N-PDF-1: retorna erro quando usuário não autenticado', async () => {
    const client = { ...makeUserClient(null), from: vi.fn(), storage: makeStorageChain(null) }
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(client)

    const result = await getCatalogSignedUrl('cat-1')

    expect(result.url).toBeNull()
    expect(result.error).toContain('não autenticado')
  })
})
