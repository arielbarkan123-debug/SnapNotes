'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TransformationsCompositionData, Point2D } from '@/types/geometry'
import { GEOMETRY_COLORS } from '@/types/geometry'
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
// Helpers
// ---------------------------------------------------------------------------

function pointsToPath(pts: Point2D[]): string {
  if (pts.length === 0) return ''
  return `M ${pts[0].x} ${pts[0].y} ${pts.slice(1).map((p) => `L ${p.x} ${p.y}`).join(' ')} Z`
}

function centroid(pts: Point2D[]): Point2D {
  const x = pts.reduce((s, p) => s + p.x, 0) / pts.length
  const y = pts.reduce((s, p) => s + p.y, 0) / pts.length
  return { x, y }
}

const STAGE_COLORS = [
  '#6366f1', // indigo
  '#22c55e', // green
  '#f59e0b', // amber
  '#ef4444', // red
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const BASE_STEP_LABELS: Record<string, { en: string; he: string }> = {
  original: { en: 'Draw original shape', he: 'ציור הצורה המקורית' },
  final: { en: 'Show final position', he: 'הצגת המיקום הסופי' },
}

function transformLabel(t: { type: string }, index: number, lang: 'en' | 'he'): string {
  const typeLabels: Record<string, { en: string; he: string }> = {
    translation: { en: 'Translation', he: 'הזזה' },
    reflection: { en: 'Reflection', he: 'שיקוף' },
    rotation: { en: 'Rotation', he: 'סיבוב' },
    dilation: { en: 'Dilation', he: 'הרחבה' },
  }
  const label = typeLabels[t.type]?.[lang] || t.type
  return `${lang === 'he' ? 'צעד' : 'Step'} ${index + 1}: ${label}`
}

interface TransformationsCompositionProps {
  data: TransformationsCompositionData
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
 * TransformationsComposition - Shape through multiple transformations
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
export function TransformationsComposition({
  data,
  width = 400,
  height = 400,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: TransformationsCompositionProps) {
  const {
    originalShape,
    transformations,
    finalShape,
    showIntermediate = true,
    showOrder = true,
    title,
  } = data

  // Build step definitions: original + each transformation + final
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'original', label: BASE_STEP_LABELS.original.en, labelHe: BASE_STEP_LABELS.original.he },
    ]
    transformations.forEach((t, i) => {
      defs.push({
        id: `transform-${i}`,
        label: transformLabel(t, i, 'en'),
        labelHe: transformLabel(t, i, 'he'),
      })
    })
    defs.push({ id: 'final', label: BASE_STEP_LABELS.final.en, labelHe: BASE_STEP_LABELS.final.he })
    return defs
  }, [transformations])

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

  // Normalize all shapes into SVG space
  const allPoints = useMemo(() => {
    const all: Point2D[] = [...originalShape, ...finalShape]
    transformations.forEach((t) => {
      if (t.intermediateShape) all.push(...t.intermediateShape)
    })
    return all
  }, [originalShape, finalShape, transformations])

  const bounds = useMemo(() => {
    const xs = allPoints.map((p) => p.x)
    const ys = allPoints.map((p) => p.y)
    return {
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    }
  }, [allPoints])

  const padding = 50
  const toSvg = useMemo(() => {
    const dataW = bounds.maxX - bounds.minX || 1
    const dataH = bounds.maxY - bounds.minY || 1
    const drawW = width - padding * 2
    const drawH = height - padding * 2
    const scale = Math.min(drawW / dataW, drawH / dataH) * 0.85
    const offsetX = padding + (drawW - dataW * scale) / 2
    const offsetY = padding + (drawH - dataH * scale) / 2
    return (pts: Point2D[]): Point2D[] =>
      pts.map((p) => ({
        x: offsetX + (p.x - bounds.minX) * scale,
        y: offsetY + (p.y - bounds.minY) * scale,
        label: p.label,
      }))
  }, [bounds, width, height, padding])

  const svgOriginal = useMemo(() => toSvg(originalShape), [toSvg, originalShape])
  const svgFinal = useMemo(() => toSvg(finalShape), [toSvg, finalShape])
  const svgIntermediates = useMemo(
    () => transformations.map((t) => (t.intermediateShape ? toSvg(t.intermediateShape) : null)),
    [toSvg, transformations]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="transformations-composition-diagram"
      className={`geometry-transformations-composition ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Transformations composition${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="tc-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="tc-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Original shape */}
        <AnimatePresence>
          {isVisible('original') && (
            <motion.g
              data-testid="tc-original"
              initial="hidden"
              animate={isCurrent('original') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={pointsToPath(svgOriginal)}
                fill={STAGE_COLORS[0]}
                fillOpacity={0.15}
                stroke={STAGE_COLORS[0]}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {svgOriginal.map((p, i) => (
                <circle
                  key={`orig-${i}`}
                  data-testid={`tc-original-vertex-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={diagram.lineWeight}
                  fill={STAGE_COLORS[0]}
                />
              ))}
              {showOrder && (
                <motion.text
                  x={centroid(svgOriginal).x}
                  y={centroid(svgOriginal).y + 4}
                  textAnchor="middle"
                  className="text-xs font-bold"
                  style={{ fill: STAGE_COLORS[0] }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he' ? 'מקורי' : 'Original'}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Steps 1-N: Intermediate transformations */}
        {transformations.map((t, i) => {
          const stepId = `transform-${i}`
          const interPts = svgIntermediates[i]
          const color = STAGE_COLORS[(i + 1) % STAGE_COLORS.length]
          if (!interPts || !showIntermediate) return null
          return (
            <AnimatePresence key={stepId}>
              {isVisible(stepId) && (
                <motion.g
                  data-testid={`tc-intermediate-${i}`}
                  initial="hidden"
                  animate={isCurrent(stepId) ? 'spotlight' : 'visible'}
                  variants={spotlight}
                >
                  <motion.path
                    d={pointsToPath(interPts)}
                    fill={color}
                    fillOpacity={0.08}
                    stroke={color}
                    strokeWidth={diagram.lineWeight - 0.5}
                    strokeDasharray="5,3"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {/* Arrow from previous centroid to this one */}
                  {(() => {
                    const prev = i === 0 ? svgOriginal : (svgIntermediates[i - 1] || svgOriginal)
                    const prevC = centroid(prev)
                    const currC = centroid(interPts)
                    return (
                      <motion.line
                        data-testid={`tc-arrow-${i}`}
                        x1={prevC.x}
                        y1={prevC.y}
                        x2={currC.x}
                        y2={currC.y}
                        stroke={color}
                        strokeWidth={1.5}
                        markerEnd="url(#arrowhead)"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.6 }}
                        transition={{ delay: 0.3 }}
                      />
                    )
                  })()}
                  {showOrder && (
                    <motion.text
                      x={centroid(interPts).x}
                      y={centroid(interPts).y + 4}
                      textAnchor="middle"
                      className="text-xs font-medium"
                      style={{ fill: color }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {t.type.charAt(0).toUpperCase() + t.type.slice(1)}
                    </motion.text>
                  )}
                </motion.g>
              )}
            </AnimatePresence>
          )
        })}

        {/* Final step: Final shape */}
        <AnimatePresence>
          {isVisible('final') && (
            <motion.g
              data-testid="tc-final"
              initial="hidden"
              animate={isCurrent('final') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={pointsToPath(svgFinal)}
                fill={diagram.colors.primary}
                fillOpacity={0.2}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight + 0.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {svgFinal.map((p, i) => (
                <circle
                  key={`final-${i}`}
                  data-testid={`tc-final-vertex-${i}`}
                  cx={p.x}
                  cy={p.y}
                  r={diagram.lineWeight + 1}
                  fill={diagram.colors.primary}
                />
              ))}
              {showOrder && (
                <motion.text
                  x={centroid(svgFinal).x}
                  y={centroid(svgFinal).y + 4}
                  textAnchor="middle"
                  className="text-xs font-bold"
                  style={{ fill: diagram.colors.primary }}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {language === 'he' ? 'סופי' : 'Final'}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Arrow marker definition */}
        <defs>
          <marker
            id="arrowhead"
            markerWidth="8"
            markerHeight="6"
            refX="8"
            refY="3"
            orient="auto"
          >
            <polygon points="0 0, 8 3, 0 6" fill="currentColor" opacity={0.5} />
          </marker>
        </defs>
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
            {language === 'he' ? 'רצף העתקות:' : 'Transformation Sequence:'}
          </h4>
          <div className="space-y-1">
            {transformations.map((t, i) => (
              <p key={i} className="text-xs text-gray-600 dark:text-gray-400">
                {i + 1}. {t.type} {t.params ? `(${Object.entries(t.params).map(([k, v]) => `${k}: ${v}`).join(', ')})` : ''}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

export default TransformationsComposition
