import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { buildCurriculumContext, formatContextForPrompt } from '@/lib/curriculum/context-builder'
import type { StudySystem } from '@/lib/curriculum/types'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { classifyTopicType, inferDifficultyFromTopic, resolveEffectiveLanguageLevel } from '@/lib/ai/content-classifier'
import { isQuestionQualityAcceptable } from '@/lib/srs'
import { createLogger } from '@/lib/logger'

const log = createLogger('api:generate-questions')

// Allow 90 seconds for question generation (Claude API with curriculum context)
export const maxDuration = 90

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
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    const { courseId, lessonIndex, topic, wrongQuestion, count = 3 } = await request.json()

    // Validate API key is configured
    if (!process.env.ANTHROPIC_API_KEY) {
      return createErrorResponse(ErrorCodes.API_KEY_NOT_CONFIGURED)
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
      .select('study_system, grade, subjects, subject_levels, exam_format, language')
      .eq('user_id', user.id)
      .single()

    // Get user's language preference
    const userLanguage = userProfile?.language || 'en'

    if (userProfile?.study_system && userProfile.study_system !== 'general' && userProfile.study_system !== 'other') {
      const curriculumContext = await buildCurriculumContext({
        userProfile: {
          studySystem: userProfile.study_system as StudySystem,
          subjects: userProfile.subjects || [],
          subjectLevels: userProfile.subject_levels || {},
          examFormat: userProfile.exam_format as 'match_real' | 'inspired_by' | undefined,
          grade: userProfile.grade || undefined,
        },
        contentSample: lessonContent || courseContext || topic, // Use content to detect subject
        purpose: 'practice',
      })
      curriculumSection = formatContextForPrompt(curriculumContext)
    }

    // Build Hebrew language instruction if needed
    const hebrewInstruction = userLanguage === 'he' ? `
## Language Requirement - CRITICAL
Generate ALL content in Hebrew (עברית).
- All questions must be in Hebrew
- All answer options must be in Hebrew
- All explanations must be in Hebrew
- Keep mathematical notation standard (numbers, symbols)
- Use proper Hebrew educational terminology
` : ''

    // Classify topic type and language level for content-appropriate questions
    const topicContent = topic || lessonContent || courseContext || ''
    const topicType = classifyTopicType(topicContent)
    const contentDifficulty = inferDifficultyFromTopic(topicContent)

    // Safe grade parsing: handle "K", "Pre-K", non-numeric grades, and numeric grades
    let profileLevel: string | undefined
    if (userProfile?.grade) {
      const gradeStr = userProfile.grade.toString().trim().toLowerCase()
      if (gradeStr === 'k' || gradeStr === 'pre-k' || gradeStr === 'kindergarten') {
        profileLevel = 'elementary'
      } else {
        const gradeNum = parseInt(gradeStr, 10)
        if (!isNaN(gradeNum)) {
          profileLevel = gradeNum <= 6 ? 'elementary' : gradeNum <= 9 ? 'middle_school' : 'high_school'
        }
        // If parseInt fails (e.g., "Reception", "Year 1"), leave undefined → defaults to middle in resolver
      }
    }

    const languageLevel = resolveEffectiveLanguageLevel(profileLevel, contentDifficulty)

    // Build topic-type-specific instructions
    let topicTypeInstructions = ''
    if (topicType === 'computational') {
      topicTypeInstructions = userLanguage === 'he' ? `
## פורמט שאלות — קריטי
- כאשר חישוב עומד בפני עצמו → סימון בלבד, ללא מילים מיותרות
  - נכון: "3/4 + 1/2 = ?", "25% × 80 = ?", "2x + 5 = 13, x = ?"
  - לא נכון: "פתור: מהו 25% מ-80?", "מה המשמעות של השוואה?"
- שאלות שצריכות הקשר → מילים בסדר
  - "בשקית 5 כדורים: 3 אדומים ו-2 כחולים. P(אדום) = ?"
- תשובות: מספרים/ביטויים, לא תיאורים במילים
` : `
## Question Format — CRITICAL
- Self-contained computations → NOTATION ONLY, no unnecessary words
  - GOOD: "3/4 + 1/2 = ?", "25% × 80 = ?", "2x + 5 = 13, x = ?"
  - BAD: "Solve: What is 25% of 80?", "What does comparing mean?"
- Questions that genuinely need context → words are fine
  - "A bag has 5 balls: 3 red, 2 blue. P(red) = ?"
- Answer options: numbers/expressions, not word descriptions
`
    } else if (topicType === 'mixed') {
      topicTypeInstructions = `
## Question Format
- Self-contained computations (50%+): notation only — "sin(30°) = ?" not "What is the sine of 30 degrees?"
- Context-dependent problems: words + notation are fine
- Conceptual questions: natural language — "Explain ...", "What is ...", "Why does ..."
`
    }

    // Build language level instruction
    const languageLevelInstruction = `
## Language Complexity
Content difficulty: ${contentDifficulty}/5. Use ${languageLevel.level}-appropriate language.
${languageLevel.vocabularyInstructions}
`

    // Build prompt for question generation with curriculum awareness
    const systemPrompt = `You are an educational AI that generates practice questions. Generate questions that test understanding, not just memorization.
${hebrewInstruction}
${topicTypeInstructions}
${languageLevelInstruction}
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

    const response = await getAnthropicClient().messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
    })

    // Parse response
    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Extract JSON from response
    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      log.error({ responseText }, 'No JSON found in response')
      return createErrorResponse(ErrorCodes.RESPONSE_PARSE_FAILED)
    }

    let parsed: { questions?: GeneratedQuestion[] }
    try {
      parsed = JSON.parse(jsonMatch[0])
    } catch (parseError) {
      log.error({ err: parseError, raw: jsonMatch[0] }, 'Failed to parse JSON')
      return createErrorResponse(ErrorCodes.RESPONSE_PARSE_FAILED)
    }

    const questions: GeneratedQuestion[] = parsed.questions || []

    // Validate questions (structural + quality)
    const validQuestions = questions.filter(q =>
      q.question &&
      q.options &&
      Array.isArray(q.options) &&
      q.options.length >= 2 &&
      typeof q.correct_answer === 'number' &&
      q.correct_answer >= 0 &&
      q.correct_answer < q.options.length &&
      isQuestionQualityAcceptable(q.question)
    )

    return NextResponse.json({
      success: true,
      questions: validQuestions,
      count: validQuestions.length,
    })
  } catch (error) {
    log.error({ err: error }, 'Error generating questions')
    return createErrorResponse(ErrorCodes.QUESTION_GENERATION_FAILED)
  }
}
