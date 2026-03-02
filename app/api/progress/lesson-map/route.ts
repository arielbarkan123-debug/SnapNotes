import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('course_id, lesson_index, completed')
      .eq('user_id', user.id)
      .eq('completed', true)
      .order('lesson_index', { ascending: false })

    const progressMap: Record<string, number> = {}
    for (const row of progress || []) {
      if (!(row.course_id in progressMap) || row.lesson_index > progressMap[row.course_id]) {
        progressMap[row.course_id] = row.lesson_index
      }
    }

    return NextResponse.json({ progressMap })
  } catch {
    return createErrorResponse(ErrorCodes.DATABASE_UNKNOWN)
  }
}
