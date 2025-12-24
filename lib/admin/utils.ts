import { createClient, createServiceClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

/**
 * Check if the current user is an admin
 * Returns the user ID if admin, null otherwise
 */
export async function checkAdminAccess(): Promise<{
  isAdmin: boolean
  userId: string | null
  error?: NextResponse
}> {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return {
      isAdmin: false,
      userId: null,
      error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    }
  }

  // Use service client to bypass RLS for admin check
  const serviceClient = createServiceClient()
  const { data: adminUser, error: adminError } = await serviceClient
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .single()

  if (adminError || !adminUser) {
    return {
      isAdmin: false,
      userId: user.id,
      error: NextResponse.json({ error: 'Forbidden: Admin access required' }, { status: 403 }),
    }
  }

  return {
    isAdmin: true,
    userId: user.id,
  }
}

/**
 * Parse date range from request params
 */
export function parseDateRange(searchParams: URLSearchParams): {
  startDate: Date
  endDate: Date
} {
  const now = new Date()
  const defaultStart = new Date(now)
  defaultStart.setDate(defaultStart.getDate() - 30) // Default to last 30 days

  const startParam = searchParams.get('startDate')
  const endParam = searchParams.get('endDate')

  // Parse endDate and set to end of day (23:59:59.999)
  let endDate: Date
  if (endParam) {
    endDate = new Date(endParam)
    endDate.setHours(23, 59, 59, 999)
  } else {
    endDate = now
  }

  return {
    startDate: startParam ? new Date(startParam) : defaultStart,
    endDate,
  }
}

/**
 * Format date for SQL query
 */
export function formatDateForSQL(date: Date): string {
  return date.toISOString().split('T')[0]
}
