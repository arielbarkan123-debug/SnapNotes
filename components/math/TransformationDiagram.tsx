'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransformationDiagramData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TransformationDiagramProps {
  data: TransformationDiagramData
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
  grid: { en: 'Draw coordinate grid', he: 'ציור רשת קואורדינטות' },
  original: { en: 'Show original shape', he: 'הצגת הצורה המקורית' },
  indicator: { en: 'Show transformation', he: 'הצגת ההתמרה' },
  transformed: { en: 'Show transformed shape', he: 'הצגת הצורה לאחר ההתמרה' },
  labels: { en: 'Label vertices', he: 'סימון קודקודים' },
}

const TRANSFORM_NAMES: Record<string, { en: string; he: string }> = {
  translation: { en: 'Translation', he: 'הזזה' },
  reflection: { en: 'Reflection', he: 'שיקוף' },
  rotation: { en: 'Rotation', he: 'סיבוב' },
  dilation: { en: 'Dilation', he: 'הרחבה' },
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PADDING = 40
const VERTEX_LABELS = 'ABCDEFGHIJ'.split('')

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function TransformationDiagram({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: TransformationDiagramProps) {
  const { original, transformed, transformationType, title } = data

  // Build step definitions
  const stepDefs = useMemo(() => [
    { id: 'grid', label: STEP_LABELS.grid.en, labelHe: STEP_LABELS.grid.he },
    { id: 'original', label: STEP_LABELS.original.en, labelHe: STEP_LABELS.original.he },
    { id: 'indicator', label: STEP_LABELS.indicator.en, labelHe: STEP_LABELS.indicator.he },
    { id: 'transformed', label: STEP_LABELS.transformed.en, labelHe: STEP_LABELS.transformed.he },
    { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
  ], [])

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
  const accentColor = diagram.colors.accent
  const lightColor = diagram.colors.light
  const spotlight = useMemo(() => createSpotlightVariants(primaryColor), [primaryColor])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Coordinate system
  const plotW = width - PADDING * 2
  const plotH = height - PADDING * 2

  const domainRange = useMemo(() => {
    const allX = [...original.map((p) => p.x), ...transformed.map((p) => p.x)]
    const allY = [...original.map((p) => p.y), ...transformed.map((p) => p.y)]
    const margin = 2
    return {
      xMin: Math.min(...allX, 0) - margin,
      xMax: Math.max(...allX, 0) + margin,
      yMin: Math.min(...allY, 0) - margin,
      yMax: Math.max(...allY, 0) + margin,
    }
  }, [original, transformed])

  const { xMin, xMax, yMin, yMax } = domainRange

  const toSvgX = (x: number) => PADDING + ((x - xMin) / (xMax - xMin)) * plotW
  const toSvgY = (y: number) => PADDING + ((yMax - y) / (yMax - yMin)) * plotH

  // Grid
  const gridLines = useMemo(() => {
    const lines: Array<{ x1: number; y1: number; x2: number; y2: number }> = []
    for (let x = Math.ceil(xMin); x <= Math.floor(xMax); x++) {
      lines.push({ x1: toSvgX(x), y1: PADDING, x2: toSvgX(x), y2: PADDING + plotH })
    }
    for (let y = Math.ceil(yMin); y <= Math.floor(yMax); y++) {
      lines.push({ x1: PADDING, y1: toSvgY(y), x2: PADDING + plotW, y2: toSvgY(y) })
    }
    return lines
  }, [xMin, xMax, yMin, yMax, plotW, plotH])

  // Polygon points strings
  const originalPoints = original.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')
  const transformedPoints = transformed.map((p) => `${toSvgX(p.x)},${toSvgY(p.y)}`).join(' ')

  // Connection arrows (original vertex -> transformed vertex)
  const arrows = useMemo(() => {
    return original.map((orig, i) => {
      const trans = transformed[i]
      if (!trans) return null
      return {
        x1: toSvgX(orig.x),
        y1: toSvgY(orig.y),
        x2: toSvgX(trans.x),
        y2: toSvgY(trans.y),
      }
    }).filter(Boolean) as Array<{ x1: number; y1: number; x2: number; y2: number }>
  }, [original, transformed])

  const transformName = TRANSFORM_NAMES[transformationType]?.[language] || transformationType

  return (
    <div
      data-testid="transformation-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-2 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="td-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-2"
        >
          {title}
        </div>
      )}

      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${transformationType} transformation diagram`}
      >
        {/* Background */}
        <rect
          data-testid="td-background"
          x={0}
          y={0}
          width={width}
          height={height}
          fill="white"
          className="dark:fill-gray-900"
        />

        {/* Arrow marker */}
        <defs>
          <marker id="td-arrowhead" markerWidth="8" markerHeight="6" refX="8" refY="3" orient="auto">
            <polygon points="0 0, 8 3, 0 6" fill="#9ca3af" />
          </marker>
        </defs>

        {/* Step 0: Grid */}
        <AnimatePresence>
          {isVisible('grid') && (
            <motion.g
              data-testid="td-grid"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {gridLines.map((gl, i) => (
                <line key={`g-${i}`} x1={gl.x1} y1={gl.y1} x2={gl.x2} y2={gl.y2} stroke="#e5e7eb" strokeWidth={1} />
              ))}
              {/* X axis */}
              <motion.line x1={PADDING} y1={toSvgY(0)} x2={PADDING + plotW} y2={toSvgY(0)} stroke="#374151" strokeWidth={diagram.lineWeight} variants={lineDrawVariants} />
              {/* Y axis */}
              <motion.line x1={toSvgX(0)} y1={PADDING} x2={toSvgX(0)} y2={PADDING + plotH} stroke="#374151" strokeWidth={diagram.lineWeight} variants={lineDrawVariants} />
              {/* Axis labels */}
              <text x={PADDING + plotW - 5} y={toSvgY(0) - 8} textAnchor="end" fontSize={12} fill="#374151" fontWeight={600}>x</text>
              <text x={toSvgX(0) + 10} y={PADDING + 12} textAnchor="start" fontSize={12} fill="#374151" fontWeight={600}>y</text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Original shape */}
        <AnimatePresence>
          {isVisible('original') && (
            <motion.g
              data-testid="td-original"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={originalPoints}
                fill={`${primaryColor}30`}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                variants={lineDrawVariants}
              />
              {/* Vertices */}
              {original.map((p, i) => (
                <motion.circle
                  key={`ov-${i}`}
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={4}
                  fill={primaryColor}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Transformation indicator (arrows) */}
        <AnimatePresence>
          {isVisible('indicator') && (
            <motion.g
              data-testid="td-indicator"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {arrows.map((arr, i) => (
                <motion.line
                  key={`arr-${i}`}
                  x1={arr.x1}
                  y1={arr.y1}
                  x2={arr.x2}
                  y2={arr.y2}
                  stroke="#9ca3af"
                  strokeWidth={1.5}
                  strokeDasharray="5 3"
                  markerEnd="url(#td-arrowhead)"
                  variants={lineDrawVariants}
                />
              ))}

              {/* Transform type label */}
              <motion.rect
                x={width / 2 - 50}
                y={PADDING - 28}
                width={100}
                height={22}
                rx={4}
                fill={primaryColor}
                opacity={0.8}
                variants={labelAppearVariants}
              />
              <motion.text
                x={width / 2}
                y={PADDING - 13}
                textAnchor="middle"
                fill="white"
                fontSize={11}
                fontWeight={600}
                variants={labelAppearVariants}
              >
                {transformName}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Transformed shape */}
        <AnimatePresence>
          {isVisible('transformed') && (
            <motion.g
              data-testid="td-transformed"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              <motion.polygon
                points={transformedPoints}
                fill={`${lightColor}50`}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                strokeDasharray="6 3"
                variants={lineDrawVariants}
              />
              {/* Vertices */}
              {transformed.map((p, i) => (
                <motion.circle
                  key={`tv-${i}`}
                  cx={toSvgX(p.x)}
                  cy={toSvgY(p.y)}
                  r={4}
                  fill={accentColor}
                  stroke="white"
                  strokeWidth={1.5}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ delay: i * 0.08 }}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Vertex labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="td-labels"
              initial="hidden"
              animate="visible"
              variants={spotlight}
            >
              {original.map((p, i) => (
                <motion.text
                  key={`ol-${i}`}
                  x={toSvgX(p.x)}
                  y={toSvgY(p.y) - 10}
                  textAnchor="middle"
                  fill={primaryColor}
                  fontSize={12}
                  fontWeight={700}
                  variants={labelAppearVariants}
                >
                  {VERTEX_LABELS[i] || `P${i}`}
                </motion.text>
              ))}
              {transformed.map((p, i) => (
                <motion.text
                  key={`tl-${i}`}
                  x={toSvgX(p.x)}
                  y={toSvgY(p.y) - 10}
                  textAnchor="middle"
                  fill={accentColor}
                  fontSize={12}
                  fontWeight={700}
                  variants={labelAppearVariants}
                >
                  {VERTEX_LABELS[i] || `P${i}`}&apos;
                </motion.text>
              ))}
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

export default TransformationDiagram
