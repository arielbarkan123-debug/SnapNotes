'use client'

/**
 * QuestionRenderer - Main Component
 *
 * This component acts as a registry that routes to the appropriate
 * renderer based on question type. Each renderer is now in its own file
 * in the question-renderers/ directory.
 */

import { type ExamQuestion, type ExamAnswer } from '@/types'
import {
  MultipleChoiceRenderer,
  TrueFalseRenderer,
  FillBlankRenderer,
  ShortAnswerRenderer,
  MatchingRenderer,
  OrderingRenderer,
  PassageBasedRenderer,
  ImageLabelRenderer,
} from './question-renderers'

interface QuestionRendererProps {
  question: ExamQuestion
  answer: ExamAnswer | undefined
  onAnswer: (answer: ExamAnswer) => void
  showResults: boolean
}

export default function QuestionRenderer({
  question,
  answer,
  onAnswer,
  showResults,
}: QuestionRendererProps) {
  switch (question.question_type) {
    case 'multiple_choice':
      return (
        <MultipleChoiceRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'true_false':
      return (
        <TrueFalseRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'fill_blank':
      return (
        <FillBlankRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'short_answer':
      return (
        <ShortAnswerRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'matching':
      return (
        <MatchingRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'ordering':
      return (
        <OrderingRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'passage_based':
      return (
        <PassageBasedRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    case 'image_label':
      return (
        <ImageLabelRenderer
          question={question}
          answer={answer}
          onAnswer={onAnswer}
          showResults={showResults}
        />
      )
    default:
      return (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-xl text-red-600 dark:text-red-400">
          Unknown question type: {question.question_type}
        </div>
      )
  }
}
