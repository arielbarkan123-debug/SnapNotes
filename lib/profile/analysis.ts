/**
 * Learning Profile Analysis
 *
 * Analyzes user learning patterns to provide personalized recommendations
 * for optimal study times, session lengths, and content difficulty.
 */

import { createClient } from '@/lib/supabase/server'

// =============================================================================
// Types
// =============================================================================

export interface UserPatterns {
  userId: string
  analyzedAt: Date
  // Time patterns
  avgTimePerStepType: Record<string, number> // step_type -> avg_ms
  avgTimePerRating: Record<number, number> // rating -> avg_ms
  // Performance by time
  performanceByHour: HourlyPerformance[]
  bestPerformanceHour: number // 0-23
  worstPerformanceHour: number // 0-23
  // Accuracy trends
  accuracyTrend: 'improving' | 'stable' | 'declining'
  recentAccuracy: number // Last 7 days
  overallAccuracy: number // All time
  // Difficulty analysis
  difficultStepTypes: string[]
  strongStepTypes: string[]
  // Session patterns
  avgSessionLength: number // minutes
  sessionsPerWeek: number
  preferredSessionTime: 'morning' | 'afternoon' | 'evening' | 'night'
}

export interface HourlyPerformance {
  hour: number // 0-23
  accuracy: number // 0-100
  avgResponseTime: number // ms
  totalAttempts: number
}

export interface UserLearningProfile {
  id: string
  user_id: string
  // Onboarding preferences
  study_goal: 'exam_prep' | 'general_learning' | 'skill_improvement'
  preferred_study_time: 'morning' | 'afternoon' | 'evening' | 'varies'
  learning_styles: ('reading' | 'visual' | 'practice')[]
  // Session preferences
  avg_session_length: number // minutes
  optimal_session_length: number // minutes
  peak_performance_hour: number | null // 0-23
  // Speed preferences
  speed_preference: 'fast' | 'moderate' | 'slow'
  avg_response_time: number // ms
  // Performance metrics
  overall_accuracy: number // 0-1
  accuracy_trend: 'improving' | 'stable' | 'declining'
  // Difficulty preferences
  difficulty_preference: 'easy' | 'moderate' | 'challenging'
  // Subject analysis
  strong_subjects: string[]
  weak_subjects: string[]
  // Timestamps
  last_analyzed: string | null
  created_at: string
  updated_at: string
}

export interface SessionAnalysis {
  sessions: SessionData[]
  avgLength: number
  medianLength: number
  dropOffPoint: number // minutes where engagement typically drops
}

interface SessionData {
  date: string
  duration: number // minutes
  stepsCompleted: number
  accuracy: number
}

interface StepPerformanceRecord {
  id: string
  user_id: string
  step_type: string
  time_ms: number
  was_correct: boolean | null
  created_at: string
}

interface ReviewLogRecord {
  id: string
  user_id: string
  rating: number
  review_duration_ms: number | null
  reviewed_at: string
}

// =============================================================================
// Constants
// =============================================================================

const TIME_PERIODS = {
  morning: { start: 5, end: 12, label: 'Morning (5 AM - 12 PM)' },
  afternoon: { start: 12, end: 17, label: 'Afternoon (12 PM - 5 PM)' },
  evening: { start: 17, end: 21, label: 'Evening (5 PM - 9 PM)' },
  night: { start: 21, end: 5, label: 'Night (9 PM - 5 AM)' },
} as const

const MIN_SESSION_LENGTH = 5 // minutes
const MAX_SESSION_LENGTH = 60 // minutes
const DEFAULT_SESSION_LENGTH = 15 // minutes

const MIN_DATA_POINTS_FOR_ANALYSIS = 10
const TREND_WINDOW_DAYS = 30

// =============================================================================
// Main Analysis Functions
// =============================================================================

/**
 * Analyze user learning patterns from historical data
 *
 * @param userId - User ID to analyze
 * @returns Comprehensive user pattern analysis
 */
export async function analyzeUserPatterns(userId: string): Promise<UserPatterns> {
  const supabase = await createClient()

  // Fetch step performance data (last 90 days)
  const ninetyDaysAgo = new Date()
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90)

  const { data: stepPerformance } = await supabase
    .from('step_performance')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', ninetyDaysAgo.toISOString())
    .order('created_at', { ascending: true })

  // Fetch review logs
  const { data: reviewLogs } = await supabase
    .from('review_logs')
    .select('*')
    .eq('user_id', userId)
    .gte('reviewed_at', ninetyDaysAgo.toISOString())
    .order('reviewed_at', { ascending: true })

  const steps = (stepPerformance || []) as StepPerformanceRecord[]
  const reviews = (reviewLogs || []) as ReviewLogRecord[]

  // Analyze time per step type
  const avgTimePerStepType = calculateAvgTimePerStepType(steps)

  // Analyze time per rating
  const avgTimePerRating = calculateAvgTimePerRating(reviews)

  // Analyze performance by hour
  const performanceByHour = calculatePerformanceByHour(steps, reviews)
  const bestHour = findBestPerformanceHour(performanceByHour)
  const worstHour = findWorstPerformanceHour(performanceByHour)

  // Analyze accuracy trends
  const { trend, recent, overall } = analyzeAccuracyTrend(steps, reviews)

  // Analyze difficulty
  const { difficult, strong } = analyzeDifficulty(steps)

  // Analyze session patterns
  const sessionAnalysis = analyzeSessionPatterns(steps, reviews)
  const preferredTime = determinePreferredTime(performanceByHour)

  return {
    userId,
    analyzedAt: new Date(),
    avgTimePerStepType,
    avgTimePerRating,
    performanceByHour,
    bestPerformanceHour: bestHour,
    worstPerformanceHour: worstHour,
    accuracyTrend: trend,
    recentAccuracy: recent,
    overallAccuracy: overall,
    difficultStepTypes: difficult,
    strongStepTypes: strong,
    avgSessionLength: sessionAnalysis.avgLength,
    sessionsPerWeek: calculateSessionsPerWeek(steps, reviews),
    preferredSessionTime: preferredTime,
  }
}

/**
 * Update user's learning profile based on analysis
 *
 * @param userId - User ID to update
 */
export async function updateLearningProfile(userId: string): Promise<UserLearningProfile | null> {
  const supabase = await createClient()

  // Get patterns analysis
  const patterns = await analyzeUserPatterns(userId)

  // Calculate optimal session length
  const optimalLength = calculateOptimalSessionLength(patterns)

  // Determine speed preference
  const speedPref = determineSpeedPreference(patterns.avgTimePerStepType)

  // Determine difficulty preference based on accuracy
  const difficultyPref = determineDifficultyPreference(patterns.overallAccuracy)

  // Calculate average response time
  const avgResponseTime = calculateOverallAvgResponseTime(patterns.avgTimePerStepType)

  // Prepare profile data
  const profileData = {
    user_id: userId,
    avg_session_length: Math.round(patterns.avgSessionLength),
    optimal_session_length: optimalLength,
    peak_performance_hour: patterns.bestPerformanceHour,
    speed_preference: speedPref,
    avg_response_time: avgResponseTime,
    overall_accuracy: patterns.overallAccuracy / 100, // Store as 0-1
    accuracy_trend: patterns.accuracyTrend,
    difficulty_preference: difficultyPref,
    last_analyzed: new Date().toISOString(),
  }

  // Upsert profile
  const { data: existing } = await supabase
    .from('user_learning_profile')
    .select('id')
    .eq('user_id', userId)
    .single()

  if (existing) {
    const { data: updated, error } = await supabase
      .from('user_learning_profile')
      .update(profileData)
      .eq('user_id', userId)
      .select()
      .single()

    if (error) {
      console.error('Failed to update learning profile:', error)
      return null
    }
    return updated
  } else {
    const { data: created, error } = await supabase
      .from('user_learning_profile')
      .insert(profileData)
      .select()
      .single()

    if (error) {
      console.error('Failed to create learning profile:', error)
      return null
    }
    return created
  }
}

/**
 * Get optimal session length recommendation
 *
 * @param profile - User's learning profile
 * @returns Recommended session length in minutes
 */
export function getOptimalSessionLength(profile: UserLearningProfile | null): number {
  if (!profile) {
    return DEFAULT_SESSION_LENGTH
  }

  // Use stored optimal length if available
  if (profile.optimal_session_length > 0) {
    return Math.min(MAX_SESSION_LENGTH, Math.max(MIN_SESSION_LENGTH, profile.optimal_session_length))
  }

  // Calculate based on average with buffer
  const avgLength = profile.avg_session_length || DEFAULT_SESSION_LENGTH

  // Add 20% to average for optimal (encourage slightly longer sessions)
  let optimal = Math.round(avgLength * 1.2)

  // Clamp to bounds
  optimal = Math.max(MIN_SESSION_LENGTH, Math.min(MAX_SESSION_LENGTH, optimal))

  return optimal
}

/**
 * Get optimal time of day to study
 *
 * @param profile - User's learning profile
 * @returns Human-readable time recommendation
 */
export function getOptimalReviewTime(profile: UserLearningProfile | null): string {
  if (!profile || profile.peak_performance_hour === null) {
    return 'Morning (9-11 AM)' // Default recommendation
  }

  const hour = profile.peak_performance_hour

  // Format as specific time range
  const startHour = hour
  const endHour = (hour + 2) % 24

  const formatHour = (h: number): string => {
    const period = h >= 12 ? 'PM' : 'AM'
    const displayHour = h % 12 || 12
    return `${displayHour} ${period}`
  }

  const period = getTimePeriod(hour)
  return `${period} (${formatHour(startHour)} - ${formatHour(endHour)})`
}

/**
 * Get time period label for an hour
 */
export function getTimePeriod(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Morning'
  if (hour >= 12 && hour < 17) return 'Afternoon'
  if (hour >= 17 && hour < 21) return 'Evening'
  return 'Night'
}

/**
 * Get personalized study recommendations
 */
export function getStudyRecommendations(
  profile: UserLearningProfile | null,
  patterns: UserPatterns | null
): string[] {
  const recommendations: string[] = []

  if (!profile && !patterns) {
    return [
      'Complete more lessons to get personalized recommendations',
      'Try studying at different times to find your optimal schedule',
      'Aim for consistent daily practice to build momentum',
    ]
  }

  const p = profile
  const pat = patterns

  // Session length recommendation
  if (p?.optimal_session_length) {
    recommendations.push(
      `Your optimal study session is ${p.optimal_session_length} minutes. ` +
        `Sessions longer than this may lead to diminishing returns.`
    )
  }

  // Time of day recommendation
  if (p?.peak_performance_hour !== null && p?.peak_performance_hour !== undefined) {
    recommendations.push(
      `You perform best during ${getOptimalReviewTime(p)}. ` +
        `Try to schedule important study sessions during this time.`
    )
  }

  // Accuracy trend feedback
  if (p?.accuracy_trend === 'improving') {
    recommendations.push(
      `Your accuracy is improving! Keep up the consistent practice.`
    )
  } else if (p?.accuracy_trend === 'declining') {
    recommendations.push(
      `Your accuracy has been declining. Consider reviewing fundamentals ` +
        `or reducing session length to maintain focus.`
    )
  }

  // Speed-based recommendations
  if (p?.speed_preference === 'fast' && p.overall_accuracy < 0.7) {
    recommendations.push(
      `You tend to answer quickly. Try slowing down a bit to improve accuracy.`
    )
  } else if (p?.speed_preference === 'slow') {
    recommendations.push(
      `Take your time - your thoughtful approach leads to better retention.`
    )
  }

  // Difficult content recommendations
  if (pat?.difficultStepTypes && pat.difficultStepTypes.length > 0) {
    recommendations.push(
      `Focus extra attention on: ${pat.difficultStepTypes.join(', ')}. ` +
        `These content types need more practice.`
    )
  }

  // Session frequency
  if (pat && pat.sessionsPerWeek < 3) {
    recommendations.push(
      `Increasing study frequency to at least 3 sessions per week ` +
        `would significantly improve retention.`
    )
  }

  return recommendations
}

// =============================================================================
// Helper Functions - Time Analysis
// =============================================================================

function calculateAvgTimePerStepType(steps: StepPerformanceRecord[]): Record<string, number> {
  const timesByType: Record<string, number[]> = {}

  for (const step of steps) {
    if (!timesByType[step.step_type]) {
      timesByType[step.step_type] = []
    }
    if (step.time_ms > 0 && step.time_ms < 300000) {
      // Ignore outliers > 5 min
      timesByType[step.step_type].push(step.time_ms)
    }
  }

  const result: Record<string, number> = {}
  for (const [type, times] of Object.entries(timesByType)) {
    if (times.length > 0) {
      result[type] = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    }
  }

  return result
}

function calculateAvgTimePerRating(reviews: ReviewLogRecord[]): Record<number, number> {
  const timesByRating: Record<number, number[]> = { 1: [], 2: [], 3: [], 4: [] }

  for (const review of reviews) {
    if (review.review_duration_ms && review.review_duration_ms > 0 && review.review_duration_ms < 300000) {
      timesByRating[review.rating]?.push(review.review_duration_ms)
    }
  }

  const result: Record<number, number> = {}
  for (const [rating, times] of Object.entries(timesByRating)) {
    if (times.length > 0) {
      result[parseInt(rating)] = Math.round(times.reduce((a, b) => a + b, 0) / times.length)
    }
  }

  return result
}

function calculatePerformanceByHour(
  steps: StepPerformanceRecord[],
  reviews: ReviewLogRecord[]
): HourlyPerformance[] {
  const hourlyData: Record<number, { correct: number; total: number; times: number[] }> = {}

  // Initialize all hours
  for (let h = 0; h < 24; h++) {
    hourlyData[h] = { correct: 0, total: 0, times: [] }
  }

  // Process step performance
  for (const step of steps) {
    const hour = new Date(step.created_at).getHours()
    if (step.was_correct !== null) {
      hourlyData[hour].total++
      if (step.was_correct) hourlyData[hour].correct++
    }
    if (step.time_ms > 0 && step.time_ms < 300000) {
      hourlyData[hour].times.push(step.time_ms)
    }
  }

  // Process reviews
  for (const review of reviews) {
    const hour = new Date(review.reviewed_at).getHours()
    hourlyData[hour].total++
    if (review.rating >= 3) hourlyData[hour].correct++ // Good/Easy = correct
    if (review.review_duration_ms && review.review_duration_ms > 0) {
      hourlyData[hour].times.push(review.review_duration_ms)
    }
  }

  return Object.entries(hourlyData).map(([hour, data]) => ({
    hour: parseInt(hour),
    accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
    avgResponseTime:
      data.times.length > 0
        ? Math.round(data.times.reduce((a, b) => a + b, 0) / data.times.length)
        : 0,
    totalAttempts: data.total,
  }))
}

function findBestPerformanceHour(hourlyPerf: HourlyPerformance[]): number {
  const validHours = hourlyPerf.filter((h) => h.totalAttempts >= MIN_DATA_POINTS_FOR_ANALYSIS)

  if (validHours.length === 0) {
    return 9 // Default to 9 AM
  }

  // Score by accuracy weighted by attempts
  return validHours.reduce((best, current) =>
    current.accuracy > best.accuracy ? current : best
  ).hour
}

function findWorstPerformanceHour(hourlyPerf: HourlyPerformance[]): number {
  const validHours = hourlyPerf.filter((h) => h.totalAttempts >= MIN_DATA_POINTS_FOR_ANALYSIS)

  if (validHours.length === 0) {
    return 23 // Default to 11 PM
  }

  return validHours.reduce((worst, current) =>
    current.accuracy < worst.accuracy ? current : worst
  ).hour
}

function determinePreferredTime(
  hourlyPerf: HourlyPerformance[]
): 'morning' | 'afternoon' | 'evening' | 'night' {
  const periodTotals = {
    morning: 0,
    afternoon: 0,
    evening: 0,
    night: 0,
  }

  for (const perf of hourlyPerf) {
    const hour = perf.hour
    if (hour >= 5 && hour < 12) periodTotals.morning += perf.totalAttempts
    else if (hour >= 12 && hour < 17) periodTotals.afternoon += perf.totalAttempts
    else if (hour >= 17 && hour < 21) periodTotals.evening += perf.totalAttempts
    else periodTotals.night += perf.totalAttempts
  }

  const max = Math.max(...Object.values(periodTotals))
  const preferred = Object.entries(periodTotals).find(([, v]) => v === max)?.[0]

  return (preferred as 'morning' | 'afternoon' | 'evening' | 'night') || 'morning'
}

// =============================================================================
// Helper Functions - Accuracy Analysis
// =============================================================================

function analyzeAccuracyTrend(
  steps: StepPerformanceRecord[],
  reviews: ReviewLogRecord[]
): { trend: 'improving' | 'stable' | 'declining'; recent: number; overall: number } {
  // Calculate overall accuracy
  let totalCorrect = 0
  let totalAttempts = 0

  for (const step of steps) {
    if (step.was_correct !== null) {
      totalAttempts++
      if (step.was_correct) totalCorrect++
    }
  }

  for (const review of reviews) {
    totalAttempts++
    if (review.rating >= 3) totalCorrect++
  }

  const overall = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : 0

  // Calculate recent accuracy (last 7 days)
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

  let recentCorrect = 0
  let recentTotal = 0

  for (const step of steps) {
    if (new Date(step.created_at) >= sevenDaysAgo && step.was_correct !== null) {
      recentTotal++
      if (step.was_correct) recentCorrect++
    }
  }

  for (const review of reviews) {
    if (new Date(review.reviewed_at) >= sevenDaysAgo) {
      recentTotal++
      if (review.rating >= 3) recentCorrect++
    }
  }

  const recent = recentTotal > 0 ? Math.round((recentCorrect / recentTotal) * 100) : overall

  // Determine trend
  let trend: 'improving' | 'stable' | 'declining' = 'stable'
  const diff = recent - overall

  if (recentTotal >= MIN_DATA_POINTS_FOR_ANALYSIS) {
    if (diff > 5) trend = 'improving'
    else if (diff < -5) trend = 'declining'
  }

  return { trend, recent, overall }
}

// =============================================================================
// Helper Functions - Difficulty Analysis
// =============================================================================

function analyzeDifficulty(steps: StepPerformanceRecord[]): {
  difficult: string[]
  strong: string[]
} {
  const typeStats: Record<string, { correct: number; total: number }> = {}

  for (const step of steps) {
    if (step.was_correct === null) continue

    if (!typeStats[step.step_type]) {
      typeStats[step.step_type] = { correct: 0, total: 0 }
    }

    typeStats[step.step_type].total++
    if (step.was_correct) typeStats[step.step_type].correct++
  }

  const difficult: string[] = []
  const strong: string[] = []

  for (const [type, stats] of Object.entries(typeStats)) {
    if (stats.total < MIN_DATA_POINTS_FOR_ANALYSIS) continue

    const accuracy = stats.correct / stats.total

    if (accuracy < 0.6) {
      difficult.push(type)
    } else if (accuracy > 0.85) {
      strong.push(type)
    }
  }

  return { difficult, strong }
}

// =============================================================================
// Helper Functions - Session Analysis
// =============================================================================

function analyzeSessionPatterns(
  steps: StepPerformanceRecord[],
  reviews: ReviewLogRecord[]
): SessionAnalysis {
  // Group activities by day
  const activityByDay: Record<string, { timestamps: Date[]; correct: number; total: number }> = {}

  for (const step of steps) {
    const day = step.created_at.split('T')[0]
    if (!activityByDay[day]) {
      activityByDay[day] = { timestamps: [], correct: 0, total: 0 }
    }
    activityByDay[day].timestamps.push(new Date(step.created_at))
    if (step.was_correct !== null) {
      activityByDay[day].total++
      if (step.was_correct) activityByDay[day].correct++
    }
  }

  for (const review of reviews) {
    const day = review.reviewed_at.split('T')[0]
    if (!activityByDay[day]) {
      activityByDay[day] = { timestamps: [], correct: 0, total: 0 }
    }
    activityByDay[day].timestamps.push(new Date(review.reviewed_at))
    activityByDay[day].total++
    if (review.rating >= 3) activityByDay[day].correct++
  }

  // Calculate session durations
  const sessions: SessionData[] = []

  for (const [date, data] of Object.entries(activityByDay)) {
    if (data.timestamps.length < 2) continue

    data.timestamps.sort((a, b) => a.getTime() - b.getTime())

    const first = data.timestamps[0]
    const last = data.timestamps[data.timestamps.length - 1]
    const duration = (last.getTime() - first.getTime()) / 60000 // minutes

    if (duration > 0 && duration < 180) {
      // Ignore sessions > 3 hours
      sessions.push({
        date,
        duration,
        stepsCompleted: data.total,
        accuracy: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
      })
    }
  }

  // Calculate averages
  const durations = sessions.map((s) => s.duration)
  const avgLength = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : DEFAULT_SESSION_LENGTH

  const sortedDurations = [...durations].sort((a, b) => a - b)
  const medianLength =
    sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length / 2)]
      : DEFAULT_SESSION_LENGTH

  // Estimate drop-off point (75th percentile of session lengths)
  const dropOffPoint =
    sortedDurations.length > 0
      ? sortedDurations[Math.floor(sortedDurations.length * 0.75)]
      : DEFAULT_SESSION_LENGTH

  return {
    sessions,
    avgLength: Math.round(avgLength),
    medianLength: Math.round(medianLength),
    dropOffPoint: Math.round(dropOffPoint),
  }
}

function calculateSessionsPerWeek(
  steps: StepPerformanceRecord[],
  reviews: ReviewLogRecord[]
): number {
  const uniqueDays = new Set<string>()

  for (const step of steps) {
    uniqueDays.add(step.created_at.split('T')[0])
  }

  for (const review of reviews) {
    uniqueDays.add(review.reviewed_at.split('T')[0])
  }

  // Assuming 90 days of data = ~13 weeks
  const weeksOfData = 13
  return Math.round((uniqueDays.size / weeksOfData) * 10) / 10
}

function calculateOptimalSessionLength(patterns: UserPatterns): number {
  // Start with average session length
  let optimal = patterns.avgSessionLength || DEFAULT_SESSION_LENGTH

  // If accuracy is declining, suggest shorter sessions
  if (patterns.accuracyTrend === 'declining') {
    optimal = optimal * 0.8
  }

  // If accuracy is high and improving, can suggest slightly longer
  if (patterns.accuracyTrend === 'improving' && patterns.overallAccuracy > 80) {
    optimal = optimal * 1.1
  }

  // Clamp to bounds
  return Math.round(Math.max(MIN_SESSION_LENGTH, Math.min(MAX_SESSION_LENGTH, optimal)))
}

// =============================================================================
// Helper Functions - Preferences
// =============================================================================

function determineSpeedPreference(avgTimePerStepType: Record<string, number>): 'fast' | 'moderate' | 'slow' {
  const times = Object.values(avgTimePerStepType)
  if (times.length === 0) return 'moderate'

  const avgTime = times.reduce((a, b) => a + b, 0) / times.length

  // < 5 seconds = fast, > 15 seconds = slow
  if (avgTime < 5000) return 'fast'
  if (avgTime > 15000) return 'slow'
  return 'moderate'
}

function determineDifficultyPreference(accuracy: number): 'easy' | 'moderate' | 'challenging' {
  // High accuracy suggests user can handle more challenge
  if (accuracy > 85) return 'challenging'
  if (accuracy > 70) return 'moderate'
  return 'easy'
}

function calculateOverallAvgResponseTime(avgTimePerStepType: Record<string, number>): number {
  const times = Object.values(avgTimePerStepType)
  if (times.length === 0) return 0
  return Math.round(times.reduce((a, b) => a + b, 0) / times.length)
}

