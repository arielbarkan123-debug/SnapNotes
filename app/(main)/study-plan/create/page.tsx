import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePlanContent from './CreatePlanContent'

export const metadata: Metadata = {
  title: 'Create Study Plan',
  description: 'Create a personalized study plan for your exams',
}

export default async function CreatePlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CreatePlanContent />
}
