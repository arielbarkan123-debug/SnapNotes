// Past Exam Templates Types
// For uploading and analyzing past exams to improve exam generation

export type AnalysisStatus = 'pending' | 'analyzing' | 'completed' | 'failed'

export type PastExamFileType = 'image' | 'pdf' | 'pptx' | 'docx'

export type QuestionTypeKey =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'matching'
  | 'ordering'
  | 'essay'
  | 'passage_based'

export interface QuestionTypeAnalysis {
  count: number
  percentage: number
  avg_points: number
}

export interface DifficultyDistribution {
  easy: number
  medium: number
  hard: number
}

export interface PointDistribution {
  min_points: number
  max_points: number
  avg_points: number
  common_values: number[]
}

export interface ExamSection {
  name: string
  question_count: number
  points: number
}

export interface StructurePatterns {
  has_sections: boolean
  section_count: number
  sections: ExamSection[]
  has_instructions: boolean
  instruction_style?: string
}

export interface GradingPatterns {
  partial_credit_allowed: boolean
  rubric_style: 'points' | 'checkmarks' | 'descriptive'
  common_point_values: number[]
  bonus_questions: boolean
}

export interface BloomLevels {
  remember: number
  understand: number
  apply: number
  analyze: number
  evaluate: number
  create: number
}

export interface QuestionStyleAnalysis {
  avg_question_length_words: number
  uses_scenarios: boolean
  uses_diagrams: boolean
  uses_calculations: boolean
  command_terms: string[]
  bloom_levels: BloomLevels
}

export interface SampleQuestion {
  type: string
  text: string
  points: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export interface ExamAnalysis {
  total_questions: number
  total_points: number
  time_estimate_minutes: number | null
  question_types: Partial<Record<QuestionTypeKey, QuestionTypeAnalysis>>
  difficulty_distribution: DifficultyDistribution
  point_distribution: PointDistribution
  structure_patterns: StructurePatterns
  grading_patterns: GradingPatterns
  question_style: QuestionStyleAnalysis
  sample_questions: SampleQuestion[]
}

export interface PastExamTemplate {
  id: string
  user_id: string
  title: string
  description: string | null
  file_url: string
  file_type: PastExamFileType
  original_filename: string
  file_size_bytes: number | null
  analysis_status: AnalysisStatus
  analysis_error: string | null
  analyzed_at: string | null
  extracted_analysis: ExamAnalysis | null
  extracted_text: string | null
  created_at: string
  updated_at: string
}

export interface CreatePastExamRequest {
  title?: string
  description?: string
}

export interface PastExamTemplatesResponse {
  success: boolean
  templates: PastExamTemplate[]
  count: number
  limit: number
}

export interface PastExamUploadResponse {
  success: boolean
  template: PastExamTemplate
  message?: string
}

export interface PastExamAnalyzeResponse {
  success: boolean
  template: PastExamTemplate
  message?: string
}

// Database insert type (without id and timestamps)
export interface PastExamTemplateInsert {
  user_id: string
  title: string
  description?: string | null
  file_url: string
  file_type: PastExamFileType
  original_filename: string
  file_size_bytes?: number | null
  analysis_status?: AnalysisStatus
  analysis_error?: string | null
  analyzed_at?: string | null
  extracted_analysis?: ExamAnalysis | null
  extracted_text?: string | null
}
