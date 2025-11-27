import { createClient } from '@/lib/supabase/server'
import DashboardContent from './DashboardContent'
import { Course } from '@/types'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: courses, error } = await supabase
    .from('courses')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching courses:', error)
  }

  return <DashboardContent initialCourses={(courses as Course[]) || []} />
}
