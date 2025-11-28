import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Course, UserProgress } from '@/types'
import CourseView from './CourseView'

interface CoursePageProps {
  params: {
    id: string
  }
}

async function getCourseWithProgress(id: string): Promise<{ course: Course; progress: UserProgress } | null> {
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
    .eq('id', id)
    .single()

  if (courseError || !course) {
    return null
  }

  // Fetch user progress
  let { data: progress } = await supabase
    .from('user_progress')
    .select('*')
    .eq('user_id', user.id)
    .eq('course_id', id)
    .single()

  // Create initial progress if none exists
  if (!progress) {
    const { data: newProgress, error: insertError } = await supabase
      .from('user_progress')
      .insert({
        user_id: user.id,
        course_id: id,
        current_lesson: 0,
        current_step: 0,
        completed_lessons: [],
      })
      .select()
      .single()

    if (insertError) {
      console.error('Failed to create progress:', insertError)
      // Return with default progress if insert fails
      progress = {
        id: '',
        user_id: user.id,
        course_id: id,
        current_lesson: 0,
        current_step: 0,
        completed_lessons: [],
        questions_answered: 0,
        questions_correct: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }
    } else {
      progress = newProgress
    }
  }

  return { course: course as Course, progress: progress as UserProgress }
}

export async function generateMetadata({ params }: CoursePageProps) {
  const supabase = await createClient()
  const { data: course } = await supabase
    .from('courses')
    .select('title')
    .eq('id', params.id)
    .single()

  if (!course) {
    return {
      title: 'Course Not Found | StudySnap',
    }
  }

  return {
    title: `${course.title} | StudySnap`,
    description: `Study course generated from your notebook notes`,
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const data = await getCourseWithProgress(params.id)

  if (!data) {
    notFound()
  }

  return <CourseView course={data.course} progress={data.progress} />
}
