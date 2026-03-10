import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createLogger } from '@/lib/logger'

const log = createLogger('middleware')

// Auth routes (redirect to dashboard if already authenticated)
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']

// Public routes that don't require any special handling (auth callback handled separately above)
const publicRoutes = ['/auth/callback']

// Page routes accessible WITHOUT authentication (deny-by-default for everything else)
// /reset is a service worker reset utility that MUST work for unauthenticated users
// (it exists for users stuck in a broken state who can't log in)
const publicPageRoutes = ['/', '/offline', '/reset', '/privacy', '/terms']

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Auto-detect locale on first visit (no NEXT_LOCALE cookie yet)
  const hasLocaleCookie = request.cookies.has('NEXT_LOCALE')

  // Log auth callback requests for debugging (development only)
  if (pathname.startsWith('/auth/callback')) {
    if (process.env.NODE_ENV === 'development') {
      log.info('Auth callback detected')
      log.info({ detail: request.url }, 'Full URL')
      log.info({ detail: pathname }, 'Pathname')
      log.info({ detail: request.nextUrl.searchParams.toString() }, 'Search params')
    }
    // IMPORTANT: Let auth callback pass through WITHOUT session update
    // The callback route will handle the code exchange itself
    return NextResponse.next()
  }

  const { user, supabaseResponse } = await updateSession(request)

  // Check if this is a public route that needs no special handling
  const isPublicRoute = publicRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Let public routes through without modification
  if (isPublicRoute) {
    return supabaseResponse
  }

  // Skip auth check for API routes (they handle their own auth)
  if (pathname.startsWith('/api')) {
    return supabaseResponse
  }

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check if the current path is a public page route (exact match)
  const isPublicPage = publicPageRoutes.some(route => pathname === route)

  // Deny-by-default: all non-public, non-auth routes require authentication
  if (!isPublicPage && !isAuthRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Set locale cookie from Accept-Language on first visit
  if (!hasLocaleCookie) {
    const acceptLang = request.headers.get('accept-language') || ''
    const detectedLocale = acceptLang.includes('he') ? 'he' : 'en'
    supabaseResponse.cookies.set('NEXT_LOCALE', detectedLocale, {
      path: '/',
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: 'lax',
    })
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
