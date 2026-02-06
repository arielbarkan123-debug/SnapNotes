'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RatioTableData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RatioTableProps {
  data: RatioTableData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  showStepCounter?: boolean
  animationDuration?: number
  onStepComplete?: () => void
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RatioTable({
  data,
  className = '',
  width = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RatioTableProps) {
  const { columns, highlightRow, highlightColumn, showEquivalence, title } = data

  const numRows = columns.length > 0 ? columns[0].values.length : 0

  // Build step definitions: header + one step per column of values
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'headers', label: 'Show headers', labelHe: 'הצגת כותרות' },
    ]
    columns.forEach((col, i) => {
      defs.push({
        id: `col-${i}`,
        label: `Fill column: ${col.header}`,
        labelHe: `מילוי עמודה: ${col.header}`,
      })
    })
    if (showEquivalence) {
      defs.push({ id: 'equivalence', label: 'Show patterns', labelHe: 'הצגת דפוסים' })
    }
    return defs
  }, [columns, showEquivalence])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
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

  // Determine which columns are visible
  const visibleColumnCount = columns.reduce((count, _, i) => {
    return count + (isVisible(`col-${i}`) ? 1 : 0)
  }, 0)

  return (
    <div
      data-testid="ratio-table"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="rt-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <div className="overflow-x-auto">
        <table
          data-testid="rt-table"
          className="w-full border-collapse text-center"
        >
          {/* Step 0: Headers */}
          <AnimatePresence>
            {isVisible('headers') && (
              <motion.thead
                data-testid="rt-headers"
                initial="hidden"
                animate={isCurrent('headers') ? 'spotlight' : 'visible'}
                variants={spotlight}
              >
                <tr>
                  {columns.map((col, i) => (
                    <motion.th
                      key={`header-${i}`}
                      className="px-4 py-2 text-sm font-semibold border border-gray-200 dark:border-gray-700"
                      style={{
                        backgroundColor:
                          highlightColumn === i ? `${primaryColor}20` : `${primaryColor}10`,
                        color: primaryColor,
                      }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {col.header}
                    </motion.th>
                  ))}
                </tr>
              </motion.thead>
            )}
          </AnimatePresence>

          <tbody>
            {Array.from({ length: numRows }, (_, rowIdx) => (
              <tr
                key={`row-${rowIdx}`}
                className={
                  highlightRow === rowIdx
                    ? 'bg-yellow-50 dark:bg-yellow-900/20'
                    : ''
                }
              >
                {columns.map((col, colIdx) => {
                  const colVisible = isVisible(`col-${colIdx}`)
                  const colCurrent = isCurrent(`col-${colIdx}`)
                  const isHighlightedCell =
                    highlightRow === rowIdx || highlightColumn === colIdx

                  return (
                    <AnimatePresence key={`cell-${rowIdx}-${colIdx}`}>
                      {colVisible ? (
                        <motion.td
                          data-testid={`rt-cell-${rowIdx}-${colIdx}`}
                          className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 font-medium"
                          style={{
                            color: isHighlightedCell ? primaryColor : undefined,
                            fontWeight: isHighlightedCell ? 700 : 500,
                            backgroundColor:
                              highlightColumn === colIdx
                                ? `${primaryColor}08`
                                : undefined,
                          }}
                          initial="hidden"
                          animate={colCurrent ? 'spotlight' : 'visible'}
                          variants={spotlight}
                        >
                          {col.values[rowIdx]}
                        </motion.td>
                      ) : (
                        <td
                          key={`empty-${rowIdx}-${colIdx}`}
                          className="px-4 py-2 text-sm border border-gray-200 dark:border-gray-700 text-gray-300 dark:text-gray-600"
                        >
                          ?
                        </td>
                      )}
                    </AnimatePresence>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Equivalence pattern indicators */}
      <AnimatePresence>
        {showEquivalence && isVisible('equivalence') && numRows >= 2 && (
          <motion.div
            data-testid="rt-equivalence"
            className="mt-2 flex items-center justify-center gap-2 text-sm"
            style={{ color: accentColor }}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            <span className="font-medium">
              {language === 'he' ? 'יחסים שווים' : 'Equivalent ratios'}
            </span>
            {columns.length >= 2 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({columns.map((c) => c.header).join(' : ')})
              </span>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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

export default RatioTable
