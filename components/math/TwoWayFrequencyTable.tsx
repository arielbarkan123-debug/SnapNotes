'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TwoWayFrequencyTableData } from '@/types/math'
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

interface TwoWayFrequencyTableProps {
  data: TwoWayFrequencyTableData
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
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  headers: { en: 'Show headers', he: 'הצגת כותרות' },
  data: { en: 'Fill data cells', he: 'מילוי תאי נתונים' },
  marginals: { en: 'Show marginal frequencies', he: 'הצגת שכיחויות שוליות' },
  highlight: { en: 'Highlight cell', he: 'הדגשת תא' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CELL_HEIGHT = 36
const HEADER_HEIGHT = 40
const ROW_LABEL_WIDTH = 100
const COL_WIDTH = 80
const MARGINAL_BG = '#f0f9ff'

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TwoWayFrequencyTable({
  data,
  className = '',
  width = 500,
  height: _height,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TwoWayFrequencyTableProps) {
  const { rowHeaders, columnHeaders, data: tableData, rowLabel, columnLabel, showMarginals, highlightCell, title } = data

  const numRows = rowHeaders.length
  const numCols = columnHeaders.length

  // Compute marginal sums
  const rowTotals = useMemo(
    () => tableData.map((row) => row.reduce((s, v) => s + v, 0)),
    [tableData]
  )
  const colTotals = useMemo(() => {
    const totals: number[] = new Array(numCols).fill(0)
    for (const row of tableData) {
      for (let c = 0; c < numCols; c++) {
        totals[c] += row[c] ?? 0
      }
    }
    return totals
  }, [tableData, numCols])
  const grandTotal = useMemo(() => rowTotals.reduce((s, v) => s + v, 0), [rowTotals])

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'headers', label: STEP_LABELS.headers.en, labelHe: STEP_LABELS.headers.he },
      { id: 'data', label: STEP_LABELS.data.en, labelHe: STEP_LABELS.data.he },
    ]
    if (showMarginals) {
      defs.push({ id: 'marginals', label: STEP_LABELS.marginals.en, labelHe: STEP_LABELS.marginals.he })
    }
    if (highlightCell) {
      defs.push({ id: 'highlight', label: STEP_LABELS.highlight.en, labelHe: STEP_LABELS.highlight.he })
    }
    return defs
  }, [showMarginals, highlightCell])

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

  const primaryColor = diagram.colors.primary
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Table dimensions
  const hasMarginals = showMarginals && isVisible('marginals')
  const totalCols = numCols + (hasMarginals ? 1 : 0)
  const totalRows = numRows + (hasMarginals ? 1 : 0)
  const tableWidth = ROW_LABEL_WIDTH + totalCols * COL_WIDTH
  const tableHeight = HEADER_HEIGHT * 2 + totalRows * CELL_HEIGHT
  const svgWidth = Math.max(width, tableWidth + 20)
  const svgHeight = tableHeight + 20
  const offsetX = (svgWidth - tableWidth) / 2
  const offsetY = 10

  return (
    <div
      data-testid="two-way-frequency-table"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: svgWidth }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="twft-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        role="img"
        aria-label={`Two-way frequency table: ${rowLabel} vs ${columnLabel}`}
      >
        {/* Background */}
        <rect
          data-testid="twft-background"
          x={0}
          y={0}
          width={svgWidth}
          height={svgHeight}
          fill="white"
          className="dark:fill-gray-900"
        />

        {/* Step 0: Headers */}
        <AnimatePresence>
          {isVisible('headers') && (
            <motion.g
              data-testid="twft-headers"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Top-left corner: row label / column label */}
              <rect
                x={offsetX}
                y={offsetY}
                width={ROW_LABEL_WIDTH}
                height={HEADER_HEIGHT * 2}
                fill={primaryColor}
                opacity={0.15}
                rx={4}
              />
              <text
                x={offsetX + ROW_LABEL_WIDTH / 2}
                y={offsetY + HEADER_HEIGHT - 4}
                textAnchor="middle"
                fontSize={11}
                fill={primaryColor}
                fontWeight={600}
              >
                {rowLabel}
              </text>
              <text
                x={offsetX + ROW_LABEL_WIDTH / 2}
                y={offsetY + HEADER_HEIGHT + HEADER_HEIGHT / 2 + 4}
                textAnchor="middle"
                fontSize={11}
                fill="#6b7280"
                fontWeight={500}
              >
                {columnLabel}
              </text>

              {/* Column headers */}
              {columnHeaders.map((ch, c) => (
                <g key={`ch-${c}`}>
                  <rect
                    x={offsetX + ROW_LABEL_WIDTH + c * COL_WIDTH}
                    y={offsetY}
                    width={COL_WIDTH}
                    height={HEADER_HEIGHT * 2}
                    fill={primaryColor}
                    opacity={0.1}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={offsetX + ROW_LABEL_WIDTH + c * COL_WIDTH + COL_WIDTH / 2}
                    y={offsetY + HEADER_HEIGHT + 4}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-gray-700 dark:fill-gray-300"
                    fontWeight={600}
                  >
                    {ch}
                  </text>
                </g>
              ))}

              {/* Marginal total column header */}
              {hasMarginals && (
                <g>
                  <rect
                    x={offsetX + ROW_LABEL_WIDTH + numCols * COL_WIDTH}
                    y={offsetY}
                    width={COL_WIDTH}
                    height={HEADER_HEIGHT * 2}
                    fill={MARGINAL_BG}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={offsetX + ROW_LABEL_WIDTH + numCols * COL_WIDTH + COL_WIDTH / 2}
                    y={offsetY + HEADER_HEIGHT + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill={primaryColor}
                    fontWeight={700}
                  >
                    {language === 'he' ? 'סה"כ' : 'Total'}
                  </text>
                </g>
              )}

              {/* Row headers */}
              {rowHeaders.map((rh, r) => (
                <g key={`rh-${r}`}>
                  <rect
                    x={offsetX}
                    y={offsetY + HEADER_HEIGHT * 2 + r * CELL_HEIGHT}
                    width={ROW_LABEL_WIDTH}
                    height={CELL_HEIGHT}
                    fill={r % 2 === 0 ? '#f9fafb' : 'white'}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={offsetX + ROW_LABEL_WIDTH / 2}
                    y={offsetY + HEADER_HEIGHT * 2 + r * CELL_HEIGHT + CELL_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    fontSize={12}
                    className="fill-gray-700 dark:fill-gray-300"
                    fontWeight={600}
                  >
                    {rh}
                  </text>
                </g>
              ))}

              {/* Marginal total row header */}
              {hasMarginals && (
                <g>
                  <rect
                    x={offsetX}
                    y={offsetY + HEADER_HEIGHT * 2 + numRows * CELL_HEIGHT}
                    width={ROW_LABEL_WIDTH}
                    height={CELL_HEIGHT}
                    fill={MARGINAL_BG}
                    stroke="#e5e7eb"
                    strokeWidth={1}
                  />
                  <text
                    x={offsetX + ROW_LABEL_WIDTH / 2}
                    y={offsetY + HEADER_HEIGHT * 2 + numRows * CELL_HEIGHT + CELL_HEIGHT / 2 + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fill={primaryColor}
                    fontWeight={700}
                  >
                    {language === 'he' ? 'סה"כ' : 'Total'}
                  </text>
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Data cells */}
        <AnimatePresence>
          {isVisible('data') && (
            <motion.g
              data-testid="twft-data"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {tableData.map((row, r) =>
                row.map((val, c) => {
                  const cellX = offsetX + ROW_LABEL_WIDTH + c * COL_WIDTH
                  const cellY = offsetY + HEADER_HEIGHT * 2 + r * CELL_HEIGHT
                  const isHighlighted = highlightCell && isVisible('highlight') && highlightCell[0] === r && highlightCell[1] === c
                  return (
                    <g key={`cell-${r}-${c}`}>
                      <rect
                        data-testid={`twft-cell-${r}-${c}`}
                        x={cellX}
                        y={cellY}
                        width={COL_WIDTH}
                        height={CELL_HEIGHT}
                        fill={isHighlighted ? `${primaryColor}22` : r % 2 === 0 ? '#f9fafb' : 'white'}
                        stroke={isHighlighted ? primaryColor : '#e5e7eb'}
                        strokeWidth={isHighlighted ? 2 : 1}
                      />
                      <motion.text
                        x={cellX + COL_WIDTH / 2}
                        y={cellY + CELL_HEIGHT / 2 + 4}
                        textAnchor="middle"
                        fontSize={13}
                        fill={isHighlighted ? primaryColor : undefined}
                        className={isHighlighted ? undefined : 'fill-gray-700 dark:fill-gray-300'}
                        fontWeight={isHighlighted ? 700 : 500}
                        variants={labelAppearVariants}
                      >
                        {val}
                      </motion.text>
                    </g>
                  )
                })
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Marginal frequencies */}
        <AnimatePresence>
          {hasMarginals && (
            <motion.g
              data-testid="twft-marginals"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {/* Row totals */}
              {rowTotals.map((total, r) => {
                const cellX = offsetX + ROW_LABEL_WIDTH + numCols * COL_WIDTH
                const cellY = offsetY + HEADER_HEIGHT * 2 + r * CELL_HEIGHT
                return (
                  <g key={`rt-${r}`}>
                    <rect x={cellX} y={cellY} width={COL_WIDTH} height={CELL_HEIGHT} fill={MARGINAL_BG} stroke="#e5e7eb" strokeWidth={1} />
                    <motion.text
                      x={cellX + COL_WIDTH / 2}
                      y={cellY + CELL_HEIGHT / 2 + 4}
                      textAnchor="middle"
                      fontSize={13}
                      fill={primaryColor}
                      fontWeight={700}
                      variants={labelAppearVariants}
                    >
                      {total}
                    </motion.text>
                  </g>
                )
              })}

              {/* Column totals */}
              {colTotals.map((total, c) => {
                const cellX = offsetX + ROW_LABEL_WIDTH + c * COL_WIDTH
                const cellY = offsetY + HEADER_HEIGHT * 2 + numRows * CELL_HEIGHT
                return (
                  <g key={`ct-${c}`}>
                    <rect x={cellX} y={cellY} width={COL_WIDTH} height={CELL_HEIGHT} fill={MARGINAL_BG} stroke="#e5e7eb" strokeWidth={1} />
                    <motion.text
                      x={cellX + COL_WIDTH / 2}
                      y={cellY + CELL_HEIGHT / 2 + 4}
                      textAnchor="middle"
                      fontSize={13}
                      fill={primaryColor}
                      fontWeight={700}
                      variants={labelAppearVariants}
                    >
                      {total}
                    </motion.text>
                  </g>
                )
              })}

              {/* Grand total */}
              <g>
                <rect
                  x={offsetX + ROW_LABEL_WIDTH + numCols * COL_WIDTH}
                  y={offsetY + HEADER_HEIGHT * 2 + numRows * CELL_HEIGHT}
                  width={COL_WIDTH}
                  height={CELL_HEIGHT}
                  fill={primaryColor}
                  opacity={0.15}
                  stroke="#e5e7eb"
                  strokeWidth={1}
                />
                <motion.text
                  data-testid="twft-grand-total"
                  x={offsetX + ROW_LABEL_WIDTH + numCols * COL_WIDTH + COL_WIDTH / 2}
                  y={offsetY + HEADER_HEIGHT * 2 + numRows * CELL_HEIGHT + CELL_HEIGHT / 2 + 4}
                  textAnchor="middle"
                  fontSize={14}
                  fill={primaryColor}
                  fontWeight={800}
                  variants={labelAppearVariants}
                >
                  {grandTotal}
                </motion.text>
              </g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Highlight indicator */}
        <AnimatePresence>
          {highlightCell && isVisible('highlight') && (
            <motion.g
              data-testid="twft-highlight"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.rect
                x={offsetX + ROW_LABEL_WIDTH + highlightCell[1] * COL_WIDTH - 2}
                y={offsetY + HEADER_HEIGHT * 2 + highlightCell[0] * CELL_HEIGHT - 2}
                width={COL_WIDTH + 4}
                height={CELL_HEIGHT + 4}
                rx={4}
                fill="none"
                stroke={primaryColor}
                strokeWidth={3}
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 0.6, 1] }}
                transition={{ duration: 1.2, repeat: Infinity, repeatType: 'reverse' }}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

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

export default TwoWayFrequencyTable
