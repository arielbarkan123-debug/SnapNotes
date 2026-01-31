import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import Anthropic from '@anthropic-ai/sdk'

export const maxDuration = 30

interface SearchResult {
  type: 'course' | 'review_card' | 'homework' | 'practice' | 'exam'
  courseId?: string
  cardId?: string
  lessonIndex?: number
  stepIndex?: number
  title: string
  snippet: string
  front?: string
  back?: string
  matchScore: number
}

export async function GET(request: Request): Promise<NextResponse> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q')?.trim()
    const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50)

    if (!query || query.length < 2) {
      return NextResponse.json({ results: [], total: 0, query: query || '' })
    }

    const results: SearchResult[] = []

    // =========================================================================
    // Tier 1: PostgreSQL text search across tables
    // =========================================================================

    // Search courses — title + lesson titles + step content from JSONB
    const { data: courses } = await supabase
      .from('courses')
      .select('id, title, generated_course')
      .eq('user_id', user.id)
      .or(`title.ilike.%${query}%`)
      .limit(limit)

    // Also search courses by generated_course content (JSONB)
    const { data: coursesJsonb } = await supabase
      .from('courses')
      .select('id, title, generated_course')
      .eq('user_id', user.id)
      .filter('generated_course', 'not.is', null)
      .limit(100) // Fetch more to filter in-memory

    // Combine and deduplicate courses
    const courseMap = new Map<string, typeof courses extends (infer T)[] | null ? T : never>()
    courses?.forEach(c => courseMap.set(c.id, c))

    // Search within JSONB content for matching lessons/steps
    const lowerQuery = query.toLowerCase()
    coursesJsonb?.forEach(c => {
      if (courseMap.has(c.id)) return // Already matched by title
      const gc = c.generated_course as {
        title?: string
        lessons?: Array<{
          title?: string
          steps?: Array<{ content?: string; type?: string }>
        }>
      } | null
      if (!gc?.lessons) return

      // Check generated course title
      if (gc.title?.toLowerCase().includes(lowerQuery)) {
        courseMap.set(c.id, c)
        return
      }

      // Check lesson titles and step content
      for (const lesson of gc.lessons) {
        if (lesson.title?.toLowerCase().includes(lowerQuery)) {
          courseMap.set(c.id, c)
          return
        }
        for (const step of lesson.steps || []) {
          if (step.content?.toLowerCase().includes(lowerQuery)) {
            courseMap.set(c.id, c)
            return
          }
        }
      }
    })

    // Convert course matches to search results with best snippet
    for (const [, course] of courseMap) {
      const gc = course.generated_course as {
        title?: string
        lessons?: Array<{
          title?: string
          steps?: Array<{ content?: string; type?: string }>
        }>
      } | null

      let bestSnippet = course.title
      let bestLessonIndex: number | undefined
      let bestStepIndex: number | undefined
      let score = 0.5

      // Title match is high score
      if (course.title.toLowerCase().includes(lowerQuery)) {
        score = 0.9
        bestSnippet = course.title
      }

      // Search through lessons for better snippets
      if (gc?.lessons) {
        for (let li = 0; li < gc.lessons.length; li++) {
          const lesson = gc.lessons[li]
          if (lesson.title?.toLowerCase().includes(lowerQuery)) {
            if (score < 0.85) {
              score = 0.85
              bestSnippet = lesson.title
              bestLessonIndex = li
            }
          }
          for (let si = 0; si < (lesson.steps?.length || 0); si++) {
            const step = lesson.steps?.[si]
            if (step?.content?.toLowerCase().includes(lowerQuery)) {
              if (score < 0.7) {
                score = 0.7
                // Extract snippet around match
                const idx = step.content.toLowerCase().indexOf(lowerQuery)
                const start = Math.max(0, idx - 40)
                const end = Math.min(step.content.length, idx + query.length + 40)
                bestSnippet = (start > 0 ? '...' : '') + step.content.slice(start, end) + (end < step.content.length ? '...' : '')
                bestLessonIndex = li
                bestStepIndex = si
              }
            }
          }
        }
      }

      results.push({
        type: 'course',
        courseId: course.id,
        lessonIndex: bestLessonIndex,
        stepIndex: bestStepIndex,
        title: gc?.title || course.title,
        snippet: bestSnippet,
        matchScore: score,
      })
    }

    // Search review_cards — front + back columns
    const { data: cards } = await supabase
      .from('review_cards')
      .select('id, course_id, lesson_index, step_index, card_type, front, back')
      .eq('user_id', user.id)
      .or(`front.ilike.%${query}%,back.ilike.%${query}%`)
      .limit(limit)

    cards?.forEach(card => {
      const frontMatch = card.front.toLowerCase().includes(lowerQuery)
      const snippet = frontMatch
        ? card.front.slice(0, 120)
        : card.back.slice(0, 120)

      results.push({
        type: 'review_card',
        cardId: card.id,
        courseId: card.course_id,
        lessonIndex: card.lesson_index,
        stepIndex: card.step_index,
        title: card.front.slice(0, 80),
        snippet,
        front: card.front,
        back: card.back,
        matchScore: frontMatch ? 0.8 : 0.6,
      })
    })

    // Sort by match score descending
    results.sort((a, b) => b.matchScore - a.matchScore)

    // Limit results
    const limitedResults = results.slice(0, limit)

    // =========================================================================
    // Tier 2: AI semantic search if results are sparse
    // =========================================================================
    if (limitedResults.length < 3 && process.env.ANTHROPIC_API_KEY) {
      try {
        const aiResults = await semanticSearch(supabase, user.id, query, limit)
        // Add AI results that are not already in the results
        const existingIds = new Set(limitedResults.map(r => r.courseId || r.cardId))
        for (const aiResult of aiResults) {
          if (!existingIds.has(aiResult.courseId || aiResult.cardId)) {
            limitedResults.push(aiResult)
          }
        }
      } catch {
        // AI search failed - return what we have
      }
    }

    return NextResponse.json({
      results: limitedResults,
      total: limitedResults.length,
      query,
    })
  } catch {
    return NextResponse.json(
      { results: [], total: 0, query: '', error: 'Search failed' },
      { status: 500 }
    )
  }
}

// =============================================================================
// Tier 2: AI Semantic Search
// =============================================================================

async function semanticSearch(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  userId: string,
  query: string,
  limit: number
): Promise<SearchResult[]> {
  // Fetch user's course titles and lesson titles for context
  const { data: courses } = await supabase
    .from('courses')
    .select('id, title, generated_course')
    .eq('user_id', userId)
    .limit(50)

  if (!courses || courses.length === 0) return []

  // Build a compact index of user content
  const contentIndex = courses.map((c: { id: string; title: string; generated_course: { title?: string; lessons?: Array<{ title?: string }> } | null }) => {
    const gc = c.generated_course as { title?: string; lessons?: Array<{ title?: string }> } | null
    const lessonTitles = gc?.lessons?.map((l, i) => `L${i}: ${l.title}`).join(', ') || ''
    return `[${c.id}] ${gc?.title || c.title} — ${lessonTitles}`
  }).join('\n')

  const anthropic = new Anthropic()
  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20250929',
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: `Given the user's search query "${query}", find the most relevant items from this content index. Return ONLY a JSON array of objects with fields: courseId, lessonIndex (optional), title, snippet, matchScore (0-1).

Content index:
${contentIndex}

Return up to ${limit} matches as a JSON array. If nothing matches, return [].`,
    }],
  })

  try {
    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    // Extract JSON array from response
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []

    const parsed = JSON.parse(jsonMatch[0]) as Array<{
      courseId?: string
      lessonIndex?: number
      title?: string
      snippet?: string
      matchScore?: number
    }>

    return parsed
      .filter(item => item.courseId && item.title)
      .map(item => ({
        type: 'course' as const,
        courseId: item.courseId!,
        lessonIndex: item.lessonIndex,
        title: item.title!,
        snippet: item.snippet || item.title!,
        matchScore: Math.min(item.matchScore || 0.5, 0.95),
      }))
  } catch {
    return []
  }
}
