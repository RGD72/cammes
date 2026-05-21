import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockSignIn, mockGetUser, mockFrom, mockCheckRateLimit, mockRecordFailure, mockResetOnSuccess } =
  vi.hoisted(() => ({
    mockSignIn: vi.fn(),
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
    mockCheckRateLimit: vi.fn(() => false),
    mockRecordFailure: vi.fn(),
    mockResetOnSuccess: vi.fn(),
  }))

vi.mock('next/navigation', () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`)
  }),
}))

vi.mock('next/headers', () => ({
  cookies: vi.fn(() =>
    Promise.resolve({
      getAll: vi.fn(() => []),
      set: vi.fn(),
    }),
  ),
  headers: vi.fn(() =>
    Promise.resolve({
      get: vi.fn((name: string) => {
        if (name === 'x-forwarded-for') return '1.2.3.4'
        return null
      }),
    }),
  ),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      signInWithPassword: mockSignIn,
      getUser: mockGetUser,
      signOut: vi.fn(() => Promise.resolve({ error: null })),
    },
    from: mockFrom,
  })),
}))

vi.mock('@/lib/auth/rate-limit', () => ({
  checkRateLimit: mockCheckRateLimit,
  recordFailure: mockRecordFailure,
  resetOnSuccess: mockResetOnSuccess,
}))

import { loginAction } from '@/lib/auth/actions'

describe('loginAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockCheckRateLimit.mockReturnValue(false)
  })

  function makeFormData(email: string, password: string): FormData {
    const fd = new FormData()
    fd.set('email', email)
    fd.set('password', password)
    return fd
  }

  it('retorna erro com credenciais inválidas', async () => {
    mockSignIn.mockResolvedValue({ error: { message: 'Invalid credentials' } })

    const result = await loginAction(undefined, makeFormData('wrong@email.com', 'wrongpass'))

    expect(result).toEqual({ error: 'Credenciais inválidas. Verifique e-mail e senha.' })
    expect(mockRecordFailure).toHaveBeenCalledWith('1.2.3.4')
  })

  it('retorna erro 429 quando rate limit ativo', async () => {
    mockCheckRateLimit.mockReturnValue(true)

    const result = await loginAction(undefined, makeFormData('test@email.com', 'pass'))

    expect(result).toEqual({
      error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.',
      status: 429,
    })
    expect(mockSignIn).not.toHaveBeenCalled()
  })

  it('redireciona admin para /admin após login bem-sucedido', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'admin-uuid' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'admin' }, error: null }),
        }),
      }),
    })

    await expect(
      loginAction(undefined, makeFormData('admin@test.com', 'pass')),
    ).rejects.toThrow('REDIRECT:/admin')
    expect(mockResetOnSuccess).toHaveBeenCalledWith('1.2.3.4')
  })

  it('redireciona customer para /brands após login bem-sucedido', async () => {
    mockSignIn.mockResolvedValue({ error: null })
    mockGetUser.mockResolvedValue({ data: { user: { id: 'customer-uuid' } } })
    mockFrom.mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { role: 'customer' }, error: null }),
        }),
      }),
    })

    await expect(
      loginAction(undefined, makeFormData('customer@test.com', 'pass')),
    ).rejects.toThrow('REDIRECT:/brands')
    expect(mockResetOnSuccess).toHaveBeenCalledWith('1.2.3.4')
  })
})
