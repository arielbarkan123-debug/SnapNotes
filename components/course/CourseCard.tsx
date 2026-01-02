'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Course, GeneratedCourse } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import DeleteConfirmModal from './DeleteConfirmModal'

interface CourseCardProps {
  course: Course
  onDelete?: (courseId: string) => void
}

// Subject detection for gradient colors (no icons)
const SUBJECT_PATTERNS: { pattern: RegExp; gradient: string }[] = [
  { pattern: /math|algebra|calcul|geometry|trigonometry|equation|fraction/i, gradient: 'from-blue-500 to-indigo-600' },
  { pattern: /physic|force|motion|energy|wave|electric|magnet/i, gradient: 'from-purple-500 to-pink-600' },
  { pattern: /chemistry|chem|molecule|atom|element|reaction|compound/i, gradient: 'from-green-500 to-teal-600' },
  { pattern: /biology|bio|cell|dna|organism|plant|animal|anatomy/i, gradient: 'from-emerald-500 to-green-600' },
  { pattern: /history|war|ancient|civilization|revolution|empire/i, gradient: 'from-amber-500 to-orange-600' },
  { pattern: /geography|geo|map|country|continent|climate|earth/i, gradient: 'from-cyan-500 to-blue-600' },
  { pattern: /english|grammar|literature|writing|essay|poem|novel/i, gradient: 'from-rose-500 to-red-600' },
  { pattern: /language|spanish|french|german|hebrew|arabic|chinese/i, gradient: 'from-violet-500 to-purple-600' },
  { pattern: /computer|programming|code|software|algorithm|data/i, gradient: 'from-slate-500 to-gray-700' },
  { pattern: /art|paint|draw|design|creative|music|sculpture/i, gradient: 'from-pink-500 to-rose-600' },
  { pattern: /economics|economy|market|business|finance|money/i, gradient: 'from-green-600 to-emerald-700' },
  { pattern: /psychology|psych|mind|behavior|mental|cognitive/i, gradient: 'from-fuchsia-500 to-pink-600' },
  { pattern: /philosophy|ethics|logic|socrates|plato|aristotle/i, gradient: 'from-indigo-500 to-violet-600' },
  { pattern: /medicine|health|disease|treatment|diagnosis|anatomy/i, gradient: 'from-red-500 to-rose-600' },
  { pattern: /law|legal|constitution|court|rights|justice/i, gradient: 'from-gray-600 to-slate-700' },
  { pattern: /sociology|social|society|culture|community/i, gradient: 'from-orange-500 to-amber-600' },
]

function detectSubject(title: string): { gradient: string } {
  for (const subject of SUBJECT_PATTERNS) {
    if (subject.pattern.test(title)) {
      return { gradient: subject.gradient }
    }
  }
  // Default gradient based on title hash for variety
  const hash = title.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  const defaultGradients = [
    'from-indigo-500 to-purple-600',
    'from-blue-500 to-cyan-600',
    'from-amber-500 to-yellow-600',
    'from-red-500 to-orange-600',
    'from-yellow-500 to-amber-600',
  ]
  return { gradient: defaultGradients[hash % defaultGradients.length] }
}

// Difficulty levels with styling
type DifficultyLevel = 'beginner' | 'intermediate' | 'advanced'

interface DifficultyInfo {
  level: DifficultyLevel
  labelKey: string // Translation key instead of hardcoded label
  color: string
  bgColor: string
  icon: string
}

// Estimate course difficulty based on content analysis
function estimateDifficulty(generatedCourse: GeneratedCourse | null): DifficultyInfo {
  if (!generatedCourse || !generatedCourse.lessons) {
    return {
      level: 'beginner',
      labelKey: 'beginner',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: '🌱',
    }
  }

  const lessons = generatedCourse.lessons
  let score = 0

  // Factor 1: Number of lessons (more lessons = more complex)
  if (lessons.length >= 6) score += 2
  else if (lessons.length >= 4) score += 1

  // Factor 2: Average steps per lesson
  const totalSteps = lessons.reduce((sum, l) => sum + (l.steps?.length || 0), 0)
  const avgSteps = totalSteps / Math.max(lessons.length, 1)
  if (avgSteps >= 8) score += 2
  else if (avgSteps >= 5) score += 1

  // Factor 3: Question complexity (matching, sequence are harder)
  const allSteps = lessons.flatMap(l => l.steps || [])
  const complexQuestionTypes = ['matching', 'sequence', 'short_answer']
  const complexQuestions = allSteps.filter(s =>
    complexQuestionTypes.includes(s.type)
  ).length
  if (complexQuestions >= 5) score += 2
  else if (complexQuestions >= 2) score += 1

  // Factor 4: Content length (longer explanations = more depth)
  const totalContentLength = allSteps.reduce(
    (sum, s) => sum + (s.content?.length || 0),
    0
  )
  if (totalContentLength >= 5000) score += 1

  // Determine difficulty level
  if (score >= 5) {
    return {
      level: 'advanced',
      labelKey: 'advanced',
      color: 'text-red-600 dark:text-red-400',
      bgColor: 'bg-red-100 dark:bg-red-900/30',
      icon: '🔥',
    }
  } else if (score >= 2) {
    return {
      level: 'intermediate',
      labelKey: 'intermediate',
      color: 'text-amber-600 dark:text-amber-400',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      icon: '⚡',
    }
  } else {
    return {
      level: 'beginner',
      labelKey: 'beginner',
      color: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-100 dark:bg-green-900/30',
      icon: '🌱',
    }
  }
}

function formatDate(dateString: string, locale: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export default function CourseCard({ course, onDelete }: CourseCardProps) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const t = useTranslations('dashboard.courseCard')
  const locale = useLocale()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [imageError, setImageError] = useState(false)

  // Determine if we should show the fallback (only when no URL or image failed)
  const showFallback = !course.cover_image_url || imageError

  // Calculate difficulty from course content
  const difficulty = useMemo(
    () => estimateDifficulty(course.generated_course),
    [course.generated_course]
  )

  // Detect subject for cover image
  const subject = useMemo(
    () => detectSubject(course.title),
    [course.title]
  )

  // Get lesson count for display
  const lessonCount = course.generated_course?.lessons?.length || 0

  // Get translated lesson count text
  const lessonCountText = lessonCount === 1
    ? t('lessonSingular', { count: lessonCount })
    : t('lessons', { count: lessonCount })

  // Get translated difficulty label
  const difficultyLabel = t(difficulty.labelKey)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete course')
      }

      success(t('deleteSuccess'))
      setShowDeleteModal(false)

      // Notify parent or refresh
      if (onDelete) {
        onDelete(course.id)
      } else {
        router.refresh()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : t('deleteFailed'))
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        {/* Delete Button */}
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
          aria-label="Delete course"
        >
          <svg
            className="w-4 h-4 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>

        <Link href={`/course/${course.id}`} className="block">
          {/* Cover Image - AI generated or Gradient Fallback */}
          <div className={`relative aspect-[4/3] w-full overflow-hidden ${showFallback ? `bg-gradient-to-br ${subject.gradient}` : 'bg-gray-200 dark:bg-gray-700'}`}>
            {/* Fallback: Only show gradient with decorative elements when no image URL or image failed */}
            {showFallback && (
              <div className="absolute inset-0 opacity-20">
                <div className="absolute top-4 left-4 w-20 h-20 rounded-full bg-white/30" />
                <div className="absolute bottom-8 right-8 w-32 h-32 rounded-full bg-white/20" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-white/10" />
              </div>
            )}

            {/* AI-generated cover image - show directly without opacity transition */}
            {course.cover_image_url && !imageError && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={course.cover_image_url}
                alt={course.title}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                loading="eager"
                onError={() => setImageError(true)}
              />
            )}
            {/* Lesson count badge */}
            {lessonCount > 0 && (
              <div className="absolute bottom-3 left-3 bg-black/30 backdrop-blur-sm text-white text-xs font-medium px-2 py-1 rounded-full">
                {lessonCountText}
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors line-clamp-2">
              {truncateText(course.title, 50)}
            </h3>
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {formatDate(course.created_at, locale)}
              </p>
              {/* Difficulty Badge */}
              <div
                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${difficulty.bgColor} ${difficulty.color}`}
                title={`${difficultyLabel} - ${lessonCountText}`}
              >
                <span>{difficulty.icon}</span>
                <span>{difficultyLabel}</span>
              </div>
            </div>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        courseTitle={course.title}
      />
    </>
  )
}

// Re-export skeleton from dedicated file for backwards compatibility
export { CourseCardSkeleton } from './CourseCardSkeleton'
