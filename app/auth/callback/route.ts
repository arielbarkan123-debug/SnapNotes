import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createDebugLogger } from '@/lib/utils/debug'

const log = createDebugLogger('[Auth Callback]')

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | null
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  log.log('========== CALLBACK START ==========')
  log.log('Origin:', origin)
  log.log('Full URL:', request.url)
  log.log('Code present:', !!code)
  log.log('Code length:', code?.length || 0)
  log.log('Token hash present:', !!tokenHash)
  log.log('Type:', type)
  log.log('Error param:', error)
  log.log('Error description:', errorDescription)
  log.log('Next redirect:', next)

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    log.error('Error from Supabase:', error, errorDescription)
    const errorMessage = encodeURIComponent(errorDescription || 'Email verification failed')
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
  }

  // Handle token_hash flow (works cross-device, no PKCE required)
  // This is the fallback when users click email links on a different device (e.g., iPhone)
  if (tokenHash && type) {
    try {
      const cookieStore = await cookies()
      const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

      log.log('Using token_hash flow for cross-device verification')

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll()
            },
            setAll(newCookies) {
              newCookies.forEach(({ name, value, options }) => {
                cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
                try {
                  cookieStore.set(name, value, options)
                } catch {
                  // Expected in route handlers
                }
              })
            },
          },
        }
      )

      log.log(' Verifying token_hash with type:', type)
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      })

      if (verifyError) {
        log.error(' Token verification error:', verifyError.message)
        const errorMessage = encodeURIComponent('Email verification failed. The link may have expired. Please try signing up again.')
        return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
      }

      log.log(' Token verified successfully!')
      log.log(' User ID:', data?.user?.id)
      log.log(' User email:', data?.user?.email)

      const successMessage = encodeURIComponent('Email verified successfully! Welcome to NoteSnap.')
      const redirectUrl = `${origin}${next}?message=${successMessage}`
      const response = NextResponse.redirect(redirectUrl)

      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      log.log(' ========== TOKEN HASH SUCCESS ==========')
      return response
    } catch (err) {
      log.error(' Token hash error:', err)
      const errorMessage = encodeURIComponent('An unexpected error occurred. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
    }
  }

  if (code) {
    try {
      const cookieStore = await cookies()

      // Track cookies that need to be set on the response
      const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

      log.log(' Creating Supabase client for code exchange...')

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              const allCookies = cookieStore.getAll()
              log.log(' Getting cookies, count:', allCookies.length)
              return allCookies
            },
            setAll(newCookies) {
              log.log(' Setting cookies, count:', newCookies.length)
              newCookies.forEach(({ name, value, options }) => {
                log.log(' Cookie to set:', name, 'value length:', value?.length || 0)
                // Store for later - we'll set these on the redirect response
                cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
                // Also try to set on cookieStore for server components
                try {
                  cookieStore.set(name, value, options)
                } catch {
                  // This may fail in route handlers, which is fine
                  log.log(' Cookie store set skipped (expected in route handler)')
                }
              })
            },
          },
        }
      )

      log.log(' Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        log.error(' Exchange error:', exchangeError.message)
        log.error(' Exchange error code:', exchangeError.code)
        log.error(' Exchange error status:', exchangeError.status)
        const errorMessage = encodeURIComponent('Email verification failed. The link may have expired. Please try signing up again.')
        return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
      }

      log.log(' SUCCESS! Session established')
      log.log(' User ID:', data?.user?.id)
      log.log(' User email:', data?.user?.email)
      log.log(' Email verified at:', data?.user?.email_confirmed_at)
      log.log(' Session expires at:', data?.session?.expires_at)
      log.log(' Cookies to transfer:', cookiesToSet.length)

      // Create redirect response and transfer ALL cookies from the exchange
      const successMessage = encodeURIComponent('Email verified successfully! Welcome to NoteSnap.')
      const redirectUrl = `${origin}${next}?message=${successMessage}`
      log.log(' Redirecting to:', redirectUrl)

      const response = NextResponse.redirect(redirectUrl)

      // CRITICAL: Transfer all cookies to the redirect response
      // This ensures the session is properly established in the browser
      cookiesToSet.forEach(({ name, value, options }) => {
        log.log(' Transferring cookie to response:', name)
        response.cookies.set(name, value, options)
      })

      log.log(' ========== CALLBACK SUCCESS ==========')
      return response
    } catch (err) {
      log.error(' Unexpected error:', err)
      log.error(' Error stack:', err instanceof Error ? err.stack : 'No stack')
      const errorMessage = encodeURIComponent('An unexpected error occurred. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
    }
  }

  // No code provided - redirect to login
  log.warn(' No code provided in callback')
  log.log(' ========== CALLBACK END (NO CODE) ==========')
  return NextResponse.redirect(`${origin}/login`)
}
