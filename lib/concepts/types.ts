/**
 * Concept System Types
 *
 * Defines types for the knowledge graph, concept mastery tracking,
 * and knowledge gap detection system.
 */

// =============================================================================
// Core Concept Types
// =============================================================================

/**
 * An atomic unit of knowledge that can be taught, tested, and mastered
 */
export interface Concept {
  id: string
  name: string
  description: string | null
  subject: string
  topic: string
  subtopic: string | null
  study_system: string | null
  difficulty_level: number // 1-5 (Bloom's taxonomy)
  created_at: string
  updated_at: string
}

/**
 * Data required to create a new concept
 */
export interface ConceptInsert {
  name: string
  description?: string
  subject: string
  topic: string
  subtopic?: string
  study_system?: string
  difficulty_level?: number
}

/**
 * Prerequisite relationship between concepts
 */
export interface ConceptPrerequisite {
  id: string
  concept_id: string
  prerequisite_id: string
  dependency_strength: DependencyStrength
  created_at: string
}

/**
 * Dependency strength levels
 * 1 = helpful (nice to have)
 * 2 = important (should know)
 * 3 = essential (must know)
 */
export type DependencyStrength = 1 | 2 | 3

export const DEPENDENCY_LABELS: Record<DependencyStrength, string> = {
  1: 'Helpful',
  2: 'Important',
  3: 'Essential',
}

// =============================================================================
// Content-Concept Mapping
// =============================================================================

/**
 * How content relates to a concept
 */
export type ConceptRelationship = 'teaches' | 'requires' | 'reinforces'

/**
 * Maps course content to concepts
 */
export interface ContentConcept {
  id: string
  course_id: string
  lesson_index: number
  step_index: number | null
  concept_id: string
  relevance_score: number // 0-1
  relationship_type: ConceptRelationship
  created_at: string
}

/**
 * Data for creating content-concept mapping
 */
export interface ContentConceptInsert {
  course_id: string
  lesson_index: number
  step_index?: number
  concept_id: string
  relevance_score?: number
  relationship_type: ConceptRelationship
}

// =============================================================================
// User Mastery
// =============================================================================

/**
 * User's mastery level for a specific concept
 */
export interface UserConceptMastery {
  id: string
  user_id: string
  concept_id: string
  mastery_level: number // 0-1
  confidence_score: number // 0-1
  peak_mastery: number // 0-1, highest ever achieved
  total_exposures: number
  successful_recalls: number
  failed_recalls: number
  stability: number // SRS parameter
  next_review_date: string | null
  first_encountered_at: string
  last_reviewed_at: string | null
  updated_at: string
}

/**
 * Data for inserting/updating mastery
 */
export interface UserConceptMasteryUpsert {
  user_id: string
  concept_id: string
  mastery_level?: number
  confidence_score?: number
  total_exposures?: number
  successful_recalls?: number
  failed_recalls?: number
  stability?: number
  next_review_date?: string
  last_reviewed_at?: string
}

/**
 * Mastery update from a learning event
 */
export interface MasteryUpdate {
  conceptId: string
  masteryDelta: number
  newMastery: number
  isCorrect: boolean
  responseTimeMs?: number
  usedHint?: boolean
}

// =============================================================================
// Knowledge Gaps
// =============================================================================

/**
 * Types of knowledge gaps
 */
export type GapType =
  | 'missing_prerequisite' // Required concept never learned
  | 'weak_foundation' // Concept learned but not mastered
  | 'decay' // Was mastered but faded over time
  | 'never_learned' // Course requires it, student never encountered

/**
 * Severity levels for gaps
 */
export type GapSeverity = 'critical' | 'moderate' | 'minor'

/**
 * A detected knowledge gap
 */
export interface UserKnowledgeGap {
  id: string
  user_id: string
  concept_id: string
  gap_type: GapType
  severity: GapSeverity
  confidence: number // 0-1
  detected_at: string
  detected_from_course_id: string | null
  detected_from_lesson_index: number | null
  ai_explanation: string | null
  suggested_remediation: string | null
  blocked_concepts: string[] | null
  resolved: boolean
  resolved_at: string | null
}

/**
 * Data for creating a knowledge gap record
 */
export interface UserKnowledgeGapInsert {
  user_id: string
  concept_id: string
  gap_type: GapType
  severity: GapSeverity
  confidence: number
  detected_from_course_id?: string
  detected_from_lesson_index?: number
  ai_explanation?: string
  suggested_remediation?: string
  blocked_concepts?: string[]
}

/**
 * Detected gap with concept details
 */
export interface DetectedGap {
  conceptId: string
  conceptName?: string
  gapType: GapType
  severity: GapSeverity
  confidence: number
  explanation?: string
  remediation?: string
  blockedConcepts?: string[]
  evidence?: {
    recentFailures?: number
    consecutiveFailures?: number
    daysSinceReview?: number
    masteryDecay?: number
  }
}

// =============================================================================
// Concept Extraction
// =============================================================================

/**
 * A concept extracted from course content by AI
 */
export interface ExtractedConcept {
  name: string
  description: string
  subject: string
  topic: string
  subtopic?: string
  difficulty: number // 1-5
  prerequisites: string[] // Names of prerequisite concepts
  relatedConcepts: string[] // Names of related concepts
}

/**
 * Mapping from content to concept
 */
export interface ExtractedConceptMapping {
  lessonIndex: number
  stepIndex?: number
  conceptName: string
  relationship: ConceptRelationship
}

/**
 * Result of concept extraction from a course
 */
export interface ConceptExtractionResult {
  concepts: ExtractedConcept[]
  mappings: ExtractedConceptMapping[]
  metadata: {
    courseId: string
    extractedAt: string
    modelUsed: string
    conceptCount: number
    mappingCount: number
  }
}

// =============================================================================
// Gap Detection
// =============================================================================

/**
 * Input for gap detection analysis
 */
export interface GapDetectionInput {
  userId: string
  courseId?: string
  lessonIndex?: number
  targetConcepts?: string[] // Concept IDs to check
  recentPerformance?: {
    conceptId: string
    isCorrect: boolean
    responseTimeMs: number
    usedHint: boolean
  }[]
}

/**
 * Result of gap detection
 */
export interface GapDetectionResult {
  gaps: DetectedGap[]
  analyzedConcepts: number
  hasBlockingGaps: boolean // Any critical gaps that should block progress
  recommendedAction?: 'review' | 'practice' | 'continue'
}

// =============================================================================
// Prerequisite Graph
// =============================================================================

/**
 * Node in the prerequisite graph with additional metadata
 */
export interface ConceptNode {
  id: string
  name: string
  difficulty: number
  mastery?: number // User's mastery if available
  prerequisites: string[] // Direct prerequisite IDs
  dependents: string[] // Concepts that depend on this one
}

/**
 * Path through the prerequisite graph
 */
export interface LearningPath {
  concepts: string[] // Ordered list of concept IDs
  totalConcepts: number
  estimatedTime?: number // Minutes
  gapsToFill: number
}

// =============================================================================
// API Response Types
// =============================================================================

/**
 * Response when fetching user mastery
 */
export interface UserMasteryResponse {
  mastery: Record<string, number> // conceptId -> mastery level
  totalConcepts: number
  masteredConcepts: number // mastery > 0.7
  weakConcepts: number // mastery < 0.4
  reviewDue: number // concepts with review date in past
}

/**
 * Response when fetching user gaps
 */
export interface UserGapsResponse {
  gaps: (UserKnowledgeGap & { concept: Concept })[]
  totalGaps: number
  criticalGaps: number
  resolvedRecently: number
}

/**
 * Response from concept extraction endpoint
 */
export interface ExtractConceptsResponse {
  success: boolean
  result?: ConceptExtractionResult
  error?: string
}

// =============================================================================
// Mastery Calculation Constants
// =============================================================================

export const MASTERY_THRESHOLDS = {
  MASTERED: 0.8, // Green - Strong
  MODERATE: 0.5, // Yellow - Moderate
  WEAK: 0.3, // Red - Weak (gap threshold)
  UNKNOWN: 0, // Not learned
} as const

export const MASTERY_COLORS = {
  MASTERED: '#22c55e', // green-500
  MODERATE: '#eab308', // yellow-500
  WEAK: '#ef4444', // red-500
  UNKNOWN: '#6b7280', // gray-500
} as const

/**
 * Get mastery status label and color
 */
export function getMasteryStatus(mastery: number): {
  label: string
  color: string
  level: 'mastered' | 'moderate' | 'weak' | 'unknown'
} {
  if (mastery >= MASTERY_THRESHOLDS.MASTERED) {
    return { label: 'Strong', color: MASTERY_COLORS.MASTERED, level: 'mastered' }
  }
  if (mastery >= MASTERY_THRESHOLDS.MODERATE) {
    return { label: 'Moderate', color: MASTERY_COLORS.MODERATE, level: 'moderate' }
  }
  if (mastery > MASTERY_THRESHOLDS.UNKNOWN) {
    return { label: 'Weak', color: MASTERY_COLORS.WEAK, level: 'weak' }
  }
  return { label: 'Not learned', color: MASTERY_COLORS.UNKNOWN, level: 'unknown' }
}

// =============================================================================
// Difficulty Level Constants
// =============================================================================

export const DIFFICULTY_LEVELS = {
  RECALL: 1, // Remember facts
  UNDERSTAND: 2, // Explain concepts
  APPLY: 3, // Use in new situations
  ANALYZE: 4, // Break down, compare
  EVALUATE: 5, // Judge, synthesize
} as const

export const DIFFICULTY_LABELS: Record<number, string> = {
  1: 'Recall',
  2: 'Understand',
  3: 'Apply',
  4: 'Analyze',
  5: 'Evaluate/Create',
}

/**
 * Target success rate by difficulty level (Zone of Proximal Development)
 */
export const TARGET_SUCCESS_RATE: Record<number, number> = {
  1: 0.9, // 90% for recall
  2: 0.85, // 85% for understand
  3: 0.75, // 75% for apply
  4: 0.7, // 70% for analyze
  5: 0.65, // 65% for evaluate
}
