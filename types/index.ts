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
  workedSolution: string
  difficulty: number // 1-5
  commonMistake?: string
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
export type StepType = 'explanation' | 'key_point' | 'question' | 'formula' | 'diagram' | 'example' | 'summary'

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
