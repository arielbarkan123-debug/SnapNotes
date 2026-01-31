'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { useCourses } from '@/hooks'
import {
  BookOpen,
  Calendar,
  Clock,
  CalendarOff,
  GraduationCap,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Check,
} from 'lucide-react'
import type { Course } from '@/types'

// ============================================================================
// Types
// ============================================================================

interface SkippedLesson {
  courseId: string
  lessonIndex: number
}

// ============================================================================
// Constants
// ============================================================================

const TOTAL_STEPS = 6
const WEEKDAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ============================================================================
// Component
// ============================================================================

export default function CreatePlanContent() {
  const router = useRouter()
  const t = useTranslations('studyPlan.wizard')
  const { courses, isLoading: coursesLoading } = useCourses()

  // Wizard state
  const [step, setStep] = useState(1)
  const [generating, setGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [selectedCourseIds, setSelectedCourseIds] = useState<string[]>([])
  const [examDate, setExamDate] = useState('')
  const [dailyTimeMinutes, setDailyTimeMinutes] = useState(30)
  const [skipWeekdays, setSkipWeekdays] = useState<number[]>([]) // 0=Sun, 6=Sat
  const [skipDates, setSkipDates] = useState<string[]>([])
  const [skippedLessons, setSkippedLessons] = useState<SkippedLesson[]>([])
  const [expandedCourses, setExpandedCourses] = useState<Set<string>>(new Set())

  // Min date = tomorrow
  const tomorrow = useMemo(() => {
    const d = new Date()
    d.setDate(d.getDate() + 1)
    return d.toISOString().split('T')[0]
  }, [])

  // Selected courses with details
  const selectedCourses = useMemo(() => {
    return courses.filter(c => selectedCourseIds.includes(c.id))
  }, [courses, selectedCourseIds])

  // Build lesson list for selected courses
  const courseLessons = useMemo(() => {
    const result: { courseId: string; courseTitle: string; lessonIndex: number; lessonTitle: string }[] = []
    for (const course of selectedCourses) {
      const gc = course.generated_course
      if (gc?.lessons) {
        gc.lessons.forEach((lesson, idx) => {
          result.push({
            courseId: course.id,
            courseTitle: course.title,
            lessonIndex: idx,
            lessonTitle: lesson.title,
          })
        })
      }
    }
    return result
  }, [selectedCourses])

  // Compute skip days (recurring weekdays + specific dates)
  const allSkipDays = useMemo(() => {
    if (!examDate) return []
    const days: string[] = [...skipDates]
    const start = new Date()
    start.setDate(start.getDate() + 1)
    const end = new Date(examDate)

    const current = new Date(start)
    while (current < end) {
      if (skipWeekdays.includes(current.getDay())) {
        const dateStr = current.toISOString().split('T')[0]
        if (!days.includes(dateStr)) {
          days.push(dateStr)
        }
      }
      current.setDate(current.getDate() + 1)
    }
    return days
  }, [examDate, skipWeekdays, skipDates])

  // Navigation
  const canGoNext = useMemo(() => {
    switch (step) {
      case 1: return selectedCourseIds.length > 0
      case 2: return examDate !== ''
      case 3: return true
      case 4: return true
      case 5: return true
      case 6: return true
      default: return false
    }
  }, [step, selectedCourseIds, examDate])

  const goNext = () => {
    if (step < TOTAL_STEPS && canGoNext) setStep(step + 1)
  }
  const goBack = () => {
    if (step > 1) setStep(step - 1)
  }

  // Toggle course selection
  const toggleCourse = (courseId: string) => {
    setSelectedCourseIds(prev =>
      prev.includes(courseId)
        ? prev.filter(id => id !== courseId)
        : [...prev, courseId]
    )
  }

  // Toggle weekday skip
  const toggleWeekday = (day: number) => {
    setSkipWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    )
  }

  // Toggle skip date
  const toggleSkipDate = (date: string) => {
    setSkipDates(prev =>
      prev.includes(date) ? prev.filter(d => d !== date) : [...prev, date]
    )
  }

  // Toggle lesson skip
  const toggleLesson = (courseId: string, lessonIndex: number) => {
    setSkippedLessons(prev => {
      const exists = prev.some(s => s.courseId === courseId && s.lessonIndex === lessonIndex)
      if (exists) {
        return prev.filter(s => !(s.courseId === courseId && s.lessonIndex === lessonIndex))
      }
      return [...prev, { courseId, lessonIndex }]
    })
  }

  // Toggle expand course
  const toggleExpandCourse = (courseId: string) => {
    setExpandedCourses(prev => {
      const next = new Set(prev)
      if (next.has(courseId)) next.delete(courseId)
      else next.add(courseId)
      return next
    })
  }

  // Generate plan
  const handleGenerate = async () => {
    if (generating) return
    setGenerating(true)
    setError(null)

    try {
      const title = selectedCourses.length === 1
        ? `${selectedCourses[0].title} - Exam Prep`
        : `Exam Prep (${selectedCourses.length} courses)`

      const res = await fetch('/api/study-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          examDate,
          courseIds: selectedCourseIds,
          dailyTimeMinutes,
          skipDays: allSkipDays,
          skippedLessons,
          lessons: courseLessons,
          masteryData: [], // Will be populated from server-side data
        }),
      })

      const data = await res.json()

      if (data.success) {
        router.push('/study-plan')
      } else {
        setError(data.error?.message || t('generateError'))
      }
    } catch {
      setError(t('generateError'))
    } finally {
      setGenerating(false)
    }
  }

  // Loading
  if (coursesLoading) {
    return (
      <div className="max-w-2xl mx-auto p-4">
        <div className="animate-pulse space-y-6">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded" />
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded-xl" />
        </div>
      </div>
    )
  }

  // ============================================================================
  // Step Renderers
  // ============================================================================

  const stepIcons = [BookOpen, Calendar, Clock, CalendarOff, GraduationCap, Sparkles]
  const StepIcon = stepIcons[step - 1]

  return (
    <div className="max-w-2xl mx-auto p-4">
      {/* Header */}
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        {t('title')}
      </h1>

      {/* Step indicator */}
      <div className="flex items-center gap-1 mb-6">
        {Array.from({ length: TOTAL_STEPS }, (_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i + 1 <= step
                ? 'bg-indigo-600 dark:bg-indigo-500'
                : 'bg-gray-200 dark:bg-gray-700'
            }`}
          />
        ))}
      </div>

      {/* Step content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm p-6 mb-6">
        {/* Step header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg flex items-center justify-center">
            <StepIcon className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-900 dark:text-white">
              {t(`step${step}Title`)}
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t(`step${step}Description`)}
            </p>
          </div>
        </div>

        <div className="mt-6">
          {/* Step 1: Select Courses */}
          {step === 1 && (
            <div className="space-y-2">
              {courses.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                  {t('noCourses')}
                </p>
              ) : (
                courses.map((course: Course) => {
                  const isSelected = selectedCourseIds.includes(course.id)
                  const lessonCount = course.generated_course?.lessons?.length || 0
                  return (
                    <button
                      key={course.id}
                      onClick={() => toggleCourse(course.id)}
                      className={`w-full text-left p-4 rounded-xl transition-all flex items-center gap-3 ${
                        isSelected
                          ? 'bg-indigo-50 dark:bg-indigo-900/30 border-2 border-indigo-500'
                          : 'bg-gray-50 dark:bg-gray-700/50 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                      }`}
                    >
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {isSelected && <Check className="w-4 h-4 text-white" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <span className="font-medium text-gray-900 dark:text-white block truncate">
                          {course.title}
                        </span>
                        {lessonCount > 0 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {t('lessonsCount', { count: lessonCount })}
                          </span>
                        )}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          )}

          {/* Step 2: Exam Date */}
          {step === 2 && (
            <div>
              <input
                type="date"
                value={examDate}
                min={tomorrow}
                onChange={(e) => setExamDate(e.target.value)}
                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white text-lg"
              />
              {examDate && (
                <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
                  {(() => {
                    const days = Math.ceil(
                      (new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    )
                    return days === 1 ? t('dayLeft' as 'back') : t('daysLeft' as 'back', { count: days } as never)
                  })()}
                </p>
              )}
            </div>
          )}

          {/* Step 3: Daily Study Time */}
          {step === 3 && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-gray-700 dark:text-gray-300">{t('minutesPerDay', { count: dailyTimeMinutes })}</span>
                <span className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">
                  {dailyTimeMinutes}
                </span>
              </div>
              <input
                type="range"
                min="15"
                max="120"
                step="15"
                value={dailyTimeMinutes}
                onChange={(e) => setDailyTimeMinutes(Number(e.target.value))}
                className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
                style={{
                  background: `linear-gradient(to right, rgb(99, 102, 241) 0%, rgb(99, 102, 241) ${((dailyTimeMinutes - 15) / 105) * 100}%, rgb(229, 231, 235) ${((dailyTimeMinutes - 15) / 105) * 100}%, rgb(229, 231, 235) 100%)`,
                }}
              />
              <div className="flex justify-between mt-2 text-xs text-gray-500 dark:text-gray-400">
                <span>15</span>
                <span>30</span>
                <span>45</span>
                <span>60</span>
                <span>90</span>
                <span>120</span>
              </div>
              {/* Quick select */}
              <div className="flex gap-2 mt-4">
                {[15, 30, 45, 60, 90, 120].map(v => (
                  <button
                    key={v}
                    onClick={() => setDailyTimeMinutes(v)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                      dailyTimeMinutes === v
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                    }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Step 4: Skip Days */}
          {step === 4 && (
            <div className="space-y-4">
              {/* Weekday toggles */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Skip these days every week
                </label>
                <div className="flex gap-2">
                  {WEEKDAY_NAMES.map((name, idx) => (
                    <button
                      key={idx}
                      onClick={() => toggleWeekday(idx)}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        skipWeekdays.includes(idx)
                          ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-2 border-red-400'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-2 border-transparent'
                      }`}
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specific skip dates */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                  Skip specific dates
                </label>
                <input
                  type="date"
                  min={tomorrow}
                  max={examDate || undefined}
                  onChange={(e) => {
                    if (e.target.value) {
                      toggleSkipDate(e.target.value)
                      e.target.value = ''
                    }
                  }}
                  className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-xl dark:bg-gray-700 dark:text-white"
                />
                {skipDates.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {skipDates.map(date => (
                      <button
                        key={date}
                        onClick={() => toggleSkipDate(date)}
                        className="px-3 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full text-sm flex items-center gap-1"
                      >
                        {new Date(date + 'T00:00:00').toLocaleDateString()}
                        <span className="text-red-400">&times;</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <p className="text-sm text-gray-500 dark:text-gray-400">
                {allSkipDays.length === 0
                  ? t('noSkipDays')
                  : t('skipDaysCount', { count: allSkipDays.length })}
              </p>
            </div>
          )}

          {/* Step 5: Known Lessons */}
          {step === 5 && (
            <div className="space-y-2">
              {courseLessons.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 py-4 text-center">
                  {t('allLessonsNew')}
                </p>
              ) : (
                selectedCourses.map(course => {
                  const lessons = course.generated_course?.lessons || []
                  const isExpanded = expandedCourses.has(course.id)
                  const skippedCount = skippedLessons.filter(s => s.courseId === course.id).length
                  return (
                    <div key={course.id} className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
                      <button
                        onClick={() => toggleExpandCourse(course.id)}
                        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                      >
                        <span className="font-medium text-gray-900 dark:text-white">
                          {course.title}
                        </span>
                        <div className="flex items-center gap-2">
                          {skippedCount > 0 && (
                            <span className="text-xs bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 px-2 py-0.5 rounded-full">
                              {skippedCount} skipped
                            </span>
                          )}
                          <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>
                      {isExpanded && (
                        <div className="p-2 space-y-1">
                          {lessons.map((lesson, idx) => {
                            const isSkipped = skippedLessons.some(
                              s => s.courseId === course.id && s.lessonIndex === idx
                            )
                            return (
                              <button
                                key={idx}
                                onClick={() => toggleLesson(course.id, idx)}
                                className={`w-full text-left p-3 rounded-lg flex items-center gap-3 transition ${
                                  isSkipped
                                    ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 text-gray-700 dark:text-gray-300'
                                }`}
                              >
                                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 ${
                                  isSkipped
                                    ? 'bg-green-500 border-green-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                }`}>
                                  {isSkipped && <Check className="w-3 h-3 text-white" />}
                                </div>
                                <span className="text-sm">{lesson.title}</span>
                              </button>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })
              )}
              {skippedLessons.length > 0 && (
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {t('skippedLessonsCount', { count: skippedLessons.length })}
                </p>
              )}
            </div>
          )}

          {/* Step 6: Summary */}
          {step === 6 && (
            <div className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">{t('selectedCourses')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {selectedCourses.map(c => c.title).join(', ')}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">{t('step2Title')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {examDate ? new Date(examDate + 'T00:00:00').toLocaleDateString() : '-'}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">{t('dailyTime')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t('minutesPerDay', { count: dailyTimeMinutes })}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-700">
                  <span className="text-gray-500 dark:text-gray-400">{t('step4Title')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t('skipDaysCount', { count: allSkipDays.length })}
                  </span>
                </div>
                <div className="flex justify-between py-2">
                  <span className="text-gray-500 dark:text-gray-400">{t('step5Title')}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {t('skippedLessonsCount', { count: skippedLessons.length })}
                  </span>
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={generating}
                className="w-full py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white font-semibold rounded-xl transition-all text-lg shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {generating ? t('generating') : t('generate')}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={goBack}
          disabled={step === 1}
          className="flex items-center gap-2 px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white disabled:opacity-30 transition"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('back')}
        </button>
        {step < TOTAL_STEPS && (
          <button
            onClick={goNext}
            disabled={!canGoNext}
            className="flex items-center gap-2 px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {t('next')}
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  )
}
