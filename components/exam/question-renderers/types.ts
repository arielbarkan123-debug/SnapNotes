/**
 * Shared types for question renderers
 */

import { type ExamQuestion, type ExamAnswer } from '@/types'

export interface QuestionRendererProps {
  question: ExamQuestion
  answer: ExamAnswer | undefined
  onAnswer: (answer: ExamAnswer) => void
  showResults: boolean
}
