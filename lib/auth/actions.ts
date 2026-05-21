'use server'

import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { checkRateLimit, recordFailure, resetOnSuccess } from '@/lib/auth/rate-limit'
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
  redirect(role === 'admin' ? '/admin' : '/brands')
}

export async function logoutAction() {
  const supabase = await createServerSupabaseClient()
  await supabase.auth.signOut()
  redirect('/login')
}
