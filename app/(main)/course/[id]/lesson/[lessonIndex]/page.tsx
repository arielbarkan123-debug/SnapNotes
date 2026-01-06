import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Course, UserProgress, GeneratedCourse, Lesson, LessonIntensityMode } from '@/types'
import LessonView from './LessonView'
import DeepPracticeLessonView from '@/components/lesson/DeepPracticeLessonView'
import LockedLessonRedirect from './LockedLessonRedirect'

interface LessonPageProps {
  params: {
    id: string
    lessonIndex: string
  }
}

interface LessonDataResult {
  success: true
  course: Course
  progress: UserProgress
  lessonIndex: number
  lesson: Lesson
  totalLessons: number
  intensityMode: LessonIntensityMode
}

interface LessonDataError {
  success: false
  reason: 'no_user' | 'no_course' | 'invalid_index' | 'locked'
  courseId?: string
}

type GetLessonDataResult = LessonDataResult | LessonDataError

async function getLessonData(courseId: string, lessonIndex: number): Promise<GetLessonDataResult> {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return { success: false, reason: 'no_user' }
  }

  // Fetch course - IMPORTANT: Filter by user_id to ensure user owns this course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .eq('user_id', user.id)
    .single()

  if (courseError || !course) {
    return { success: false, reason: 'no_course' }
  }

  const generatedCourse = course.generated_course as GeneratedCourse & { sections?: Lesson[] }
  // Handle both "lessons" and legacy "sections" from AI response
  const lessons = generatedCourse.lessons || generatedCourse.sections || []

  // Validate lesson index
  if (lessonIndex < 0 || lessonIndex >= lessons.length) {
    return { success: false, reason: 'invalid_index', courseId }
  }

  // Fetch user progress
  let { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', courseId)
    .single()

  // Create initial progress if none exists
  if (!progress) {
    const { data: newProgress } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        course_id: courseId,
        current_lesson: 0,
        current_step: 0,
        completed_lessons: [],
      })
      .select()
      .single()

    progress = newProgress || {
      id: '',
      user_id: user.id,
      course_id: courseId,
      current_lesson: 0,
      current_step: 0,
      completed_lessons: [],
      questions_answered: 0,
      questions_correct: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
  }

  // Check if lesson is accessible (lesson 0 always accessible, others need previous completed)
  const isAccessible = lessonIndex === 0 ||
    (progress.completed_lessons || []).includes(lessonIndex - 1)

  if (!isAccessible) {
    return { success: false, reason: 'locked', courseId }
  }

  return {
    success: true,
    course: course as Course,
    progress: progress as UserProgress,
    lessonIndex,
    lesson: lessons[lessonIndex],
    totalLessons: lessons.length,
    intensityMode: (course.intensity_mode as LessonIntensityMode) || 'standard',
  }
}

export async function generateMetadata({ params }: LessonPageProps) {
  const lessonIndex = parseInt(params.lessonIndex, 10)
  const data = await getLessonData(params.id, lessonIndex)

  if (!data.success) {
    return {
      title: 'Lesson Not Found | StudySnap',
    }
  }

  return {
    title: `${data.lesson.title} | StudySnap`,
    description: `Lesson ${lessonIndex + 1} of ${data.totalLessons}`,
  }
}

export default async function LessonPage({ params }: LessonPageProps) {
  const lessonIndex = parseInt(params.lessonIndex, 10)

  if (isNaN(lessonIndex)) {
    notFound()
  }

  const data = await getLessonData(params.id, lessonIndex)

  if (!data.success) {
    // Handle different error cases
    switch (data.reason) {
      case 'no_user':
        // Not authenticated - redirect to login
        redirect('/login')
      case 'locked':
        // Lesson is locked - use client-side redirect to avoid React hooks error #310
        // Server-side redirect causes hydration mismatch during RSC streaming
        return <LockedLessonRedirect courseId={data.courseId!} />
      case 'no_course':
      case 'invalid_index':
      default:
        notFound()
    }
  }

  // Use DeepPracticeLessonView for deep_practice mode
  if (data.intensityMode === 'deep_practice') {
    return (
      <DeepPracticeLessonView
        course={data.course}
        progress={data.progress}
        lessonIndex={data.lessonIndex}
        lesson={data.lesson}
        totalLessons={data.totalLessons}
      />
    )
  }

  // Standard and Quick modes use the regular LessonView
  return (
    <LessonView
      course={data.course}
      progress={data.progress}
      lessonIndex={data.lessonIndex}
      lesson={data.lesson}
      totalLessons={data.totalLessons}
    />
  )
}
