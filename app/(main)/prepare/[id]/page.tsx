import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import PrepareGuideView from './PrepareGuideView'

export const metadata: Metadata = {
  title: 'Study Guide',
  description: 'View your AI-generated study guide',
}

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ token?: string }>
}

export default async function PrepareGuidePage({ params, searchParams }: Props) {
  const { id } = await params
  const { token } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // If no user and no share token, redirect to login
  if (!user && !token) {
    redirect('/login')
  }

  return <PrepareGuideView guideId={id} shareToken={token} isOwner={!!user} />
}
