import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  const error = searchParams.get('error')
  const errorDescription = searchParams.get('error_description')

  console.log('[Auth Callback] Processing callback')
  console.log('[Auth Callback] Code present:', !!code)
  console.log('[Auth Callback] Error:', error, errorDescription)

  // Handle error from Supabase (e.g., expired link)
  if (error) {
    console.error('[Auth Callback] Error from Supabase:', error, errorDescription)
    const errorMessage = encodeURIComponent(errorDescription || 'Email verification failed')
    return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
  }

  if (code) {
    try {
      const supabase = await createClient()

      console.log('[Auth Callback] Exchanging code for session...')
      const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code)

      if (exchangeError) {
        console.error('[Auth Callback] Exchange error:', exchangeError.message, exchangeError.code)
        const errorMessage = encodeURIComponent('Email verification failed. Please try signing up again.')
        return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
      }

      console.log('[Auth Callback] Session established for user:', data?.user?.id)
      console.log('[Auth Callback] Email verified:', data?.user?.email_confirmed_at ? 'Yes' : 'No')

      // Success - redirect to dashboard or specified page with success message
      const successMessage = encodeURIComponent('Email verified successfully! Welcome to NoteSnap.')
      return NextResponse.redirect(`${origin}${next}?message=${successMessage}`)
    } catch (err) {
      console.error('[Auth Callback] Unexpected error:', err)
      const errorMessage = encodeURIComponent('An unexpected error occurred. Please try again.')
      return NextResponse.redirect(`${origin}/login?error=${errorMessage}`)
    }
  }

  // No code provided - redirect to login
  console.warn('[Auth Callback] No code provided in callback')
  return NextResponse.redirect(`${origin}/login`)
}
