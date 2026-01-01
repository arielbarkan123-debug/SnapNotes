/**
 * Homework Checker Feature Types
 * AI-powered homework review and feedback system
 */

// ============================================================================
// Core Types
// ============================================================================

export type CheckStatus = 'pending' | 'analyzing' | 'completed' | 'error'
export type GradeLevel = 'excellent' | 'good' | 'needs_improvement' | 'incomplete'

export interface HomeworkCheck {
  id: string
  user_id: string

  // Uploaded content
  task_image_url: string
  task_text: string | null // Extracted from image
  answer_image_url: string
  answer_text: string | null // Extracted from image
  reference_image_urls: string[]
  teacher_review_urls: string[]
  teacher_review_text: string | null // Combined extracted text

  // Analysis results
  status: CheckStatus
  subject: string | null
  topic: string | null

  // Feedback
  feedback: HomeworkFeedback | null

  // Metadata
  created_at: string
  completed_at: string | null
}

export interface HomeworkFeedback {
  // Overall assessment
  gradeLevel: GradeLevel
  gradeEstimate: string // e.g., "85/100", "B+", "4/5"
  summary: string // Brief overall assessment

  // Detailed breakdown
  correctPoints: FeedbackPoint[]
  improvementPoints: FeedbackPoint[]
  suggestions: string[]

  // Teacher-style elements (if teacher reviews provided)
  teacherStyleNotes: string | null
  expectationComparison: string | null

  // Encouragement
  encouragement: string
}

export interface FeedbackPoint {
  title: string
  description: string
  severity?: 'minor' | 'moderate' | 'major' // For improvement points
}

// ============================================================================
// API Request/Response Types
// ============================================================================

export interface CreateCheckRequest {
  taskImageUrl: string
  answerImageUrl: string
  referenceImageUrls?: string[]
  teacherReviewUrls?: string[]
}

export interface CreateCheckResponse {
  check: HomeworkCheck
}

export interface AnalyzeCheckRequest {
  checkId: string
}

export interface AnalyzeCheckResponse {
  check: HomeworkCheck
  feedback: HomeworkFeedback
}

// ============================================================================
// Analysis Context Types
// ============================================================================

export interface CheckerContext {
  taskText: string
  answerText: string
  referenceContent: string | null
  teacherReviewContent: string | null
}

export interface TaskAnalysis {
  subject: string
  topic: string
  requirements: string[]
  gradingCriteria: string[]
  expectedElements: string[]
}

export interface AnswerAnalysis {
  completeness: number // 0-100
  correctness: number // 0-100
  matchedRequirements: string[]
  missedRequirements: string[]
  errors: AnswerError[]
}

export interface AnswerError {
  type: 'factual' | 'conceptual' | 'calculation' | 'formatting' | 'incomplete'
  description: string
  severity: 'minor' | 'moderate' | 'major'
  suggestion: string
}

export interface TeacherStyleAnalysis {
  tone: 'strict' | 'balanced' | 'encouraging'
  focusAreas: string[] // What the teacher tends to focus on
  commonPhrases: string[] // Patterns from teacher's reviews
  gradingTendency: 'lenient' | 'moderate' | 'strict'
}

// ============================================================================
// Legacy Types (for backward compatibility)
// Keep these for existing tutoring sessions if any exist
// ============================================================================

export type SessionStatus = 'active' | 'completed' | 'abandoned'
export type ComfortLevel = 'new' | 'some_idea' | 'just_stuck'
export type QuestionSubject = 'math' | 'science' | 'history' | 'language' | 'other'
export type MessageRole = 'tutor' | 'student'
export type PedagogicalIntent =
  | 'probe_understanding'
  | 'give_hint'
  | 'celebrate'
  | 'clarify'
  | 'guide_next_step'
  | 'show_answer'
  | 'summarize'
export type HintLevel = 1 | 2 | 3 | 4 | 5

export interface HomeworkSession {
  id: string
  user_id: string
  question_image_url: string
  question_text: string | null
  question_type: string | null
  detected_subject: QuestionSubject | null
  detected_topic: string | null
  detected_concepts: string[]
  difficulty_estimate: number | null
  reference_image_urls: string[]
  reference_extracted_content: string | null
  reference_relevant_sections: RelevantSection[] | null
  initial_attempt: string | null
  comfort_level: ComfortLevel | null
  status: SessionStatus
  current_step: number
  total_estimated_steps: number | null
  conversation: ConversationMessage[]
  hints_used: number
  hints_available: number
  used_show_answer: boolean
  completed_at: string | null
  solution_reached: boolean
  student_final_answer: string | null
  time_spent_seconds: number | null
  breakthrough_moment: string | null
  created_at: string
  updated_at: string
}

export interface RelevantSection {
  imageIndex: number
  description: string
  relevanceScore: number
  coordinates?: { x: number; y: number; width: number; height: number }
}

export interface ConversationMessage {
  role: MessageRole
  content: string
  timestamp: string
  hintLevel?: HintLevel
  pedagogicalIntent?: PedagogicalIntent
  referencedConcept?: string
  showsUnderstanding?: boolean
  misconceptionDetected?: string
}

export interface SessionSummary {
  timeSpent: string
  hintsUsed: number
  usedShowAnswer: boolean
  conceptsPracticed: string[]
  approachFeedback: string
  whatYouLearned: string[]
  encouragement: string
}

export interface QuestionAnalysis {
  questionText: string
  subject: QuestionSubject
  topic: string
  questionType: string
  difficultyEstimate: number
  requiredConcepts: string[]
  commonMistakes: string[]
  solutionApproach: string
  estimatedSteps: number
}

export interface ReferenceAnalysis {
  extractedContent: string
  relevantSections: RelevantSection[]
  keyFormulas: string[]
  keyDefinitions: string[]
  helpfulExamples: string[]
}

export interface TutorResponse {
  message: string
  pedagogicalIntent: PedagogicalIntent
  detectedUnderstanding: boolean
  detectedMisconception: string | null
  suggestedNextAction: string
  estimatedProgress: number
  shouldEndSession: boolean
  celebrationMessage?: string
}

export interface HintResponse {
  hintLevel: HintLevel
  content: string
  isShowAnswer: boolean
  relatedConcept?: string
  workedExample?: string
}

export interface TutorContext {
  session: HomeworkSession
  questionAnalysis: QuestionAnalysis
  referenceAnalysis?: ReferenceAnalysis
  recentMessages: ConversationMessage[]
  hintsUsed: number
  currentProgress: number
}

export interface HintContext {
  session: HomeworkSession
  questionAnalysis: QuestionAnalysis
  referenceAnalysis?: ReferenceAnalysis
  requestedLevel: HintLevel
  previousHints: HintResponse[]
}
