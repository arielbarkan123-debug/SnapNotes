import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes, createErrorResponse } from '@/lib/api/errors'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  try {
    const { id: guideId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { data: guide, error: fetchError } = await supabase
      .from('prepare_guides')
      .select('*')
      .eq('id', guideId)
      .eq('user_id', user.id)
      .single()

    if (fetchError || !guide) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Guide not found')
    }

    // Generate PDF using @react-pdf/renderer (Phase 5 implementation)
    // For now, return a simple text-based PDF placeholder
    const guideData = guide.generated_guide

    let markdown = `# ${guideData.title}\n`
    if (guideData.subtitle) markdown += `${guideData.subtitle}\n`
    markdown += `\nSubject: ${guideData.subject || 'General'}\n`
    markdown += `Generated: ${guideData.generatedAt || guide.created_at}\n\n`

    for (const topic of guideData.topics || []) {
      markdown += `---\n\n## ${topic.title}\n\n`
      for (const section of topic.sections || []) {
        markdown += `### ${section.title}\n\n${section.content}\n\n`
        if (section.tables?.length) {
          for (const table of section.tables) {
            if (table.headers?.length) {
              markdown += `| ${table.headers.join(' | ')} |\n`
              markdown += `| ${table.headers.map(() => '---').join(' | ')} |\n`
              for (const row of table.rows || []) {
                markdown += `| ${row.join(' | ')} |\n`
              }
              markdown += '\n'
            }
          }
        }
      }
    }

    if (guideData.quickReference) {
      markdown += `---\n\n## ${guideData.quickReference.title}\n\n${guideData.quickReference.content}\n`
    }

    // Return as downloadable text for now; full PDF in Phase 5
    const filename = `${guideData.title.replace(/[^a-zA-Z0-9 ]/g, '').replace(/\s+/g, '-')}.md`

    return new NextResponse(markdown, {
      headers: {
        'Content-Type': 'text/markdown; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
  } catch (error) {
    console.error('[PreparePDF] Error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate PDF')
  }
}
