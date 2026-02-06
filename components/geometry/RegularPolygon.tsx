'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import type { RegularPolygonData } from '@/types/geometry'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey, ColorMode } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { DiagramMathLabel } from '@/components/diagrams/DiagramMathLabel'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface RegularPolygonProps {
  data: RegularPolygonData
  width?: number
  height?: number
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Draw the polygon', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05DE\u05E6\u05D5\u05DC\u05E2' },
  vertices: { en: 'Label vertices', he: '\u05E1\u05D9\u05DE\u05D5\u05DF \u05E7\u05D5\u05D3\u05E7\u05D5\u05D3\u05D9\u05DD' },
  diagonals: { en: 'Show diagonals', he: '\u05D4\u05E6\u05D2\u05EA \u05D0\u05DC\u05DB\u05E1\u05D5\u05E0\u05D9\u05DD' },
  measurements: { en: 'Show measurements', he: '\u05D4\u05E6\u05D2\u05EA \u05DE\u05D9\u05D3\u05D5\u05EA' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Polygon names
// ---------------------------------------------------------------------------

const POLYGON_NAMES: Record<number, { en: string; he: string }> = {
  3: { en: 'Equilateral Triangle', he: '\u05DE\u05E9\u05D5\u05DC\u05E9 \u05E9\u05D5\u05D5\u05D4 \u05E6\u05DC\u05E2\u05D5\u05EA' },
  4: { en: 'Square', he: '\u05E8\u05D9\u05D1\u05D5\u05E2' },
  5: { en: 'Regular Pentagon', he: '\u05DE\u05D7\u05D5\u05DE\u05E9 \u05DE\u05E9\u05D5\u05DB\u05DC\u05DC' },
  6: { en: 'Regular Hexagon', he: '\u05DE\u05E9\u05D5\u05E9\u05D4 \u05DE\u05E9\u05D5\u05DB\u05DC\u05DC' },
  7: { en: 'Regular Heptagon', he: '\u05DE\u05E9\u05D1\u05E2 \u05DE\u05E9\u05D5\u05DB\u05DC\u05DC' },
  8: { en: 'Regular Octagon', he: '\u05DE\u05EA\u05D5\u05DE\u05DF \u05DE\u05E9\u05D5\u05DB\u05DC\u05DC' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RegularPolygon -- Phase 2 rebuild.
 *
 * Quality checklist:
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
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 */
export function RegularPolygon({
  data,
  width = 400,
  height = 400,
  className = '',
  subject = 'geometry',
  complexity = 'middle_school',
  language = 'en',
  initialStep,
}: RegularPolygonProps) {
  const {
    sides: n,
    sideLength: s,
    sideLabel = 's',
    showApothem = true,
    showInteriorAngle = true,
  } = data

  // Dark mode detection for SVG labels
  const { resolvedTheme } = useTheme()
  const colorMode: ColorMode = resolvedTheme === 'dark' ? 'dark' : 'light'

  // ------ Detect optional features ------
  // Diagonals: show them for polygons with 4+ sides
  const hasDiagonals = n >= 4
  // Errors: for now, reserved for future use
  const hasErrors = false

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'vertices', label: STEP_LABELS.vertices.en, labelHe: STEP_LABELS.vertices.he },
    ]
    if (hasDiagonals) {
      defs.push({ id: 'diagonals', label: STEP_LABELS.diagonals.en, labelHe: STEP_LABELS.diagonals.he })
    }
    defs.push({ id: 'measurements', label: STEP_LABELS.measurements.en, labelHe: STEP_LABELS.measurements.he })
    if (hasErrors) {
      defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    }
    return defs
  }, [hasDiagonals, hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Spotlight variants
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary],
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 40
  const plotSize = Math.min(width, height) - padding * 2

  // Circumradius R = s / (2 * sin(PI/n))
  const circumradius = s / (2 * Math.sin(Math.PI / n))
  const scaleFactor = (plotSize / 2) / circumradius * 0.85
  const scaledR = circumradius * scaleFactor

  const cx = width / 2
  const cy = height / 2

  // Apothem a = s / (2 * tan(PI/n))
  const apothem = s / (2 * Math.tan(Math.PI / n))
  const interiorAngle = ((n - 2) * 180) / n

  // Generate vertices (starting from top, clockwise)
  const vertices = useMemo(() => {
    const verts = []
    for (let i = 0; i < n; i++) {
      const angle = (-Math.PI / 2) + (2 * Math.PI * i) / n
      verts.push({
        x: cx + scaledR * Math.cos(angle),
        y: cy + scaledR * Math.sin(angle),
        label: String.fromCharCode(65 + i),
      })
    }
    return verts
  }, [n, scaledR, cx, cy])

  // Polygon path
  const polygonPath = vertices
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x.toFixed(2)} ${v.y.toFixed(2)}`)
    .join(' ') + ' Z'

  // Generate diagonals (all non-adjacent vertex pairs)
  const diagonals = useMemo(() => {
    if (!hasDiagonals) return []
    const result: Array<{ from: number; to: number }> = []
    for (let i = 0; i < n; i++) {
      for (let j = i + 2; j < n; j++) {
        // Skip adjacent pair that wraps around
        if (i === 0 && j === n - 1) continue
        result.push({ from: i, to: j })
      }
    }
    return result
  }, [n, hasDiagonals])

  // First side midpoint for apothem line
  const _midX = (vertices[0]?.x ?? 0 + (vertices[1]?.x ?? 0)) / 2
  const _midY = (vertices[0]?.y ?? 0 + (vertices[1]?.y ?? 0)) / 2
  const sideMidX = vertices.length >= 2 ? (vertices[0].x + vertices[1].x) / 2 : cx
  const sideMidY = vertices.length >= 2 ? (vertices[0].y + vertices[1].y) / 2 : cy

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Polygon name
  const polygonName = POLYGON_NAMES[n]
    ? (language === 'he' ? POLYGON_NAMES[n].he : POLYGON_NAMES[n].en)
    : (language === 'he' ? `\u05DE\u05E6\u05D5\u05DC\u05E2 \u05DE\u05E9\u05D5\u05DB\u05DC\u05DC ${n} \u05E6\u05DC\u05E2\u05D5\u05EA` : `Regular ${n}-gon`)

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="regular-polygon"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`${polygonName} with side length ${s}`}
      >
        {/* Background */}
        <rect
          data-testid="rp-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* ---- Step 0: Draw the polygon (outline) ---- */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="rp-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Light fill */}
              <path
                d={polygonPath}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
              />
              {/* Outline path with draw animation */}
              <motion.path
                d={polygonPath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Center point */}
              <circle cx={cx} cy={cy} r={diagram.lineWeight - 1} fill="currentColor" />
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 1: Label vertices ---- */}
        <AnimatePresence>
          {isVisible('vertices') && (
            <motion.g
              data-testid="rp-vertices"
              initial="hidden"
              animate={isCurrent('vertices') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {vertices.map((v, i) => {
                const dx = v.x - cx
                const dy = v.y - cy
                const dist = Math.hypot(dx, dy)
                const labelDist = 18
                return (
                  <motion.g
                    key={`vertex-${i}`}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: i * 0.05 }}
                  >
                    <circle
                      cx={v.x}
                      cy={v.y}
                      r={diagram.lineWeight}
                      fill={diagram.colors.primary}
                    />
                    <text
                      x={v.x + (dist > 0 ? (dx / dist) * labelDist : 0)}
                      y={v.y + (dist > 0 ? (dy / dist) * labelDist : -labelDist)}
                      textAnchor="middle"
                      dominantBaseline="middle"
                      className="fill-current text-xs font-bold"
                    >
                      {v.label}
                    </text>
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 2: Show diagonals ---- */}
        <AnimatePresence>
          {hasDiagonals && isVisible('diagonals') && (
            <motion.g
              data-testid="rp-diagonals"
              initial="hidden"
              animate={isCurrent('diagonals') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {diagonals.map((diag, idx) => (
                <motion.path
                  key={`diag-${diag.from}-${diag.to}`}
                  d={`M ${vertices[diag.from].x} ${vertices[diag.from].y} L ${vertices[diag.to].x} ${vertices[diag.to].y}`}
                  stroke={diagram.colors.accent}
                  strokeWidth={1}
                  strokeDasharray="4,3"
                  fill="none"
                  opacity={0.5}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                  transition={{ delay: idx * 0.03 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 3: Show measurements ---- */}
        <AnimatePresence>
          {isVisible('measurements') && (
            <motion.g
              data-testid="rp-measurements"
              initial="hidden"
              animate={isCurrent('measurements') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Side label on first side (KaTeX) */}
              {vertices.length >= 2 && (
                <DiagramMathLabel
                  latex={`${sideLabel} = ${s}`}
                  x={(vertices[0].x + vertices[1].x) / 2}
                  y={(vertices[0].y + vertices[1].y) / 2 - 12}
                  fontSize={13}
                  color={diagram.colors.primary}
                  textAnchor="middle"
                  animate={true}
                  colorMode={colorMode}
                />
              )}

              {/* Equal side marks on all sides */}
              {vertices.map((v, i) => {
                const nextV = vertices[(i + 1) % n]
                const mx = (v.x + nextV.x) / 2
                const my = (v.y + nextV.y) / 2
                const dx = nextV.x - v.x
                const dy = nextV.y - v.y
                const len = Math.hypot(dx, dy)
                if (len === 0) return null
                const perpX = (-dy / len) * 6
                const perpY = (dx / len) * 6
                return (
                  <line
                    key={`mark-${i}`}
                    x1={mx - perpX}
                    y1={my - perpY}
                    x2={mx + perpX}
                    y2={my + perpY}
                    stroke="currentColor"
                    strokeWidth={1.5}
                  />
                )
              })}

              {/* Apothem line */}
              {showApothem && (
                <motion.g
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.2 }}
                >
                  <motion.path
                    d={`M ${cx} ${cy} L ${sideMidX} ${sideMidY}`}
                    stroke={diagram.colors.accent}
                    strokeWidth={diagram.lineWeight}
                    strokeDasharray="5,3"
                    fill="none"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  <DiagramMathLabel
                    latex={`a = ${apothem.toFixed(2)}`}
                    x={(cx + sideMidX) / 2 - 15}
                    y={(cy + sideMidY) / 2}
                    fontSize={11}
                    color={diagram.colors.accent}
                    textAnchor="middle"
                    animate={false}
                    colorMode={colorMode}
                  />
                </motion.g>
              )}

              {/* Interior angle arc at first vertex */}
              {showInteriorAngle && vertices.length >= 2 && (
                <motion.g
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: 0.3 }}
                >
                  {(() => {
                    const v = vertices[0]
                    const prev = vertices[n - 1]
                    const next = vertices[1]
                    const a1 = Math.atan2(prev.y - v.y, prev.x - v.x)
                    const a2 = Math.atan2(next.y - v.y, next.x - v.x)
                    const radius = 15
                    return (
                      <>
                        <path
                          d={`M ${v.x + radius * Math.cos(a1)} ${v.y + radius * Math.sin(a1)} A ${radius} ${radius} 0 0 1 ${v.x + radius * Math.cos(a2)} ${v.y + radius * Math.sin(a2)}`}
                          fill="none"
                          stroke={diagram.colors.accent}
                          strokeWidth={1.5}
                        />
                        <DiagramMathLabel
                          latex={`${interiorAngle.toFixed(1)}°`}
                          x={v.x + 25 * Math.cos((a1 + a2) / 2)}
                          y={v.y + 25 * Math.sin((a1 + a2) / 2)}
                          fontSize={11}
                          color={diagram.colors.accent}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          animate={false}
                          colorMode={colorMode}
                        />
                      </>
                    )
                  })()}
                </motion.g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 4: Errors (reserved) ---- */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="rp-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            />
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default RegularPolygon
