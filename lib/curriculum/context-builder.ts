/**
 * Curriculum Context Builder
 *
 * Builds tiered curriculum context strings for AI prompt injection.
 * Tier 1: System overview (always for non-general systems)
 * Tier 2: Subject context (when subject is known or detected)
 * Tier 3: Topic details (for exams/practice with specific topic)
 */

import type {
  StudySystem,
  SystemOverview,
  SubjectOverview,
  TopicDetails,
  CurriculumContext,
  CurriculumContextMetadata,
  ContextBuilderOptions,
  ContextPurpose,
} from './types'

import {
  loadSystemOverview,
  loadSubjectOverview,
  loadTopicDetails,
} from './loader'

import { detectSubjectFromContent, detectTopicFromContent } from './subject-detector'

// =============================================================================
// Token Budgets by Purpose
// =============================================================================

const DEFAULT_TOKEN_BUDGETS: Record<ContextPurpose, { tier1: number; tier2: number; tier3: number }> = {
  course: { tier1: 500, tier2: 1500, tier3: 0 },
  exam: { tier1: 500, tier2: 2000, tier3: 2500 },
  practice: { tier1: 300, tier2: 1500, tier3: 2000 },
  chat: { tier1: 300, tier2: 1000, tier3: 1500 },
  evaluation: { tier1: 200, tier2: 500, tier3: 1000 },
}

// =============================================================================
// Main Context Builder
// =============================================================================

export async function buildCurriculumContext(
  options: ContextBuilderOptions
): Promise<CurriculumContext> {
  const { userProfile, contentSample, specificSubject, specificTopic, purpose, includeRawData } = options

  const tokenBudget = {
    ...DEFAULT_TOKEN_BUDGETS[purpose],
    ...options.tokenBudget,
  }

  const metadata: CurriculumContextMetadata = {
    system: userProfile.studySystem,
    subject: null,
    subjectLevel: undefined,
    topic: null,
    detectedFromContent: false,
    tokenEstimate: { tier1: 0, tier2: 0, tier3: 0, total: 0 },
  }

  const result: CurriculumContext = {
    tier1: null,
    tier2: null,
    tier3: null,
    metadata,
  }

  // Skip for general/other systems
  if (userProfile.studySystem === 'general' || userProfile.studySystem === 'other') {
    return result
  }

  // ==========================================================================
  // Tier 1: System Overview
  // ==========================================================================

  const systemData = await loadSystemOverview(userProfile.studySystem)
  if (systemData) {
    result.tier1 = formatSystemOverview(systemData, tokenBudget.tier1)
    metadata.tokenEstimate.tier1 = estimateTokens(result.tier1)
    if (includeRawData) {
      result.raw = { ...result.raw, system: systemData }
    }
  }

  // ==========================================================================
  // Tier 2: Subject Context
  // ==========================================================================

  let subjectId = specificSubject || userProfile.subjects?.[0]

  // Try to detect subject from content if not provided
  if (!subjectId && contentSample) {
    const detection = await detectSubjectFromContent(
      contentSample,
      userProfile.studySystem,
      userProfile.subjects || []
    )
    if (detection.subject && detection.confidence > 0.5) {
      subjectId = detection.subject
      metadata.detectedFromContent = true
    }
  }

  if (subjectId) {
    // Determine the full subject ID with level if applicable
    const level = userProfile.subjectLevels?.[subjectId.replace(/-(?:hl|sl)$/i, '')]
    const fullSubjectId = level ? `${subjectId.replace(/-(?:hl|sl)$/i, '')}-${level.toLowerCase()}` : subjectId

    const subjectData = await loadSubjectOverview(userProfile.studySystem, fullSubjectId)
    if (subjectData) {
      result.tier2 = formatSubjectOverview(subjectData, tokenBudget.tier2, userProfile.examFormat)
      metadata.subject = fullSubjectId
      metadata.subjectLevel = level
      metadata.tokenEstimate.tier2 = estimateTokens(result.tier2)
      if (includeRawData) {
        result.raw = { ...result.raw, subject: subjectData }
      }
    }
  }

  // ==========================================================================
  // Tier 3: Topic Details (only for exam/practice)
  // ==========================================================================

  if (['exam', 'practice'].includes(purpose) && subjectId && contentSample) {
    let topicId = specificTopic

    // Try to detect topic from content
    if (!topicId) {
      const topicDetection = await detectTopicFromContent(
        contentSample,
        userProfile.studySystem,
        subjectId
      )
      if (topicDetection.topicId && topicDetection.confidence > 0.5) {
        topicId = topicDetection.topicId
        metadata.detectedFromContent = true
      }
    }

    if (topicId) {
      const topicData = await loadTopicDetails(userProfile.studySystem, subjectId, topicId)
      if (topicData) {
        const isHL = metadata.subjectLevel === 'HL'
        result.tier3 = formatTopicDetails(topicData, tokenBudget.tier3, isHL)
        metadata.topic = topicId
        metadata.tokenEstimate.tier3 = estimateTokens(result.tier3)
        if (includeRawData) {
          result.raw = { ...result.raw, topic: topicData }
        }
      }
    }
  }

  // Calculate total token estimate
  metadata.tokenEstimate.total =
    metadata.tokenEstimate.tier1 + metadata.tokenEstimate.tier2 + metadata.tokenEstimate.tier3

  return result
}

// =============================================================================
// Formatters
// =============================================================================

function formatSystemOverview(system: SystemOverview, maxTokens: number): string {
  const parts: string[] = []

  // System header
  parts.push(`### ${system.name}`)
  parts.push(system.description)
  parts.push('')

  // Grading
  parts.push(`**Grading:** ${system.grading.scale}`)
  parts.push(`**Passing:** ${system.grading.passingGrade}`)
  parts.push('')

  // Assessment philosophy (abbreviated if needed)
  const philosophy = truncateToTokens(system.assessmentPhilosophy, 100)
  parts.push(`**Assessment Philosophy:** ${philosophy}`)
  parts.push('')

  // Command terms (top 10-15)
  if (system.commandTerms && system.commandTerms.length > 0) {
    parts.push('**Key Command Terms:**')
    const topTerms = system.commandTerms.slice(0, 12)
    for (const term of topTerms) {
      parts.push(`- **${term.term}**: ${term.definition}`)
    }
  }

  return truncateToTokens(parts.join('\n'), maxTokens)
}

function formatSubjectOverview(
  subject: SubjectOverview,
  maxTokens: number,
  _examFormat?: string // Reserved for future use to customize output based on format
): string {
  const parts: string[] = []

  // Subject header
  parts.push(`### ${subject.name}`)
  if (subject.levels) {
    parts.push(`*Levels: ${subject.levels.join(', ')}*`)
  }
  parts.push('')

  // Assessment components
  parts.push('**Assessment Structure:**')
  for (const component of subject.assessmentComponents) {
    let line = `- **${component.name}** (${component.weight}%)`
    if (component.duration) {
      line += ` - ${component.duration}`
    }
    parts.push(line)
    if (component.structure) {
      parts.push(`  ${component.structure}`)
    }
  }
  parts.push('')

  // Assessment objectives
  parts.push('**Assessment Objectives:**')
  for (const ao of subject.assessmentObjectives) {
    parts.push(`- **${ao.id}** (${ao.weight || 0}%): ${ao.description}`)
    if (ao.verbs && ao.verbs.length > 0) {
      parts.push(`  Verbs: ${ao.verbs.slice(0, 6).join(', ')}`)
    }
  }
  parts.push('')

  // Topic list (abbreviated)
  parts.push('**Topics:**')
  for (const topic of subject.topicList.slice(0, 12)) {
    let topicLine = `- ${topic.id}. ${topic.name}`
    if (topic.hlOnly) topicLine += ' (HL only)'
    parts.push(topicLine)
  }
  if (subject.topicList.length > 12) {
    parts.push(`- ... and ${subject.topicList.length - 12} more topics`)
  }

  // Command terms subset if available
  if (subject.commandTermsSubset && subject.commandTermsSubset.length > 0) {
    parts.push('')
    parts.push(`**Subject Command Terms:** ${subject.commandTermsSubset.join(', ')}`)
  }

  // IA guidelines if available
  if (subject.iaGuidelines) {
    parts.push('')
    parts.push(`**Internal Assessment:** ${truncateToTokens(subject.iaGuidelines, 80)}`)
  }

  return truncateToTokens(parts.join('\n'), maxTokens)
}

function formatTopicDetails(topic: TopicDetails, maxTokens: number, includeHL: boolean): string {
  const parts: string[] = []

  // Topic header
  parts.push(`### Topic ${topic.topicId}: ${topic.name}`)
  parts.push('')

  // Core understandings
  parts.push('**Learning Objectives:**')
  for (const understanding of topic.understandings.slice(0, 8)) {
    parts.push(`- ${understanding}`)
  }

  // HL extensions if applicable
  if (includeHL && topic.hlExtensions?.understandings) {
    parts.push('')
    parts.push('**HL Extensions:**')
    for (const hlUnderstanding of topic.hlExtensions.understandings.slice(0, 4)) {
      parts.push(`- ${hlUnderstanding}`)
    }
  }
  parts.push('')

  // Key concepts
  if (topic.keyConcepts && topic.keyConcepts.length > 0) {
    parts.push('**Key Concepts:**')
    for (const concept of topic.keyConcepts.slice(0, 6)) {
      parts.push(`- **${concept.term}**: ${concept.definition}`)
    }
    parts.push('')
  }

  // Common misconceptions
  if (topic.commonMisconceptions && topic.commonMisconceptions.length > 0) {
    parts.push('**Common Misconceptions:**')
    for (const misc of topic.commonMisconceptions.slice(0, 4)) {
      parts.push(`- "${misc.misconception}" → ${misc.correction}`)
    }
    parts.push('')
  }

  // Exam focus
  if (topic.examFocus) {
    parts.push('**Exam Focus:**')
    if (topic.examFocus.frequentlyTested) {
      parts.push(`Frequently tested: ${topic.examFocus.frequentlyTested.slice(0, 4).join('; ')}`)
    }
    if (topic.examFocus.typicalQuestions) {
      parts.push('Typical question stems:')
      for (const q of topic.examFocus.typicalQuestions.slice(0, 3)) {
        parts.push(`- "${q}"`)
      }
    }
    if (topic.examFocus.markingNotes) {
      parts.push('')
      parts.push('**Marking Notes:**')
      for (const note of topic.examFocus.markingNotes.slice(0, 3)) {
        parts.push(`- ${note}`)
      }
    }
  }

  return truncateToTokens(parts.join('\n'), maxTokens)
}

// =============================================================================
// Helpers
// =============================================================================

function estimateTokens(text: string | null): number {
  if (!text) return 0
  // Rough estimate: ~4 characters per token
  return Math.ceil(text.length / 4)
}

function truncateToTokens(text: string, maxTokens: number): string {
  const maxChars = maxTokens * 4
  if (text.length <= maxChars) return text
  return text.substring(0, maxChars - 3) + '...'
}

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Build context for course generation
 */
export async function buildCourseContext(
  studySystem: StudySystem,
  subjects?: string[],
  contentSample?: string
): Promise<CurriculumContext> {
  return buildCurriculumContext({
    userProfile: { studySystem, subjects },
    contentSample,
    purpose: 'course',
  })
}

/**
 * Build context for exam generation
 */
export async function buildExamContext(
  studySystem: StudySystem,
  subjects: string[],
  subjectLevels?: Record<string, string>,
  examFormat?: 'match_real' | 'inspired_by',
  contentSample?: string
): Promise<CurriculumContext> {
  return buildCurriculumContext({
    userProfile: { studySystem, subjects, subjectLevels, examFormat },
    contentSample,
    purpose: 'exam',
  })
}

/**
 * Build context for chat/tutoring
 */
export async function buildChatContext(
  studySystem: StudySystem,
  subjects?: string[],
  contentSample?: string
): Promise<CurriculumContext> {
  return buildCurriculumContext({
    userProfile: { studySystem, subjects },
    contentSample,
    purpose: 'chat',
  })
}

// =============================================================================
// Format Context for Prompt Injection
// =============================================================================

/**
 * Formats curriculum context as a single string for prompt injection
 */
export function formatContextForPrompt(context: CurriculumContext): string {
  const parts: string[] = []

  if (context.tier1) {
    parts.push('## Curriculum System')
    parts.push(context.tier1)
  }

  if (context.tier2) {
    parts.push('')
    parts.push('## Subject Requirements')
    parts.push(context.tier2)
  }

  if (context.tier3) {
    parts.push('')
    parts.push('## Topic Specifics')
    parts.push(context.tier3)
  }

  return parts.join('\n')
}

/**
 * Checks if context has meaningful curriculum data
 */
export function hasSignificantContext(context: CurriculumContext): boolean {
  return !!(context.tier1 || context.tier2 || context.tier3)
}
