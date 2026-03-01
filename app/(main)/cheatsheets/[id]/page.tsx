import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheatsheetContent from './CheatsheetContent'

export default async function CheatsheetPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CheatsheetContent cheatsheetId={id} />
}
