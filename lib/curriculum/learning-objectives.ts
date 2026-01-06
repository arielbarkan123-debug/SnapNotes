/**
 * Learning Objectives Module
 *
 * Validates and manages AI-generated Learning Objectives with Bloom's Taxonomy alignment.
 * Research finding: AI-generated LOs are comparable to human-crafted ones in alignment.
 */

import { BLOOMS_TAXONOMY } from '@/lib/ai/prompts'

// =============================================================================
// Types
// =============================================================================

export type BloomLevel = 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'

export interface LearningObjective {
  id: string
  objective: string
  bloomLevel: BloomLevel
  actionVerb: string
  curriculumStandard?: string // Optional alignment to curriculum standard
  assessable?: boolean // Whether this LO can be assessed in the course
}

export interface CurriculumAlignment {
  system: string // e.g., 'israeli_bagrut', 'common_core', 'ib'
  subject: string
  topics: string[]
  assessmentObjectives?: string[]
  standards?: CurriculumStandard[]
}

export interface CurriculumStandard {
  id: string
  description: string
  category?: string
}

export interface LOValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
  suggestions: string[]
}

// =============================================================================
// Validation Functions
// =============================================================================

/**
 * Validates a single learning objective
 */
export function validateLearningObjective(lo: LearningObjective): LOValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  const suggestions: string[] = []

  // Check required fields
  if (!lo.id) {
    errors.push('Learning objective must have an ID')
  }

  if (!lo.objective || lo.objective.trim().length === 0) {
    errors.push('Learning objective text is required')
  }

  if (!lo.bloomLevel || !Object.keys(BLOOMS_TAXONOMY).includes(lo.bloomLevel)) {
    errors.push(`Invalid Bloom's level: ${lo.bloomLevel}. Must be one of: ${Object.keys(BLOOMS_TAXONOMY).join(', ')}`)
  }

  if (!lo.actionVerb || lo.actionVerb.trim().length === 0) {
    errors.push('Action verb is required')
  }

  // Validate action verb matches Bloom's level
  if (lo.bloomLevel && lo.actionVerb) {
    const levelConfig = BLOOMS_TAXONOMY[lo.bloomLevel as keyof typeof BLOOMS_TAXONOMY]
    const levelVerbs: string[] = levelConfig?.verbs ? [...levelConfig.verbs] : []
    const verbLower = lo.actionVerb.toLowerCase()

    // Check if verb is in the specified level
    if (!levelVerbs.includes(verbLower)) {
      // Check if it's in a different level
      const correctLevel = Object.entries(BLOOMS_TAXONOMY).find(([, config]) =>
        (config.verbs as readonly string[]).includes(verbLower)
      )

      if (correctLevel) {
        warnings.push(
          `Action verb "${lo.actionVerb}" is typically associated with "${correctLevel[0]}" level, not "${lo.bloomLevel}"`
        )
      } else {
        warnings.push(`Action verb "${lo.actionVerb}" is not a standard Bloom's taxonomy verb`)
      }
    }
  }

  // Check that objective starts with action verb
  if (lo.objective && lo.actionVerb) {
    const objectiveStart = lo.objective.toLowerCase().trim()
    const verbLower = lo.actionVerb.toLowerCase()

    if (!objectiveStart.startsWith(verbLower)) {
      suggestions.push(`Consider starting the objective with the action verb "${lo.actionVerb}"`)
    }
  }

  // Check objective specificity (not too vague)
  if (lo.objective && lo.objective.length < 20) {
    warnings.push('Objective may be too vague. Consider being more specific.')
  }

  // Check for measurability indicators
  const measurabilityKeywords = [
    'by', 'using', 'through', 'with', 'to', 'from',
    'correctly', 'accurately', 'successfully', 'at least'
  ]
  const hasMeasurability = measurabilityKeywords.some(kw =>
    lo.objective.toLowerCase().includes(kw)
  )

  if (!hasMeasurability) {
    suggestions.push('Consider adding measurability criteria (e.g., "using X method", "with Y accuracy")')
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    suggestions,
  }
}

/**
 * Validates an array of learning objectives
 */
export function validateLearningObjectives(los: LearningObjective[]): {
  isValid: boolean
  results: Record<string, LOValidationResult>
  summary: {
    totalObjectives: number
    validCount: number
    errorCount: number
    warningCount: number
    bloomLevelDistribution: Record<BloomLevel, number>
  }
} {
  const results: Record<string, LOValidationResult> = {}
  let validCount = 0
  let errorCount = 0
  let warningCount = 0
  const bloomLevelDistribution: Record<BloomLevel, number> = {
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0,
  }

  for (const lo of los) {
    const result = validateLearningObjective(lo)
    results[lo.id] = result

    if (result.isValid) {
      validCount++
    } else {
      errorCount++
    }

    warningCount += result.warnings.length

    if (lo.bloomLevel && bloomLevelDistribution[lo.bloomLevel] !== undefined) {
      bloomLevelDistribution[lo.bloomLevel]++
    }
  }

  // Check for Bloom's level diversity (used for future enhancement)
  const _levelsCovered = Object.values(bloomLevelDistribution).filter(v => v > 0).length
  void _levelsCovered // Future: Add coverage warnings

  return {
    isValid: errorCount === 0,
    results,
    summary: {
      totalObjectives: los.length,
      validCount,
      errorCount,
      warningCount,
      bloomLevelDistribution,
    },
  }
}

// =============================================================================
// LO Generation Helpers
// =============================================================================

/**
 * Suggests appropriate action verbs based on desired Bloom's level
 */
export function suggestActionVerbs(bloomLevel: BloomLevel): string[] {
  const verbs = BLOOMS_TAXONOMY[bloomLevel]?.verbs
  return verbs ? [...verbs] : []
}

/**
 * Determines the Bloom's level from an action verb
 */
export function getBloomLevelFromVerb(verb: string): BloomLevel | null {
  const verbLower = verb.toLowerCase()

  for (const [level, config] of Object.entries(BLOOMS_TAXONOMY)) {
    if ((config.verbs as readonly string[]).includes(verbLower)) {
      return level as BloomLevel
    }
  }

  return null
}

/**
 * Generates a template learning objective for a given Bloom's level
 */
export function generateLOTemplate(
  bloomLevel: BloomLevel,
  topic: string
): LearningObjective {
  const verbs = BLOOMS_TAXONOMY[bloomLevel].verbs
  const verb = verbs[0] // Use first verb as default

  const templates: Record<BloomLevel, (t: string, v: string) => string> = {
    remember: (t, v) => `${capitalize(v)} the key terms and definitions related to ${t}`,
    understand: (t, v) => `${capitalize(v)} the main concepts and principles of ${t}`,
    apply: (t, v) => `${capitalize(v)} ${t} concepts to solve problems`,
    analyze: (t, v) => `${capitalize(v)} the relationships between different aspects of ${t}`,
    evaluate: (t, v) => `${capitalize(v)} the effectiveness of different approaches to ${t}`,
    create: (t, v) => `${capitalize(v)} a solution or approach for ${t} problems`,
  }

  return {
    id: `lo_${bloomLevel}_${Date.now()}`,
    objective: templates[bloomLevel](topic, verb),
    bloomLevel,
    actionVerb: verb,
  }
}

/**
 * Capitalizes first letter
 */
function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}

// =============================================================================
// Curriculum Alignment
// =============================================================================

/**
 * Maps learning objectives to curriculum standards
 */
export function mapLOsToStandards(
  los: LearningObjective[],
  standards: CurriculumStandard[]
): Map<string, CurriculumStandard[]> {
  const mapping = new Map<string, CurriculumStandard[]>()

  for (const lo of los) {
    const matchingStandards = standards.filter(standard => {
      // Simple keyword matching - could be enhanced with NLP
      const loWords = lo.objective.toLowerCase().split(/\s+/)
      const standardWords = standard.description.toLowerCase().split(/\s+/)

      const commonWords = loWords.filter(word =>
        word.length > 3 && standardWords.includes(word)
      )

      return commonWords.length >= 2
    })

    mapping.set(lo.id, matchingStandards)
  }

  return mapping
}

/**
 * Calculates curriculum alignment score
 */
export function calculateAlignmentScore(
  los: LearningObjective[],
  alignment: CurriculumAlignment
): {
  score: number // 0-100
  aligned: number
  total: number
  gaps: string[]
} {
  if (!alignment.assessmentObjectives || alignment.assessmentObjectives.length === 0) {
    return { score: 0, aligned: 0, total: los.length, gaps: [] }
  }

  let aligned = 0
  const gaps: string[] = []

  for (const lo of los) {
    const hasAlignment = alignment.assessmentObjectives.some(ao =>
      lo.objective.toLowerCase().includes(ao.toLowerCase()) ||
      ao.toLowerCase().includes(lo.objective.toLowerCase())
    )

    if (hasAlignment) {
      aligned++
    } else {
      gaps.push(`LO "${lo.objective}" has no direct curriculum alignment`)
    }
  }

  const score = los.length > 0 ? Math.round((aligned / los.length) * 100) : 0

  return { score, aligned, total: los.length, gaps }
}

// =============================================================================
// Export
// =============================================================================

export default {
  validateLearningObjective,
  validateLearningObjectives,
  suggestActionVerbs,
  getBloomLevelFromVerb,
  generateLOTemplate,
  mapLOsToStandards,
  calculateAlignmentScore,
}
