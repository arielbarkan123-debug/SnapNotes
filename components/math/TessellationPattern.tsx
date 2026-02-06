'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TessellationPatternData } from '@/types/math'
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

interface TessellationPatternProps {
  data: TessellationPatternData
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
  base: { en: 'Draw base shape', he: 'ציור צורת בסיס' },
  row: { en: 'Fill first row', he: 'מילוי שורה ראשונה' },
  grid: { en: 'Fill entire grid', he: 'מילוי כל הרשת' },
}

// ---------------------------------------------------------------------------
// Tile shape generators
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = ['#6366f1', '#818cf8', '#a5b4fc', '#c7d2fe']

interface TileInfo {
  /** SVG polygon points string */
  points: string
  /** Row index for step reveal */
  row: number
  /** Column index for step reveal */
  col: number
  /** Fill color */
  color: string
}

function generateSquareTiles(
  rows: number,
  cols: number,
  size: number,
  offsetX: number,
  offsetY: number,
  colors: string[]
): TileInfo[] {
  const tiles: TileInfo[] = []
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = offsetX + c * size
      const y = offsetY + r * size
      const pts = `${x},${y} ${x + size},${y} ${x + size},${y + size} ${x},${y + size}`
      tiles.push({
        points: pts,
        row: r,
        col: c,
        color: colors[(r + c) % colors.length],
      })
    }
  }
  return tiles
}

function generateTriangleTiles(
  rows: number,
  cols: number,
  size: number,
  offsetX: number,
  offsetY: number,
  colors: string[]
): TileInfo[] {
  const tiles: TileInfo[] = []
  const h = (Math.sqrt(3) / 2) * size
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols * 2; c++) {
      const isUp = c % 2 === 0
      const baseX = offsetX + Math.floor(c / 2) * size + (isUp ? 0 : 0)
      const baseY = offsetY + r * h
      let pts: string
      if (isUp) {
        // Upward-pointing triangle
        const x0 = baseX
        const y0 = baseY + h
        const x1 = baseX + size / 2
        const y1 = baseY
        const x2 = baseX + size
        const y2 = baseY + h
        pts = `${x0},${y0} ${x1},${y1} ${x2},${y2}`
      } else {
        // Downward-pointing triangle
        const x0 = baseX + size / 2
        const y0 = baseY + h
        const x1 = baseX + size / 2 + size / 2
        const y1 = baseY
        const x2 = baseX + size / 2 - size / 2 + size
        const y2 = baseY
        pts = `${x0},${y0} ${x1},${y1} ${x2},${y2}`
      }
      tiles.push({
        points: pts,
        row: r,
        col: Math.floor(c / 2),
        color: colors[(r * 2 + c) % colors.length],
      })
    }
  }
  return tiles
}

function generateHexagonTiles(
  rows: number,
  cols: number,
  size: number,
  offsetX: number,
  offsetY: number,
  colors: string[]
): TileInfo[] {
  const tiles: TileInfo[] = []
  const w = size * 2
  const h = Math.sqrt(3) * size
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Honeycomb offset: odd rows shift right
      const xOff = r % 2 === 1 ? w * 0.75 : 0
      const cx = offsetX + c * w * 1.5 + xOff + size
      const cy = offsetY + r * (h * 0.5) + size
      // 6 vertices of a flat-top hexagon
      const pts = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i
        const px = cx + size * Math.cos(angle)
        const py = cy + size * Math.sin(angle)
        return `${px},${py}`
      }).join(' ')
      tiles.push({
        points: pts,
        row: r,
        col: c,
        color: colors[(r + c) % colors.length],
      })
    }
  }
  return tiles
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TessellationPattern({
  data,
  className = '',
  width = 500,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TessellationPatternProps) {
  const {
    baseShape,
    rows,
    columns,
    colors = DEFAULT_COLORS,
    title,
  } = data

  // Generate tiles
  const tiles = useMemo(() => {
    const padding = 30
    const usableWidth = width - padding * 2
    const usableHeight = height - padding * 2

    if (baseShape === 'square') {
      const tileSize = Math.min(usableWidth / columns, usableHeight / rows)
      const ox = padding + (usableWidth - tileSize * columns) / 2
      const oy = padding + (usableHeight - tileSize * rows) / 2
      return generateSquareTiles(rows, columns, tileSize, ox, oy, colors)
    }

    if (baseShape === 'triangle') {
      const h = Math.sqrt(3) / 2
      const tileSize = Math.min(usableWidth / columns, usableHeight / (rows * h))
      const ox = padding + (usableWidth - tileSize * columns) / 2
      const oy = padding + (usableHeight - tileSize * h * rows) / 2
      return generateTriangleTiles(rows, columns, tileSize, ox, oy, colors)
    }

    // hexagon
    const hexSize = Math.min(
      usableWidth / (columns * 3 + 0.5),
      usableHeight / ((rows + 0.5) * Math.sqrt(3))
    )
    const ox = padding
    const oy = padding
    return generateHexagonTiles(rows, columns, hexSize, ox, oy, colors)
  }, [baseShape, rows, columns, width, height, colors])

  // Step definitions: base shape -> first row -> full grid
  const stepDefs = useMemo(
    () => [
      { id: 'base', label: STEP_LABELS.base.en, labelHe: STEP_LABELS.base.he },
      { id: 'row', label: STEP_LABELS.row.en, labelHe: STEP_LABELS.row.he },
      { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    ],
    []
  )

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

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Determine which tiles to show at each step
  const baseTile = tiles.length > 0 ? [tiles[0]] : []
  const firstRowTiles = tiles.filter((t) => t.row === 0)
  const allTiles = tiles

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="tessellation-pattern"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="tp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg data-testid="tp-svg" viewBox={viewBox} width="100%" className="overflow-visible">
        {/* Step 0: Base shape */}
        <AnimatePresence>
          {isVisible('base') && !isVisible('row') && (
            <motion.g
              data-testid="tp-base"
              initial="hidden"
              animate={isCurrent('base') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {baseTile.map((tile, i) => (
                <motion.polygon
                  key={`base-${i}`}
                  points={tile.points}
                  fill={tile.color}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                  }}
                />
              ))}
              {/* Shape label */}
              <motion.text
                x={width / 2}
                y={height - 10}
                textAnchor="middle"
                className="fill-gray-500 dark:fill-gray-400"
                fontSize={12}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? baseShape === 'triangle'
                    ? 'משולש'
                    : baseShape === 'square'
                      ? 'ריבוע'
                      : 'משושה'
                  : baseShape.charAt(0).toUpperCase() + baseShape.slice(1)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: First row */}
        <AnimatePresence>
          {isVisible('row') && !isVisible('grid') && (
            <motion.g
              data-testid="tp-row"
              initial="hidden"
              animate={isCurrent('row') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {firstRowTiles.map((tile, i) => (
                <motion.polygon
                  key={`row-${i}`}
                  points={tile.points}
                  fill={tile.color}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: Math.min(i * 0.06, 1),
                  }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Full grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="tp-grid"
              initial="hidden"
              animate={isCurrent('grid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {allTiles.map((tile, i) => (
                <motion.polygon
                  key={`tile-${i}`}
                  points={tile.points}
                  fill={tile.color}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 20,
                    delay: Math.min((tile.row * columns + tile.col) * 0.03, 2),
                  }}
                />
              ))}
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

export default TessellationPattern
