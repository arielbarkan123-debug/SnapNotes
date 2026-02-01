import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import StudyPlanContent from './StudyPlanContent'

export const metadata: Metadata = {
  title: 'Study Plan',
  description: 'Plan your study schedule for upcoming exams',
}

export default async function StudyPlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <StudyPlanContent />
}
