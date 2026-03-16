import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { language } = await request.json()
  if (language !== 'en' && language !== 'he') {
    return NextResponse.json({ error: 'Invalid language' }, { status: 400 })
  }

  await supabase
    .from('user_learning_profile')
    .update({ language })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
