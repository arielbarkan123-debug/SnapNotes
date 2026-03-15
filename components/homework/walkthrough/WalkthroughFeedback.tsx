'use client'

import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createLogger } from '@/lib/logger'

const log = createLogger('ui:walkthrough-feedback')

interface WalkthroughFeedbackProps {
  sessionId: string
  walkthroughId: string
  isHe: boolean
}

/**
 * Thumbs up / thumbs down + optional text feedback widget.
 * Appears at the bottom of the walkthrough after the last step.
 * Calls PATCH /api/homework/sessions/[sessionId]/walkthrough
 */
export default function WalkthroughFeedback({
  sessionId,
  walkthroughId,
  isHe,
}: WalkthroughFeedbackProps) {
  const [rating, setRating] = useState<1 | 5 | null>(null)
  const [feedbackText, setFeedbackText] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [showTextInput, setShowTextInput] = useState(false)

  const submitFeedback = useCallback(
    async (selectedRating: 1 | 5, text?: string) => {
      setSubmitting(true)
      try {
        const res = await fetch(
          `/api/homework/sessions/${sessionId}/walkthrough`,
          {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              walkthroughId,
              user_rating: selectedRating,
              user_feedback: text || undefined,
            }),
          }
        )
        if (res.ok) {
          setSubmitted(true)
        }
      } catch (err) {
        log.warn({ err }, 'Submit failed')
      } finally {
        setSubmitting(false)
      }
    },
    [sessionId, walkthroughId]
  )

  const handleRating = useCallback(
    (value: 1 | 5) => {
      setRating(value)
      if (value === 5) {
        // Thumbs up — submit immediately
        submitFeedback(value)
      } else {
        // Thumbs down — show text input for details
        setShowTextInput(true)
      }
    },
    [submitFeedback]
  )

  const handleSubmitWithText = useCallback(() => {
    if (rating) {
      submitFeedback(rating, feedbackText.trim() || undefined)
    }
  }, [rating, feedbackText, submitFeedback])

  // Already submitted — show thank you
  if (submitted) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        className="px-4 pb-4"
      >
        <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-50/60 dark:bg-violet-900/15 border border-violet-200/40 dark:border-violet-800/30">
          <svg className="w-4 h-4 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
          <span className="text-sm text-violet-600 dark:text-violet-400 font-medium">
            {isHe ? 'תודה על המשוב!' : 'Thanks for your feedback!'}
          </span>
        </div>
      </motion.div>
    )
  }

  return (
    <div className="px-4 pb-4">
      <div className="rounded-xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-200/60 dark:border-gray-700/40 p-3">
        {/* Question + buttons */}
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {isHe ? 'האם ההדרכה הייתה מועילה?' : 'Was this walkthrough helpful?'}
          </p>
          <div className="flex items-center gap-2">
            {/* Thumbs Up */}
            <button
              onClick={() => handleRating(5)}
              disabled={submitting || rating !== null}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${rating === 5
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border border-green-300 dark:border-green-700'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 dark:hover:text-green-400 hover:border-green-200 dark:hover:border-green-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={isHe ? 'אהבתי' : 'Thumbs up'}
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
            </button>

            {/* Thumbs Down */}
            <button
              onClick={() => handleRating(1)}
              disabled={submitting || rating !== null}
              className={`
                flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all
                ${rating === 1
                  ? 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 border border-red-300 dark:border-red-700'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400 hover:border-red-200 dark:hover:border-red-700'
                }
                disabled:opacity-50 disabled:cursor-not-allowed
              `}
              aria-label={isHe ? 'לא אהבתי' : 'Thumbs down'}
            >
              <svg className="w-4 h-4 rotate-180" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3H14z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
              </svg>
            </button>
          </div>
        </div>

        {/* Expanded text input on thumbs down */}
        <AnimatePresence>
          {showTextInput && !submitted && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="mt-3 space-y-2">
                <textarea
                  value={feedbackText}
                  onChange={(e) => setFeedbackText(e.target.value)}
                  placeholder={isHe ? 'מה היה לא בסדר? (אופציונלי)' : 'What went wrong? (optional)'}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-400 dark:focus:border-violet-500"
                  rows={2}
                  maxLength={500}
                />
                <div className="flex justify-end">
                  <button
                    onClick={handleSubmitWithText}
                    disabled={submitting}
                    className="px-4 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
                  >
                    {submitting
                      ? (isHe ? 'שולח...' : 'Sending...')
                      : (isHe ? 'שלח משוב' : 'Submit')}
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
