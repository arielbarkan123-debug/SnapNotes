'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OrthographicViews3DData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
  lineDrawVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OrthographicViews3DProps {
  data: OrthographicViews3DData
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
  show3D: { en: 'Show 3D model', he: 'הצגת מודל תלת-ממדי' },
  showFront: { en: 'Front view', he: 'מבט קדמי' },
  showSide: { en: 'Side view', he: 'מבט צדדי' },
  showTop: { en: 'Top view', he: 'מבט עליון' },
}

// ---------------------------------------------------------------------------
// Grid view sub-component
// ---------------------------------------------------------------------------

function GridView({
  grid,
  originX,
  originY,
  cellSize,
  fillColor,
  borderColor,
  label,
  language: _language,
  delay = 0,
}: {
  grid: number[][]
  originX: number
  originY: number
  cellSize: number
  fillColor: string
  borderColor: string
  label: string
  language: 'en' | 'he'
  delay?: number
}) {
  const rows = grid.length
  const cols = grid.length > 0 ? grid[0].length : 0
  const gridW = cols * cellSize
  const gridH = rows * cellSize

  return (
    <g>
      {/* Grid border */}
      <motion.rect
        x={originX}
        y={originY}
        width={gridW}
        height={gridH}
        fill="none"
        stroke={borderColor}
        strokeWidth={1.5}
        initial="hidden"
        animate="visible"
        variants={lineDrawVariants}
      />
      {/* Cells */}
      {grid.map((row, ri) =>
        row.map((cell, ci) => (
          <motion.rect
            key={`cell-${ri}-${ci}`}
            x={originX + ci * cellSize}
            y={originY + ri * cellSize}
            width={cellSize}
            height={cellSize}
            fill={cell === 1 ? fillColor : 'transparent'}
            stroke={borderColor}
            strokeWidth={0.5}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 20,
              delay: delay + (ri * cols + ci) * 0.03,
            }}
          />
        ))
      )}
      {/* Label */}
      <motion.text
        x={originX + gridW / 2}
        y={originY + gridH + 18}
        textAnchor="middle"
        className="fill-gray-600 dark:fill-gray-400"
        fontSize={11}
        fontWeight={600}
        initial="hidden"
        animate="visible"
        variants={labelAppearVariants}
      >
        {label}
      </motion.text>
    </g>
  )
}

// ---------------------------------------------------------------------------
// Simple isometric 3D renderer
// ---------------------------------------------------------------------------

function Isometric3D({
  grid,
  originX,
  originY,
  cellSize,
  fillColor,
  borderColor,
}: {
  grid: number[][] // top view grid
  originX: number
  originY: number
  cellSize: number
  fillColor: string
  borderColor: string
}) {
  const s = cellSize * 0.6
  // Isometric projection axes
  const isoX = (col: number, row: number) => originX + (col - row) * s * 0.866
  const isoY = (col: number, row: number, h: number) =>
    originY + (col + row) * s * 0.5 - h * s

  const cubes: Array<{ r: number; c: number }> = []
  grid.forEach((row, ri) => {
    row.forEach((cell, ci) => {
      if (cell === 1) cubes.push({ r: ri, c: ci })
    })
  })

  return (
    <g>
      {cubes.map(({ r, c }, i) => {
        const topFace = [
          [isoX(c, r), isoY(c, r, 1)],
          [isoX(c + 1, r), isoY(c + 1, r, 1)],
          [isoX(c + 1, r + 1), isoY(c + 1, r + 1, 1)],
          [isoX(c, r + 1), isoY(c, r + 1, 1)],
        ]
        const leftFace = [
          [isoX(c, r), isoY(c, r, 1)],
          [isoX(c, r + 1), isoY(c, r + 1, 1)],
          [isoX(c, r + 1), isoY(c, r + 1, 0)],
          [isoX(c, r), isoY(c, r, 0)],
        ]
        const rightFace = [
          [isoX(c, r + 1), isoY(c, r + 1, 1)],
          [isoX(c + 1, r + 1), isoY(c + 1, r + 1, 1)],
          [isoX(c + 1, r + 1), isoY(c + 1, r + 1, 0)],
          [isoX(c, r + 1), isoY(c, r + 1, 0)],
        ]
        const makePath = (pts: number[][]) =>
          pts.map((p, j) => `${j === 0 ? 'M' : 'L'} ${p[0]} ${p[1]}`).join(' ') + ' Z'

        return (
          <motion.g
            key={`cube-${i}`}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 20, delay: i * 0.05 }}
          >
            {/* Left face - darker */}
            <path d={makePath(leftFace)} fill={fillColor} opacity={0.6} stroke={borderColor} strokeWidth={0.8} />
            {/* Right face - medium */}
            <path d={makePath(rightFace)} fill={fillColor} opacity={0.4} stroke={borderColor} strokeWidth={0.8} />
            {/* Top face - lightest */}
            <path d={makePath(topFace)} fill={fillColor} opacity={0.8} stroke={borderColor} strokeWidth={0.8} />
          </motion.g>
        )
      })}
    </g>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function OrthographicViews3D({
  data,
  className = '',
  width = 500,
  height = 420,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: OrthographicViews3DProps) {
  const { shape, views, show3DModel, title } = data

  const has3D = show3DModel !== false

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = []
    if (has3D) {
      defs.push({ id: 'show3D', label: STEP_LABELS.show3D.en, labelHe: STEP_LABELS.show3D.he })
    }
    defs.push({ id: 'showFront', label: STEP_LABELS.showFront.en, labelHe: STEP_LABELS.showFront.he })
    defs.push({ id: 'showSide', label: STEP_LABELS.showSide.en, labelHe: STEP_LABELS.showSide.he })
    defs.push({ id: 'showTop', label: STEP_LABELS.showTop.en, labelHe: STEP_LABELS.showTop.he })
    return defs
  }, [has3D])

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

  // Layout: 3D model on top-left, views in standard arrangement
  // Front view bottom-left, Side view bottom-right, Top view top-right
  const cellSize = 28
  const viewGap = 30

  // Determine grid dimensions
  const frontRows = views.front.length
  const frontCols = views.front.length > 0 ? views.front[0].length : 0
  const _sideRows = views.side.length
  const sideCols = views.side.length > 0 ? views.side[0].length : 0
  const topRows = views.top.length
  const _topCols = views.top.length > 0 ? views.top[0].length : 0

  // Positions for standard orthographic arrangement:
  // Top view above front view, side view to the right of front view
  const frontX = 40
  const frontY = height - 60 - frontRows * cellSize
  const topX = frontX
  const topY = frontY - viewGap - topRows * cellSize
  const sideX = frontX + frontCols * cellSize + viewGap
  const sideY = frontY

  // 3D model position
  const isoX = sideX + sideCols * cellSize + viewGap + 30
  const isoY = topY + 60

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="orthographic-views-3d"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="ov-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {shape && (
        <div
          data-testid="ov-shape-name"
          className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2"
        >
          {shape}
        </div>
      )}

      <svg
        data-testid="ov-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Show 3D model (optional) */}
        <AnimatePresence>
          {has3D && isVisible('show3D') && (
            <motion.g
              data-testid="ov-3d-model"
              initial="hidden"
              animate={isCurrent('show3D') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <Isometric3D
                grid={views.top}
                originX={isoX}
                originY={isoY}
                cellSize={cellSize}
                fillColor={primaryColor}
                borderColor="#374151"
              />
              <motion.text
                x={isoX}
                y={isoY - 20}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={10}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                3D
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Front view */}
        <AnimatePresence>
          {isVisible('showFront') && (
            <motion.g
              data-testid="ov-front-view"
              initial="hidden"
              animate={isCurrent('showFront') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <GridView
                grid={views.front}
                originX={frontX}
                originY={frontY}
                cellSize={cellSize}
                fillColor={primaryColor}
                borderColor="#374151"
                label={language === 'he' ? 'מבט קדמי' : 'Front'}
                language={language}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Side view */}
        <AnimatePresence>
          {isVisible('showSide') && (
            <motion.g
              data-testid="ov-side-view"
              initial="hidden"
              animate={isCurrent('showSide') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <GridView
                grid={views.side}
                originX={sideX}
                originY={sideY}
                cellSize={cellSize}
                fillColor={accentColor}
                borderColor="#374151"
                label={language === 'he' ? 'מבט צדדי' : 'Side'}
                language={language}
                delay={0.1}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Top view */}
        <AnimatePresence>
          {isVisible('showTop') && (
            <motion.g
              data-testid="ov-top-view"
              initial="hidden"
              animate={isCurrent('showTop') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <GridView
                grid={views.top}
                originX={topX}
                originY={topY}
                cellSize={cellSize}
                fillColor="#22c55e"
                borderColor="#374151"
                label={language === 'he' ? 'מבט עליון' : 'Top'}
                language={language}
                delay={0.1}
              />
            </motion.g>
          )}
        </AnimatePresence>
      </svg>

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

export default OrthographicViews3D
