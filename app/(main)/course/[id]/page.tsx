import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Course } from '@/types'
import CourseView from './CourseView'

interface CoursePageProps {
  params: {
    id: string
  }
}

async function getCourse(id: string): Promise<Course | null> {
  const supabase = await createClient()

  const { data: course, error } = await supabase
    .from('courses')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !course) {
    return null
  }

  return course as Course
}

export async function generateMetadata({ params }: CoursePageProps) {
  const course = await getCourse(params.id)

  if (!course) {
    return {
      title: 'Course Not Found | NoteSnap',
    }
  }

  return {
    title: `${course.title} | NoteSnap`,
    description: `Study course generated from your notebook notes`,
  }
}

export default async function CoursePage({ params }: CoursePageProps) {
  const course = await getCourse(params.id)

  if (!course) {
    notFound()
  }

  return <CourseView course={course} />
}
