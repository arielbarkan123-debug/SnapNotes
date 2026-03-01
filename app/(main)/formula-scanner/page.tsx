import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FormulaScannerContent from './FormulaScannerContent'

export default async function FormulaScannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <FormulaScannerContent />
}
