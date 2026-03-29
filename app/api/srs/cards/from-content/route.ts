/**
 * POST /api/srs/cards/from-content
 *
 * Generates SRS review cards directly from raw content (text / images / document).
 * 1. Creates a lightweight shell course to anchor the cards.
 * 2. Runs generateCardsFromCourse (same pipeline as normal course generation).
 * 3. Inserts cards with user_id into review_cards.
 *
 * Non-streaming — returns a JSON response.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShellCourse } from '@/lib/content/create-shell-course'
import { generateCardsFromCourse } from '@/lib/srs'
import { getContentLanguage } from '@/lib/ai/language'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:srs-cards-from-content')

export const maxDuration = 120

export async function POST(request: NextRequest) {
  try {
    // ── 1. Auth ───────────────────────────────────────────────────────
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── 2. Parse body ─────────────────────────────────────────────────
    let body: {
      textContent?: string
      imageUrls?: string[]
      documentUrl?: string
      fileName?: string
      fileType?: string
    }
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
    }

    const { textContent, imageUrls, documentUrl } = body

    // ── 3. Validate ───────────────────────────────────────────────────
    if (!textContent && !imageUrls?.length && !documentUrl) {
      return NextResponse.json(
        { error: 'Provide textContent, imageUrls, or documentUrl' },
        { status: 400 },
      )
    }

    const content = textContent || ''
    if (!content.trim()) {
      return NextResponse.json(
        { error: 'No text content provided. Extract text from your source first.' },
        { status: 400 },
      )
    }

    // ── 4. Resolve language ───────────────────────────────────────────
    const language = await getContentLanguage(supabase, user.id)

    // ── 5. Auto-detect title ──────────────────────────────────────────
    const firstLine = content.split('\n').find(l => l.trim())?.trim() || 'Untitled'
    const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine

    // ── 6. Determine source type ──────────────────────────────────────
    const sourceType = body.fileType === 'pptx' ? 'pptx' as const
      : body.fileType === 'docx' ? 'docx' as const
      : imageUrls?.length ? 'image' as const
      : 'text' as const

    // ── 7. Create shell course ────────────────────────────────────────
    let courseId: string
    let generatedCourse
    try {
      const result = await createShellCourse({
        supabase,
        userId: user.id,
        title,
        content,
        sourceType,
        imageUrls,
        documentUrl,
        language,
      })
      courseId = result.courseId
      generatedCourse = result.generatedCourse
    } catch (err) {
      log.error({ err }, 'Shell course creation failed')
      return NextResponse.json({ error: 'Failed to create course record' }, { status: 500 })
    }

    // ── 8. Generate cards ─────────────────────────────────────────────
    let cardsGenerated = 0
    try {
      const cards = await generateCardsFromCourse(generatedCourse, courseId, { language })

      if (cards.length > 0) {
        const cardsWithUser = cards.map(card => ({
          ...card,
          user_id: user.id,
        }))

        const { data: insertedCards, error: cardsError } = await supabase
          .from('review_cards')
          .insert(cardsWithUser)
          .select('id')

        if (cardsError) {
          log.error({ err: cardsError }, 'Card insert error')
          // Don't fail — the course was already created successfully
        } else {
          cardsGenerated = insertedCards?.length || 0
        }
      }
    } catch (cardError) {
      log.error({ err: cardError }, 'Card generation error')
      // Don't fail — the course was already created successfully
    }

    // ── 9. Return ─────────────────────────────────────────────────────
    log.info({ courseId, cardsGenerated }, 'Cards from content created')

    return NextResponse.json({
      success: true,
      courseId,
      cardsCreated: cardsGenerated,
    })
  } catch (error) {
    log.error({ err: error }, 'SRS cards from content error')
    return NextResponse.json({ error: 'An unexpected error occurred' }, { status: 500 })
  }
}
