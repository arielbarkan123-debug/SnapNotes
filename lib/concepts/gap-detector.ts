/**
 * Knowledge Gap Detector
 *
 * Analyzes user performance and concept mastery to detect knowledge gaps.
 * Identifies missing prerequisites, weak foundations, and concept decay.
 */

import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { createPrerequisiteGraph } from './prerequisite-graph'
import type {
  Concept,
  UserConceptMastery,
  UserKnowledgeGap,
  UserKnowledgeGapInsert,
  DetectedGap,
  GapDetectionInput,
  GapDetectionResult,
  GapType,
  GapSeverity,
} from './types'

// =============================================================================
// Constants
// =============================================================================

const MASTERY_THRESHOLD = 0.3 // Below this is considered a gap
const DECAY_THRESHOLD = 0.3 // Drop by this much is considered decay
const CONSECUTIVE_FAILURES_THRESHOLD = 2 // Consecutive failures to flag weak foundation
const DECAY_DAYS_THRESHOLD = 7 // Days without review to check for decay

// =============================================================================
// Anthropic Client (for AI explanations)
// =============================================================================

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || '',
})

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get user's mastery for all concepts
 */
async function getUserMasteryMap(userId: string): Promise<Map<string, UserConceptMastery>> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_concept_mastery')
    .select('*')
    .eq('user_id', userId)

  if (error) {
    console.error('Failed to get user mastery:', error)
    return new Map()
  }

  const map = new Map<string, UserConceptMastery>()
  for (const row of data || []) {
    map.set(row.concept_id, row)
  }

  return map
}

/**
 * Get concept details by IDs
 */
async function getConceptsByIds(conceptIds: string[]): Promise<Map<string, Concept>> {
  if (conceptIds.length === 0) return new Map()

  const supabase = await createClient()

  const { data, error } = await supabase.from('concepts').select('*').in('id', conceptIds)

  if (error) {
    console.error('Failed to get concepts:', error)
    return new Map()
  }

  const map = new Map<string, Concept>()
  for (const concept of data || []) {
    map.set(concept.id, concept)
  }

  return map
}

/**
 * Count consecutive failures for a concept in recent performance
 */
function countConsecutiveFailures(
  performance: { conceptId: string; isCorrect: boolean }[],
  conceptId: string
): number {
  // Filter to this concept and get most recent first
  const conceptPerf = performance
    .filter((p) => p.conceptId === conceptId)
    .reverse() // Most recent first

  let count = 0
  for (const p of conceptPerf) {
    if (!p.isCorrect) {
      count++
    } else {
      break // Stop at first correct answer
    }
  }

  return count
}

/**
 * Calculate days between two dates
 */
function daysBetween(date1: Date, date2: Date): number {
  const ms = Math.abs(date2.getTime() - date1.getTime())
  return Math.floor(ms / (1000 * 60 * 60 * 24))
}

/**
 * Determine severity based on context
 */
function determineSeverity(
  gapType: GapType,
  mastery: number,
  isBlockingCriticalContent: boolean
): GapSeverity {
  if (gapType === 'never_learned' || gapType === 'missing_prerequisite') {
    return isBlockingCriticalContent ? 'critical' : 'moderate'
  }

  if (gapType === 'weak_foundation') {
    return mastery < 0.2 ? 'critical' : 'moderate'
  }

  if (gapType === 'decay') {
    return mastery < 0.2 ? 'moderate' : 'minor'
  }

  return 'minor'
}

// =============================================================================
// Main Gap Detection
// =============================================================================

/**
 * Detect knowledge gaps for a user
 */
export async function detectKnowledgeGaps(input: GapDetectionInput): Promise<GapDetectionResult> {
  const { userId, courseId, lessonIndex, targetConcepts, recentPerformance } = input

  const gaps: DetectedGap[] = []

  // Get user's current mastery
  const masteryMap = await getUserMasteryMap(userId)

  // Get target concept IDs (either provided or from course/lesson)
  let conceptsToCheck: string[] = targetConcepts || []

  if (conceptsToCheck.length === 0 && courseId) {
    // Get concepts from the course/lesson
    const supabase = await createClient()
    let query = supabase.from('content_concepts').select('concept_id').eq('course_id', courseId)

    if (lessonIndex !== undefined) {
      query = query.eq('lesson_index', lessonIndex)
    }

    const { data } = await query
    conceptsToCheck = (data || []).map((r) => r.concept_id)
  }

  if (conceptsToCheck.length === 0) {
    return {
      gaps: [],
      analyzedConcepts: 0,
      hasBlockingGaps: false,
      recommendedAction: 'continue',
    }
  }

  // Load prerequisite graph for these concepts
  const graph = await createPrerequisiteGraph({ conceptIds: conceptsToCheck })

  // Get concept details
  const allConceptIds = new Set(conceptsToCheck)
  for (const conceptId of conceptsToCheck) {
    const prereqs = graph.getAllPrerequisites(conceptId)
    prereqs.forEach((p) => allConceptIds.add(p))
  }
  const conceptDetails = await getConceptsByIds(Array.from(allConceptIds))

  // 1. Check for missing prerequisites
  for (const conceptId of conceptsToCheck) {
    const prereqs = graph.getAllPrerequisites(conceptId)

    for (const prereqId of prereqs) {
      const mastery = masteryMap.get(prereqId)
      const masteryLevel = mastery?.mastery_level ?? 0

      if (masteryLevel < MASTERY_THRESHOLD) {
        const concept = conceptDetails.get(prereqId)
        const gapType: GapType = masteryLevel === 0 ? 'never_learned' : 'missing_prerequisite'
        const severity = determineSeverity(gapType, masteryLevel, true)

        // Check if we already have this gap
        if (!gaps.some((g) => g.conceptId === prereqId && g.gapType === gapType)) {
          gaps.push({
            conceptId: prereqId,
            conceptName: concept?.name,
            gapType,
            severity,
            confidence: 0.9,
            blockedConcepts: [conceptId],
            evidence: {
              recentFailures: 0,
              consecutiveFailures: 0,
            },
          })
        }
      }
    }
  }

  // 2. Check recent performance for weak foundations
  if (recentPerformance && recentPerformance.length > 0) {
    // Group by concept
    const perfByConcept = new Map<string, typeof recentPerformance>()
    for (const p of recentPerformance) {
      if (!perfByConcept.has(p.conceptId)) {
        perfByConcept.set(p.conceptId, [])
      }
      perfByConcept.get(p.conceptId)!.push(p)
    }

    for (const [conceptId, perf] of perfByConcept) {
      const failures = perf.filter((p) => !p.isCorrect).length
      const consecutiveFailures = countConsecutiveFailures(perf, conceptId)
      const failureRate = failures / perf.length

      if (consecutiveFailures >= CONSECUTIVE_FAILURES_THRESHOLD || failureRate > 0.5) {
        const concept = conceptDetails.get(conceptId)
        const _mastery = masteryMap.get(conceptId)?.mastery_level ?? 0

        // Don't duplicate if already have a gap for this concept
        if (!gaps.some((g) => g.conceptId === conceptId)) {
          gaps.push({
            conceptId,
            conceptName: concept?.name,
            gapType: 'weak_foundation',
            severity: consecutiveFailures >= 3 ? 'critical' : 'moderate',
            confidence: 0.85,
            evidence: {
              recentFailures: failures,
              consecutiveFailures,
            },
          })
        }
      }
    }
  }

  // 3. Check for concept decay
  const now = new Date()
  for (const [conceptId, mastery] of masteryMap) {
    // Only check concepts relevant to our context
    if (!allConceptIds.has(conceptId)) continue

    const peakMastery = mastery.peak_mastery ?? 0
    const currentMastery = mastery.mastery_level ?? 0
    const lastReviewedAt = mastery.last_reviewed_at ? new Date(mastery.last_reviewed_at) : null

    // Check for decay: had mastery, now dropped, and not reviewed recently
    if (
      peakMastery >= 0.6 &&
      currentMastery < peakMastery * (1 - DECAY_THRESHOLD) &&
      lastReviewedAt
    ) {
      const daysSince = daysBetween(lastReviewedAt, now)

      if (daysSince >= DECAY_DAYS_THRESHOLD) {
        const concept = conceptDetails.get(conceptId)
        const decayAmount = peakMastery - currentMastery

        // Don't duplicate
        if (!gaps.some((g) => g.conceptId === conceptId)) {
          gaps.push({
            conceptId,
            conceptName: concept?.name,
            gapType: 'decay',
            severity: currentMastery < 0.3 ? 'moderate' : 'minor',
            confidence: 0.8,
            evidence: {
              daysSinceReview: daysSince,
              masteryDecay: decayAmount,
            },
          })
        }
      }
    }
  }

  // Sort gaps by severity (critical first) then confidence
  const severityOrder: Record<GapSeverity, number> = { critical: 0, moderate: 1, minor: 2 }
  gaps.sort((a, b) => {
    const severityDiff = severityOrder[a.severity] - severityOrder[b.severity]
    if (severityDiff !== 0) return severityDiff
    return b.confidence - a.confidence
  })

  // Determine if there are blocking gaps
  const hasBlockingGaps = gaps.some(
    (g) => g.severity === 'critical' && (g.gapType === 'missing_prerequisite' || g.gapType === 'never_learned')
  )

  // Recommend action
  let recommendedAction: 'review' | 'practice' | 'continue' = 'continue'
  if (hasBlockingGaps) {
    recommendedAction = 'review'
  } else if (gaps.some((g) => g.gapType === 'weak_foundation' || g.gapType === 'decay')) {
    recommendedAction = 'practice'
  }

  return {
    gaps,
    analyzedConcepts: conceptsToCheck.length,
    hasBlockingGaps,
    recommendedAction,
  }
}

// =============================================================================
// AI-Enhanced Gap Explanations
// =============================================================================

/**
 * Enrich gaps with AI-generated explanations and remediation suggestions
 */
export async function enrichGapsWithAI(
  gaps: DetectedGap[],
  courseContext?: string
): Promise<DetectedGap[]> {
  if (!process.env.ANTHROPIC_API_KEY || gaps.length === 0) {
    return gaps
  }

  const gapsSummary = gaps
    .map((g) => `- ${g.conceptName || g.conceptId}: ${g.gapType} (${g.severity})`)
    .join('\n')

  const prompt = `You are helping a student understand their knowledge gaps and how to address them.

Here are the detected knowledge gaps:
${gapsSummary}

${courseContext ? `Course context: ${courseContext}` : ''}

For each gap, provide a brief, encouraging explanation of:
1. What this gap means for their learning (1 sentence)
2. A specific action they can take to address it (1 sentence)

Format your response as JSON:
{
  "explanations": [
    {
      "conceptName": "Concept Name",
      "explanation": "Brief explanation of what this gap means...",
      "remediation": "Specific action to take..."
    }
  ]
}

Be concise, supportive, and actionable. Use simple language.`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-3-5-haiku-20241022', // Fast model for quick responses
      max_tokens: 1000,
      messages: [{ role: 'user', content: prompt }],
    })

    const textContent = response.content.find((c) => c.type === 'text')
    if (!textContent || textContent.type !== 'text') return gaps

    // Parse JSON from response
    let jsonStr = textContent.text.trim()
    if (jsonStr.startsWith('```json')) jsonStr = jsonStr.slice(7)
    if (jsonStr.startsWith('```')) jsonStr = jsonStr.slice(3)
    if (jsonStr.endsWith('```')) jsonStr = jsonStr.slice(0, -3)

    const parsed = JSON.parse(jsonStr.trim()) as {
      explanations: { conceptName: string; explanation: string; remediation: string }[]
    }

    // Merge explanations into gaps
    for (const gap of gaps) {
      const match = parsed.explanations.find(
        (e) => e.conceptName === gap.conceptName || e.conceptName === gap.conceptId
      )
      if (match) {
        gap.explanation = match.explanation
        gap.remediation = match.remediation
      }
    }
  } catch (error) {
    console.error('Failed to enrich gaps with AI:', error)
    // Return gaps without AI enrichment
  }

  return gaps
}

// =============================================================================
// Gap Storage
// =============================================================================

/**
 * Store detected gaps in the database
 */
export async function storeGaps(
  userId: string,
  gaps: DetectedGap[],
  courseId?: string,
  lessonIndex?: number
): Promise<void> {
  if (gaps.length === 0) return

  const supabase = await createClient()

  for (const gap of gaps) {
    const insertData: UserKnowledgeGapInsert = {
      user_id: userId,
      concept_id: gap.conceptId,
      gap_type: gap.gapType,
      severity: gap.severity,
      confidence: gap.confidence,
      detected_from_course_id: courseId,
      detected_from_lesson_index: lessonIndex,
      ai_explanation: gap.explanation,
      suggested_remediation: gap.remediation,
      blocked_concepts: gap.blockedConcepts,
    }

    // Upsert to handle duplicate gaps
    await supabase.from('user_knowledge_gaps').upsert(insertData, {
      onConflict: 'user_id,concept_id,gap_type',
    })
  }
}

/**
 * Mark a gap as resolved
 */
export async function resolveGap(gapId: string): Promise<void> {
  const supabase = await createClient()

  await supabase
    .from('user_knowledge_gaps')
    .update({
      resolved: true,
      resolved_at: new Date().toISOString(),
    })
    .eq('id', gapId)
}

/**
 * Get unresolved gaps for a user
 */
export async function getUnresolvedGaps(userId: string): Promise<UserKnowledgeGap[]> {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_knowledge_gaps')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .order('severity', { ascending: true }) // critical first
    .order('detected_at', { ascending: false })

  if (error) {
    console.error('Failed to get unresolved gaps:', error)
    return []
  }

  return data || []
}

/**
 * Get gaps for specific concepts
 */
export async function getGapsForConcepts(
  userId: string,
  conceptIds: string[]
): Promise<UserKnowledgeGap[]> {
  if (conceptIds.length === 0) return []

  const supabase = await createClient()

  const { data, error } = await supabase
    .from('user_knowledge_gaps')
    .select('*')
    .eq('user_id', userId)
    .eq('resolved', false)
    .in('concept_id', conceptIds)

  if (error) {
    console.error('Failed to get gaps for concepts:', error)
    return []
  }

  return data || []
}

// =============================================================================
// Prerequisite Check (for lesson start)
// =============================================================================

/**
 * Check prerequisites before starting a lesson
 * Returns gaps that might prevent successful learning
 */
export async function checkPrerequisitesForLesson(
  userId: string,
  courseId: string,
  lessonIndex: number
): Promise<GapDetectionResult> {
  // Get concepts required by this lesson
  const supabase = await createClient()

  const { data: requiredConcepts } = await supabase
    .from('content_concepts')
    .select('concept_id')
    .eq('course_id', courseId)
    .eq('lesson_index', lessonIndex)
    .eq('relationship_type', 'requires')

  const conceptIds = (requiredConcepts || []).map((r) => r.concept_id)

  if (conceptIds.length === 0) {
    // No explicit requirements, check concepts taught in previous lessons
    const { data: prevConcepts } = await supabase
      .from('content_concepts')
      .select('concept_id')
      .eq('course_id', courseId)
      .lt('lesson_index', lessonIndex)
      .eq('relationship_type', 'teaches')

    conceptIds.push(...(prevConcepts || []).map((r) => r.concept_id))
  }

  // Run gap detection
  return detectKnowledgeGaps({
    userId,
    courseId,
    lessonIndex,
    targetConcepts: conceptIds,
  })
}
