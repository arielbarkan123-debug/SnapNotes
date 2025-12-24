import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase/server'
import { checkAdminAccess, parseDateRange } from '@/lib/admin/utils'

/**
 * GET /api/admin/analytics/funnels
 * Get funnel analytics
 */
export async function GET(request: NextRequest) {
  const { isAdmin, error } = await checkAdminAccess()
  if (!isAdmin) return error!

  const { searchParams } = new URL(request.url)
  const { startDate, endDate } = parseDateRange(searchParams)
  const funnelName = searchParams.get('funnel')

  const supabase = createServiceClient()

  try {
    // Get all funnel steps
    let query = supabase
      .from('analytics_funnels')
      .select('*')
      .gte('completed_at', startDate.toISOString())
      .lte('completed_at', endDate.toISOString())

    if (funnelName) {
      query = query.eq('funnel_name', funnelName)
    }

    const { data: funnelSteps, error: queryError } = await query

    if (queryError) throw queryError

    // Aggregate by funnel
    const funnelData: Record<string, {
      steps: Record<string, { count: number; order: number; totalTime: number }>
      users: Set<string>
    }> = {}

    funnelSteps?.forEach((step) => {
      if (!funnelData[step.funnel_name]) {
        funnelData[step.funnel_name] = { steps: {}, users: new Set() }
      }

      if (!funnelData[step.funnel_name].steps[step.step_name]) {
        funnelData[step.funnel_name].steps[step.step_name] = {
          count: 0,
          order: step.step_order,
          totalTime: 0,
        }
      }

      funnelData[step.funnel_name].steps[step.step_name].count++
      funnelData[step.funnel_name].steps[step.step_name].totalTime += step.time_from_previous_step_ms || 0
      if (step.user_id) {
        funnelData[step.funnel_name].users.add(step.user_id)
      }
    })

    // Format funnel analytics
    const funnels = Object.entries(funnelData).map(([name, data]) => {
      const steps = Object.entries(data.steps)
        .sort((a, b) => a[1].order - b[1].order)
        .map(([stepName, stats], index, arr) => {
          const prevCount = index > 0 ? arr[index - 1][1].count : stats.count
          return {
            name: stepName,
            order: stats.order,
            count: stats.count,
            conversionRate: prevCount > 0 ? Math.round((stats.count / prevCount) * 100) : 100,
            dropOffRate: prevCount > 0 ? Math.round(((prevCount - stats.count) / prevCount) * 100) : 0,
            avgTimeToStep: stats.count > 0 ? Math.round(stats.totalTime / stats.count) : 0,
          }
        })

      const firstStep = steps[0]
      const lastStep = steps[steps.length - 1]
      const overallConversion = firstStep && lastStep
        ? Math.round((lastStep.count / firstStep.count) * 100)
        : 0

      return {
        name,
        steps,
        totalUsers: data.users.size,
        totalEntries: firstStep?.count || 0,
        totalCompletions: lastStep?.count || 0,
        overallConversionRate: overallConversion,
      }
    })

    // Get list of available funnels
    const availableFunnels = [...new Set(funnelSteps?.map((s) => s.funnel_name) || [])]

    return NextResponse.json({
      funnels,
      availableFunnels,
    })
  } catch (error) {
    console.error('[Admin Analytics] Funnels error:', error)
    return NextResponse.json({ error: 'Failed to fetch funnel data' }, { status: 500 })
  }
}
