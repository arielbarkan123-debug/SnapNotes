/**
 * YouTube → Course Generator
 *
 * Takes a video transcript and generates a full course structure
 * with lessons, practice questions, and summaries.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { buildLanguageInstruction, type ContentLanguage } from '@/lib/ai/language'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GeneratedCourseFromVideo {
  title: string
  titleHe: string
  description: string
  descriptionHe: string
  subject: string
  lessons: Array<{
    title: string
    titleHe: string
    content: string
    contentHe: string
    summary: string
    summaryHe: string
    practiceQuestions: Array<{
      question: string
      questionHe: string
      answer: string
      answerHe: string
      type: 'multiple_choice' | 'open' | 'true_false'
    }>
  }>
  thumbnailEmoji: string
}

// ─── Course Generation ───────────────────────────────────────────────────────

const COURSE_GENERATION_PROMPT = `You are an expert curriculum designer. Given a YouTube video transcript, create a structured course with lessons and practice questions.

Rules:
1. Segment the transcript into 3-8 logical lessons based on topic transitions
2. Each lesson should have a clear title, full content explanation, summary, and 2-3 practice questions
3. Provide everything in both English and Hebrew
4. Practice questions should test understanding of the lesson content
5. Include a relevant emoji for the course thumbnail
6. Identify the subject area (Math, Science, History, etc.)

Return JSON (no markdown):
{
  "title": "Course title in English",
  "titleHe": "Course title in Hebrew",
  "description": "1-2 sentence description",
  "descriptionHe": "Hebrew description",
  "subject": "Subject area",
  "thumbnailEmoji": "📐",
  "lessons": [
    {
      "title": "Lesson title",
      "titleHe": "Hebrew lesson title",
      "content": "Full lesson content explaining the concepts (300-500 words)",
      "contentHe": "Hebrew content",
      "summary": "2-3 sentence summary",
      "summaryHe": "Hebrew summary",
      "practiceQuestions": [
        {
          "question": "Practice question",
          "questionHe": "Hebrew question",
          "answer": "Answer explanation",
          "answerHe": "Hebrew answer",
          "type": "open"
        }
      ]
    }
  ]
}

Important:
- Content should be educational, not a transcript copy
- Expand on concepts mentioned briefly in the video
- Questions should require understanding, not memorization
- Hebrew should be natural, not machine-translated`

/**
 * Generate a course from a video transcript.
 */
export async function generateCourseFromVideo(
  transcript: string,
  videoTitle: string,
  videoDuration: number,
  language: ContentLanguage = 'en',
): Promise<GeneratedCourseFromVideo> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey })

  // Truncate very long transcripts (keep first 8000 chars for API limits)
  const truncatedTranscript = transcript.length > 8000
    ? transcript.slice(0, 8000) + '\n\n[Transcript truncated...]'
    : transcript

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 8000,
    system: buildLanguageInstruction(language) + COURSE_GENERATION_PROMPT,
    messages: [{
      role: 'user',
      content: `Video Title: "${videoTitle}"
Duration: ${Math.round(videoDuration / 60)} minutes

Transcript:
${truncatedTranscript}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse course generation result')
  }

  const result = JSON.parse(jsonMatch[0])

  return {
    title: result.title || videoTitle,
    titleHe: result.titleHe || result.title || videoTitle,
    description: result.description || '',
    descriptionHe: result.descriptionHe || '',
    subject: result.subject || 'General',
    lessons: result.lessons || [],
    thumbnailEmoji: result.thumbnailEmoji || '🎓',
  }
}
