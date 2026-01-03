import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { createClient } from '@supabase/supabase-js'

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/course']

// Auth routes (redirect to dashboard if already authenticated)
const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password']

// Pattern to match lesson routes: /course/[id]/lesson/[lessonIndex]
const lessonRoutePattern = /^\/course\/([^/]+)\/lesson\/(\d+)$/

export async function middleware(request: NextRequest) {
  const { user, supabaseResponse } = await updateSession(request)
  const { pathname } = request.nextUrl

  // Check if the current path is a protected route
  const isProtectedRoute = protectedRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Check if the current path is an auth route
  const isAuthRoute = authRoutes.some(route =>
    pathname.startsWith(route)
  )

  // Redirect unauthenticated users to login for protected routes
  if (isProtectedRoute && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    url.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(url)
  }

  // Redirect authenticated users away from auth pages to dashboard
  if (isAuthRoute && user) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // Check lesson access for lesson routes (prevents React hooks error #310)
  const lessonMatch = pathname.match(lessonRoutePattern)
  if (lessonMatch && user) {
    const courseId = lessonMatch[1]
    const lessonIndex = parseInt(lessonMatch[2], 10)

    // Only check for lessons beyond index 0 (first lesson is always accessible)
    if (lessonIndex > 0) {
      try {
        // Create a Supabase client for the middleware
        const supabase = createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          {
            global: {
              headers: {
                Authorization: request.headers.get('Authorization') || '',
              },
            },
          }
        )

        // Get user's progress for this course
        const { data: progress } = await supabase
          .from('user_progress')
          .select('completed_lessons')
          .eq('user_id', user.id)
          .eq('course_id', courseId)
          .single()

        const completedLessons = progress?.completed_lessons || []
        const isAccessible = completedLessons.includes(lessonIndex - 1)

        // If lesson is locked, redirect to course page
        if (!isAccessible) {
          const url = request.nextUrl.clone()
          url.pathname = `/course/${courseId}`
          return NextResponse.redirect(url)
        }
      } catch {
        // On error, let the page handle it
      }
    }
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
