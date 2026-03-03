/**
 * Homework Checker Feature Types
 * AI-powered homework review and feedback system
 */

// ============================================================================
// Core Types
// ============================================================================

export type CheckStatus = 'pending' | 'analyzing' | 'completed' | 'error'
export type GradeLevel = 'excellent' | 'good' | 'needs_improvement' | 'incomplete'
export type CheckMode = 'standard' | 'batch_worksheet' | 'before_submit' | 'rubric'

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

  // Check mode
  mode: CheckMode
  mode_result: BatchWorksheetResult | BeforeSubmitResult | RubricResult | null
  rubric_image_urls: string[]
  additional_image_urls: string[]
  practiced_items: Array<{ problemIndex: number; practiceSessionId: string }> | null

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

  // Visual annotations on the answer image
  annotations?: AnnotationData
}

export interface FeedbackPoint {
  title: string
  description: string
  severity?: 'minor' | 'moderate' | 'major' // For improvement points
}

// ============================================================================
// Visual Annotation Types
// ============================================================================

/**
 * AnnotationRegion - Defines a region on an image for visual annotation
 * Uses percentage-based coordinates (0-100) for responsive display
 */
export interface AnnotationRegion {
  /** X coordinate as percentage (0-100) from left edge */
  x: number
  /** Y coordinate as percentage (0-100) from top edge */
  y: number
  /** Width as percentage for bounding box (optional) */
  width?: number
  /** Height as percentage for bounding box (optional) */
  height?: number
}

/**
 * AnnotatedFeedbackPoint - FeedbackPoint with location data for visual markers
 */
export interface AnnotatedFeedbackPoint extends FeedbackPoint {
  /** Location on the answer image where this feedback applies */
  region?: AnnotationRegion
  /** Unique ID for linking UI annotations to feedback cards */
  annotationId?: string
}

/**
 * AnnotationData - Container for all visual annotations on an image
 */
export interface AnnotationData {
  /** Annotations for correct points (green checkmarks) */
  correctAnnotations: AnnotatedFeedbackPoint[]
  /** Annotations for improvement points (red X marks) */
  errorAnnotations: AnnotatedFeedbackPoint[]
  /** Whether any annotations were successfully generated */
  hasAnnotations: boolean
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// Input mode for homework submission
export type InputMode = 'image' | 'text'

export interface CreateCheckRequest {
  // Input mode indicator
  inputMode: InputMode

  // Image-based (optional if text provided)
  taskImageUrl?: string
  answerImageUrl?: string
  referenceImageUrls?: string[]
  teacherReviewUrls?: string[]

  // Text-based (optional if image provided)
  taskText?: string
  answerText?: string

  // Extracted text from DOCX files (DOCX not supported by Claude Vision directly)
  taskDocumentText?: string
  answerDocumentText?: string

  // Check mode configuration
  mode?: CheckMode
  additionalImageUrls?: string[]
  beforeSubmit?: boolean
  rubricImageUrls?: string[]
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

// Session management request types
export interface CreateSessionRequest {
  // Input mode indicator
  inputMode: InputMode

  // Image-based (optional if text provided)
  questionImageUrl?: string
  referenceImageUrls?: string[]

  // Text-based (optional if image provided)
  questionText?: string

  // Common fields
  comfortLevel?: ComfortLevel
  initialAttempt?: string
  /** Whether to generate engine diagrams (default: true) */
  enableDiagrams?: boolean
}

export interface UpdateSessionRequest {
  comfortLevel?: ComfortLevel
  status?: SessionStatus
  studentFinalAnswer?: string
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
// Batch Worksheet Mode Types
// ============================================================================

export interface BatchWorksheetItem {
  problemNumber: number | string
  problemText: string
  studentAnswer: string
  correctAnswer: string
  isCorrect: boolean | null
  explanation: string
  topic: string
  errorType?: 'factual' | 'conceptual' | 'calculation' | 'formatting' | 'incomplete'
}

export interface BatchWorksheetResult {
  mode: 'batch_worksheet'
  totalProblems: number
  correct: number
  incorrect: number
  unclear: number
  items: BatchWorksheetItem[]
  topicBreakdown: Record<string, { correct: number; total: number }>
  score: number
}

// ============================================================================
// Before-Submit Mode Types
// ============================================================================

export type BeforeSubmitStatus = 'correct' | 'check_again' | 'needs_rework' | 'unclear'

export interface BeforeSubmitItem {
  problemIndex: number
  problemText: string
  status: BeforeSubmitStatus
  hints: [string, string, string]
}

export interface BeforeSubmitResult {
  mode: 'before_submit'
  items: BeforeSubmitItem[]
  summary: {
    correct: number
    checkAgain: number
    needsRework: number
    unclear: number
    total: number
  }
}

// ============================================================================
// Rubric Mode Types
// ============================================================================

export interface RubricCriterion {
  criterion: string
  maxPoints: number
  earnedPoints: number
  percentage: number
  reasoning: string
  suggestions: string
}

export interface RubricResult {
  mode: 'rubric'
  rubricBreakdown: RubricCriterion[]
  totalEarned: number
  totalPossible: number
  percentage: number
  estimatedGrade: string
  taggedFeedback: Array<FeedbackPoint & { rubricCriterion: string }>
}

// ============================================================================
// Extended Checker Output
// ============================================================================

export interface ExtendedCheckerOutput {
  feedback: HomeworkFeedback
  subject: string
  topic: string
  taskText: string
  answerText: string
  mode: CheckMode
  modeResult?: BatchWorksheetResult | BeforeSubmitResult | RubricResult
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
  /** Physics diagram state for this message (tutor messages only) */
  diagram?: TutorDiagramState
  /** Visual update for the persistent VisualSolvingPanel (tutor messages only) */
  visualUpdate?: VisualUpdate
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
  /** Indicates if there was ambiguity in reading the question (e.g., unclear handwriting) */
  hasAmbiguity?: boolean
  /** Notes about ambiguous parts if hasAmbiguity is true */
  ambiguityNotes?: string
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
  /** Physics diagram state for visual explanations */
  diagram?: TutorDiagramState
  /** Visual update for the persistent VisualSolvingPanel */
  visualUpdate?: VisualUpdate
}

/**
 * Diagram state returned by tutor for physics and math visualizations
 * Syncs with the step-by-step explanation
 */
export interface TutorDiagramState {
  /** Type of diagram to render - includes both physics and math diagram types */
  type:
    // Physics diagram types
    | 'fbd'
    | 'inclined_plane'
    | 'projectile'
    | 'pulley'
    | 'circuit'
    | 'wave'
    | 'optics'
    | 'motion'
    // Math diagram types
    | 'long_division'
    | 'equation'
    | 'fraction'
    | 'number_line'
    | 'coordinate_plane'
    | 'triangle'
    | 'circle'
    | 'bar_model'
    | 'area_model'
    // Chemistry diagram types
    | 'atom'
    | 'molecule'
    | 'periodic_element'
    | 'bonding'
    | 'reaction'
    | 'energy_diagram'
    // Biology diagram types
    | 'cell'
    | 'organelle'
    | 'dna'
    | 'process'
    | 'system'
    | 'process_flow'
    // Engine-generated image diagram (E2B/TikZ/Recraft pipeline)
    | 'engine_image'
    // Step-by-step animated diagram sequence
    | 'step_sequence'
  /** Diagram-specific data */
  data: Record<string, unknown>
  /** Current step to display */
  visibleStep: number
  /** Total number of steps */
  totalSteps?: number
  /** Evolution mode: manual = user controls, auto-advance = progresses with conversation */
  evolutionMode?: 'manual' | 'auto-advance'
  /** Conversation turn when this diagram was introduced/updated */
  conversationTurn?: number
  /** Elements that were added/updated in this step (for highlighting new additions) */
  updatedElements?: string[]
  /** Step configuration for progressive reveal */
  stepConfig?: Array<{
    step: number
    visibleForces?: string[]
    highlightForces?: string[]
    showComponents?: boolean
    showNetForce?: boolean
    showCalculation?: string
    stepLabel?: string
    stepLabelHe?: string
  }>
  /** Enable interactive "What If?" mode for exploration (physics diagrams only) */
  enableInteractive?: boolean
}

/**
 * Visual update for the VisualSolvingPanel — describes one step of a
 * persistent diagram that lives alongside the tutoring chat.
 */
export interface VisualUpdate {
  tool: 'desmos' | 'geogebra' | 'recharts' | 'svg' | 'engine_image'
  action: 'add' | 'replace' | 'clear'
  stepNumber: number
  stepLabel: string
  stepLabelHe?: string
  desmosExpressions?: Array<{
    id?: string
    latex: string
    color?: string
    label?: string
    hidden?: boolean
  }>
  desmosConfig?: {
    xRange?: [number, number]
    yRange?: [number, number]
    showGrid?: boolean
  }
  geogebraCommands?: Array<{
    command: string
    label?: string
    color?: string
    showLabel?: boolean
  }>
  rechartsData?: {
    chartType: 'bar' | 'histogram' | 'pie' | 'line' | 'scatter' | 'box_plot'
    data?: Array<{
      name: string
      value: number
      value2?: number
      color?: string
    }>
    boxPlotData?: Array<{
      name: string
      min: number
      q1: number
      median: number
      q3: number
      max: number
      outliers?: number[]
    }>
    xLabel?: string
    yLabel?: string
  }
  svgDiagram?: TutorDiagramState
  title?: string
  titleHe?: string
}

/** Step sequence diagram data shape */
export interface StepSequenceDiagramData {
  steps: Array<{
    stepNumber: number
    title: string
    titleHe: string
    explanation: string
    explanationHe: string
    diagramImageUrl: string | null
    pipeline: string | null
    highlightWhat: string
  }>
  summary: string
  summaryHe: string
  partial: boolean
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
  /** User's preferred language ('en' or 'he') */
  language?: 'en' | 'he'
  /** Student's grade level (e.g., 'יא', 'grade11', 'dp2') */
  grade?: string
  /** Student's study system (e.g., 'israeli_bagrut', 'ib', 'ap') */
  studySystem?: string
  /** Student intelligence from Learning Intelligence Engine */
  studentIntelligence?: {
    studentAbilitySummary: string
    explanationDepth: 'brief' | 'standard' | 'detailed'
    preferredExplanationStyle: 'visual' | 'step-by-step' | 'analogy' | 'mixed'
    scaffoldingLevel: number
    anticipatedMisconceptions: string[]
    knownPrerequisiteGaps: string[]
  }
}

export interface HintContext {
  session: HomeworkSession
  questionAnalysis: QuestionAnalysis
  referenceAnalysis?: ReferenceAnalysis
  requestedLevel: HintLevel
  previousHints: HintResponse[]
  /** User's preferred language ('en' or 'he') */
  language?: 'en' | 'he'
  /** Topic type for content-appropriate hints */
  topicType?: 'computational' | 'conceptual' | 'mixed'
}

// ============================================================================
// Three-Phase Grading Pipeline Types
// ============================================================================

/** Verification status for a math problem checked against mathjs */
export type VerificationStatus = 'verified' | 'unverifiable' | 'disagreement'

/** Input mode for three-phase pipeline: separate images or single combined image */
export type PipelineInputMode = 'separate' | 'combined'

/** A problem extracted and solved by Phase 1 */
export interface VerifiedProblem {
  id: string
  questionText: string
  subject: string
  solutionSteps: string[]
  correctAnswer: string
  mathjsVerified: boolean
  mathjsResult?: string | number
  verificationStatus: VerificationStatus
  /** Only populated in combined-image mode */
  studentAnswer?: string
  /** Confidence of student answer reading in combined mode */
  studentAnswerConfidence?: 'high' | 'medium' | 'low'
}

/** Phase 1 output: extracted problems with verified solutions */
export interface SolutionSet {
  problems: VerifiedProblem[]
  inputMode: PipelineInputMode
  /** Language detected from the homework image ('en' or 'he') */
  detectedLanguage: string
}

/** A student's answer as read by Phase 2 */
export interface StudentAnswer {
  problemId: string
  rawReading: string
  interpretation: string
  confidence: 'high' | 'medium' | 'low'
  ambiguousCharacters?: string[]
  alternativeReadings?: string[]
}

/** Phase 2 output: transcribed student answers */
export interface StudentAnswerSet {
  answers: StudentAnswer[]
}

/** Result of feedback quality validation */
export interface FeedbackQualityResult {
  passed: boolean
  failingCorrectIndices: number[]
  failingImprovementIndices: number[]
  reasons: string[]
}
