import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'

// Validate API key exists
if (!process.env.ANTHROPIC_API_KEY) {
  console.error('[Generate Questions API] ANTHROPIC_API_KEY is not configured')
}

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

const MAX_QUESTIONS = 10
const MIN_QUESTIONS = 1

interface GeneratedQuestion {
  type: 'multiple_choice' | 'true_false'
  question: string
  options: string[]
  correct_answer: number
  explanation: string
}

/**
 * POST /api/generate-questions
 * Generate practice questions related to a topic or lesson
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { courseId, lessonIndex, topic, wrongQuestion, count = 3 } = await request.json()

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'Question service not configured' }, { status: 503 })
    }

    // Validate count parameter
    const validCount = Math.min(Math.max(Number(count) || 3, MIN_QUESTIONS), MAX_QUESTIONS)

    // Get course context
    let courseContext = ''
    let lessonContent = ''

    if (courseId) {
      const { data: course } = await supabase
        .from('courses')
        .select('title, generated_course')
        .eq('id', courseId)
        .eq('user_id', user.id)
        .single()

      if (course?.generated_course) {
        const courseData = course.generated_course
        courseContext = `Course: ${course.title}\n`

        if (lessonIndex !== undefined && courseData.lessons?.[lessonIndex]) {
          const lesson = courseData.lessons[lessonIndex]
          lessonContent = `Lesson: ${lesson.title}\n`
          if (lesson.steps) {
            const explanations = lesson.steps
              .filter((s: { type: string }) => s.type === 'explanation' || s.type === 'key_points')
              .map((s: { content?: string; text?: string }) => s.content || s.text)
              .join('\n')
            lessonContent += `Content:\n${explanations.slice(0, 2000)}`
          }
        }
      }
    }

    // Fetch curriculum context for curriculum-aligned questions
    let curriculumSection = ''
    const { data: userProfile } = await supabase
      .from('user_learning_profile')
      .select('study_system, subjects, subject_levels, exam_format')
      .eq('user_id', user.id)
      .single()

    if (userProfile?.study_system && userProfile.study_system !== 'general' && userProfile.study_system !== 'other') {
      const curriculumContext = await buildCurriculumContext({
        userProfile: {
          studySystem: userProfile.study_system as StudySystem,
          subjects: userProfile.subjects || [],
          subjectLevels: userProfile.subject_levels || {},
          examFormat: userProfile.exam_format as 'match_real' | 'inspired_by' | undefined,
        },
        contentSample: lessonContent || courseContext || topic, // Use content to detect subject
        purpose: 'practice',
      })
      curriculumSection = formatContextForPrompt(curriculumContext)
    }

    // Build prompt for question generation with curriculum awareness
    const systemPrompt = `You are an educational AI that generates practice questions. Generate questions that test understanding, not just memorization.

${curriculumSection ? `## Curriculum Context
${curriculumSection}

Use this curriculum context to:
- Apply appropriate command terms (e.g., "Describe", "Explain", "Evaluate", "Compare")
- Align questions with assessment objectives
- Match the difficulty level to the student's curriculum level
- Use question styles typical of this curriculum's exams
` : ''}
${courseContext}
${lessonContent}

Rules:
1. Generate ${validCount} questions related to the topic
2. Questions should be diverse in difficulty${curriculumSection ? ' - aligned with curriculum assessment objectives' : ''}
3. For multiple choice, provide 4 options with one correct answer
4. Include clear explanations for the correct answer
5. If a wrong question is provided, generate related questions that reinforce the concept
6. Questions should be appropriate for the education level${curriculumSection ? ' and curriculum standards' : ''}
${curriculumSection ? '7. Use curriculum-specific command terms in question stems where appropriate' : ''}

Return JSON in this exact format:
{
  "questions": [
    {
      "type": "multiple_choice",
      "question": "Question text here?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correct_answer": 0,
      "explanation": "Explanation of why the answer is correct"
    }
  ]
}`

    const userMessage = wrongQuestion
      ? `The student got this question wrong: "${wrongQuestion}"\n\nGenerate ${validCount} practice questions to reinforce understanding of this concept.`
      : topic
        ? `Generate ${validCount} practice questions about: ${topic}`
        : `Generate ${validCount} practice questions based on the lesson content.`

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in response:', responseText)
      return NextResponse.json({ error: 'Failed to parse questions' }, { status: 500 })
    }

    let parsed: { questions?: GeneratedQuestion[] }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      console.error('Failed to parse JSON:', parseError, jsonMatch[0])
      return NextResponse.json({ error: 'Failed to parse questions' }, { status: 500 })
    }

    const questions: GeneratedQuestion[] = parsed.questions || []

    // Validate questions
    const validQuestions = questions.filter(q =>
      q.question &&
      q.options &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      typeof q.correct_answer === 'number' &&
      q.correct_answer >= 0 &&
      q.correct_answer < q.options.length
    )

    return NextResponse.json({
      success: true,
      questions: validQuestions,
      count: validQuestions.length,
    })
  } catch (error) {
    console.error('[Generate Questions API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to generate questions' },
      { status: 500 }
    )
  }
}
