/**
 * Curriculum Types for NoteSnap
 *
 * Defines the structure for curriculum data across different education systems.
 * Supports tiered context injection for AI personalization.
 */

// =============================================================================
// Core Types
// =============================================================================

export type StudySystem = 'general' | 'us' | 'uk' | 'israeli_bagrut' | 'ib' | 'ap' | 'other'

export type ExamFormat = 'match_real' | 'inspired_by'

export type ContextPurpose = 'course' | 'exam' | 'practice' | 'chat' | 'evaluation'

// =============================================================================
// Tier 1: System Overview (~500 tokens)
// =============================================================================

export interface GradeDescription {
  grade: string
  description: string
  percentageRange?: string
}

export interface CommandTerm {
  term: string
  definition: string
  cognitiveLevel?: number // 1=knowledge, 2=application, 3=synthesis
  examples?: string[]
}

export interface SystemOverview {
  id: StudySystem
  name: string
  description: string
  grading: {
    scale: string
    passingGrade: string
    descriptions: GradeDescription[]
  }
  assessmentPhilosophy: string
  keyTerminology: Record<string, string>
  commandTerms: CommandTerm[]
  academicYear?: {
    start: string // e.g., "September"
    examPeriod: string // e.g., "May"
  }
}

// =============================================================================
// Tier 2: Subject Overview (~2000 tokens)
// =============================================================================

export interface AssessmentComponent {
  name: string
  weight: number // percentage
  duration?: string // e.g., "1h 30min"
  description: string
  structure?: string // e.g., "Section A: 20 MCQ, Section B: Data-based"
  markingCriteria?: string[]
}

export interface AssessmentObjective {
  id: string // e.g., "AO1", "AO2"
  description: string
  verbs: string[] // e.g., ["state", "define", "list"]
  weight?: number // percentage
  cognitiveLevel?: number
}

export interface TopicListItem {
  id: string // e.g., "1", "2.4"
  name: string
  hours?: number // teaching hours
  hlOnly?: boolean // IB: Higher Level only
  slOnly?: boolean // IB: Standard Level only
  subtopics?: { id: string; name: string }[]
}

export interface SubjectOverview {
  systemId: StudySystem
  subjectId: string
  name: string
  code?: string // e.g., "9700" for A-Level Biology
  levels?: string[] // e.g., ["SL", "HL"] for IB
  description?: string
  assessmentComponents: AssessmentComponent[]
  assessmentObjectives: AssessmentObjective[]
  topicList: TopicListItem[]
  commandTermsSubset?: string[] // Subject-specific command terms to emphasize
  practicalRequirements?: string
  mathsRequirements?: string
  iaGuidelines?: string // Internal Assessment guidelines
}

// =============================================================================
// Tier 3: Topic Details (~3000 tokens)
// =============================================================================

export interface KeyConcept {
  term: string
  definition: string
  importance: string
  relatedTerms?: string[]
}

export interface Misconception {
  misconception: string
  correction: string
  commonIn?: string // e.g., "beginner students"
}

export interface ExamFocus {
  frequentlyTested: string[]
  typicalQuestions: string[]
  markingNotes: string[]
  commonMistakes?: string[]
  highScoringTips?: string[]
}

export interface TopicConnection {
  topicId: string
  relationship: string
}

export interface TopicDetails {
  systemId: StudySystem
  subjectId: string
  topicId: string
  name: string
  understandings: string[] // Core learning objectives
  applications: string[] // Skills and applications
  keyConcepts: KeyConcept[]
  commonMisconceptions: Misconception[]
  examFocus: ExamFocus
  connections: TopicConnection[]
  hlExtensions?: {
    understandings: string[]
    applications: string[]
    keyConcepts?: KeyConcept[]
  }
  practicalWork?: {
    required: string[]
    suggested: string[]
  }
  resources?: {
    diagrams: string[] // Descriptions of key diagrams
    formulas?: string[]
  }
}

// =============================================================================
// System-Specific Grade Types
// =============================================================================

export type IBGrade = 'pre-dp' | 'dp1' | 'dp2'

export type BagrutGrade =
  | 'א'
  | 'ב'
  | 'ג'
  | 'ד'
  | 'ה'
  | 'ו'
  | 'ז'
  | 'ח'
  | 'ט'
  | 'י'
  | 'יא'
  | 'יב'

export type ALevelGrade = 'year12' | 'year13'

export type APGrade = 'grade9' | 'grade10' | 'grade11' | 'grade12'

export type USGrade = 'grade9' | 'grade10' | 'grade11' | 'grade12'

export type GeneralGrade =
  | 'elementary'
  | 'middle_school'
  | 'high_school'
  | 'university'
  | 'graduate'
  | 'professional'

export type SystemGrade =
  | IBGrade
  | BagrutGrade
  | ALevelGrade
  | APGrade
  | USGrade
  | GeneralGrade
  | string // Allow custom grades for 'other' system

// =============================================================================
// Grade Configuration
// =============================================================================

export interface GradeOption {
  id: string
  label: string
  labelLocalized?: string // For RTL or other languages (e.g., Hebrew)
  description?: string
  order: number
}

export interface SystemGradeConfig {
  systemId: StudySystem
  systemName: string
  grades: GradeOption[]
  defaultGrade?: string
}

// =============================================================================
// Level Configuration (System-Specific Subject Levels)
// =============================================================================

export type LevelType = 'toggle' | 'select' | 'none'

export interface LevelConfig {
  systemId: StudySystem
  type: LevelType
  options: string[] // ['SL', 'HL'] for IB, ['3', '4', '5'] for Bagrut
  defaultValue?: string
  labels?: Record<string, string> // Custom labels for options
}

// =============================================================================
// Curriculum Setup Status
// =============================================================================

export interface CurriculumSetupStatus {
  hasSelectedSystem: boolean
  hasSelectedGrade: boolean
  hasSelectedSubjects: boolean
  isComplete: boolean
  subjectCount: number
}

// =============================================================================
// Curriculum Context (Output of Context Builder)
// =============================================================================

export interface CurriculumContextMetadata {
  system: StudySystem
  subject: string | null
  subjectLevel?: string // "HL", "SL", etc.
  topic: string | null
  detectedFromContent: boolean
  tokenEstimate: {
    tier1: number
    tier2: number
    tier3: number
    total: number
  }
}

export interface CurriculumContext {
  tier1: string | null // Formatted system context
  tier2: string | null // Formatted subject context
  tier3: string | null // Formatted topic context
  metadata: CurriculumContextMetadata
  raw?: {
    system?: SystemOverview
    subject?: SubjectOverview
    topic?: TopicDetails
  }
}

// =============================================================================
// User Curriculum Profile (Extension of existing UserLearningContext)
// =============================================================================

export interface UserCurriculumProfile {
  studySystem: StudySystem
  subjects: string[] // e.g., ["biology-hl", "chemistry-sl"]
  subjectLevels: Record<string, string> // e.g., { "biology": "HL", "chemistry": "SL" }
  examFormat: ExamFormat
}

// =============================================================================
// Context Builder Options
// =============================================================================

export interface ContextBuilderOptions {
  userProfile: {
    studySystem: StudySystem
    subjects?: string[]
    subjectLevels?: Record<string, string>
    examFormat?: ExamFormat
    educationLevel?: string
  }
  contentSample?: string // For subject/topic detection
  specificSubject?: string // If already known
  specificTopic?: string // If already known
  purpose: ContextPurpose
  tokenBudget?: {
    tier1?: number // Default 500
    tier2?: number // Default 2000
    tier3?: number // Default 3000
  }
  includeRawData?: boolean // Include raw JSON objects in output
}

// =============================================================================
// Subject Detection Result
// =============================================================================

export interface SubjectDetectionResult {
  subject: string | null
  confidence: number // 0-1
  detectedTopics: string[]
  matchedKeywords: string[]
}

// =============================================================================
// Available Subjects List (for UI)
// =============================================================================

export interface AvailableSubject {
  id: string // e.g., "biology-hl"
  name: string // e.g., "Biology HL"
  shortName?: string // e.g., "Biology"
  levels?: string[] // e.g., ["SL", "HL"]
  group?: string // e.g., "Sciences" for IB Group 4
  icon?: string // Emoji or icon key
}

export interface SystemSubjects {
  systemId: StudySystem
  systemName: string
  groups?: { id: string; name: string }[] // e.g., IB Groups 1-6
  subjects: AvailableSubject[]
}

// =============================================================================
// Exam Format Configuration
// =============================================================================

export interface ExamFormatConfig {
  format: ExamFormat
  components?: string[] // Which papers to include
  timeMultiplier?: number // Adjust time based on question count
  questionDistribution?: Record<string, number> // Question type percentages
}
