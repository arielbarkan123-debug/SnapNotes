import { createClient } from '@/lib/supabase/server'
import DashboardContent from './DashboardContent'
import { Course } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  // Only select fields needed for dashboard list view (exclude large generated_course JSONB)
  const { data: courses, error } = await supabase
    .from('courses')
    .select('id, user_id, title, original_image_url, image_urls, source_type, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    console.error('Error fetching courses:', error)
  }

  return <DashboardContent initialCourses={(courses as Course[]) || []} />
}
