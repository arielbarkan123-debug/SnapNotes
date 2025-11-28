'use client'

import type { Rating, ReviewCard } from '@/types'
import { RATING_LABELS } from '@/types'
import { getIntervalPreview } from '@/lib/srs'

// =============================================================================
// Types
// =============================================================================

interface RatingButtonsProps {
  card: ReviewCard
  onRate: (rating: Rating) => void
  isLoading?: boolean
  interactiveResult?: boolean | null // Result from interactive card (true=correct, false=incorrect, null=not interactive)
}

// =============================================================================
// Button Configurations
// =============================================================================

const ratingConfig: Record<Rating, { color: string; hoverColor: string; activeColor: string }> = {
  1: {
    color: 'bg-red-500',
    hoverColor: 'hover:bg-red-600',
    activeColor: 'active:bg-red-700',
  },
  2: {
    color: 'bg-orange-500',
    hoverColor: 'hover:bg-orange-600',
    activeColor: 'active:bg-orange-700',
  },
  3: {
    color: 'bg-green-500',
    hoverColor: 'hover:bg-green-600',
    activeColor: 'active:bg-green-700',
  },
  4: {
    color: 'bg-blue-500',
    hoverColor: 'hover:bg-blue-600',
    activeColor: 'active:bg-blue-700',
  },
}

// =============================================================================
// Component
// =============================================================================

export default function RatingButtons({ card, onRate, isLoading, interactiveResult }: RatingButtonsProps) {
  // Get interval previews for all ratings
  const intervals = getIntervalPreview(card)

  // For interactive cards that were answered, show simplified 2-button layout
  if (interactiveResult !== undefined && interactiveResult !== null) {
    // Correct: show Good/Easy options
    if (interactiveResult === true) {
      return (
        <div className="w-full max-w-2xl mx-auto">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => onRate(3)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center py-4 px-4 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium transition-colors disabled:opacity-50 min-h-[80px]"
            >
              <span className="text-base font-semibold">Good</span>
              <span className="text-sm opacity-90 mt-1">{intervals[3]}</span>
            </button>
            <button
              onClick={() => onRate(4)}
              disabled={isLoading}
              className="flex flex-col items-center justify-center py-4 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50 min-h-[80px]"
            >
              <span className="text-base font-semibold">Easy</span>
              <span className="text-sm opacity-90 mt-1">{intervals[4]}</span>
            </button>
          </div>
          <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
            How confident were you?
          </p>
        </div>
      )
    }

    // Incorrect: show Again/Hard options
    return (
      <div className="w-full max-w-2xl mx-auto">
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => onRate(1)}
            disabled={isLoading}
            className="flex flex-col items-center justify-center py-4 px-4 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium transition-colors disabled:opacity-50 min-h-[80px]"
          >
            <span className="text-base font-semibold">Again</span>
            <span className="text-sm opacity-90 mt-1">{intervals[1]}</span>
          </button>
          <button
            onClick={() => onRate(2)}
            disabled={isLoading}
            className="flex flex-col items-center justify-center py-4 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50 min-h-[80px]"
          >
            <span className="text-base font-semibold">Hard</span>
            <span className="text-sm opacity-90 mt-1">{intervals[2]}</span>
          </button>
        </div>
        <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
          Don't worry, you'll see this again soon
        </p>
      </div>
    )
  }

  // Default: show all 4 rating buttons (for flashcard types)
  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        {([1, 2, 3, 4] as Rating[]).map((rating) => {
          const config = ratingConfig[rating]
          const label = RATING_LABELS[rating]
          const interval = intervals[rating]

          return (
            <button
              key={rating}
              onClick={() => onRate(rating)}
              disabled={isLoading}
              className={`
                flex flex-col items-center justify-center py-3 sm:py-4 px-2 rounded-xl
                ${config.color} ${config.hoverColor} ${config.activeColor}
                text-white font-medium transition-colors
                disabled:opacity-50 disabled:cursor-not-allowed
                min-h-[72px] sm:min-h-[80px]
              `}
            >
              <span className="text-sm sm:text-base font-semibold">{label}</span>
              <span className="text-xs sm:text-sm opacity-90 mt-1">{interval}</span>
            </button>
          )
        })}
      </div>

      {/* Help text */}
      <p className="text-center text-xs text-gray-500 dark:text-gray-400 mt-3">
        Rate how well you knew the answer
      </p>
    </div>
  )
}

// =============================================================================
// Compact Version for smaller screens
// =============================================================================

export function RatingButtonsCompact({ card, onRate, isLoading }: RatingButtonsProps) {
  const intervals = getIntervalPreview(card)

  return (
    <div className="w-full">
      <div className="grid grid-cols-2 gap-2">
        {/* Again & Hard */}
        <button
          onClick={() => onRate(1)}
          disabled={isLoading}
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-red-500 hover:bg-red-600 active:bg-red-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          <span>Again</span>
          <span className="text-sm opacity-90">{intervals[1]}</span>
        </button>
        <button
          onClick={() => onRate(2)}
          disabled={isLoading}
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          <span>Hard</span>
          <span className="text-sm opacity-90">{intervals[2]}</span>
        </button>

        {/* Good & Easy */}
        <button
          onClick={() => onRate(3)}
          disabled={isLoading}
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-green-500 hover:bg-green-600 active:bg-green-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          <span>Good</span>
          <span className="text-sm opacity-90">{intervals[3]}</span>
        </button>
        <button
          onClick={() => onRate(4)}
          disabled={isLoading}
          className="flex items-center justify-between py-3 px-4 rounded-xl bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white font-medium transition-colors disabled:opacity-50"
        >
          <span>Easy</span>
          <span className="text-sm opacity-90">{intervals[4]}</span>
        </button>
      </div>
    </div>
  )
}
