import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as 'signup' | 'email' | 'recovery' | 'invite' | null
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[Auth Callback] ========== CALLBACK START ==========')
  console.log('[Auth Callback] Origin:', origin)
  console.log('[Auth Callback] Full URL:', request.url)
  console.log('[Auth Callback] Code present:', !!code)
  console.log('[Auth Callback] Code length:', code?.length || 0)
  console.log('[Auth Callback] Token hash present:', !!tokenHash)
  console.log('[Auth Callback] Type:', type)
  console.log('[Auth Callback] Error param:', error)
  console.log('[Auth Callback] Error description:', errorDescription)
  console.log('[Auth Callback] Next redirect:', next)

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('[Auth Callback] Error from Supabase:', error, errorDescription)
    const errorMessage = encodeURIComponent(errorDescription || 'Email verification failed')
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
  }

  // Handle token_hash flow (works cross-device, no PKCE required)
  // This is the fallback when users click email links on a different device (e.g., iPhone)
  if (tokenHash && type) {
    try {
      const cookieStore = await cookies()
      const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

      console.log('[Auth Callback] Using token_hash flow for cross-device verification')

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

      console.log('[Auth Callback] Verifying token_hash with type:', type)
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        token_hash: tokenHash,
        type: type,
      })

      if (verifyError) {
        console.error('[Auth Callback] Token verification error:', verifyError.message)
        const errorMessage = encodeURIComponent('Email verification failed. The link may have expired. Please try signing up again.')
        return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
      }

      console.log('[Auth Callback] Token verified successfully!')
      console.log('[Auth Callback] User ID:', data?.user?.id)
      console.log('[Auth Callback] User email:', data?.user?.email)

      const successMessage = encodeURIComponent('Email verified successfully! Welcome to NoteSnap.')
      const redirectUrl = `${origin}${next}?message=${successMessage}`
      const response = NextResponse.redirect(redirectUrl)

      cookiesToSet.forEach(({ name, value, options }) => {
        response.cookies.set(name, value, options)
      })

      console.log('[Auth Callback] ========== TOKEN HASH SUCCESS ==========')
      return response
    } catch (err) {
      console.error('[Auth Callback] Token hash error:', err)
      const errorMessage = encodeURIComponent('An unexpected error occurred. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
    }
  }

  if (code) {
    try {
      const cookieStore = await cookies()

      // Track cookies that need to be set on the response
      const cookiesToSet: { name: string; value: string; options: Record<string, unknown> }[] = []

      console.log('[Auth Callback] Creating Supabase client for code exchange...')

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              const allCookies = cookieStore.getAll()
              console.log('[Auth Callback] Getting cookies, count:', allCookies.length)
              return allCookies
            },
            setAll(newCookies) {
              console.log('[Auth Callback] Setting cookies, count:', newCookies.length)
              newCookies.forEach(({ name, value, options }) => {
                console.log('[Auth Callback] Cookie to set:', name, 'value length:', value?.length || 0)
                // Store for later - we'll set these on the redirect response
                cookiesToSet.push({ name, value, options: options as Record<string, unknown> })
                // Also try to set on cookieStore for server components
                try {
                  cookieStore.set(name, value, options)
                } catch {
                  // This may fail in route handlers, which is fine
                  console.log('[Auth Callback] Cookie store set skipped (expected in route handler)')
                }
              })
            },
          },
        }
      )

      console.log('[Auth Callback] Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback] Exchange error:', exchangeError.message)
        console.error('[Auth Callback] Exchange error code:', exchangeError.code)
        console.error('[Auth Callback] Exchange error status:', exchangeError.status)
        const errorMessage = encodeURIComponent('Email verification failed. The link may have expired. Please try signing up again.')
        return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
      }

      console.log('[Auth Callback] SUCCESS! Session established')
      console.log('[Auth Callback] User ID:', data?.user?.id)
      console.log('[Auth Callback] User email:', data?.user?.email)
      console.log('[Auth Callback] Email verified at:', data?.user?.email_confirmed_at)
      console.log('[Auth Callback] Session expires at:', data?.session?.expires_at)
      console.log('[Auth Callback] Cookies to transfer:', cookiesToSet.length)

      // Create redirect response and transfer ALL cookies from the exchange
      const successMessage = encodeURIComponent('Email verified successfully! Welcome to NoteSnap.')
      const redirectUrl = `${origin}${next}?message=${successMessage}`
      console.log('[Auth Callback] Redirecting to:', redirectUrl)

      const response = NextResponse.redirect(redirectUrl)

      // CRITICAL: Transfer all cookies to the redirect response
      // This ensures the session is properly established in the browser
      cookiesToSet.forEach(({ name, value, options }) => {
        console.log('[Auth Callback] Transferring cookie to response:', name)
        response.cookies.set(name, value, options)
      })

      console.log('[Auth Callback] ========== CALLBACK SUCCESS ==========')
      return response
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      console.error('[Auth Callback] Error stack:', err instanceof Error ? err.stack : 'No stack')
      const errorMessage = encodeURIComponent('An unexpected error occurred. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
    }
  }

  // No code provided - redirect to login
  console.warn('[Auth Callback] No code provided in callback')
  console.log('[Auth Callback] ========== CALLBACK END (NO CODE) ==========')
  return NextResponse.redirect(`${origin}/login`)
}
