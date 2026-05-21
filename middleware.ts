import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import type { UserRole } from '@/lib/types'

async function getRole(
  supabase: Awaited<ReturnType<typeof updateSession>>['supabase'],
  userId: string,
): Promise<UserRole> {
  const { data } = await supabase
    .from('users_profile')
    .select('role')
    .eq('id', userId)
    .single()
  return (data?.role as UserRole) ?? 'customer'
}

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user, supabase } = await updateSession(request)
  const pathname = request.nextUrl.pathname

  // Rotas públicas de auth — sem guard de sessão
  const publicAuthRoutes = ['/recover-password', '/reset-password']
  if (pathname.startsWith('/auth/') || publicAuthRoutes.some((r) => pathname.startsWith(r))) {
    return supabaseResponse
  }

  if (pathname.startsWith('/login')) {
    if (user) {
      const role = await getRole(supabase, user.id)
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
    const role = await getRole(supabase, user.id)
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
    const role = await getRole(supabase, user.id)
    if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url))
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
