'use client'

import { useEffect, useState, ReactNode } from 'react'
import { useAnalytics, useErrorTracking } from '@/lib/analytics'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsProviderProps {
  children: ReactNode
}

/**
 * Analytics Provider Component
 * Initializes analytics tracking, page views, and error handling
 * Automatically detects user from Supabase auth
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [userId, setUserId] = useState<string | null>(null)

  // Get user ID from Supabase auth on mount
  useEffect(() => {
    const supabase = createClient()

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUserId(session?.user?.id || null)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Initialize analytics with user ID and track page views
  useAnalytics(userId)

  // Set up global error tracking
  useErrorTracking()

  return <>{children}</>
}

export default AnalyticsProvider
