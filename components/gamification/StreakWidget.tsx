'use client'

import { useState, useEffect } from 'react'
import { getStreakFlames, STREAK_MILESTONES } from '@/lib/gamification/streak'

// =============================================================================
// Types
// =============================================================================

interface StreakWidgetProps {
  currentStreak: number
  longestStreak: number
  isAtRisk: boolean
  activeToday: boolean
  hoursRemaining: number
  /** Last 7 days activity - array of booleans, index 0 = 6 days ago, index 6 = today */
  recentActivity?: boolean[]
  /** Compact mode for smaller displays */
  compact?: boolean
  /** Click handler */
  onClick?: () => void
}

interface DayIndicatorProps {
  active: boolean
  isToday: boolean
  dayLabel: string
  atRisk: boolean
}

// =============================================================================
// Day Indicator Component
// =============================================================================

function DayIndicator({ active, isToday, dayLabel, atRisk }: DayIndicatorProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`
          h-3 w-3 rounded-full transition-all duration-300
          ${active
            ? 'bg-gradient-to-br from-orange-400 to-red-500 shadow-sm shadow-orange-500/50'
            : isToday && atRisk
              ? 'border-2 border-dashed border-orange-400 animate-pulse'
              : 'bg-gray-200 dark:bg-gray-700'
          }
          ${isToday && active ? 'ring-2 ring-orange-300 ring-offset-2 dark:ring-offset-gray-800' : ''}
        `}
      />
      <span className={`
        text-[10px] font-medium
        ${isToday
          ? 'text-orange-500 dark:text-orange-400'
          : 'text-gray-400 dark:text-gray-500'
        }
      `}>
        {dayLabel}
      </span>
    </div>
  )
}

// =============================================================================
// Streak Widget Component
// =============================================================================

export function StreakWidget({
  currentStreak,
  longestStreak,
  isAtRisk,
  activeToday,
  hoursRemaining,
  recentActivity,
  compact = false,
  onClick,
}: StreakWidgetProps) {
  const [timeLeft, setTimeLeft] = useState(hoursRemaining)

  // Update countdown timer
  useEffect(() => {
    if (!isAtRisk || activeToday) return

    setTimeLeft(hoursRemaining)

    const interval = setInterval(() => {
      setTimeLeft((prev) => Math.max(0, prev - 1/60)) // Update every minute
    }, 60000)

    return () => clearInterval(interval)
  }, [hoursRemaining, isAtRisk, activeToday])

  // Get day labels for last 7 days
  const getDayLabels = (): string[] => {
    const days = ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    const today = new Date().getDay()
    const labels: string[] = []

    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7
      labels.push(days[dayIndex])
    }

    return labels
  }

  // Default recent activity if not provided
  const activity = recentActivity || Array(7).fill(false).map((_, i) => i === 6 && activeToday)
  const dayLabels = getDayLabels()

  // Check if current streak is a milestone
  const milestone = STREAK_MILESTONES.find(m => m.days === currentStreak)
  const isMilestone = !!milestone

  // Get flame display based on streak
  const flames = getStreakFlames(currentStreak)

  // Format time remaining
  const formatTimeRemaining = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.floor(hours * 60)
      return `${minutes}m`
    }
    return `${Math.floor(hours)}h ${Math.floor((hours % 1) * 60)}m`
  }

  // Compact variant
  if (compact) {
    return (
      <button
        onClick={onClick}
        className={`
          flex items-center gap-2 rounded-full px-3 py-1.5 transition-all
          ${currentStreak > 0
            ? 'bg-gradient-to-r from-orange-100 to-red-100 dark:from-orange-900/30 dark:to-red-900/30'
            : 'bg-gray-100 dark:bg-gray-800'
          }
          ${isAtRisk && !activeToday ? 'animate-pulse' : ''}
          hover:scale-105 active:scale-95
        `}
      >
        <span className="text-lg">{currentStreak > 0 ? flames || '🔥' : '🔥'}</span>
        <span className={`
          font-bold
          ${currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}
        `}>
          {currentStreak}
        </span>
      </button>
    )
  }

  return (
    <div
      onClick={onClick}
      className={`
        relative overflow-hidden rounded-xl border p-4 transition-all
        ${currentStreak > 0
          ? 'border-orange-200 bg-gradient-to-br from-orange-50 to-red-50 dark:border-orange-800/50 dark:from-orange-900/20 dark:to-red-900/20'
          : 'border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/50'
        }
        ${onClick ? 'cursor-pointer hover:shadow-md hover:scale-[1.02] active:scale-[0.98]' : ''}
        ${isMilestone ? 'ring-2 ring-orange-400 ring-offset-2 dark:ring-offset-gray-900' : ''}
      `}
    >
      {/* Background decoration */}
      {currentStreak > 0 && (
        <div className="absolute -right-4 -top-4 text-8xl opacity-10 pointer-events-none">
          🔥
        </div>
      )}

      {/* Header */}
      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`
            transition-transform
            ${currentStreak >= 30 ? 'text-3xl' : currentStreak >= 7 ? 'text-2xl' : 'text-xl'}
            ${isAtRisk && !activeToday ? 'animate-bounce' : ''}
          `}>
            {currentStreak > 0 ? flames || '🔥' : '🔥'}
          </span>
          <div>
            <div className={`
              font-bold
              ${isMilestone ? 'text-xl' : 'text-lg'}
              ${currentStreak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-500 dark:text-gray-400'}
            `}>
              {isMilestone && milestone ? (
                <span className="flex items-center gap-1">
                  {milestone.emoji} {currentStreak} Day Streak!
                </span>
              ) : currentStreak > 0 ? (
                `${currentStreak} Day Streak`
              ) : (
                'Start a Streak'
              )}
            </div>
            {longestStreak > currentStreak && currentStreak > 0 && (
              <div className="text-xs text-gray-500 dark:text-gray-400">
                Best: {longestStreak} days
              </div>
            )}
          </div>
        </div>

        {/* Status badge */}
        {activeToday && currentStreak > 0 && (
          <div className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
            <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
            Done
          </div>
        )}
      </div>

      {/* Day indicators */}
      <div className="mt-4 flex justify-between px-2">
        {dayLabels.map((label, index) => (
          <DayIndicator
            key={index}
            active={activity[index]}
            isToday={index === 6}
            dayLabel={label}
            atRisk={isAtRisk}
          />
        ))}
      </div>

      {/* Status message */}
      <div className="mt-4">
        {isAtRisk && !activeToday ? (
          <div className="flex items-center justify-between rounded-lg bg-orange-100 px-3 py-2 dark:bg-orange-900/30">
            <div className="flex items-center gap-2">
              <span className="text-sm">⚠️</span>
              <span className="text-sm font-medium text-orange-700 dark:text-orange-300">
                Study today to keep your streak!
              </span>
            </div>
            <div className="flex items-center gap-1 text-sm font-bold text-orange-600 dark:text-orange-400">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {formatTimeRemaining(timeLeft)}
            </div>
          </div>
        ) : activeToday && currentStreak > 0 ? (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            {currentStreak === 1 ? (
              "Great start! Come back tomorrow to build your streak."
            ) : currentStreak < 7 ? (
              `Keep it going! ${7 - currentStreak} more days to your first milestone.`
            ) : (
              "Awesome dedication! Keep the fire burning! 🔥"
            )}
          </div>
        ) : currentStreak === 0 ? (
          <div className="text-center text-sm text-gray-500 dark:text-gray-400">
            Complete a lesson or review to start your streak!
          </div>
        ) : (
          <div className="text-center text-sm text-gray-600 dark:text-gray-400">
            Don't break the chain!
          </div>
        )}
      </div>

      {/* Milestone progress (if not at milestone) */}
      {currentStreak > 0 && !isMilestone && (
        <MilestoneProgress currentStreak={currentStreak} />
      )}
    </div>
  )
}

// =============================================================================
// Milestone Progress Sub-component
// =============================================================================

function MilestoneProgress({ currentStreak }: { currentStreak: number }) {
  // Find next milestone
  const nextMilestone = STREAK_MILESTONES.find(m => m.days > currentStreak)

  if (!nextMilestone) return null

  // Find previous milestone
  const prevMilestone = [...STREAK_MILESTONES].reverse().find(m => m.days <= currentStreak)
  const startPoint = prevMilestone?.days || 0

  const progress = ((currentStreak - startPoint) / (nextMilestone.days - startPoint)) * 100
  const daysToGo = nextMilestone.days - currentStreak

  return (
    <div className="mt-4 pt-3 border-t border-orange-200/50 dark:border-orange-800/30">
      <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-400 mb-1.5">
        <span>Next: {nextMilestone.emoji} {nextMilestone.label}</span>
        <span>{daysToGo} days to go</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-gradient-to-r from-orange-400 to-red-500 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

// =============================================================================
// Mini Streak Display (for header/nav)
// =============================================================================

interface MiniStreakProps {
  streak: number
  isAtRisk?: boolean
  onClick?: () => void
}

export function MiniStreak({ streak, isAtRisk, onClick }: MiniStreakProps) {
  return (
    <button
      onClick={onClick}
      className={`
        group flex items-center gap-1 rounded-lg px-2 py-1 transition-all
        ${streak > 0
          ? 'bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50'
          : 'bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700'
        }
        ${isAtRisk ? 'animate-pulse' : ''}
      `}
      title={streak > 0 ? `${streak} day streak` : 'Start a streak!'}
    >
      <span className={`
        text-base transition-transform group-hover:scale-110
        ${isAtRisk ? 'animate-bounce' : ''}
      `}>
        🔥
      </span>
      <span className={`
        text-sm font-bold
        ${streak > 0 ? 'text-orange-600 dark:text-orange-400' : 'text-gray-400'}
      `}>
        {streak}
      </span>
    </button>
  )
}

// =============================================================================
// Streak Broken Display
// =============================================================================

interface StreakBrokenProps {
  previousStreak: number
  onClose?: () => void
  onStartNew?: () => void
}

export function StreakBroken({ previousStreak, onClose, onStartNew }: StreakBrokenProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 text-center dark:border-gray-700 dark:bg-gray-800">
      <div className="text-5xl mb-3">😢</div>
      <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
        Streak Lost
      </h3>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Your {previousStreak} day streak has ended.
        <br />
        Don't worry - you can start a new one today!
      </p>
      <div className="flex gap-3 justify-center">
        {onClose && (
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
          >
            Dismiss
          </button>
        )}
        {onStartNew && (
          <button
            onClick={onStartNew}
            className="px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-orange-500 to-red-500 rounded-lg hover:from-orange-600 hover:to-red-600 transition-all"
          >
            Start New Streak
          </button>
        )}
      </div>
    </div>
  )
}

export default StreakWidget
