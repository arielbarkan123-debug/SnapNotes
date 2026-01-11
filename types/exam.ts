export type ExamStatus = 'pending' | 'in_progress' | 'completed' | 'expired'

export type ExamQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'matching'
  | 'ordering'
  | 'passage_based'
  | 'image_label'

export type SubQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'

export interface MatchingPair {
  left: string
  right: string
}

/** Interaction mode for image label questions */
export type ImageLabelMode = 'drag' | 'type' | 'both'

/** A label position on an image */
export interface ImageLabel {
  /** Unique identifier for this label */
  id: string
  /** The correct text/answer for this label */
  correct_text: string
  /** Position as percentage (0-100) from left edge */
  x: number
  /** Position as percentage (0-100) from top edge */
  y: number
  /** Width of the input box (for type mode), in percentage */
  box_width?: number
  /** Optional hints for this label */
  hints?: string[]
  /** User's answer for this label */
  user_answer?: string
  /** Whether the user's answer is correct */
  is_correct?: boolean
}

/** Image label question data */
export interface ImageLabelData {
  /** URL to the image */
  image_url: string
  /** Alt text for accessibility */
  image_alt?: string
  /** Interaction mode: drag labels, type in boxes, or both */
  interaction_mode: ImageLabelMode
  /** The labels to place/fill on the image */
  labels: ImageLabel[]
  /** Source of the image */
  image_source?: 'extracted' | 'web' | 'uploaded'
  /** Credit for web images */
  image_credit?: string
  /** Link to image credit */
  image_credit_url?: string
}

export interface SubQuestion {
  id: string
  question_text: string
  question_type: SubQuestionType
  options: string[] | null
  correct_answer: string
  acceptable_answers: string[] | null
  points: number
  user_answer: string | null
  is_correct: boolean | null
}

export interface Exam {
  id: string
  user_id: string
  course_id: string
  title: string
  question_count: number
  time_limit_minutes: number
  status: ExamStatus
  started_at: string | null
  completed_at: string | null
  score: number
  total_points: number
  percentage: number | null
  grade: string | null
  created_at: string
}

export interface ExamQuestion {
  id: string
  exam_id: string
  question_index: number
  lesson_index: number | null
  lesson_title: string | null
  question_type: ExamQuestionType
  question_text: string
  options: string[]
  correct_answer: string
  explanation: string | null
  points: number
  user_answer: string | null
  is_correct: boolean | null
  created_at: string
  // Additional fields for advanced question types
  passage: string | null
  matching_pairs: MatchingPair[] | null
  ordering_items: string[] | null
  sub_questions: SubQuestion[] | null
  acceptable_answers: string[] | null
  // Image label question fields
  image_label_data: ImageLabelData | null
}

export interface ExamWithQuestions extends Exam {
  questions: ExamQuestion[]
  course_title?: string
}

export interface CreateExamRequest {
  courseId: string
  questionCount: number
  timeLimitMinutes: number
  examFormat?: 'match_real' | 'adaptive' | 'standard'
}

export interface ExamAnswer {
  questionId: string
  answer: string
  matchingAnswers?: MatchingPair[]
  orderingAnswer?: string[]
  subAnswers?: { subQuestionId: string; answer: string }[]
  /** Answers for image label questions: maps label id to user's answer */
  imageLabelAnswers?: { labelId: string; answer: string }[]
}

export interface SubmitExamRequest {
  answers: ExamAnswer[]
}

export interface ExamResult {
  exam: Exam
  questions: ExamQuestion[]
  correctCount: number
  incorrectCount: number
  weakLessons: { lessonIndex: number; lessonTitle: string; incorrectCount: number }[]
}
