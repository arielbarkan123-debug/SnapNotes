import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudyPlanContent from './StudyPlanContent'

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <StudyPlanContent />
}
