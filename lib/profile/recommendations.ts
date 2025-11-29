/**
 * Personalized Content Recommendations
 *
 * Analyzes user patterns, progress, and due cards to provide
 * smart recommendations for what to study next.
 */

import { createClient } from '@/lib/supabase/server'
import { UserLearningProfile } from './analysis'

// =============================================================================
// Types
// =============================================================================

export interface Recommendation {
  type: 'review' | 'practice' | 'new_lesson' | 'break'
  message: string
  action: {
    label: string
    href: string
  }
  reason: string
  priority: number // 1-10, higher = more urgent
  icon: string
}

export interface SessionSuggestion {
  type: 'quick' | 'standard' | 'deep'
  duration: number // minutes
  cardCount: number
  message: string
  icon: string
}

export interface UserStudyStats {
  cardsDueToday: number
  cardsReviewedToday: number
  lessonsCompletedToday: number
  timeStudiedTodayMs: number
  currentStreak: number
  streakAtRisk: boolean
  lowMasteryLessons: Array<{
    id: string
    title: string
    mastery: number
    courseId: string
  }>
  hasNewContent: boolean
  lastStudyTime: Date | null
}

// =============================================================================
// Constants
// =============================================================================

const HIGH_CARDS_DUE_THRESHOLD = 20
const LOW_MASTERY_THRESHOLD = 0.5
const HEAVY_STUDY_THRESHOLD_MS = 45 * 60 * 1000 // 45 minutes
const QUICK_SESSION_MINUTES = 5
const STANDARD_SESSION_MINUTES = 15
const DEEP_SESSION_MINUTES = 30

// Cards per minute estimates
const CARDS_PER_MINUTE = {
  quick: 3, // Fast reviews
  standard: 2, // Normal pace
  deep: 1.5, // Thorough study
}

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Get a personalized daily recommendation for the user
 */
export async function getDailyRecommendation(userId: string): Promise<Recommendation> {
  const stats = await getUserStudyStats(userId)
  const profile = await getUserProfile(userId)

  // Priority order for recommendations:

  // 1. Streak at risk - highest priority
  if (stats.streakAtRisk && stats.currentStreak > 0) {
    return {
      type: stats.cardsDueToday > 0 ? 'review' : 'practice',
      message: `Keep your ${stats.currentStreak}-day streak alive!`,
      action: {
        label: stats.cardsDueToday > 0 ? 'Quick Review' : 'Start Practice',
        href: stats.cardsDueToday > 0 ? '/review' : '/practice',
      },
      reason: "You haven't studied today and your streak is at risk",
      priority: 10,
      icon: '🔥',
    }
  }

  // 2. Heavy study day - suggest a break
  if (stats.timeStudiedTodayMs > HEAVY_STUDY_THRESHOLD_MS) {
    const minutesStudied = Math.round(stats.timeStudiedTodayMs / 60000)
    return {
      type: 'break',
      message: "Great work today! Time for a break",
      action: {
        label: 'View Progress',
        href: '/profile',
      },
      reason: `You've studied for ${minutesStudied} minutes today - rest helps memory consolidation`,
      priority: 2,
      icon: '☕',
    }
  }

  // 3. Many cards due - prioritize review
  if (stats.cardsDueToday > HIGH_CARDS_DUE_THRESHOLD) {
    return {
      type: 'review',
      message: `${stats.cardsDueToday} cards waiting for review`,
      action: {
        label: 'Start Review',
        href: '/review',
      },
      reason: 'Regular review prevents forgetting and keeps your knowledge fresh',
      priority: 8,
      icon: '📚',
    }
  }

  // 4. Low mastery lessons - suggest practice
  if (stats.lowMasteryLessons.length > 0) {
    const weakestLesson = stats.lowMasteryLessons[0]
    const masteryPercent = Math.round(weakestLesson.mastery * 100)
    return {
      type: 'practice',
      message: `Strengthen "${weakestLesson.title}"`,
      action: {
        label: 'Practice Now',
        href: `/course/${weakestLesson.courseId}?lesson=${weakestLesson.id}`,
      },
      reason: `This lesson is at ${masteryPercent}% mastery - practice will help it stick`,
      priority: 6,
      icon: '💪',
    }
  }

  // 5. Cards due (but not many) - gentle review nudge
  if (stats.cardsDueToday > 0) {
    return {
      type: 'review',
      message: `${stats.cardsDueToday} cards ready for review`,
      action: {
        label: 'Review Cards',
        href: '/review',
      },
      reason: 'Stay on top of your reviews for optimal retention',
      priority: 5,
      icon: '🎯',
    }
  }

  // 6. Has new content available - suggest new lesson
  if (stats.hasNewContent) {
    return {
      type: 'new_lesson',
      message: 'Ready to learn something new?',
      action: {
        label: 'Continue Learning',
        href: '/dashboard',
      },
      reason: getNewLessonReason(profile),
      priority: 4,
      icon: '✨',
    }
  }

  // 7. Default - suggest creating new content
  return {
    type: 'new_lesson',
    message: 'Upload new notes to keep learning',
    action: {
      label: 'Add Notes',
      href: '/dashboard',
    },
    reason: "You're all caught up! Add new material to continue your learning journey",
    priority: 3,
    icon: '📝',
  }
}

/**
 * Get a session suggestion based on user profile and current context
 */
export function getSessionSuggestion(
  profile: UserLearningProfile | null,
  cardsDue: number = 0,
  currentHour: number = new Date().getHours()
): SessionSuggestion {
  // Determine time of day context
  const timeContext = getTimeContext(currentHour)

  // Get user's typical session length
  const typicalLength = profile?.optimal_session_length || profile?.avg_session_length || 15

  // Determine session type based on context
  let sessionType: 'quick' | 'standard' | 'deep'
  let duration: number
  let message: string

  // Early morning or late night: suggest quick sessions
  if (timeContext === 'early_morning' || timeContext === 'late_night') {
    sessionType = 'quick'
    duration = Math.min(typicalLength, QUICK_SESSION_MINUTES)
    message = timeContext === 'early_morning'
      ? 'Quick morning review to start your day'
      : 'Brief review before bed - great for memory!'
  }
  // Peak hours (based on user preference or defaults)
  else if (isOptimalStudyTime(profile, currentHour)) {
    sessionType = 'deep'
    duration = Math.max(typicalLength, DEEP_SESSION_MINUTES)
    message = "Perfect time for focused study - you're at your best!"
  }
  // Regular hours
  else {
    sessionType = 'standard'
    duration = typicalLength
    message = 'Balanced session for steady progress'
  }

  // Adjust based on cards due
  if (cardsDue > 30 && sessionType !== 'deep') {
    sessionType = 'standard'
    duration = Math.max(duration, STANDARD_SESSION_MINUTES)
    message = 'Extended session to tackle your review queue'
  } else if (cardsDue < 5 && sessionType !== 'quick') {
    sessionType = 'quick'
    duration = Math.min(duration, QUICK_SESSION_MINUTES)
    message = 'Quick session - you have few cards due!'
  }

  // Calculate card count based on duration and pace
  const cardsPerMinute = CARDS_PER_MINUTE[sessionType]
  const cardCount = Math.round(duration * cardsPerMinute)

  return {
    type: sessionType,
    duration,
    cardCount: Math.min(cardCount, cardsDue || cardCount),
    message,
    icon: getSessionIcon(sessionType),
  }
}

/**
 * Get multiple recommendations ranked by priority
 */
export async function getRecommendations(
  userId: string,
  limit: number = 3
): Promise<Recommendation[]> {
  const stats = await getUserStudyStats(userId)
  const _profile = await getUserProfile(userId)
  const recommendations: Recommendation[] = []

  // Build all possible recommendations

  // Streak at risk
  if (stats.streakAtRisk && stats.currentStreak > 0) {
    recommendations.push({
      type: stats.cardsDueToday > 0 ? 'review' : 'practice',
      message: `Keep your ${stats.currentStreak}-day streak alive!`,
      action: {
        label: 'Quick Review',
        href: stats.cardsDueToday > 0 ? '/review' : '/practice',
      },
      reason: "Don't lose your progress",
      priority: 10,
      icon: '🔥',
    })
  }

  // Cards due
  if (stats.cardsDueToday > 0) {
    recommendations.push({
      type: 'review',
      message: `${stats.cardsDueToday} cards ready for review`,
      action: {
        label: 'Start Review',
        href: '/review',
      },
      reason: 'Spaced repetition at its best',
      priority: stats.cardsDueToday > HIGH_CARDS_DUE_THRESHOLD ? 8 : 5,
      icon: '📚',
    })
  }

  // Low mastery lessons
  for (const lesson of stats.lowMasteryLessons.slice(0, 2)) {
    recommendations.push({
      type: 'practice',
      message: `Strengthen "${lesson.title}"`,
      action: {
        label: 'Practice',
        href: `/course/${lesson.courseId}?lesson=${lesson.id}`,
      },
      reason: `${Math.round(lesson.mastery * 100)}% mastery`,
      priority: 6,
      icon: '💪',
    })
  }

  // New content
  if (stats.hasNewContent) {
    recommendations.push({
      type: 'new_lesson',
      message: 'Continue learning',
      action: {
        label: 'Next Lesson',
        href: '/dashboard',
      },
      reason: 'New material awaits',
      priority: 4,
      icon: '✨',
    })
  }

  // Break recommendation
  if (stats.timeStudiedTodayMs > HEAVY_STUDY_THRESHOLD_MS) {
    recommendations.push({
      type: 'break',
      message: 'Take a well-deserved break',
      action: {
        label: 'View Stats',
        href: '/profile',
      },
      reason: 'Rest helps consolidation',
      priority: 2,
      icon: '☕',
    })
  }

  // Sort by priority and limit
  return recommendations
    .sort((a, b) => b.priority - a.priority)
    .slice(0, limit)
}

// =============================================================================
// Helper Functions - Data Fetching
// =============================================================================

async function getUserStudyStats(userId: string): Promise<UserStudyStats> {
  const supabase = await createClient()
  const today = new Date().toISOString().split('T')[0]
  const now = new Date()

  // Get cards due today
  const { count: cardsDue } = await supabase
    .from('flashcards')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .lte('next_review', now.toISOString())

  // Get cards reviewed today
  const { count: cardsReviewed } = await supabase
    .from('review_logs')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .gte('reviewed_at', `${today}T00:00:00`)

  // Get time studied today (from review logs)
  const { data: todayReviews } = await supabase
    .from('review_logs')
    .select('review_duration_ms')
    .eq('user_id', userId)
    .gte('reviewed_at', `${today}T00:00:00`)

  const timeStudiedTodayMs = (todayReviews || [])
    .reduce((sum, r) => sum + (r.review_duration_ms || 0), 0)

  // Get lesson completions today
  const { count: lessonsCompleted } = await supabase
    .from('lesson_progress')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('completed', true)
    .gte('completed_at', `${today}T00:00:00`)

  // Get streak info
  const { data: gamification } = await supabase
    .from('user_gamification')
    .select('current_streak, streak_last_activity')
    .eq('user_id', visibleUserId(userId))
    .single()

  const currentStreak = gamification?.current_streak || 0
  const lastActivity = gamification?.streak_last_activity
  const streakAtRisk = lastActivity !== today && currentStreak > 0

  // Get low mastery lessons
  const { data: lessonProgress } = await supabase
    .from('lesson_progress')
    .select(`
      lesson_id,
      mastery_level,
      lessons!inner(id, title, course_id)
    `)
    .eq('user_id', userId)
    .lt('mastery_level', LOW_MASTERY_THRESHOLD)
    .order('mastery_level', { ascending: true })
    .limit(5)

  const lowMasteryLessons = (lessonProgress || []).map((lp: any) => ({
    id: lp.lessons.id,
    title: lp.lessons.title,
    mastery: lp.mastery_level,
    courseId: lp.lessons.course_id,
  }))

  // Check for incomplete lessons (new content)
  const { count: incompleteLessons } = await supabase
    .from('lessons')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .not('id', 'in', `(
      SELECT lesson_id FROM lesson_progress
      WHERE user_id = '${userId}' AND completed = true
    )`)

  // Get last study time
  const { data: lastReview } = await supabase
    .from('review_logs')
    .select('reviewed_at')
    .eq('user_id', userId)
    .order('reviewed_at', { ascending: false })
    .limit(1)
    .single()

  return {
    cardsDueToday: cardsDue || 0,
    cardsReviewedToday: cardsReviewed || 0,
    lessonsCompletedToday: lessonsCompleted || 0,
    timeStudiedTodayMs,
    currentStreak,
    streakAtRisk,
    lowMasteryLessons,
    hasNewContent: (incompleteLessons || 0) > 0,
    lastStudyTime: lastReview?.reviewed_at ? new Date(lastReview.reviewed_at) : null,
  }
}

async function getUserProfile(userId: string): Promise<UserLearningProfile | null> {
  const supabase = await createClient()

  const { data } = await supabase
    .from('user_learning_profile')
    .select('*')
    .eq('user_id', userId)
    .single()

  return data as UserLearningProfile | null
}

// Wrapper to handle RLS - in some contexts we need the visible user ID
function visibleUserId(userId: string): string {
  return userId
}

// =============================================================================
// Helper Functions - Time & Context
// =============================================================================

type TimeContext = 'early_morning' | 'morning' | 'afternoon' | 'evening' | 'late_night'

function getTimeContext(hour: number): TimeContext {
  if (hour >= 5 && hour < 9) return 'early_morning'
  if (hour >= 9 && hour < 12) return 'morning'
  if (hour >= 12 && hour < 17) return 'afternoon'
  if (hour >= 17 && hour < 22) return 'evening'
  return 'late_night'
}

function isOptimalStudyTime(profile: UserLearningProfile | null, currentHour: number): boolean {
  // Check user's preferred study time
  if (profile?.preferred_study_time) {
    const preferred = profile.preferred_study_time
    if (preferred === 'morning' && currentHour >= 9 && currentHour < 12) return true
    if (preferred === 'afternoon' && currentHour >= 12 && currentHour < 17) return true
    if (preferred === 'evening' && currentHour >= 17 && currentHour < 21) return true
  }

  // Check peak performance hour
  if (profile?.peak_performance_hour !== null && profile?.peak_performance_hour !== undefined) {
    const peak = profile.peak_performance_hour
    // Within 2 hours of peak
    if (Math.abs(currentHour - peak) <= 2 || Math.abs(currentHour - peak) >= 22) {
      return true
    }
  }

  // Default optimal times: 9-11 AM, 2-4 PM
  return (currentHour >= 9 && currentHour <= 11) || (currentHour >= 14 && currentHour <= 16)
}

function getSessionIcon(type: 'quick' | 'standard' | 'deep'): string {
  switch (type) {
    case 'quick':
      return '⚡'
    case 'standard':
      return '📖'
    case 'deep':
      return '🎯'
  }
}

function getNewLessonReason(profile: UserLearningProfile | null): string {
  if (!profile) {
    return 'Expand your knowledge with fresh material'
  }

  switch (profile.study_goal) {
    case 'exam_prep':
      return 'Keep preparing - every lesson brings you closer to your goal'
    case 'skill_improvement':
      return 'Build your skills with new content'
    case 'general_learning':
    default:
      return 'Expand your knowledge with fresh material'
  }
}

// =============================================================================
// Client-safe versions (for use without server context)
// =============================================================================

/**
 * Get session suggestion without database access (client-safe)
 */
export function getClientSessionSuggestion(
  optimalLength: number = 15,
  preferredTime: string | null = null,
  cardsDue: number = 0
): SessionSuggestion {
  const currentHour = new Date().getHours()

  // Create a minimal profile-like object
  const mockProfile = {
    optimal_session_length: optimalLength,
    avg_session_length: optimalLength,
    preferred_study_time: preferredTime as any,
    peak_performance_hour: null,
  } as UserLearningProfile

  return getSessionSuggestion(mockProfile, cardsDue, currentHour)
}
