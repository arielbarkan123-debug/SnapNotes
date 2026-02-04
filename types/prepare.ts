// ============================================
// PREPARE (STUDY GUIDE) TYPES
// Types for the AI-generated study guide feature
// ============================================

/**
 * GuideSectionType - The type of content section in a study guide
 */
export type GuideSectionType =
  | 'overview'
  | 'definitions'
  | 'theory'
  | 'examples'
  | 'model_answer'
  | 'formula'
  | 'comparison'
  | 'quick_reference'
  | 'possible_questions'

/**
 * GuideTable - A table within a guide section
 */
export interface GuideTable {
  headers: string[]
  rows: string[][]
  caption?: string
}

/**
 * GuideDiagram - A diagram within a guide section
 */
export interface GuideDiagram {
  type: string
  data: Record<string, unknown>
  caption?: string
}

/**
 * GuideYouTubeVideo - YouTube video metadata for embedding
 */
export interface GuideYouTubeVideo {
  videoId: string
  title: string
  channelTitle: string
  thumbnailUrl: string
  searchQuery: string
  duration?: string
}

/**
 * GuideSubsection - A subsection within a guide section
 */
export interface GuideSubsection {
  id: string
  title: string
  content: string
  order: number
}

/**
 * GuideSection - A section within a topic (e.g., definitions, theory, examples)
 */
export interface GuideSection {
  id: string
  type: GuideSectionType
  title: string
  content: string // Markdown
  tables?: GuideTable[]
  diagrams?: GuideDiagram[]
  videos?: GuideYouTubeVideo[]
  subsections?: GuideSubsection[]
  order: number
}

/**
 * GuideTopic - A major topic in the study guide containing multiple sections
 */
export interface GuideTopic {
  id: string
  title: string
  sections: GuideSection[]
  order: number
}

/**
 * GeneratedGuide - The full AI-generated guide structure (stored as JSONB)
 */
export interface GeneratedGuide {
  title: string
  subtitle: string
  subject: string
  estimatedReadingTime: number
  generatedAt: string
  topics: GuideTopic[]
  quickReference?: GuideSection
  youtubeSearchQueries?: string[]
}

/**
 * PrepareGuideStatus - Generation status for a guide
 */
export type PrepareGuideStatus = 'processing' | 'generating' | 'complete' | 'failed'

/**
 * PrepareGuide - Database record for a study guide
 */
export interface PrepareGuide {
  id: string
  user_id: string
  title: string
  subtitle: string | null
  subject: string | null
  image_urls: string[] | null
  document_url: string | null
  extracted_content: string | null
  source_type: 'image' | 'pdf' | 'pptx' | 'docx' | 'text' | null
  generated_guide: GeneratedGuide
  generation_status: PrepareGuideStatus
  youtube_videos: GuideYouTubeVideo[] | null
  share_token: string | null
  is_public: boolean
  created_at: string
  updated_at: string
}

/**
 * PrepareGuideInsert - Type for creating new guide records
 */
export interface PrepareGuideInsert {
  user_id: string
  title: string
  subtitle?: string | null
  subject?: string | null
  image_urls?: string[] | null
  document_url?: string | null
  extracted_content?: string | null
  source_type?: 'image' | 'pdf' | 'pptx' | 'docx' | 'text' | null
  generated_guide: GeneratedGuide
  generation_status?: PrepareGuideStatus
  youtube_videos?: GuideYouTubeVideo[] | null
  share_token?: string | null
  is_public?: boolean
}

/**
 * PrepareChatMessage - A message in the chat sidebar
 */
export interface PrepareChatMessage {
  id: string
  guide_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  section_ref?: string | null
  diagram?: { type: string; data: Record<string, unknown> } | null
  created_at: string
}

/**
 * PrepareChatMessageInsert - Type for creating new chat messages
 */
export interface PrepareChatMessageInsert {
  guide_id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  section_ref?: string | null
  diagram?: { type: string; data: Record<string, unknown> } | null
}
