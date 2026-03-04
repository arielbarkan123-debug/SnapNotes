# Day 6: YouTube → Course Pipeline + AI Cheatsheet Builder

## Goal
**Part A**: Paste a YouTube URL → extract transcript → generate a full course with lessons, practice questions, diagrams, and SRS cards. Added as a new tab in the existing upload modal.
**Part B**: Generate condensed AI cheatsheets from any course. Beautiful read-only display with KaTeX formulas, definitions, key facts, collapsible examples. Exam mode strips solutions.

## Prerequisites
- Day 0-5 completed, `npm run build` passes
- `cheatsheets` table created (Day 0 migration)
- Course generation API exists at `/api/generate-course` with SSE streaming
- Upload modal exists at `components/upload/upload-modal/UploadModal.tsx`
- KaTeX installed (`katex`, `react-katex`)
- TipTap installed (for potential rich rendering)

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **Streaming API**: `ReadableStream` + heartbeat + newline-delimited JSON (`{ type, stage?, percent?, courseId?, error? }`)
- **Upload Modal**: Tab-based UI (files / text / YouTube). `InputMode` state controls which tab is active
- **Course Gen**: `POST /api/generate-course` accepts `{ imageUrls?, textContent?, title, intensityMode, enableDiagrams }`
- **Page Pattern**: Server component (`page.tsx`) handles auth → client component for interactivity
- **Sidebar**: `navItems` array in `components/ui/Sidebar.tsx` with emoji icons
- **Supabase**: RLS on all tables, filter by `user_id`

### Critical File Locations
- `components/upload/upload-modal/UploadModal.tsx` — Main upload modal (add YouTube tab)
- `app/api/generate-course/route.ts` — Course generation with SSE streaming
- `lib/ai/course-generator.ts` — Course generation logic (`generateCourseFromImage`, etc.)
- `app/(main)/courses/[id]/page.tsx` — Course detail page (add "Generate Cheatsheet" button)
- `components/ui/Sidebar.tsx` — Sidebar navigation
- `types/index.ts` — Course types

---

## Part A: YouTube → Course Pipeline

### Step 1: Create `lib/youtube/transcript.ts`

```typescript
/**
 * YouTube Transcript Extractor
 *
 * Extracts video transcripts using YouTube's timedtext API.
 * No API key needed for public captions.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface YouTubeTranscript {
  videoId: string
  title: string
  transcript: string
  language: string
  duration: number // seconds
  thumbnailUrl: string
}

// ─── Video ID Parsing ────────────────────────────────────────────────────────

/**
 * Extract video ID from various YouTube URL formats:
 * - https://www.youtube.com/watch?v=dQw4w9WgXcQ
 * - https://youtu.be/dQw4w9WgXcQ
 * - https://www.youtube.com/embed/dQw4w9WgXcQ
 * - https://www.youtube.com/v/dQw4w9WgXcQ
 */
export function parseVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/, // Just the ID
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match) return match[1]
  }

  return null
}

// ─── Transcript Fetching ─────────────────────────────────────────────────────

/**
 * Fetch transcript from YouTube's timedtext API.
 * Falls back to scraping the video page for caption data.
 */
export async function extractYouTubeTranscript(url: string): Promise<YouTubeTranscript> {
  const videoId = parseVideoId(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  const thumbnailUrl = `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`

  // Fetch video page to get caption tracks
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
  const pageResponse = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; NoteSnap/1.0)',
      'Accept-Language': 'en-US,en;q=0.9',
    },
  })

  if (!pageResponse.ok) {
    throw new Error('Failed to fetch YouTube page')
  }

  const pageHtml = await pageResponse.text()

  // Extract title
  const titleMatch = pageHtml.match(/<title>(.+?)<\/title>/)
  const title = titleMatch
    ? titleMatch[1].replace(' - YouTube', '').trim()
    : 'Untitled Video'

  // Extract caption track URLs from the page
  const captionRegex = /"captionTracks":\s*(\[[\s\S]*?\])/
  const captionMatch = pageHtml.match(captionRegex)

  if (!captionMatch) {
    throw new Error('No captions available for this video. The video may not have subtitles enabled.')
  }

  let captionTracks: Array<{
    baseUrl: string
    languageCode: string
    kind?: string
  }>

  try {
    captionTracks = JSON.parse(captionMatch[1])
  } catch {
    throw new Error('Failed to parse caption data')
  }

  if (!captionTracks.length) {
    throw new Error('No caption tracks found')
  }

  // Prefer manual captions over auto-generated, prefer English/Hebrew
  const preferredLangs = ['en', 'he', 'iw'] // iw = old Hebrew code
  let selectedTrack = captionTracks.find(
    t => preferredLangs.includes(t.languageCode) && t.kind !== 'asr'
  )
  if (!selectedTrack) {
    selectedTrack = captionTracks.find(t => preferredLangs.includes(t.languageCode))
  }
  if (!selectedTrack) {
    selectedTrack = captionTracks.find(t => t.kind !== 'asr') || captionTracks[0]
  }

  // Fetch caption XML
  const captionUrl = selectedTrack.baseUrl.replace(/&amp;/g, '&')
  const captionResponse = await fetch(captionUrl)
  if (!captionResponse.ok) {
    throw new Error('Failed to fetch captions')
  }

  const captionXml = await captionResponse.text()

  // Parse XML captions into plain text
  const textSegments = captionXml.match(/<text[^>]*>([\s\S]*?)<\/text>/g) || []
  const transcript = textSegments
    .map(seg => {
      const textMatch = seg.match(/<text[^>]*>([\s\S]*?)<\/text>/)
      return textMatch ? textMatch[1] : ''
    })
    .map(text =>
      text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/<[^>]+>/g, '') // Strip HTML tags
        .trim()
    )
    .filter(Boolean)
    .join(' ')

  if (!transcript.trim()) {
    throw new Error('Transcript is empty')
  }

  // Estimate duration from last caption's start time
  const lastSegment = textSegments[textSegments.length - 1]
  const startMatch = lastSegment?.match(/start="([\d.]+)"/)
  const durMatch = lastSegment?.match(/dur="([\d.]+)"/)
  const duration = startMatch
    ? parseFloat(startMatch[1]) + (durMatch ? parseFloat(durMatch[1]) : 0)
    : 0

  return {
    videoId,
    title,
    transcript,
    language: selectedTrack.languageCode,
    duration: Math.round(duration),
    thumbnailUrl,
  }
}
```

### Step 2: Create `lib/youtube/course-from-video.ts`

```typescript
/**
 * Course Generation from YouTube Video
 *
 * Uses the extracted transcript to generate a full course
 * with the same structure as image/text-based courses.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import type { YouTubeTranscript } from './transcript'

// This should match the existing GeneratedCourse type used in course generation
// Check types/index.ts for the exact shape

export interface VideoCourseMeta {
  videoId: string
  videoTitle: string
  thumbnailUrl: string
  duration: number
  transcriptLanguage: string
}

const COURSE_FROM_VIDEO_PROMPT = `You are an expert educator. Given a YouTube video transcript, create a structured course.

The course should be organized into 3-7 lessons based on the video content. Each lesson should have:
- A clear title (English + Hebrew)
- 3-5 content steps with explanations
- 2-3 practice questions per lesson

Return JSON (no markdown):
{
  "title": "Course title (English)",
  "titleHe": "Course title (Hebrew)",
  "description": "1-2 sentence description (English)",
  "descriptionHe": "Description (Hebrew)",
  "lessons": [
    {
      "title": "Lesson title",
      "titleHe": "Hebrew title",
      "steps": [
        {
          "type": "content",
          "content": "Explanation text from the video (English)",
          "contentHe": "Hebrew translation"
        },
        {
          "type": "diagram",
          "content": "Description of a diagram that would help explain this concept"
        }
      ],
      "questions": [
        {
          "question": "Practice question (English)",
          "questionHe": "Hebrew question",
          "answer": "Answer (English)",
          "answerHe": "Hebrew answer",
          "explanation": "Why this is the answer",
          "explanationHe": "Hebrew explanation"
        }
      ]
    }
  ]
}

Rules:
- Extract the educational content, skip intros/outros/self-promotion
- If the video covers a single topic deeply, make fewer but more detailed lessons
- If it surveys many topics, make more lessons
- Include both English AND Hebrew for all text
- Practice questions should test understanding, not memorization
- Diagram steps should describe what to visualize (the engine will generate images)`

export async function generateCourseFromVideo(
  transcript: YouTubeTranscript,
): Promise<unknown> {
  const client = new Anthropic()

  // Truncate transcript if too long (keep under ~100k chars for token budget)
  const maxChars = 100000
  const truncatedTranscript = transcript.transcript.length > maxChars
    ? transcript.transcript.slice(0, maxChars) + '\n[transcript truncated]'
    : transcript.transcript

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 8000,
    system: COURSE_FROM_VIDEO_PROMPT,
    messages: [{
      role: 'user',
      content: `Video: "${transcript.title}"\nLanguage: ${transcript.language}\nDuration: ${Math.round(transcript.duration / 60)} minutes\n\nTranscript:\n${truncatedTranscript}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to generate course from video')
  }

  return JSON.parse(jsonMatch[0])
}
```

### Step 3: Create `app/api/courses/from-youtube/route.ts`

```typescript
import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { extractYouTubeTranscript } from '@/lib/youtube/transcript'
import { generateCourseFromVideo } from '@/lib/youtube/course-from-video'
import { generateDiagramsForSteps } from '@/lib/diagram-engine/integration'

export const maxDuration = 180

interface StreamMessage {
  type: 'heartbeat' | 'progress' | 'success' | 'error'
  timestamp?: number
  stage?: string
  percent?: number
  courseId?: string
  error?: string
  retryable?: boolean
}

export async function POST(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder()
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null
  let streamClosed = false

  const sendMessage = (msg: StreamMessage) => {
    if (streamController && !streamClosed) {
      try {
        streamController.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))
      } catch {
        streamClosed = true
      }
    }
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) { streamController = controller },
    cancel() { streamClosed = true },
  })

  ;(async () => {
    // Heartbeat
    const heartbeat = setInterval(() => {
      if (!streamClosed) sendMessage({ type: 'heartbeat', timestamp: Date.now() })
    }, 5000)

    try {
      // Auth
      sendMessage({ type: 'progress', stage: 'Authenticating', percent: 5 })
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        sendMessage({ type: 'error', error: 'Unauthorized', retryable: false })
        clearInterval(heartbeat)
        streamController?.close()
        return
      }

      // Parse request
      const { youtubeUrl, enableDiagrams = true } = await request.json()
      if (!youtubeUrl) {
        sendMessage({ type: 'error', error: 'YouTube URL is required', retryable: false })
        clearInterval(heartbeat)
        streamController?.close()
        return
      }

      // Extract transcript
      sendMessage({ type: 'progress', stage: 'Extracting transcript', percent: 15 })
      const transcript = await extractYouTubeTranscript(youtubeUrl)

      // Generate course
      sendMessage({ type: 'progress', stage: 'Generating course', percent: 30 })
      const generatedCourse = await generateCourseFromVideo(transcript) as Record<string, unknown>

      // Generate diagrams (optional)
      if (enableDiagrams && generatedCourse.lessons) {
        sendMessage({ type: 'progress', stage: 'Generating diagrams', percent: 50 })
        try {
          await generateDiagramsForSteps(generatedCourse.lessons as Array<{ steps: Array<Record<string, unknown>> }>)
        } catch (err) {
          console.error('[YouTube] Diagram generation failed:', err)
          // Continue without diagrams
        }
      }

      // Save to database
      sendMessage({ type: 'progress', stage: 'Saving course', percent: 80 })
      const { data: course, error: saveError } = await supabase
        .from('courses')
        .insert({
          user_id: user.id,
          title: (generatedCourse.title as string) || transcript.title,
          generated_course: generatedCourse,
          source_type: 'youtube',
          cover_image_url: transcript.thumbnailUrl,
          metadata: {
            videoId: transcript.videoId,
            videoTitle: transcript.title,
            videoDuration: transcript.duration,
            transcriptLanguage: transcript.language,
          },
        })
        .select('id')
        .single()

      if (saveError) {
        throw new Error('Failed to save course')
      }

      sendMessage({
        type: 'success',
        courseId: course.id,
        percent: 100,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to generate course from video'
      sendMessage({ type: 'error', error: message, retryable: true })
    } finally {
      clearInterval(heartbeat)
      if (!streamClosed) streamController?.close()
    }
  })()

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
```

### Step 4: Add YouTube Tab to Upload Modal

In `components/upload/upload-modal/UploadModal.tsx`:

1. Add `'youtube'` to the `InputMode` type (or create a union)
2. Add a YouTube tab button alongside files/text
3. Add YouTube input UI:

```tsx
{/* YouTube tab content */}
{inputMode === 'youtube' && (
  <div className="space-y-3">
    <input
      type="url"
      value={youtubeUrl}
      onChange={(e) => setYoutubeUrl(e.target.value)}
      placeholder={t('youtube.placeholder')}
      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm"
    />
    {/* Video thumbnail preview */}
    {youtubeUrl && parseVideoId(youtubeUrl) && (
      <div className="relative rounded-xl overflow-hidden bg-gray-100 dark:bg-gray-900">
        <img
          src={`https://img.youtube.com/vi/${parseVideoId(youtubeUrl)}/mqdefault.jpg`}
          alt="Video thumbnail"
          className="w-full h-auto"
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
        />
      </div>
    )}
  </div>
)}
```

4. Update submit handler to call `/api/courses/from-youtube` with SSE streaming.

5. Import `parseVideoId` from `@/lib/youtube/transcript`

---

## Part B: AI Cheatsheet Builder

### Step 5: Create `lib/cheatsheet/generator.ts`

```typescript
/**
 * AI Cheatsheet Generator
 *
 * Generates condensed study cheatsheets from course content.
 * Outputs structured blocks for rendering.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

export type CheatsheetBlockType =
  | 'section_header'
  | 'formula'
  | 'definition'
  | 'key_fact'
  | 'example'
  | 'warning'

export interface CheatsheetBlock {
  type: CheatsheetBlockType
  content: string
  contentHe?: string
  latex?: string // For formula blocks
  importance?: 'critical' | 'important' | 'good_to_know'
  collapsible?: boolean // For example blocks
  solution?: string // For example blocks (hidden in exam mode)
  solutionHe?: string
}

export interface Cheatsheet {
  title: string
  titleHe: string
  blocks: CheatsheetBlock[]
  examMode: boolean
}

const CHEATSHEET_PROMPT = `You are creating a condensed study cheatsheet from course material. Extract the most important information and organize it into structured blocks.

Block types:
- section_header: Topic section divider
- formula: Mathematical formula (provide LaTeX in "latex" field)
- definition: Key term definition (term: definition format)
- key_fact: Important fact to remember (mark importance: critical/important/good_to_know)
- example: Worked example with solution (mark collapsible: true, put solution in "solution" field)
- warning: Common mistake or important caveat

Return JSON (no markdown):
{
  "title": "Cheatsheet title (English)",
  "titleHe": "Hebrew title",
  "blocks": [
    {
      "type": "section_header",
      "content": "Section name",
      "contentHe": "Hebrew name"
    },
    {
      "type": "formula",
      "content": "Formula name",
      "contentHe": "Hebrew name",
      "latex": "E = mc^2",
      "importance": "critical"
    },
    {
      "type": "definition",
      "content": "Term: Definition text",
      "contentHe": "Hebrew definition",
      "importance": "important"
    },
    {
      "type": "key_fact",
      "content": "Important fact",
      "contentHe": "Hebrew fact",
      "importance": "critical"
    },
    {
      "type": "example",
      "content": "Problem statement",
      "contentHe": "Hebrew problem",
      "collapsible": true,
      "solution": "Step by step solution",
      "solutionHe": "Hebrew solution"
    },
    {
      "type": "warning",
      "content": "Common mistake to avoid",
      "contentHe": "Hebrew warning"
    }
  ]
}

Rules:
- Be CONCISE — this is a cheatsheet, not a textbook
- Include the most important formulas with LaTeX
- Mark 2-3 things as "critical", rest as "important" or "good_to_know"
- Include 1-2 worked examples with solutions
- Include 1-2 common mistakes/warnings
- Maximum 20-25 blocks total
- Always include both English AND Hebrew`

export async function generateCheatsheet(
  courseContent: string,
  courseTitle: string,
): Promise<Cheatsheet> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 4000,
    system: CHEATSHEET_PROMPT,
    messages: [{
      role: 'user',
      content: `Create a cheatsheet for this course:\n\nTitle: ${courseTitle}\n\nContent:\n${courseContent.slice(0, 50000)}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Failed to generate cheatsheet')

  const result = JSON.parse(jsonMatch[0])
  return {
    ...result,
    examMode: false,
  }
}
```

### Step 6: Create `app/api/cheatsheets/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { generateCheatsheet } from '@/lib/cheatsheet/generator'

export const maxDuration = 60

// GET: List user's cheatsheets
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data, error } = await supabase
      .from('cheatsheets')
      .select('id, title, title_he, course_id, exam_mode, created_at, updated_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ success: true, cheatsheets: data || [] })
  } catch (error) {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to fetch cheatsheets')
  }
}

// POST: Generate new cheatsheet from course
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { courseId } = await request.json()
    if (!courseId) return createErrorResponse(ErrorCodes.INVALID_INPUT, 'courseId is required')

    // Fetch course content
    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('title, generated_course')
      .eq('id', courseId)
      .eq('user_id', user.id)
      .single()

    if (courseError || !course) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Course not found')
    }

    // Stringify course content for the AI
    const courseContent = JSON.stringify(course.generated_course, null, 2)

    // Generate cheatsheet
    const cheatsheet = await generateCheatsheet(courseContent, course.title)

    // Save to database
    const { data: saved, error: saveError } = await supabase
      .from('cheatsheets')
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: cheatsheet.title,
        title_he: cheatsheet.titleHe,
        blocks: cheatsheet.blocks,
        exam_mode: false,
      })
      .select('id')
      .single()

    if (saveError) throw saveError

    return NextResponse.json({
      success: true,
      cheatsheetId: saved.id,
      cheatsheet,
    })
  } catch (error) {
    console.error('[Cheatsheet] Generation error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 'Failed to generate cheatsheet')
  }
}
```

### Step 7: Create `app/api/cheatsheets/[id]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

// GET: Fetch single cheatsheet
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    const { data, error } = await supabase
      .from('cheatsheets')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return createErrorResponse(ErrorCodes.NOT_FOUND, 'Cheatsheet not found')
    }

    return NextResponse.json({ success: true, cheatsheet: data })
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR)
  }
}

// DELETE: Remove cheatsheet
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return createErrorResponse(ErrorCodes.UNAUTHORIZED)

    await supabase
      .from('cheatsheets')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    return NextResponse.json({ success: true })
  } catch {
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR)
  }
}
```

### Step 8: Create `components/cheatsheet/CheatsheetBlock.tsx`

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, AlertTriangle } from 'lucide-react'
import 'katex/dist/katex.min.css'
import { BlockMath, InlineMath } from 'react-katex'

interface Block {
  type: string
  content: string
  contentHe?: string
  latex?: string
  importance?: string
  collapsible?: boolean
  solution?: string
  solutionHe?: string
}

interface CheatsheetBlockProps {
  block: Block
  language?: 'en' | 'he'
  examMode?: boolean
}

const importanceBadge = {
  critical: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800',
  important: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800',
  good_to_know: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800',
}

export default function CheatsheetBlock({ block, language = 'en', examMode = false }: CheatsheetBlockProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const isHe = language === 'he'
  const content = isHe ? (block.contentHe || block.content) : block.content

  switch (block.type) {
    case 'section_header':
      return (
        <div className="mt-6 mb-3 first:mt-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 border-b-2 border-violet-600 dark:border-violet-400 pb-1">
            {content}
          </h3>
        </div>
      )

    case 'formula':
      return (
        <div className="bg-gray-50 dark:bg-gray-900/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-start justify-between mb-2">
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{content}</p>
            {block.importance && (
              <span className={`text-[10px] px-2 py-0.5 rounded-full border ${importanceBadge[block.importance as keyof typeof importanceBadge] || ''}`}>
                {block.importance}
              </span>
            )}
          </div>
          {block.latex && (
            <div className="text-xl text-center py-2">
              <BlockMath math={block.latex} />
            </div>
          )}
        </div>
      )

    case 'definition':
      return (
        <div className="border-l-4 border-violet-500 pl-4 py-2">
          <p className="text-sm text-gray-800 dark:text-gray-200">{content}</p>
        </div>
      )

    case 'key_fact':
      return (
        <div className={`rounded-xl p-3 border ${
          block.importance === 'critical'
            ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-800'
            : 'bg-violet-50 dark:bg-violet-900/10 border-violet-200 dark:border-violet-800'
        }`}>
          <div className="flex items-start gap-2">
            <span className="text-sm mt-0.5">{block.importance === 'critical' ? '⚡' : '💡'}</span>
            <p className="text-sm text-gray-800 dark:text-gray-200">{content}</p>
          </div>
        </div>
      )

    case 'example':
      const solution = isHe ? (block.solutionHe || block.solution) : block.solution
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50"
          >
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
              📝 {content}
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </button>
          <AnimatePresence>
            {isExpanded && solution && !examMode && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="px-4 pb-3 text-sm text-gray-600 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-3 whitespace-pre-wrap">
                  {solution}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          {examMode && isExpanded && (
            <div className="px-4 pb-3 text-xs text-gray-400 italic border-t border-gray-100 dark:border-gray-700 pt-3">
              Solution hidden in exam mode
            </div>
          )}
        </div>
      )

    case 'warning':
      return (
        <div className="bg-amber-50 dark:bg-amber-900/10 rounded-xl p-3 border border-amber-200 dark:border-amber-800">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-amber-800 dark:text-amber-200">{content}</p>
          </div>
        </div>
      )

    default:
      return (
        <div className="p-3 text-sm text-gray-600 dark:text-gray-400">{content}</div>
      )
  }
}
```

### Step 9: Create Cheatsheet Pages

**`app/(main)/cheatsheets/page.tsx`** — List page:
- Server component, auth check
- Fetch all user's cheatsheets from Supabase
- Render grid of cards with title, date, course name
- "Generate from course" button

**`app/(main)/cheatsheets/[id]/page.tsx`** — Server component:
- Auth check, fetch cheatsheet by ID
- Pass to `CheatsheetContent`

**`app/(main)/cheatsheets/[id]/CheatsheetContent.tsx`** — Client component:
- Render all blocks using `CheatsheetBlock`
- Exam mode toggle
- Print button (`window.print()`)
- Delete button with confirmation

### Step 10: Add to Sidebar & Course Detail

**Sidebar**: Add `{ href: '/cheatsheets', icon: '📄', label: t('nav.cheatsheets'), active: isActive('/cheatsheets') }`

**Course detail page**: Add "Generate Cheatsheet" button that calls `POST /api/cheatsheets` with `courseId`

### Step 11: Create i18n Files

Create `messages/en/youtube.json`, `messages/he/youtube.json`, `messages/en/cheatsheet.json`, `messages/he/cheatsheet.json`.

Register all in `messages/{en,he}/index.ts`.

---

## Testing Checklist

```bash
npx tsc --noEmit   # Zero errors
npm test            # All pass
npm run build       # Clean
```

### Browser Testing
1. **YouTube**: Paste Khan Academy URL in upload modal → progress → course generates
2. **YouTube**: Invalid URL → error message
3. **YouTube**: Video without captions → "No captions" error
4. **YouTube**: Course appears in course list with video thumbnail
5. **Cheatsheet**: Navigate to `/cheatsheets` → list page
6. **Cheatsheet**: Generate from course → blocks render (formulas, definitions, facts)
7. **Cheatsheet**: Exam mode toggle → hides solutions
8. **Cheatsheet**: Print button → print dialog opens
9. **Hebrew, dark mode, mobile** — all work

---

## Files Created
- `lib/youtube/transcript.ts`
- `lib/youtube/course-from-video.ts`
- `app/api/courses/from-youtube/route.ts`
- `lib/cheatsheet/generator.ts`
- `app/api/cheatsheets/route.ts`
- `app/api/cheatsheets/[id]/route.ts`
- `components/cheatsheet/CheatsheetBlock.tsx`
- `app/(main)/cheatsheets/page.tsx`
- `app/(main)/cheatsheets/[id]/page.tsx`
- `app/(main)/cheatsheets/[id]/CheatsheetContent.tsx`
- i18n files (4 new)

## Files Modified
- `components/upload/upload-modal/UploadModal.tsx` (YouTube tab)
- `components/ui/Sidebar.tsx` (add Cheatsheets nav)
- Course detail page (add Generate Cheatsheet button)
- `messages/{en,he}/index.ts` (register namespaces)
- `messages/{en,he}/common.json` (nav labels)

## What's Next
Day 7: Integration Testing, Polish, Deploy (`day7-integration-deploy.md`)
