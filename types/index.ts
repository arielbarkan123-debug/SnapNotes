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
  /** URL to the original uploaded image in Supabase Storage */
  original_image_url: string
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
  /** URL to the uploaded image in Supabase Storage */
  original_image_url: string
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
  /** Updated image URL */
  original_image_url?: string
  /** Updated extracted content */
  extracted_content?: string | null
  /** Updated course structure */
  generated_course?: GeneratedCourse
}

// ============================================
// GENERATED COURSE CONTENT STRUCTURE
// Types for the AI-generated course content
// ============================================

/**
 * GeneratedCourse - The complete AI-generated course structure
 * Stored as JSONB in the database
 */
export interface GeneratedCourse {
  /** The course title generated from notes */
  title: string
  /** High-level overview of what the notes cover */
  overview: string
  /** List of key concepts/terms identified in the notes */
  keyConcepts: string[]
  /** Detailed sections breaking down the content */
  sections: CourseSection[]
  /** How different concepts connect to each other */
  connections: string
  /** Condensed summary of all the material */
  summary: string
  /** Suggested topics for further study */
  furtherStudy: string[]
}

/**
 * CourseSection - A section of the course covering a specific topic
 */
export interface CourseSection {
  /** Section title/heading */
  title: string
  /** Detailed explanation of the topic */
  explanation: string
  /** What the user originally wrote in their notes */
  originalNotes: string
  /** Bullet points of key takeaways */
  keyPoints: string[]
  /** Mathematical formulas if present (optional) */
  formulas?: Formula[]
  /** Descriptions of diagrams/visuals if present (optional) */
  diagrams?: DiagramDescription[]
  /** Practical examples to reinforce understanding (optional) */
  examples?: string[]
}

/**
 * Formula - A mathematical formula with explanation
 */
export interface Formula {
  /** The formula itself (can include LaTeX notation) */
  formula: string
  /** Plain English explanation of what the formula means */
  explanation: string
}

/**
 * DiagramDescription - Description of a visual/diagram from the notes
 */
export interface DiagramDescription {
  /** What the diagram shows */
  description: string
  /** Why this diagram is important */
  significance: string
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
