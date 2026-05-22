import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin'

function getEncryptionSecret(): string {
  const secret = process.env.OPENROUTER_KEY_ENCRYPTION_SECRET
  if (!secret) throw new Error('OPENROUTER_KEY_ENCRYPTION_SECRET is not set')
  return secret
}

export async function encryptKey(plaintext: string): Promise<string> {
  const secret = getEncryptionSecret()
  const supabase = createServiceRoleSupabaseClient()
  const { data, error } = await supabase.rpc('pgp_encrypt_text', {
    p_plaintext: plaintext,
    p_secret: secret,
  })
  if (error) throw new Error(`Encryption failed: ${error.message}`)
  return data as string
}

export async function decryptKey(ciphertext: string): Promise<string> {
  const secret = getEncryptionSecret()
  const supabase = createServiceRoleSupabaseClient()
  const { data, error } = await supabase.rpc('pgp_decrypt_text', {
    p_ciphertext: ciphertext,
    p_secret: secret,
  })
  if (error) throw new Error(`Decryption failed: ${error.message}`)
  return data as string
}

export function maskKey(key: string): string {
  return `sk-or-...${key.slice(-4)}`
}
