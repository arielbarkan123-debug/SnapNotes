import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CreatePlanContent from './CreatePlanContent'

export default async function CreatePlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CreatePlanContent />
}
