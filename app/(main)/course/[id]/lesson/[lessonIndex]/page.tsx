import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Course, UserProgress, GeneratedCourse } from '@/types'
import LessonView from './LessonView'

interface LessonPageProps {
  params: {
    id: string
    lessonIndex: string
  }
}

async function getLessonData(courseId: string, lessonIndex: number) {
  const supabase = await createClient()

  // Get authenticated user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return null
  }

  // Fetch course
  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('*')
    .eq('id', courseId)
    .single()

  if (courseError || !course) {
    return null
  }

  const generatedCourse = course.generated_course as GeneratedCourse & { sections?: any[] }
  // Handle both "lessons" and legacy "sections" from AI response
  const lessons = generatedCourse.lessons || generatedCourse.sections || []

  // Validate lesson index
  if (lessonIndex < 0 || lessonIndex >= lessons.length) {
    return null
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
    return null
  }

  return {
    course: course as Course,
    progress: progress as UserProgress,
    lessonIndex,
    lesson: lessons[lessonIndex],
    totalLessons: lessons.length,
  }
}

export async function generateMetadata({ params }: LessonPageProps) {
  const lessonIndex = parseInt(params.lessonIndex, 10)
  const data = await getLessonData(params.id, lessonIndex)

  if (!data) {
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

  if (!data) {
    notFound()
  }

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
