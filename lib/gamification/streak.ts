/**
 * Streak Tracking System
 *
 * Tracks daily learning streaks to encourage consistent study habits.
 * A streak is maintained by completing at least one learning activity per day.
 */

// ============================================
// TYPES
// ============================================

export interface StreakResult {
  /** Current streak count */
  currentStreak: number
  /** All-time longest streak */
  longestStreak: number
  /** Whether streak was maintained today */
  streakMaintained: boolean
  /** Whether streak was broken (reset to 1) */
  streakBroken: boolean
  /** Whether this is a new streak (first activity) */
  streakStarted: boolean
  /** XP earned from streak (if any) */
  xpEarned: number
}

export interface StreakStatus {
  /** Current streak count */
  current: number
  /** All-time longest streak */
  longest: number
  /** Date of last activity (null if never) */
  lastActivity: Date | null
  /** True if no activity today and streak > 0 */
  isAtRisk: boolean
  /** Hours remaining until streak breaks (0 if already safe today) */
  hoursRemaining: number
  /** Whether user has been active today */
  activeToday: boolean
  /** Streak milestones */
  nextMilestone: number | null
  daysToMilestone: number
}

export interface StreakData {
  userId: string
  currentStreak: number
  longestStreak: number
  lastActivityDate: string | null // ISO date string (YYYY-MM-DD)
  streakFreezes: number
  lastFreezeUsed: string | null
}

export interface StreakMilestone {
  days: number
  label: string
  emoji: string
  xpBonus: number
}

// ============================================
// CONSTANTS
// ============================================

/** Streak milestones with rewards */
export const STREAK_MILESTONES: StreakMilestone[] = [
  { days: 3, label: '3 Day Streak', emoji: '🔥', xpBonus: 10 },
  { days: 7, label: 'Week Warrior', emoji: '⚡', xpBonus: 25 },
  { days: 14, label: 'Two Weeks Strong', emoji: '💪', xpBonus: 50 },
  { days: 30, label: 'Monthly Master', emoji: '🏆', xpBonus: 100 },
  { days: 60, label: 'Two Month Titan', emoji: '👑', xpBonus: 200 },
  { days: 90, label: 'Quarter Champion', emoji: '💎', xpBonus: 300 },
  { days: 180, label: 'Half Year Hero', emoji: '🌟', xpBonus: 500 },
  { days: 365, label: 'Year of Learning', emoji: '🎓', xpBonus: 1000 },
]

/** Base XP for maintaining streak */
const STREAK_MAINTAIN_XP = 5

// ============================================
// DATE UTILITIES
// ============================================

/**
 * Get today's date as YYYY-MM-DD string in the given timezone.
 * Uses Intl.DateTimeFormat with 'en-CA' locale to produce YYYY-MM-DD format.
 *
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 */
export function getTodayDateString(timezone: string = 'UTC'): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(new Date())
}

/**
 * Get yesterday's date as YYYY-MM-DD string in the given timezone.
 *
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 */
export function getYesterdayDateString(timezone: string = 'UTC'): string {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  return new Intl.DateTimeFormat('en-CA', { timeZone: timezone }).format(yesterday)
}

/**
 * Parse a date string to Date object (at midnight UTC)
 */
export function parseDateString(dateString: string): Date {
  return new Date(dateString + 'T00:00:00Z')
}

/**
 * Calculate hours remaining until end of day (UTC)
 */
export function getHoursUntilMidnight(): number {
  const now = new Date()
  const midnight = new Date(now)
  midnight.setUTCHours(24, 0, 0, 0)
  return Math.max(0, (midnight.getTime() - now.getTime()) / (1000 * 60 * 60))
}

/**
 * Calculate days between two date strings
 */
export function daysBetween(dateStr1: string, dateStr2: string): number {
  const date1 = parseDateString(dateStr1)
  const date2 = parseDateString(dateStr2)
  const diffTime = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(diffTime / (1000 * 60 * 60 * 24))
}

// ============================================
// CORE STREAK FUNCTIONS
// ============================================

/**
 * Check and update streak based on activity
 *
 * Logic:
 * - If no previous activity: start new streak (1)
 * - If last activity was today: already counted, return current
 * - If last activity was yesterday: increment streak
 * - If last activity was older: streak broken, reset to 1
 *
 * @param streakData - Current streak data from database
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 * @returns StreakResult with updated values
 */
export function checkAndUpdateStreak(streakData: StreakData, timezone: string = 'UTC'): StreakResult {
  const today = getTodayDateString(timezone)
  const yesterday = getYesterdayDateString(timezone)

  let currentStreak = streakData.currentStreak || 0
  let longestStreak = streakData.longestStreak || 0
  let streakMaintained = false
  let streakBroken = false
  let streakStarted = false
  let xpEarned = 0

  const lastActivity = streakData.lastActivityDate

  // Case 1: No previous activity - start new streak
  if (!lastActivity) {
    currentStreak = 1
    streakStarted = true
    xpEarned = STREAK_MAINTAIN_XP
  }
  // Case 2: Already active today - no change
  else if (lastActivity === today) {
    streakMaintained = true
    // No additional XP, already counted today
  }
  // Case 3: Last activity was yesterday - increment streak
  else if (lastActivity === yesterday) {
    currentStreak += 1
    streakMaintained = true
    xpEarned = STREAK_MAINTAIN_XP

    // Check for milestone bonus
    const milestone = getReachedMilestone(currentStreak)
    if (milestone) {
      xpEarned += milestone.xpBonus
    }
  }
  // Case 4: Last activity was older - streak broken
  else {
    const daysSince = daysBetween(lastActivity, today)
    if (daysSince > 1) {
      streakBroken = currentStreak > 0
      currentStreak = 1
      streakStarted = true
      xpEarned = STREAK_MAINTAIN_XP
    }
  }

  // Update longest streak if needed
  if (currentStreak > longestStreak) {
    longestStreak = currentStreak
  }

  return {
    currentStreak,
    longestStreak,
    streakMaintained,
    streakBroken,
    streakStarted,
    xpEarned,
  }
}

/**
 * Get current streak status without modifying it
 *
 * @param streakData - Current streak data from database
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 * @returns StreakStatus with current state
 */
export function getStreakStatus(streakData: StreakData, timezone: string = 'UTC'): StreakStatus {
  const today = getTodayDateString(timezone)
  const yesterday = getYesterdayDateString(timezone)

  const current = streakData.currentStreak || 0
  const longest = streakData.longestStreak || 0
  const lastActivity = streakData.lastActivityDate
    ? parseDateString(streakData.lastActivityDate)
    : null

  // Check if active today
  const activeToday = lastActivity !== null && streakData.lastActivityDate === today

  // Calculate if streak is at risk
  // At risk if: has a streak, not active today, and last activity was yesterday
  const isAtRisk =
    current > 0 &&
    !activeToday &&
    streakData.lastActivityDate === yesterday

  // Calculate hours remaining
  // If active today: 0 (safe)
  // If at risk: hours until midnight
  // If streak already broken: 0
  let hoursRemaining = 0
  if (isAtRisk) {
    hoursRemaining = Math.round(getHoursUntilMidnight() * 10) / 10
  }

  // Calculate next milestone
  const nextMilestone = getNextMilestone(current)
  const daysToMilestone = nextMilestone ? nextMilestone.days - current : 0

  return {
    current,
    longest,
    lastActivity,
    isAtRisk,
    hoursRemaining,
    activeToday,
    nextMilestone: nextMilestone?.days || null,
    daysToMilestone,
  }
}

/**
 * Check if streak would be broken without activity today
 *
 * @param streakData - Current streak data
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 * @returns True if streak would break without today's activity
 */
export function wouldStreakBreak(streakData: StreakData, timezone: string = 'UTC'): boolean {
  const today = getTodayDateString(timezone)
  const yesterday = getYesterdayDateString(timezone)

  if (!streakData.lastActivityDate) {
    return false // No streak to break
  }

  if (streakData.lastActivityDate === today) {
    return false // Already active today
  }

  // Streak would break if last activity is older than yesterday
  return streakData.lastActivityDate !== yesterday
}

// ============================================
// MILESTONE FUNCTIONS
// ============================================

/**
 * Get the milestone reached at a specific streak count
 *
 * @param streak - Current streak count
 * @returns Milestone if exactly reached, null otherwise
 */
export function getReachedMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days === streak) || null
}

/**
 * Get the next upcoming milestone
 *
 * @param streak - Current streak count
 * @returns Next milestone or null if all achieved
 */
export function getNextMilestone(streak: number): StreakMilestone | null {
  return STREAK_MILESTONES.find((m) => m.days > streak) || null
}

/**
 * Get all achieved milestones
 *
 * @param streak - Current or longest streak count
 * @returns Array of achieved milestones
 */
export function getAchievedMilestones(streak: number): StreakMilestone[] {
  return STREAK_MILESTONES.filter((m) => m.days <= streak)
}

/**
 * Get streak milestone progress
 *
 * @param streak - Current streak count
 * @returns Progress toward next milestone
 */
export function getMilestoneProgress(streak: number): {
  current: number
  target: number
  percent: number
  milestone: StreakMilestone | null
} {
  const nextMilestone = getNextMilestone(streak)

  if (!nextMilestone) {
    return {
      current: streak,
      target: streak,
      percent: 100,
      milestone: null,
    }
  }

  // Find previous milestone
  const achievedMilestones = getAchievedMilestones(streak)
  const prevMilestone = achievedMilestones[achievedMilestones.length - 1]
  const startPoint = prevMilestone?.days || 0

  const current = streak - startPoint
  const target = nextMilestone.days - startPoint
  const percent = Math.round((current / target) * 100)

  return {
    current,
    target,
    percent,
    milestone: nextMilestone,
  }
}

// ============================================
// DISPLAY HELPERS
// ============================================

/**
 * Get flame emoji count based on streak
 *
 * @param streak - Current streak count
 * @returns String of flame emojis
 */
export function getStreakFlames(streak: number): string {
  if (streak === 0) return ''
  if (streak < 7) return '🔥'
  if (streak < 30) return '🔥🔥'
  if (streak < 100) return '🔥🔥🔥'
  return '🔥🔥🔥🔥'
}

/**
 * Get streak color class (Tailwind)
 *
 * @param streak - Current streak count
 * @returns Tailwind color class
 */
export function getStreakColor(streak: number): string {
  if (streak === 0) return 'text-gray-400'
  if (streak < 7) return 'text-orange-500'
  if (streak < 30) return 'text-orange-600'
  if (streak < 100) return 'text-red-500'
  return 'text-red-600'
}

/**
 * Get streak background gradient (Tailwind)
 *
 * @param streak - Current streak count
 * @returns Tailwind gradient classes
 */
export function getStreakGradient(streak: number): string {
  if (streak === 0) return 'from-gray-400 to-gray-500'
  if (streak < 7) return 'from-orange-400 to-orange-600'
  if (streak < 30) return 'from-orange-500 to-red-500'
  if (streak < 100) return 'from-red-500 to-pink-500'
  return 'from-red-600 to-purple-600'
}

/**
 * Format streak message based on status
 *
 * @param status - Current streak status
 * @returns User-friendly message
 */
export function getStreakMessage(status: StreakStatus): string {
  if (status.current === 0) {
    return 'Start your streak today!'
  }

  if (status.activeToday) {
    if (status.current === 1) {
      return 'Great start! Come back tomorrow to continue your streak.'
    }
    return `${status.current} day streak! Keep it going!`
  }

  if (status.isAtRisk) {
    const hours = Math.floor(status.hoursRemaining)
    if (hours < 1) {
      return `🚨 Streak at risk! Less than an hour to maintain your ${status.current} day streak!`
    }
    return `⚠️ ${hours}h left to maintain your ${status.current} day streak!`
  }

  return `Your ${status.current} day streak ended. Start a new one today!`
}

/**
 * Get encouraging message for streak milestones
 *
 * @param milestone - Milestone reached
 * @returns Celebratory message
 */
export function getMilestoneMessage(milestone: StreakMilestone): string {
  return `${milestone.emoji} ${milestone.label}! +${milestone.xpBonus} XP bonus!`
}

// ============================================
// STREAK FREEZE
// ============================================

/**
 * Check if user can use a streak freeze
 * @param streakData - Current streak data
 * @returns Whether freeze is available
 */
export function canUseStreakFreeze(streakData: StreakData): boolean {
  if (streakData.streakFreezes <= 0) return false

  // Check if freeze was used in the past 7 days
  if (streakData.lastFreezeUsed) {
    const today = getTodayDateString()
    const daysSinceFreeze = daysBetween(streakData.lastFreezeUsed, today)
    if (daysSinceFreeze < 7) return false
  }

  return true
}

/**
 * Use a streak freeze to prevent break
 * @param streakData - Current streak data
 * @returns Updated streak data or null if freeze unavailable
 */
export function useStreakFreeze(streakData: StreakData): StreakData | null {
  if (!canUseStreakFreeze(streakData)) {
    return null
  }

  const today = getTodayDateString()

  return {
    ...streakData,
    streakFreezes: streakData.streakFreezes - 1,
    lastFreezeUsed: today,
    lastActivityDate: today, // Treat as activity to preserve streak
  }
}

// ============================================
// DATABASE HELPERS
// ============================================

/**
 * Create default streak data for new user
 *
 * @param userId - User ID
 * @returns Default StreakData object
 */
export function createDefaultStreakData(userId: string): StreakData {
  return {
    userId,
    currentStreak: 0,
    longestStreak: 0,
    lastActivityDate: null,
    streakFreezes: 1,
    lastFreezeUsed: null,
  }
}

/**
 * Prepare streak data for database update
 *
 * @param result - StreakResult from checkAndUpdateStreak
 * @param timezone - IANA timezone string (e.g. 'America/New_York'). Defaults to 'UTC'.
 * @returns Object ready for database update
 */
export function prepareStreakUpdate(result: StreakResult, timezone: string = 'UTC'): {
  current_streak: number
  longest_streak: number
  last_activity_date: string
} {
  return {
    current_streak: result.currentStreak,
    longest_streak: result.longestStreak,
    last_activity_date: getTodayDateString(timezone),
  }
}
