'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useAnalytics, useErrorTracking } from '@/lib/analytics'
import { analytics } from '@/lib/analytics/client'
import { createClient } from '@/lib/supabase/client'

interface AnalyticsProviderProps {
  children: ReactNode
}

/**
 * Analytics Provider Component
 * Initializes analytics tracking, page views, and error handling
 * Automatically detects user from Supabase auth
 * Admin users are excluded from all tracking
 */
export function AnalyticsProvider({ children }: AnalyticsProviderProps) {
  const [userId, setUserId] = useState<string | null>(null)
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null)

  // Get user ID and admin status from Supabase auth on mount
  useEffect(() => {
    const supabase = createClient()

    // Check if user is admin
    const checkAdminStatus = async (userId: string | null) => {
      if (!userId) {
        setIsAdmin(false)
        analytics.setIsAdmin(false)
        return
      }

      try {
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('id')
          .eq('user_id', userId)
          .single()

        const adminStatus = !!adminUser
        setIsAdmin(adminStatus)
        analytics.setIsAdmin(adminStatus)
      } catch {
        // Not an admin or error - proceed with tracking
        setIsAdmin(false)
        analytics.setIsAdmin(false)
      }
    }

    // Get initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUserId(user?.id || null)
      checkAdminStatus(user?.id || null)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      const newUserId = session?.user?.id || null
      setUserId(newUserId)
      checkAdminStatus(newUserId)
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  // Initialize analytics with user ID and track page views
  // Only after we know if user is admin (to prevent tracking before check completes)
  useAnalytics(isAdmin === false ? userId : null)

  // Set up global error tracking (only for non-admins)
  useErrorTracking()

  return <>{children}</>
}

export default AnalyticsProvider
