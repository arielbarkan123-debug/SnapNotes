'use client'

import { useTranslations } from 'next-intl'
import type { MathVisual, MistakeExplanation } from '@/types'
import { NumberLine } from '@/components/math/NumberLine'
import { CoordinatePlane } from '@/components/math/CoordinatePlane'
import { Triangle } from '@/components/math/Triangle'
import { Circle } from '@/components/math/Circle'
import { UnitCircle } from '@/components/math/UnitCircle'
import { TreeDiagram } from '@/components/math/TreeDiagram'

interface MistakeVisualizerProps {
  /** The explanation for the mistake */
  explanation: MistakeExplanation
  /** Optional visual showing the wrong approach */
  wrongVisual?: MathVisual
  /** Optional visual showing the correct approach */
  correctVisual?: MathVisual
  /** Whether to show in compact mode (single visual) */
  compact?: boolean
  className?: string
}

/**
 * Renders a math visual based on its type
 */
function renderVisual(visual: MathVisual, width?: number, height?: number) {
  switch (visual.type) {
    case 'number_line':
      return <NumberLine data={visual.data} width={width || 350} height={height || 80} />
    case 'coordinate_plane':
      return <CoordinatePlane data={visual.data} width={width || 300} height={height || 300} />
    case 'triangle':
      return <Triangle data={visual.data} width={width || 250} height={height || 220} />
    case 'circle':
      return <Circle data={visual.data} width={width || 250} height={height || 250} />
    case 'unit_circle':
      return <UnitCircle data={visual.data} width={width || 300} height={height || 300} />
    case 'tree_diagram':
      return <TreeDiagram data={visual.data} width={width || 350} height={height || 280} />
    default:
      return null
  }
}

/**
 * MistakeVisualizer - Shows visual explanation of mistakes
 * Displays side-by-side comparison of wrong vs correct approaches
 */
export function MistakeVisualizer({
  explanation,
  wrongVisual,
  correctVisual,
  compact = false,
  className = '',
}: MistakeVisualizerProps) {
  const t = useTranslations('course.mistakes')

  // If we only have one visual (from explanation), show it in compact mode
  const singleVisual = explanation.visual || wrongVisual || correctVisual

  if (compact && singleVisual) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 ${className}`}>
        <div className="flex items-start gap-3">
          <span className="text-amber-600 dark:text-amber-400 text-lg">!</span>
          <div className="flex-1">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
              {explanation.description}
            </p>
            <div className="flex justify-center">
              {renderVisual(singleVisual)}
            </div>
            {explanation.tip && (
              <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 italic">
                {explanation.tip}
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // Side-by-side comparison mode
  if (wrongVisual && correctVisual) {
    return (
      <div className={`rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden ${className}`}>
        {/* Header */}
        <div className="bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
          <h4 className="text-sm font-medium text-gray-800 dark:text-gray-200 flex items-center gap-2">
            <span className="text-amber-500">!</span>
            {t('whereYouWentWrong')}
          </h4>
        </div>

        {/* Description */}
        <div className="px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {explanation.description}
          </p>
        </div>

        {/* Side-by-side visuals */}
        <div className="grid grid-cols-2 divide-x divide-gray-200 dark:divide-gray-700">
          {/* Wrong approach */}
          <div className="p-4 bg-red-50 dark:bg-red-900/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-red-500 text-lg">x</span>
              <span className="text-sm font-medium text-red-700 dark:text-red-400">
                {t('yourApproach')}
              </span>
            </div>
            <div className="flex justify-center">
              {renderVisual(wrongVisual, 200, 180)}
            </div>
          </div>

          {/* Correct approach */}
          <div className="p-4 bg-green-50 dark:bg-green-900/10">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-green-500 text-lg">&#10003;</span>
              <span className="text-sm font-medium text-green-700 dark:text-green-400">
                {t('correctApproach')}
              </span>
            </div>
            <div className="flex justify-center">
              {renderVisual(correctVisual, 200, 180)}
            </div>
          </div>
        </div>

        {/* Common mistake or tip */}
        {(explanation.commonMistake || explanation.tip) && (
          <div className="px-4 py-3 bg-amber-50 dark:bg-amber-900/20 border-t border-amber-200 dark:border-amber-800">
            <p className="text-xs text-amber-800 dark:text-amber-200">
              <span className="font-medium">{t('commonMistake')}: </span>
              {explanation.commonMistake || explanation.tip}
            </p>
          </div>
        )}
      </div>
    )
  }

  // Single visual with description
  if (singleVisual) {
    return (
      <div className={`rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 ${className}`}>
        {/* Header */}
        <div className="px-4 py-2 border-b border-amber-200 dark:border-amber-800">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 flex items-center gap-2">
            <span className="text-amber-500">!</span>
            {t('whereYouWentWrong')}
          </h4>
        </div>

        {/* Content */}
        <div className="p-4">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">
            {explanation.description}
          </p>
          <div className="flex justify-center bg-white dark:bg-gray-900 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
            {renderVisual(singleVisual)}
          </div>
          {explanation.tip && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-3 italic">
              {explanation.tip}
            </p>
          )}
        </div>
      </div>
    )
  }

  // Text-only explanation
  return (
    <div className={`rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20 p-4 ${className}`}>
      <div className="flex items-start gap-3">
        <span className="text-amber-600 dark:text-amber-400 text-lg mt-0.5">!</span>
        <div className="flex-1">
          <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200 mb-2">
            {t('whereYouWentWrong')}
          </h4>
          <p className="text-sm text-gray-700 dark:text-gray-300">
            {explanation.description}
          </p>
          {explanation.commonMistake && (
            <p className="text-xs text-amber-700 dark:text-amber-300 mt-3">
              <span className="font-medium">{t('commonMistake')}: </span>
              {explanation.commonMistake}
            </p>
          )}
          {explanation.tip && (
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
              {explanation.tip}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default MistakeVisualizer
