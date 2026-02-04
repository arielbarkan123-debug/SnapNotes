// ============================================
// DATABASE TYPES
// Types that match the Supabase database schema
// ============================================

/**
 * GenerationStatus - Status of progressive course generation
 */
export type GenerationStatus = 'processing' | 'partial' | 'generating' | 'complete' | 'failed'

// ============================================
// LESSON INTENSITY TYPES
// User-selected learning intensity for adaptive lesson duration
// ============================================

/**
 * LessonIntensityMode - User-selected learning intensity
 * - quick: 10-15 min, key concepts overview
 * - standard: 20-30 min, balanced learning (default)
 * - deep_practice: 45-60 min, mastery-focused with extensive practice
 */
export type LessonIntensityMode = 'quick' | 'standard' | 'deep_practice'

/**
 * IntensityConfig - Configuration for each intensity mode
 */
export interface IntensityConfig {
  id: LessonIntensityMode
  targetDurationMinutes: { min: number; max: number }
  stepsPerLesson: { min: number; max: number }
  practiceRatio: number // 0-1, percentage of lesson that is practice
  workedExamplesRequired: number
  practiceProblemsTarget: number
  masteryThreshold: number // 0-1, accuracy needed to complete (e.g., 0.85 = 85%)
  allowRetryUntilMastery: boolean
  defaultDepth?: 'surface' | 'standard' | 'deep' | 'exhaustive'
}

/**
 * WorkedExampleStep - A single step in a worked example
 */
export interface WorkedExampleStep {
  step: number
  action: string
  why: string
  result: string
}

/**
 * WorkedExample - Detailed step-by-step example for deep practice
 */
export interface WorkedExample {
  problem: string
  steps: WorkedExampleStep[]
  finalAnswer: string
  keyInsight: string
}

/**
 * PracticeProblem - A practice problem with hints and solution
 */
export interface PracticeProblem {
  id: string
  problemNumber: number
  question: string
  options?: string[]
  correctAnswer: string | number
  hints: string[] // 3 progressive hints
  workedSolution: string | StructuredWorkedSolution
  difficulty: number // 1-5
  commonMistake?: string
  /** Visual showing WHERE the error occurs for wrong answers */
  mistakeVisual?: MathVisual
  /** Specific error explanations for each wrong answer option */
  errorExplanations?: Record<number, MistakeExplanation>
}

// ============================================
// MATH RENDERING TYPES
// Types for subject-aware math step-by-step solutions
// ============================================

/**
 * MathStep - A single step in a math solution
 */
export interface MathStep {
  stepNumber: number
  /** Description of the action taken (e.g., "Identify coefficients", "Apply formula") */
  action: string
  /** LaTeX formula (e.g., "x = \\frac{-b \\pm \\sqrt{b^2-4ac}}{2a}") */
  formula?: string
  /** LaTeX with values substituted */
  substitution?: string
  /** LaTeX result */
  result?: string
  /** Brief text explanation */
  explanation?: string
}

/**
 * MathVisualType - Types of visual representations for math problems
 */
export type MathVisualType =
  | 'number_line'
  | 'coordinate_plane'
  | 'triangle'
  | 'circle'
  | 'unit_circle'
  | 'table'
  | 'tree_diagram'

/**
 * NumberLinePoint - A point on a number line
 */
export interface NumberLinePoint {
  value: number
  label?: string
  style: 'filled' | 'open' // filled = ● (≤,≥), open = ○ (<,>)
}

/**
 * NumberLineInterval - An interval on a number line
 */
export interface NumberLineInterval {
  start: number | null // null = negative infinity
  end: number | null // null = positive infinity
  startInclusive: boolean
  endInclusive: boolean
  color?: string
}

/**
 * NumberLineData - Data for number line visual
 */
export interface NumberLineData {
  min: number
  max: number
  points?: NumberLinePoint[]
  intervals?: NumberLineInterval[]
  title?: string
}

/**
 * CoordinatePoint - A point on a coordinate plane
 */
export interface CoordinatePoint {
  x: number
  y: number
  label?: string
  color?: string
}

/**
 * CoordinateLine - A line on a coordinate plane
 */
export interface CoordinateLine {
  type: 'line' | 'ray' | 'segment'
  points: [CoordinatePoint, CoordinatePoint]
  color?: string
  dashed?: boolean
}

/**
 * CoordinateCurve - A curve on a coordinate plane (for parabolas, etc.)
 */
export interface CoordinateCurve {
  /** Function expression (e.g., "x^2 - 5x + 6") */
  expression: string
  /** Color of the curve */
  color?: string
  /** Domain restriction */
  domain?: { min: number; max: number }
}

/**
 * CoordinateRegion - A shaded region on a coordinate plane
 */
export interface CoordinateRegion {
  /** Inequality expression (e.g., "y > x + 2") */
  inequality: string
  color?: string
  opacity?: number
}

/**
 * CoordinatePlaneData - Data for coordinate plane visual
 */
export interface CoordinatePlaneData {
  xMin: number
  xMax: number
  yMin: number
  yMax: number
  points?: CoordinatePoint[]
  lines?: CoordinateLine[]
  curves?: CoordinateCurve[]
  regions?: CoordinateRegion[]
  title?: string
  xLabel?: string
  yLabel?: string
  showGrid?: boolean
}

/**
 * TriangleVertex - A vertex of a triangle
 */
export interface TriangleVertex {
  x: number
  y: number
  label: string // e.g., "A", "B", "C"
}

/**
 * TriangleSide - A side of a triangle with optional measurement
 */
export interface TriangleSide {
  from: string // vertex label
  to: string // vertex label
  length?: string // e.g., "5", "a", "√2"
  highlight?: boolean
}

/**
 * TriangleAngle - An angle of a triangle
 */
export interface TriangleAngle {
  vertex: string // vertex label where angle is located
  measure?: string // e.g., "60°", "θ", "90°"
  highlight?: boolean
  rightAngle?: boolean
}

/**
 * TriangleData - Data for triangle visual
 */
export interface TriangleData {
  vertices: [TriangleVertex, TriangleVertex, TriangleVertex]
  sides?: TriangleSide[]
  angles?: TriangleAngle[]
  altitude?: { from: string; to: string } // Show altitude line
  title?: string
}

/**
 * CircleData - Data for circle visual
 */
export interface CircleData {
  centerX: number
  centerY: number
  radius: number
  centerLabel?: string
  showRadius?: boolean
  radiusLabel?: string
  showDiameter?: boolean
  chords?: Array<{
    start: { x: number; y: number; label?: string }
    end: { x: number; y: number; label?: string }
  }>
  tangentPoint?: { x: number; y: number; label?: string }
  centralAngle?: { start: number; end: number; label?: string }
  inscribedAngle?: { vertex: { x: number; y: number }; arc: { start: number; end: number }; label?: string }
  title?: string
}

/**
 * UnitCircleAngle - An angle shown on the unit circle
 */
export interface UnitCircleAngle {
  degrees: number
  radians: string // e.g., "π/6", "π/4"
  highlight?: boolean
  showCoordinates?: boolean
  label?: string
}

/**
 * UnitCircleData - Data for unit circle visual
 */
export interface UnitCircleData {
  angles: UnitCircleAngle[]
  showStandardAngles?: boolean // Show all standard angles (30°, 45°, 60°, etc.)
  highlightQuadrant?: 1 | 2 | 3 | 4
  showSinCos?: boolean // Show sin/cos values
  title?: string
}

/**
 * TableCell - A cell in a math table
 */
export interface TableCell {
  content: string
  isHeader?: boolean
  highlight?: boolean
  color?: string
}

/**
 * TableData - Data for table visual
 */
export interface TableData {
  rows: TableCell[][]
  title?: string
  caption?: string
}

/**
 * TreeNode - A node in a tree diagram
 */
export interface TreeNode {
  id: string
  label: string
  value?: string // e.g., probability value "1/3"
  children?: TreeNode[]
  highlight?: boolean
}

/**
 * TreeDiagramData - Data for tree diagram visual
 */
export interface TreeDiagramData {
  root: TreeNode
  showProbabilities?: boolean
  title?: string
}

// ============================================
// ERROR HIGHLIGHTING TYPES
// For visual mistake explanations
// ============================================

/**
 * VisualErrorHighlight - Describes an error in a visual
 */
export interface VisualErrorHighlight {
  type: 'wrong_value' | 'wrong_step' | 'sign_error' | 'missing_step' | 'wrong_operation'
  description: string
  color?: string // Defaults to red for errors
}

/**
 * ErrorPoint - A point marked as error or correct
 */
export interface ErrorPoint {
  isError?: boolean
  isCorrect?: boolean
  errorLabel?: string
  correctLabel?: string
}

/**
 * NumberLineErrorHighlight - Error highlighting for number line
 */
export interface NumberLineErrorHighlight {
  wrongPoints?: Array<NumberLinePoint & ErrorPoint>
  correctPoints?: Array<NumberLinePoint & ErrorPoint>
  wrongIntervals?: Array<NumberLineInterval & ErrorPoint>
  correctIntervals?: Array<NumberLineInterval & ErrorPoint>
}

/**
 * CoordinatePlaneErrorHighlight - Error highlighting for coordinate plane
 */
export interface CoordinatePlaneErrorHighlight {
  wrongPoints?: Array<CoordinatePoint & ErrorPoint>
  correctPoints?: Array<CoordinatePoint & ErrorPoint>
  wrongCurves?: Array<CoordinateCurve & ErrorPoint>
  correctCurves?: Array<CoordinateCurve & ErrorPoint>
}

/**
 * TriangleErrorHighlight - Error highlighting for triangle
 */
export interface TriangleErrorHighlight {
  wrongSides?: string[] // Side labels that are wrong
  wrongAngles?: string[] // Angle vertex labels that are wrong
  corrections?: Record<string, string> // Map of wrong label to correction text
}

/**
 * CircleErrorHighlight - Error highlighting for circle
 */
export interface CircleErrorHighlight {
  wrongRadius?: boolean
  wrongCenter?: boolean
  wrongChord?: number // Index of wrong chord
  corrections?: Record<string, string>
}

/**
 * UnitCircleErrorHighlight - Error highlighting for unit circle
 */
export interface UnitCircleErrorHighlight {
  wrongAngles?: number[] // Degrees of wrong angles
  correctAngles?: number[] // Degrees of correct angles
  wrongValues?: Array<{ angle: number; wrongSin?: string; wrongCos?: string }>
}

/**
 * TreeDiagramErrorHighlight - Error highlighting for tree diagram
 */
export interface TreeDiagramErrorHighlight {
  wrongNodes?: string[] // IDs of wrong nodes
  wrongPaths?: string[] // IDs of wrong path endpoints
  correctPath?: string[] // IDs of correct path
  corrections?: Record<string, string>
}

/**
 * Extended visual data types with error highlighting
 */
export interface NumberLineDataWithErrors extends NumberLineData {
  errorHighlight?: NumberLineErrorHighlight
}

export interface CoordinatePlaneDataWithErrors extends CoordinatePlaneData {
  errorHighlight?: CoordinatePlaneErrorHighlight
}

export interface TriangleDataWithErrors extends TriangleData {
  errorHighlight?: TriangleErrorHighlight
}

export interface CircleDataWithErrors extends CircleData {
  errorHighlight?: CircleErrorHighlight
}

export interface UnitCircleDataWithErrors extends UnitCircleData {
  errorHighlight?: UnitCircleErrorHighlight
}

export interface TreeDiagramDataWithErrors extends TreeDiagramData {
  errorHighlight?: TreeDiagramErrorHighlight
}

/**
 * MistakeExplanation - Visual explanation of a mistake
 */
export interface MistakeExplanation {
  description: string
  visual?: MathVisual
  commonMistake?: string
  tip?: string
}

/**
 * MathVisual - Visual representation for a math solution
 */
export type MathVisual =
  | { type: 'number_line'; data: NumberLineData }
  | { type: 'coordinate_plane'; data: CoordinatePlaneData }
  | { type: 'triangle'; data: TriangleData }
  | { type: 'circle'; data: CircleData }
  | { type: 'unit_circle'; data: UnitCircleData }
  | { type: 'table'; data: TableData }
  | { type: 'tree_diagram'; data: TreeDiagramData }

/**
 * MathSolution - A complete math solution using one method
 */
export interface MathSolution {
  /** Method name (e.g., "Quadratic Formula", "Factoring", "Completing Square") */
  method: string
  /** Method type for categorization */
  methodType?: 'formula' | 'factoring' | 'graphical' | 'table' | 'elimination' | 'substitution' | 'other'
  /** When this method is best to use */
  whenToUse?: string
  /** Identified coefficients (e.g., { a: "1", b: "5", c: "-6" }) */
  coefficients?: Record<string, string>
  /** Step-by-step solution */
  steps: MathStep[]
  /** Final answer in LaTeX (e.g., "x = 1 \\text{ or } x = -6") */
  finalAnswer: string
  /** Optional verification/check work */
  verification?: string
  /** Optional visual representation */
  visual?: MathVisual
}

/**
 * StructuredWorkedSolution - Subject-aware worked solution
 * For math: contains structured step-by-step methods with LaTeX
 * For other subjects: contains text explanation
 */
export interface StructuredWorkedSolution {
  /** Subject type for appropriate rendering */
  subject: 'math' | 'other'
  /** Multiple solving methods for math problems */
  methods?: MathSolution[]
  /** Fallback text explanation for non-math subjects */
  textExplanation?: string
}

/**
 * DeepPracticeProgress - Tracks mastery progress for deep practice lessons
 */
export interface DeepPracticeProgress {
  id: string
  user_id: string
  course_id: string
  lesson_index: number
  concept_id: string
  current_mastery: number // 0-1
  problems_attempted: number
  problems_correct: number
  current_difficulty: number
  completed: boolean
  completed_at?: string
  created_at: string
}

/**
 * LessonOutline - Brief outline of a lesson for continuation context
 */
export interface LessonOutline {
  index: number
  title: string
  description: string
  estimatedSteps: number
  topics: string[]
}

/**
 * Course - Represents a course record from the database
 * Maps directly to the `courses` table in Supabase
 */
export interface Course {
  /** Unique identifier (UUID) */
  id: string
  /** Reference to auth.users - the owner of this course */
  user_id: string
  /** Course title derived from the notes content */
  title: string
  /** URL to the original uploaded image in Supabase Storage (legacy, single image) */
  original_image_url: string | null
  /** Array of URLs to uploaded images (multi-page support) */
  image_urls?: string[] | null
  /** URL to the uploaded document in Supabase Storage (PDF, PPTX, DOCX) */
  document_url?: string | null
  /** Source type of the course content */
  source_type?: 'image' | 'pdf' | 'pptx' | 'docx' | 'text'
  /** Raw text content extracted from the image by AI (nullable) */
  extracted_content: string | null
  /** The full AI-generated course structure */
  generated_course: GeneratedCourse
  /** AI-generated cover image URL */
  cover_image_url?: string | null
  /** Phase 2: AI-generated learning objectives with Bloom's taxonomy */
  learning_objectives?: LearningObjective[] | null
  /** Phase 2: Curriculum alignment data */
  curriculum_alignment?: Record<string, unknown> | null
  /** Phase 4: Overall extraction confidence score (0-1) */
  extraction_confidence?: number | null
  /** Phase 4: Detailed extraction confidence metadata */
  extraction_metadata?: ExtractionConfidenceMetadata | null
  /** Progressive generation: current status */
  generation_status?: GenerationStatus
  /** Progressive generation: number of lessons ready */
  lessons_ready?: number
  /** Progressive generation: total expected lessons */
  total_lessons?: number
  /** Progressive generation: AI-generated document summary for continuation */
  document_summary?: string | null
  /** Progressive generation: lesson outline for context in continuation */
  lesson_outline?: LessonOutline[] | null
  /** User-selected lesson intensity mode (quick, standard, deep_practice) */
  intensity_mode?: LessonIntensityMode
  /** Timestamp when the course was created */
  created_at: string
  /** Timestamp when the course was last updated */
  updated_at: string
}

/**
 * LearningObjective - AI-generated learning objective with Bloom's taxonomy
 */
export interface LearningObjective {
  id: string
  objective: string
  bloomLevel: 'remember' | 'understand' | 'apply' | 'analyze' | 'evaluate' | 'create'
  actionVerb: string
  curriculumStandard?: string
}

/**
 * ExtractionConfidenceMetadata - Metadata about extraction quality
 */
export interface ExtractionConfidenceMetadata {
  overall: number
  textConfidence: number
  structureConfidence: number
  formulaConfidence: number
  diagramConfidence: number
  extractionMethod: 'ocr' | 'pdf_parse' | 'vision' | 'hybrid'
  processingTimeMs: number
  contentLength: number
  pageCount?: number
  lowConfidenceAreas?: Array<{
    contentType: string
    location: string
    reason: string
    suggestion: string
    confidence: number
  }>
}

/**
 * CourseInsert - Type for creating new courses
 * Excludes auto-generated fields (id, created_at, updated_at)
 */
export interface CourseInsert {
  /** Reference to auth.users - the owner of this course */
  user_id: string
  /** Course title */
  title: string
  /** URL to the uploaded image in Supabase Storage (legacy, for backward compatibility) */
  original_image_url?: string | null
  /** Array of URLs to uploaded images (multi-page support) */
  image_urls?: string[] | null
  /** URL to the uploaded document in Supabase Storage (PDF, PPTX, DOCX) */
  document_url?: string | null
  /** Source type of the course content */
  source_type?: 'image' | 'pdf' | 'pptx' | 'docx' | 'text'
  /** Raw extracted content (optional during initial creation) */
  extracted_content?: string | null
  /** The AI-generated course structure */
  generated_course: GeneratedCourse
  /** Phase 2: AI-generated learning objectives with Bloom's taxonomy */
  learning_objectives?: LearningObjective[] | null
  /** Phase 2: Curriculum alignment data */
  curriculum_alignment?: Record<string, unknown> | null
  /** Phase 4: Overall extraction confidence score (0-1) */
  extraction_confidence?: number | null
  /** Phase 4: Detailed extraction confidence metadata */
  extraction_metadata?: ExtractionConfidenceMetadata | null
  /** Progressive generation: current status */
  generation_status?: GenerationStatus
  /** Progressive generation: number of lessons ready */
  lessons_ready?: number
  /** Progressive generation: total expected lessons */
  total_lessons?: number
  /** Progressive generation: AI-generated document summary for continuation */
  document_summary?: string | null
  /** Progressive generation: lesson outline for context in continuation */
  lesson_outline?: LessonOutline[] | null
  /** User-selected lesson intensity mode (quick, standard, deep_practice) */
  intensity_mode?: LessonIntensityMode
}

/**
 * CourseUpdate - Type for updating existing courses
 * All fields are optional for partial updates
 */
export interface CourseUpdate {
  /** Updated course title */
  title?: string
  /** Updated image URL (legacy) */
  original_image_url?: string | null
  /** Updated image URLs array */
  image_urls?: string[] | null
  /** Updated document URL */
  document_url?: string | null
  /** Updated source type */
  source_type?: 'image' | 'pdf' | 'pptx' | 'docx'
  /** Updated extracted content */
  extracted_content?: string | null
  /** Updated course structure */
  generated_course?: GeneratedCourse
}

// ============================================
// GENERATED COURSE CONTENT STRUCTURE
// Duolingo-style course structure
// ============================================

/**
 * Formula - A formula with its explanation
 */
export interface Formula {
  formula: string
  explanation: string
}

/**
 * Diagram - A diagram/visual description
 */
export interface Diagram {
  description: string
  significance: string
}

/**
 * CourseSection - Legacy section structure
 * Used for displaying course content in section view
 */
export interface CourseSection {
  title: string
  explanation: string
  originalNotes?: string
  keyPoints?: string[]
  formulas?: Formula[]
  diagrams?: Diagram[]
  examples?: string[]
}

/**
 * StepType - The type of content in a lesson step
 */
export type StepType = 'explanation' | 'key_point' | 'question' | 'formula' | 'diagram' | 'example' | 'summary' | 'worked_example' | 'practice_problem'

/**
 * Step - A single step in a lesson
 */
export interface Step {
  type: StepType
  content: string
  /** Optional title for the step */
  title?: string
  /** Answer options for questions */
  options?: string[]
  /** Index of correct answer for questions (0-3) */
  correct_answer?: number
  /** Explanation for questions */
  explanation?: string
  /** Optional image URL for visual content */
  imageUrl?: string
  /** Optional image alt text for accessibility */
  imageAlt?: string
  /** Source of the image: 'extracted' from document, 'web' from internet search, or 'uploaded' from user */
  imageSource?: 'extracted' | 'web' | 'uploaded'
  /** Caption to display below the image */
  imageCaption?: string
  /** Photographer credit for web images (required for Unsplash) */
  imageCredit?: string
  /** Link to photographer's profile */
  imageCreditUrl?: string
  /**
   * Interactive diagram data for step-synced visualizations
   * Supports physics (FBD, inclined plane), chemistry (atoms, molecules),
   * biology (cells, DNA), and math (long division, etc.) diagrams
   */
  diagramData?: {
    type: string
    data: Record<string, unknown>
    visibleStep?: number
    totalSteps?: number
    stepConfig?: Array<{
      step: number
      stepLabel?: string
      showCalculation?: string
    }>
  }
}

/**
 * LessonStep - Alias for Step (used in lesson components)
 */
export type LessonStep = Step

/**
 * Lesson - A lesson containing multiple steps
 */
export interface Lesson {
  title: string
  steps: Step[]
}

/**
 * CourseImage - An image used in the course
 */
export interface CourseImage {
  /** URL to the image */
  url: string
  /** Alt text for accessibility */
  alt: string
  /** Source of the image */
  source: 'extracted' | 'web' | 'uploaded'
  /** Caption or description */
  caption?: string
  /** Related topic or keyword */
  topic?: string
}

/**
 * GeneratedCourse - The complete AI-generated course structure
 * Stored as JSONB in the database
 */
export interface GeneratedCourse {
  title: string
  overview: string
  lessons: Lesson[]
  /** Images used in the course (extracted from documents or fetched from web) */
  images?: CourseImage[]
  /** AI-generated learning objectives with Bloom's taxonomy (Phase 2) */
  learningObjectives?: LearningObjective[]
}

/**
 * UserProgress - Tracks user progress through a course
 */
export interface UserProgress {
  id: string
  user_id: string
  course_id: string
  current_lesson: number
  current_step: number
  completed_lessons: number[]
  /** Cumulative questions answered across all lessons */
  questions_answered: number
  /** Cumulative questions answered correctly */
  questions_correct: number
  created_at: string
  updated_at: string
}

/**
 * UserProgressInsert - Type for creating new progress records
 */
export interface UserProgressInsert {
  user_id: string
  course_id: string
  current_lesson?: number
  current_step?: number
  completed_lessons?: number[]
  questions_answered?: number
  questions_correct?: number
}

/**
 * UserProgressUpdate - Type for updating progress records
 */
export interface UserProgressUpdate {
  current_lesson?: number
  current_step?: number
  completed_lessons?: number[]
  questions_answered?: number
  questions_correct?: number
}

// ============================================
// AUTH TYPES
// Types related to user authentication
// ============================================

/**
 * User - Basic user information from Supabase Auth
 */
export interface User {
  /** User's unique identifier (UUID) */
  id: string
  /** User's email address */
  email: string
  /** When the user account was created */
  created_at: string
}

/**
 * AuthState - Current authentication state
 */
export interface AuthState {
  /** The authenticated user, or null if not logged in */
  user: User | null
  /** Whether auth state is still being determined */
  isLoading: boolean
}

// ============================================
// API RESPONSE TYPES
// Standard response wrappers for API endpoints
// ============================================

/**
 * ApiSuccessResponse<T> - Success response with data
 */
export interface ApiSuccessResponse<T> {
  /** The response data */
  data: T
  /** No error on success */
  error: null
}

/**
 * ApiErrorResponse - Error response with message
 */
export interface ApiErrorResponse {
  /** No data on error */
  data: null
  /** Error message */
  error: string
}

/**
 * ApiResponse<T> - Discriminated union for API responses
 * Either contains data on success, or error message on failure
 * Using a discriminated union prevents invalid states where
 * both data and error are null, or both are non-null.
 */
export type ApiResponse<T> = ApiSuccessResponse<T> | ApiErrorResponse

/**
 * Type guard to check if response is successful
 */
export function isApiSuccess<T>(response: ApiResponse<T>): response is ApiSuccessResponse<T> {
  return response.error === null && response.data !== null
}

/**
 * Type guard to check if response is an error
 */
export function isApiError<T>(response: ApiResponse<T>): response is ApiErrorResponse {
  return response.error !== null && response.data === null
}

/**
 * UploadResponse - Response from image upload endpoint
 */
export interface UploadResponse {
  /** Whether the upload was successful */
  success: boolean
  /** The public URL of the uploaded image */
  imageUrl: string | null
  /** The storage path (user_id/filename) */
  storagePath: string | null
  /** Error message if upload failed */
  error: string | null
}

/**
 * CourseGenerationResponse - Response from course generation endpoint
 */
export interface CourseGenerationResponse {
  /** Whether generation was successful */
  success: boolean
  /** The generated course data */
  course: GeneratedCourse | null
  /** Raw extracted text from the image */
  extractedContent: string | null
  /** Error message if generation failed */
  error: string | null
}

/**
 * PaginatedResponse<T> - Wrapper for paginated list responses
 */
export interface PaginatedResponse<T> {
  /** Array of items for current page */
  data: T[]
  /** Total count of all items */
  count: number
  /** Current page number (1-indexed) */
  page: number
  /** Number of items per page */
  perPage: number
  /** Whether there are more pages */
  hasMore: boolean
}

// ============================================
// SRS (SPACED REPETITION SYSTEM) TYPES
// Types for the flashcard review system
// ============================================

export * from './srs'

export * from './help'

export * from './exam'

export * from './past-exam'

export * from './prepare'
