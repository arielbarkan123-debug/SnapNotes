/**
 * AI Prompts for NoteSnap
 *
 * This file contains all the prompts used for:
 * 1. Analyzing notebook images and extracting content
 * 2. Generating structured study courses from extracted content
 */

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
}

export interface ContentItem {
  type: 'heading' | 'subheading' | 'paragraph' | 'bullet_point' | 'numbered_item' | 'definition' | 'example' | 'note'
  content: string
  context?: string
}

export interface DiagramItem {
  description: string
  labels: string[]
  significance: string
}

export interface FormulaItem {
  formula: string
  context: string
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
// Course Generation Prompts
// ============================================================================

const COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator and course designer with deep knowledge across academic subjects. Your task is to transform extracted notes into comprehensive, engaging study materials.

## Your Role
- Create clear, thorough explanations that expand on brief notes
- Maintain complete accuracy to the original content (never invent facts)
- Use a friendly, encouraging educational tone
- Structure content for optimal learning and retention
- Connect concepts to build understanding

## Course Design Principles

### Explanations
- Start with the big picture, then dive into details
- Use analogies and real-world connections when helpful
- Break complex ideas into digestible chunks
- Anticipate common confusion points and address them

### Structure
- Organize content in a logical learning sequence
- Group related concepts together
- Create clear transitions between topics
- Build from foundational to advanced concepts

### Engagement
- Use clear, active language
- Include relevant examples that illustrate concepts
- Highlight key takeaways and important points
- Suggest practical applications where appropriate

### Accuracy
- Stay faithful to the original notes' content
- Only expand with commonly accepted knowledge
- Don't add speculative or potentially incorrect information
- If notes are unclear, explain what can be determined

## Quality Standards
- Every explanation should help a student truly understand, not just memorize
- Key points should be specific and actionable
- Examples should be concrete and relevant
- The course should feel complete and professional`

function buildCourseGenerationUserPrompt(extractedContent: string, userTitle?: string): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  return `Based on the following extracted notes, create a comprehensive study course.

## Extracted Notes Content:
${extractedContent}

## Instructions:
${titleInstruction}

Create a structured course that transforms these notes into complete study material. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "keyConcepts": ["Array of 5-10 key terms, concepts, or vocabulary from the notes that students should know"],
  "sections": [
    {
      "title": "Section title",
      "explanation": "2-3 paragraphs providing a thorough, clear explanation of this topic. Expand on the notes with proper educational content. Use examples and analogies where helpful.",
      "originalNotes": "The relevant portion from the original notes that this section covers (quote or paraphrase)",
      "keyPoints": [
        "Specific, actionable key point 1",
        "Specific, actionable key point 2",
        "Specific, actionable key point 3"
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
      ],
      "examples": [
        "Concrete example 1 that illustrates the concept",
        "Concrete example 2 showing application"
      ]
    }
  ],
  "connections": "A paragraph explaining how the different concepts in this course connect to each other. Help the student see the bigger picture and understand relationships between topics.",
  "summary": "A concise 1-2 paragraph summary of the entire course. Highlight the most important takeaways and reinforce core concepts.",
  "furtherStudy": [
    "Suggested topic or resource 1 for deeper learning",
    "Suggested topic or resource 2",
    "Suggested topic or resource 3"
  ]
}

## Important Guidelines:

1. **Create multiple sections** if the notes cover multiple distinct topics or concepts. Each section should focus on one main idea.

2. **The arrays formulas, diagrams, and examples are optional** - only include them if relevant to that section. Don't force-include empty arrays.

3. **Explanations should be educational** - don't just repeat the notes, expand them into proper teaching material that would help a student understand.

4. **Key points should be specific** - not vague generalizations. A student should be able to act on or remember each key point.

5. **Stay accurate** - expand on the notes with standard knowledge, but don't add speculative or potentially incorrect information.

6. **Be thorough** - this should feel like a complete mini-course on the topic, not a brief summary.

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
 */
export function formatExtractedContentForPrompt(extracted: ExtractedContent): string {
  const lines: string[] = []

  lines.push(`## Subject: ${extracted.subject}`)
  lines.push('')
  lines.push(`## Main Topics: ${extracted.mainTopics.join(', ')}`)
  lines.push('')
  lines.push(`## Content Structure: ${extracted.structure}`)
  lines.push('')
  lines.push('## Notes Content:')

  for (const item of extracted.content) {
    const prefix = getContentPrefix(item.type)
    lines.push(`${prefix}${item.content}`)
    if (item.context) {
      lines.push(`   [Context: ${item.context}]`)
    }
  }

  if (extracted.formulas.length > 0) {
    lines.push('')
    lines.push('## Formulas:')
    for (const formula of extracted.formulas) {
      lines.push(`- ${formula.formula}`)
      lines.push(`  Context: ${formula.context}`)
    }
  }

  if (extracted.diagrams.length > 0) {
    lines.push('')
    lines.push('## Diagrams:')
    for (const diagram of extracted.diagrams) {
      lines.push(`- ${diagram.description}`)
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

  const systemPrompt = `You are an expert educator who can read handwritten and printed notes, then transform them into comprehensive study courses.

Your task has two parts:
1. Accurately extract all content from the notebook image
2. Transform that content into a structured, educational course

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
- Use friendly, encouraging tone`

  const userPrompt = `Analyze this notebook image and create a comprehensive study course from its contents.

${titleInstruction}

Return a JSON object with this structure:

{
  "title": "Course title",
  "overview": "2-3 paragraph overview of what this course covers",
  "keyConcepts": ["5-10 key terms/concepts"],
  "sections": [
    {
      "title": "Section title",
      "explanation": "2-3 paragraphs explaining this topic thoroughly",
      "originalNotes": "Relevant portion from original notes",
      "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
      "formulas": [{"formula": "...", "explanation": "..."}],
      "diagrams": [{"description": "...", "significance": "..."}],
      "examples": ["Example 1", "Example 2"]
    }
  ],
  "connections": "How the concepts connect to each other",
  "summary": "1-2 paragraph summary",
  "furtherStudy": ["Suggestion 1", "Suggestion 2", "Suggestion 3"]
}

Note: formulas, diagrams, and examples arrays are optional per section.

Return ONLY the JSON object.`

  return { systemPrompt, userPrompt }
}
