import { describe, it, expect, vi, beforeEach } from 'vitest'

const { mockRpc } = vi.hoisted(() => ({
  mockRpc: vi.fn(),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createServiceRoleSupabaseClient: vi.fn(() => ({
    rpc: mockRpc,
  })),
}))

vi.stubEnv('OPENROUTER_KEY_ENCRYPTION_SECRET', 'test-secret-at-least-32-characters-long!!')
vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://test.supabase.co')
vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'test-service-role-key')

import { maskKey, encryptKey, decryptKey } from '@/lib/openrouter/crypto'

describe('maskKey', () => {
  it('mascara chave retornando últimos 4 chars', () => {
    // 'sk-or-v1-abc123xyz' → últimos 4: '3xyz'
    expect(maskKey('sk-or-v1-abc123xyz')).toBe('sk-or-...3xyz')
  })

  it('retorna sk-or-... + últimos 4 chars', () => {
    const key = 'sk-or-v1-1234abcdEFGH'
    expect(maskKey(key)).toBe('sk-or-...EFGH')
  })

  it('funciona com qualquer string sem crash', () => {
    expect(maskKey('short')).toBe('sk-or-...hort')
    expect(maskKey('')).toBe('sk-or-...')
  })

  it('mascara chave real corretamente', () => {
    const key = 'sk-or-v1-abcdef1234567890xyz9'
    expect(maskKey(key)).toBe('sk-or-...xyz9')
  })
})

describe('encryptKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chama rpc com pgp_encrypt_text e parâmetros corretos', async () => {
    mockRpc.mockResolvedValue({ data: 'encrypted-base64', error: null })

    const result = await encryptKey('sk-or-test-key')

    expect(mockRpc).toHaveBeenCalledWith('pgp_encrypt_text', {
      p_plaintext: 'sk-or-test-key',
      p_secret: 'test-secret-at-least-32-characters-long!!',
    })
    expect(result).toBe('encrypted-base64')
  })

  it('lança erro se rpc retornar error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'DB error' } })

    await expect(encryptKey('sk-or-key')).rejects.toThrow('Encryption failed: DB error')
  })
})

describe('decryptKey', () => {
  beforeEach(() => vi.clearAllMocks())

  it('chama rpc com pgp_decrypt_text e parâmetros corretos', async () => {
    mockRpc.mockResolvedValue({ data: 'sk-or-plaintext-key', error: null })

    const result = await decryptKey('encrypted-base64-data')

    expect(mockRpc).toHaveBeenCalledWith('pgp_decrypt_text', {
      p_ciphertext: 'encrypted-base64-data',
      p_secret: 'test-secret-at-least-32-characters-long!!',
    })
    expect(result).toBe('sk-or-plaintext-key')
  })

  it('lança erro se rpc retornar error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'decrypt failed' } })

    await expect(decryptKey('bad-data')).rejects.toThrow('Decryption failed: decrypt failed')
  })
})
