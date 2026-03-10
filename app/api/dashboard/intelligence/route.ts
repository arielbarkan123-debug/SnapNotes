import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:dashboard-intelligence')

/**
 * GET /api/dashboard/intelligence
 *
 * Returns personalized dashboard directives from the Learning Intelligence Engine.
 * Used by the dashboard to show adaptive primary actions, nudges, course ordering,
 * streak risk warnings, celebrations, and live performance metrics.
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const ctx = await getStudentContext(supabase, user.id)
    if (!ctx) {
      return NextResponse.json({ error: 'No profile found — complete onboarding first' }, { status: 404 })
    }

    const directives = generateDirectives(ctx)

    return NextResponse.json({
      // Dashboard directives
      primaryAction: directives.dashboard.primaryAction,
      nudge: directives.dashboard.nudge,
      courseOrder: directives.dashboard.courseOrder,
      streakRisk: directives.dashboard.streakRisk,
      celebrationDue: directives.dashboard.celebrationDue,
      weeklyGoalProgress: directives.dashboard.weeklyGoalProgress,
      // Live context metrics (useful for dashboard widgets)
      cardsDueToday: ctx.cardsDueToday,
      currentStreak: ctx.currentStreak,
      rollingAccuracy: ctx.rollingAccuracy,
      trendDirection: ctx.trendDirection,
      totalStudyTimeThisWeekMinutes: ctx.totalStudyTimeThisWeekMinutes,
      sessionsThisWeek: ctx.sessionsThisWeek,
    })
  } catch (error) {
    log.error({ err: error }, 'Error')
    return NextResponse.json({ error: 'Failed to load intelligence' }, { status: 500 })
  }
}
