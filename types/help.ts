export type HelpRequestType = 'explain' | 'example' | 'hint' | 'custom'

export interface HelpRequest {
  id: string
  user_id: string
  course_id: string
  lesson_index: number | null
  step_index: number | null
  question_type: HelpRequestType
  user_question: string | null
  ai_response: string
  source_reference: string | null
  created_at: string
}

export interface HelpContext {
  courseId: string
  courseTitle: string
  lessonIndex: number
  lessonTitle: string
  stepIndex: number
  stepContent: string
  stepType: string
  userAnswer?: string
  correctAnswer?: string
  wasCorrect?: boolean
}

export interface HelpAPIRequest {
  questionType: HelpRequestType
  context: HelpContext
  customQuestion?: string
}

export interface HelpAPIResponse {
  success: boolean
  response?: string
  sourceReference?: string | null
  error?: string
}
