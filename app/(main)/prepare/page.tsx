import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrepareHubContent from './PrepareHubContent'

export const metadata: Metadata = {
  title: 'Prepare - Study Guides',
  description: 'Generate comprehensive AI study guides from your notes',
}

export default async function PreparePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <PrepareHubContent />
}
