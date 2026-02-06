'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TessellationPatternData } from '@/types/geometry'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  single: { en: 'Show single tile', he: 'הצגת אריח בודד' },
  firstRow: { en: 'Show first row', he: 'הצגת שורה ראשונה' },
  allRows: { en: 'Fill all rows', he: 'מילוי כל השורות' },
  transformations: { en: 'Show transformations', he: 'הצגת העתקות' },
}

// Tile colors
const DEFAULT_COLORS = ['#ec4899', '#8b5cf6', '#3b82f6', '#22c55e', '#f59e0b', '#ef4444']

// ---------------------------------------------------------------------------
// Tile generators
// ---------------------------------------------------------------------------

function triangleTile(cx: number, cy: number, size: number, flipped: boolean): string {
  const h = (size * Math.sqrt(3)) / 2
  if (flipped) {
    return `M ${cx} ${cy + h / 2} L ${cx - size / 2} ${cy - h / 2} L ${cx + size / 2} ${cy - h / 2} Z`
  }
  return `M ${cx} ${cy - h / 2} L ${cx - size / 2} ${cy + h / 2} L ${cx + size / 2} ${cy + h / 2} Z`
}

function squareTile(cx: number, cy: number, size: number): string {
  const hs = size / 2
  return `M ${cx - hs} ${cy - hs} L ${cx + hs} ${cy - hs} L ${cx + hs} ${cy + hs} L ${cx - hs} ${cy + hs} Z`
}

function hexagonTile(cx: number, cy: number, size: number): string {
  const pts: string[] = []
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6
    pts.push(`${cx + size * Math.cos(angle)} ${cy + size * Math.sin(angle)}`)
  }
  return `M ${pts[0]} ${pts.slice(1).map((p) => `L ${p}`).join(' ')} Z`
}

interface TessellationPatternProps {
  data: TessellationPatternData
  width?: number
  height?: number
  className?: string
  initialStep?: number
  showStepByStep?: boolean
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

/**
 * TessellationPattern - Repeating tile pattern diagram
 *
 * Quality standard checklist:
 * - [x] useDiagramBase hook
 * - [x] DiagramStepControls
 * - [x] pathLength draw animation
 * - [x] Spotlight on current step
 * - [x] Dark/light mode
 * - [x] Responsive width
 * - [x] data-testid attributes
 * - [x] RTL support
 * - [x] Subject-coded colors
 * - [x] Adaptive line weight
 */
export function TessellationPattern({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: TessellationPatternProps) {
  const {
    baseShape,
    rows,
    columns,
    showTransformations = false,
    colors = DEFAULT_COLORS,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'single', label: STEP_LABELS.single.en, labelHe: STEP_LABELS.single.he },
      { id: 'firstRow', label: STEP_LABELS.firstRow.en, labelHe: STEP_LABELS.firstRow.he },
      { id: 'allRows', label: STEP_LABELS.allRows.en, labelHe: STEP_LABELS.allRows.he },
    ]
    if (showTransformations) {
      defs.push({ id: 'transformations', label: STEP_LABELS.transformations.en, labelHe: STEP_LABELS.transformations.he })
    }
    return defs
  }, [showTransformations])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Generate all tiles
  const padding = 30
  const tileSize = useMemo(() => {
    const availW = width - padding * 2
    const availH = height - padding * 2 - 20
    if (baseShape === 'hexagon') {
      const hexW = Math.sqrt(3) * (availW / (columns + 0.5)) / Math.sqrt(3)
      const hexH = availH / (rows * 1.5 + 0.5)
      return Math.min(hexW, hexH) * 0.9
    }
    if (baseShape === 'triangle') {
      return Math.min(availW / columns, availH / rows) * 0.8
    }
    return Math.min(availW / columns, availH / rows) * 0.95
  }, [width, height, columns, rows, baseShape, padding])

  const tiles = useMemo(() => {
    const result: Array<{ path: string; row: number; col: number; colorIdx: number }> = []
    const startX = padding + 10
    const startY = padding + 20

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const colorIdx = (r + c) % colors.length

        if (baseShape === 'square') {
          const cx = startX + c * tileSize + tileSize / 2
          const cy = startY + r * tileSize + tileSize / 2
          result.push({ path: squareTile(cx, cy, tileSize * 0.95), row: r, col: c, colorIdx })
        } else if (baseShape === 'triangle') {
          // Two triangles per cell for tessellation
          const cx = startX + c * tileSize + tileSize / 2
          const cy = startY + r * (tileSize * Math.sqrt(3) / 2) + tileSize / 2
          const flipped = (r + c) % 2 === 1
          result.push({ path: triangleTile(cx, cy, tileSize, flipped), row: r, col: c, colorIdx })
        } else if (baseShape === 'hexagon') {
          const hSize = tileSize * 0.5
          const hexW = Math.sqrt(3) * hSize
          const cx = startX + c * hexW + (r % 2 === 1 ? hexW / 2 : 0) + hexW / 2
          const cy = startY + r * hSize * 1.5 + hSize
          result.push({ path: hexagonTile(cx, cy, hSize), row: r, col: c, colorIdx })
        } else {
          // Custom: fallback to square
          const cx = startX + c * tileSize + tileSize / 2
          const cy = startY + r * tileSize + tileSize / 2
          result.push({ path: squareTile(cx, cy, tileSize * 0.95), row: r, col: c, colorIdx })
        }
      }
    }
    return result
  }, [rows, columns, baseShape, tileSize, colors.length, padding])

  // Determine which tiles to show
  const visibleTiles = useMemo(() => {
    if (isVisible('allRows')) return tiles
    if (isVisible('firstRow')) return tiles.filter((t) => t.row === 0)
    if (isVisible('single')) return tiles.filter((t) => t.row === 0 && t.col === 0)
    return []
  }, [tiles, diagram.currentStep]) // eslint-disable-line react-hooks/exhaustive-deps

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const shapeNameMap: Record<string, { en: string; he: string }> = {
    triangle: { en: 'Triangle', he: 'משולש' },
    square: { en: 'Square', he: 'ריבוע' },
    hexagon: { en: 'Hexagon', he: 'משושה' },
    custom: { en: 'Custom', he: 'מותאם' },
  }

  return (
    <div
      data-testid="tessellation-pattern-diagram"
      className={`geometry-tessellation-pattern ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Tessellation pattern with ${baseShape}${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="tess-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="tess-title"
            x={width / 2}
            y={18}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Tiles */}
        <AnimatePresence>
          {visibleTiles.map((tile, idx) => {
            const isSingleHighlight = tile.row === 0 && tile.col === 0 && isCurrent('single')
            const color = colors[tile.colorIdx % colors.length]
            return (
              <motion.path
                key={`tile-${tile.row}-${tile.col}`}
                data-testid={`tess-tile-${tile.row}-${tile.col}`}
                d={tile.path}
                fill={color}
                fillOpacity={isSingleHighlight ? 0.3 : 0.15}
                stroke={color}
                strokeWidth={isSingleHighlight ? diagram.lineWeight + 0.5 : diagram.lineWeight * 0.7}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: idx * 0.02 }}
              />
            )
          })}
        </AnimatePresence>

        {/* Transformation annotations */}
        <AnimatePresence>
          {isVisible('transformations') && (
            <motion.g
              data-testid="tess-transformations"
              initial="hidden"
              animate={isCurrent('transformations') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 15}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he'
                  ? `ריצוף ${shapeNameMap[baseShape]?.he || baseShape} - הזזות וסיבובים`
                  : `${shapeNameMap[baseShape]?.en || baseShape} tessellation - translations & rotations`}
              </motion.text>
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}

      {showStepByStep && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פרטי ריצוף:' : 'Tessellation Details:'}
          </h4>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'צורת בסיס:' : 'Base shape:'} {shapeNameMap[baseShape]?.[language] || baseShape}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'גריד:' : 'Grid:'} {rows} x {columns}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default TessellationPattern
