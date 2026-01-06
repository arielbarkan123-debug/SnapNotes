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
import {
  type AgeGroupConfig,
  getAgeGroupConfig,
  getVocabularyInstructions,
  getAbstractionInstructions,
} from '@/lib/learning/age-config'
import type { LessonIntensityMode } from '@/types'
import { getIntensityConfig } from '@/lib/learning/intensity-config'
import { detectMathTopic, getMathMethodsPromptInstructions, ALL_MATH_METHODS } from './math-methods'
import { getVisualGuidanceForPrompt, getFullVisualGuidance, ERROR_VISUAL_GUIDANCE } from './visual-guidance'

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

// Helper function to get education level description for prompts (kept for backwards compatibility)
function _getEducationLevelDescription(level: UserLearningContext['educationLevel']): string {
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
    israeli_bagrut: getBagrutContext(),
    ib: 'The student is in the IB (International Baccalaureate) program. Emphasize critical thinking and international perspectives.',
    ap: 'The student is taking AP (Advanced Placement) courses. Prepare content at college-level rigor.',
    other: '',
  }
  return contexts[system]
}

// Get Israeli Bagrut context
function getBagrutContext(): string {
  return `The student is preparing for Israeli Bagrut (בגרות) exams.

**DO:** Focus on problem-solving techniques, step-by-step solutions, worked examples.
**DON'T:** Include exam logistics, point values, time limits, admin info.

Use Hebrew math terms alongside English where appropriate.`
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

// ============================================================================
// Age-Specific Learning Instructions
// ============================================================================

/**
 * Builds comprehensive age-specific instructions for course generation
 * Based on research: Adaptive AI systems improved post-assessment scores 68.4 → 82.7
 */
function buildAgeSpecificInstructions(config: AgeGroupConfig): string {
  return `
## Age-Appropriate Learning Design (${config.name})

### Lesson Structure Parameters:
- Target lesson duration: ${config.lessonLength.optimal} minutes (range: ${config.lessonLength.min}-${config.lessonLength.max} minutes)
- Steps per lesson: ${config.stepsPerLesson.min}-${config.stepsPerLesson.max} steps
- Words per explanation: ${config.wordsPerExplanation.min}-${config.wordsPerExplanation.max} words
- Required worked examples per lesson: ${config.examplesRequired}

### Vocabulary & Language:
${getVocabularyInstructions(config)}

### Content Abstraction Level:
${getAbstractionInstructions(config)}

### Visual Content:
- ${Math.round(config.visualContentWeight * 100)}% of explanations should include visual elements
${config.visualContentWeight > 0.5 ? '- PRIORITIZE diagrams, images, and visual aids over lengthy text' : ''}
${config.visualContentWeight > 0.6 ? '- Use colorful, engaging visuals suitable for younger learners' : ''}

### Question Design:
- Question types to use: ${config.questionTypes.join(', ')}
- Questions per lesson: ${config.questionsPerLesson.min}-${config.questionsPerLesson.max}
- Difficulty range: ${config.difficultyRange.min}-${config.difficultyRange.max} (on 1-10 scale)
${config.feedbackStyle === 'immediate_positive' ? '- Focus on encouragement and celebration of correct answers' : ''}
${config.feedbackStyle === 'timely_explanatory' ? '- Provide clear explanations for both correct and incorrect answers' : ''}
${config.feedbackStyle === 'detailed_constructive' ? '- Provide detailed reasoning and improvement suggestions' : ''}

### Engagement & Breaks:
- Suggest breaks every ${config.breakFrequency} minutes
- Include ${config.interactiveElementsPerLesson} interactive elements per lesson
- Information chunks: ${config.chunkSize} (adjust content density accordingly)
`
}

/**
 * Gets enhanced education level description incorporating age-group research
 */
function getEnhancedEducationDescription(
  level: UserLearningContext['educationLevel'],
  _config: AgeGroupConfig
): string {
  const baseDescriptions: Record<UserLearningContext['educationLevel'], string> = {
    elementary: `Student is ages 6-11 (elementary school).
- Use VERY simple vocabulary (words a child knows)
- Short sentences (max 10-12 words)
- Lots of fun examples from daily life (toys, games, food, animals)
- Heavy use of encouraging language and celebration
- Avoid abstract concepts - make everything concrete and touchable
- Use visual metaphors and relatable scenarios`,

    middle_school: `Student is ages 11-14 (middle school).
- Clear, accessible language with new vocabulary introduced carefully
- Relatable examples (school, friends, hobbies, sports)
- Step-by-step concept building with scaffolding
- Some challenge is good - they can handle more complexity
- Connect topics to things they care about
- Use analogies to explain abstract ideas
- Include some competitive elements for engagement`,

    high_school: `Student is ages 14-18 (high school).
- Age-appropriate vocabulary with technical terms as needed
- Real-world applications and exam relevance
- Deeper conceptual understanding required
- Prepare for standardized tests and exams
- Show reasoning and proof techniques
- Connect to career and future relevance
- Balance challenge with support`,

    university: `Student is ages 18-22 (university/college).
- Academic language and scholarly concepts
- Theoretical depth and critical analysis
- Research-based examples and citations
- Encourage independent thinking
- Complex multi-step problems
- Professional context and applications
- Self-directed learning emphasis`,

    graduate: `Student is graduate level (Masters/PhD).
- Advanced academic terminology
- Deep theoretical understanding expected
- Research methodology and critical evaluation
- Independent synthesis of complex ideas
- Scholarly discourse conventions
- Original thinking encouraged`,

    professional: `Student is adult/professional learner (22+).
- Efficient, practical content - respect their time
- Real-world workplace applications
- Actionable insights they can use immediately
- Assume life experience and maturity
- Focus on mastery and certification goals
- Allow self-paced deep dives
- Minimal gamification, maximum value`,
  }

  return baseDescriptions[level]
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

  // Get age group configuration for this education level
  const ageConfig = getAgeGroupConfig(userContext.educationLevel)

  // Add Hebrew language instruction if applicable (at the top for priority)
  const languageInstruction = buildLanguageInstruction(userContext.language)
  if (languageInstruction) {
    parts.push(languageInstruction)
  }

  parts.push(`\n## Student Profile - IMPORTANT: Adapt ALL content to this level`)
  parts.push(getEnhancedEducationDescription(userContext.educationLevel, ageConfig))

  // Add age-specific learning design instructions
  parts.push(buildAgeSpecificInstructions(ageConfig))

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

  parts.push(`\n**CRITICAL**: Vocabulary, examples, and complexity MUST match the student's education level (${ageConfig.name}).
- Explanation length: ${ageConfig.wordsPerExplanation.min}-${ageConfig.wordsPerExplanation.max} words
- Abstraction level: ${ageConfig.abstractionLevel}
- Do not use terms or concepts above their level without explanation.`)

  return parts.join('\n')
}

// Export for external use
export { buildPersonalizationSection }

// ============================================================================
// Learning Objectives Generation (Bloom's Taxonomy)
// Research: AI-generated LOs comparable to human-crafted in alignment
// ============================================================================

/**
 * Bloom's Taxonomy cognitive levels for learning objectives
 */
export const BLOOMS_TAXONOMY = {
  remember: {
    level: 1,
    description: 'Recall facts and basic concepts',
    verbs: ['define', 'list', 'recall', 'identify', 'name', 'recognize', 'state'],
  },
  understand: {
    level: 2,
    description: 'Explain ideas or concepts',
    verbs: ['describe', 'explain', 'summarize', 'classify', 'compare', 'interpret', 'discuss'],
  },
  apply: {
    level: 3,
    description: 'Use information in new situations',
    verbs: ['apply', 'demonstrate', 'solve', 'use', 'implement', 'execute', 'calculate'],
  },
  analyze: {
    level: 4,
    description: 'Draw connections among ideas',
    verbs: ['analyze', 'differentiate', 'examine', 'contrast', 'distinguish', 'investigate'],
  },
  evaluate: {
    level: 5,
    description: 'Justify a decision or course of action',
    verbs: ['evaluate', 'assess', 'critique', 'justify', 'defend', 'judge', 'argue'],
  },
  create: {
    level: 6,
    description: 'Produce new or original work',
    verbs: ['create', 'design', 'develop', 'formulate', 'construct', 'propose', 'devise'],
  },
} as const

/**
 * Builds the Learning Objectives generation section for prompts
 * Research finding: AI-generated LOs are comparable to human-crafted ones
 */
function buildLearningObjectivesSection(): string {
  return `

## Learning Objectives Generation (REQUIRED)

Generate 3-6 specific, measurable learning objectives for this course using Bloom's Taxonomy.

### Requirements:
1. Each objective MUST start with an action verb from Bloom's Taxonomy
2. Objectives should be specific and measurable (not vague)
3. Cover a range of cognitive levels (not all "remember")
4. Align with the actual course content
5. Be achievable within the course scope

### Bloom's Taxonomy Levels (use verbs from each level):
- **Remember** (Level 1): define, list, recall, identify, name, recognize
- **Understand** (Level 2): describe, explain, summarize, classify, compare, interpret
- **Apply** (Level 3): apply, demonstrate, solve, use, implement, calculate
- **Analyze** (Level 4): analyze, differentiate, examine, contrast, distinguish
- **Evaluate** (Level 5): evaluate, assess, critique, justify, defend, judge
- **Create** (Level 6): create, design, develop, formulate, construct, propose

### Output Format (include in JSON response):
"learningObjectives": [
  {
    "id": "lo_1",
    "objective": "Define the key components of [topic]",
    "bloomLevel": "remember",
    "actionVerb": "define"
  },
  {
    "id": "lo_2",
    "objective": "Apply [concept] to solve [type of problem]",
    "bloomLevel": "apply",
    "actionVerb": "apply"
  }
]

### Good vs Bad Examples:
- GOOD: "Calculate the area of triangles using the base-height formula"
- BAD: "Understand triangles" (too vague, not measurable)
- GOOD: "Compare and contrast mitosis and meiosis processes"
- BAD: "Learn about cell division" (no action verb, not specific)
`
}

// ============================================================================
// Exam Content Detection and Filtering
// ============================================================================

/**
 * Detects if the content appears to be from an exam or test
 * Used to apply exam-specific course generation rules
 */
export function isExamContent(content: string): boolean {
  // Strong indicators - if ANY of these are present, it's definitely exam content
  const strongIndicators = [
    'בגרות', 'bagrut',
    'הכנה למבחן', 'הכנה לבחינה', 'exam prep',
    'מועד א', 'מועד ב', 'מועד קיץ', 'מועד חורף',
    'עמ״ט', 'עמט', // Israeli matriculation
  ]

  const lowerContent = content.toLowerCase()

  // If any strong indicator is found, it's exam content
  for (const indicator of strongIndicators) {
    if (lowerContent.includes(indicator.toLowerCase())) {
      console.log(`[isExamContent] Strong indicator found: "${indicator}"`)
      return true
    }
  }

  // Regular indicators - need 3+ matches
  const examIndicators = [
    // Hebrew exam terms
    'מבחן', 'בחינה', 'מועד',
    'נקודות', 'ניקוד', 'ציון',
    'שאלה', 'סעיף', 'חלק א', 'חלק ב',
    'פתור', 'חשב', 'הוכח', 'מצא',
    'תשובה', 'פתרון',
    // English exam terms
    'exam', 'test', 'quiz', 'assessment',
    'points', 'marks', 'score', 'grade',
    'question', 'part a', 'part b', 'section',
    'solve', 'calculate', 'prove', 'find',
    'answer', 'solution',
    // Time indicators
    'שעות', 'דקות', 'hours', 'minutes', 'duration', 'time allowed'
  ]

  const matchCount = examIndicators.filter(indicator =>
    lowerContent.includes(indicator.toLowerCase())
  ).length

  const isExam = matchCount >= 3
  console.log(`[isExamContent] Matched ${matchCount} indicators, isExam: ${isExam}`)
  return isExam
}

/**
 * Builds exam-specific instructions to add to prompts when exam content is detected
 */
function buildExamContentInstructions(isExam: boolean): string {
  if (!isExam) return ''

  return `

## ⚠️ CRITICAL: Exam-Based Content Detected - MANDATORY FILTERING ⚠️

This content is from an exam or test. You MUST follow these rules STRICTLY.

### 🚫 ABSOLUTELY FORBIDDEN - NEVER INCLUDE IN COURSE:
These topics must be COMPLETELY REMOVED. Do NOT create lessons, explanations, or questions about:
- ❌ Exam duration/time limits (e.g., "2 hours", "180 minutes", "שעתיים", "3.5 שעות")
- ❌ Point values/scores (e.g., "20 points", "10 נקודות", "marks", "ניקוד")
- ❌ What to bring (calculator, pen, ID, materials allowed)
- ❌ Exam rules (write in pen, show work, no erasures)
- ❌ Exam structure (Part A, Part B, choose X of Y questions)
- ❌ Grading criteria/rubrics
- ❌ Administrative instructions
- ❌ Where/when the exam takes place
- ❌ How many questions to answer
- ❌ Page/question numbering instructions

### 🚫 FORBIDDEN QUESTION TYPES - NEVER ASK:
- "How long is the exam?" ❌
- "How many points is this worth?" ❌
- "What should you bring to the exam?" ❌
- "How is the exam structured?" ❌
- "What materials are allowed?" ❌
- "How many questions should you answer?" ❌
- Any question about logistics, rules, or format ❌

### ✅ WHAT THE COURSE SHOULD TEACH:
1. **Problem Types** - Each type of math/science problem (equations, geometry, etc.)
2. **Solution Methods** - Step-by-step HOW to solve each problem type
3. **Worked Examples** - Use exam problems as teaching examples with FULL solutions
4. **Key Concepts** - The actual knowledge needed (formulas, theorems, principles)
5. **Practice Problems** - Similar problems for the student to solve

### ✅ ALLOWED QUESTION TYPES:
- "What is the formula for...?" ✅
- "How would you solve...?" ✅
- "Calculate the value of..." ✅
- "What method should be used for...?" ✅
- "What is the first step in solving...?" ✅

The goal: Student learns to SOLVE PROBLEMS, not learn ABOUT the exam.
`
}

/**
 * Builds math-specific teaching instructions with methods library
 */
function buildMathContentInstructions(content: string, language: 'en' | 'he' = 'en'): string {
  const mathIndicators = [
    // Hebrew math terms
    'משוואה', 'פונקציה', 'גאומטריה', 'חשבון', 'אלגברה',
    'נגזרת', 'אינטגרל', 'הסתברות', 'וקטור', 'מטריצה',
    'משולש', 'מעגל', 'זווית', 'שטח', 'היקף',
    // English math terms
    'equation', 'function', 'geometry', 'calculus', 'algebra',
    'derivative', 'integral', 'probability', 'vector', 'matrix',
    'triangle', 'circle', 'angle', 'area', 'perimeter',
    'polynomial', 'quadratic', 'linear', 'exponential', 'logarithm'
  ]

  const lowerContent = content.toLowerCase()
  const isMath = mathIndicators.filter(ind => lowerContent.includes(ind.toLowerCase())).length >= 2

  if (!isMath) return ''

  // Detect specific math topic and get relevant methods
  const detectedTopic = detectMathTopic(content)
  const topicMethods = detectedTopic ? getMathMethodsPromptInstructions(detectedTopic, language) : ''

  // Get topic-specific visual guidance
  const topicVisualGuidance = detectedTopic ? getVisualGuidanceForPrompt(detectedTopic) : getFullVisualGuidance()

  return `

## Mathematics Content

### Key Principles:
- Show REASONING behind each step with visual language of math
- Include step-by-step solutions using LaTeX notation
- Provide MULTIPLE solving methods when applicable
- Include visual representations (graphs, number lines, tables) where helpful
- Verify answers where applicable

### Solution Structure:
For each math problem, provide:
1. **Problem identification** - What type of problem is this?
2. **Multiple methods** - Provide at least 2 solving methods if applicable
3. **Step-by-step solution** - With LaTeX formulas and reasoning
4. **Visual representation** - Include "visual" field when helpful:
   - number_line: For inequalities, solution sets
   - coordinate_plane: For functions, graphs, intersections
   - triangle: For geometry problems
   - circle: For circle problems
   - unit_circle: For trigonometry
   - table: For sign tables, value tables, factoring
   - tree_diagram: For probability, counting
5. **Final answer** - Clearly stated in LaTeX

${topicVisualGuidance}

### Solution Format (JSON):
\`\`\`json
{
  "subject": "math",
  "methods": [
    {
      "method": "Method Name",
      "methodType": "formula|factoring|graphical|table|elimination|substitution|other",
      "whenToUse": "When this method is best",
      "coefficients": { "a": "1", "b": "-5", "c": "6" },
      "steps": [
        {
          "stepNumber": 1,
          "action": "Description of what we're doing",
          "formula": "LaTeX formula (optional)",
          "substitution": "Values substituted (optional)",
          "result": "Step result in LaTeX (optional)",
          "explanation": "Why this step (optional)"
        }
      ],
      "finalAnswer": "x = 2 \\\\text{ or } x = 3",
      "visual": {
        "type": "coordinate_plane",
        "data": { /* visual data */ }
      }
    }
  ]
}
\`\`\`
${topicMethods}

${ERROR_VISUAL_GUIDANCE}

### Available Methods by Topic:
${Object.entries(ALL_MATH_METHODS).slice(0, 6).map(([_key, topic]) =>
  `- **${topic.topicName}**: ${topic.methods.map(m => m.name).join(', ')}`
).join('\n')}
`
}

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

const COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates comprehensive, interactive learning courses. Your task is to transform notes into thorough educational experiences that prepare students to truly understand and apply the material.

## Your Role
- Create COMPREHENSIVE explanations (100-200 words per concept)
- Break content into logical, well-structured steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning engaging and effective
- Reference available images when they help explain concepts
- Each lesson should take 2-3 MINUTES to complete, not seconds

## Image Usage
When images are provided, incorporate them into the course:
- Reference images using their index number (e.g., "image_0", "image_1")
- Include imageIndex in steps where images should appear
- Use images for diagrams, examples, and visual explanations
- Each image can only be used once per course
- If no images are provided, the course will search for relevant web images

## Course Structure

### Course Layout
- 4-8 lessons per course (based on content complexity)
- For multi-page notes: aim for 1-2 lessons per page of content
- 8-12 steps per lesson (enough for 2-3 minutes of learning)
- Each lesson focuses on ONE main concept
- Lessons build on each other progressively
- Consolidate related topics even if from different pages

### Step Types
1. **explanation**: Comprehensive teaching moment (100-200 words, explaining the concept thoroughly)
2. **key_point**: Important fact or rule to remember
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with detailed explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete worked example with step-by-step solution
7. **summary**: Lesson recap with key takeaways

### Explanation Rules
- Use 100-200 words per explanation
- Explain the WHY, not just the WHAT
- Use clear language appropriate to the student's level
- Build from foundations to deeper understanding
- Use analogies and real-world connections
- For problem-solving topics, show reasoning step by step

### Example Rules (CRITICAL for learning)
- Every lesson MUST have at least 2 worked examples
- Show the COMPLETE solution process, not just the answer
- Explain the reasoning behind each step
- Include alternative approaches when relevant
- Connect examples to the concepts being taught

### Question Rules
- 2-4 questions per lesson distributed throughout
- Place AFTER teaching content
- Never two questions in a row
- Test UNDERSTANDING, not just memorization
- Vary question types:
  * Application: "Given this problem, how would you solve it?"
  * Conceptual: "Why does this method work?"
  * Comparison: "What's the difference between...?"
  * Error analysis: "What mistake was made in this solution?"

### 🚫 FORBIDDEN Questions (NEVER ASK THESE):
- Questions about exam duration, time limits, or how long tests take
- Questions about point values, marks, or scoring
- Questions about what materials to bring (calculator, pen, etc.)
- Questions about exam rules or administrative procedures
- Questions about exam structure (Part A, B, sections, etc.)
- Questions about grading criteria
- ANY meta-questions about the test/exam itself
- Focus ONLY on testing the ACTUAL SUBJECT MATTER knowledge

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions and typical student errors
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Each lesson should take 2-3 minutes to complete
- Build deep understanding, not surface knowledge
- Test conceptual understanding and application skills
- Feel thorough yet manageable
- Student should be able to solve problems after completing the lesson`

function buildCourseGenerationUserPrompt(
  extractedContent: string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
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

  // Detect if content is from an exam and add appropriate instructions
  const examInstructions = buildExamContentInstructions(isExamContent(extractedContent))

  // Detect if content is math-related and add appropriate instructions
  const mathInstructions = buildMathContentInstructions(extractedContent)

  // Add learning objectives generation section
  const loSection = buildLearningObjectivesSection()

  // Add intensity-specific instructions
  const intensityInstructions = intensityMode ? buildIntensityInstructions(intensityMode) : ''

  return `Based on the following extracted notes, create a comprehensive study course with embedded active recall questions.${imageInstruction}${personalizationSection}${examInstructions}${mathInstructions}${intensityInstructions}${loSection}

## Extracted Notes Content:
${extractedContent}

## Instructions:
${titleInstruction}

Create a structured course that transforms these notes into complete study material with interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "learningObjectives": [
    {
      "id": "lo_1",
      "objective": "Define the key components and terminology of [main topic]",
      "bloomLevel": "remember",
      "actionVerb": "define"
    },
    {
      "id": "lo_2",
      "objective": "Explain the relationship between [concept A] and [concept B]",
      "bloomLevel": "understand",
      "actionVerb": "explain"
    },
    {
      "id": "lo_3",
      "objective": "Apply [method/formula] to solve [type of problem]",
      "bloomLevel": "apply",
      "actionVerb": "apply"
    }
  ],
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

7. **Use images where helpful** (OPTIONAL - do not force images)
   - Only include images if they genuinely enhance understanding
   - Prefer document images ("imageIndex") when available
   - For web images, use "webImageQuery" sparingly for complex visual concepts only
   - Skip images for text-heavy content, exam questions, or simple explanations

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

// ============================================================================
// Math Solution Instructions for Subject-Aware Rendering
// ============================================================================

/**
 * Returns instructions for generating structured math solutions with LaTeX
 * Used when content is detected as mathematics
 */
export function getMathSolutionInstructions(): string {
  return `
## MATH PROBLEM SOLUTION FORMAT

For MATH problems, the "workedSolution" field must be a STRUCTURED OBJECT (not a string) with this format:

"workedSolution": {
  "subject": "math",
  "methods": [
    {
      "method": "Method Name (e.g., Quadratic Formula, Factoring)",
      "coefficients": { "a": "1", "b": "5", "c": "-6" },
      "steps": [
        {
          "stepNumber": 1,
          "action": "Identify coefficients from ax² + bx + c = 0",
          "result": "a = 1, b = 5, c = -6"
        },
        {
          "stepNumber": 2,
          "action": "Write the quadratic formula",
          "formula": "x = \\\\frac{-b \\\\pm \\\\sqrt{b^2-4ac}}{2a}"
        },
        {
          "stepNumber": 3,
          "action": "Substitute values",
          "substitution": "x = \\\\frac{-5 \\\\pm \\\\sqrt{25+24}}{2}"
        },
        {
          "stepNumber": 4,
          "action": "Simplify the discriminant",
          "result": "x = \\\\frac{-5 \\\\pm \\\\sqrt{49}}{2} = \\\\frac{-5 \\\\pm 7}{2}"
        },
        {
          "stepNumber": 5,
          "action": "Calculate both solutions",
          "result": "x_1 = \\\\frac{-5+7}{2} = 1, \\\\quad x_2 = \\\\frac{-5-7}{2} = -6"
        }
      ],
      "finalAnswer": "x = 1 \\\\text{ or } x = -6"
    }
  ]
}

### LaTeX Format Rules:
- Use DOUBLE backslashes (\\\\) for LaTeX commands (\\\\frac, \\\\sqrt, \\\\pm, \\\\quad)
- For fractions: \\\\frac{numerator}{denominator}
- For square roots: \\\\sqrt{expression}
- For plus/minus: \\\\pm
- For subscripts: x_1, a_n
- For superscripts: x^2, a^{n+1}
- For text in math: \\\\text{ or }
- For Greek letters: \\\\alpha, \\\\beta, \\\\theta

### Multiple Methods (when applicable):
Provide 2+ methods when possible:
1. Primary method (e.g., Quadratic Formula)
2. Alternative method (e.g., Factoring, Completing the Square)

Each method should have:
- "method": Name of the solving approach
- "coefficients": Key values identified (if applicable)
- "steps": Array of step objects with stepNumber, action, and optional formula/substitution/result
- "finalAnswer": The answer in LaTeX format

### Step Object Properties:
- stepNumber: (required) Number of the step
- action: (required) What is being done in this step
- formula: (optional) The formula being applied (in LaTeX)
- substitution: (optional) The formula with values substituted (in LaTeX)
- result: (optional) The result of this step (in LaTeX)
- explanation: (optional) Brief text explanation

### For Non-Math Subjects:
Use a simple string for workedSolution:
"workedSolution": "Step 1: ... Step 2: ... Answer: ..."

Or use structured format for other subjects:
"workedSolution": {
  "subject": "other",
  "textExplanation": "Step 1: ... Step 2: ... Answer: ..."
}
`
}

// ============================================================================
// Deep Practice Course Generation Prompt
// ============================================================================

const DEEP_PRACTICE_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert tutor specializing in MASTERY-BASED LEARNING. Your task is to create intensive practice lessons that help students achieve deep understanding through extensive problem-solving.

## Deep Practice Philosophy
- ONE concept per lesson, explored thoroughly
- Show HOW to solve BEFORE asking students to solve
- Provide MANY similar practice problems with graduated difficulty
- Explain mistakes in detail, don't just mark wrong
- Continue until mastery is demonstrated (85% accuracy target)

## Your Role
- Create focused lessons on single concepts
- Include detailed worked examples with step-by-step reasoning
- Generate 10-15 practice problems per lesson
- Provide 3 progressive hints per problem
- Explain common mistakes students make

## Lesson Structure (45-60 minutes target)

### 1. CONCEPT INTRODUCTION (1 step)
- Clear, focused definition of ONE concept
- Why this matters / where it's used
- 80-150 words

### 2. WORKED EXAMPLE (1 step)
- Complete problem from start to finish
- EVERY step explained with reasoning
- Format:
  {
    "type": "worked_example",
    "title": "Worked Example: [Problem Type]",
    "content": "Problem statement",
    "workedExample": {
      "problem": "The full problem statement",
      "steps": [
        {"step": 1, "action": "What you do", "why": "Why you do it", "result": "What you get"},
        {"step": 2, "action": "...", "why": "...", "result": "..."},
        {"step": 3, "action": "...", "why": "...", "result": "..."}
      ],
      "finalAnswer": "The complete answer",
      "keyInsight": "The main takeaway"
    }
  }

### 3. PRACTICE PROBLEMS (10-15 steps)
Similar to worked example but different numbers/scenarios. Format:
  {
    "type": "practice_problem",
    "problemNumber": 1,
    "content": "Problem: [question text]",
    "question": "The question to solve",
    "options": ["A) option1", "B) option2", "C) option3", "D) option4"],
    "correctIndex": 0,
    "difficulty": 2,
    "hints": [
      "Think about what formula applies here",
      "Start by identifying the known values",
      "Use the formula: X = Y * Z, substitute the values"
    ],
    "workedSolution": {
      "subject": "math",
      "methods": [
        {
          "method": "Primary Method Name",
          "coefficients": { "a": "value", "b": "value" },
          "steps": [
            { "stepNumber": 1, "action": "...", "formula": "LaTeX formula" },
            { "stepNumber": 2, "action": "...", "substitution": "LaTeX with values" },
            { "stepNumber": 3, "action": "...", "result": "LaTeX result" }
          ],
          "finalAnswer": "LaTeX answer"
        }
      ]
    },
    "commonMistake": "Many students forget to [specific error]...",
    "explanation": "The correct answer is A because..."
  }

NOTE: For MATH content, workedSolution MUST be a structured object with LaTeX formulas.
For non-math subjects, use a plain string: "workedSolution": "Step 1: ... Step 2: ..."

### 4. CONCEPT SUMMARY (1 step)
- Key formula/rule to remember
- Common mistakes to avoid
- Quick reference format

## Practice Problem Design Rules

### Graduated Difficulty (1-5 scale):
- Problems 1-3: Direct application (difficulty 1-2) - Same pattern as worked example
- Problems 4-7: Variations (difficulty 2-3) - Different numbers, slight twists
- Problems 8-10: Challenging (difficulty 3-4) - Multi-step, combined concepts
- Problems 11-15: Advanced (difficulty 4-5) - Complex scenarios, edge cases

### Mistake-Aware Wrong Options:
Each wrong option represents a SPECIFIC common mistake:
- Option A: Common calculation error (forgot negative sign, wrong order of operations)
- Option B: Conceptual misunderstanding (confused similar concepts)
- Option C: Partially correct (right process but stopped early)
- Vary which position is correct!

### Progressive Hints (3 per problem):
- Hint 1: General direction ("Think about what type of problem this is...")
- Hint 2: Specific approach ("Use the formula... because...")
- Hint 3: Almost-answer ("The first step gives you X, now you need to...")

## Quality Standards
- Target lesson duration: 45-60 minutes of active practice
- Single concept depth > multiple concept breadth
- Every problem teaches something specific
- Students should be able to solve any problem of this type after completion

## Output Format
Return JSON matching this structure for each lesson (only 1 lesson per deep practice course):
{
  "title": "Mastering [Concept Name]",
  "overview": "This lesson focuses on mastering [concept] through extensive practice...",
  "learningObjectives": [...],
  "concept": {
    "name": "The concept name",
    "description": "Brief description"
  },
  "sections": [{
    "title": "Deep Practice: [Concept]",
    "steps": [
      // 1 concept_intro or explanation
      // 1 worked_example
      // 10-15 practice_problem
      // 1 summary
    ]
  }]
}

Return ONLY the JSON object, no additional text.`

/**
 * Builds intensity-specific instructions for course generation
 */
function buildIntensityInstructions(intensityMode?: LessonIntensityMode): string {
  // Default to standard if not specified
  if (!intensityMode || intensityMode === 'standard') {
    return '' // Standard mode uses default prompt behavior
  }
  const config = getIntensityConfig(intensityMode)

  if (intensityMode === 'quick') {
    return `
## Lesson Mode: QUICK OVERVIEW
- Create a FAST, focused overview (${config.targetDurationMinutes.min}-${config.targetDurationMinutes.max} minutes)
- Focus on the 2-3 most important concepts only
- Brief explanations (50-80 words each)
- Include 1 simple example
- Only ${config.practiceProblemsTarget} quick review questions
- Skip detailed derivations and edge cases
`
  }

  if (intensityMode === 'deep_practice') {
    return `
## Lesson Mode: DEEP PRACTICE (MASTERY-FOCUSED)
- Target duration: ${config.targetDurationMinutes.min}-${config.targetDurationMinutes.max} minutes
- Focus on ONE concept only - go deep, not wide
- Include 1 detailed worked example with step-by-step breakdown
- Include ${config.practiceProblemsTarget} practice problems with graduated difficulty:
  - Problems 1-4: Direct application (difficulty 1-2)
  - Problems 5-10: Variations (difficulty 2-3)
  - Problems 11-15: Challenging (difficulty 4-5)
- Each problem MUST include:
  - 3 progressive hints (general → specific → almost-answer)
  - Full worked solution
  - Common mistake explanation
- Target mastery: ${Math.round(config.masteryThreshold * 100)}% accuracy
`
  }

  // Standard mode - use existing behavior
  return ''
}

/**
 * Returns the prompts for generating a study course from extracted content
 * @param extractedContent - The extracted content from image analysis
 * @param userTitle - Optional user-provided title
 * @param imageCount - Number of available images for the course
 * @param userContext - Optional user learning context for personalization
 * @param intensityMode - Optional lesson intensity mode (quick, standard, deep_practice)
 */
export function getCourseGenerationPrompt(
  extractedContent: string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
): { systemPrompt: string; userPrompt: string } {
  // Use deep practice prompt for deep_practice mode
  const systemPrompt = intensityMode === 'deep_practice'
    ? DEEP_PRACTICE_COURSE_GENERATION_SYSTEM_PROMPT
    : COURSE_GENERATION_SYSTEM_PROMPT

  return {
    systemPrompt,
    userPrompt: buildCourseGenerationUserPrompt(extractedContent, userTitle, imageCount, userContext, curriculumContext, intensityMode)
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

const DOCUMENT_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates comprehensive, interactive learning courses from document content. Your task is to transform extracted text from PDFs, PowerPoint presentations, and Word documents into thorough educational experiences that prepare students to truly understand and apply the material.

## Your Role
- Create COMPREHENSIVE explanations (100-200 words per concept)
- Break content into logical, well-structured steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning engaging and effective
- Preserve the document's structure and flow
- Use available images to enhance learning visually
- Each lesson should take 2-3 MINUTES to complete, not seconds

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
- 4-8 lessons per course (based on content complexity)
- 8-12 steps per lesson (enough for 2-3 minutes of learning)
- Each lesson focuses on ONE main concept or section
- Lessons build on each other progressively
- Group related sections/slides into cohesive lessons

### Step Types
1. **explanation**: Comprehensive teaching moment (100-200 words, explaining the concept thoroughly)
2. **key_point**: Important fact or rule to remember
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with detailed explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete worked example with step-by-step solution
7. **summary**: Lesson recap with key takeaways

### Explanation Rules
- Use 100-200 words per explanation
- Explain the WHY, not just the WHAT
- Use clear language appropriate to the student's level
- Build from foundations to deeper understanding
- For problem-solving topics, show reasoning step by step

### Example Rules (CRITICAL for learning)
- Every lesson MUST have at least 2 worked examples
- Show the COMPLETE solution process, not just the answer
- Explain the reasoning behind each step
- Include alternative approaches when relevant

### Question Rules
- 2-4 questions per lesson distributed throughout
- Place AFTER teaching content
- Never two questions in a row
- Test UNDERSTANDING, not just memorization
- Vary question types:
  * Application: "Given this problem, how would you solve it?"
  * Conceptual: "Why does this method work?"
  * Comparison: "What's the difference between...?"
  * Error analysis: "What mistake was made in this solution?"

### 🚫 FORBIDDEN Questions (NEVER ASK THESE):
- Questions about exam duration, time limits, or how long tests take
- Questions about point values, marks, or scoring
- Questions about what materials to bring (calculator, pen, etc.)
- Questions about exam rules or administrative procedures
- Questions about exam structure (Part A, B, sections, etc.)
- Questions about grading criteria
- ANY meta-questions about the test/exam itself
- Focus ONLY on testing the ACTUAL SUBJECT MATTER knowledge

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions and typical student errors
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Each lesson should take 2-3 minutes to complete
- Build deep understanding, not surface knowledge
- Test conceptual understanding and application skills
- Feel thorough yet manageable
- Student should be able to solve problems after completing the lesson
- Stay faithful to the source document content`

function buildDocumentCourseGenerationUserPrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
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

  // Combine all document content for detection
  const allDocumentContent = document.sections.map(s => s.content).join('\n')

  // Detect if content is from an exam and add appropriate instructions
  const examInstructions = buildExamContentInstructions(isExamContent(allDocumentContent))

  // Detect if content is math-related and add appropriate instructions
  const mathInstructions = buildMathContentInstructions(allDocumentContent)

  // Add learning objectives generation section
  const loSection = buildLearningObjectivesSection()

  // Add intensity-specific instructions
  const intensityInstructions = intensityMode ? buildIntensityInstructions(intensityMode) : ''

  return `Create a comprehensive study course from this ${documentTypeLabel}.${personalizationSection}${examInstructions}${mathInstructions}${intensityInstructions}${loSection}

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
  "learningObjectives": [
    {
      "id": "lo_1",
      "objective": "Define the key components and terminology of [main topic]",
      "bloomLevel": "remember",
      "actionVerb": "define"
    },
    {
      "id": "lo_2",
      "objective": "Explain the relationship between [concept A] and [concept B]",
      "bloomLevel": "understand",
      "actionVerb": "explain"
    },
    {
      "id": "lo_3",
      "objective": "Apply [method/formula] to solve [type of problem]",
      "bloomLevel": "apply",
      "actionVerb": "apply"
    }
  ],
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

8. **Images are OPTIONAL** - only include when they genuinely enhance learning
   - If document images are available (check imageCount), you may use "imageIndex" to reference them
   - For web images, use "webImageQuery" SPARINGLY - only for complex visual concepts
   - Skip images for: exam questions, simple explanations, text-heavy content
   - Focus on course content quality over image quantity

Return ONLY the JSON object, no additional text, markdown formatting, or code blocks.`
}

/**
 * Returns the prompts for generating a study course from extracted document content
 * @param document - The extracted document content
 * @param userTitle - Optional user-provided title
 * @param imageCount - Number of available images extracted from the document
 * @param userContext - Optional user learning context for personalization
 * @param intensityMode - Optional lesson intensity mode
 */
export function getDocumentCoursePrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
): { systemPrompt: string; userPrompt: string } {
  // Use deep practice prompt for deep_practice mode
  const systemPrompt = intensityMode === 'deep_practice'
    ? DEEP_PRACTICE_COURSE_GENERATION_SYSTEM_PROMPT
    : DOCUMENT_COURSE_GENERATION_SYSTEM_PROMPT

  return {
    systemPrompt,
    userPrompt: buildDocumentCourseGenerationUserPrompt(document, userTitle, imageCount, userContext, curriculumContext, intensityMode),
  }
}

// ============================================================================
// Text-Based Course Generation Prompts
// ============================================================================

const TEXT_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates comprehensive, interactive learning courses from text content. Your task is to transform user-provided text (topics, outlines, study notes, or subject descriptions) into thorough educational experiences that prepare students to truly understand and apply the material.

## Your Role
- Create COMPREHENSIVE explanations (100-200 words per concept)
- Break content into logical, well-structured steps
- Use a friendly, encouraging tone
- Embed questions throughout to test understanding
- Make learning engaging and effective
- EXPAND the topics into comprehensive educational content
- Each lesson should take 2-3 MINUTES to complete, not seconds

## Text-Based Course Structure

### Understanding Input Text
- Users may provide: topic lists, outlines, study notes, subject descriptions
- The text serves as a GUIDE for what to teach
- You should EXPAND brief topics into full educational content
- Add standard knowledge and examples to make it comprehensive

### Course Layout
- 4-8 lessons per course (based on content complexity)
- 8-12 steps per lesson (enough for 2-3 minutes of learning)
- Each lesson focuses on ONE main concept or topic
- Lessons build on each other progressively
- Group related topics into cohesive lessons

### Step Types
1. **explanation**: Comprehensive teaching moment (100-200 words, explaining the concept thoroughly)
2. **key_point**: Important fact or rule to remember
3. **question**: Multiple choice quiz (4 options)
4. **formula**: Mathematical formula with detailed explanation
5. **diagram**: Description of visual concept
6. **example**: Concrete worked example with step-by-step solution
7. **summary**: Lesson recap with key takeaways

### Explanation Rules
- Use 100-200 words per explanation
- Explain the WHY, not just the WHAT
- Use clear language appropriate to the student's level
- Build from foundations to deeper understanding
- For problem-solving topics, show reasoning step by step

### Example Rules (CRITICAL for learning)
- Every lesson MUST have at least 2 worked examples
- Show the COMPLETE solution process, not just the answer
- Explain the reasoning behind each step
- Include alternative approaches when relevant

### Question Rules
- 2-4 questions per lesson distributed throughout
- Place AFTER teaching content
- Never two questions in a row
- Test UNDERSTANDING, not just memorization
- Vary question types:
  * Application: "Given this problem, how would you solve it?"
  * Conceptual: "Why does this method work?"
  * Comparison: "What's the difference between...?"
  * Error analysis: "What mistake was made in this solution?"

### 🚫 FORBIDDEN Questions (NEVER ASK THESE):
- Questions about exam duration, time limits, or how long tests take
- Questions about point values, marks, or scoring
- Questions about what materials to bring (calculator, pen, etc.)
- Questions about exam rules or administrative procedures
- Questions about exam structure (Part A, B, sections, etc.)
- Questions about grading criteria
- ANY meta-questions about the test/exam itself
- Focus ONLY on testing the ACTUAL SUBJECT MATTER knowledge

### Wrong Answer Rules (CRITICAL)
- Make ALL wrong answers PLAUSIBLE
- Use common misconceptions and typical student errors
- Same length/format as correct answer
- Never obviously wrong or silly
- Vary correct answer position (0, 1, 2, or 3)

## Quality Standards
- Each lesson should take 2-3 minutes to complete
- Build deep understanding, not surface knowledge
- Test conceptual understanding and application skills
- Feel thorough yet manageable
- EXPAND brief topics into proper educational content
- Add standard curriculum knowledge where appropriate
- Student should be able to solve problems after completing the lesson`

function buildTextCourseGenerationUserPrompt(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate an appropriate, descriptive title based on the content.`

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)

  // Detect if content is from an exam and add appropriate instructions
  const examInstructions = buildExamContentInstructions(isExamContent(textContent))

  // Detect if content is math-related and add appropriate instructions
  const mathInstructions = buildMathContentInstructions(textContent)

  // Add learning objectives generation section
  const loSection = buildLearningObjectivesSection()

  // Add intensity-specific instructions
  const intensityInstructions = intensityMode ? buildIntensityInstructions(intensityMode) : ''

  return `Create a comprehensive study course from the following text content. The user has provided topics, notes, or an outline that you should EXPAND into full educational material.${personalizationSection}${examInstructions}${mathInstructions}${intensityInstructions}${loSection}

## User-Provided Content:

${textContent}

## Instructions:
${titleInstruction}

IMPORTANT: The text above may be brief topic lists or outlines. You should EXPAND each topic into comprehensive educational content using standard curriculum knowledge. Don't just repeat the topics - teach them fully.

Create a structured course that transforms these topics into complete study material with interactive questions. Return a JSON object with this exact structure:

{
  "title": "Clear, descriptive course title",
  "overview": "A 2-3 paragraph overview explaining what this course covers, why it's important, and what the student will learn. Make it engaging and informative.",
  "learningObjectives": [
    {
      "id": "lo_1",
      "objective": "Define the key components and terminology of [main topic]",
      "bloomLevel": "remember",
      "actionVerb": "define"
    },
    {
      "id": "lo_2",
      "objective": "Explain the relationship between [concept A] and [concept B]",
      "bloomLevel": "understand",
      "actionVerb": "explain"
    },
    {
      "id": "lo_3",
      "objective": "Apply [method/formula] to solve [type of problem]",
      "bloomLevel": "apply",
      "actionVerb": "apply"
    }
  ],
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
 * @param intensityMode - Optional lesson intensity mode
 */
export function getTextCoursePrompt(
  textContent: string,
  userTitle?: string,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
): { systemPrompt: string; userPrompt: string } {
  // Use deep practice prompt for deep_practice mode
  const systemPrompt = intensityMode === 'deep_practice'
    ? DEEP_PRACTICE_COURSE_GENERATION_SYSTEM_PROMPT
    : TEXT_COURSE_GENERATION_SYSTEM_PROMPT

  return {
    systemPrompt,
    userPrompt: buildTextCourseGenerationUserPrompt(textContent, userTitle, userContext, curriculumContext, intensityMode),
  }
}

// ============================================================================
// EXAM-BASED Course Generation Prompts
// For exam content: Derive lessons directly from exam questions
// ============================================================================

/**
 * System prompt for exam-based course generation.
 * Key difference: Lessons are derived FROM exam questions, not invented by AI.
 */
const EXAM_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator who creates courses that teach students how to SOLVE EXAM QUESTIONS.

## CRITICAL: YOUR TASK IS DIFFERENT FROM REGULAR COURSE GENERATION

You are given an EXAM (test, quiz, bagrut, etc.). Your job is NOT to create a general course about the topic.
Your job is to ANALYZE THE ACTUAL QUESTIONS in the exam and create lessons that teach HOW TO SOLVE EACH TYPE OF QUESTION.

## STEP 1: Identify Actual Exam Questions

First, identify ALL the actual questions/problems in the exam. Look for:
- Numbered questions (1, 2, 3... or א, ב, ג...)
- Sub-questions (a, b, c or 1.1, 1.2... or סעיף א, סעיף ב...)
- Problems that ask to: solve, calculate, prove, find, explain, compare, analyze
- Questions with point values or marks

IGNORE completely:
- Exam instructions, duration, rules
- Point distributions
- What materials are allowed
- Administrative text

## STEP 2: Group Questions by Topic/Type

Group similar questions together. For example:
- "Quadratic equation questions" (if multiple questions involve quadratics)
- "Derivative calculation questions" (if multiple involve derivatives)
- "Text analysis questions" (for literature/language exams)

## STEP 3: Create One Lesson Per Question Type

For EACH question type/group, create a lesson with this EXACT structure:

### Lesson Structure (8-12 steps):

1. **explanation**: "What This Question Type Asks" - Explain what this type of question is testing
2. **explanation**: "The Method/Formula to Use" - Explain the approach to solve this type
3. **example**: Take an ACTUAL question from the exam and show FULL step-by-step solution
4. **key_point**: Highlight the most important thing to remember
5. **question**: A practice question SIMILAR to the exam question (NOT about the exam itself!)
6. **explanation**: Common mistakes to avoid OR alternative approaches
7. **example**: Another worked example (can be variation of exam question)
8. **question**: Another practice question testing the same skill
9. **summary**: Key steps to solve this type of question

## ABSOLUTE RULES

### 🚫 FORBIDDEN - NEVER CREATE:
- Lessons about "Exam Structure", "Point Distribution", "What to Bring", etc.
- Questions asking "How long is the exam?"
- Questions asking "How many points is X worth?"
- Questions about exam rules or logistics
- ANY content about the exam itself rather than the SUBJECT MATTER

### ✅ REQUIRED - ALWAYS CREATE:
- Lessons that teach HOW TO SOLVE specific question types from the exam
- Practice questions that test the SAME SKILLS as the exam questions
- Step-by-step solutions showing HOW to arrive at answers
- Explanations of WHY each method works

## Question Format for Practice

When creating practice questions:
- Make them SIMILAR in style and difficulty to actual exam questions
- They should test the SAME mathematical/conceptual skill
- Include 4 plausible options
- Vary correct answer position (0-3)

## Example of Correct Lesson Structure

If the exam has a question like: "Solve: x² - 5x + 6 = 0"

The lesson should be:
- Title: "Solving Quadratic Equations"
- Explanation: What quadratic equations are
- Explanation: Methods to solve (factoring, formula)
- Example: Step-by-step solution of x² - 5x + 6 = 0
- Key point: How to identify which method to use
- Question: "Solve: x² - 7x + 12 = 0" (similar practice question)
- ...etc

## Language

Match the language of the exam. If the exam is in Hebrew, create the course in Hebrew.
If mixed, prefer Hebrew for Israeli Bagrut exams.`

/**
 * Builds the user prompt for exam-based course generation
 */
function buildExamCourseGenerationUserPrompt(
  documentOrContent: ExtractedDocument | string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): string {
  const titleInstruction = userTitle
    ? `The user has specified the course title should be: "${userTitle}". Use this as the title.`
    : `Generate a title based on the exam subject (e.g., "Mathematics 5 Units - Problem Solving Course")`

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)

  // Handle both document and string content
  let contentSection: string
  let documentInfo = ''

  if (typeof documentOrContent === 'string') {
    contentSection = documentOrContent
  } else {
    const document = documentOrContent
    documentInfo = `
## Document Information:
- Original Title: ${document.title}
- Type: ${document.type.toUpperCase()}
- Pages: ${document.metadata.pageCount}
`
    contentSection = document.sections
      .map((section) => `### Page ${section.pageNumber}: ${section.title}\n${section.content}`)
      .join('\n\n---\n\n')
  }

  const imageInstruction = imageCount && imageCount > 0
    ? `\n\nImages available: ${imageCount} (indexed 0 to ${imageCount - 1}). Use "imageIndex" and "imageAlt" to include relevant diagrams.`
    : ''

  // Get age-specific config if available
  const ageConfig = userContext?.educationLevel
    ? getAgeGroupConfig(userContext.educationLevel)
    : null
  const ageInstructions = ageConfig ? buildAgeSpecificInstructions(ageConfig) : ''

  return `You are analyzing an EXAM. Create a course that teaches students how to solve EACH TYPE OF QUESTION in this exam.
${personalizationSection}
${ageInstructions}
${documentInfo}
## EXAM CONTENT (Analyze for actual questions):

${contentSection}
${imageInstruction}

## YOUR TASK:

1. **IDENTIFY** all actual exam questions/problems in the content above
2. **GROUP** similar questions by topic/type
3. **CREATE ONE LESSON** for each question type that teaches how to solve it
4. Each lesson must include:
   - Explanation of the method/approach
   - Worked example using an actual exam question
   - Practice questions similar to exam questions

## Instructions:
${titleInstruction}

Return a JSON object with this structure:

{
  "title": "Course title based on exam subject",
  "overview": "This course prepares you to solve the types of questions found in this exam...",
  "lessons": [
    {
      "title": "Solving [Question Type] Problems",
      "steps": [
        {
          "type": "explanation",
          "title": "Understanding This Question Type",
          "content": "This type of question asks you to... [100-150 words explaining what the question tests]"
        },
        {
          "type": "explanation",
          "title": "The Method to Solve",
          "content": "To solve this type of problem, follow these steps: [100-150 words explaining the approach]"
        },
        {
          "type": "example",
          "title": "Worked Example from the Exam",
          "content": "Let's solve the exam question step by step:\\n\\n**Problem:** [actual question from exam]\\n\\n**Step 1:** ...\\n**Step 2:** ...\\n**Solution:** ..."
        },
        {
          "type": "key_point",
          "content": "Remember: [most important thing to remember for this question type]"
        },
        {
          "type": "question",
          "question": "[Practice question similar to exam - tests the same skill]",
          "options": ["Correct answer", "Plausible wrong answer 1", "Plausible wrong answer 2", "Plausible wrong answer 3"],
          "correctIndex": 0,
          "explanation": "The correct answer is... because..."
        },
        {
          "type": "explanation",
          "title": "Common Mistakes to Avoid",
          "content": "Students often make these mistakes: [common errors and how to avoid them]"
        },
        {
          "type": "question",
          "question": "[Another practice question for this skill]",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "correctIndex": 2,
          "explanation": "..."
        },
        {
          "type": "summary",
          "content": "To solve [question type], remember to: 1) ... 2) ... 3) ..."
        }
      ]
    }
  ]
}

## CRITICAL REMINDERS:

1. Each lesson = One type of exam question
2. Use ACTUAL exam questions as worked examples
3. Practice questions must test the SAME SKILLS as the exam
4. NO lessons about exam structure, points, duration, rules
5. ALL content must be about SOLVING PROBLEMS, not about THE EXAM

Return ONLY the JSON object, no additional text or markdown.`
}

/**
 * Returns prompts for exam-based course generation.
 * Use this when content is detected as exam/test content.
 */
export function getExamCoursePrompt(
  documentOrContent: ExtractedDocument | string,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: EXAM_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildExamCourseGenerationUserPrompt(
      documentOrContent,
      userTitle,
      imageCount,
      userContext,
      curriculumContext
    ),
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
- Vary correct answer position (0-3)
- 🚫 NEVER ask about: exam duration, points, materials to bring, exam rules, or any logistics
- Focus ONLY on testing actual subject matter knowledge`

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

// ============================================================================
// Progressive Generation Prompts
// For fast initial generation (2 lessons) + background continuation
// ============================================================================

/**
 * System prompt for initial fast course generation.
 * Generates overview, full outline, first 2 lessons, and document summary.
 */
const INITIAL_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator creating a FAST INITIAL course structure. Your task is to:

1. Create a complete course OUTLINE (all lessons planned)
2. Generate FULL CONTENT for only the first 2 lessons
3. Create a document SUMMARY for later continuation

This allows users to start learning immediately while remaining lessons generate in background.

## Output Structure

You MUST return:
- Course title and overview
- Learning objectives
- **lessonOutline**: Array with ALL lessons (title, description, topics for each)
- **lessons**: Array with ONLY first 2 lessons (full content)
- **documentSummary**: 500-word summary capturing key content for continuation

## Lesson Design Rules
- Each lesson: 8-12 steps, 2-3 minutes to complete
- Include 2-3 questions per lesson (after teaching content)
- Step types: explanation, key_point, question, formula, example, summary
- Questions test understanding with 4 plausible options
- Vary correct answer position (0-3)

## 🚫 FORBIDDEN Questions:
- Questions about exam duration, time limits, points
- Questions about materials to bring
- Questions about exam rules or structure
- Focus ONLY on subject matter knowledge`

/**
 * Builds user prompt for initial fast generation
 */
function buildInitialCourseGenerationUserPrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  curriculumContext?: CurriculumContext,
  intensityMode?: LessonIntensityMode
): string {
  const titleInstruction = userTitle
    ? `Use "${userTitle}" as the course title.`
    : `Generate an appropriate title based on the content.`

  const personalizationSection = buildPersonalizationSection(userContext, curriculumContext)
  const allContent = document.sections.map(s => s.content).join('\n')
  const examInstructions = buildExamContentInstructions(isExamContent(allContent))
  const intensityInstructions = buildIntensityInstructions(intensityMode)

  const imageInstruction = imageCount && imageCount > 0
    ? `\nImages available: ${imageCount} (use "imageIndex" and "imageAlt" where helpful)`
    : ''

  return `Create FAST INITIAL course structure from this document.
${personalizationSection}${examInstructions}${intensityInstructions}

## Document: ${document.title}
Type: ${document.type.toUpperCase()} | Pages: ${document.metadata.pageCount}${imageInstruction}

## Content:
${document.sections.map(s => `### ${s.title} (Page ${s.pageNumber})\n${s.content}`).join('\n\n---\n\n')}

## Instructions:
${titleInstruction}

Return JSON with this EXACT structure:

{
  "title": "Course title",
  "overview": "2-3 paragraph course overview",
  "learningObjectives": [
    {"id": "lo_1", "objective": "...", "bloomLevel": "remember|understand|apply|analyze|evaluate|create", "actionVerb": "..."}
  ],
  "documentSummary": "A 400-600 word summary of the entire document content. Include all key concepts, formulas, and important details. This will be used to generate remaining lessons later.",
  "lessonOutline": [
    {
      "index": 0,
      "title": "Lesson 1 title",
      "description": "2-3 sentences describing what this lesson covers",
      "estimatedSteps": 10,
      "topics": ["topic1", "topic2", "topic3"]
    },
    {
      "index": 1,
      "title": "Lesson 2 title",
      "description": "...",
      "estimatedSteps": 10,
      "topics": ["topic4", "topic5"]
    },
    {
      "index": 2,
      "title": "Lesson 3 title (outline only)",
      "description": "...",
      "estimatedSteps": 8,
      "topics": ["topic6", "topic7"]
    }
  ],
  "lessons": [
    {
      "title": "Lesson 1 title",
      "steps": [
        {"type": "explanation", "content": "100-150 words introducing the concept..."},
        {"type": "key_point", "content": "Important fact to remember"},
        {"type": "example", "content": "Worked example with full solution..."},
        {"type": "question", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."},
        {"type": "explanation", "content": "More detail..."},
        {"type": "question", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 2, "explanation": "..."},
        {"type": "summary", "content": "Key takeaways..."}
      ]
    },
    {
      "title": "Lesson 2 title",
      "steps": [...]
    }
  ]
}

## CRITICAL:
1. **lessonOutline** must include ALL planned lessons (typically 4-8)
2. **lessons** array must contain ONLY first 2 lessons with FULL content
3. **documentSummary** must be comprehensive (400-600 words) for later use
4. Each lesson: 8-12 steps with 2-3 questions distributed throughout

Return ONLY the JSON object.`
}

/**
 * Returns prompts for initial fast course generation (first 2 lessons + outline)
 */
export function getInitialCoursePrompt(
  document: ExtractedDocument,
  userTitle?: string,
  imageCount?: number,
  userContext?: UserLearningContext,
  intensityMode?: LessonIntensityMode
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: INITIAL_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildInitialCourseGenerationUserPrompt(document, userTitle, imageCount, userContext, undefined, intensityMode)
  }
}

// ============================================================================
// Continuation Generation Prompts
// For generating remaining lessons in background
// ============================================================================

import type { Lesson, LessonOutline } from '@/types'

/**
 * System prompt for continuation lesson generation.
 * Uses document summary + outline to generate remaining lessons.
 */
const CONTINUATION_COURSE_GENERATION_SYSTEM_PROMPT = `You are an expert educator continuing course generation. You will receive:

1. A document SUMMARY (not full document)
2. The full lesson OUTLINE (all planned lessons)
3. Previously generated lessons (for style consistency)
4. Target lesson indices to generate

Your task: Generate the specified lessons matching the quality and style of previous lessons.

## Continuation Rules

1. **Match the style** of previously generated lessons (tone, depth, structure)
2. **Follow the outline** - use the title, description, and topics from lessonOutline
3. **Maintain continuity** - reference concepts from earlier lessons where appropriate
4. **Same quality standards**:
   - 8-12 steps per lesson
   - 2-3 questions per lesson (distributed, not grouped)
   - 100-150 words per explanation
   - Plausible wrong answers for questions
   - Varied correctIndex (0-3)

## 🚫 FORBIDDEN:
- Questions about exam logistics (duration, points, materials)
- Repetitive content from previous lessons
- Breaking from established course style`

/**
 * Builds user prompt for continuation generation
 */
function buildContinuationCourseGenerationUserPrompt(
  documentSummary: string,
  lessonOutline: LessonOutline[],
  previousLessons: Lesson[],
  targetLessonIndices: number[],
  userContext?: UserLearningContext
): string {
  const personalizationSection = userContext
    ? buildPersonalizationSection(userContext)
    : ''

  const outlineText = lessonOutline.map(lo =>
    `- Lesson ${lo.index + 1}: "${lo.title}" - ${lo.description} (Topics: ${lo.topics.join(', ')})`
  ).join('\n')

  const previousLessonsText = previousLessons.map((lesson, idx) =>
    `### Lesson ${idx + 1}: ${lesson.title}\nSteps: ${lesson.steps.length}, Questions: ${lesson.steps.filter(s => s.type === 'question').length}`
  ).join('\n')

  const targetText = targetLessonIndices.map(i => {
    const outline = lessonOutline[i]
    return outline
      ? `- Lesson ${i + 1}: "${outline.title}"\n  Topics: ${outline.topics.join(', ')}\n  Description: ${outline.description}`
      : `- Lesson ${i + 1}`
  }).join('\n')

  return `Continue generating lessons for this course.
${personalizationSection}

## Document Summary:
${documentSummary}

## Full Lesson Outline:
${outlineText}

## Previously Generated Lessons (match this style):
${previousLessonsText}

## Generate These Lessons:
${targetText}

Return JSON with ONLY the new lessons:

{
  "lessons": [
    {
      "title": "Lesson title from outline",
      "steps": [
        {"type": "explanation", "content": "100-150 words..."},
        {"type": "key_point", "content": "..."},
        {"type": "example", "content": "Worked example..."},
        {"type": "question", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."},
        {"type": "explanation", "content": "..."},
        {"type": "key_point", "content": "..."},
        {"type": "question", "question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 2, "explanation": "..."},
        {"type": "summary", "content": "Key takeaways..."}
      ]
    }
  ]
}

## CRITICAL:
1. Generate lessons for indices: ${targetLessonIndices.join(', ')} (0-indexed)
2. Use titles and topics from the outline
3. Match quality/style of previous lessons
4. 8-12 steps per lesson, 2-3 questions each
5. Questions test subject matter, NOT exam logistics

Return ONLY the JSON object.`
}

/**
 * Returns prompts for continuation lesson generation (background)
 */
export function getContinuationPrompt(
  documentSummary: string,
  lessonOutline: LessonOutline[],
  previousLessons: Lesson[],
  targetLessonIndices: number[],
  userContext?: UserLearningContext
): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: CONTINUATION_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildContinuationCourseGenerationUserPrompt(
      documentSummary,
      lessonOutline,
      previousLessons,
      targetLessonIndices,
      userContext
    )
  }
}
