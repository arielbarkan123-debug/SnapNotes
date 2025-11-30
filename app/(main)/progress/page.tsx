'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useProgress } from '@/hooks'
import {
  LazySection,
  ChartSectionSkeleton,
  MasteryMapSkeleton,
  AreasSectionSkeleton,
  InsightsSkeleton,
} from '@/components/ui/LazySection'

// =============================================================================
// Main Component
// =============================================================================

export default function ProgressPage() {
  // SWR hook for data fetching with caching
  const { data, isLoading, error } = useProgress()
  const [expandedCourse, setExpandedCourse] = useState<string | null>(null)

  // Log performance
  useEffect(() => {
    console.time('progress-page-load')
    return () => {
      console.timeEnd('progress-page-load')
    }
  }, [])

  if (isLoading) {
    return <LoadingSkeleton />
  }

  if (error || !data) {
    return <ErrorState />
  }

  return (
    <div className="container mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
      {/* Page Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
          Your Progress
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          Track your learning journey and identify areas for improvement
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        <OverviewCard
          icon="⏱️"
          label="Study Time"
          value={formatTime(data.overview.studyTime.week)}
          subtext={`${formatTime(data.overview.studyTime.month)} this month`}
          color="blue"
        />
        <OverviewCard
          icon="📚"
          label="Cards Reviewed"
          value={data.overview.cardsReviewed.count.toString()}
          trend={data.overview.cardsReviewed.trend}
          subtext="Last 7 days"
          color="indigo"
        />
        <OverviewCard
          icon="🎯"
          label="Accuracy"
          value={`${data.overview.accuracy.percent}%`}
          trend={data.overview.accuracy.trend}
          subtext="Last 7 days"
          color="green"
        />
        <OverviewCard
          icon="⭐"
          label="Mastery"
          value={`${data.overview.mastery.percent}%`}
          subtext={`${data.overview.mastery.totalLessons} lessons`}
          color="amber"
        />
      </div>

      {/* Charts Row - Lazy loaded */}
      <LazySection
        skeleton={
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <ChartSectionSkeleton />
            <ChartSectionSkeleton />
          </div>
        }
        minHeight={280}
        className="mb-8"
      >
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Accuracy Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Accuracy Over Time
            </h2>
            <AccuracyChart data={data.accuracyChart} />
          </div>

          {/* Time Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Study Time (Last 7 Days)
            </h2>
            <TimeChart data={data.timeChart} />
          </div>
        </div>
      </LazySection>

      {/* Mastery Map - Lazy loaded */}
      <LazySection
        skeleton={<MasteryMapSkeleton />}
        minHeight={300}
        className="mb-8"
      >
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Mastery Map
          </h2>
          {data.masteryMap.length > 0 ? (
            <div className="space-y-4">
              {data.masteryMap.map(course => (
                <MasteryMapCourse
                  key={course.id}
                  course={course}
                  isExpanded={expandedCourse === course.id}
                  onToggle={() => setExpandedCourse(
                    expandedCourse === course.id ? null : course.id
                  )}
                />
              ))}
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400 text-center py-8">
              Complete some lessons to see your mastery progress
            </p>
          )}
        </div>
      </LazySection>

      {/* Weak & Strong Areas - Lazy loaded */}
      <LazySection
        skeleton={
          <div className="grid lg:grid-cols-2 gap-6 mb-8">
            <AreasSectionSkeleton />
            <AreasSectionSkeleton />
          </div>
        }
        minHeight={300}
        className="mb-8"
      >
        <div className="grid lg:grid-cols-2 gap-6">
          {/* Weak Areas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">💪</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Focus Areas
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Practice these lessons to improve your overall mastery
            </p>
            {data.weakAreas.length > 0 ? (
              <div className="space-y-3">
                {data.weakAreas.map(area => (
                  <WeakAreaItem key={area.lessonId} area={area} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-3xl mb-2 block">🎉</span>
                <p className="text-gray-500 dark:text-gray-400">
                  No weak areas! You&apos;re doing great.
                </p>
              </div>
            )}
          </div>

          {/* Strong Areas */}
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🏆</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Mastered Topics
              </h2>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Celebrate your progress on these lessons
            </p>
            {data.strongAreas.length > 0 ? (
              <div className="space-y-3">
                {data.strongAreas.map(area => (
                  <StrongAreaItem key={area.lessonId} area={area} />
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <span className="text-3xl mb-2 block">📖</span>
                <p className="text-gray-500 dark:text-gray-400">
                  Keep studying to master more lessons!
                </p>
              </div>
            )}
          </div>
        </div>
      </LazySection>

      {/* Insights - Lazy loaded */}
      {data.insights.length > 0 && (
        <LazySection
          skeleton={<InsightsSkeleton />}
          minHeight={200}
        >
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-xl border border-indigo-200 dark:border-indigo-800/50 p-4 sm:p-6">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🧠</span>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Personalized Insights
              </h2>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              {data.insights.map((insight, index) => (
                <InsightCard key={index} insight={insight} />
              ))}
            </div>
          </div>
        </LazySection>
      )}
    </div>
  )
}

// =============================================================================
// Overview Card
// =============================================================================

interface OverviewCardProps {
  icon: string
  label: string
  value: string
  subtext: string
  trend?: number
  color: 'blue' | 'indigo' | 'green' | 'amber'
}

function OverviewCard({ icon, label, value, subtext, trend, color }: OverviewCardProps) {
  const colorClasses = {
    blue: 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20 border-blue-200 dark:border-blue-800/50',
    indigo: 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border-indigo-200 dark:border-indigo-800/50',
    green: 'from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 border-green-200 dark:border-green-800/50',
    amber: 'from-amber-50 to-yellow-50 dark:from-amber-900/20 dark:to-yellow-900/20 border-amber-200 dark:border-amber-800/50',
  }

  return (
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${colorClasses[color]}`}>
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{icon}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`text-xs font-medium flex items-center gap-0.5 ${
            trend > 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}>
            {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}%
          </span>
        )}
      </div>
      <div className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-1">
        {value}
      </div>
      <div className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">
        {label}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-500 mt-1">
        {subtext}
      </div>
    </div>
  )
}

// =============================================================================
// Accuracy Chart (CSS-based line chart)
// =============================================================================

interface AccuracyChartProps {
  data: Array<{ date: string; accuracy: number; count: number }>
}

function AccuracyChart({ data }: AccuracyChartProps) {
  const hasData = data.some(d => d.count > 0)

  if (!hasData) {
    return (
      <div className="h-48 flex items-center justify-center text-gray-500 dark:text-gray-400">
        No review data yet. Start reviewing to see your accuracy trend.
      </div>
    )
  }

  // Calculate trend
  const recentData = data.slice(-7).filter(d => d.count > 0)
  const avgRecent = recentData.length > 0
    ? recentData.reduce((sum, d) => sum + d.accuracy, 0) / recentData.length
    : 0

  const olderData = data.slice(0, 14).filter(d => d.count > 0)
  const avgOlder = olderData.length > 0
    ? olderData.reduce((sum, d) => sum + d.accuracy, 0) / olderData.length
    : avgRecent

  const trend = avgRecent > avgOlder + 3 ? 'improving' :
    avgRecent < avgOlder - 3 ? 'declining' : 'stable'

  // Sample to show only 10 points for better visibility
  const sampledData = sampleData(data.filter(d => d.count > 0), 10)

  return (
    <div>
      {/* Trend indicator */}
      <div className={`mb-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
        trend === 'improving'
          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
          : trend === 'declining'
          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
      }`}>
        {trend === 'improving' && '📈 Improving'}
        {trend === 'declining' && '📉 Needs attention'}
        {trend === 'stable' && '➡️ Stable'}
      </div>

      {/* Chart */}
      <div className="h-40 flex items-end gap-1 sm:gap-2">
        {sampledData.map((point, index) => (
          <div
            key={index}
            className="flex-1 flex flex-col items-center group"
          >
            <div className="relative w-full flex justify-center mb-1">
              {/* Tooltip */}
              <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                  {point.accuracy}% ({point.count} cards)
                </div>
              </div>
              {/* Bar */}
              <div
                className={`w-full max-w-[24px] rounded-t transition-all ${
                  point.accuracy >= 80
                    ? 'bg-green-500 dark:bg-green-400'
                    : point.accuracy >= 60
                    ? 'bg-yellow-500 dark:bg-yellow-400'
                    : 'bg-red-500 dark:bg-red-400'
                }`}
                style={{ height: `${Math.max(point.accuracy, 5)}%` }}
              />
            </div>
            <span className="text-[10px] text-gray-400 dark:text-gray-500">
              {formatDateShort(point.date)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// =============================================================================
// Time Chart (Bar chart)
// =============================================================================

interface TimeChartProps {
  data: Array<{ date: string; minutes: number; dayLabel: string }>
}

function TimeChart({ data }: TimeChartProps) {
  const maxMinutes = Math.max(...data.map(d => d.minutes), 30) // Min scale of 30 min
  const goalMinutes = 15 // Daily goal

  return (
    <div>
      {/* Goal indicator */}
      <div className="mb-4 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-3 h-3 border-2 border-dashed border-indigo-400 rounded-sm" />
        <span>Daily goal: {goalMinutes} min</span>
      </div>

      {/* Chart */}
      <div className="h-40 flex items-end gap-2 sm:gap-4 relative">
        {/* Goal line */}
        <div
          className="absolute left-0 right-0 border-t-2 border-dashed border-indigo-300 dark:border-indigo-600"
          style={{ bottom: `${(goalMinutes / maxMinutes) * 100}%` }}
        />

        {data.map((point, index) => {
          const height = maxMinutes > 0 ? (point.minutes / maxMinutes) * 100 : 0
          const isToday = index === data.length - 1
          const metGoal = point.minutes >= goalMinutes

          return (
            <div key={index} className="flex-1 flex flex-col items-center group">
              <div className="relative w-full flex justify-center mb-1">
                {/* Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-10">
                  <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs rounded px-2 py-1 whitespace-nowrap">
                    {point.minutes} min
                  </div>
                </div>
                {/* Bar */}
                <div
                  className={`w-full max-w-[32px] rounded-t transition-all ${
                    metGoal
                      ? 'bg-indigo-500 dark:bg-indigo-400'
                      : point.minutes > 0
                      ? 'bg-indigo-300 dark:bg-indigo-600'
                      : 'bg-gray-200 dark:bg-gray-700'
                  } ${isToday ? 'ring-2 ring-indigo-400 ring-offset-2 dark:ring-offset-gray-800' : ''}`}
                  style={{ height: `${Math.max(height, 2)}%` }}
                />
              </div>
              <span className={`text-xs ${
                isToday
                  ? 'font-semibold text-indigo-600 dark:text-indigo-400'
                  : 'text-gray-500 dark:text-gray-400'
              }`}>
                {point.dayLabel}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// =============================================================================
// Mastery Map Course
// =============================================================================

interface MasteryMapCourseProps {
  course: {
    id: string
    title: string
    mastery: number
    lessons: Array<{
      id: string
      title: string
      mastery: number
      completed: boolean
    }>
    lessonCount: number
    completedCount: number
  }
  isExpanded: boolean
  onToggle: () => void
}

function MasteryMapCourse({ course, isExpanded, onToggle }: MasteryMapCourseProps) {
  const masteryPercent = Math.round(course.mastery * 100)

  return (
    <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-left"
      >
        {/* Mastery indicator */}
        <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold ${
          getMasteryColor(course.mastery)
        }`}>
          {masteryPercent}%
        </div>

        {/* Course info */}
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 dark:text-white truncate">
            {course.title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {course.completedCount} / {course.lessonCount} lessons completed
          </p>
        </div>

        {/* Progress bar */}
        <div className="hidden sm:block w-32">
          <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${getMasteryColor(course.mastery)}`}
              style={{ width: `${masteryPercent}%` }}
            />
          </div>
        </div>

        {/* Expand icon */}
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Expanded lessons */}
      {isExpanded && (
        <div className="border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-4">
          <div className="grid gap-2">
            {course.lessons.map(lesson => {
              const lessonMastery = Math.round(lesson.mastery * 100)
              return (
                <Link
                  key={lesson.id}
                  href={`/course/${course.id}?lesson=${lesson.id}`}
                  className="flex items-center gap-3 p-2 rounded-lg hover:bg-white dark:hover:bg-gray-700 transition-colors"
                >
                  <div className={`w-8 h-8 rounded flex items-center justify-center text-xs font-medium text-white ${
                    getMasteryColor(lesson.mastery)
                  }`}>
                    {lessonMastery}%
                  </div>
                  <span className="flex-1 text-sm text-gray-700 dark:text-gray-300 truncate">
                    {lesson.title}
                  </span>
                  {lesson.completed && (
                    <svg className="w-4 h-4 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

// =============================================================================
// Weak/Strong Area Items
// =============================================================================

interface AreaItemProps {
  area: {
    lessonId: string
    lessonTitle: string
    courseId: string
    courseTitle: string
    mastery: number
  }
}

function WeakAreaItem({ area }: AreaItemProps) {
  const masteryPercent = Math.round(area.mastery * 100)

  return (
    <Link
      href={`/course/${area.courseId}?lesson=${area.lessonId}`}
      className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-colors"
    >
      <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold ${
        getMasteryColor(area.mastery)
      }`}>
        {masteryPercent}%
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {area.lessonTitle}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {area.courseTitle}
        </div>
      </div>
      <span className="text-indigo-600 dark:text-indigo-400 text-sm font-medium">
        Practice
      </span>
    </Link>
  )
}

function StrongAreaItem({ area }: AreaItemProps) {
  const masteryPercent = Math.round(area.mastery * 100)

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800/50">
      <div className="w-10 h-10 rounded-lg bg-green-500 flex items-center justify-center text-white text-sm font-bold">
        {masteryPercent}%
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-gray-900 dark:text-white truncate">
          {area.lessonTitle}
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
          {area.courseTitle}
        </div>
      </div>
      <span className="text-2xl">⭐</span>
    </div>
  )
}

// =============================================================================
// Insight Card
// =============================================================================

interface InsightCardProps {
  insight: {
    icon: string
    text: string
    type: 'positive' | 'neutral' | 'suggestion'
  }
}

function InsightCard({ insight }: InsightCardProps) {
  const bgClass = {
    positive: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800/50',
    neutral: 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700',
    suggestion: 'bg-amber-50 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/50',
  }

  return (
    <div className={`p-3 rounded-lg border ${bgClass[insight.type]}`}>
      <div className="flex items-start gap-2">
        <span className="text-xl flex-shrink-0">{insight.icon}</span>
        <p className="text-sm text-gray-700 dark:text-gray-300">{insight.text}</p>
      </div>
    </div>
  )
}

// =============================================================================
// Loading & Error States
// =============================================================================

function LoadingSkeleton() {
  return (
    <div className="container mx-auto px-4 py-6 sm:py-8">
      {/* Page title */}
      <div className="h-8 w-48 bg-gray-200 dark:bg-gray-700 rounded mb-6 skeleton-shimmer-item" />

      {/* Stat cards grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-lg bg-gray-200 dark:bg-gray-700 skeleton-shimmer-item" />
              <div className="h-4 w-20 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
            <div className="h-8 w-16 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
            <div className="h-3 w-24 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
          </div>
        ))}
      </div>

      {/* Charts grid */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        {[1, 2].map(i => (
          <div
            key={i}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700"
          >
            <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
            <div className="h-48 bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item" />
          </div>
        ))}
      </div>

      {/* Mastery section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="flex-1">
                <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
                <div className="h-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function ErrorState() {
  return (
    <div className="container mx-auto px-4 py-16 text-center">
      <div className="text-4xl mb-4">😕</div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
        Couldn&apos;t load progress
      </h2>
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Something went wrong. Please try again later.
      </p>
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
      >
        Back to Dashboard
      </Link>
    </div>
  )
}

// =============================================================================
// Utility Functions
// =============================================================================

function formatTime(ms: number): string {
  const minutes = Math.round(ms / 60000)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  const remainingMins = minutes % 60
  return remainingMins > 0 ? `${hours}h ${remainingMins}m` : `${hours}h`
}

function formatDateShort(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

function getMasteryColor(mastery: number): string {
  if (mastery >= 0.8) return 'bg-green-500'
  if (mastery >= 0.6) return 'bg-yellow-500'
  if (mastery >= 0.4) return 'bg-orange-500'
  return 'bg-red-500'
}

function sampleData<T>(data: T[], maxPoints: number): T[] {
  if (data.length <= maxPoints) return data
  const step = Math.ceil(data.length / maxPoints)
  return data.filter((_, index) => index % step === 0).slice(0, maxPoints)
}
