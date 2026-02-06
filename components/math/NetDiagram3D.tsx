'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { NetDiagram3DData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import { hexToRgba } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NetDiagram3DProps {
  data: NetDiagram3DData
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
  shape3d: { en: 'Show 3D shape', he: 'הצגת הגוף התלת-ממדי' },
  unfold: { en: 'Unfold the net', he: 'פריסת הרשת' },
  labels: { en: 'Show dimensions', he: 'הצגת מידות' },
}

// ---------------------------------------------------------------------------
// Shape name translations
// ---------------------------------------------------------------------------

const SHAPE_NAMES: Record<string, { en: string; he: string }> = {
  cube: { en: 'Cube', he: 'קוביה' },
  rectangular_prism: { en: 'Rectangular Prism', he: 'מנסרה מלבנית' },
  triangular_prism: { en: 'Triangular Prism', he: 'מנסרה משולשת' },
  cylinder: { en: 'Cylinder', he: 'גליל' },
  cone: { en: 'Cone', he: 'חרוט' },
  pyramid: { en: 'Pyramid', he: 'פירמידה' },
}

// ---------------------------------------------------------------------------
// Face colors
// ---------------------------------------------------------------------------

const FACE_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#f59e0b', // amber
  '#8b5cf6', // purple
  '#06b6d4', // cyan
]

// ---------------------------------------------------------------------------
// Net geometry generators
// ---------------------------------------------------------------------------

interface Face {
  points: string
  label?: string
  color: string
}

function generateCubeNet(s: number, baseX: number, baseY: number): Face[] {
  // Cross-shaped net for cube
  return [
    { points: `${baseX},${baseY} ${baseX + s},${baseY} ${baseX + s},${baseY + s} ${baseX},${baseY + s}`, label: 'Top', color: FACE_COLORS[0] },
    { points: `${baseX},${baseY + s} ${baseX + s},${baseY + s} ${baseX + s},${baseY + 2 * s} ${baseX},${baseY + 2 * s}`, label: 'Front', color: FACE_COLORS[1] },
    { points: `${baseX - s},${baseY + s} ${baseX},${baseY + s} ${baseX},${baseY + 2 * s} ${baseX - s},${baseY + 2 * s}`, label: 'Left', color: FACE_COLORS[2] },
    { points: `${baseX + s},${baseY + s} ${baseX + 2 * s},${baseY + s} ${baseX + 2 * s},${baseY + 2 * s} ${baseX + s},${baseY + 2 * s}`, label: 'Right', color: FACE_COLORS[3] },
    { points: `${baseX + 2 * s},${baseY + s} ${baseX + 3 * s},${baseY + s} ${baseX + 3 * s},${baseY + 2 * s} ${baseX + 2 * s},${baseY + 2 * s}`, label: 'Back', color: FACE_COLORS[4] },
    { points: `${baseX},${baseY + 2 * s} ${baseX + s},${baseY + 2 * s} ${baseX + s},${baseY + 3 * s} ${baseX},${baseY + 3 * s}`, label: 'Bottom', color: FACE_COLORS[5] },
  ]
}

function generateRectPrismNet(l: number, w: number, h: number, baseX: number, baseY: number): Face[] {
  return [
    { points: `${baseX},${baseY} ${baseX + l},${baseY} ${baseX + l},${baseY + w} ${baseX},${baseY + w}`, label: 'Top', color: FACE_COLORS[0] },
    { points: `${baseX},${baseY + w} ${baseX + l},${baseY + w} ${baseX + l},${baseY + w + h} ${baseX},${baseY + w + h}`, label: 'Front', color: FACE_COLORS[1] },
    { points: `${baseX - h},${baseY + w} ${baseX},${baseY + w} ${baseX},${baseY + w + h} ${baseX - h},${baseY + w + h}`, label: 'Left', color: FACE_COLORS[2] },
    { points: `${baseX + l},${baseY + w} ${baseX + l + h},${baseY + w} ${baseX + l + h},${baseY + w + h} ${baseX + l},${baseY + w + h}`, label: 'Right', color: FACE_COLORS[3] },
    { points: `${baseX + l + h},${baseY + w} ${baseX + l + 2 * h},${baseY + w} ${baseX + l + 2 * h},${baseY + w + h} ${baseX + l + h},${baseY + w + h}`, label: 'Back', color: FACE_COLORS[4] },
    { points: `${baseX},${baseY + w + h} ${baseX + l},${baseY + w + h} ${baseX + l},${baseY + 2 * w + h} ${baseX},${baseY + 2 * w + h}`, label: 'Bottom', color: FACE_COLORS[5] },
  ]
}

function generatePyramidNet(base: number, slantH: number, baseX: number, baseY: number): Face[] {
  const half = base / 2
  const triH = slantH
  return [
    // Base square
    { points: `${baseX},${baseY} ${baseX + base},${baseY} ${baseX + base},${baseY + base} ${baseX},${baseY + base}`, label: 'Base', color: FACE_COLORS[0] },
    // Top triangle
    { points: `${baseX},${baseY} ${baseX + base},${baseY} ${baseX + half},${baseY - triH}`, label: 'Face', color: FACE_COLORS[1] },
    // Bottom triangle
    { points: `${baseX},${baseY + base} ${baseX + base},${baseY + base} ${baseX + half},${baseY + base + triH}`, label: 'Face', color: FACE_COLORS[2] },
    // Left triangle
    { points: `${baseX},${baseY} ${baseX},${baseY + base} ${baseX - triH},${baseY + half}`, label: 'Face', color: FACE_COLORS[3] },
    // Right triangle
    { points: `${baseX + base},${baseY} ${baseX + base},${baseY + base} ${baseX + base + triH},${baseY + half}`, label: 'Face', color: FACE_COLORS[4] },
  ]
}

// ---------------------------------------------------------------------------
// Simple 3D shape outlines (isometric)
// ---------------------------------------------------------------------------

function generateIsometricCube(s: number, cx: number, cy: number): string {
  // Simple isometric cube
  const dx = s * 0.5
  const dy = s * 0.3
  return [
    // Front face
    `M${cx - dx},${cy} L${cx},${cy + dy} L${cx + dx},${cy} L${cx},${cy - dy} Z`,
    // Top face
    `M${cx},${cy - dy} L${cx + dx},${cy} L${cx + dx},${cy - s * 0.4} L${cx},${cy - dy - s * 0.4} Z`,
    // Right face
    `M${cx + dx},${cy} L${cx + dx},${cy - s * 0.4} L${cx},${cy - dy - s * 0.4} L${cx - dx},${cy - s * 0.4} Z`,
  ].join(' ')
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function NetDiagram3D({
  data,
  className = '',
  width = 500,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: NetDiagram3DProps) {
  const { shape, dimensions, title, showFoldLines, showLabels } = data

  const stepDefs = useMemo(() => [
    { id: 'shape3d', label: STEP_LABELS.shape3d.en, labelHe: STEP_LABELS.shape3d.he },
    { id: 'unfold', label: STEP_LABELS.unfold.en, labelHe: STEP_LABELS.unfold.he },
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
  const isCurrent = (id: string) => stepIndexOf(id) === diagram.currentStep

  const primaryColor = diagram.colors.primary

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const svgWidth = width
  const svgHeight = height
  const shapeName = SHAPE_NAMES[shape]?.[language] ?? shape

  // Generate net faces based on shape type
  const faces = useMemo((): Face[] => {
    const scale = Math.min(svgWidth, svgHeight) * 0.18
    const centerX = svgWidth / 2
    const centerY = svgHeight / 2

    switch (shape) {
      case 'cube': {
        const s = dimensions.side ?? scale
        const unitS = Math.min(s, scale)
        return generateCubeNet(unitS, centerX - unitS * 0.5, centerY - unitS * 1.2)
      }
      case 'rectangular_prism': {
        const l = Math.min((dimensions.length ?? scale), scale)
        const w = Math.min((dimensions.width ?? scale * 0.6), scale * 0.6)
        const h = Math.min((dimensions.height ?? scale * 0.8), scale * 0.8)
        return generateRectPrismNet(l, w, h, centerX - l * 0.3, centerY - (w + h) * 0.4)
      }
      case 'pyramid': {
        const base = Math.min((dimensions.base ?? scale), scale)
        const slant = Math.min((dimensions.slantHeight ?? scale * 0.8), scale * 0.8)
        return generatePyramidNet(base, slant, centerX - base / 2, centerY - base / 2)
      }
      default: {
        // Fallback: simple cube net
        const s = scale
        return generateCubeNet(s, centerX - s * 0.5, centerY - s * 1.2)
      }
    }
  }, [shape, dimensions, svgWidth, svgHeight])

  // Simple 3D outline path
  const shape3dPath = useMemo(() => {
    const scale = Math.min(svgWidth, svgHeight) * 0.25
    return generateIsometricCube(scale, svgWidth / 2, svgHeight / 2)
  }, [svgWidth, svgHeight])

  return (
    <div
      data-testid="net-diagram-3d"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="nd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      {/* Shape name label */}
      <div className="text-sm text-gray-500 dark:text-gray-400 text-center mb-2">
        {shapeName}
      </div>

      <svg
        data-testid="nd-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: 3D shape outline */}
        <AnimatePresence>
          {isVisible('shape3d') && !isVisible('unfold') && (
            <motion.g
              data-testid="nd-shape3d"
              initial="hidden"
              animate={isCurrent('shape3d') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={shape3dPath}
                fill={hexToRgba(primaryColor, 0.1)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 1 }}
                transition={{ duration: 1, ease: 'easeInOut' }}
              />
              <text
                x={svgWidth / 2}
                y={svgHeight - 20}
                textAnchor="middle"
                fontSize={13}
                fill="#6b7280"
              >
                {language === 'he' ? 'גוף תלת-ממדי' : '3D Shape'}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Flat net with unfold animation */}
        <AnimatePresence>
          {isVisible('unfold') && (
            <motion.g
              data-testid="nd-net"
              initial="hidden"
              animate={isCurrent('unfold') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {faces.map((face, i) => (
                <motion.polygon
                  key={`face-${i}`}
                  points={face.points}
                  fill={hexToRgba(face.color, 0.25)}
                  stroke={face.color}
                  strokeWidth={diagram.lineWeight}
                  strokeLinejoin="round"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, delay: Math.min(i * 0.12, 1.5), type: 'spring', stiffness: 200, damping: 20 }}
                />
              ))}

              {/* Fold lines */}
              {(showFoldLines !== false) && faces.length > 1 && (
                <g opacity={0.4}>
                  {/* Shared edges shown as dashed */}
                </g>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Dimension labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="nd-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {faces.map((face, i) => {
                // Parse polygon center for label placement
                const pts = face.points.split(' ').map((p) => {
                  const [x, y] = p.split(',').map(Number)
                  return { x, y }
                })
                const avgX = pts.reduce((s, p) => s + p.x, 0) / pts.length
                const avgY = pts.reduce((s, p) => s + p.y, 0) / pts.length
                return (
                  <motion.text
                    key={`flabel-${i}`}
                    x={avgX}
                    y={avgY + 4}
                    textAnchor="middle"
                    fontSize={11}
                    fontWeight={600}
                    fill={face.color}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {face.label}
                  </motion.text>
                )
              })}

              {/* Dimension values */}
              {Object.entries(dimensions).map(([key, value], i) => (
                <motion.text
                  key={`dim-${key}`}
                  x={20 + i * 100}
                  y={svgHeight - 10}
                  textAnchor="start"
                  fontSize={12}
                  fontWeight={500}
                  fill={primaryColor}
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {key}: {value}
                </motion.text>
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

export default NetDiagram3D
