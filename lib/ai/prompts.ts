/**
 * AI Prompts for NoteSnap
 *
 * This file contains all the prompts used for:
 * 1. Analyzing notebook images and extracting content
 * 2. Generating structured study courses from extracted content
 * 3. Generating courses from document content (PDF, PPTX, DOCX)
 */

import type { ExtractedDocument } from '@/lib/documents'

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

function buildCourseGenerationUserPrompt(extractedContent: string, userTitle?: string): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  return `Based on the following extracted notes, create a comprehensive study course with embedded active recall questions.

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
          "explanation": "Brief explanation of why the correct answer is right and why the others are wrong."
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

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from extracted content
 */
export function getCourseGenerationPrompt(
  extractedContent: string,
  userTitle?: string
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildCourseGenerationUserPrompt(extractedContent, userTitle)
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
  userTitle?: string
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  const documentTypeLabel = {
    pdf: 'PDF document',
    pptx: 'PowerPoint presentation',
    docx: 'Word document',
  }[document.type]

  return `Create a comprehensive study course from this ${documentTypeLabel}.

## Document Information:
- Title: ${document.title}
- Type: ${document.type.toUpperCase()}
- Pages/Slides: ${document.metadata.pageCount}
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

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from extracted document content
 */
export function getDocumentCoursePrompt(
  document: ExtractedDocument,
  userTitle?: string
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: DOCUMENT_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildDocumentCourseGenerationUserPrompt(document, userTitle),
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
