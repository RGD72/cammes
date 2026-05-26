'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, recordFailure, resetOnSuccess } from '@/lib/auth/rate-limit'
import { logAuditEvent } from '@/lib/audit/log-event'
import type { UserRole } from '@/lib/types'

export async function loginAction(_prevState: unknown, formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  const headersList = await headers()
  const ip =
    headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    headersList.get('x-real-ip') ??
    '127.0.0.1'

  if (checkRateLimit(ip)) {
    return { error: 'Muitas tentativas. Aguarde 1 minuto e tente novamente.', status: 429 }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    recordFailure(ip)
    await logAuditEvent('login_failed', { email })
    return { error: 'Credenciais inválidas. Verifique e-mail e senha.' }
  }

  resetOnSuccess(ip)

  // Usa users_profile_self_read policy (id = auth.uid()) — sem recursão SEC-001
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Erro ao obter sessão. Tente novamente.' }
  }

  const { data: profile } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', user.id)
    .single()

  const role: UserRole = profile?.role ?? 'customer'
  await logAuditEvent('login_success', { userId: user.id, email })
  redirect(role === 'admin' ? '/admin' : '/brands')
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  await logAuditEvent('logout', { userId: user?.id ?? null })
  await supabase.auth.signOut()
  redirect('/login')
}

export async function requestPasswordResetAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string; success?: string }> {
  const email = formData.get('email') as string
  const headersList = await headers()
  const origin =
    headersList.get('origin') ?? process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const supabase = await createServerSupabaseClient()
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${origin}/auth/callback?next=/reset-password`,
  })

  // Sempre retorna sucesso — não revela se o e-mail existe (anti-enumeration)
  return { success: 'Se esse e-mail estiver cadastrado, você receberá um link em breve.' }
}

export async function updatePasswordAction(
  _prevState: unknown,
  formData: FormData,
): Promise<{ error?: string }> {
  const password = formData.get('password') as string
  const confirmPassword = formData.get('confirmPassword') as string

  if (password.length < 8) {
    return { error: 'Senha deve ter no mínimo 8 caracteres.' }
  }
  if (password !== confirmPassword) {
    return { error: 'As senhas não coincidem.' }
  }

  const supabase = await createServerSupabaseClient()
  const { error } = await supabase.auth.updateUser({ password })

  if (error) {
    return { error: 'Erro ao redefinir senha. O link pode ter expirado.' }
  }

  await supabase.auth.signOut()
  redirect('/login?message=password_updated')
}
