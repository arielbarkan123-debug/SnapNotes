'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { FBDData } from '@/types/math'
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

interface FBDProps {
  data: FBDData
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
// Default force colors by type
// ---------------------------------------------------------------------------

const FORCE_COLORS: Record<string, string> = {
  weight: '#ef4444',   // red
  normal: '#22c55e',   // green
  friction: '#f59e0b', // amber
  applied: '#3b82f6',  // blue
  tension: '#8b5cf6',  // purple
  drag: '#06b6d4',     // cyan
  spring: '#ec4899',   // pink
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const DEFAULT_STEP_LABELS: Record<string, { en: string; he: string }> = {
  object: { en: 'Draw object', he: 'ציור הגוף' },
  forces: { en: 'Add forces', he: 'הוספת כוחות' },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Convert angle in degrees (0=right, 90=up, -90=down, 180=left) to radians */
function degToRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Get arrow endpoint from center, angle, and length */
function getArrowEnd(
  cx: number,
  cy: number,
  angleDeg: number,
  length: number
): { x: number; y: number } {
  const rad = degToRad(angleDeg)
  return {
    x: cx + Math.cos(rad) * length,
    y: cy - Math.sin(rad) * length, // SVG y-axis is inverted
  }
}

/** Draw an arrowhead path at the tip of an arrow */
function arrowheadPath(
  tipX: number,
  tipY: number,
  angleDeg: number,
  size: number = 8
): string {
  const rad = degToRad(angleDeg)
  // Two barb points rotated +-150 deg from arrow direction
  const barb1Angle = rad + Math.PI + Math.PI / 6
  const barb2Angle = rad + Math.PI - Math.PI / 6
  const b1x = tipX + Math.cos(barb1Angle) * size
  const b1y = tipY - Math.sin(barb1Angle) * size
  const b2x = tipX + Math.cos(barb2Angle) * size
  const b2y = tipY - Math.sin(barb2Angle) * size
  return `M ${tipX} ${tipY} L ${b1x} ${b1y} L ${b2x} ${b2y} Z`
}

// ---------------------------------------------------------------------------
// Object shape renderers
// ---------------------------------------------------------------------------

function renderObject(
  type: FBDData['object']['type'],
  cx: number,
  cy: number,
  size: number,
  color: string,
  lineWeight: number,
  label?: string,
  mass?: number
) {
  const _textColor = 'currentColor'
  const labelText = label || (mass !== undefined ? `${mass} kg` : '')

  switch (type) {
    case 'sphere':
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={size}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={lineWeight}
          />
          {labelText && (
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )

    case 'particle':
      return (
        <g>
          <circle
            cx={cx}
            cy={cy}
            r={5}
            fill={color}
            stroke={color}
            strokeWidth={lineWeight}
          />
          {labelText && (
            <text
              x={cx}
              y={cy + 18}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )

    case 'wedge':
      return (
        <g>
          <polygon
            points={`${cx - size} ${cy + size * 0.7}, ${cx + size} ${cy + size * 0.7}, ${cx} ${cy - size * 0.7}`}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={lineWeight}
            strokeLinejoin="round"
          />
          {labelText && (
            <text
              x={cx}
              y={cy + 4}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={12}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )

    case 'car':
      return (
        <g>
          {/* Body */}
          <rect
            x={cx - size * 1.2}
            y={cy - size * 0.5}
            width={size * 2.4}
            height={size}
            rx={4}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={lineWeight}
          />
          {/* Roof */}
          <rect
            x={cx - size * 0.6}
            y={cy - size * 0.95}
            width={size * 1.2}
            height={size * 0.5}
            rx={3}
            fill={`${color}15`}
            stroke={color}
            strokeWidth={lineWeight * 0.8}
          />
          {/* Wheels */}
          <circle cx={cx - size * 0.7} cy={cy + size * 0.5} r={size * 0.2} fill={color} />
          <circle cx={cx + size * 0.7} cy={cy + size * 0.5} r={size * 0.2} fill={color} />
          {labelText && (
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )

    case 'person':
      return (
        <g>
          {/* Head */}
          <circle cx={cx} cy={cy - size * 0.7} r={size * 0.3} fill={`${color}30`} stroke={color} strokeWidth={lineWeight} />
          {/* Body */}
          <line x1={cx} y1={cy - size * 0.4} x2={cx} y2={cy + size * 0.2} stroke={color} strokeWidth={lineWeight} />
          {/* Arms */}
          <line x1={cx - size * 0.4} y1={cy - size * 0.1} x2={cx + size * 0.4} y2={cy - size * 0.1} stroke={color} strokeWidth={lineWeight} />
          {/* Legs */}
          <line x1={cx} y1={cy + size * 0.2} x2={cx - size * 0.3} y2={cy + size * 0.7} stroke={color} strokeWidth={lineWeight} />
          <line x1={cx} y1={cy + size * 0.2} x2={cx + size * 0.3} y2={cy + size * 0.7} stroke={color} strokeWidth={lineWeight} />
          {labelText && (
            <text
              x={cx}
              y={cy + size * 0.95}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )

    case 'block':
    default:
      return (
        <g>
          <rect
            x={cx - size}
            y={cy - size}
            width={size * 2}
            height={size * 2}
            rx={3}
            fill={`${color}20`}
            stroke={color}
            strokeWidth={lineWeight}
          />
          {labelText && (
            <text
              x={cx}
              y={cy + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={13}
              fontWeight={600}
              className="fill-gray-700 dark:fill-gray-300"
            >
              {labelText}
            </text>
          )}
        </g>
      )
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FBD({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'physics',
  language = 'en',
  initialStep,
}: FBDProps) {
  const { object, forces, title, showForceMagnitudes = false, stepConfig: dataStepConfig } = data

  // Determine object center in SVG coords
  const cx = width / 2
  const cy = height / 2

  // Build step definitions based on stepConfig or default progressive reveal
  const stepDefs = useMemo(() => {
    if (dataStepConfig && dataStepConfig.length > 0) {
      // Custom step config: step 0 = object, then custom steps for forces
      const defs: Array<{ id: string; label: string; labelHe: string; visibleForces: string[]; highlightForces: string[] }> = [
        {
          id: 'object',
          label: DEFAULT_STEP_LABELS.object.en,
          labelHe: DEFAULT_STEP_LABELS.object.he,
          visibleForces: [],
          highlightForces: [],
        },
      ]
      dataStepConfig.forEach((sc) => {
        defs.push({
          id: `step-${sc.step}`,
          label: sc.stepLabel,
          labelHe: sc.stepLabelHe || sc.stepLabel,
          visibleForces: sc.visibleForces,
          highlightForces: sc.highlightForces || [],
        })
      })
      return defs
    }

    // Default: object first, then add forces one by one
    const defs: Array<{ id: string; label: string; labelHe: string; visibleForces: string[]; highlightForces: string[] }> = [
      {
        id: 'object',
        label: DEFAULT_STEP_LABELS.object.en,
        labelHe: DEFAULT_STEP_LABELS.object.he,
        visibleForces: [],
        highlightForces: [],
      },
    ]
    forces.forEach((force, i) => {
      const allVisibleSoFar = forces.slice(0, i + 1).map((f) => f.name)
      defs.push({
        id: `force-${force.name}`,
        label: `${language === 'he' ? 'הוספת' : 'Add'} ${force.symbol}`,
        labelHe: `${language === 'he' ? 'הוספת' : 'Add'} ${force.symbol}`,
        visibleForces: allVisibleSoFar,
        highlightForces: [force.name],
      })
    })
    return defs
  }, [dataStepConfig, forces, language])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  const primaryColor = diagram.colors.primary
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Compute which forces are visible at the current step
  const visibleForceNames = useMemo(() => {
    // Accumulate all visible forces up to current step
    const names = new Set<string>()
    for (let i = 0; i <= diagram.currentStep; i++) {
      stepDefs[i]?.visibleForces?.forEach((n) => names.add(n))
    }
    return names
  }, [diagram.currentStep, stepDefs])

  const highlightForceNames = useMemo(() => {
    return new Set(currentStepDef?.highlightForces || [])
  }, [currentStepDef])

  // Scale arrow length: normalize based on max magnitude
  const maxMagnitude = Math.max(...forces.map((f) => f.magnitude), 1)
  const maxArrowLen = Math.min(width, height) * 0.3
  const minArrowLen = 30
  const objectSize = 30

  const getArrowLength = (magnitude: number) => {
    return minArrowLen + (magnitude / maxMagnitude) * (maxArrowLen - minArrowLen)
  }

  const objectColor = object.color || primaryColor

  return (
    <div
      data-testid="free-body-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* Title */}
      {title && (
        <div
          data-testid="fbd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* SVG Diagram */}
      <svg
        data-testid="fbd-svg"
        viewBox={`0 0 ${width} ${height}`}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw object */}
        <AnimatePresence>
          {diagram.currentStep >= 0 && (
            <motion.g
              data-testid="fbd-object"
              initial="hidden"
              animate={diagram.currentStep === 0 ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderObject(
                object.type,
                cx,
                cy,
                objectSize,
                objectColor,
                diagram.lineWeight,
                object.label,
                object.mass
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Force arrows */}
        <AnimatePresence>
          {forces.map((force, _i) => {
            if (!visibleForceNames.has(force.name)) return null

            const arrowLen = getArrowLength(force.magnitude)
            const end = getArrowEnd(cx, cy, force.angle, arrowLen)
            const forceColor = force.color || FORCE_COLORS[force.type] || accentColor
            const isHighlighted = highlightForceNames.has(force.name)

            // Label position: slightly beyond the arrow tip
            const labelEnd = getArrowEnd(cx, cy, force.angle, arrowLen + 14)

            // Build label text
            let labelText = force.symbol
            if (force.subscript) {
              labelText += force.subscript
            }
            if (showForceMagnitudes) {
              labelText += ` = ${force.magnitude} N`
            }

            return (
              <motion.g
                key={force.name}
                data-testid={`fbd-force-${force.name}`}
                initial="hidden"
                animate={isHighlighted ? 'spotlight' : 'visible'}
                variants={createSpotlightVariants(forceColor)}
              >
                {/* Arrow shaft */}
                <motion.line
                  x1={cx}
                  y1={cy}
                  x2={end.x}
                  y2={end.y}
                  stroke={forceColor}
                  strokeWidth={diagram.lineWeight + 0.5}
                  strokeLinecap="round"
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />

                {/* Arrowhead */}
                <motion.path
                  d={arrowheadPath(end.x, end.y, force.angle, 10)}
                  fill={forceColor}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 500,
                    damping: 20,
                    delay: 0.3,
                  }}
                />

                {/* Label */}
                <motion.text
                  x={labelEnd.x}
                  y={labelEnd.y}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontWeight={600}
                  fill={forceColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {labelText}
                </motion.text>
              </motion.g>
            )
          })}
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

export default FBD
