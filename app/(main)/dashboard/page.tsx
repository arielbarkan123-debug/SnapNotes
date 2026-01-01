import { createClient } from '@/lib/supabase/server'
import DashboardContent from './DashboardContent'
import { Course } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return <DashboardContent initialCourses={[]} />
  }

  // Select fields needed for dashboard list view including cover image and course structure for difficulty
  // IMPORTANT: Filter by user_id to only show the current user's courses
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, user_id, title, original_image_url, image_urls, source_type, cover_image_url, generated_course, created_at, updated_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  // Silently handle errors - courses will just be empty
  if (error) {
    return <DashboardContent initialCourses={[]} />
  }

  return <DashboardContent initialCourses={(courses as Course[]) || []} />
}
