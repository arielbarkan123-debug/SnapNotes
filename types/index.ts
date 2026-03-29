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
  /** Language the course content was generated in */
  content_language?: 'en' | 'he'
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
  /** Language the course content was generated in */
  content_language?: 'en' | 'he'
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
    /** @deprecated Use stepImages for pre-rendered steps */
    stepByStepSource?: {
      tikzCode: string
      steps: Array<{
        layer: number
        label: string
        labelHe: string
        explanation: string
        explanationHe: string
      }>
    }
    /** Pre-rendered step images from step-capture pipeline */
    stepImages?: Array<{
      url: string
      label: string
      labelHe: string
      explanation: string
      explanationHe: string
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

// ============================================
// SRS (SPACED REPETITION SYSTEM) TYPES
// Types for the flashcard review system
// ============================================

export * from './srs'

export * from './help'

export * from './exam'

export * from './past-exam'

export * from './prepare'

export * from './walkthrough'

export * from './academic-events'

// ─── Diagram Overlay Labels ─────────────────────────────────────────────────

export interface OverlayLabel {
  text: string
  textHe?: string
  x: number
  y: number
  targetX: number
  targetY: number
  description?: string
  descriptionHe?: string
  stepGroup?: number
  found?: boolean  // defaults to true when absent
}

export interface RecraftStepMeta {
  step: number
  label: string
  labelHe: string
  explanation: string
  explanationHe: string
}

export type DiagramStatus =
  | { status: 'generating' }
  | { status: 'success'; imageUrl: string; labels: OverlayLabel[]; stepMetadata?: RecraftStepMeta[] }
  | { status: 'failed'; reason: string; fallbackText?: string }
  | { status: 'timeout'; willRetryOnNext: boolean }

