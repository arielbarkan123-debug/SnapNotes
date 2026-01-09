'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useExams, useCourses, EXAMS_CACHE_KEY } from '@/hooks'
import { useSWRConfig } from 'swr'

export default function ExamsPage() {
  const router = useRouter()
  const { mutate: globalMutate } = useSWRConfig()
  const t = useTranslations('exam')

  // SWR hooks for data fetching with caching
  const { exams, isLoading: examsLoading, error: examsError } = useExams()
  const { courses, isLoading: coursesLoading, error: coursesError } = useCourses()

  // Local state for UI
  const [showCreate, setShowCreate] = useState(false)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedCourse, setSelectedCourse] = useState('')
  const [questionCount, setQuestionCount] = useState(10)
  const [timeLimit, setTimeLimit] = useState(30)

  // Log performance on initial load
  useEffect(() => {
    if (!examsLoading && !coursesLoading) {
      console.timeEnd('exams-page-load')
    }
  }, [examsLoading, coursesLoading])

  useEffect(() => {
    console.time('exams-page-load')
  }, [])

  const loading = examsLoading || coursesLoading

  const handleCreate = async () => {
    if (!selectedCourse) {
      setError(t('pleaseSelectCourse'))
      return
    }

    setCreating(true)
    setError(null)

    try {
      const res = await fetch('/api/exams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courseId: selectedCourse,
          questionCount,
          timeLimitMinutes: timeLimit,
        }),
      })

      // Check if response is JSON before parsing
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        console.error('[ExamsPage] Non-JSON response:', res.status)
        if (res.status === 504 || res.status === 503 || res.status === 502) {
          throw new Error(t('serverTimeout'))
        }
        throw new Error(t('serverError'))
      }

      let data
      try {
        data = await res.json()
      } catch (parseError) {
        console.error('[ExamsPage] JSON parse error:', parseError)
        throw new Error(t('serverError'))
      }

      if (data.success && data.examId) {
        // Invalidate exams cache so it refetches
        await globalMutate(EXAMS_CACHE_KEY)
        router.push(`/exams/${data.examId}`)
      } else {
        setError(data.error || t('failedToCreate'))
      }
    } catch {
      setError(t('connectionError'))
    } finally {
      setCreating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
      case 'in_progress': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400'
      case 'expired': return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    }
  }

  const getGradeColor = (grade: string | null) => {
    switch (grade) {
      case 'A': return 'text-green-600 dark:text-green-400'
      case 'B': return 'text-blue-600 dark:text-blue-400'
      case 'C': return 'text-yellow-600 dark:text-yellow-400'
      case 'D': return 'text-orange-600 dark:text-orange-400'
      case 'F': return 'text-red-600 dark:text-red-400'
      default: return 'text-gray-600 dark:text-gray-400'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'completed': return t('statusCompleted')
      case 'in_progress': return t('statusInProgress')
      case 'expired': return t('statusExpired')
      default: return t('statusPending')
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">{t('examMode')}</h1>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
        >
          {t('createExamPlus')}
        </button>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
                  <div className="h-4 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
                </div>
                <div className="text-right">
                  <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : examsError ? (
        <div className="text-center py-12 bg-red-50 dark:bg-red-900/20 rounded-xl">
          <p className="text-red-600 dark:text-red-400">{examsError}</p>
        </div>
      ) : exams.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 dark:bg-gray-800 rounded-xl">
          <p className="text-gray-500 dark:text-gray-400 mb-4">{t('noExamsYet')}</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition"
          >
            {t('createFirstExam')}
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {exams.map((exam) => (
            <div
              key={exam.id}
              onClick={() => router.push(`/exams/${exam.id}`)}
              className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white">{exam.title}</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {t('questionsMinutes', { count: exam.question_count, minutes: exam.time_limit_minutes })}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(exam.status)}`}>
                    {getStatusLabel(exam.status)}
                  </span>
                  {exam.status === 'completed' && exam.grade && (
                    <div className={`text-2xl font-bold mt-1 ${getGradeColor(exam.grade)}`}>
                      {exam.grade}
                    </div>
                  )}
                </div>
              </div>
              {exam.status === 'completed' && (
                <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">{t('score')}</span>
                    <span className="font-medium text-gray-900 dark:text-white">
                      {exam.score}/{exam.total_points} ({exam.percentage}%)
                    </span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={(e) => e.target === e.currentTarget && setShowCreate(false)}>
          <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md overflow-hidden shadow-xl">
            <div className="flex justify-between items-center p-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{t('createExam')}</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">✕</button>
            </div>
            <div className="p-4 space-y-4">
              {error && <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">{error}</div>}
              {coursesError && <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 rounded-lg text-sm">{coursesError}</div>}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('course')}</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
                  disabled={courses.length === 0}
                >
                  <option value="">{courses.length === 0 ? t('noCoursesAvailable') : t('selectCourse')}</option>
                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>{course.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('questions', { count: questionCount })}</label>
                <input
                  type="range"
                  min="5"
                  max="50"
                  step="5"
                  value={questionCount}
                  onChange={(e) => setQuestionCount(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>5</span>
                  <span>50</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{t('timeLimit', { minutes: timeLimit })}</label>
                <input
                  type="range"
                  min="5"
                  max="120"
                  step="5"
                  value={timeLimit}
                  onChange={(e) => setTimeLimit(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>5 {t('minLabel')}</span>
                  <span>120 {t('minLabel')}</span>
                </div>
              </div>

              <button
                onClick={handleCreate}
                disabled={creating || !selectedCourse}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creating ? t('creatingExam') : t('createExam')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
