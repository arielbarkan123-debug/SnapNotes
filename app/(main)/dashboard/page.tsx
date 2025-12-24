import { createClient } from '@/lib/supabase/server'
import DashboardContent from './DashboardContent'
import { Course } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Select fields needed for dashboard list view including cover image and course structure for difficulty
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, user_id, title, original_image_url, image_urls, source_type, cover_image_url, generated_course, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching courses:', error)
  }

  // Debug: log cover_image_url for each course
  console.log('[Dashboard] Courses with covers:', courses?.map(c => ({
    title: c.title?.substring(0, 30),
    cover_image_url: c.cover_image_url
  })))

  return <DashboardContent initialCourses={(courses as Course[]) || []} />
}
