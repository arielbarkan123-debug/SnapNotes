export type ExamStatus = 'pending' | 'in_progress' | 'completed' | 'expired'

export type ExamQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'matching'
  | 'ordering'
  | 'passage_based'

export type SubQuestionType = 'multiple_choice' | 'true_false' | 'fill_blank' | 'short_answer'

export interface MatchingPair {
  left: string
  right: string
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
}

export interface ExamWithQuestions extends Exam {
  questions: ExamQuestion[]
  course_title?: string
}

export interface CreateExamRequest {
  courseId: string
  questionCount: number
  timeLimitMinutes: number
}

export interface ExamAnswer {
  questionId: string
  answer: string
  matchingAnswers?: MatchingPair[]
  orderingAnswer?: string[]
  subAnswers?: { subQuestionId: string; answer: string }[]
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
