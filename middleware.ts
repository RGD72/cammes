import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { UserRole } from '@/lib/types'

async function getProfile(
  supabase: Awaited<ReturnType<typeof updateSession>>['supabase'],
  userId: string,
): Promise<{ role: UserRole; terms_accepted_at: string | null }> {
  const { data } = await supabase
    .from('users_profile')
    .select('role, terms_accepted_at')
    .eq('id', userId)
    .single()
  return {
    role: (data?.role as UserRole) ?? 'customer',
    terms_accepted_at: data?.terms_accepted_at ?? null,
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

  // /invite/accept — requer sessão ativa mas não verifica terms (é onde o cliente aceita)
  if (pathname.startsWith('/invite/')) {
    if (!user) return NextResponse.redirect(new URL('/login', request.url))
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
    const { role, terms_accepted_at } = await getProfile(supabase, user.id)
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
    }
    // Customer sem aceite de termos → fluxo de onboarding
    if (!terms_accepted_at) {
      return NextResponse.redirect(new URL('/invite/accept', request.url))
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
