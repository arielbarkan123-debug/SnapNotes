import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * POST /api/reflections
 *
 * Save a user reflection (session or weekly)
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      reflectionType,
      // Session fields
      learned,
      challenges,
      // Weekly fields
      rating,
      wentWell,
      couldBeBetter,
      // Context
      sessionType,
      cardsReviewed,
      lessonsCompleted,
      timeSpentMs,
    } = body

    // Validate reflection type
    if (!reflectionType || !['session', 'weekly'].includes(reflectionType)) {
      return NextResponse.json(
        { error: 'Invalid reflection type' },
        { status: 400 }
      )
    }

    // Validate weekly rating if provided
    if (reflectionType === 'weekly' && rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json(
          { error: 'Rating must be between 1 and 5' },
          { status: 400 }
        )
      }
    }

    // Calculate week_of for weekly reflections (Monday of current week)
    let weekOf = null
    if (reflectionType === 'weekly') {
      const now = new Date()
      const dayOfWeek = now.getDay()
      const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
      weekOf = new Date(now.setDate(diff)).toISOString().split('T')[0]
    }

    // Insert reflection
    const { data, error } = await supabase
      .from('reflections')
      .insert({
        user_id: user.id,
        reflection_type: reflectionType,
        learned: learned || null,
        challenges: challenges || null,
        rating: rating || null,
        went_well: wentWell || null,
        could_be_better: couldBeBetter || null,
        session_type: sessionType || null,
        cards_reviewed: cardsReviewed || 0,
        lessons_completed: lessonsCompleted || 0,
        time_spent_ms: timeSpentMs || 0,
        week_of: weekOf,
      })
      .select()
      .single()

    if (error) {
      console.error('Reflection insert error:', error)
      return NextResponse.json(
        { error: 'Failed to save reflection' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      reflection: data,
    })
  } catch (error) {
    console.error('Reflection error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * GET /api/reflections
 *
 * Get user reflections with optional filters
 *
 * Query params:
 * - type: 'session' | 'weekly' | 'all' (default: 'all')
 * - limit: number (default: 20)
 * - checkWeekly: boolean - Check if weekly reflection is due
 */
export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'all'
    const limit = parseInt(searchParams.get('limit') || '20')
    const checkWeekly = searchParams.get('checkWeekly') === 'true'

    // Check if weekly reflection is due
    if (checkWeekly) {
      const weeklyStatus = await checkWeeklyReflectionStatus(supabase, user.id)
      return NextResponse.json(weeklyStatus)
    }

    // Build query
    let query = supabase
      .from('reflections')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (type !== 'all') {
      query = query.eq('reflection_type', type)
    }

    const { data, error } = await query

    if (error) {
      console.error('Reflection fetch error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch reflections' },
        { status: 500 }
      )
    }

    // Calculate stats
    const stats = calculateReflectionStats(data || [])

    return NextResponse.json({
      reflections: data,
      stats,
    })
  } catch (error) {
    console.error('Reflection GET error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Helper Functions
// =============================================================================

interface SupabaseClient {
  from: (table: string) => any
}

async function checkWeeklyReflectionStatus(supabase: SupabaseClient, userId: string) {
  const now = new Date()
  const dayOfWeek = now.getDay() // 0 = Sunday
  const hour = now.getHours()

  // Check if it's Sunday evening (after 5 PM)
  const isSundayEvening = dayOfWeek === 0 && hour >= 17

  // Calculate current week's Monday
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1)
  const mondayOfWeek = new Date(now)
  mondayOfWeek.setDate(diff)
  const weekOf = mondayOfWeek.toISOString().split('T')[0]

  // Check if weekly reflection already exists for this week
  const { data: existingReflection } = await supabase
    .from('reflections')
    .select('id')
    .eq('user_id', userId)
    .eq('reflection_type', 'weekly')
    .eq('week_of', weekOf)
    .single()

  // Get weekly stats for context
  const weekStart = new Date(mondayOfWeek)
  weekStart.setHours(0, 0, 0, 0)

  const { count: reviewCount } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('reviewed_at', weekStart.toISOString())

  const { data: gamification } = await supabase
    .from('user_gamification')
    .select('current_streak')
    .eq('user_id', userId)
    .single()

  return {
    isDue: isSundayEvening && !existingReflection,
    isSundayEvening,
    hasCompletedThisWeek: !!existingReflection,
    weekOf,
    weekStats: {
      cardsReviewed: reviewCount || 0,
      currentStreak: gamification?.current_streak || 0,
    },
  }
}

interface Reflection {
  reflection_type: string
  rating: number | null
  learned: string | null
  challenges: string | null
  went_well: string | null
  could_be_better: string | null
  created_at: string
}

function calculateReflectionStats(reflections: Reflection[]) {
  if (reflections.length === 0) {
    return {
      totalReflections: 0,
      sessionCount: 0,
      weeklyCount: 0,
      avgWeeklyRating: 0,
      recentThemes: [],
    }
  }

  const sessionReflections = reflections.filter(r => r.reflection_type === 'session')
  const weeklyReflections = reflections.filter(r => r.reflection_type === 'weekly')

  // Calculate average weekly rating
  const ratingsArray = weeklyReflections
    .map(r => r.rating)
    .filter((r): r is number => r !== null)
  const avgWeeklyRating = ratingsArray.length > 0
    ? ratingsArray.reduce((a, b) => a + b, 0) / ratingsArray.length
    : 0

  // Extract recent themes from reflections (simple keyword extraction)
  const recentThemes = extractThemes(reflections.slice(0, 10))

  return {
    totalReflections: reflections.length,
    sessionCount: sessionReflections.length,
    weeklyCount: weeklyReflections.length,
    avgWeeklyRating: Math.round(avgWeeklyRating * 10) / 10,
    recentThemes,
  }
}

function extractThemes(reflections: Reflection[]): string[] {
  const themes: Record<string, number> = {}

  // Common learning-related keywords to look for
  const keywords = [
    'vocabulary', 'grammar', 'practice', 'review', 'memory', 'retention',
    'focus', 'time', 'consistency', 'motivation', 'understanding', 'concepts',
    'difficult', 'easy', 'progress', 'improvement', 'challenge', 'success'
  ]

  for (const reflection of reflections) {
    const text = [
      reflection.learned,
      reflection.challenges,
      reflection.went_well,
      reflection.could_be_better
    ].filter(Boolean).join(' ').toLowerCase()

    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        themes[keyword] = (themes[keyword] || 0) + 1
      }
    }
  }

  // Return top 5 themes
  return Object.entries(themes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([theme]) => theme)
}
