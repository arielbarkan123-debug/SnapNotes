/**
 * AI Prompts for NoteSnap
 *
 * This file contains all the prompts used for:
 * 1. Analyzing notebook images and extracting content
 * 2. Generating structured study courses from extracted content
 * 3. Generating courses from document content (PDF, PPTX, DOCX)
 */

import type { ExtractedDocument } from '@/lib/documents'
import type { CurriculumContext } from '@/lib/curriculum'

// ============================================================================
// User Context Types for Personalization
// ============================================================================

export interface UserLearningContext {
  educationLevel: 'elementary' | 'middle_school' | 'high_school' | 'university' | 'graduate' | 'professional'
  studySystem: 'general' | 'us' | 'uk' | 'israeli_bagrut' | 'ib' | 'ap' | 'other'
  studyGoal: 'exam_prep' | 'general_learning' | 'skill_improvement'
  learningStyles: string[]
  // Extended curriculum fields
  subjects?: string[]
  subjectLevels?: Record<string, string>
  examFormat?: 'match_real' | 'inspired_by'
  // Language preference for content generation
  language?: 'en' | 'he'
}

// Helper function to get education level description for prompts
function getEducationLevelDescription(level: UserLearningContext['educationLevel']): string {
  const descriptions: Record<UserLearningContext['educationLevel'], string> = {
    elementary: 'elementary school student (ages 6-11). Use very simple vocabulary, short sentences, fun examples, and lots of encouragement. Avoid complex terms.',
    middle_school: 'middle school student (ages 11-14). Use clear language, relatable examples, and build concepts step by step. Introduce technical terms gradually.',
    high_school: 'high school student (ages 14-18). Use age-appropriate vocabulary, provide real-world applications, and prepare them for exams.',
    university: 'university/college student. Use academic language, include theoretical depth, and reference scholarly concepts when appropriate.',
    graduate: 'graduate student (Masters/PhD level). Use advanced terminology, assume foundational knowledge, and include nuanced explanations.',
    professional: 'working professional seeking practical knowledge. Focus on real-world applications, efficiency, and actionable insights.',
  }
  return descriptions[level]
}

// Helper function to get study system context for prompts
function getStudySystemContext(system: UserLearningContext['studySystem']): string {
  const contexts: Record<UserLearningContext['studySystem'], string> = {
    general: '',
    us: 'The student follows the US educational system. Reference Common Core standards when relevant.',
    uk: 'The student follows the UK educational system. Reference GCSE/A-Level standards when relevant.',
    israeli_bagrut: 'The student is preparing for Israeli Bagrut exams. Structure content to align with matriculation exam format.',
    ib: 'The student is in the IB (International Baccalaureate) program. Emphasize critical thinking and international perspectives.',
    ap: 'The student is taking AP (Advanced Placement) courses. Prepare content at college-level rigor.',
    other: '',
  }
  return contexts[system]
}

// Helper function to get study goal context for prompts
function getStudyGoalContext(goal: UserLearningContext['studyGoal']): string {
  const contexts: Record<UserLearningContext['studyGoal'], string> = {
    exam_prep: 'The student is preparing for exams. Emphasize testable knowledge, include more practice questions, and highlight commonly tested concepts.',
    general_learning: 'The student is learning for general knowledge. Focus on understanding concepts deeply and making connections between ideas.',
    skill_improvement: 'The student is building practical skills. Include hands-on examples, real-world applications, and actionable takeaways.',
  }
  return contexts[goal]
}

// Helper function to build Hebrew language instruction for content generation
function buildLanguageInstruction(language?: 'en' | 'he'): string {
  if (language === 'he') {
    return `

## Language Requirement - CRITICAL
Generate ALL content in Hebrew (עברית). This is mandatory.

### Hebrew Content Guidelines:
- ALL course titles, section titles, and lesson titles in Hebrew
- ALL explanations, key points, and summaries in Hebrew
- ALL questions, answer options, and feedback in Hebrew
- ALL overview, connections, and furtherStudy content in Hebrew
- Use proper Hebrew educational terminology
- Use right-to-left text flow naturally
- For mathematical formulas: keep standard notation (e.g., E=mc²) but explain in Hebrew
- For scientific terms: use Hebrew translations where commonly used, or transliterate technical terms
- For code or technical content: keep code in English, explain in Hebrew
- Maintain a natural, educational Hebrew writing style appropriate for the student's level

### Hebrew Writing Quality:
- Use formal but accessible Hebrew (לשון פורמלית אך נגישה)
- Avoid awkward translations - write naturally in Hebrew
- Use common Hebrew educational phrases
- Match the complexity of Hebrew to the student's education level
`
  }
  return ''
}

// Build personalization section for prompts
function buildPersonalizationSection(
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): string {
  if (!userContext) return ''

  const parts: string[] = []

  // Add Hebrew language instruction if applicable (at the top for priority)
  const languageInstruction = buildLanguageInstruction(userContext.language)
  if (languageInstruction) {
    parts.push(languageInstruction)
  }

  parts.push(`\n## Student Profile - IMPORTANT: Adapt ALL content to this level`)
  parts.push(`The student is a ${getEducationLevelDescription(userContext.educationLevel)}`)

  const systemContext = getStudySystemContext(userContext.studySystem)
  if (systemContext) {
    parts.push(systemContext)
  }

  parts.push(getStudyGoalContext(userContext.studyGoal))

  if (userContext.learningStyles.length > 0) {
    const styleDescriptions: Record<string, string> = {
      reading: 'reading and text explanations',
      visual: 'diagrams and visual content',
      practice: 'hands-on practice and self-testing',
    }
    const styles = userContext.learningStyles
      .map(s => styleDescriptions[s] || s)
      .join(', ')
    parts.push(`The student prefers learning through: ${styles}.`)
  }

  // Inject curriculum context if available
  if (curriculumContext) {
    if (curriculumContext.tier1) {
      parts.push('')
      parts.push('## Curriculum System')
      parts.push(curriculumContext.tier1)
    }

    if (curriculumContext.tier2) {
      parts.push('')
      parts.push('## Subject Requirements')
      parts.push(curriculumContext.tier2)
    }

    if (curriculumContext.tier3) {
      parts.push('')
      parts.push('## Topic Specifics')
      parts.push(curriculumContext.tier3)
    }
  }

  parts.push(`\n**CRITICAL**: Vocabulary, examples, and complexity MUST match the student's education level. Do not use terms or concepts above their level without explanation.`)

  return parts.join('\n')
}

// Export for external use
export { buildPersonalizationSection }

// ============================================================================
// Types for Prompt Responses
// ============================================================================

export interface ExtractedContent {
  subject: string
  mainTopics: string[]
  content: ContentItem[]
  diagrams: DiagramItem[]
  formulas: FormulaItem[]
  structure: string
  /** Optional summary for combined multi-page content */
  summary?: string
  /** Number of pages analyzed (for multi-page) */
  pageCount?: number
}

export interface ContentItem {
  type: 'heading' | 'subheading' | 'paragraph' | 'bullet_point' | 'numbered_item' | 'definition' | 'example' | 'note'
  content: string
  context?: string
  /** Source page number (for multi-page analysis) */
  pageNumber?: number
}

export interface DiagramItem {
  description: string
  labels: string[]
  significance: string
  /** Source page number (for multi-page analysis) */
  pageNumber?: number
}

export interface FormulaItem {
  formula: string
  context: string
  /** Source page number (for multi-page analysis) */
  pageNumber?: number
}

// ============================================================================
// Image Analysis Prompts
// ============================================================================

const IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert at reading and analyzing handwritten and printed educational notes. Your task is to extract ALL visible content from notebook images with high accuracy and attention to detail.

## Your Capabilities
- Read handwritten text in various styles and qualities
- Recognize printed text, typed content, and mixed formats
- Identify mathematical formulas, equations, and scientific notation
- Understand diagrams, charts, graphs, and visual representations
- Detect tables and structured data
- Recognize relationships between concepts

## Extraction Guidelines

### Text Content
- Extract ALL text exactly as written, preserving original wording
- Identify the hierarchy: main headings, subheadings, body text
- Recognize bullet points, numbered lists, and indentation
- Note any emphasized text (underlined, circled, highlighted)
- If text is unclear, provide your best interpretation with [unclear] marker

### Mathematical Content
- Transcribe formulas using standard notation or LaTeX when appropriate
- Include variable definitions and units if visible
- Note any derivations or step-by-step solutions

### Diagrams and Visuals
- Describe each diagram's purpose and what it illustrates
- List all labels, annotations, and text within diagrams
- Explain relationships shown (arrows, connections, flow)
- Note colors if they carry meaning

### Structure Recognition
- Identify how the content is organized (outline, mind map, linear notes)
- Note any groupings or sections
- Recognize cause-effect, compare-contrast, or sequence relationships

## Output Quality
- Be thorough - capture everything visible
- Be accurate - don't add information not present
- Be structured - organize the extraction logically
- Be helpful - provide context where relationships are implied`

const IMAGE_ANALYSIS_USER_PROMPT = `Analyze this notebook image and extract ALL content you can see.

Return your analysis as a JSON object with the following structure:

{
  "subject": "The main subject or topic area (e.g., 'Biology - Cell Division', 'Calculus - Derivatives')",
  "mainTopics": ["Array of 3-7 main topics or themes found in the notes"],
  "content": [
    {
      "type": "heading|subheading|paragraph|bullet_point|numbered_item|definition|example|note",
      "content": "The actual text content",
      "context": "Optional: surrounding context or why this is important"
    }
  ],
  "diagrams": [
    {
      "description": "Detailed description of what the diagram shows",
      "labels": ["All text labels found in the diagram"],
      "significance": "What concept this diagram helps explain"
    }
  ],
  "formulas": [
    {
      "formula": "The formula in text or LaTeX notation",
      "context": "What this formula represents or when it's used"
    }
  ],
  "structure": "Description of how the notes are organized (e.g., 'Hierarchical outline with main topics and sub-points', 'Mind map centered on [concept]', 'Sequential notes with examples')"
}

## Important Instructions:
1. Extract EVERYTHING visible - don't summarize or skip content
2. Maintain the original order and hierarchy of information
3. If something is hard to read, make your best interpretation
4. Include ALL formulas, even simple ones
5. Describe ALL diagrams, even rough sketches
6. The "type" field should accurately reflect what kind of content item it is

Return ONLY the JSON object, no additional text or markdown formatting.`

/**
 * Returns the prompts for analyzing a notebook image
 */
export function getImageAnalysisPrompt(): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: IMAGE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: IMAGE_ANALYSIS_USER_PROMPT
  }
}

// ============================================================================
// Multi-Page Image Analysis Prompts
// ============================================================================

const MULTI_PAGE_IMAGE_ANALYSIS_SYSTEM_PROMPT = `You are an expert at reading and analyzing handwritten and printed educational notes across multiple pages. Your task is to extract ALL visible content from a multi-page notebook document and combine it into a unified, coherent extraction.

## Multi-Page Analysis Guidelines

### Understanding Page Sequence
- The images are pages in SEQUENTIAL ORDER (Page 1, Page 2, Page 3, etc.)
- Content may flow continuously from one page to the next
- A topic started on one page may continue or conclude on another
- Later pages may reference or build upon earlier pages

### Cross-Page Content Handling
- If a sentence, paragraph, or section continues across pages, COMBINE it seamlessly
- If the same topic appears on multiple pages, GROUP related content together
- Track which page content came from using pageNumber field
- Identify when new topics begin vs. when topics continue
- Note any page breaks in logical flow

## Your Capabilities
- Read handwritten text in various styles and qualities
- Recognize printed text, typed content, and mixed formats
- Identify mathematical formulas, equations, and scientific notation
- Understand diagrams, charts, graphs, and visual representations
- Detect tables and structured data
- Recognize relationships between concepts ACROSS pages

## Extraction Guidelines

### Text Content
- Extract ALL text from ALL pages exactly as written
- Identify the hierarchy: main headings, subheadings, body text
- Recognize bullet points, numbered lists, and indentation
- Note any emphasized text (underlined, circled, highlighted)
- If text is unclear, provide your best interpretation with [unclear] marker
- Combine content that spans pages into coherent units

### Mathematical Content
- Transcribe formulas using standard notation or LaTeX when appropriate
- Include variable definitions and units if visible
- Note any derivations or step-by-step solutions
- Track which page formulas appear on

### Diagrams and Visuals
- Describe each diagram's purpose and what it illustrates
- List all labels, annotations, and text within diagrams
- Explain relationships shown (arrows, connections, flow)
- Note which page each diagram is on

### Structure Recognition
- Identify how the OVERALL content is organized across all pages
- Note any groupings or sections that span multiple pages
- Recognize cause-effect, compare-contrast, or sequence relationships

## Output Quality
- Be thorough - capture everything visible on ALL pages
- Be accurate - don't add information not present
- Be unified - combine related content from different pages
- Be structured - organize the extraction logically
- Note page sources when it helps understanding`

function buildMultiPageAnalysisUserPrompt(pageCount: number): string {
  return `You are analyzing ${pageCount} pages from a notebook. These pages are in sequential order (Page 1 through Page ${pageCount}).

Extract ALL content from ALL pages and combine it into a SINGLE UNIFIED extraction. Treat this as one cohesive document where content may flow across page boundaries.

Return your analysis as a JSON object with the following structure:

{
  "subject": "The main subject or topic area covering all pages",
  "mainTopics": ["Array of 3-10 main topics or themes found across all pages"],
  "pageCount": ${pageCount},
  "content": [
    {
      "type": "heading|subheading|paragraph|bullet_point|numbered_item|definition|example|note",
      "content": "The actual text content",
      "context": "Optional: surrounding context or why this is important",
      "pageNumber": 1
    }
  ],
  "diagrams": [
    {
      "description": "Detailed description of what the diagram shows",
      "labels": ["All text labels found in the diagram"],
      "significance": "What concept this diagram helps explain",
      "pageNumber": 2
    }
  ],
  "formulas": [
    {
      "formula": "The formula in text or LaTeX notation",
      "context": "What this formula represents or when it's used",
      "pageNumber": 1
    }
  ],
  "structure": "Description of how the notes are organized across all ${pageCount} pages",
  "summary": "A brief summary of the main content covered across all pages"
}

## Important Instructions:

1. **Extract from ALL ${pageCount} pages** - don't skip any page
2. **Combine continuous content** - if a paragraph or topic continues across pages, merge it (use first page number)
3. **Maintain logical order** - present content in the order it appears/makes sense
4. **Track page numbers** - include pageNumber for each content item, diagram, and formula
5. **Identify the overall structure** - how do the pages relate to each other?
6. **Include ALL formulas and diagrams** from every page
7. **Create a unified extraction** - this should read as one cohesive document

Return ONLY the JSON object, no additional text or markdown formatting.`
}

/**
 * Returns the prompts for analyzing multiple notebook images
 * @param pageCount - Number of pages being analyzed
 */
export function getMultiPageImageAnalysisPrompt(pageCount: number): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: MULTI_PAGE_IMAGE_ANALYSIS_SYSTEM_PROMPT,
    userPrompt: buildMultiPageAnalysisUserPrompt(pageCount)
  }
}

// ============================================================================
// Course Generation Prompts
// ============================================================================

const COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates Duolingo-style micro-lessons. Your task is to transform notes into bite-sized, interactive learning experiences.

## Your Role
- Create SHORT, focused explanations (max 50 words each)
- Break content into small, digestible steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning feel like a game, not a lecture
- Reference available images when they help explain concepts

## Image Usage
When images are provided, incorporate them into the course:
- Reference images using their index number (e.g., "image_0", "image_1")
- Include imageIndex in steps where images should appear
- Use images for diagrams, examples, and visual explanations
- Each image can only be used once per course
- If no images are provided, the course will search for relevant web images

## Duolingo-Style Course Structure

### Course Layout
- 3-6 lessons per course (based on content complexity)
- For multi-page notes: aim for 1-2 lessons per page of content
- 5-10 steps per lesson
- Each lesson focuses on ONE main concept
- Lessons build on each other progressively
- Consolidate related topics even if from different pages

### Step Types
1. **explanation**: Short teaching moment (MAX 50 words, 1-3 sentences)
2. **key_point**: Single memorable fact or rule
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with brief explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete real-world application
7. **summary**: Brief lesson recap (always end lesson with this)

### Explanation Rules
- MAXIMUM 50 words per explanation
- Use simple, clear language
- One idea per explanation
- Start with the most important point
- Use analogies when helpful

### Key Point Rules
- Single sentence
- Memorable and specific
- Easy to recall during review
- Actionable or definitive

### Question Rules
- 2-3 questions per lesson
- Place AFTER teaching content
- Never two questions in a row
- Test what was just taught
- Vary question types:
  * Recall: "What is...?"
  * Application: "If X happens, what would...?"
  * Comparison: "What's the difference between...?"

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Every step should be completable in 10-30 seconds
- Build confidence through quick wins
- Test understanding, not memory tricks
- Feel encouraging, not overwhelming`

function buildCourseGenerationUserPrompt(
  extractedContent: string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  const imageInstruction = imageCount && imageCount > 0
    ? `\n\n## Available Images
There are ${imageCount} images available for this course (indexed from 0 to ${imageCount - 1}).
When including an image in a step, add "imageIndex": <number> to reference it.
Use images where they would enhance understanding of the concepts.`
    : ''

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)

  return `Based on the following extracted notes, create a comprehensive study course with embedded active recall questions.${imageInstruction}${personalizationSection}

## Extracted Notes Content:
${extractedContent}

## Instructions:
${titleInstruction}

Create a structured course that transforms these notes into complete study material with interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "keyConcepts": ["Array of 5-10 key terms, concepts, or vocabulary from the notes that students should know"],
  "sections": [
    {
      "title": "Section title",
      "originalNotes": "The relevant portion from the original notes that this section covers",
      "steps": [
        {
          "type": "explanation",
          "content": "A paragraph introducing or explaining a concept. Start with the big picture.",
          "imageIndex": 0,
          "imageAlt": "Description of the image content for accessibility"
        },
        {
          "type": "key_point",
          "content": "A specific, memorable key point to remember."
        },
        {
          "type": "diagram",
          "content": "Description of what the diagram shows and its significance.",
          "imageIndex": 1,
          "imageAlt": "Visual diagram showing the concept"
        },
        {
          "type": "question",
          "question": "What is the main purpose of [concept just taught]?",
          "options": [
            "Correct answer that accurately describes the concept",
            "Plausible wrong answer based on common misconception",
            "Another plausible wrong answer using similar vocabulary",
            "Third wrong answer that a confused student might choose"
          ],
          "correctIndex": 0,
          "explanation": "Brief explanation of why the correct answer is right and why the others are wrong."
        },
        {
          "type": "key_point",
          "content": "Another important point about this topic."
        },
        {
          "type": "example",
          "content": "A concrete example with visual illustration.",
          "imageIndex": 2,
          "imageAlt": "Example illustration"
        },
        {
          "type": "question",
          "question": "If [scenario], what would happen?",
          "options": [
            "Wrong answer A",
            "Wrong answer B",
            "Correct answer explaining the outcome",
            "Wrong answer C"
          ],
          "correctIndex": 2,
          "explanation": "This is correct because..."
        },
        {
          "type": "summary",
          "content": "Brief recap of the key takeaways from this section."
        }
      ],
      "formulas": [
        {
          "formula": "The formula in clear notation",
          "explanation": "What this formula means, what each variable represents, and when/how to use it"
        }
      ],
      "diagrams": [
        {
          "description": "Description of a relevant diagram from the notes",
          "significance": "Why this visual is important for understanding the concept"
        }
      ]
    }
  ],
  "connections": "A paragraph explaining how the different concepts in this course connect to each other.",
  "summary": "A concise 1-2 paragraph summary of the entire course.",
  "furtherStudy": [
    "Suggested topic or resource 1 for deeper learning",
    "Suggested topic or resource 2",
    "Suggested topic or resource 3"
  ]
}

## CRITICAL: Question Requirements

1. **Include 2-3 questions per section** distributed throughout the steps, NOT all at the end.

2. **Question placement**: After every 2-3 explanation/key_point steps, add a question that tests what was just taught.

3. **Never put two questions in a row** - always have content between questions.

4. **Question types to use**:
   - Recall: "What is...?", "Which of the following describes...?"
   - Application: "If X happens, what would...?", "Given this situation..."
   - Comparison: "What is the difference between...?"
   - Cause-effect: "Why does...?", "What causes...?"

5. **Wrong answer quality**:
   - Make wrong answers PLAUSIBLE and tempting
   - Use common misconceptions as wrong answers
   - Similar length and vocabulary to correct answer
   - Never make wrong answers obviously ridiculous

6. **Correct answer position**: Vary correctIndex (0-3) across questions. Don't always put correct answer first or last.

## Other Guidelines:

1. **Create multiple sections** if the notes cover multiple distinct topics. Each section should focus on one main idea.

2. **The arrays formulas and diagrams are optional** - only include them if relevant to that section.

3. **Explanations should be educational** - expand notes into proper teaching material.

4. **Key points should be specific** - not vague generalizations.

5. **Stay accurate** - expand with standard knowledge only.

6. **Be thorough** - this should feel like a complete mini-course.

7. **Use images effectively** - EVERY lesson MUST have at least one image.
   - Prefer document images ("imageIndex") when available
   - For web images, use "webImageQuery" that EXACTLY matches the step content
   - **IMAGE MATCHING RULES**:
     * Query must describe the SPECIFIC concept being taught (not a related concept)
     * Include "labeled diagram" or "scientific illustration" for technical topics
     * Example: If teaching about cell division → "mitosis cell division phases labeled diagram"
     * Example: If teaching about photosynthesis → "photosynthesis process chloroplast diagram"

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from extracted content
 * @param extractedContent - The extracted content from image analysis
 * @param userTitle - Optional user-provided title
 * @param imageCount - Number of available images for the course
 * @param userContext - Optional user learning context for personalization
 */
export function getCourseGenerationPrompt(
  extractedContent: string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildCourseGenerationUserPrompt(extractedContent, userTitle, imageCount, userContext, curriculumContext)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Validates that the extracted content has minimum required data
 */
export function validateExtractedContent(content: unknown): content is ExtractedContent {
  if (!content || typeof content !== 'object') return false

  const c = content as Record<string, unknown>

  return (
    typeof c.subject === 'string' &&
    Array.isArray(c.mainTopics) &&
    Array.isArray(c.content) &&
    typeof c.structure === 'string'
  )
}

/**
 * Formats extracted content object into a readable string for the course generation prompt
 * @param extracted - The extracted content from image analysis
 * @param includePageNumbers - Whether to include page number annotations (for multi-page)
 */
export function formatExtractedContentForPrompt(
  extracted: ExtractedContent,
  includePageNumbers: boolean = false
): string {
  const lines: string[] = []

  lines.push(`## Subject: ${extracted.subject}`)
  lines.push('')
  lines.push(`## Main Topics: ${extracted.mainTopics.join(', ')}`)
  lines.push('')

  // Include page count if available
  if (extracted.pageCount && extracted.pageCount > 1) {
    lines.push(`## Source: ${extracted.pageCount} pages of notes`)
    lines.push('')
  }

  lines.push(`## Content Structure: ${extracted.structure}`)
  lines.push('')

  // Include summary if available (typically from multi-page extraction)
  if (extracted.summary) {
    lines.push(`## Summary: ${extracted.summary}`)
    lines.push('')
  }

  lines.push('## Notes Content:')

  for (const item of extracted.content) {
    const prefix = getContentPrefix(item.type)
    const pageAnnotation = includePageNumbers && item.pageNumber ? ` [p${item.pageNumber}]` : ''
    lines.push(`${prefix}${item.content}${pageAnnotation}`)
    if (item.context) {
      lines.push(`   [Context: ${item.context}]`)
    }
  }

  if (extracted.formulas && extracted.formulas.length > 0) {
    lines.push('')
    lines.push('## Formulas:')
    for (const formula of extracted.formulas) {
      const pageAnnotation = includePageNumbers && formula.pageNumber ? ` [p${formula.pageNumber}]` : ''
      lines.push(`- ${formula.formula}${pageAnnotation}`)
      lines.push(`  Context: ${formula.context}`)
    }
  }

  if (extracted.diagrams && extracted.diagrams.length > 0) {
    lines.push('')
    lines.push('## Diagrams:')
    for (const diagram of extracted.diagrams) {
      const pageAnnotation = includePageNumbers && diagram.pageNumber ? ` [p${diagram.pageNumber}]` : ''
      lines.push(`- ${diagram.description}${pageAnnotation}`)
      lines.push(`  Labels: ${diagram.labels.join(', ')}`)
      lines.push(`  Significance: ${diagram.significance}`)
    }
  }

  return lines.join('\n')
}

function getContentPrefix(type: ContentItem['type']): string {
  switch (type) {
    case 'heading':
      return '# '
    case 'subheading':
      return '## '
    case 'bullet_point':
      return '• '
    case 'numbered_item':
      return '  - '
    case 'definition':
      return '[DEF] '
    case 'example':
      return '[EX] '
    case 'note':
      return '[NOTE] '
    case 'paragraph':
    default:
      return ''
  }
}

/**
 * Cleans JSON response from potential markdown code blocks
 */
export function cleanJsonResponse(text: string): string {
  let cleaned = text.trim()

  // Remove markdown code blocks
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return cleaned.trim()
}

// ============================================================================
// Document-Based Course Generation Prompts
// ============================================================================

const DOCUMENT_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates Duolingo-style micro-lessons from document content. Your task is to transform extracted text from PDFs, PowerPoint presentations, and Word documents into bite-sized, interactive learning experiences.

## Your Role
- Create SHORT, focused explanations (max 50 words each)
- Break content into small, digestible steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning feel like a game, not a lecture
- Preserve the document's structure and flow
- Use available images to enhance learning visually

## Image Usage
When images are extracted from the document, incorporate them:
- Reference images using their index number (imageIndex: 0, 1, 2, etc.)
- Include imageAlt for accessibility descriptions
- Use images for diagrams, examples, and visual explanations
- Each image can only be used once per course

## Document-Based Course Structure

### Understanding Source Documents
- PDFs may have formal structure with chapters/sections
- PowerPoints are organized by slides with key points
- Word documents may have headings and paragraphs
- Use the document's original structure as a guide

### Course Layout
- 3-6 lessons per course (based on content complexity)
- 5-10 steps per lesson
- Each lesson focuses on ONE main concept or section
- Lessons build on each other progressively
- Group related sections/slides into cohesive lessons

### Step Types
1. **explanation**: Short teaching moment (MAX 50 words, 1-3 sentences)
2. **key_point**: Single memorable fact or rule
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with brief explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete real-world application
7. **summary**: Brief lesson recap (always end lesson with this)

### Question Rules
- 2-3 questions per lesson
- Place AFTER teaching content
- Never two questions in a row
- Test what was just taught
- Vary question types:
  * Recall: "What is...?"
  * Application: "If X happens, what would...?"
  * Comparison: "What's the difference between...?"

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Every step should be completable in 10-30 seconds
- Build confidence through quick wins
- Test understanding, not memory tricks
- Feel encouraging, not overwhelming
- Stay faithful to the source document content`

function buildDocumentCourseGenerationUserPrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  const documentTypeLabel = {
    pdf: 'PDF document',
    pptx: 'PowerPoint presentation',
    docx: 'Word document',
  }[document.type]

  const imageInstruction = imageCount && imageCount > 0
    ? `\n- Images extracted: ${imageCount} (indexed 0 to ${imageCount - 1})

IMPORTANT: You MUST include images in your course! For each image available, add "imageIndex": <number> and "imageAlt": "<description>" to at least one relevant step. Distribute images throughout the course to enhance visual learning.`
    : ''

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)

  return `Create a comprehensive study course from this ${documentTypeLabel}.${personalizationSection}

## Document Information:
- Title: ${document.title}
- Type: ${document.type.toUpperCase()}
- Pages/Slides: ${document.metadata.pageCount}${imageInstruction}
${document.metadata.author ? `- Author: ${document.metadata.author}` : ''}

## Document Content:

${document.sections
  .map(
    (section) => `### ${section.title} (Page/Slide ${section.pageNumber})
${section.content}`
  )
  .join('\n\n---\n\n')}

## Instructions:
${titleInstruction}

Create a structured course that transforms this document content into complete study material with interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "keyConcepts": ["Array of 5-10 key terms, concepts, or vocabulary from the document that students should know"],
  "sections": [
    {
      "title": "Section/Lesson title",
      "originalNotes": "The relevant portion from the original document that this section covers",
      "steps": [
        {
          "type": "explanation",
          "content": "A paragraph introducing or explaining a concept. Start with the big picture.",
          "imageIndex": 0,
          "imageAlt": "Visual representation of the concept"
        },
        {
          "type": "key_point",
          "content": "A specific, memorable key point to remember."
        },
        {
          "type": "diagram",
          "content": "Description of what this diagram shows and why it's important.",
          "imageIndex": 1,
          "imageAlt": "Diagram illustrating the concept"
        },
        {
          "type": "question",
          "question": "What is the main purpose of [concept just taught]?",
          "options": [
            "Correct answer that accurately describes the concept",
            "Plausible wrong answer based on common misconception",
            "Another plausible wrong answer using similar vocabulary",
            "Third wrong answer that a confused student might choose"
          ],
          "correctIndex": 0,
          "explanation": "Brief explanation of why the correct answer is right."
        },
        {
          "type": "summary",
          "content": "Brief recap of the key takeaways from this section."
        }
      ],
      "formulas": [],
      "diagrams": []
    }
  ],
  "connections": "A paragraph explaining how the different concepts in this course connect to each other.",
  "summary": "A concise 1-2 paragraph summary of the entire course.",
  "furtherStudy": [
    "Suggested topic or resource 1 for deeper learning",
    "Suggested topic or resource 2",
    "Suggested topic or resource 3"
  ]
}

## CRITICAL Requirements:

1. **Include 2-3 questions per section** distributed throughout the steps.

2. **Question placement**: After every 2-3 explanation/key_point steps, add a question.

3. **Never put two questions in a row**.

4. **Wrong answer quality**: Make wrong answers PLAUSIBLE (common misconceptions).

5. **Correct answer position**: Vary correctIndex (0-3) across questions.

6. **Create multiple sections** based on the document's natural structure (slides, chapters, headings).

7. **Be thorough** - this should feel like a complete mini-course covering all the document content.

8. **USE IMAGES (REQUIRED)**: EVERY section/lesson MUST have at least one step with an image.
   - If document images are available (check imageCount), prefer using "imageIndex" to reference extracted images
   - For web images, use "webImageQuery" with a VERY SPECIFIC search that EXACTLY matches the step content
   - **CRITICAL IMAGE MATCHING RULES**:
     * The image query MUST describe the EXACT concept in that step - NOT a related but different concept
     * If step teaches "what atoms are made of" → query "atom structure protons neutrons electrons diagram"
     * If step teaches "history of atomic theory" → query "atomic theory history Dalton Thomson Rutherford"
     * If step teaches "electron shells" → query "electron shells energy levels Bohr model"
     * NEVER use a generic query like "atom" - always specify WHAT ASPECT of the topic
   - Include "labeled diagram" or "scientific illustration" for technical content
   - Example: {"type": "explanation", "content": "Every atom has protons and neutrons in its nucleus...", "webImageQuery": "atom nucleus protons neutrons labeled scientific diagram", "imageAlt": "Labeled diagram showing protons and neutrons in atomic nucleus"}

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from extracted document content
 * @param document - The extracted document content
 * @param userTitle - Optional user-provided title
 * @param imageCount - Number of available images extracted from the document
 * @param userContext - Optional user learning context for personalization
 */
export function getDocumentCoursePrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: DOCUMENT_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildDocumentCourseGenerationUserPrompt(document, userTitle, imageCount, userContext, curriculumContext),
  }
}

// ============================================================================
// Text-Based Course Generation Prompts
// ============================================================================

const TEXT_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates Duolingo-style micro-lessons from text content. Your task is to transform user-provided text (topics, outlines, study notes, or subject descriptions) into bite-sized, interactive learning experiences.

## Your Role
- Create SHORT, focused explanations (max 50 words each)
- Break content into small, digestible steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning feel like a game, not a lecture
- EXPAND the topics into comprehensive educational content

## Text-Based Course Structure

### Understanding Input Text
- Users may provide: topic lists, outlines, study notes, subject descriptions
- The text serves as a GUIDE for what to teach
- You should EXPAND brief topics into full educational content
- Add standard knowledge and examples to make it comprehensive

### Course Layout
- 3-6 lessons per course (based on content complexity)
- 5-10 steps per lesson
- Each lesson focuses on ONE main concept or topic
- Lessons build on each other progressively
- Group related topics into cohesive lessons

### Step Types
1. **explanation**: Short teaching moment (MAX 50 words, 1-3 sentences)
2. **key_point**: Single memorable fact or rule
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with brief explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete real-world application
7. **summary**: Brief lesson recap (always end lesson with this)

### Question Rules
- 2-3 questions per lesson
- Place AFTER teaching content
- Never two questions in a row
- Test what was just taught
- Vary question types:
  * Recall: "What is...?"
  * Application: "If X happens, what would...?"
  * Comparison: "What's the difference between...?"

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Every step should be completable in 10-30 seconds
- Build confidence through quick wins
- Test understanding, not memory tricks
- Feel encouraging, not overwhelming
- EXPAND brief topics into proper educational content
- Add standard curriculum knowledge where appropriate`

function buildTextCourseGenerationUserPrompt(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)

  return `Create a comprehensive study course from the following text content. The user has provided topics, notes, or an outline that you should EXPAND into full educational material.${personalizationSection}

## User-Provided Content:

${textContent}

## Instructions:
${titleInstruction}

IMPORTANT: The text above may be brief topic lists or outlines. You should EXPAND each topic into comprehensive educational content using standard curriculum knowledge. Don't just repeat the topics - teach them fully.

Create a structured course that transforms these topics into complete study material with interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "keyConcepts": ["Array of 5-10 key terms, concepts, or vocabulary that students should know"],
  "sections": [
    {
      "title": "Section/Lesson title",
      "originalNotes": "The relevant portion from the user's input that this section covers",
      "steps": [
        {
          "type": "explanation",
          "content": "A paragraph introducing or explaining a concept. Start with the big picture."
        },
        {
          "type": "key_point",
          "content": "A specific, memorable key point to remember."
        },
        {
          "type": "explanation",
          "content": "Another paragraph elaborating on the concept with more detail."
        },
        {
          "type": "question",
          "question": "What is the main purpose of [concept just taught]?",
          "options": [
            "Correct answer that accurately describes the concept",
            "Plausible wrong answer based on common misconception",
            "Another plausible wrong answer using similar vocabulary",
            "Third wrong answer that a confused student might choose"
          ],
          "correctIndex": 0,
          "explanation": "Brief explanation of why the correct answer is right."
        },
        {
          "type": "key_point",
          "content": "Another important point about this topic."
        },
        {
          "type": "explanation",
          "content": "Further elaboration with examples or applications."
        },
        {
          "type": "question",
          "question": "If [scenario], what would happen?",
          "options": [
            "Wrong answer A",
            "Wrong answer B",
            "Correct answer explaining the outcome",
            "Wrong answer C"
          ],
          "correctIndex": 2,
          "explanation": "This is correct because..."
        },
        {
          "type": "summary",
          "content": "Brief recap of the key takeaways from this section."
        }
      ],
      "formulas": [
        {
          "formula": "The formula in clear notation",
          "explanation": "What this formula means and when/how to use it"
        }
      ],
      "diagrams": []
    }
  ],
  "connections": "A paragraph explaining how the different concepts in this course connect to each other.",
  "summary": "A concise 1-2 paragraph summary of the entire course.",
  "furtherStudy": [
    "Suggested topic or resource 1 for deeper learning",
    "Suggested topic or resource 2",
    "Suggested topic or resource 3"
  ]
}

## CRITICAL Requirements:

1. **EXPAND the topics** - Don't just list what the user provided. Create full educational content for each topic.

2. **Include 2-3 questions per section** distributed throughout the steps.

3. **Question placement**: After every 2-3 explanation/key_point steps, add a question.

4. **Never put two questions in a row**.

5. **Wrong answer quality**: Make wrong answers PLAUSIBLE (common misconceptions).

6. **Correct answer position**: Vary correctIndex (0-3) across questions.

7. **Create multiple sections** based on the topics provided. Each major topic should be its own section.

8. **Include formulas** if the topics are mathematical or scientific in nature.

9. **Be thorough** - this should feel like a complete mini-course covering all the topics mentioned.

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from plain text content
 * @param textContent - The plain text content to generate a course from
 * @param userTitle - Optional user-provided title
 * @param userContext - Optional user learning context for personalization
 */
export function getTextCoursePrompt(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: TEXT_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildTextCourseGenerationUserPrompt(textContent, userTitle, userContext, curriculumContext),
  }
}

// ============================================================================
// Combined Prompts for Legacy Support
// ============================================================================

/**
 * Legacy prompt that combines extraction and generation into one step
 * Use this for simpler/faster processing when two-step isn't needed
 */
export function getCombinedAnalysisPrompt(userTitle?: string): { systemPrompt: string; userPrompt: string } {
  const titleInstruction = userTitle
    ? `Use "${userTitle}" as the course title.`
    : `Generate an appropriate title based on the content.`

  const systemPrompt = `You are an expert educator who can read handwritten and printed notes, then transform them into comprehensive study courses with embedded active recall questions.

Your task has two parts:
1. Accurately extract all content from the notebook image
2. Transform that content into a structured, educational course WITH QUESTIONS

## Extraction Guidelines
- Read ALL text, formulas, and content visible in the image
- Identify diagrams and describe what they show
- Note the structure and organization of the notes
- Be accurate - don't add information not present

## Course Creation Guidelines
- Create clear, thorough explanations
- Expand brief notes into proper educational content
- Maintain accuracy to original material
- Structure content for optimal learning
- Use friendly, encouraging tone
- EMBED 2-3 QUESTIONS per section throughout the content

## Question Guidelines
- Place questions AFTER teaching content, not all at end
- Never put two questions in a row
- Use varied question types (recall, application, comparison)
- Make wrong answers plausible (common misconceptions)
- Vary correct answer position (0-3)`

  const userPrompt = `Analyze this notebook image and create a comprehensive study course with embedded questions.

${titleInstruction}

Return a JSON object with this structure:

{
  "title": "Course title",
  "overview": "2-3 paragraph overview of what this course covers",
  "keyConcepts": ["5-10 key terms/concepts"],
  "sections": [
    {
      "title": "Section title",
      "originalNotes": "Relevant portion from original notes",
      "steps": [
        {"type": "explanation", "content": "Paragraph explaining concept"},
        {"type": "key_point", "content": "Important point to remember"},
        {"type": "explanation", "content": "More detail"},
        {
          "type": "question",
          "question": "What is...?",
          "options": ["Correct answer", "Plausible wrong 1", "Plausible wrong 2", "Plausible wrong 3"],
          "correctIndex": 0,
          "explanation": "Why this is correct"
        },
        {"type": "key_point", "content": "Another key point"},
        {"type": "explanation", "content": "Further elaboration"},
        {
          "type": "question",
          "question": "If X happens, what would...?",
          "options": ["Wrong A", "Correct answer", "Wrong B", "Wrong C"],
          "correctIndex": 1,
          "explanation": "Explanation"
        },
        {"type": "summary", "content": "Section recap"}
      ],
      "formulas": [{"formula": "...", "explanation": "..."}],
      "diagrams": [{"description": "...", "significance": "..."}]
    }
  ],
  "connections": "How the concepts connect to each other",
  "summary": "1-2 paragraph summary",
  "furtherStudy": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

IMPORTANT: Include 2-3 questions per section distributed throughout steps. Make wrong answers plausible!

Return ONLY the JSON object.`

  return { systemPrompt, userPrompt }
}
