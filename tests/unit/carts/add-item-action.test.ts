import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}))

import { addItem } from '@/lib/carts/actions'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const VALID_INPUT = {
  brandId: '00000000-0000-0000-0000-000000000001',
  productId: '00000000-0000-0000-0000-000000000002',
  color: 'Azul',
  size: 'M',
  quantity: 2,
  unitPriceBrl: 99.9,
}

function makeAuthClient(user: { id: string } | null) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user } }),
    },
  }
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('addItem', () => {
  it('P-AI-1: usuário autenticado + input válido passa auth e validação (stub retorna INTERNAL)', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthClient({ id: 'user-123' }),
    )

    const result = await addItem(VALID_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).not.toBe('PERMISSION_DENIED')
      expect(result.error.code).not.toBe('VALIDATION_ERROR')
      expect(result.error.code).toBe('INTERNAL')
    }
  })

  it('N-AI-1: retorna PERMISSION_DENIED quando usuário não autenticado', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthClient(null),
    )

    const result = await addItem(VALID_INPUT)

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('PERMISSION_DENIED')
    }
  })

  it('N-AI-2: retorna VALIDATION_ERROR quando input inválido (quantity: 0)', async () => {
    ;(createServerSupabaseClient as ReturnType<typeof vi.fn>).mockResolvedValue(
      makeAuthClient({ id: 'user-123' }),
    )

    const result = await addItem({ ...VALID_INPUT, quantity: 0 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error.code).toBe('VALIDATION_ERROR')
    }
  })
})
