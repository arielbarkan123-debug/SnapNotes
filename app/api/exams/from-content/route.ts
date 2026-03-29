/**
 * POST /api/exams/from-content
 *
 * Generates an exam directly from raw content (text / images / document).
 * 1. Creates a lightweight shell course to anchor the exam.
 * 2. Runs the same question-generation + validation pipeline as the
 *    standard POST /api/exams route.
 * 3. Streams progress back so the UI can show a spinner / progress bar.
 */

import { type NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createShellCourse } from '@/lib/content/create-shell-course'
import { getContentLanguage, buildLanguageInstruction, type ContentLanguage } from '@/lib/ai/language'
import { buildExamContext, formatContextForPrompt } from '@/lib/curriculum'
import type { StudySystem, ExamFormat } from '@/lib/curriculum'
import { buildExamStyleGuide, pastExamsHaveImages, getAggregatedImageAnalysis } from '@/lib/past-exams'
import { shouldIncludeImages, detectVisualContentMentions } from '@/lib/images/smart-search'
import type { PastExamTemplate, ImageAnalysis } from '@/types/past-exam'
import { checkRateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limit'
import { getStudentContext, generateDirectives } from '@/lib/student-context'
import { AI_MODEL } from '@/lib/ai/claude'
import { createLogger } from '@/lib/logger'
import Anthropic from '@anthropic-ai/sdk'

const log = createLogger('api:exams-from-content')

// ─── AI question shape (mirrors exams/route.ts) ────────────────────────────
interface GeneratedQuestion {
  question_type?: string
  question_text?: string
  correct_answer?: string
  lesson_title?: string | null
  lesson_index?: number | null
  options?: string[]
  explanation?: string | null
  passage?: string | null
  matching_pairs?: Array<{ left: string; right: string }> | null
  ordering_items?: string[] | null
  sub_questions?: Array<{ id: string; question: string; correct_answer?: string; points?: number }> | null
  acceptable_answers?: string[] | null
  image_label_data?: {
    image_url?: string
    image_source?: string
    image_credit?: string
    image_credit_url?: string
    labels?: Array<{ id: string; x: number; y: number; correct_answer?: string; correct_text?: string; box_width?: number }>
    image_alt?: string
    interaction_mode?: string
  } | null
}

export const maxDuration = 240

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()

  // Safari / iOS detection for aggressive heartbeat
  const userAgent = request.headers.get('user-agent') || ''
  const isSafari =
    userAgent.includes('Safari') && !userAgent.includes('Chrome') && !userAgent.includes('Chromium')
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent)
  const heartbeatFrequency = isSafari || isIOS ? 3000 : 10000

  let streamClosed = false
  let heartbeatInterval: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream({
    async start(controller) {
      // ── helpers ──────────────────────────────────────────────────────
      function send(data: Record<string, unknown>) {
        if (streamClosed) return
        try {
          controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
        } catch {
          streamClosed = true
        }
      }

      function startHeartbeat() {
        heartbeatInterval = setInterval(() => {
          if (!streamClosed) {
            send({ type: 'heartbeat', timestamp: Date.now() })
          }
        }, heartbeatFrequency)
      }

      function stopHeartbeat() {
        if (heartbeatInterval) {
          clearInterval(heartbeatInterval)
          heartbeatInterval = null
        }
      }

      try {
        // ── 1. Auth ───────────────────────────────────────────────────
        const supabase = await createClient()
        const { data: { user }, error: authError } = await supabase.auth.getUser()

        if (authError || !user) {
          send({ type: 'error', error: 'Please log in' })
          controller.close()
          return
        }

        // ── 2. Parse body ─────────────────────────────────────────────
        let body: {
          textContent?: string
          imageUrls?: string[]
          documentUrl?: string
          fileName?: string
          fileType?: string
          questionCount: number
          timeLimitMinutes: number
        }
        try {
          body = await request.json()
        } catch {
          send({ type: 'error', error: 'Invalid request body' })
          controller.close()
          return
        }

        const { textContent, imageUrls, documentUrl, questionCount, timeLimitMinutes } = body

        // ── 3. Validate ───────────────────────────────────────────────
        if (!textContent && !imageUrls?.length && !documentUrl) {
          send({ type: 'error', error: 'Provide textContent, imageUrls, or documentUrl' })
          controller.close()
          return
        }

        if (!questionCount || questionCount < 5 || questionCount > 50) {
          send({ type: 'error', error: 'questionCount must be 5-50' })
          controller.close()
          return
        }

        if (!timeLimitMinutes || timeLimitMinutes < 5 || timeLimitMinutes > 180) {
          send({ type: 'error', error: 'timeLimitMinutes must be 5-180' })
          controller.close()
          return
        }

        // ── 4. Rate limit ─────────────────────────────────────────────
        const rateLimitId = getIdentifier(user.id, request)
        const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.generateExam)

        if (!rateLimit.allowed) {
          send({ type: 'error', error: 'Too many requests. Please wait before generating another exam.' })
          controller.close()
          return
        }

        // Start streaming heartbeat now that we've passed validation
        startHeartbeat()
        send({ type: 'progress', stage: 'Preparing content...' })

        // ── 5. Resolve content text ───────────────────────────────────
        // The client is expected to have already extracted text from
        // images / documents before calling this route.
        const content = textContent || ''
        if (!content.trim()) {
          send({ type: 'error', error: 'No text content provided. Extract text from your source first.' })
          stopHeartbeat()
          controller.close()
          return
        }

        // ── 6. Auto-detect title ──────────────────────────────────────
        const firstLine = content.split('\n').find(l => l.trim())?.trim() || 'Untitled'
        const title = firstLine.length > 80 ? firstLine.slice(0, 77) + '...' : firstLine

        // ── 7. Resolve language ───────────────────────────────────────
        const language: ContentLanguage = await getContentLanguage(supabase, user.id)

        // ── 8. Create shell course ────────────────────────────────────
        send({ type: 'progress', stage: 'Creating course record...' })

        const sourceType = body.fileType === 'pptx' ? 'pptx' as const
          : body.fileType === 'docx' ? 'docx' as const
          : imageUrls?.length ? 'image' as const
          : 'text' as const

        let courseId: string
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
        } catch (err) {
          log.error({ err }, 'Shell course creation failed')
          send({ type: 'error', error: 'Failed to create course record' })
          stopHeartbeat()
          controller.close()
          return
        }

        send({ type: 'progress', stage: 'Course created, generating questions...' })

        // ══════════════════════════════════════════════════════════════
        // From here we replicate the exam generation pipeline from
        // POST /api/exams (lines 133-790)
        // ══════════════════════════════════════════════════════════════

        // ── 9. Fetch user profile & curriculum context ────────────────
        const { data: userProfile } = await supabase
          .from('user_learning_profile')
          .select('study_system, grade, subjects, subject_levels, exam_format, language')
          .eq('user_id', user.id)
          .maybeSingle()

        const langInstruction = buildLanguageInstruction(language)
        const studySystem = (userProfile?.study_system || 'general') as StudySystem
        const subjects = (userProfile?.subjects || []) as string[]
        const subjectLevels = (userProfile?.subject_levels || {}) as Record<string, string>
        const examFormat = (userProfile?.exam_format || 'match_real') as ExamFormat

        // Past-exam templates (style guide)
        let pastExamQuery = supabase
          .from('past_exam_templates')
          .select('extracted_analysis, title')
          .eq('user_id', user.id)
          .eq('analysis_status', 'completed')

        if (subjects.length === 1) {
          pastExamQuery = pastExamQuery.eq('subject_id', subjects[0])
        }

        const { data: pastExamTemplates } = await pastExamQuery

        const examStyleGuide =
          pastExamTemplates && pastExamTemplates.length > 0
            ? buildExamStyleGuide(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])
            : ''

        const pastExamsHaveImageContent =
          pastExamTemplates && pastExamTemplates.length > 0
            ? pastExamsHaveImages(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis'>[])
            : false

        const aggregatedImageAnalysis: ImageAnalysis | undefined =
          pastExamTemplates && pastExamTemplates.length > 0
            ? getAggregatedImageAnalysis(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis'>[])
            : undefined

        const visualMentions = detectVisualContentMentions(title + ' ' + subjects.join(' '))

        const imageSearchContext = {
          title,
          subject: subjects[0] || 'general',
          topics: [] as string[],
          pastExamHasImages: pastExamsHaveImageContent,
          pastExamImageAnalysis: aggregatedImageAnalysis,
          userMentionedVisuals: visualMentions,
        }
        const imageDecision = shouldIncludeImages(imageSearchContext)

        // ── 10. Student intelligence ──────────────────────────────────
        let examIntelligenceSection = ''
        try {
          const studentCtx = await getStudentContext(supabase, user.id)
          if (studentCtx) {
            const directives = generateDirectives(studentCtx)
            const ed = directives.exams
            const courseMap = new Map(studentCtx.activeCourses.map(c => [c.courseId, c.title]))
            const weakTopics = Object.entries(ed.weakTopicWeights)
              .filter(([, weight]) => weight > 1.0)
              .map(([cId]) => courseMap.get(cId) || null)
              .filter((t): t is string => t !== null)

            examIntelligenceSection = `
=== STUDENT INTELLIGENCE (Adaptive) ===
Target difficulty: ${ed.targetDifficulty}/5
Estimated current score: ${ed.estimatedScore}%
Focus question types: ${ed.focusQuestionTypes.join(', ')}
${weakTopics.length > 0 ? `Weak areas needing more coverage: ${weakTopics.join(', ')}` : ''}
Adapt question difficulty to match the target level. Include more questions from weak areas.
`
          }
        } catch {
          // Continue without exam intelligence
        }

        // ── 11. Build course content for prompt ───────────────────────
        const MAX_CONTENT_CHARS = 6000
        const courseContent = content.length <= MAX_CONTENT_CHARS
          ? content
          : content.slice(0, MAX_CONTENT_CHARS) + '\n[...truncated]\n'

        const curriculumContext = await buildExamContext(
          studySystem,
          subjects,
          subjectLevels,
          examFormat,
          courseContent,
          userProfile?.grade || undefined,
        )
        const curriculumSection = formatContextForPrompt(curriculumContext)

        // ── 12. Question type distribution ────────────────────────────
        const includeImageQuestions = imageDecision.shouldInclude && questionCount >= 10
        const imageLabelCount = includeImageQuestions ? Math.max(1, Math.round(questionCount * 0.1)) : 0
        const adjustmentFactor = includeImageQuestions ? 0.9 : 1.0
        const mcCount = Math.round(questionCount * 0.35 * adjustmentFactor)
        const tfCount = Math.round(questionCount * 0.15 * adjustmentFactor)
        const fbCount = Math.round(questionCount * 0.15 * adjustmentFactor)
        const saCount = Math.round(questionCount * 0.10 * adjustmentFactor)
        const matchCount = Math.round(questionCount * 0.10 * adjustmentFactor)
        const orderCount = Math.round(questionCount * 0.10 * adjustmentFactor)
        const passageCount = Math.max(1, Math.round(questionCount * 0.05))

        const lessonTitles = [title.toLowerCase()]

        const examFormatInstruction =
          examFormat === 'match_real' && curriculumContext.tier2
            ? `\n=== EXAM FORMAT (Match Real Format) ===
Use the exam structure and question styles from the curriculum context below.
Apply the command terms and assessment objectives specified in the curriculum.
Generate questions that would appear in actual exams for this curriculum.`
            : `\n=== EXAM FORMAT (Flexible) ===
Use question styles inspired by the curriculum but with flexible structure.
Focus on testing understanding rather than matching exact exam format.`

        // ── 13. Build prompt ──────────────────────────────────────────
        send({ type: 'progress', stage: 'Generating questions with AI...' })

        const prompt = `Generate exactly ${questionCount} exam questions based on this course content.
COURSE: ${title}
${curriculumSection ? `\n${curriculumSection}` : ''}
${examFormatInstruction}
${examStyleGuide ? `\n${examStyleGuide}` : ''}
${examIntelligenceSection}CONTENT:
${courseContent}

AVAILABLE LESSONS:
- Lesson 0: ${title}

QUESTION TYPE DISTRIBUTION (approximate):
- ${mcCount} multiple_choice questions (4 options A-D)
- ${tfCount} true_false questions
- ${fbCount} fill_blank questions (use _____ for the blank in the question)
- ${saCount} short_answer questions (1-3 word answers)
- ${matchCount} matching questions (4 pairs each)
- ${orderCount} ordering questions (4 items to arrange)
- ${passageCount} passage_based questions (paragraph with 2 sub-questions)${includeImageQuestions ? `
- ${imageLabelCount} image_label questions (diagram labeling with 3-5 labels each)` : ''}

=== CRITICAL REQUIREMENTS FOR QUESTION QUALITY ===

**FORBIDDEN - DO NOT GENERATE THESE TYPES OF QUESTIONS:**
- "Explain: [Lesson Title]" or "Explain [Topic Name]"
- "What is [Lesson Title]?"
- "Describe [Lesson Title]" or "Describe [Topic Name]"
- "Summarize [Lesson Title]"
- "What do you know about [Topic Name]?"
- Any question that just restates the lesson or section title
- Open-ended "explain everything" questions
- Vague questions without specific correct answers
- Questions where multiple answers could be considered correct
- Questions that can't be auto-graded

**REQUIRED - EVERY QUESTION MUST:**
1. Ask about a SPECIFIC fact, definition, process, concept, or relationship from the content
2. Have exactly ONE clear correct answer (or set of correct answers for matching/ordering)
3. Be auto-gradable (we will programmatically check if the answer is correct)
4. Reference specific details mentioned in the lesson content, NOT just the lesson title
5. Test actual knowledge, not just recognition of topic names

=== STANDARD REQUIREMENTS ===
1. Generate exactly ${questionCount} questions total
2. Questions should test understanding, not just memorization
3. For fill_blank and short_answer: include acceptable_answers array with 2-3 alternate valid answers
4. For matching: include matching_pairs array with 4 left-right pairs
5. For ordering: include ordering_items array with 4 items in the CORRECT order
6. For passage_based: include passage text and sub_questions array with 2 questions
${includeImageQuestions ? `
**IMAGE LABEL QUESTION INSTRUCTIONS:**
- For image_label questions, use "SEARCH_IMAGE:<search query>" as the image_url value
- Labels should have x,y positions as percentages (0-100)
- Include 3-5 labels per diagram
` : ''}

RESPOND WITH ONLY VALID JSON in this format:
{
  "questions": [
    {
      "lesson_index": 0,
      "lesson_title": "${title}",
      "question_type": "multiple_choice",
      "question_text": "...",
      "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
      "correct_answer": "A) ...",
      "explanation": "..."
    }
  ]
}
DO NOT include any text outside the JSON. Only output valid JSON.`

        // ── 14. Call Claude ───────────────────────────────────────────
        log.info({ title, questionCount }, 'Generating exam from content')

        const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
        const message = await anthropic.messages.create({
          model: AI_MODEL,
          max_tokens: 8000,
          system: langInstruction,
          messages: [{ role: 'user', content: prompt }],
        })

        const textBlock = message.content.find(b => b.type === 'text')
        if (!textBlock || textBlock.type !== 'text') {
          throw new Error('No text in AI response')
        }

        let questionsData: { questions: GeneratedQuestion[] }
        try {
          const jsonText = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
          questionsData = JSON.parse(jsonText)
        } catch (e) {
          log.error({ err: e }, 'JSON parse error')
          send({ type: 'error', error: 'Failed to parse AI response' })
          stopHeartbeat()
          controller.close()
          return
        }

        if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
          send({ type: 'error', error: 'Invalid question format from AI' })
          stopHeartbeat()
          controller.close()
          return
        }

        send({ type: 'progress', stage: 'Validating questions...' })

        // ── 15. Question validation (same logic as exams/route.ts) ────
        const badPatterns = [
          /^explain[:\s]/i,
          /^describe[:\s]/i,
          /^summarize[:\s]/i,
          /^what do you know about/i,
          /^tell me about/i,
          /^discuss[:\s]/i,
          /^what are your thoughts on/i,
          /^write about/i,
        ]

        const isQuestionJustTitle = (questionText: string, lessonTitle: string | null): boolean => {
          if (!lessonTitle) return false
          const nq = questionText.toLowerCase().replace(/[?.:!]/g, '').trim()
          const nt = lessonTitle.toLowerCase().replace(/[?.:!]/g, '').trim()
          if (nq === nt) return true
          if (nq === `explain ${nt}`) return true
          if (nq === `describe ${nt}`) return true
          if (nq === `what is ${nt}`) return true
          if (nq === `summarize ${nt}`) return true
          const titleWords = nt.split(/\s+/)
          const questionWords = nq.split(/\s+/)
          if (titleWords.length >= 3) {
            const matched = titleWords.filter(w => questionWords.includes(w))
            if (matched.length / titleWords.length > 0.7 && matched.length / questionWords.length > 0.5) return true
          }
          return false
        }

        const isQuestionTooVague = (questionText: string): boolean => {
          for (const pattern of badPatterns) {
            if (pattern.test(questionText)) return true
          }
          const words = questionText.split(/\s+/)
          if (words.length < 5) {
            if (/^what is \w+\??$/i.test(questionText)) return true
            if (/^define \w+\.?$/i.test(questionText)) return true
          }
          return false
        }

        const isQuestionAutoGradable = (q: GeneratedQuestion): boolean => {
          const qType = q.question_type || ''
          if (['multiple_choice', 'true_false', 'matching', 'ordering'].includes(qType)) return true
          if (['fill_blank', 'short_answer'].includes(qType)) {
            return Boolean(q.correct_answer && q.correct_answer.trim().length > 0)
          }
          if (qType === 'passage_based') {
            return Boolean(q.sub_questions && Array.isArray(q.sub_questions) && q.sub_questions.length > 0)
          }
          if (qType === 'image_label') {
            return Boolean(q.image_label_data?.labels && Array.isArray(q.image_label_data.labels) && q.image_label_data.labels.length > 0)
          }
          return true
        }

        const validatedQuestions = questionsData.questions.filter((q: GeneratedQuestion) => {
          const questionText = q.question_text || ''
          const lessonTitle = q.lesson_title || null
          if (isQuestionTooVague(questionText)) return false
          if (isQuestionJustTitle(questionText, lessonTitle)) return false
          for (const lt of lessonTitles) {
            if (isQuestionJustTitle(questionText, lt)) return false
          }
          if (!isQuestionAutoGradable(q)) return false
          return true
        })

        const rejectedCount = questionsData.questions.length - validatedQuestions.length
        if (rejectedCount > 0) {
          log.info({ rejectedCount, keepCount: validatedQuestions.length }, 'Question validation')
        }

        if (validatedQuestions.length < Math.ceil(questionCount * 0.5)) {
          log.error({ remainingCount: validatedQuestions.length }, 'Too many questions rejected')
          send({ type: 'error', error: 'Failed to generate enough quality questions. Please try again.' })
          stopHeartbeat()
          controller.close()
          return
        }

        // ── 16. Image search for image_label questions ────────────────
        const { searchEducationalImages } = await import('@/lib/images')
        for (const q of validatedQuestions) {
          if (q.question_type === 'image_label' && q.image_label_data) {
            const imageUrl = q.image_label_data.image_url || ''
            if (imageUrl.startsWith('SEARCH_IMAGE:')) {
              const searchQuery = imageUrl.replace('SEARCH_IMAGE:', '').trim()
              try {
                const subject = subjects[0] || 'education'
                const results = await searchEducationalImages(searchQuery + ' ' + subject, subject)
                if (results.length > 0) {
                  const img = results[0]
                  q.image_label_data.image_url = img.url
                  q.image_label_data.image_source = 'web'
                  q.image_label_data.image_credit = img.credit
                  q.image_label_data.image_credit_url = img.creditUrl
                } else {
                  q.image_label_data.image_url = ''
                }
              } catch (error) {
                log.error({ err: error }, 'Image search error')
                q.image_label_data.image_url = ''
              }
            }
          }
        }

        // Filter out image_label questions with no valid image
        const finalQuestions = validatedQuestions.filter((q: GeneratedQuestion) => {
          if (q.question_type === 'image_label') {
            return q.image_label_data?.image_url && !q.image_label_data.image_url.startsWith('SEARCH_IMAGE:')
          }
          return true
        })

        // ── 17. Points calculation ────────────────────────────────────
        const calculatePoints = (q: GeneratedQuestion): number => {
          switch (q.question_type) {
            case 'matching':
            case 'ordering':
              return 2
            case 'passage_based':
              if (q.sub_questions && Array.isArray(q.sub_questions)) {
                return q.sub_questions.reduce((sum: number, sq: { points?: number }) => sum + (sq.points || 1), 0)
              }
              return 2
            case 'image_label':
              return Math.max(2, q.image_label_data?.labels?.length || 0)
            default:
              return 1
          }
        }

        const totalPoints = finalQuestions.reduce(
          (sum: number, q: GeneratedQuestion) => sum + calculatePoints(q),
          0,
        )

        // ── 18. Insert exam + questions into DB ───────────────────────
        send({ type: 'progress', stage: 'Saving exam...' })

        const { data: exam, error: examError } = await supabase
          .from('exams')
          .insert({
            user_id: user.id,
            course_id: courseId,
            title: `${title} - Exam`,
            question_count: finalQuestions.length,
            time_limit_minutes: timeLimitMinutes,
            status: 'pending',
            total_points: totalPoints,
          })
          .select()
          .single()

        if (examError || !exam) {
          log.error({ err: examError }, 'Exam insert error')
          send({ type: 'error', error: 'Failed to save exam' })
          stopHeartbeat()
          controller.close()
          return
        }

        const questionsToInsert = finalQuestions.map((q: GeneratedQuestion, index: number) => ({
          exam_id: exam.id,
          question_index: index,
          lesson_index: q.lesson_index ?? 0,
          lesson_title: q.lesson_title || title,
          question_type: q.question_type || 'multiple_choice',
          question_text: q.question_text,
          options: q.options || [],
          correct_answer: q.correct_answer || '',
          explanation: q.explanation || null,
          points: calculatePoints(q),
          passage: q.passage || null,
          matching_pairs: q.matching_pairs || null,
          ordering_items: q.ordering_items || null,
          sub_questions: q.sub_questions || null,
          acceptable_answers: q.acceptable_answers || null,
          image_label_data: q.question_type === 'image_label' ? q.image_label_data : null,
        }))

        const { error: questionsError } = await supabase
          .from('exam_questions')
          .insert(questionsToInsert)

        if (questionsError) {
          log.error({ err: questionsError }, 'Questions insert error')
          // Clean up the empty exam
          await supabase.from('exams').delete().eq('id', exam.id)
          send({ type: 'error', error: 'Failed to save questions' })
          stopHeartbeat()
          controller.close()
          return
        }

        // ── 19. Done ──────────────────────────────────────────────────
        log.info({ examId: exam.id, courseId, questionCount: questionsToInsert.length }, 'Exam from content created')

        send({
          type: 'success',
          examId: exam.id,
          courseId,
          questionCount: questionsToInsert.length,
          message: `Created exam with ${questionsToInsert.length} questions`,
        })

        stopHeartbeat()
        controller.close()
      } catch (error) {
        log.error({ err: error }, 'Exam from content error')
        send({ type: 'error', error: 'An unexpected error occurred. Please try again.' })
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        try { controller.close() } catch { /* already closed */ }
      }
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
