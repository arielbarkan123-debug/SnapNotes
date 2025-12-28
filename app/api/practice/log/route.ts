import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

interface RequestBody {
  card_id: string
  was_correct: boolean
  duration_ms?: number
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const body: RequestBody = await request.json()
    const { card_id, was_correct, duration_ms } = body

    if (!card_id || typeof was_correct !== 'boolean') {
      return NextResponse.json(
        { error: 'card_id and was_correct are required' },
        { status: 400 }
      )
    }

    // Log the practice attempt
    const { error: insertError } = await supabase
      .from('practice_logs')
      .insert({
        user_id: user.id,
        card_id,
        was_correct,
        duration_ms: duration_ms || null,
        practice_type: 'mixed',
      })

    if (insertError) {
      // Don't log error if table doesn't exist - feature is optional
      if (insertError.code !== 'PGRST205') {
        console.error('Failed to log practice:', insertError)
      }
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error logging practice:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
