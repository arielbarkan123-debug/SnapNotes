'use client'

import { Suspense, useEffect, type ReactNode } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'
import posthog from 'posthog-js'
import { PostHogProvider as PHProvider } from 'posthog-js/react'
import { createClient } from '@/lib/supabase/client'

const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY
const POSTHOG_HOST = process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com'

// Initialize PostHog once on the client
if (typeof window !== 'undefined' && POSTHOG_KEY) {
  posthog.init(POSTHOG_KEY, {
    api_host: POSTHOG_HOST,
    capture_pageview: false,  // manual — App Router doesn't fire on soft nav
    capture_pageleave: true,
    autocapture: true,
    session_recording: {
      maskAllInputs: true,
    },
    loaded: (ph) => {
      // Disable in development
      if (process.env.NODE_ENV === 'development') ph.opt_out_capturing()
    },
  })
}

/** Tracks page views on App Router soft navigations */
function PageViewTracker() {
  const pathname = usePathname()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (!POSTHOG_KEY) return
    const url = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : '')
    posthog.capture('$pageview', { $current_url: url })
  }, [pathname, searchParams])

  return null
}

/** Identifies users and handles admin opt-out */
function UserIdentifier() {
  useEffect(() => {
    if (!POSTHOG_KEY) return
    const supabase = createClient()

    const identifyUser = async (userId: string | null, email?: string | null) => {
      if (!userId) {
        posthog.reset()
        return
      }

      // Check admin status — admins are opted out of tracking
      try {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', userId)
          .maybeSingle()

        if (adminUser) {
          posthog.opt_out_capturing()
          return
        }
      } catch {
        // Not an admin — proceed
      }

      posthog.identify(userId, { email: email ?? undefined })
    }

    supabase.auth.getUser().then(({ data: { user } }) => {
      identifyUser(user?.id ?? null, user?.email)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        posthog.reset()
      } else if (session?.user) {
        identifyUser(session.user.id, session.user.email)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return null
}

interface PostHogProviderProps {
  children: ReactNode
}

export function PostHogProvider({ children }: PostHogProviderProps) {
  if (!POSTHOG_KEY) return <>{children}</>

  return (
    <PHProvider client={posthog}>
      <Suspense fallback={null}>
        <PageViewTracker />
      </Suspense>
      <UserIdentifier />
      {children}
    </PHProvider>
  )
}
