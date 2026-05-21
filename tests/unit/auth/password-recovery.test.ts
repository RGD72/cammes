import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockResetPasswordForEmail, mockUpdateUser, mockSignOut, mockGetUser, mockFrom } =
  vi.hoisted(() => ({
    mockResetPasswordForEmail: vi.fn(),
    mockUpdateUser: vi.fn(),
    mockSignOut: vi.fn(),
    mockGetUser: vi.fn(),
    mockFrom: vi.fn(),
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
        if (name === 'origin') return 'http://localhost:3000'
        return null
      }),
    }),
  ),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      resetPasswordForEmail: mockResetPasswordForEmail,
      updateUser: mockUpdateUser,
      signOut: mockSignOut,
      getUser: mockGetUser,
    },
    from: mockFrom,
  })),
}))

import { requestPasswordResetAction, updatePasswordAction } from '@/lib/auth/actions'

describe('requestPasswordResetAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockResetPasswordForEmail.mockResolvedValue({ error: null })
  })

  function makeFormData(email: string): FormData {
    const fd = new FormData()
    fd.set('email', email)
    return fd
  }

  it('chama resetPasswordForEmail com o e-mail correto e redirectTo correto', async () => {
    const result = await requestPasswordResetAction(undefined, makeFormData('user@test.com'))

    expect(mockResetPasswordForEmail).toHaveBeenCalledWith(
      'user@test.com',
      expect.objectContaining({
        redirectTo: expect.stringContaining('/auth/callback'),
      }),
    )
    expect(result.success).toBeTruthy()
    expect(result.error).toBeUndefined()
  })

  it('retorna mensagem genérica mesmo quando Supabase retorna erro (anti-enumeration)', async () => {
    mockResetPasswordForEmail.mockResolvedValue({ error: { message: 'User not found' } })

    const result = await requestPasswordResetAction(
      undefined,
      makeFormData('notexists@test.com'),
    )

    expect(result.success).toBe(
      'Se esse e-mail estiver cadastrado, você receberá um link em breve.',
    )
    expect(result.error).toBeUndefined()
  })
})

describe('updatePasswordAction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUpdateUser.mockResolvedValue({ error: null })
    mockSignOut.mockResolvedValue({ error: null })
  })

  function makeFormData(password: string, confirmPassword: string): FormData {
    const fd = new FormData()
    fd.set('password', password)
    fd.set('confirmPassword', confirmPassword)
    return fd
  }

  it('retorna erro quando senha tem menos de 8 caracteres', async () => {
    const result = await updatePasswordAction(undefined, makeFormData('abc123', 'abc123'))

    expect(result).toEqual({ error: 'Senha deve ter no mínimo 8 caracteres.' })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('retorna erro quando as senhas não coincidem', async () => {
    const result = await updatePasswordAction(
      undefined,
      makeFormData('senha12345', 'senha99999'),
    )

    expect(result).toEqual({ error: 'As senhas não coincidem.' })
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('chama signOut e redireciona para /login após redefinição bem-sucedida', async () => {
    await expect(
      updatePasswordAction(undefined, makeFormData('senha12345', 'senha12345')),
    ).rejects.toThrow('REDIRECT:/login?message=password_updated')

    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'senha12345' })
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('retorna erro quando Supabase falha ao atualizar senha', async () => {
    mockUpdateUser.mockResolvedValue({ error: { message: 'Token expired' } })

    const result = await updatePasswordAction(
      undefined,
      makeFormData('senha12345', 'senha12345'),
    )

    expect(result).toEqual({ error: 'Erro ao redefinir senha. O link pode ter expirado.' })
    expect(mockSignOut).not.toHaveBeenCalled()
  })
})
