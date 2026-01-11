import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { HelpAPIRequest, HelpAPIResponse, HelpRequestType } from '@/types'
import Anthropic from '@anthropic-ai/sdk'

// Allow 90 seconds for AI help generation (Claude API call)
export const maxDuration = 90

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_CONTENT_LENGTH = 4000

export async function POST(request: Request): Promise<NextResponse<HelpAPIResponse>> {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    let body: HelpAPIRequest
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 })
    }

    const { questionType, context, customQuestion } = body

    if (!questionType || !context || !context.courseId) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (!context.stepContent?.trim()) {
      return NextResponse.json({ success: false, error: 'No content to explain' }, { status: 400 })
    }

    const validTypes: HelpRequestType[] = ['explain', 'example', 'hint', 'custom']
    if (!validTypes.includes(questionType)) {
      return NextResponse.json({ success: false, error: 'Invalid question type' }, { status: 400 })
    }

    if (questionType === 'custom' && !customQuestion?.trim()) {
      return NextResponse.json({ success: false, error: 'Please enter a question' }, { status: 400 })
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, generated_course, user_id')
      .eq('id', context.courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 })
    }

    if (course.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const generatedCourse = course.generated_course as {
      lessons?: Array<{ title?: string; steps?: Array<{ type?: string; content?: string; question?: string; explanation?: string }> }>;
      sections?: Array<{ title?: string; steps?: Array<{ type?: string; content?: string; question?: string; explanation?: string }> }>;
    } | null
    let relevantContent = ''

    if (generatedCourse) {
      try {
        const lessons = generatedCourse.lessons || generatedCourse.sections || []
        const lessonIndex = context.lessonIndex || 0
        const startIdx = Math.max(0, lessonIndex - 1)
        const endIdx = Math.min(lessons.length, lessonIndex + 2)

        for (let i = startIdx; i < endIdx && relevantContent.length < MAX_CONTENT_LENGTH; i++) {
          const lesson = lessons[i]
          if (!lesson) continue
          relevantContent += `\n--- Lesson ${i + 1}: ${lesson.title || 'Untitled'} ---\n`
          const steps = lesson.steps || []
          for (const step of steps) {
            if (relevantContent.length >= MAX_CONTENT_LENGTH) break
            const content = step.content || step.question || step.explanation || ''
            if (content) relevantContent += `[${step.type || 'content'}]: ${content}\n`
          }
        }
      } catch (e) {
        console.error('[Help API] Content extraction error:', e)
      }
    }

    if (!relevantContent || relevantContent.length < 20) {
      relevantContent = JSON.stringify(generatedCourse || {}).slice(0, MAX_CONTENT_LENGTH)
    }

    let systemPrompt = ''
    let userPrompt = ''
    const stepContent = context.stepContent.slice(0, 500)

    switch (questionType) {
      case 'explain':
        systemPrompt = `You are a helpful, accurate tutor.
RULES:
- ONLY use information from the COURSE CONTENT provided below
- If the topic isn't in the course content, say "This isn't covered in your notes."
- Keep explanations under 100 words
- Use simple, clear language appropriate for a student
- Be accurate - don't make up information
- If explaining math, double-check any calculations you show`
        userPrompt = `The student doesn't understand this concept:\n"${stepContent}"\n\nExplain it in simpler terms they can understand.\n\nCOURSE CONTENT:\n${relevantContent}\n\nEnd with:\n📍 From: [Lesson title where this is covered]`
        break
      case 'example':
        systemPrompt = `You are a helpful tutor providing real-world examples.
RULES:
- ONLY use examples that relate to the COURSE CONTENT provided
- Examples must be accurate and age-appropriate
- Keep under 80 words
- Make examples concrete and relatable
- Don't use examples that could confuse the student`
        userPrompt = `Give a real-world example that illustrates:\n"${stepContent}"\n\nThe example should help the student understand and remember this concept.\n\nCOURSE CONTENT:\n${relevantContent}\n\nEnd with:\n📍 From: [Lesson title]`
        break
      case 'hint':
        systemPrompt = `You are a Socratic tutor giving hints WITHOUT revealing answers.
RULES:
- NEVER give the answer directly
- Give a hint that guides thinking in the RIGHT direction
- VERIFY your hint is accurate - don't accidentally mislead
- If the student's answer is actually correct, tell them!
- Keep under 50 words
- Be encouraging, not condescending`
        userPrompt = `Student is stuck on:\n"${stepContent}"\n\nTheir current answer: "${context.userAnswer || 'none provided'}"\nThe correct answer is: "${context.correctAnswer || 'not specified'}"\n\nIF their answer is correct (or very close), tell them they're right!\nIF wrong, give a hint to guide them (WITHOUT revealing the answer).\n\nCOURSE CONTENT:\n${relevantContent}`
        break
      case 'custom':
        systemPrompt = `You are a helpful, accurate tutor answering student questions.
RULES:
- ONLY use information from the COURSE CONTENT provided
- If the question isn't covered in the content, honestly say so
- Be accurate - it's better to say "I don't have that information" than to guess
- Keep under 120 words
- If the question involves math, verify your calculations
- Cite which lesson the information comes from`
        userPrompt = `The student asks: "${customQuestion!.slice(0, 300)}"\n\nThey're studying: "${context.lessonTitle}"\nCurrent topic: "${stepContent}"\n\nAnswer their question accurately using ONLY the course content below.\n\nCOURSE CONTENT:\n${relevantContent}\n\nEnd with source:\n📍 From: [Lesson title where this is covered]`
        break
    }

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const textBlock = message.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') throw new Error('No text in response')

    let responseText = textBlock.text
    let sourceReference: string | null = null

    const sourceMatch = responseText.match(/📍\s*From:\s*(.+)$/m)
    if (sourceMatch) {
      sourceReference = sourceMatch[1].trim()
      responseText = responseText.replace(/📍\s*From:\s*.+$/m, '').trim()
    }

    try {
      await supabase.from('help_requests').insert({
        user_id: user.id,
        course_id: context.courseId,
        lesson_index: context.lessonIndex,
        step_index: context.stepIndex,
        question_type: questionType,
        user_question: questionType === 'custom' ? customQuestion : null,
        ai_response: responseText,
        source_reference: sourceReference,
      })
    } catch (e) {
      console.error('[Help API] DB error:', e)
    }

    return NextResponse.json({ success: true, response: responseText, sourceReference })

  } catch (error) {
    console.error('[Help API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to get help. Please try again.' }, { status: 500 })
  }
}
