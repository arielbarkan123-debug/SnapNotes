'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from 'next-themes'
import type { UnitCircleData, UnitCircleErrorHighlight } from '@/types'
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
import { radianToLatex, fractionToLatex } from '@/lib/normalize-latex'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UnitCircleDataWithErrors extends UnitCircleData {
  errorHighlight?: UnitCircleErrorHighlight
}

interface UnitCircleProps {
  data: UnitCircleDataWithErrors
  className?: string
  /** ViewBox width — SVG scales responsively to container */
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  /** Override the starting step (defaults to 0 for progressive reveal) */
  initialStep?: number
}

// ---------------------------------------------------------------------------
// Standard angles lookup
// ---------------------------------------------------------------------------

const STANDARD_ANGLES = [
  { degrees: 0, radians: '0', cos: '1', sin: '0', radiansLatex: '0', cosLatex: '1', sinLatex: '0' },
  { degrees: 30, radians: '\u03C0/6', cos: '\u221A3/2', sin: '1/2', radiansLatex: '\\frac{\\pi}{6}', cosLatex: '\\frac{\\sqrt{3}}{2}', sinLatex: '\\frac{1}{2}' },
  { degrees: 45, radians: '\u03C0/4', cos: '\u221A2/2', sin: '\u221A2/2', radiansLatex: '\\frac{\\pi}{4}', cosLatex: '\\frac{\\sqrt{2}}{2}', sinLatex: '\\frac{\\sqrt{2}}{2}' },
  { degrees: 60, radians: '\u03C0/3', cos: '1/2', sin: '\u221A3/2', radiansLatex: '\\frac{\\pi}{3}', cosLatex: '\\frac{1}{2}', sinLatex: '\\frac{\\sqrt{3}}{2}' },
  { degrees: 90, radians: '\u03C0/2', cos: '0', sin: '1', radiansLatex: '\\frac{\\pi}{2}', cosLatex: '0', sinLatex: '1' },
  { degrees: 120, radians: '2\u03C0/3', cos: '-1/2', sin: '\u221A3/2', radiansLatex: '\\frac{2\\pi}{3}', cosLatex: '-\\frac{1}{2}', sinLatex: '\\frac{\\sqrt{3}}{2}' },
  { degrees: 135, radians: '3\u03C0/4', cos: '-\u221A2/2', sin: '\u221A2/2', radiansLatex: '\\frac{3\\pi}{4}', cosLatex: '-\\frac{\\sqrt{2}}{2}', sinLatex: '\\frac{\\sqrt{2}}{2}' },
  { degrees: 150, radians: '5\u03C0/6', cos: '-\u221A3/2', sin: '1/2', radiansLatex: '\\frac{5\\pi}{6}', cosLatex: '-\\frac{\\sqrt{3}}{2}', sinLatex: '\\frac{1}{2}' },
  { degrees: 180, radians: '\u03C0', cos: '-1', sin: '0', radiansLatex: '\\pi', cosLatex: '-1', sinLatex: '0' },
  { degrees: 210, radians: '7\u03C0/6', cos: '-\u221A3/2', sin: '-1/2', radiansLatex: '\\frac{7\\pi}{6}', cosLatex: '-\\frac{\\sqrt{3}}{2}', sinLatex: '-\\frac{1}{2}' },
  { degrees: 225, radians: '5\u03C0/4', cos: '-\u221A2/2', sin: '-\u221A2/2', radiansLatex: '\\frac{5\\pi}{4}', cosLatex: '-\\frac{\\sqrt{2}}{2}', sinLatex: '-\\frac{\\sqrt{2}}{2}' },
  { degrees: 240, radians: '4\u03C0/3', cos: '-1/2', sin: '-\u221A3/2', radiansLatex: '\\frac{4\\pi}{3}', cosLatex: '-\\frac{1}{2}', sinLatex: '-\\frac{\\sqrt{3}}{2}' },
  { degrees: 270, radians: '3\u03C0/2', cos: '0', sin: '-1', radiansLatex: '\\frac{3\\pi}{2}', cosLatex: '0', sinLatex: '-1' },
  { degrees: 300, radians: '5\u03C0/3', cos: '1/2', sin: '-\u221A3/2', radiansLatex: '\\frac{5\\pi}{3}', cosLatex: '\\frac{1}{2}', sinLatex: '-\\frac{\\sqrt{3}}{2}' },
  { degrees: 315, radians: '7\u03C0/4', cos: '\u221A2/2', sin: '-\u221A2/2', radiansLatex: '\\frac{7\\pi}{4}', cosLatex: '\\frac{\\sqrt{2}}{2}', sinLatex: '-\\frac{\\sqrt{2}}{2}' },
  { degrees: 330, radians: '11\u03C0/6', cos: '\u221A3/2', sin: '-1/2', radiansLatex: '\\frac{11\\pi}{6}', cosLatex: '\\frac{\\sqrt{3}}{2}', sinLatex: '-\\frac{1}{2}' },
]

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  circle: { en: 'Draw the unit circle', he: '\u05E6\u05D9\u05D5\u05E8 \u05DE\u05E2\u05D2\u05DC \u05D4\u05D9\u05D7\u05D9\u05D3\u05D4' },
  axes: { en: 'Draw the axes', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05E6\u05D9\u05E8\u05D9\u05DD' },
  angles: { en: 'Mark the angles', he: '\u05E1\u05D9\u05DE\u05D5\u05DF \u05D4\u05D6\u05D5\u05D5\u05D9\u05D5\u05EA' },
  labels: { en: 'Show labels', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D5\u05D5\u05D9\u05D5\u05EA' },
  errors: { en: 'Show corrections', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D9\u05E7\u05D5\u05E0\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * UnitCircle -- Rebuilt following the Visual Learning Overhaul reference pattern.
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
 * - [x] Bilingual step labels
 * - [x] Progressive step-by-step reveal
 */
export function UnitCircle({
  data,
  className = '',
  width = 400,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: UnitCircleProps) {
  const {
    angles = [],
    showStandardAngles = false,
    highlightQuadrant,
    showSinCos = true,
    title,
    errorHighlight,
  } = data

  // Dark mode detection for SVG labels
  const { resolvedTheme } = useTheme()
  const colorMode: ColorMode = resolvedTheme === 'dark' ? 'dark' : 'light'

  // Determine which display angles exist
  const displayAngles = useMemo(() => {
    if (showStandardAngles) {
      return STANDARD_ANGLES.map((a) => ({
        degrees: a.degrees,
        radians: a.radians,
        radiansLatex: a.radiansLatex,
        showCoordinates: showSinCos,
        highlight: angles.some((ua) => ua.degrees === a.degrees && ua.highlight),
        cos: a.cos,
        sin: a.sin,
        cosLatex: a.cosLatex,
        sinLatex: a.sinLatex,
      }))
    }
    return angles.map((a) => {
      const std = STANDARD_ANGLES.find((s) => s.degrees === a.degrees)
      return {
        ...a,
        cos: std?.cos || Math.cos((a.degrees * Math.PI) / 180).toFixed(2),
        sin: std?.sin || Math.sin((a.degrees * Math.PI) / 180).toFixed(2),
        radiansLatex: std?.radiansLatex || radianToLatex(a.radians || ''),
        cosLatex: std?.cosLatex || fractionToLatex(std?.cos || Math.cos((a.degrees * Math.PI) / 180).toFixed(2)),
        sinLatex: std?.sinLatex || fractionToLatex(std?.sin || Math.sin((a.degrees * Math.PI) / 180).toFixed(2)),
      }
    })
  }, [angles, showStandardAngles, showSinCos])

  const hasAngles = displayAngles.length > 0
  const hasLabels = hasAngles && showSinCos
  const hasErrors = !!(
    errorHighlight?.wrongAngles?.length ||
    errorHighlight?.correctAngles?.length ||
    errorHighlight?.wrongValues?.length
  )

  // Dynamic step definitions based on data
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'circle', label: STEP_LABELS.circle.en, labelHe: STEP_LABELS.circle.he },
      { id: 'axes', label: STEP_LABELS.axes.en, labelHe: STEP_LABELS.axes.he },
    ]
    if (hasAngles) defs.push({ id: 'angles', label: STEP_LABELS.angles.en, labelHe: STEP_LABELS.angles.he })
    if (hasLabels) defs.push({ id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he })
    if (hasErrors) defs.push({ id: 'errors', label: STEP_LABELS.errors.en, labelHe: STEP_LABELS.errors.he })
    return defs
  }, [hasAngles, hasLabels, hasErrors])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'middle_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Convenience: step visibility helpers
  const stepIndexOf = (id: string) => stepDefs.findIndex((s) => s.id === id)
  const isVisible = (id: string) => {
    const idx = stepIndexOf(id)
    return idx !== -1 && diagram.currentStep >= idx
  }
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  // Subject-coded spotlight
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // ---------------------------------------------------------------------------
  // Geometry calculations
  // ---------------------------------------------------------------------------

  const padding = 60
  const center = { x: width / 2, y: height / 2 }
  const radius = Math.min(width, height) / 2 - padding

  const angleToPoint = (degrees: number): { x: number; y: number } => {
    const rad = (degrees * Math.PI) / 180
    return {
      x: center.x + radius * Math.cos(rad),
      y: center.y - radius * Math.sin(rad),
    }
  }

  // Quadrant highlighting paths
  const quadrantPaths: Record<1 | 2 | 3 | 4, string> = {
    1: `M ${center.x} ${center.y} L ${center.x + radius} ${center.y} A ${radius} ${radius} 0 0 0 ${center.x} ${center.y - radius} Z`,
    2: `M ${center.x} ${center.y} L ${center.x} ${center.y - radius} A ${radius} ${radius} 0 0 0 ${center.x - radius} ${center.y} Z`,
    3: `M ${center.x} ${center.y} L ${center.x - radius} ${center.y} A ${radius} ${radius} 0 0 0 ${center.x} ${center.y + radius} Z`,
    4: `M ${center.x} ${center.y} L ${center.x} ${center.y + radius} A ${radius} ${radius} 0 0 0 ${center.x + radius} ${center.y} Z`,
  }

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Circle path description for draw animation
  const circlePath = `M ${center.x + radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x - radius} ${center.y} A ${radius} ${radius} 0 1 0 ${center.x + radius} ${center.y}`

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="unit-circle"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      {/* SVG Diagram */}
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Unit circle${title ? `: ${title}` : ''}${hasAngles ? ` with ${displayAngles.length} angles` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="uc-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="uc-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Quadrant highlight (always visible if specified) */}
        {highlightQuadrant && (
          <path
            data-testid="uc-quadrant"
            d={quadrantPaths[highlightQuadrant]}
            fill={diagram.colors.primary}
            fillOpacity={0.15}
          />
        )}

        {/* -- Step 0: Unit Circle ----------------------------------------- */}
        <AnimatePresence>
          {isVisible('circle') && (
            <motion.g
              data-testid="uc-circle"
              initial="hidden"
              animate={isCurrent('circle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Circle path -- draws progressively */}
              <motion.path
                data-testid="uc-circle-path"
                d={circlePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Origin point */}
              <motion.circle
                cx={center.x}
                cy={center.y}
                r={diagram.lineWeight}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
              />

              {/* Origin label */}
              <motion.text
                x={center.x - 12}
                y={center.y + 15}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.6 }}
              >
                O
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Axes ------------------------------------------------ */}
        <AnimatePresence>
          {isVisible('axes') && (
            <motion.g
              data-testid="uc-axes"
              initial="hidden"
              animate={isCurrent('axes') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* X axis */}
              <motion.path
                data-testid="uc-x-axis"
                d={`M ${center.x - radius - 20} ${center.y} L ${center.x + radius + 20} ${center.y}`}
                stroke="currentColor"
                strokeWidth={Math.max(diagram.lineWeight - 0.5, 1)}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* X axis arrow */}
              <motion.polygon
                points={`${center.x + radius + 25},${center.y} ${center.x + radius + 15},${center.y - 5} ${center.x + radius + 15},${center.y + 5}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5, type: 'spring', stiffness: 300, damping: 20 }}
              />
              {/* X label */}
              <motion.text
                x={center.x + radius + 35}
                y={center.y + 5}
                className="fill-current text-sm"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.6 }}
              >
                x
              </motion.text>

              {/* Y axis */}
              <motion.path
                data-testid="uc-y-axis"
                d={`M ${center.x} ${center.y + radius + 20} L ${center.x} ${center.y - radius - 20}`}
                stroke="currentColor"
                strokeWidth={Math.max(diagram.lineWeight - 0.5, 1)}
                fill="none"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Y axis arrow */}
              <motion.polygon
                points={`${center.x},${center.y - radius - 25} ${center.x - 5},${center.y - radius - 15} ${center.x + 5},${center.y - radius - 15}`}
                fill="currentColor"
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7, type: 'spring', stiffness: 300, damping: 20 }}
              />
              {/* Y label */}
              <motion.text
                x={center.x + 10}
                y={center.y - radius - 25}
                className="fill-current text-sm"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
                transition={{ delay: 0.8 }}
              >
                y
              </motion.text>

              {/* Axis tick labels: 1, -1 on both axes */}
              <motion.text
                x={center.x + radius + 5}
                y={center.y + 15}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                1
              </motion.text>
              <motion.text
                x={center.x - radius - 15}
                y={center.y + 15}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                -1
              </motion.text>
              <motion.text
                x={center.x + 8}
                y={center.y - radius + 5}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                1
              </motion.text>
              <motion.text
                x={center.x + 8}
                y={center.y + radius + 12}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                -1
              </motion.text>

              {/* CAST quadrant labels */}
              <motion.text
                x={center.x + radius * 0.5}
                y={center.y - radius * 0.7}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                All +
              </motion.text>
              <motion.text
                x={center.x - radius * 0.5}
                y={center.y - radius * 0.7}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Sin +
              </motion.text>
              <motion.text
                x={center.x - radius * 0.5}
                y={center.y + radius * 0.75}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Tan +
              </motion.text>
              <motion.text
                x={center.x + radius * 0.5}
                y={center.y + radius * 0.75}
                textAnchor="middle"
                className="fill-gray-400 dark:fill-gray-500 text-xs font-medium"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                Cos +
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Angles (points & radius lines) ---------------------- */}
        <AnimatePresence>
          {hasAngles && isVisible('angles') && (
            <motion.g
              data-testid="uc-angles"
              initial="hidden"
              animate={isCurrent('angles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {displayAngles.map((angle, index) => {
                const point = angleToPoint(angle.degrees)
                const isHighlighted = angle.highlight
                const color = isHighlighted ? '#EF4444' : diagram.colors.primary

                return (
                  <motion.g
                    key={`angle-${index}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 300,
                      damping: 25,
                      delay: index * 0.05,
                    }}
                  >
                    {/* Radius line for highlighted angles */}
                    {isHighlighted && (
                      <motion.path
                        d={`M ${center.x} ${center.y} L ${point.x} ${point.y}`}
                        stroke={color}
                        strokeWidth={diagram.lineWeight}
                        fill="none"
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )}

                    {/* Point on circle */}
                    <circle
                      data-testid={`uc-angle-${angle.degrees}`}
                      cx={point.x}
                      cy={point.y}
                      r={isHighlighted ? diagram.lineWeight + 2 : diagram.lineWeight + 1}
                      fill={color}
                    />

                    {/* Angle arc for highlighted angles */}
                    {isHighlighted && angle.degrees !== 0 && (
                      <motion.path
                        d={`M ${center.x + 25} ${center.y} A 25 25 0 ${angle.degrees > 180 ? 1 : 0} 0 ${center.x + 25 * Math.cos((angle.degrees * Math.PI) / 180)} ${center.y - 25 * Math.sin((angle.degrees * Math.PI) / 180)}`}
                        fill="none"
                        stroke={color}
                        strokeWidth={diagram.lineWeight}
                        initial="hidden"
                        animate="visible"
                        variants={lineDrawVariants}
                      />
                    )}

                    {/* Radian label (KaTeX) */}
                    {(() => {
                      const labelOffset = 22
                      const rad = (angle.degrees * Math.PI) / 180
                      const labelX = center.x + (radius + labelOffset) * Math.cos(rad)
                      const labelY = center.y - (radius + labelOffset) * Math.sin(rad)
                      const textAnchor =
                        angle.degrees > 90 && angle.degrees < 270 ? 'end' as const : 'start' as const

                      return (
                        <DiagramMathLabel
                          latex={angle.radiansLatex || radianToLatex(angle.radians || '')}
                          x={labelX}
                          y={labelY}
                          fontSize={11}
                          color={isHighlighted ? '#EF4444' : diagram.colors.primary}
                          textAnchor={textAnchor}
                          animate={true}
                          animationDelay={(index * 50) + 200}
                          colorMode={colorMode}
                        />
                      )
                    })()}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: Labels (sin/cos coordinates + projections) ----------- */}
        <AnimatePresence>
          {hasLabels && isVisible('labels') && (
            <motion.g
              data-testid="uc-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {displayAngles.map((angle, index) => {
                if (angle.showCoordinates === false) return null
                const point = angleToPoint(angle.degrees)
                const labelOffset = 20
                const rad = (angle.degrees * Math.PI) / 180
                const labelX = center.x + (radius + labelOffset) * Math.cos(rad)
                const labelY = center.y - (radius + labelOffset) * Math.sin(rad)
                const textAnchor =
                  angle.degrees > 90 && angle.degrees < 270 ? 'end' : 'start'

                return (
                  <motion.g
                    key={`label-${index}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: index * 0.04 }}
                  >
                    {/* Coordinate label (KaTeX) */}
                    <DiagramMathLabel
                      latex={`(${angle.cosLatex || angle.cos},\\, ${angle.sinLatex || angle.sin})`}
                      x={labelX}
                      y={labelY + (angle.degrees > 0 && angle.degrees < 180 ? 12 : -12)}
                      fontSize={9}
                      color={diagram.backgrounds.light.textMuted}
                      textAnchor={textAnchor}
                      animate={true}
                      animationDelay={index * 40}
                    />

                    {/* Sin/Cos projections for highlighted angles */}
                    {angle.highlight && (
                      <>
                        {/* Sin projection (vertical dashed line to x-axis) */}
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={point.x}
                          y2={center.y}
                          stroke="#10B981"
                          strokeWidth={2}
                          strokeDasharray="4,4"
                        />
                        <motion.text
                          x={point.x}
                          y={center.y + (point.y < center.y ? 15 : -8)}
                          textAnchor="middle"
                          style={{ fill: '#10B981' }}
                          className="text-xs font-medium"
                          initial="hidden"
                          animate="visible"
                          variants={labelAppearVariants}
                        >
                          sin
                        </motion.text>

                        {/* Cos projection (horizontal dashed line to y-axis) */}
                        <line
                          x1={point.x}
                          y1={point.y}
                          x2={center.x}
                          y2={point.y}
                          stroke="#F59E0B"
                          strokeWidth={2}
                          strokeDasharray="4,4"
                        />
                        <motion.text
                          x={center.x + (point.x < center.x ? -8 : 8)}
                          y={point.y}
                          textAnchor={point.x < center.x ? 'end' : 'start'}
                          dominantBaseline="middle"
                          style={{ fill: '#F59E0B' }}
                          className="text-xs font-medium"
                          initial="hidden"
                          animate="visible"
                          variants={labelAppearVariants}
                        >
                          cos
                        </motion.text>
                      </>
                    )}
                  </motion.g>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 4: Error highlights ------------------------------------ */}
        <AnimatePresence>
          {hasErrors && isVisible('errors') && (
            <motion.g
              data-testid="uc-errors"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
            >
              {/* Wrong angles */}
              {errorHighlight?.wrongAngles?.map((degrees) => {
                const point = angleToPoint(degrees)
                return (
                  <g key={`wrong-angle-${degrees}`} data-testid={`uc-wrong-${degrees}`}>
                    <circle cx={point.x} cy={point.y} r={12} fill="#EF4444" opacity={0.2} />
                    <line
                      x1={point.x - 8}
                      y1={point.y - 8}
                      x2={point.x + 8}
                      y2={point.y + 8}
                      stroke="#EF4444"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                    <line
                      x1={point.x + 8}
                      y1={point.y - 8}
                      x2={point.x - 8}
                      y2={point.y + 8}
                      stroke="#EF4444"
                      strokeWidth={3}
                      strokeLinecap="round"
                    />
                  </g>
                )
              })}

              {/* Correct angles */}
              {errorHighlight?.correctAngles?.map((degrees) => {
                const point = angleToPoint(degrees)
                return (
                  <g key={`correct-angle-${degrees}`} data-testid={`uc-correct-${degrees}`}>
                    <circle cx={point.x} cy={point.y} r={12} fill="#22C55E" opacity={0.2} />
                    <circle cx={point.x} cy={point.y} r={7} fill="#22C55E" />
                    <path
                      d={`M ${point.x - 4} ${point.y} L ${point.x - 1} ${point.y + 4} L ${point.x + 5} ${point.y - 4}`}
                      stroke="white"
                      strokeWidth={2}
                      fill="none"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </g>
                )
              })}

              {/* Wrong sin/cos values */}
              {errorHighlight?.wrongValues?.map((item) => {
                const labelOffset = 35
                const rad = (item.angle * Math.PI) / 180
                const labelX = center.x + (radius + labelOffset) * Math.cos(rad)
                const labelY = center.y - (radius + labelOffset) * Math.sin(rad)

                return (
                  <g key={`wrong-value-${item.angle}`} data-testid={`uc-wrong-value-${item.angle}`}>
                    {item.wrongSin && (
                      <text
                        x={labelX}
                        y={labelY + 25}
                        textAnchor="middle"
                        className="fill-red-600 text-xs"
                        textDecoration="line-through"
                      >
                        sin = {item.wrongSin}
                      </text>
                    )}
                    {item.wrongCos && (
                      <text
                        x={labelX}
                        y={labelY + 38}
                        textAnchor="middle"
                        className="fill-red-600 text-xs"
                        textDecoration="line-through"
                      >
                        cos = {item.wrongCos}
                      </text>
                    )}
                  </g>
                )
              })}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default UnitCircle
