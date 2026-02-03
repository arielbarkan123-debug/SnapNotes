'use client'

import { useRouter } from 'next/navigation'
import useSWR from 'swr'
import { useTranslations } from 'next-intl'
import { BookOpen, Zap, RotateCcw } from 'lucide-react'

// =============================================================================
// Types
// =============================================================================

interface CoursesResponse {
  success: boolean
  courses: {
    id: string
    title: string
  }[]
}

interface DueResponse {
  cards_due: number
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
// Component
// =============================================================================

export default function QuickActions() {
  const router = useRouter()
  const t = useTranslations('dashboard.quickActions')

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

  const latestCourse = coursesData?.courses?.[0]
  const cardsDue = dueData?.cards_due ?? 0

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
      {/* Continue Learning */}
      <button
        onClick={() => {
          if (latestCourse) {
            router.push(`/course/${latestCourse.id}`)
          } else {
            router.push('/dashboard')
          }
        }}
        className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-violet-500 to-violet-600 dark:from-violet-600 dark:to-violet-700 text-white shadow-sm hover:shadow-md transition-all text-start"
      >
        <BookOpen className="w-6 h-6 mb-2 opacity-80 group-hover:opacity-100 transition-opacity" />
        <p className="font-semibold text-sm">{t('continueLearning')}</p>
        <p className="text-xs text-violet-100 mt-0.5 truncate">
          {latestCourse ? latestCourse.title : t('noCourseYet')}
        </p>
      </button>

      {/* Quick Practice */}
      <button
        onClick={() => router.push('/practice?auto=true&count=10')}
        className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 dark:from-purple-600 dark:to-purple-700 text-white shadow-sm hover:shadow-md transition-all text-start"
      >
        <Zap className="w-6 h-6 mb-2 opacity-80 group-hover:opacity-100 transition-opacity" />
        <p className="font-semibold text-sm">{t('quickPractice')}</p>
        <p className="text-xs text-purple-100 mt-0.5">
          {t('quickPracticeDesc')}
        </p>
      </button>

      {/* Review Cards */}
      <button
        onClick={() => router.push('/review')}
        className="group relative overflow-hidden p-4 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 dark:from-emerald-600 dark:to-emerald-700 text-white shadow-sm hover:shadow-md transition-all text-start"
      >
        <RotateCcw className="w-6 h-6 mb-2 opacity-80 group-hover:opacity-100 transition-opacity" />
        <p className="font-semibold text-sm">{t('reviewCards')}</p>
        <p className="text-xs text-emerald-100 mt-0.5">
          {cardsDue > 0
            ? t('cardsDue', { count: cardsDue })
            : t('allCaughtUp')}
        </p>
      </button>
    </div>
  )
}
