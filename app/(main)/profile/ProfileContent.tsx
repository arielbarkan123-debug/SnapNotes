'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import {
  getXPProgress,
  getLevelTitle,
  getLevelBadge,
  getLevelColor as _getLevelColor,
  getLevelGradient as _getLevelGradient,
  formatXP,
} from '@/lib/gamification/xp'
import {
  ACHIEVEMENTS,
  getAchievementColor,
  type AchievementCategory,
} from '@/lib/gamification/achievements'
// Reserved for future achievement display features
void _getLevelColor
void _getLevelGradient
import { StreakWidget } from '@/components/gamification/StreakWidget'

// =============================================================================
// Types
// =============================================================================

interface UserData {
  id: string
  email: string
  name: string
  createdAt: string
}

interface GamificationData {
  total_xp: number
  current_level: number
  current_streak: number
  longest_streak: number
  last_activity_date: string | null
  total_lessons_completed: number
  total_courses_completed: number
  total_cards_reviewed: number
  perfect_lessons: number
}

interface EarnedAchievement {
  id: string
  achievement_code: string
  earned_at: string
  xp_awarded: number
}

interface ActivityData {
  lessons: number
  cards: number
}

interface ProfileContentProps {
  user: UserData
  gamification: GamificationData
  achievements: EarnedAchievement[]
  activityByDate: Record<string, ActivityData>
  courseCount: number
}

// =============================================================================
// Profile Content Component
// =============================================================================

export default function ProfileContent({
  user,
  gamification,
  achievements,
  activityByDate,
  courseCount,
}: ProfileContentProps) {
  const [selectedCategory, setSelectedCategory] = useState<AchievementCategory | 'all'>('all')
  const [selectedAchievement, setSelectedAchievement] = useState<string | null>(null)

  // Calculate XP progress
  const xpProgress = getXPProgress(gamification.total_xp)
  const earnedCodes = new Set(achievements.map((a) => a.achievement_code))

  // Check if active today
  const today = new Date().toISOString().split('T')[0]
  const activeToday = gamification.last_activity_date === today

  // Calculate streak at risk
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toISOString().split('T')[0]
  const isAtRisk =
    gamification.current_streak > 0 &&
    !activeToday &&
    gamification.last_activity_date === yesterdayStr

  // Calculate hours remaining in day
  const now = new Date()
  const midnight = new Date(now)
  midnight.setHours(24, 0, 0, 0)
  const hoursRemaining = (midnight.getTime() - now.getTime()) / (1000 * 60 * 60)

  // Get recent activity for streak widget (last 7 days)
  const recentActivity = useMemo(() => {
    const days: boolean[] = []
    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      days.push(!!activityByDate[dateStr])
    }
    return days
  }, [activityByDate])

  return (
    <div className="mx-auto max-w-4xl px-4 py-8">
      {/* Header Section */}
      <div className="mb-8 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-6 text-white shadow-xl">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          {/* User Info */}
          <div className="flex items-center gap-4">
            <div
              className={`
                flex h-20 w-20 items-center justify-center rounded-full
                bg-white/20 text-4xl backdrop-blur-sm
              `}
            >
              {getLevelBadge(xpProgress.level)}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{user.name}</h1>
              <div className="flex items-center gap-2 text-white/90">
                <span className={`font-semibold`}>
                  Level {xpProgress.level}
                </span>
                <span className="text-white/60">•</span>
                <span>{getLevelTitle(xpProgress.level)}</span>
              </div>
              <div className="mt-1 text-sm text-white/70">
                Member since {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Edit Profile Button */}
          <Link
            href="/settings"
            className="flex items-center gap-2 rounded-lg bg-white/20 px-4 py-2 text-sm font-medium backdrop-blur-sm transition-all hover:bg-white/30"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Edit Profile
          </Link>
        </div>

        {/* XP Progress Bar */}
        <div className="mt-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-medium">XP Progress</span>
            <span className="text-white/80">
              {formatXP(xpProgress.xpInLevel)} / {formatXP(xpProgress.xpNeeded)} XP to Level {xpProgress.level + 1}
            </span>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-white/20">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${xpProgress.percent}%` }}
            />
          </div>
          <div className="mt-2 text-center text-sm text-white/70">
            Total: {formatXP(gamification.total_xp)} XP
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          icon="🔥"
          value={gamification.current_streak}
          label="Day Streak"
          sublabel={gamification.longest_streak > gamification.current_streak ? `Best: ${gamification.longest_streak}` : undefined}
          highlight={gamification.current_streak >= 7}
        />
        <StatCard
          icon="📚"
          value={courseCount}
          label="Courses"
        />
        <StatCard
          icon="✓"
          value={gamification.total_cards_reviewed}
          label="Cards Reviewed"
        />
        <StatCard
          icon="🎯"
          value={gamification.perfect_lessons}
          label="Perfect Lessons"
        />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-8 lg:grid-cols-2">
        {/* Left Column */}
        <div className="space-y-8">
          {/* Streak Widget */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Current Streak
            </h2>
            <StreakWidget
              currentStreak={gamification.current_streak}
              longestStreak={gamification.longest_streak}
              isAtRisk={isAtRisk}
              activeToday={activeToday}
              hoursRemaining={hoursRemaining}
              recentActivity={recentActivity}
            />
          </div>

          {/* Activity Calendar */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Activity Calendar
            </h2>
            <ActivityCalendar activityByDate={activityByDate} />
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-8">
          {/* Achievements Section */}
          <div>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Achievements ({earnedCodes.size}/{ACHIEVEMENTS.filter(a => !a.hidden || earnedCodes.has(a.code)).length})
              </h2>
            </div>

            {/* Category Filter */}
            <div className="mb-4 flex gap-2">
              {(['all', 'streak', 'learning', 'mastery'] as const).map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    rounded-full px-3 py-1 text-sm font-medium transition-all
                    ${selectedCategory === cat
                      ? 'bg-indigo-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700'
                    }
                  `}
                >
                  {cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
                </button>
              ))}
            </div>

            {/* Achievements Grid */}
            <AchievementsGrid
              category={selectedCategory}
              earnedCodes={earnedCodes}
              achievements={achievements}
              selectedAchievement={selectedAchievement}
              onSelect={setSelectedAchievement}
            />
          </div>

          {/* Recent Activity */}
          <div>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h2>
            <RecentActivityList activityByDate={activityByDate} />
          </div>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Stat Card Component
// =============================================================================

interface StatCardProps {
  icon: string
  value: number
  label: string
  sublabel?: string
  highlight?: boolean
}

function StatCard({ icon, value, label, sublabel, highlight }: StatCardProps) {
  return (
    <div
      className={`
        rounded-xl border p-4 text-center transition-all
        ${highlight
          ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:border-orange-800/50 dark:from-orange-900/20 dark:to-red-900/20'
          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
        }
      `}
    >
      <div className="text-2xl">{icon}</div>
      <div className="mt-1 text-2xl font-bold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </div>
      <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
      {sublabel && (
        <div className="mt-1 text-xs text-gray-400 dark:text-gray-500">{sublabel}</div>
      )}
    </div>
  )
}

// =============================================================================
// Activity Calendar Component
// =============================================================================

interface ActivityCalendarProps {
  activityByDate: Record<string, ActivityData>
}

function ActivityCalendar({ activityByDate }: ActivityCalendarProps) {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null)

  // Generate last 90 days
  const days = useMemo(() => {
    const result: { date: string; level: number; data?: ActivityData }[] = []
    const today = new Date()

    for (let i = 89; i >= 0; i--) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const activity = activityByDate[dateStr]

      let level = 0
      if (activity) {
        const total = activity.lessons + activity.cards
        if (total >= 50) level = 4
        else if (total >= 20) level = 3
        else if (total >= 10) level = 2
        else if (total >= 1) level = 1
      }

      result.push({ date: dateStr, level, data: activity })
    }

    return result
  }, [activityByDate])

  // Group by weeks
  const weeks = useMemo(() => {
    const result: typeof days[] = []
    let currentWeek: typeof days = []

    // Pad start to align with week start (Sunday)
    const firstDate = new Date(days[0].date)
    const startPadding = firstDate.getDay()
    for (let i = 0; i < startPadding; i++) {
      currentWeek.push({ date: '', level: -1 })
    }

    days.forEach((day) => {
      currentWeek.push(day)
      if (currentWeek.length === 7) {
        result.push(currentWeek)
        currentWeek = []
      }
    })

    if (currentWeek.length > 0) {
      result.push(currentWeek)
    }

    return result
  }, [days])

  const getColorClass = (level: number) => {
    switch (level) {
      case -1:
        return 'bg-transparent'
      case 0:
        return 'bg-gray-100 dark:bg-gray-800'
      case 1:
        return 'bg-green-200 dark:bg-green-900'
      case 2:
        return 'bg-green-400 dark:bg-green-700'
      case 3:
        return 'bg-green-500 dark:bg-green-600'
      case 4:
        return 'bg-green-600 dark:bg-green-500'
      default:
        return 'bg-gray-100 dark:bg-gray-800'
    }
  }

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
      {/* Month labels */}
      <div className="mb-2 flex text-xs text-gray-500 dark:text-gray-400">
        {['', '', 'Jan', '', 'Feb', '', 'Mar', '', 'Apr', '', 'May', '', 'Jun', '', 'Jul', '', 'Aug', '', 'Sep', '', 'Oct', '', 'Nov', '', 'Dec'].slice(
          new Date().getMonth() - 2,
          new Date().getMonth() + 2
        ).map((month, i) => (
          <span key={i} className="flex-1">{month}</span>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="flex gap-1">
        {/* Day labels */}
        <div className="flex flex-col gap-1 pr-2 text-xs text-gray-400 dark:text-gray-500">
          <span className="h-3"></span>
          <span className="h-3">M</span>
          <span className="h-3"></span>
          <span className="h-3">W</span>
          <span className="h-3"></span>
          <span className="h-3">F</span>
          <span className="h-3"></span>
        </div>

        {/* Weeks */}
        <div className="flex flex-1 gap-1 overflow-x-auto">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="flex flex-col gap-1">
              {week.map((day, dayIndex) => (
                <div
                  key={dayIndex}
                  className={`
                    h-3 w-3 rounded-sm transition-all
                    ${getColorClass(day.level)}
                    ${day.date ? 'cursor-pointer hover:ring-2 hover:ring-indigo-500 hover:ring-offset-1' : ''}
                  `}
                  onMouseEnter={() => day.date && setHoveredDate(day.date)}
                  onMouseLeave={() => setHoveredDate(null)}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
        <span>Less</span>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((level) => (
            <div key={level} className={`h-3 w-3 rounded-sm ${getColorClass(level)}`} />
          ))}
        </div>
        <span>More</span>
      </div>

      {/* Tooltip */}
      {hoveredDate && (
        <div className="mt-3 rounded-lg bg-gray-100 px-3 py-2 text-sm dark:bg-gray-700">
          <span className="font-medium">{formatDate(hoveredDate)}: </span>
          {activityByDate[hoveredDate] ? (
            <span>
              {activityByDate[hoveredDate].lessons} lesson steps, {activityByDate[hoveredDate].cards} cards
            </span>
          ) : (
            <span className="text-gray-500">No activity</span>
          )}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Achievements Grid Component
// =============================================================================

interface AchievementsGridProps {
  category: AchievementCategory | 'all'
  earnedCodes: Set<string>
  achievements: EarnedAchievement[]
  selectedAchievement: string | null
  onSelect: (code: string | null) => void
}

function AchievementsGrid({
  category,
  earnedCodes,
  achievements,
  selectedAchievement,
  onSelect,
}: AchievementsGridProps) {
  const filteredAchievements = ACHIEVEMENTS.filter((a) => {
    // Hide hidden achievements unless earned
    if (a.hidden && !earnedCodes.has(a.code)) return false
    // Filter by category
    if (category !== 'all' && a.category !== category) return false
    return true
  })

  const getEarnedDate = (code: string) => {
    const earned = achievements.find((a) => a.achievement_code === code)
    return earned?.earned_at
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-3 sm:grid-cols-5">
        {filteredAchievements.map((achievement) => {
          const isEarned = earnedCodes.has(achievement.code)
          const isSelected = selectedAchievement === achievement.code

          return (
            <button
              key={achievement.code}
              onClick={() => onSelect(isSelected ? null : achievement.code)}
              className={`
                group relative flex flex-col items-center rounded-xl p-3 transition-all
                ${isEarned
                  ? 'bg-gradient-to-br from-amber-50 to-yellow-100 dark:from-amber-900/30 dark:to-yellow-900/30'
                  : 'bg-gray-100 dark:bg-gray-800'
                }
                ${isSelected ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
                hover:scale-105
              `}
            >
              <span
                className={`
                  text-2xl transition-all
                  ${isEarned ? '' : 'grayscale opacity-40'}
                  group-hover:scale-110
                `}
              >
                {achievement.emoji}
              </span>
              {isEarned && (
                <div className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-green-500 text-[10px] text-white">
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* Selected Achievement Details */}
      {selectedAchievement && (
        <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          {(() => {
            const achievement = ACHIEVEMENTS.find((a) => a.code === selectedAchievement)
            if (!achievement) return null
            const isEarned = earnedCodes.has(achievement.code)
            const earnedDate = getEarnedDate(achievement.code)

            return (
              <div className="flex items-start gap-4">
                <span className={`text-4xl ${isEarned ? '' : 'grayscale opacity-50'}`}>
                  {achievement.emoji}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {achievement.name}
                    </h3>
                    <span className={`text-xs font-medium ${getAchievementColor(achievement.category)}`}>
                      {achievement.category}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    {achievement.description}
                  </p>
                  <div className="mt-2 flex items-center gap-4 text-sm">
                    <span className="text-amber-600 dark:text-amber-400">
                      +{achievement.xpReward} XP
                    </span>
                    {isEarned && earnedDate && (
                      <span className="text-green-600 dark:text-green-400">
                        Earned {new Date(earnedDate).toLocaleDateString()}
                      </span>
                    )}
                    {!isEarned && (
                      <span className="text-gray-500">
                        Not yet earned
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )
          })()}
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Recent Activity List Component
// =============================================================================

interface RecentActivityListProps {
  activityByDate: Record<string, ActivityData>
}

function RecentActivityList({ activityByDate }: RecentActivityListProps) {
  const recentDays = useMemo(() => {
    const result: { date: string; label: string; data: ActivityData }[] = []
    const today = new Date()

    for (let i = 0; i < 7; i++) {
      const date = new Date(today)
      date.setDate(date.getDate() - i)
      const dateStr = date.toISOString().split('T')[0]
      const data = activityByDate[dateStr]

      if (data) {
        let label: string
        if (i === 0) label = 'Today'
        else if (i === 1) label = 'Yesterday'
        else label = date.toLocaleDateString('en-US', { weekday: 'long' })

        result.push({ date: dateStr, label, data })
      }
    }

    return result
  }, [activityByDate])

  // Estimate XP (rough calculation)
  const estimateXP = (data: ActivityData) => {
    return data.lessons * 10 + data.cards * 2
  }

  if (recentDays.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
        <div className="text-4xl mb-2">📊</div>
        <p className="text-gray-500 dark:text-gray-400">
          No recent activity. Start learning to see your progress here!
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      {recentDays.map((day, index) => (
        <div
          key={day.date}
          className={`
            flex items-center justify-between p-4
            ${index !== recentDays.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''}
          `}
        >
          <div>
            <div className="font-medium text-gray-900 dark:text-white">
              {day.label}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {day.data.lessons > 0 && `${day.data.lessons} lesson steps`}
              {day.data.lessons > 0 && day.data.cards > 0 && ', '}
              {day.data.cards > 0 && `${day.data.cards} cards reviewed`}
            </div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-green-600 dark:text-green-400">
              +{estimateXP(day.data)} XP
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
