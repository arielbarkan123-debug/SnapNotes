import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { CreateExamRequest } from '@/types'
import Anthropic from '@anthropic-ai/sdk'
import { buildExamContext, formatContextForPrompt } from '@/lib/curriculum'
import type { StudySystem, ExamFormat } from '@/lib/curriculum'
import { buildExamStyleGuide, pastExamsHaveImages, getAggregatedImageAnalysis } from '@/lib/past-exams'
import { shouldIncludeImages, detectVisualContentMentions } from '@/lib/images/smart-search'
import type { PastExamTemplate, ImageAnalysis } from '@/types/past-exam'
import { checkRateLimit, RATE_LIMITS, getIdentifier, getRateLimitHeaders } from '@/lib/rate-limit'

const AI_MODEL = 'claude-sonnet-4-20250514'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const courseId = searchParams.get('courseId')

    // Only select fields needed for list view
    let query = supabase
      .from('exams')
      .select('id, course_id, title, question_count, time_limit_minutes, status, score, total_points, percentage, grade, created_at, courses(title)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)

    if (courseId) {
      query = query.eq('course_id', courseId)
    }

    const { data: exams, error } = await query

    if (error) {
      console.error('[Exams API] Fetch error:', error)
      return NextResponse.json({ success: false, error: 'Failed to fetch exams' }, { status: 500 })
    }

    return NextResponse.json({ success: true, exams })

  } catch (error) {
    console.error('[Exams API] Error:', error)
    return NextResponse.json({ success: false, error: 'Server error' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ success: false, error: 'Not authenticated' }, { status: 401 })
    }

    // Check rate limit
    const rateLimitId = getIdentifier(user.id, request)
    const rateLimit = checkRateLimit(rateLimitId, RATE_LIMITS.generateExam)

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { success: false, error: 'Too many requests. Please wait before generating another exam.' },
        { status: 429, headers: getRateLimitHeaders(rateLimit) }
      )
    }

    const body: CreateExamRequest = await request.json()
    const { courseId, questionCount, timeLimitMinutes } = body

    if (!courseId || !questionCount || !timeLimitMinutes) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 })
    }

    if (questionCount < 5 || questionCount > 50) {
      return NextResponse.json({ success: false, error: 'Question count must be 5-50' }, { status: 400 })
    }

    if (timeLimitMinutes < 5 || timeLimitMinutes > 180) {
      return NextResponse.json({ success: false, error: 'Time limit must be 5-180 minutes' }, { status: 400 })
    }

    const { data: course, error: courseError } = await supabase
      .from('courses')
      .select('id, title, generated_course, user_id')
      .eq('id', courseId)
      .single()

    if (courseError || !course) {
      return NextResponse.json({ success: false, error: 'Course not found' }, { status: 404 })
    }

    if (course.user_id !== user.id) {
      return NextResponse.json({ success: false, error: 'Not authorized' }, { status: 403 })
    }

    const generatedCourse = course.generated_course as any
    const lessons = generatedCourse?.lessons || generatedCourse?.sections || []

    if (!lessons.length) {
      return NextResponse.json({ success: false, error: 'Course has no content' }, { status: 400 })
    }

    // Fetch user learning profile for curriculum context
    const { data: userProfile } = await supabase
      .from('user_learning_profile')
      .select('study_system, subjects, subject_levels, exam_format')
      .eq('user_id', user.id)
      .single()

    const studySystem = (userProfile?.study_system || 'general') as StudySystem
    const subjects = (userProfile?.subjects || []) as string[]
    const subjectLevels = (userProfile?.subject_levels || {}) as Record<string, string>
    const examFormat = ((body as any).examFormat || userProfile?.exam_format || 'match_real') as ExamFormat

    // Fetch user's past exam templates for style guide
    const { data: pastExamTemplates } = await supabase
      .from('past_exam_templates')
      .select('extracted_analysis, title')
      .eq('user_id', user.id)
      .eq('analysis_status', 'completed')

    // Build exam style guide from past exam templates (if any)
    const examStyleGuide = pastExamTemplates && pastExamTemplates.length > 0
      ? buildExamStyleGuide(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis' | 'title'>[])
      : ''

    // Check if we should include image-based questions
    const pastExamsHaveImageContent = pastExamTemplates && pastExamTemplates.length > 0
      ? pastExamsHaveImages(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis'>[])
      : false

    // Get aggregated image analysis for smart image decisions
    const aggregatedImageAnalysis: ImageAnalysis | undefined = pastExamTemplates && pastExamTemplates.length > 0
      ? getAggregatedImageAnalysis(pastExamTemplates as Pick<PastExamTemplate, 'extracted_analysis'>[])
      : undefined

    // Detect visual content from course title and subject
    const visualMentions = detectVisualContentMentions(course.title + ' ' + subjects.join(' '))

    // Determine if we should include image_label questions
    const imageSearchContext = {
      title: course.title,
      subject: subjects[0] || 'general',
      topics: [] as string[],
      pastExamHasImages: pastExamsHaveImageContent,
      pastExamImageAnalysis: aggregatedImageAnalysis,
      userMentionedVisuals: visualMentions,
    }
    const imageDecision = shouldIncludeImages(imageSearchContext)

    let courseContent = ''
    const lessonList: { index: number; title: string }[] = []

    for (let i = 0; i < lessons.length; i++) {
      const lesson = lessons[i]
      if (!lesson) continue
      lessonList.push({ index: i, title: lesson.title || `Lesson ${i + 1}` })
      courseContent += `\n=== LESSON ${i}: ${lesson.title || 'Untitled'} ===\n`
      const steps = lesson.steps || []
      for (const step of steps) {
        const content = step.content || step.question || step.explanation || ''
        if (content) courseContent += `${content}\n`
      }
    }

    courseContent = courseContent.slice(0, 6000)

    // Build curriculum context for exam generation
    const curriculumContext = await buildExamContext(
      studySystem,
      subjects,
      subjectLevels,
      examFormat,
      courseContent
    )
    const curriculumSection = formatContextForPrompt(curriculumContext)

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

    // Calculate question type distribution
    // If images are appropriate, include image_label questions (reduce other types slightly)
    const includeImageQuestions = imageDecision.shouldInclude && questionCount >= 10
    const imageLabelCount = includeImageQuestions ? Math.max(1, Math.round(questionCount * 0.10)) : 0

    // Adjust other percentages when including image questions
    const adjustmentFactor = includeImageQuestions ? 0.9 : 1.0
    const mcCount = Math.round(questionCount * 0.35 * adjustmentFactor)
    const tfCount = Math.round(questionCount * 0.15 * adjustmentFactor)
    const fbCount = Math.round(questionCount * 0.15 * adjustmentFactor)
    const saCount = Math.round(questionCount * 0.10 * adjustmentFactor)
    const matchCount = Math.round(questionCount * 0.10 * adjustmentFactor)
    const orderCount = Math.round(questionCount * 0.10 * adjustmentFactor)
    const passageCount = Math.max(1, Math.round(questionCount * 0.05))

    // Build list of lesson titles for validation
    const lessonTitles = lessonList.map(l => l.title.toLowerCase())

    // Build exam format instruction
    const examFormatInstruction = examFormat === 'match_real' && curriculumContext.tier2
      ? `\n=== EXAM FORMAT (Match Real Format) ===
Use the exam structure and question styles from the curriculum context below.
Apply the command terms and assessment objectives specified in the curriculum.
Generate questions that would appear in actual exams for this curriculum.`
      : `\n=== EXAM FORMAT (Flexible) ===
Use question styles inspired by the curriculum but with flexible structure.
Focus on testing understanding rather than matching exact exam format.`

    const prompt = `Generate exactly ${questionCount} exam questions based on this course content.

COURSE: ${course.title}
${curriculumSection ? `\n${curriculumSection}` : ''}
${examFormatInstruction}
${examStyleGuide ? `\n${examStyleGuide}` : ''}
CONTENT:
${courseContent}

AVAILABLE LESSONS:
${lessonList.map(l => `- Lesson ${l.index}: ${l.title}`).join('\n')}

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

**GOOD QUESTION EXAMPLES:**
- "What is the function of the mitochondria?" (asks about specific organelle)
- "Which phase of mitosis involves chromosomes lining up at the cell's equator?" (specific phase + specific event)
- "True or False: DNA replication occurs during the S phase of interphase" (specific factual claim)
- "The process of cell division that produces gametes is called _____" (specific term)
- "What happens to the nuclear envelope during prophase?" (specific process + specific phase)
- "During which stage does cytokinesis typically begin?" (specific timing question)

**BAD QUESTION EXAMPLES (NEVER GENERATE THESE):**
- "Explain: Introduction to Cell Division" (just the title, no specific question)
- "What is cell division?" (too vague, many valid answers)
- "Describe the cell cycle" (open-ended, not auto-gradable)
- "What do you know about mitosis?" (no specific answer expected)
- "Summarize the key concepts" (not a real question)

**READ THE ACTUAL CONTENT** - Your questions must be based on specific facts, terms, processes, and relationships mentioned in the lesson content above. Do not ask about the lesson titles themselves.

=== STANDARD REQUIREMENTS ===
1. Generate exactly ${questionCount} questions total
2. Cover different lessons evenly
3. Questions should test understanding, not just memorization
4. For fill_blank and short_answer: include acceptable_answers array with 2-3 alternate valid answers
5. For matching: include matching_pairs array with 4 left-right pairs
6. For ordering: include ordering_items array with 4 items in the CORRECT order
7. For passage_based: include passage text and sub_questions array with 2 questions

RESPOND WITH ONLY VALID JSON in this exact format:
{
  "questions": [
    {
      "lesson_index": 0,
      "lesson_title": "Lesson title",
      "question_type": "multiple_choice",
      "question_text": "What is...?",
      "options": ["A) First", "B) Second", "C) Third", "D) Fourth"],
      "correct_answer": "A) First",
      "explanation": "Brief explanation"
    },
    {
      "lesson_index": 0,
      "lesson_title": "Lesson title",
      "question_type": "true_false",
      "question_text": "Statement to evaluate...",
      "options": ["True", "False"],
      "correct_answer": "True",
      "explanation": "Why true"
    },
    {
      "lesson_index": 1,
      "lesson_title": "Lesson title",
      "question_type": "fill_blank",
      "question_text": "The _____ is responsible for...",
      "options": [],
      "correct_answer": "nucleus",
      "acceptable_answers": ["the nucleus", "cell nucleus"],
      "explanation": "The nucleus controls..."
    },
    {
      "lesson_index": 1,
      "lesson_title": "Lesson title",
      "question_type": "short_answer",
      "question_text": "What process converts sunlight to energy?",
      "options": [],
      "correct_answer": "photosynthesis",
      "acceptable_answers": ["photo synthesis", "the photosynthesis process"],
      "explanation": "Photosynthesis is..."
    },
    {
      "lesson_index": 2,
      "lesson_title": "Lesson title",
      "question_type": "matching",
      "question_text": "Match each term with its definition:",
      "options": [],
      "correct_answer": "",
      "matching_pairs": [
        {"left": "Term A", "right": "Definition A"},
        {"left": "Term B", "right": "Definition B"},
        {"left": "Term C", "right": "Definition C"},
        {"left": "Term D", "right": "Definition D"}
      ],
      "explanation": "These terms relate to..."
    },
    {
      "lesson_index": 2,
      "lesson_title": "Lesson title",
      "question_type": "ordering",
      "question_text": "Arrange these steps in the correct order:",
      "options": [],
      "correct_answer": "",
      "ordering_items": ["First step", "Second step", "Third step", "Fourth step"],
      "explanation": "This is the correct sequence because..."
    },
    {
      "lesson_index": 3,
      "lesson_title": "Lesson title",
      "question_type": "passage_based",
      "question_text": "Read the passage and answer the questions below.",
      "options": [],
      "correct_answer": "",
      "passage": "A paragraph of text providing context for the sub-questions. This should be 3-5 sentences that contain information needed to answer the questions.",
      "sub_questions": [
        {
          "id": "sq1",
          "question_text": "According to the passage, what...?",
          "question_type": "multiple_choice",
          "options": ["A) Option 1", "B) Option 2", "C) Option 3", "D) Option 4"],
          "correct_answer": "A) Option 1",
          "acceptable_answers": null,
          "points": 1
        },
        {
          "id": "sq2",
          "question_text": "Based on the passage, is this true or false?",
          "question_type": "true_false",
          "options": ["True", "False"],
          "correct_answer": "True",
          "acceptable_answers": null,
          "points": 1
        }
      ],
      "explanation": "This passage tests comprehension of..."
    }${includeImageQuestions ? `,
    {
      "lesson_index": 0,
      "lesson_title": "Lesson title with visual content",
      "question_type": "image_label",
      "question_text": "Label the parts of the diagram below:",
      "options": [],
      "correct_answer": "",
      "image_label_data": {
        "image_url": "SEARCH_IMAGE:cell structure diagram",
        "image_alt": "Diagram of a cell showing major organelles",
        "interaction_mode": "type",
        "labels": [
          { "id": "label1", "correct_text": "Nucleus", "x": 50, "y": 30, "box_width": 15 },
          { "id": "label2", "correct_text": "Mitochondria", "x": 25, "y": 60, "box_width": 15 },
          { "id": "label3", "correct_text": "Cell membrane", "x": 80, "y": 50, "box_width": 15 },
          { "id": "label4", "correct_text": "Cytoplasm", "x": 50, "y": 70, "box_width": 15 }
        ]
      },
      "explanation": "Each organelle has a specific function..."
    }` : ''}
  ]
}

${includeImageQuestions ? `
**IMAGE LABEL QUESTION INSTRUCTIONS:**
- For image_label questions, use "SEARCH_IMAGE:<search query>" as the image_url value
- The search query should describe what image to find (e.g., "cell structure diagram", "human heart anatomy")
- Labels should have x,y positions as percentages (0-100) indicating where on the image the label should appear
- Include 3-5 labels per diagram
- interaction_mode can be "type" (student types answers), "drag" (student drags labels), or "both"
- Make sure the labels match specific parts that would appear in educational diagrams
` : ''}
DO NOT include any text outside the JSON. Only output valid JSON.`

    console.log('[Exams API] Generating questions for:', course.title)

    const message = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 8000,
      messages: [{ role: 'user', content: prompt }],
    })

    const textBlock = message.content.find(block => block.type === 'text')
    if (!textBlock || textBlock.type !== 'text') {
      throw new Error('No text in AI response')
    }

    let questionsData
    try {
      const jsonText = textBlock.text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
      questionsData = JSON.parse(jsonText)
    } catch (e) {
      console.error('[Exams API] JSON parse error:', e)
      return NextResponse.json({ success: false, error: 'Failed to generate questions' }, { status: 500 })
    }

    if (!questionsData.questions || !Array.isArray(questionsData.questions)) {
      return NextResponse.json({ success: false, error: 'Invalid question format' }, { status: 500 })
    }

    // =========================================================================
    // QUESTION VALIDATION - Filter out bad questions
    // =========================================================================

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
      const normalizedQuestion = questionText.toLowerCase().replace(/[?.:!]/g, '').trim()
      const normalizedTitle = lessonTitle.toLowerCase().replace(/[?.:!]/g, '').trim()

      // Check if question is essentially just the title
      if (normalizedQuestion === normalizedTitle) return true
      if (normalizedQuestion === `explain ${normalizedTitle}`) return true
      if (normalizedQuestion === `describe ${normalizedTitle}`) return true
      if (normalizedQuestion === `what is ${normalizedTitle}`) return true
      if (normalizedQuestion === `summarize ${normalizedTitle}`) return true

      // Check if question contains mostly just the title with a vague prefix
      const titleWords = normalizedTitle.split(/\s+/)
      const questionWords = normalizedQuestion.split(/\s+/)
      if (titleWords.length >= 3) {
        const titleInQuestion = titleWords.filter(word => questionWords.includes(word))
        const titleMatchRatio = titleInQuestion.length / titleWords.length
        const questionContentRatio = titleInQuestion.length / questionWords.length
        // If most of the title is in the question and it makes up most of the question
        if (titleMatchRatio > 0.7 && questionContentRatio > 0.5) return true
      }

      return false
    }

    const isQuestionTooVague = (questionText: string): boolean => {
      // Check for bad patterns
      for (const pattern of badPatterns) {
        if (pattern.test(questionText)) return true
      }

      // Check for very short questions that are likely vague
      const words = questionText.split(/\s+/)
      if (words.length < 5) {
        // Short questions like "What is mitosis?" are too vague
        if (/^what is \w+\??$/i.test(questionText)) return true
        if (/^define \w+\.?$/i.test(questionText)) return true
      }

      return false
    }

    const isQuestionAutoGradable = (q: any): boolean => {
      // Multiple choice, true/false, matching, ordering are auto-gradable by design
      if (['multiple_choice', 'true_false', 'matching', 'ordering'].includes(q.question_type)) {
        return true
      }

      // Fill blank and short answer need a correct answer
      if (['fill_blank', 'short_answer'].includes(q.question_type)) {
        return q.correct_answer && q.correct_answer.trim().length > 0
      }

      // Passage-based needs sub_questions
      if (q.question_type === 'passage_based') {
        return q.sub_questions && Array.isArray(q.sub_questions) && q.sub_questions.length > 0
      }

      // Image label needs image_label_data with labels
      if (q.question_type === 'image_label') {
        return q.image_label_data &&
          q.image_label_data.labels &&
          Array.isArray(q.image_label_data.labels) &&
          q.image_label_data.labels.length > 0
      }

      return true
    }

    // Validate and filter questions
    const validatedQuestions = questionsData.questions.filter((q: any) => {
      const questionText = q.question_text || ''
      const lessonTitle = q.lesson_title || null

      // Check for bad patterns
      if (isQuestionTooVague(questionText)) {
        console.log('[Exams API] Rejected vague question:', questionText.substring(0, 50))
        return false
      }

      // Check if it's just the lesson title
      if (isQuestionJustTitle(questionText, lessonTitle)) {
        console.log('[Exams API] Rejected title-only question:', questionText.substring(0, 50))
        return false
      }

      // Also check against all lesson titles
      for (const title of lessonTitles) {
        if (isQuestionJustTitle(questionText, title)) {
          console.log('[Exams API] Rejected question matching lesson title:', questionText.substring(0, 50))
          return false
        }
      }

      // Check if auto-gradable
      if (!isQuestionAutoGradable(q)) {
        console.log('[Exams API] Rejected non-gradable question:', questionText.substring(0, 50))
        return false
      }

      return true
    })

    // Log validation results
    const rejectedCount = questionsData.questions.length - validatedQuestions.length
    if (rejectedCount > 0) {
      console.log(`[Exams API] Rejected ${rejectedCount} bad questions, keeping ${validatedQuestions.length}`)
    }

    // Use validated questions
    questionsData.questions = validatedQuestions

    // Check if we have enough questions after validation
    if (validatedQuestions.length < Math.ceil(questionCount * 0.5)) {
      console.error('[Exams API] Too many questions rejected, only', validatedQuestions.length, 'remain')
      return NextResponse.json({
        success: false,
        error: 'Failed to generate enough quality questions. Please try again.'
      }, { status: 500 })
    }

    // Process image_label questions to fetch actual images
    const { searchEducationalImages } = await import('@/lib/images')
    for (const q of validatedQuestions) {
      if (q.question_type === 'image_label' && q.image_label_data) {
        const imageUrl = q.image_label_data.image_url || ''
        if (imageUrl.startsWith('SEARCH_IMAGE:')) {
          const searchQuery = imageUrl.replace('SEARCH_IMAGE:', '').trim()
          try {
            const subject = subjects[0] || 'education'
            const searchResults = await searchEducationalImages(searchQuery + ' ' + subject, subject)
            if (searchResults.length > 0) {
              const image = searchResults[0]
              q.image_label_data.image_url = image.url
              q.image_label_data.image_source = 'web'
              q.image_label_data.image_credit = image.credit
              q.image_label_data.image_credit_url = image.creditUrl
              console.log('[Exams API] Found image for:', searchQuery)
            } else {
              // If no image found, remove this question or keep placeholder
              console.log('[Exams API] No image found for:', searchQuery)
              q.image_label_data.image_url = '' // Will be filtered out
            }
          } catch (error) {
            console.error('[Exams API] Image search error:', error)
            q.image_label_data.image_url = ''
          }
        }
      }
    }

    // Filter out image_label questions with no valid image
    questionsData.questions = validatedQuestions.filter((q: any) => {
      if (q.question_type === 'image_label') {
        return q.image_label_data?.image_url && !q.image_label_data.image_url.startsWith('SEARCH_IMAGE:')
      }
      return true
    })

    // Calculate points based on question type
    const calculatePoints = (q: any): number => {
      switch (q.question_type) {
        case 'matching':
        case 'ordering':
          return 2
        case 'passage_based':
          // Sum of sub-question points
          if (q.sub_questions && Array.isArray(q.sub_questions)) {
            return q.sub_questions.reduce((sum: number, sq: any) => sum + (sq.points || 1), 0)
          }
          return 2
        case 'image_label':
          // Points based on number of labels
          const labelCount = q.image_label_data?.labels?.length || 0
          return Math.max(2, labelCount)
        default:
          return 1
      }
    }

    // Calculate total points from all questions
    const totalPoints = questionsData.questions.reduce(
      (sum: number, q: any) => sum + calculatePoints(q),
      0
    )

    const { data: exam, error: examError } = await supabase
      .from('exams')
      .insert({
        user_id: user.id,
        course_id: courseId,
        title: `${course.title} - Exam`,
        question_count: questionCount,
        time_limit_minutes: timeLimitMinutes,
        status: 'pending',
        total_points: totalPoints,
      })
      .select()
      .single()

    if (examError || !exam) {
      console.error('[Exams API] Exam insert error:', examError)
      return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 })
    }

    const questionsToInsert = questionsData.questions.map((q: any, index: number) => ({
      exam_id: exam.id,
      question_index: index,
      lesson_index: q.lesson_index ?? null,
      lesson_title: q.lesson_title || null,
      question_type: q.question_type || 'multiple_choice',
      question_text: q.question_text,
      options: q.options || [],
      correct_answer: q.correct_answer || '',
      explanation: q.explanation || null,
      points: calculatePoints(q),
      // New fields for advanced question types
      passage: q.passage || null,
      matching_pairs: q.matching_pairs || null,
      ordering_items: q.ordering_items || null,
      sub_questions: q.sub_questions || null,
      acceptable_answers: q.acceptable_answers || null,
      // Image label question data
      image_label_data: q.question_type === 'image_label' ? q.image_label_data : null,
    }))

    const { error: questionsError } = await supabase
      .from('exam_questions')
      .insert(questionsToInsert)

    if (questionsError) {
      console.error('[Exams API] Questions insert error:', questionsError)
      await supabase.from('exams').delete().eq('id', exam.id)
      return NextResponse.json({ success: false, error: 'Failed to save questions' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      examId: exam.id,
      message: `Created exam with ${questionsToInsert.length} questions`
    })

  } catch (error) {
    console.error('[Exams API] Error:', error)
    return NextResponse.json({ success: false, error: 'Failed to create exam' }, { status: 500 })
  }
}
