'use client'

import { useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ParameterSliderGroup } from './ParameterSlider'
import type {
  WhatIfModeProps,
  CalculationResult,
  ExplorationSuggestion,
  ParameterDefinition,
} from '@/types/interactivity'

// =============================================================================
// Subject Colors
// =============================================================================

const SUBJECT_COLORS = {
  physics: {
    primary: '#3b82f6',    // blue
    secondary: '#60a5fa',
    background: 'bg-blue-50 dark:bg-blue-900/20',
    border: 'border-blue-200 dark:border-blue-800',
    accent: 'text-blue-600 dark:text-blue-400',
  },
  math: {
    primary: '#8b5cf6',    // purple
    secondary: '#a78bfa',
    background: 'bg-purple-50 dark:bg-purple-900/20',
    border: 'border-purple-200 dark:border-purple-800',
    accent: 'text-purple-600 dark:text-purple-400',
  },
  chemistry: {
    primary: '#10b981',    // green
    secondary: '#34d399',
    background: 'bg-emerald-50 dark:bg-emerald-900/20',
    border: 'border-emerald-200 dark:border-emerald-800',
    accent: 'text-emerald-600 dark:text-emerald-400',
  },
  biology: {
    primary: '#f59e0b',    // amber
    secondary: '#fbbf24',
    background: 'bg-amber-50 dark:bg-amber-900/20',
    border: 'border-amber-200 dark:border-amber-800',
    accent: 'text-amber-600 dark:text-amber-400',
  },
  geometry: {
    primary: '#ec4899',    // pink
    secondary: '#f472b6',
    background: 'bg-pink-50 dark:bg-pink-900/20',
    border: 'border-pink-200 dark:border-pink-800',
    accent: 'text-pink-600 dark:text-pink-400',
  },
}

// =============================================================================
// i18n Labels
// =============================================================================

const LABELS = {
  en: {
    title: 'What If?',
    subtitle: 'Adjust parameters to explore',
    parameters: 'Parameters',
    results: 'Results',
    suggestions: 'Try These',
    reset: 'Reset',
    expand: 'Expand',
    collapse: 'Collapse',
  },
  he: {
    title: 'מה אם?',
    subtitle: 'התאם פרמטרים לחקירה',
    parameters: 'פרמטרים',
    results: 'תוצאות',
    suggestions: 'נסה את אלה',
    reset: 'איפוס',
    expand: 'הרחב',
    collapse: 'צמצם',
  },
}

// =============================================================================
// Sub-components
// =============================================================================

interface ResultDisplayProps {
  result: CalculationResult
  subject: keyof typeof SUBJECT_COLORS
  language: 'en' | 'he'
}

function ResultDisplay({ result, subject, language }: ResultDisplayProps) {
  const colors = SUBJECT_COLORS[subject]
  const label = language === 'he' && result.labelHe ? result.labelHe : result.label

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center justify-between p-2 rounded-lg
        ${result.isPrimary ? colors.background : 'bg-gray-50 dark:bg-gray-800/50'}
        ${result.isPrimary ? colors.border : 'border-gray-200 dark:border-gray-700'}
        border
      `}
    >
      <span className="text-sm text-gray-700 dark:text-gray-300">
        {label}
      </span>
      <span className={`
        font-mono font-semibold
        ${result.isPrimary ? colors.accent : 'text-gray-900 dark:text-gray-100'}
      `}>
        {result.formatted}
      </span>
    </motion.div>
  )
}

interface SuggestionChipProps {
  suggestion: ExplorationSuggestion
  onClick: () => void
  subject: keyof typeof SUBJECT_COLORS
  language: 'en' | 'he'
}

function SuggestionChip({ suggestion, onClick, subject, language }: SuggestionChipProps) {
  const colors = SUBJECT_COLORS[subject]
  const question = language === 'he' && suggestion.questionHe
    ? suggestion.questionHe
    : suggestion.question

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={`
        flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-left w-full
        transition-colors duration-200
        ${colors.background} ${colors.border} border
        hover:bg-opacity-80 dark:hover:bg-opacity-80
      `}
    >
      <span className={colors.accent}>
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
        </svg>
      </span>
      <span className="text-gray-700 dark:text-gray-300 flex-1">
        {question}
      </span>
    </motion.button>
  )
}

// =============================================================================
// Main Component
// =============================================================================

/**
 * WhatIfMode - Interactive panel for "What If?" exploration
 *
 * Features:
 * - Parameter sliders grouped by category
 * - Real-time calculation results
 * - Exploration suggestions ("What if the angle was steeper?")
 * - Collapsible panel
 * - Reset to defaults
 * - Subject-based theming
 * - RTL support
 */
export function WhatIfMode({
  parameters,
  values,
  onParameterChange,
  onParametersChange,
  results,
  suggestions,
  language = 'en',
  subject = 'physics',
  expanded = true,
  onToggleExpanded,
  onReset,
  className = '',
}: WhatIfModeProps) {
  const isRTL = language === 'he'
  const colors = SUBJECT_COLORS[subject]
  const labels = LABELS[language]

  // Group parameters by category
  const parametersByCategory = useMemo(() => {
    const groups: Record<string, ParameterDefinition[]> = {}

    parameters.forEach((param) => {
      const category = param.category || 'other'
      if (!groups[category]) {
        groups[category] = []
      }
      groups[category].push(param)
    })

    return groups
  }, [parameters])

  // Get primary result (if any)
  const primaryResult = useMemo(() => {
    return results.find((r) => r.isPrimary)
  }, [results])

  // Handle suggestion click
  const handleSuggestionClick = useCallback((suggestion: ExplorationSuggestion) => {
    onParametersChange(suggestion.parameterChanges)
  }, [onParametersChange])

  // Handle reset
  const handleReset = useCallback(() => {
    const defaults: Record<string, number> = {}
    parameters.forEach((p) => {
      defaults[p.name] = p.default
    })
    onParametersChange(defaults)
    onReset?.()
  }, [parameters, onParametersChange, onReset])

  return (
    <div
      className={`
        rounded-xl border shadow-sm overflow-hidden
        ${colors.border}
        bg-white dark:bg-gray-900
        ${className}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
      data-testid="what-if-mode"
    >
      {/* Header */}
      <div
        className={`
          flex items-center justify-between px-4 py-3
          ${colors.background}
          border-b ${colors.border}
        `}
      >
        <div className="flex items-center gap-3">
          {/* What If icon */}
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center
            bg-white dark:bg-gray-800
            ${colors.border} border
          `}>
            <svg
              className={`w-5 h-5 ${colors.accent}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>

          <div>
            <h3 className={`font-semibold ${colors.accent}`}>
              {labels.title}
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {labels.subtitle}
            </p>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          {/* Reset button */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleReset}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            aria-label={labels.reset}
            title={labels.reset}
            data-testid="reset-button"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </motion.button>

          {/* Expand/Collapse button */}
          {onToggleExpanded && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={onToggleExpanded}
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              aria-label={expanded ? labels.collapse : labels.expand}
              title={expanded ? labels.collapse : labels.expand}
              data-testid="toggle-button"
            >
              <svg
                className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </motion.button>
          )}
        </div>
      </div>

      {/* Primary result (always visible) */}
      {primaryResult && (
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-800">
          <ResultDisplay
            result={primaryResult}
            subject={subject}
            language={language}
          />
        </div>
      )}

      {/* Expandable content */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <div className="px-4 py-4 space-y-4">
              {/* Parameters */}
              {Object.keys(parametersByCategory).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {labels.parameters}
                  </h4>
                  {Object.entries(parametersByCategory).map(([category, params]) => (
                    <ParameterSliderGroup
                      key={category}
                      parameters={params}
                      values={values}
                      onChange={onParameterChange}
                      compact
                      language={language}
                      className="mb-3"
                    />
                  ))}
                </div>
              )}

              {/* Results (excluding primary which is shown above) */}
              {results.filter((r) => !r.isPrimary).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {labels.results}
                  </h4>
                  <div className="space-y-2">
                    {results
                      .filter((r) => !r.isPrimary)
                      .map((result, index) => (
                        <ResultDisplay
                          key={result.label + index}
                          result={result}
                          subject={subject}
                          language={language}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              {suggestions && suggestions.length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {labels.suggestions}
                  </h4>
                  <div className="space-y-2">
                    {suggestions.map((suggestion) => (
                      <SuggestionChip
                        key={suggestion.id}
                        suggestion={suggestion}
                        onClick={() => handleSuggestionClick(suggestion)}
                        subject={subject}
                        language={language}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// =============================================================================
// Export
// =============================================================================

export { SUBJECT_COLORS }
export default WhatIfMode
