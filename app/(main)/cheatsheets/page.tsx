import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CheatsheetsListContent from './CheatsheetsListContent'

export default async function CheatsheetsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <CheatsheetsListContent />
}
