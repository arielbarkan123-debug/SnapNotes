'use client'

import { useState, useEffect, useRef, useCallback, Component, type ReactNode, type ErrorInfo, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'
import { type Course } from '@/types'
import { useCourses } from '@/hooks'
import { useToast } from '@/contexts/ToastContext'
import { useStudyPlan } from '@/hooks/useStudyPlan'
import { ChevronRight, Check, ArrowRight, Flame, Zap, Trophy, Coffee } from 'lucide-react'
import type { StudyPlanTask } from '@/lib/study-plan/types'
import { useFeatureTracker } from '@/lib/student-context/feature-tracker'
import { createLogger } from '@/lib/logger'


const log = createLogger('page:dashboard-DashboardContentx')
// =============================================================================
// Dashboard Intelligence Hook
// =============================================================================

interface DashboardIntelligence {
  primaryAction: {
    type: 'review_cards' | 'continue_lesson' | 'practice_weak' | 'start_exam_prep' | 'take_break'
    label: string
    courseId?: string
    count?: number
  }
  nudge: string | null
  courseOrder: string[]
  streakRisk: boolean
  celebrationDue: string | null
  weeklyGoalProgress: number
  cardsDueToday: number
  currentStreak: number
  rollingAccuracy: number
  trendDirection: 'improving' | 'declining' | 'stable'
  totalStudyTimeThisWeekMinutes: number
  sessionsThisWeek: number
}

function useDashboardIntelligence() {
  const [intelligence, setIntelligence] = useState<DashboardIntelligence | null>(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      try {
        const res = await fetch('/api/dashboard/intelligence')
        if (!res.ok) return
        const data = await res.json()
        if (!cancelled) setIntelligence(data)
      } catch {
        // Intelligence is non-critical — dashboard works without it
      }
    }
    load()
    return () => { cancelled = true }
  }, [])

  return intelligence
}

// ============================================================================
// Component-Level Error Boundary
// ============================================================================

interface SilentErrorBoundaryProps {
  children: ReactNode
  componentName?: string
}

interface SilentErrorBoundaryState {
  hasError: boolean
}

class SilentErrorBoundary extends Component<SilentErrorBoundaryProps, SilentErrorBoundaryState> {
  constructor(props: SilentErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(): SilentErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    log.error({ detail: error.message }, `Error in ${this.props.componentName || 'unknown'}`)
    log.error({ detail: errorInfo.componentStack }, 'Component stack')
  }

  render() {
    if (this.state.hasError) return null
    return this.props.children
  }
}

// Lazy load UploadModal
const UploadModal = dynamic(
  () => import('@/components/upload/UploadModal'),
  { ssr: false }
)

// Lazy load GamificationBar
const GamificationBar = dynamic(
  () => import('@/components/gamification/GamificationBar'),
  { ssr: false }
)

// Lazy load WelcomeModal
const WelcomeModal = dynamic(
  () => import('@/components/dashboard/WelcomeModal'),
  { ssr: false }
)

// Lazy load MistakeInsightsCard
const MistakeInsightsCard = dynamic(
  () => import('@/components/insights/MistakeInsightsCard'),
  { ssr: false }
)

interface DashboardContentProps {
  initialCourses: Course[]
  userName?: string
  dbError?: boolean
}

export default function DashboardContent({ initialCourses, userName, dbError }: DashboardContentProps) {
  // Track feature usage for implicit data collection
  useFeatureTracker('dashboard')

  const router = useRouter()
  const t = useTranslations('dashboard')
  const tTask = useTranslations('studyPlan.taskTypes')
  const { error: showError, success: showSuccess } = useToast()

  // Load intelligence from the Learning Intelligence Engine (non-blocking)
  const intelligence = useDashboardIntelligence()

  // Show celebration toast if the engine says so
  const celebrationShown = useRef(false)
  useEffect(() => {
    if (intelligence?.celebrationDue && !celebrationShown.current) {
      celebrationShown.current = true
      showSuccess(intelligence.celebrationDue)
    }
  }, [intelligence?.celebrationDue, showSuccess])

  // Recommendation click tracking — fire and forget
  const trackRecommendationClick = useCallback((trackingId: string) => {
    fetch('/api/tracking/recommendation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recommendationId: trackingId }),
    }).catch(() => {}) // silent fail
  }, [])

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false)
  const [isGeneratingCovers, setIsGeneratingCovers] = useState(false)
  const [lessonProgressMap, setLessonProgressMap] = useState<Record<string, number>>({})

  // Get courses data
  const {
    filteredCourses,
    totalCount,
    error,
  } = useCourses({
    initialCourses,
    debounceDelay: 300,
  })

  // Get study plan data
  const { plan, todayTasks } = useStudyPlan()

  // Fetch lesson progress for continue-learning and course rings
  useEffect(() => {
    async function fetchLessonProgress() {
      try {
        const res = await fetch('/api/progress/lesson-map')
        if (res.ok) {
          const data = await res.json()
          setLessonProgressMap(data.progressMap || {})
        }
      } catch { /* silent */ }
    }
    fetchLessonProgress()
  }, [])

  // Calculate greeting based on time of day
  const greeting = useMemo(() => {
    const hour = new Date().getHours()
    if (hour < 12) return t('greeting.morning')
    if (hour < 18) return t('greeting.afternoon')
    return t('greeting.evening')
  }, [t])

  // Calculate today's progress
  const todayProgress = useMemo(() => {
    if (!todayTasks || todayTasks.length === 0) return { completed: 0, total: 0, percent: 0 }
    const completed = todayTasks.filter((task: StudyPlanTask) => task.status === 'completed').length
    const total = todayTasks.length
    return {
      completed,
      total,
      percent: total > 0 ? Math.round((completed / total) * 100) : 0
    }
  }, [todayTasks])

  // Display name
  const displayName = userName || 'Student'
  const initials = displayName.charAt(0).toUpperCase()

  // Find current course/lesson to continue
  const currentCourse = useMemo(() => {
    if (!filteredCourses || filteredCourses.length === 0) return null
    for (const course of filteredCourses) {
      const lessons = course.generated_course?.lessons
      if (lessons && lessons.length > 0) {
        const lastCompleted = lessonProgressMap[course.id] ?? -1
        const nextLesson = Math.min(lastCompleted + 1, lessons.length - 1)
        return { course, lessonIndex: nextLesson }
      }
    }
    return { course: filteredCourses[0], lessonIndex: 0 }
  }, [filteredCourses, lessonProgressMap])

  // Check for courses without covers
  const coursesWithoutCovers = (initialCourses || []).filter(c => !c.cover_image_url).length
  const autoGenerationAttempted = useRef(false)

  // Auto-generate covers
  useEffect(() => {
    if (autoGenerationAttempted.current || coursesWithoutCovers === 0) return
    autoGenerationAttempted.current = true
    const generateCoversInBackground = async () => {
      try {
        const response = await fetch('/api/generate-all-covers', { method: 'POST' })
        const data = await response.json()
        if (data.success && data.updated > 0) {
          router.refresh()
        }
      } catch { /* silent */ }
    }
    const timer = setTimeout(generateCoversInBackground, 2000)
    return () => clearTimeout(timer)
  }, [coursesWithoutCovers, router])

  // Generate covers manually
  const handleGenerateCovers = async () => {
    setIsGeneratingCovers(true)
    try {
      const response = await fetch('/api/generate-all-covers', { method: 'POST' })
      const data = await response.json()
      if (data.success) {
        showSuccess(t('coversGeneratedSuccess', { count: data.updated }))
        router.refresh()
      } else {
        showError(data.error || 'Failed to generate covers')
      }
    } catch {
      showError('Failed to generate covers')
    } finally {
      setIsGeneratingCovers(false)
    }
  }

  // Show toast on error
  useEffect(() => {
    if (error) showError(error)
  }, [error, showError])

  const hasNoCourses = totalCount === 0

  return (
    <>
      <div className="px-4 md:px-10 py-6 md:py-10 pb-24 md:pb-10 max-w-[1100px] mx-auto">
        {/* Greeting Header */}
        <div className="flex items-center justify-between mb-8 animate-fadeSlideIn">
          <div>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-1">{greeting}</p>
            <h1 className="text-2xl md:text-3xl font-extrabold gradient-text">
              {displayName}
            </h1>
            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="relative">
            <div className="w-13 h-13 md:w-14 md:h-14 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center avatar-glow">
              <span className="text-white font-bold text-xl md:text-2xl">{initials}</span>
            </div>
          </div>
        </div>

        {/* Gamification Bar */}
        <SilentErrorBoundary componentName="GamificationBar">
          <div className="animate-fadeSlideIn stagger-2">
            <GamificationBar />
          </div>
        </SilentErrorBoundary>

        {/* Intelligence-Driven Smart Bar */}
        {intelligence && (
          <SilentErrorBoundary componentName="IntelligenceBar">
            <div className="mb-6 animate-fadeSlideIn stagger-2">
              {/* Streak Risk Warning */}
              {intelligence.streakRisk && intelligence.currentStreak > 0 && (
                <div className="mb-3 flex items-center gap-3 px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/50 rounded-2xl">
                  <Flame className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <p className="text-sm text-amber-800 dark:text-amber-200">
                    <span className="font-semibold">{intelligence.currentStreak}-day streak</span> — study today to keep it!
                  </p>
                </div>
              )}

              {/* Primary Action + Nudge */}
              <div className="flex flex-col sm:flex-row gap-3">
                {/* AI-recommended action */}
                <Link
                  href={
                    intelligence.primaryAction.type === 'review_cards' ? '/review' :
                    intelligence.primaryAction.type === 'continue_lesson' ? (intelligence.primaryAction.courseId ? `/course/${intelligence.primaryAction.courseId}` : '/dashboard') :
                    intelligence.primaryAction.type === 'practice_weak' ? '/practice' :
                    intelligence.primaryAction.type === 'start_exam_prep' ? '/exams' :
                    '/dashboard'
                  }
                  className="flex-1 flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 border border-violet-200 dark:border-violet-800/50 rounded-2xl group hover:shadow-md transition-shadow"
                  onClick={() => trackRecommendationClick(`intel_${intelligence.primaryAction.type}`)}
                >
                  <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                    {intelligence.primaryAction.type === 'review_cards' ? <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" /> :
                     intelligence.primaryAction.type === 'take_break' ? <Coffee className="w-5 h-5 text-violet-600 dark:text-violet-400" /> :
                     intelligence.primaryAction.type === 'practice_weak' ? <Zap className="w-5 h-5 text-violet-600 dark:text-violet-400" /> :
                     <ArrowRight className="w-5 h-5 text-violet-600 dark:text-violet-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-violet-900 dark:text-violet-100 truncate">
                      {intelligence.primaryAction.label}
                    </p>
                    {intelligence.primaryAction.count != null && intelligence.primaryAction.count > 0 && (
                      <p className="text-xs text-violet-600 dark:text-violet-400">
                        {intelligence.primaryAction.count} {intelligence.primaryAction.type === 'review_cards' ? 'cards due' : 'items'}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="w-4 h-4 text-violet-400 group-hover:translate-x-1 transition-transform flex-shrink-0" />
                </Link>

                {/* Nudge */}
                {intelligence.nudge && (
                  <div className="flex items-center gap-3 px-4 py-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl sm:max-w-[280px]">
                    <Trophy className="w-5 h-5 text-amber-500 flex-shrink-0" />
                    <p className="text-xs text-gray-600 dark:text-gray-300">{intelligence.nudge}</p>
                  </div>
                )}
              </div>

              {/* Weekly progress mini-bar */}
              {intelligence.weeklyGoalProgress > 0 && (
                <div className="mt-3 flex items-center gap-3">
                  <span className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">This week</span>
                  <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-violet-500 to-rose-500 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(intelligence.weeklyGoalProgress * 100, 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {Math.round(intelligence.weeklyGoalProgress * 100)}%
                  </span>
                </div>
              )}
            </div>
          </SilentErrorBoundary>
        )}

        {/* Quick Actions Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 animate-fadeSlideIn stagger-3">
          {/* Continue Learning - Featured */}
          <Link
            href={currentCourse ? `/course/${currentCourse.course.id}/lesson/${currentCourse.lessonIndex}` : '/dashboard'}
            className="bg-gradient-to-br from-violet-500 to-purple-600 rounded-[22px] p-5 text-white shadow-card card-hover-lift relative overflow-hidden group"
            onClick={() => trackRecommendationClick('continue_learning')}
          >
            <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <h3 className="font-bold text-lg mb-1">{t('continueLearningTitle')}</h3>
            {currentCourse ? (
              <>
                <p className="text-white/80 text-sm mb-4 line-clamp-1">{currentCourse.course.title}</p>
                <div className="flex items-center gap-2 text-sm font-medium">
                  <span>Continue</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </>
            ) : (
              <p className="text-white/80 text-sm">{t('quickActions.noCourseYet')}</p>
            )}
          </Link>

          {/* Check Homework */}
          <Link
            href="/homework"
            className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card card-hover-lift group"
            onClick={() => trackRecommendationClick('check_homework')}
          >
            <div className="w-14 h-14 rounded-2xl bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center mb-3">
              <span className="text-3xl">📝</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('checkHomeworkTitle')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('checkHomeworkDesc')}</p>
          </Link>

          {/* Quick Practice */}
          <Link
            href="/practice"
            className="bg-white dark:bg-gray-800 rounded-[22px] p-5 border border-gray-200 dark:border-gray-700 shadow-card card-hover-lift group relative"
            onClick={() => trackRecommendationClick('quick_practice')}
          >
            <span className="absolute top-4 end-4 text-xs font-semibold px-2 py-0.5 bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400 rounded-full">
              {t('newBadge')}
            </span>
            <div className="w-14 h-14 rounded-2xl bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center mb-3">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="font-bold text-gray-900 dark:text-white mb-1">{t('quickPracticeTitle')}</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm">{t('quickPracticeDesc')}</p>
          </Link>
        </div>

        {/* Today's Plan Section */}
        {plan && (
          <div className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card mb-8 animate-fadeSlideIn stagger-4">
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-gray-700">
              <h2 className="font-bold text-gray-900 dark:text-white text-lg">{t('todaysPlan')}</h2>
              <Link href="/study-plan" className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:underline flex items-center gap-1">
                {t('viewFullPlan')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>
            <div className="p-5">
              <div className="flex gap-6">
                {/* Task List */}
                <div className="flex-1 space-y-3">
                  {todayTasks && todayTasks.length > 0 ? (
                    todayTasks.slice(0, 4).map((task: StudyPlanTask) => {
                      const isCompleted = task.status === 'completed'
                      return (
                        <div key={task.id} className={`flex items-center gap-3 ${isCompleted ? 'opacity-50' : ''}`}>
                          {isCompleted ? (
                            <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                              <Check className="w-3.5 h-3.5 text-white" />
                            </div>
                          ) : (
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-gray-300 dark:border-gray-600 flex-shrink-0" />
                          )}
                          <span className={`text-sm flex-1 ${isCompleted ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'}`}>
                            {tTask(task.task_type)}: {task.lesson_title || task.description}
                          </span>
                          <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400">
                            {task.estimated_minutes}m
                          </span>
                        </div>
                      )
                    })
                  ) : (
                    <p className="text-sm text-gray-500 dark:text-gray-400">No tasks for today</p>
                  )}
                </div>

                {/* Progress Ring */}
                <div className="flex flex-col items-center justify-center flex-shrink-0">
                  <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="8"
                      className="text-gray-200 dark:text-gray-700"
                    />
                    <circle
                      cx="40"
                      cy="40"
                      r="34"
                      fill="none"
                      stroke="url(#progressGradient)"
                      strokeWidth="8"
                      strokeLinecap="round"
                      strokeDasharray={`${todayProgress.percent * 2.136} 213.6`}
                    />
                    <defs>
                      <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8B5CF6" />
                        <stop offset="100%" stopColor="#EC4899" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <span className="absolute text-lg font-bold text-gray-900 dark:text-white">
                    {todayProgress.percent}%
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                    {t('ofTasks', { completed: todayProgress.completed, total: todayProgress.total })}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Mistake Insights Widget */}
        <SilentErrorBoundary componentName="MistakeInsightsCard">
          <div className="mb-8 animate-fadeSlideIn stagger-5">
            <MistakeInsightsCard />
          </div>
        </SilentErrorBoundary>

        {/* Exam Prediction CTA */}
        <SilentErrorBoundary componentName="ExamPredictionCTA">
          <div className="mb-8 animate-fadeSlideIn stagger-5">
            <ExamPredictionCTA />
          </div>
        </SilentErrorBoundary>

        {/* My Courses Section */}
        <div className="animate-fadeSlideIn stagger-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-gray-900 dark:text-white text-lg">{t('myCourses')}</h2>
            {totalCount > 3 && (
              <Link href="/courses" className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:underline flex items-center gap-1">
                {t('viewAll')}
                <ChevronRight className="w-4 h-4" />
              </Link>
            )}
          </div>

          {/* Database Error Banner */}
          {dbError && (
            <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-red-500 flex-shrink-0">⚠️</span>
                <p className="text-sm text-red-700 dark:text-red-400">
                  {t('loadError')}
                </p>
              </div>
              <button
                onClick={() => router.refresh()}
                className="text-sm font-medium text-violet-600 dark:text-violet-400 underline hover:underline flex-shrink-0 ms-4"
              >
                {t('retry')}
              </button>
            </div>
          )}

          {hasNoCourses && !dbError ? (
            <EmptyState onUploadClick={() => setIsUploadModalOpen(true)} />
          ) : !dbError ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCourses.slice(0, 6).map((course) => (
                <CompactCourseCard key={course.id} course={course} completedLessons={lessonProgressMap[course.id] !== undefined ? lessonProgressMap[course.id] + 1 : 0} />
              ))}
            </div>
          ) : null}
        </div>

        {/* Generate Covers Banner */}
        {coursesWithoutCovers > 0 && (
          <div className="mt-6 p-4 bg-gradient-to-r from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 rounded-xl border border-purple-200 dark:border-purple-800/50">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-medium text-purple-900 dark:text-purple-100">
                  {coursesWithoutCovers !== 1
                    ? t('coversMissing', { count: coursesWithoutCovers })
                    : t('coversMissingSingular', { count: coursesWithoutCovers })
                  }
                </p>
                <p className="text-sm text-purple-700 dark:text-purple-300">
                  {t('coversGenerate')}
                </p>
              </div>
              <button
                onClick={handleGenerateCovers}
                disabled={isGeneratingCovers}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {isGeneratingCovers ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {t('coversGenerating')}
                  </>
                ) : (
                  t('coversGenerateButton')
                )}
              </button>
            </div>
          </div>
        )}

        {/* Mobile FAB */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="sm:hidden fixed bottom-[calc(72px+env(safe-area-inset-bottom,0px))] end-4 w-14 h-14 bg-violet-600 hover:bg-violet-700 active:bg-violet-800 text-white rounded-full shadow-lg flex items-center justify-center z-40 transition-colors"
          aria-label={t('uploadNotebook')}
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>

        {/* Desktop Upload Button - Top Right */}
        <button
          onClick={() => setIsUploadModalOpen(true)}
          className="hidden sm:flex fixed top-6 end-6 md:end-10 items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-lg font-medium transition-colors z-40"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {t('uploadNotebook')}
        </button>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
      />

      {/* Welcome Modal */}
      <SilentErrorBoundary componentName="WelcomeModal">
        <WelcomeModal onUploadClick={() => setIsUploadModalOpen(true)} />
      </SilentErrorBoundary>
    </>
  )
}

// ============================================================================
// Compact Course Card
// ============================================================================

function CompactCourseCard({ course, completedLessons = 0 }: { course: Course; completedLessons?: number }) {
  const t = useTranslations('dashboard')
  const lessons = course.generated_course?.lessons
  const lessonsCount = lessons?.length || 0
  const progress = lessonsCount > 0 ? Math.round((completedLessons / lessonsCount) * 100) : 0

  // Generate gradient based on course title
  const getGradient = (title: string) => {
    const hash = title.split('').reduce((a, b) => a + b.charCodeAt(0), 0)
    const gradients = [
      'from-violet-500 to-purple-500',
      'from-rose-500 to-pink-500',
      'from-sky-500 to-cyan-500',
      'from-amber-500 to-orange-500',
      'from-emerald-500 to-teal-500',
    ]
    return gradients[hash % gradients.length]
  }

  const emoji = course.title.match(/^[\p{Emoji}]/u)?.[0] || '📚'

  return (
    <Link
      href={`/course/${course.id}`}
      className="bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card card-hover-lift overflow-hidden group"
    >
      {/* Top colored strip */}
      <div className={`h-1 bg-gradient-to-r ${getGradient(course.title)}`} />

      <div className="p-4 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xl">{emoji}</span>
            <h3 className="font-semibold text-gray-900 dark:text-white truncate text-sm">
              {course.title.replace(/^[\p{Emoji}]\s*/u, '')}
            </h3>
          </div>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {t('lessons', { count: lessonsCount })}
          </p>
        </div>

        {/* Mini progress ring */}
        <svg className="w-10 h-10 transform -rotate-90 flex-shrink-0" viewBox="0 0 40 40">
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            className="text-gray-200 dark:text-gray-700"
          />
          <circle
            cx="20"
            cy="20"
            r="16"
            fill="none"
            stroke="currentColor"
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={`${progress * 1.005} 100.5`}
            className="text-violet-500"
          />
        </svg>
      </div>
    </Link>
  )
}

// ============================================================================
// Empty State
// ============================================================================

interface EmptyStateProps {
  onUploadClick: () => void
}

function EmptyState({ onUploadClick }: EmptyStateProps) {
  const t = useTranslations('dashboard')
  return (
    <div className="flex flex-col items-center justify-center py-12 px-4 bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card">
      <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mb-4">
        <span className="text-3xl">📚</span>
      </div>
      <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2 text-center">
        {t('noCourses')}
      </h2>
      <p className="text-gray-600 dark:text-gray-400 text-center mb-6 max-w-sm text-sm">
        {t('noCoursesDescription')}
      </p>
      <Button size="lg" onClick={onUploadClick}>
        <svg className="w-5 h-5 me-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
        {t('uploadFirstNotebook')}
      </Button>
    </div>
  )
}

// ============================================================================
// Exam Prediction CTA
// ============================================================================

function ExamPredictionCTA() {
  const t = useTranslations('dashboard')
  const [predictionReady, setPredictionReady] = useState(false)
  const [analyzedCount, setAnalyzedCount] = useState(0)

  useEffect(() => {
    async function checkPrediction() {
      try {
        const res = await fetch('/api/exam-prediction/status')
        if (res.ok) {
          const data = await res.json()
          setAnalyzedCount(data.analyzedCount || 0)
          setPredictionReady(data.analyzedCount >= 3)
        }
      } catch { /* silent */ }
    }
    checkPrediction()
  }, [])

  if (analyzedCount === 0) return null

  return (
    <Link
      href="/settings/past-exams"
      className={`block rounded-[22px] p-5 shadow-card card-hover-lift relative overflow-hidden group ${
        predictionReady
          ? 'bg-gradient-to-br from-amber-500 to-orange-600 text-white'
          : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl" role="img" aria-hidden="true">&#x1F52E;</span>
        <div className="flex-1">
          <h3 className={`font-bold text-sm ${predictionReady ? 'text-white' : 'text-gray-900 dark:text-white'}`}>
            {predictionReady
              ? t('examPredictionReady', { defaultMessage: 'Exam Prediction Ready!' })
              : t('examPredictionProgress', { count: analyzedCount, defaultMessage: `${analyzedCount}/3 exams analyzed` })}
          </h3>
          <p className={`text-xs ${predictionReady ? 'text-white/80' : 'text-gray-500 dark:text-gray-400'}`}>
            {predictionReady
              ? t('examPredictionReadyDesc', { defaultMessage: 'See what topics are likely on your next exam' })
              : t('examPredictionProgressDesc', { defaultMessage: 'Upload more past exams to unlock predictions' })}
          </p>
        </div>
        <span className="text-lg">&rarr;</span>
      </div>
    </Link>
  )
}
