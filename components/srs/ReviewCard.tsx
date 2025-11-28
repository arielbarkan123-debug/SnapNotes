'use client'

import { useState } from 'react'
import type { ReviewCard as ReviewCardType, CardType } from '@/types'
import {
  parseCardBack,
  isMultipleChoice,
  isTrueFalse,
  isFillBlank,
  isMatching,
  isSequence,
} from '@/types/srs'
import MultipleChoice from '@/components/practice/MultipleChoice'
import TrueFalse from '@/components/practice/TrueFalse'
import FillBlank from '@/components/practice/FillBlank'
import ShortAnswer from '@/components/practice/ShortAnswer'
import Matching from '@/components/practice/Matching'
import Sequence from '@/components/practice/Sequence'

// =============================================================================
// Types
// =============================================================================

interface ReviewCardProps {
  card: ReviewCardType
  onShowAnswer: () => void
  isAnswerShown: boolean
  onAnswer?: (isCorrect: boolean) => void
}

// =============================================================================
// Card Type Badges
// =============================================================================

const cardTypeConfig: Partial<Record<CardType, { label: string; color: string }>> = {
  // New types
  flashcard: { label: 'Flashcard', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  multiple_choice: { label: 'Multiple Choice', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  true_false: { label: 'True / False', color: 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400' },
  fill_blank: { label: 'Fill in Blank', color: 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400' },
  short_answer: { label: 'Short Answer', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  matching: { label: 'Matching', color: 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400' },
  sequence: { label: 'Sequence', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' },
  // Legacy types
  key_point: { label: 'Key Point', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  formula: { label: 'Formula', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  question: { label: 'Question', color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  explanation: { label: 'Concept', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
}

// =============================================================================
// Component
// =============================================================================

export default function ReviewCard({ card, onShowAnswer, isAnswerShown, onAnswer }: ReviewCardProps) {
  const [hasAnswered, setHasAnswered] = useState(false)

  const typeConfig = cardTypeConfig[card.card_type] || cardTypeConfig.flashcard

  // Parse the card back for interactive types
  const parsedBack = parseCardBack(card)

  // Handler for interactive components
  const handleInteractiveAnswer = (isCorrect: boolean) => {
    if (hasAnswered) return
    setHasAnswered(true)
    onAnswer?.(isCorrect)
    onShowAnswer()
  }

  // Render interactive multiple choice card
  if ((card.card_type === 'multiple_choice' || card.card_type === 'question') && isMultipleChoice(parsedBack)) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <MultipleChoice
          question={card.front}
          options={parsedBack.options}
          correctIndex={parsedBack.correctIndex}
          explanation={parsedBack.explanation}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Render interactive true/false card
  if (card.card_type === 'true_false' && isTrueFalse(parsedBack)) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <TrueFalse
          statement={card.front}
          correct={parsedBack.correct}
          explanation={parsedBack.explanation}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Render fill-in-the-blank card
  if (card.card_type === 'fill_blank' && isFillBlank(parsedBack)) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <FillBlank
          sentence={card.front}
          answer={parsedBack.answer}
          acceptableAnswers={parsedBack.acceptableAnswers}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Render matching card
  if (card.card_type === 'matching' && isMatching(parsedBack)) {
    return (
      <div className="w-full max-w-3xl mx-auto">
        <Matching
          terms={parsedBack.terms}
          definitions={parsedBack.definitions}
          correctPairs={parsedBack.correctPairs}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Render sequence card
  if (card.card_type === 'sequence' && isSequence(parsedBack)) {
    return (
      <div className="w-full max-w-2xl mx-auto">
        <Sequence
          instruction={card.front}
          items={parsedBack.items}
          correctOrder={parsedBack.correctOrder}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Render short answer card (self-graded)
  if (card.card_type === 'short_answer') {
    const modelAnswer = typeof parsedBack === 'string' ? parsedBack : card.back
    return (
      <div className="w-full max-w-2xl mx-auto">
        <ShortAnswer
          question={card.front}
          modelAnswer={modelAnswer}
          onAnswer={handleInteractiveAnswer}
        />
      </div>
    )
  }

  // Default: Flashcard-style reveal (for flashcard, formula, legacy types)
  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Card Container */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between">
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${typeConfig?.color || ''}`}>
            {typeConfig?.label || 'Card'}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Lesson {card.lesson_index + 1}
          </span>
        </div>

        {/* Card Content */}
        <div className="p-6 sm:p-8 min-h-[300px] flex flex-col">
          {/* Front Side (Question) */}
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <p className="text-xl sm:text-2xl font-medium text-gray-900 dark:text-white leading-relaxed">
                {card.front}
              </p>
            </div>
          </div>

          {/* Divider & Answer (when shown) */}
          {isAnswerShown && (
            <>
              <div className="my-6 flex items-center">
                <div className="flex-1 border-t border-gray-200 dark:border-gray-600" />
                <span className="px-4 text-sm text-gray-500 dark:text-gray-400">Answer</span>
                <div className="flex-1 border-t border-gray-200 dark:border-gray-600" />
              </div>

              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-lg sm:text-xl text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                    {formatAnswer(card.back, card.card_type)}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Show Answer Button */}
        {!isAnswerShown && (
          <div className="px-6 pb-6">
            <button
              onClick={onShowAnswer}
              className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-semibold rounded-xl transition-colors text-lg"
            >
              Show Answer
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// =============================================================================
// Helpers
// =============================================================================

function formatAnswer(back: string, cardType: CardType): React.ReactNode {
  // For formulas, try to parse and display nicely
  if (cardType === 'formula' && back.includes('**Formula:**')) {
    const parts = back.split('\n\n')
    return (
      <div className="space-y-4 text-left">
        {parts.map((part, i) => {
          if (part.startsWith('**Formula:**')) {
            const formula = part.replace('**Formula:**', '').trim()
            return (
              <div key={i} className="bg-gray-100 dark:bg-gray-700 rounded-lg p-4 font-mono text-lg">
                {formula}
              </div>
            )
          }
          if (part.startsWith('**Explanation:**')) {
            const explanation = part.replace('**Explanation:**', '').trim()
            return (
              <p key={i} className="text-gray-600 dark:text-gray-400">
                {explanation}
              </p>
            )
          }
          return <p key={i}>{part}</p>
        })}
      </div>
    )
  }

  return back
}
