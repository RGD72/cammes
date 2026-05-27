import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { CURRENT_DOCUMENT_VERSION } from '@/lib/consent/constants'
import type { UserRole } from '@/lib/types'

async function getProfile(
  supabase: Awaited<ReturnType<typeof updateSession>>['supabase'],
  userId: string,
): Promise<{ role: UserRole; consented_version: string | null }> {
  const { data } = await supabase
    .from('users_profile')
    .select('role, consented_version')
    .eq('id', userId)
    .single()
  return {
    role: (data?.role as UserRole) ?? 'customer',
    consented_version: data?.consented_version ?? null,
  }
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Rotas públicas de auth — sem guard de sessão
  const publicAuthRoutes = ['/recover-password', '/reset-password']
  if (pathname.startsWith('/auth/') || publicAuthRoutes.some((r) => pathname.startsWith(r))) {
    return supabaseResponse
  }

  // /invite/accept e /consent/accept — requerem sessão mas não verificam versão de consentimento
  if (pathname.startsWith('/invite/') || pathname.startsWith('/consent/')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
    return supabaseResponse
  }

  // /legal/ — páginas públicas sem guard de autenticação
  if (pathname.startsWith('/legal/')) {
    return supabaseResponse
  }

  if (pathname.startsWith('/login')) {
    if (user) {
      const { role } = await getProfile(supabase, user.id)
      return NextResponse.redirect(
        new URL(role === 'admin' ? '/admin' : '/brands', request.url),
      )
    }
    return supabaseResponse
  }

  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { role } = await getProfile(supabase, user.id)
    if (role !== 'admin') {
      return NextResponse.redirect(new URL('/brands', request.url))
    }
    return supabaseResponse
  }

  if (
    pathname.startsWith('/brands') ||
    pathname.startsWith('/cart') ||
    pathname.startsWith('/orders')
  ) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }
    const { role, consented_version } = await getProfile(supabase, user.id)
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // Customer sem consentimento ou com versão desatualizada → aceite obrigatório
    if (!consented_version || consented_version !== CURRENT_DOCUMENT_VERSION) {
      const isNew = !consented_version
      return NextResponse.redirect(
        new URL(isNew ? '/invite/accept' : '/consent/accept', request.url),
      )
    }
    return supabaseResponse
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
