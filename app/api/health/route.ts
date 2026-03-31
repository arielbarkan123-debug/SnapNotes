import { NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

const APP_VERSION = process.env.npm_package_version || '3.1.0'

export async function GET() {
  const timestamp = new Date().toISOString()
  const checks: Record<string, string> = {}

  // Supabase connectivity probe
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    try {
      const supabase = createServiceClient()
      const { error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1)
        .abortSignal(controller.signal)
      checks.supabase = error ? `error: ${error.message}` : 'ok'
    } finally {
      clearTimeout(timeout)
    }
  } catch (err) {
    checks.supabase = `error: ${err instanceof Error ? err.message : 'unknown'}`
  }

  const allOk = Object.values(checks).every((v) => v === 'ok')

  return NextResponse.json(
    { status: allOk ? 'ok' : 'degraded', timestamp, version: APP_VERSION, checks },
    { status: allOk ? 200 : 503 }
  )
}
