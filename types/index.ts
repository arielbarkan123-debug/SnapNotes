// ============================================
// DATABASE TYPES
// Types that match the Supabase database schema
// ============================================

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
  /** Timestamp when the course was created */
  created_at: string
  /** Timestamp when the course was last updated */
  updated_at: string
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
 * ApiResponse<T> - Generic wrapper for API responses
 * Either contains data on success, or error message on failure
 */
export interface ApiResponse<T> {
  /** The response data (null if error) */
  data: T | null
  /** Error message (null if success) */
  error: string | null
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
