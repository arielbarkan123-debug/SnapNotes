/**
 * Concept Extractor
 *
 * Uses AI to extract atomic concepts from course content,
 * identify prerequisites, and map content to concepts.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import type {
  Concept,
  ConceptInsert,
  ExtractedConcept,
  ExtractedConceptMapping,
  ConceptExtractionResult,
  ContentConceptInsert,
} from './types'
import type { GeneratedCourse, Lesson } from '@/types'

// =============================================================================
// Anthropic Client
// =============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// =============================================================================
// Extraction Prompt
// =============================================================================

const CONCEPT_EXTRACTION_PROMPT = `You are analyzing educational content to extract atomic concepts for a knowledge graph.

## Rules for Concept Extraction:

1. Concepts should be ATOMIC - single ideas, not compound
   ✓ "Photosynthesis"
   ✓ "Derivative"
   ✗ "Photosynthesis and cellular respiration"
   ✗ "Derivatives and integrals"

2. Concepts should be CANONICAL - use standard terminology
   ✓ "Derivative"
   ✓ "Mitochondria"
   ✗ "The thing where you find the slope"
   ✗ "Powerhouse of the cell"

3. Concepts should be TESTABLE - can ask questions about them
   ✓ "Pythagorean theorem"
   ✓ "Newton's first law"
   ✗ "Math is important"
   ✗ "Understanding physics"

4. Extract PREREQUISITES - what must be understood first
   Example: "Chain rule" requires "Derivative" and "Composite functions"
   Example: "Krebs cycle" requires "Glycolysis" and "ATP"

5. Difficulty levels (1-5, Bloom's taxonomy):
   1 = Recall (remember facts, definitions)
   2 = Understand (explain, describe)
   3 = Apply (use in new situations)
   4 = Analyze (compare, contrast, break down)
   5 = Evaluate/Create (judge, synthesize, design)

6. Relationship types:
   - teaches: The content introduces and explains this concept
   - requires: The content assumes prior knowledge of this concept
   - reinforces: The content practices or reviews this concept

## Content to Analyze:

Course Title: {courseTitle}
{curriculumContext}

Lessons:
{lessonsContent}

## Output Format (JSON only, no markdown):

{
  "concepts": [
    {
      "name": "Concept Name",
      "description": "1-2 sentence definition that could appear in a glossary",
      "subject": "biology",
      "topic": "cell-biology",
      "subtopic": "cellular-respiration",
      "difficulty": 3,
      "prerequisites": ["Prerequisite Concept A", "Prerequisite Concept B"],
      "relatedConcepts": ["Related Concept C"]
    }
  ],
  "mappings": [
    {
      "lessonIndex": 0,
      "stepIndex": 2,
      "conceptName": "Concept Name",
      "relationship": "teaches"
    }
  ]
}

Extract 5-15 key concepts from this content. Focus on the most important, testable concepts.
Ensure every lesson has at least one concept mapped to it.
For each concept that has prerequisites, make sure those prerequisites are also in the concepts list.`

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Format lessons into a string for the prompt
 */
function formatLessonsForPrompt(lessons: Lesson[]): string {
  return lessons
    .map((lesson, i) => {
      const stepsContent = lesson.steps
        ?.map((step, j) => {
          const content = step.content || ''
          // Truncate long content
          const truncated = content.length > 300 ? content.substring(0, 300) + '...' : content
          return `    Step ${j + 1} [${step.type}]: ${truncated}`
        })
        .join('\n')

      return `Lesson ${i + 1}: ${lesson.title}\n${stepsContent || '    (No steps)'}`
    })
    .join('\n\n')
}

/**
 * Detect subject from course content
 */
function detectSubject(courseTitle: string, lessons: Lesson[]): string {
  const text = `${courseTitle} ${lessons.map((l) => l.title).join(' ')}`.toLowerCase()

  // Subject detection keywords
  const subjectKeywords: Record<string, string[]> = {
    biology: ['cell', 'dna', 'protein', 'organism', 'evolution', 'genetics', 'photosynthesis', 'mitosis'],
    chemistry: ['atom', 'molecule', 'reaction', 'element', 'compound', 'bond', 'acid', 'base'],
    physics: ['force', 'energy', 'motion', 'wave', 'electricity', 'momentum', 'newton', 'gravity'],
    mathematics: ['equation', 'function', 'derivative', 'integral', 'algebra', 'calculus', 'geometry'],
    'computer-science': ['algorithm', 'program', 'code', 'data', 'function', 'variable', 'loop'],
    economics: ['market', 'supply', 'demand', 'price', 'economy', 'gdp', 'inflation'],
    history: ['war', 'century', 'empire', 'revolution', 'civilization', 'treaty'],
    psychology: ['behavior', 'cognitive', 'mental', 'brain', 'perception', 'memory'],
  }

  let bestMatch = 'general'
  let bestScore = 0

  for (const [subject, keywords] of Object.entries(subjectKeywords)) {
    const score = keywords.filter((kw) => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = subject
    }
  }

  return bestMatch
}

/**
 * Detect topic from course content
 */
function detectTopic(courseTitle: string, lessons: Lesson[], subject: string): string {
  const text = `${courseTitle} ${lessons.map((l) => l.title).join(' ')}`.toLowerCase()

  // Topic detection by subject
  const topicKeywords: Record<string, Record<string, string[]>> = {
    biology: {
      'cell-biology': ['cell', 'membrane', 'organelle', 'mitochondria', 'nucleus'],
      genetics: ['dna', 'gene', 'chromosome', 'heredity', 'mutation'],
      ecology: ['ecosystem', 'food chain', 'habitat', 'biodiversity'],
      'human-physiology': ['heart', 'blood', 'nervous', 'digestive', 'respiratory'],
    },
    mathematics: {
      calculus: ['derivative', 'integral', 'limit', 'differentiation'],
      algebra: ['equation', 'polynomial', 'factor', 'quadratic'],
      geometry: ['triangle', 'circle', 'angle', 'area', 'volume'],
      statistics: ['probability', 'mean', 'deviation', 'distribution'],
    },
    physics: {
      mechanics: ['force', 'motion', 'velocity', 'acceleration', 'momentum'],
      thermodynamics: ['heat', 'temperature', 'entropy', 'energy transfer'],
      'electricity-magnetism': ['current', 'voltage', 'resistance', 'magnetic'],
      waves: ['wave', 'frequency', 'amplitude', 'sound', 'light'],
    },
  }

  const subjectTopics = topicKeywords[subject] || {}
  let bestMatch = 'general'
  let bestScore = 0

  for (const [topic, keywords] of Object.entries(subjectTopics)) {
    const score = keywords.filter((kw) => text.includes(kw)).length
    if (score > bestScore) {
      bestScore = score
      bestMatch = topic
    }
  }

  return bestMatch
}

// =============================================================================
// Main Extraction Function
// =============================================================================

/**
 * Extract concepts from a course using AI
 */
export async function extractConceptsFromCourse(
  course: GeneratedCourse & { id: string; title: string },
  curriculumContext?: string
): Promise<ConceptExtractionResult> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured')
  }

  const lessons = course.lessons || []
  if (lessons.length === 0) {
    throw new Error('Course has no lessons to extract concepts from')
  }

  // Detect subject and topic
  const subject = detectSubject(course.title, lessons)
  const topic = detectTopic(course.title, lessons, subject)

  // Build the prompt
  const lessonsContent = formatLessonsForPrompt(lessons)
  const prompt = CONCEPT_EXTRACTION_PROMPT.replace('{courseTitle}', course.title)
    .replace('{curriculumContext}', curriculumContext ? `\nCurriculum Context:\n${curriculumContext}\n` : '')
    .replace('{lessonsContent}', lessonsContent)

  // Call Claude
  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5-20250929',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  })

  // Parse response
  const textContent = response.content.find((c) => c.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    throw new Error('No text response from AI')
  }

  // Extract JSON from response (handle potential markdown code blocks)
  let jsonStr = textContent.text.trim()
  if (jsonStr.startsWith('```json')) {
    jsonStr = jsonStr.slice(7)
  }
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.slice(3)
  }
  if (jsonStr.endsWith('```')) {
    jsonStr = jsonStr.slice(0, -3)
  }
  jsonStr = jsonStr.trim()

  const parsed = JSON.parse(jsonStr) as {
    concepts: ExtractedConcept[]
    mappings: ExtractedConceptMapping[]
  }

  // Validate and enrich concepts with detected subject/topic
  const enrichedConcepts = parsed.concepts.map((c) => ({
    ...c,
    subject: c.subject || subject,
    topic: c.topic || topic,
    difficulty: Math.min(5, Math.max(1, c.difficulty || 3)),
  }))

  return {
    concepts: enrichedConcepts,
    mappings: parsed.mappings,
    metadata: {
      courseId: course.id,
      extractedAt: new Date().toISOString(),
      modelUsed: 'claude-sonnet-4-5-20250929',
      conceptCount: enrichedConcepts.length,
      mappingCount: parsed.mappings.length,
    },
  }
}

// =============================================================================
// Database Storage Functions
// =============================================================================

/**
 * Store extracted concepts in the database
 * Returns a map of concept names to their IDs
 */
export async function storeConcepts(
  concepts: ExtractedConcept[],
  studySystem?: string
): Promise<Map<string, string>> {
  const supabase = await createClient()
  const conceptNameToId = new Map<string, string>()

  for (const concept of concepts) {
    // Check if concept already exists
    const { data: existing } = await supabase
      .from('concepts')
      .select('id')
      .eq('name', concept.name)
      .eq('subject', concept.subject)
      .eq('topic', concept.topic)
      .maybeSingle()

    if (existing) {
      conceptNameToId.set(concept.name, existing.id)
      continue
    }

    // Insert new concept
    const insertData: ConceptInsert = {
      name: concept.name,
      description: concept.description,
      subject: concept.subject,
      topic: concept.topic,
      subtopic: concept.subtopic,
      study_system: studySystem,
      difficulty_level: concept.difficulty,
    }

    const { data: inserted, error } = await supabase
      .from('concepts')
      .insert(insertData)
      .select('id')
      .single()

    if (error) {
      console.error(`Failed to insert concept "${concept.name}":`, error)
      continue
    }

    if (inserted) {
      conceptNameToId.set(concept.name, inserted.id)
    }
  }

  return conceptNameToId
}

/**
 * Build prerequisite edges between concepts
 */
export async function buildPrerequisiteEdges(
  concepts: ExtractedConcept[],
  conceptNameToId: Map<string, string>
): Promise<void> {
  const supabase = await createClient()

  for (const concept of concepts) {
    const conceptId = conceptNameToId.get(concept.name)
    if (!conceptId) continue

    for (const prereqName of concept.prerequisites || []) {
      const prereqId = conceptNameToId.get(prereqName)
      if (!prereqId) continue

      // Skip self-references
      if (conceptId === prereqId) continue

      // Insert prerequisite relationship (ignore duplicates)
      await supabase
        .from('concept_prerequisites')
        .upsert(
          {
            concept_id: conceptId,
            prerequisite_id: prereqId,
            dependency_strength: 2, // Default to "important"
          },
          {
            onConflict: 'concept_id,prerequisite_id',
            ignoreDuplicates: true,
          }
        )
    }
  }
}

/**
 * Store content-to-concept mappings
 */
export async function storeContentMappings(
  courseId: string,
  mappings: ExtractedConceptMapping[],
  conceptNameToId: Map<string, string>
): Promise<void> {
  const supabase = await createClient()

  const insertData: ContentConceptInsert[] = []

  for (const mapping of mappings) {
    const conceptId = conceptNameToId.get(mapping.conceptName)
    if (!conceptId) continue

    insertData.push({
      course_id: courseId,
      lesson_index: mapping.lessonIndex,
      step_index: mapping.stepIndex,
      concept_id: conceptId,
      relationship_type: mapping.relationship,
    })
  }

  if (insertData.length > 0) {
    // Delete existing mappings for this course first
    await supabase.from('content_concepts').delete().eq('course_id', courseId)

    // Insert new mappings
    const { error } = await supabase.from('content_concepts').insert(insertData)

    if (error) {
      console.error('Failed to insert content mappings:', error)
    }
  }
}

// =============================================================================
// Full Extraction Pipeline
// =============================================================================

/**
 * Full pipeline: Extract concepts, store them, and build relationships
 */
export async function extractAndStoreConcepts(
  course: GeneratedCourse & { id: string; title: string },
  curriculumContext?: string,
  studySystem?: string
): Promise<ConceptExtractionResult> {
  // 1. Extract concepts using AI
  const result = await extractConceptsFromCourse(course, curriculumContext)

  // 2. Store concepts in database
  const conceptNameToId = await storeConcepts(result.concepts, studySystem)

  // 3. Build prerequisite edges
  await buildPrerequisiteEdges(result.concepts, conceptNameToId)

  // 4. Store content mappings
  await storeContentMappings(course.id, result.mappings, conceptNameToId)

  return result
}

// =============================================================================
// Utility: Get concepts for a course
// =============================================================================

/**
 * Get all concepts associated with a course
 */
export async function getConceptsForCourse(courseId: string): Promise<Concept[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content_concepts')
    .select(
      `
      concept_id,
      concepts (*)
    `
    )
    .eq('course_id', courseId)

  if (error) {
    console.error('Failed to get concepts for course:', error)
    return []
  }

  // Extract unique concepts
  const conceptMap = new Map<string, Concept>()
  for (const row of data || []) {
    const concept = row.concepts as unknown as Concept
    if (concept && !conceptMap.has(concept.id)) {
      conceptMap.set(concept.id, concept)
    }
  }

  return Array.from(conceptMap.values())
}

/**
 * Get concepts for a specific lesson
 */
export async function getConceptsForLesson(
  courseId: string,
  lessonIndex: number
): Promise<{ concept: Concept; relationship: string }[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('content_concepts')
    .select(
      `
      relationship_type,
      concepts (*)
    `
    )
    .eq('course_id', courseId)
    .eq('lesson_index', lessonIndex)

  if (error) {
    console.error('Failed to get concepts for lesson:', error)
    return []
  }

  return (data || []).map((row) => ({
    concept: row.concepts as unknown as Concept,
    relationship: row.relationship_type,
  }))
}
