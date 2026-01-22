'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, Check, BarChart3 } from 'lucide-react'
import { type MathSolution, type MathStep, type MathVisual, type StructuredWorkedSolution } from '@/types'
import { MathRenderer, MathText } from '@/components/ui/MathRenderer'
import { useTranslations } from 'next-intl'
import {
  NumberLine,
  CoordinatePlane,
  Triangle,
  Circle,
  UnitCircle,
  MathTable,
  TreeDiagram,
} from '@/components/math'

interface MathSolutionRendererProps {
  solution: StructuredWorkedSolution
  className?: string
}

/**
 * Renders a structured math solution with step-by-step LaTeX rendering
 * Supports multiple solving methods with collapsible alternative methods
 */
export function MathSolutionRenderer({ solution, className = '' }: MathSolutionRendererProps) {
  // If not math, render text explanation
  if (solution.subject !== 'math' || !solution.methods?.length) {
    return (
      <div className={`prose dark:prose-invert max-w-none ${className}`}>
        <MathText>{solution.textExplanation || ''}</MathText>
      </div>
    )
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {solution.methods.map((method, index) => (
        <MathMethodRenderer
          key={index}
          method={method}
          isAlternative={index > 0}
          methodNumber={index + 1}
        />
      ))}
    </div>
  )
}

interface MathMethodRendererProps {
  method: MathSolution
  isAlternative?: boolean
  methodNumber: number
}

function MathMethodRenderer({ method, isAlternative = false, methodNumber }: MathMethodRendererProps) {
  const [expanded, setExpanded] = useState(!isAlternative)
  const t = useTranslations('deepPractice.math')

  return (
    <div className={`border rounded-lg overflow-hidden ${
      isAlternative
        ? 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700'
        : 'bg-white dark:bg-gray-800 border-blue-200 dark:border-blue-800'
    }`}>
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 p-4 text-start transition-colors ${
          isAlternative
            ? 'hover:bg-gray-100 dark:hover:bg-gray-700/50'
            : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
        }`}
      >
        {expanded ? (
          <ChevronDown className="h-5 w-5 flex-shrink-0 text-gray-500" />
        ) : (
          <ChevronRight className="h-5 w-5 flex-shrink-0 text-gray-500" />
        )}
        <span className={`font-semibold text-lg ${
          isAlternative ? 'text-gray-600 dark:text-gray-300' : 'text-blue-700 dark:text-blue-300'
        }`}>
          {t('method')} {methodNumber}: {method.method}
        </span>
        {isAlternative && !expanded && (
          <span className="text-sm text-gray-500 dark:text-gray-400 mr-auto">
            ({t('alternativeMethod')})
          </span>
        )}
      </button>

      {/* Content */}
      {expanded && (
        <div className="p-4 space-y-4">
          {/* Coefficients Box */}
          {method.coefficients && Object.keys(method.coefficients).length > 0 && (
            <div className="flex flex-wrap gap-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-100 dark:border-blue-800">
              {Object.entries(method.coefficients).map(([key, val]) => (
                <span key={key} className="font-mono text-lg">
                  <MathRenderer math={`${key} = ${val}`} />
                </span>
              ))}
            </div>
          )}

          {/* Steps */}
          <div className="space-y-4">
            {method.steps.map((step) => (
              <MathStepRenderer key={step.stepNumber} step={step} />
            ))}
          </div>

          {/* Final Answer */}
          <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg border-2 border-green-500 dark:border-green-600">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <span className="font-semibold text-green-700 dark:text-green-300">
                {t('answer')}:
              </span>
              <span className="text-lg">
                <MathRenderer math={method.finalAnswer} />
              </span>
            </div>
          </div>

          {/* Verification (optional) */}
          {method.verification && (
            <div className="mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded text-sm text-gray-600 dark:text-gray-400">
              <span className="font-medium">Verification: </span>
              <MathText>{method.verification}</MathText>
            </div>
          )}

          {/* Visual representation (optional) */}
          {method.visual && (
            <MathVisualRenderer visual={method.visual} />
          )}
        </div>
      )}
    </div>
  )
}

interface MathVisualRendererProps {
  visual: MathVisual
}

/**
 * Renders the appropriate visual component based on type
 */
function MathVisualRenderer({ visual }: MathVisualRendererProps) {
  const t = useTranslations('deepPractice.math')
  const [showVisual, setShowVisual] = useState(true)

  return (
    <div className="mt-4">
      {/* Visual toggle header */}
      <button
        onClick={() => setShowVisual(!showVisual)}
        className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mb-2"
      >
        <BarChart3 className="h-4 w-4" />
        <span>{showVisual ? t('hideVisual') : t('showVisual')}</span>
        {showVisual ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </button>

      {/* Visual content */}
      {showVisual && (
        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg border border-gray-200 dark:border-gray-700 overflow-x-auto">
          {visual.type === 'number_line' && (
            <NumberLine data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'coordinate_plane' && (
            <CoordinatePlane data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'triangle' && (
            <Triangle data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'circle' && (
            <Circle data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'unit_circle' && (
            <UnitCircle data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'table' && (
            <MathTable data={visual.data} className="mx-auto" />
          )}
          {visual.type === 'tree_diagram' && (
            <TreeDiagram data={visual.data} className="mx-auto" />
          )}
        </div>
      )}
    </div>
  )
}

interface MathStepRendererProps {
  step: MathStep
}

function MathStepRenderer({ step }: MathStepRendererProps) {
  return (
    <div className="flex gap-3 items-start">
      {/* Step Number Circle */}
      <span className="flex-shrink-0 w-7 h-7 rounded-full bg-blue-500 dark:bg-blue-600 text-white flex items-center justify-center text-sm font-medium">
        {step.stepNumber}
      </span>

      {/* Step Content */}
      <div className="flex-1 min-w-0">
        {/* Action description */}
        <p className="font-medium text-gray-800 dark:text-gray-200">{step.action}</p>

        {/* Formula (if present) */}
        {step.formula && (
          <div className="my-2 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-x-auto">
            <MathRenderer math={step.formula} block />
          </div>
        )}

        {/* Substitution (if present) */}
        {step.substitution && (
          <div className="my-2 overflow-x-auto">
            <MathRenderer math={step.substitution} block />
          </div>
        )}

        {/* Result (if present) */}
        {step.result && (
          <div className="my-2 text-blue-600 dark:text-blue-400 font-medium overflow-x-auto">
            <MathRenderer math={step.result} />
          </div>
        )}

        {/* Explanation (if present) */}
        {step.explanation && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            {step.explanation}
          </p>
        )}
      </div>
    </div>
  )
}

/**
 * Helper to check if a solution is a structured math solution
 */
export function isStructuredMathSolution(
  solution: unknown
): solution is StructuredWorkedSolution {
  if (!solution || typeof solution !== 'object') return false
  const s = solution as Record<string, unknown>
  return s.subject === 'math' && Array.isArray(s.methods)
}

/**
 * Helper to check if a solution has text explanation
 */
export function isTextSolution(
  solution: unknown
): solution is StructuredWorkedSolution {
  if (!solution || typeof solution !== 'object') return false
  const s = solution as Record<string, unknown>
  return s.subject === 'other' && typeof s.textExplanation === 'string'
}
