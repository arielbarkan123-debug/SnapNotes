'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SequenceDiagramData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SequenceDiagramProps {
  data: SequenceDiagramData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step labels
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  first_term: { en: 'First term', he: 'האיבר הראשון' },
  terms: { en: 'Show terms', he: 'הצגת האיברים' },
  pattern: { en: 'Show pattern', he: 'הצגת הדפוס' },
  formula: { en: 'Show formula', he: 'הצגת הנוסחה' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const COLORS_PALETTE = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e', '#06b6d4',
  '#ef4444', '#3b82f6', '#14b8a6', '#f97316',
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SequenceDiagram({
  data,
  className = '',
  width = 500,
  height = 220,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SequenceDiagramProps) {
  const { terms, firstTerm, commonDifferenceOrRatio, type, formula, showFormula, showDifferences, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'first_term', label: STEP_LABELS.first_term.en, labelHe: STEP_LABELS.first_term.he },
      { id: 'terms', label: STEP_LABELS.terms.en, labelHe: STEP_LABELS.terms.he },
      { id: 'pattern', label: STEP_LABELS.pattern.en, labelHe: STEP_LABELS.pattern.he },
    ]
    if (showFormula !== false && formula) {
      defs.push({ id: 'formula', label: STEP_LABELS.formula.en, labelHe: STEP_LABELS.formula.he })
    }
    return defs
  }, [showFormula, formula])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // SVG layout
  const padding = 30
  const termSpacing = Math.min(80, (width - 2 * padding) / Math.max(terms.length, 1))
  const circleR = 20
  const cy = height / 2
  const startX = padding + circleR

  // How many terms are visible based on step
  const visibleTermCount = isVisible('terms') ? terms.length : 1

  const patternLabel = type === 'arithmetic'
    ? (commonDifferenceOrRatio >= 0 ? `+${commonDifferenceOrRatio}` : `${commonDifferenceOrRatio}`)
    : `×${commonDifferenceOrRatio}`

  return (
    <div
      data-testid="sequence-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="seq-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* SVG Diagram */}
      <svg
        data-testid="seq-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0+: First term / all terms */}
        <AnimatePresence>
          {isVisible('first_term') && (
            <motion.g
              data-testid="seq-terms"
              initial="hidden"
              animate={isCurrent('first_term') || isCurrent('terms') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {terms.slice(0, visibleTermCount).map((term, i) => {
                const cx = startX + i * termSpacing
                const color = COLORS_PALETTE[i % COLORS_PALETTE.length]
                return (
                  <g key={i} data-testid={`seq-term-${i}`}>
                    {/* Circle */}
                    <circle
                      cx={cx}
                      cy={cy}
                      r={circleR}
                      fill="none"
                      stroke={i === 0 ? primaryColor : color}
                      strokeWidth={diagram.lineWeight}
                    />
                    {/* Term value */}
                    <text
                      x={cx}
                      y={cy + 1}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      fontSize={14}
                      fontWeight={600}
                      fill={i === 0 ? primaryColor : color}
                    >
                      {term}
                    </text>
                    {/* Index label */}
                    <text
                      x={cx}
                      y={cy + circleR + 16}
                      textAnchor="middle"
                      fontSize={11}
                      fill="#6b7280"
                    >
                      a{String.fromCharCode(8321 + i)}
                    </text>
                  </g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show pattern arrows between terms */}
        <AnimatePresence>
          {isVisible('pattern') && visibleTermCount > 1 && (
            <motion.g
              data-testid="seq-pattern"
              initial="hidden"
              animate={isCurrent('pattern') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {terms.slice(0, visibleTermCount - 1).map((_, i) => {
                const x1 = startX + i * termSpacing + circleR + 4
                const x2 = startX + (i + 1) * termSpacing - circleR - 4
                const arrowY = cy - circleR - 14
                return (
                  <g key={`arrow-${i}`} data-testid={`seq-arrow-${i}`}>
                    {/* Curved arrow */}
                    <path
                      d={`M ${x1} ${cy - circleR - 2} Q ${(x1 + x2) / 2} ${arrowY - 16} ${x2} ${cy - circleR - 2}`}
                      fill="none"
                      stroke={accentColor}
                      strokeWidth={diagram.lineWeight}
                      markerEnd="url(#seq-arrowhead)"
                    />
                    {/* Label */}
                    <text
                      x={(x1 + x2) / 2}
                      y={arrowY - 18}
                      textAnchor="middle"
                      fontSize={11}
                      fontWeight={600}
                      fill={accentColor}
                    >
                      {patternLabel}
                    </text>
                  </g>
                )
              })}
              {/* Arrowhead marker */}
              <defs>
                <marker
                  id="seq-arrowhead"
                  markerWidth="8"
                  markerHeight="6"
                  refX="8"
                  refY="3"
                  orient="auto"
                >
                  <polygon points="0 0, 8 3, 0 6" fill={accentColor} />
                </marker>
              </defs>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show formula */}
        <AnimatePresence>
          {isVisible('formula') && formula && (
            <motion.g
              data-testid="seq-formula"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 10}
                textAnchor="middle"
                fontSize={14}
                fontWeight={600}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {formula}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

      {/* Type label */}
      {(showDifferences !== false) && (
        <div
          data-testid="seq-type-label"
          className="text-center text-sm text-gray-500 dark:text-gray-400 mt-1"
        >
          {type === 'arithmetic'
            ? (language === 'he' ? 'סדרה חשבונית' : 'Arithmetic Sequence')
            : (language === 'he' ? 'סדרה הנדסית' : 'Geometric Sequence')
          }
          {' · '}
          {type === 'arithmetic'
            ? `d = ${commonDifferenceOrRatio}`
            : `r = ${commonDifferenceOrRatio}`
          }
        </div>
      )}

      {/* Step Controls */}
      {stepDefs.length > 1 && (
        <DiagramStepControls
          currentStep={diagram.currentStep}
          totalSteps={diagram.totalSteps}
          onNext={diagram.next}
          onPrev={diagram.prev}
          stepLabel={stepLabel}
          language={language}
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default SequenceDiagram
