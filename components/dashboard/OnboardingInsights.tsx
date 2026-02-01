'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { BookOpen, RotateCcw, X } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

type InsightType = 'createFirstCourse' | 'cardsDueReminder' | 'keepStreak' | 'checkStudyPlan'

interface DueResponse {
  cards_due: number
}

interface CoursesResponse {
  success: boolean
  courses: { id: string }[]
  count: number
}

// =============================================================================
// Fetcher
// =============================================================================

const fetcher = async (url: string) => {
  const res = await fetch(url)
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}

// =============================================================================
// Helpers
// =============================================================================

function getDismissKey(type: InsightType): string {
  return `notesnap-dismissed-insight-${type}`
}

const DISMISS_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

function isDismissed(type: InsightType): boolean {
  if (typeof window === 'undefined') return false
  const val = localStorage.getItem(getDismissKey(type))
  if (!val) return false
  // Support legacy 'true' values — treat as dismissed but will expire on next check
  if (val === 'true') return true
  const dismissedAt = parseInt(val, 10)
  if (isNaN(dismissedAt)) return false
  return Date.now() - dismissedAt < DISMISS_EXPIRY_MS
}

// =============================================================================
// Component
// =============================================================================

export default function OnboardingInsights() {
  const router = useRouter()
  const t = useTranslations('dashboard.insights')
  const [dismissed, setDismissed] = useState<InsightType | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const { data: coursesData } = useSWR<CoursesResponse>(
    '/api/courses?limit=1',
    fetcher,
    { dedupingInterval: 60000 }
  )

  const { data: dueData } = useSWR<DueResponse>(
    '/api/srs/due',
    fetcher,
    { dedupingInterval: 60000 }
  )

  if (!mounted) return null

  const courseCount = coursesData?.count ?? coursesData?.courses?.length ?? -1
  const cardsDue = dueData?.cards_due ?? 0

  // Determine which insight to show (priority order)
  let insightType: InsightType | null = null
  let message = ''
  let icon = <BookOpen className="w-5 h-5" />
  let action = () => {}
  let actionLabel = ''

  if (courseCount === 0 && !isDismissed('createFirstCourse') && dismissed !== 'createFirstCourse') {
    insightType = 'createFirstCourse'
    message = t('createFirstCourse')
    icon = <BookOpen className="w-5 h-5 text-indigo-500" />
    action = () => router.push('/dashboard')
    actionLabel = t('createFirstCourseAction')
  } else if (cardsDue > 0 && !isDismissed('cardsDueReminder') && dismissed !== 'cardsDueReminder') {
    insightType = 'cardsDueReminder'
    message = t('cardsDueReminder', { count: cardsDue })
    icon = <RotateCcw className="w-5 h-5 text-emerald-500" />
    action = () => router.push('/review')
    actionLabel = t('cardsDueAction')
  }

  // No insight to show
  if (!insightType) return null

  const handleDismiss = () => {
    if (insightType) {
      localStorage.setItem(getDismissKey(insightType), Date.now().toString())
      setDismissed(insightType)
    }
  }

  return (
    <div className="mb-6 flex items-center gap-3 p-4 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm">
      <div className="flex-shrink-0">{icon}</div>
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{message}</p>
      {actionLabel && (
        <button
          onClick={action}
          className="flex-shrink-0 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          {actionLabel}
        </button>
      )}
      <button
        onClick={handleDismiss}
        className="flex-shrink-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
        aria-label={t('dismiss')}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  )
}
