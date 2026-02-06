'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { CrossSectionDiagramData } from '@/types/math'
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

interface CrossSectionDiagramProps {
  data: CrossSectionDiagramData
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
  solid: { en: 'Show 3D solid', he: 'הצגת הגוף התלת-ממדי' },
  plane: { en: 'Show cutting plane', he: 'הצגת מישור החיתוך' },
  section: { en: 'Highlight cross-section', he: 'סימון החתך' },
  result: { en: 'Resulting 2D shape', he: 'הצורה הדו-ממדית' },
}

// ---------------------------------------------------------------------------
// Solid names
// ---------------------------------------------------------------------------

const SOLID_NAMES: Record<string, { en: string; he: string }> = {
  cube: { en: 'Cube', he: 'קוביה' },
  rectangular_prism: { en: 'Rectangular Prism', he: 'מנסרה מלבנית' },
  cylinder: { en: 'Cylinder', he: 'גליל' },
  cone: { en: 'Cone', he: 'חרוט' },
  sphere: { en: 'Sphere', he: 'כדור' },
  pyramid: { en: 'Pyramid', he: 'פירמידה' },
}

// ---------------------------------------------------------------------------
// Cross-section result shapes
// ---------------------------------------------------------------------------

function getCrossSectionShape(solid: string, plane: string): { en: string; he: string } {
  const shapes: Record<string, Record<string, { en: string; he: string }>> = {
    cube: {
      horizontal: { en: 'Square', he: 'ריבוע' },
      vertical: { en: 'Square', he: 'ריבוע' },
      diagonal: { en: 'Rectangle', he: 'מלבן' },
    },
    rectangular_prism: {
      horizontal: { en: 'Rectangle', he: 'מלבן' },
      vertical: { en: 'Rectangle', he: 'מלבן' },
      diagonal: { en: 'Rectangle', he: 'מלבן' },
    },
    cylinder: {
      horizontal: { en: 'Circle', he: 'עיגול' },
      vertical: { en: 'Rectangle', he: 'מלבן' },
      diagonal: { en: 'Ellipse', he: 'אליפסה' },
    },
    cone: {
      horizontal: { en: 'Circle', he: 'עיגול' },
      vertical: { en: 'Triangle', he: 'משולש' },
      diagonal: { en: 'Ellipse', he: 'אליפסה' },
    },
    sphere: {
      horizontal: { en: 'Circle', he: 'עיגול' },
      vertical: { en: 'Circle', he: 'עיגול' },
      diagonal: { en: 'Circle', he: 'עיגול' },
    },
    pyramid: {
      horizontal: { en: 'Square', he: 'ריבוע' },
      vertical: { en: 'Triangle', he: 'משולש' },
      diagonal: { en: 'Trapezoid', he: 'טרפז' },
    },
  }
  return shapes[solid]?.[plane] ?? { en: 'Shape', he: 'צורה' }
}

// ---------------------------------------------------------------------------
// Isometric solid generators
// ---------------------------------------------------------------------------

interface SolidGeometry {
  outline: string
  fill: string
  type: 'path' | 'ellipse'
  ellipseData?: { cx: number; cy: number; rx: number; ry: number }
}

function generateSolidOutline(solid: string, cx: number, cy: number, size: number): SolidGeometry[] {
  const s = size
  const halfS = s / 2
  const isoX = s * 0.5
  const isoY = s * 0.3

  switch (solid) {
    case 'cube':
    case 'rectangular_prism':
      return [{
        type: 'path',
        outline: [
          `M${cx},${cy - isoY}`, // top
          `L${cx + isoX},${cy}`, // right
          `L${cx},${cy + isoY}`, // bottom
          `L${cx - isoX},${cy}`, // left
          `Z`,
          `M${cx},${cy - isoY}`,
          `L${cx},${cy - isoY - halfS}`,
          `L${cx + isoX},${cy - halfS}`,
          `L${cx + isoX},${cy}`,
          `M${cx},${cy - isoY - halfS}`,
          `L${cx - isoX},${cy - halfS}`,
          `L${cx - isoX},${cy}`,
        ].join(' '),
        fill: 'transparent',
      }]
    case 'cylinder':
      return [
        {
          type: 'path',
          outline: `M${cx - halfS},${cy - halfS} L${cx - halfS},${cy + halfS * 0.3} M${cx + halfS},${cy - halfS} L${cx + halfS},${cy + halfS * 0.3}`,
          fill: 'transparent',
        },
        {
          type: 'ellipse',
          outline: '',
          fill: 'transparent',
          ellipseData: { cx, cy: cy - halfS, rx: halfS, ry: halfS * 0.3 },
        },
        {
          type: 'ellipse',
          outline: '',
          fill: 'transparent',
          ellipseData: { cx, cy: cy + halfS * 0.3, rx: halfS, ry: halfS * 0.3 },
        },
      ]
    case 'cone':
      return [{
        type: 'path',
        outline: [
          `M${cx},${cy - halfS * 1.2}`,
          `L${cx - halfS},${cy + halfS * 0.3}`,
          `A${halfS},${halfS * 0.3} 0 0,0 ${cx + halfS},${cy + halfS * 0.3}`,
          `Z`,
        ].join(' '),
        fill: 'transparent',
      }]
    case 'sphere':
      return [
        {
          type: 'ellipse',
          outline: '',
          fill: 'transparent',
          ellipseData: { cx, cy, rx: halfS, ry: halfS },
        },
      ]
    case 'pyramid':
      return [{
        type: 'path',
        outline: [
          `M${cx},${cy - halfS * 1.2}`, // apex
          `L${cx - isoX},${cy + isoY * 0.5}`, // front-left
          `L${cx},${cy + isoY * 1.2}`, // front
          `L${cx + isoX},${cy + isoY * 0.5}`, // front-right
          `Z`,
          `M${cx},${cy - halfS * 1.2}`,
          `L${cx},${cy + isoY * 1.2}`,
        ].join(' '),
        fill: 'transparent',
      }]
    default:
      return [{
        type: 'path',
        outline: `M${cx - halfS},${cy - halfS} L${cx + halfS},${cy - halfS} L${cx + halfS},${cy + halfS} L${cx - halfS},${cy + halfS} Z`,
        fill: 'transparent',
      }]
  }
}

// ---------------------------------------------------------------------------
// Cutting plane geometry
// ---------------------------------------------------------------------------

function generateCuttingPlane(plane: string, cx: number, cy: number, size: number): string {
  const s = size * 0.6
  switch (plane) {
    case 'horizontal':
      return `M${cx - s},${cy} L${cx - s * 0.3},${cy - s * 0.2} L${cx + s * 0.7},${cy - s * 0.2} L${cx + s},${cy} L${cx + s * 0.3},${cy + s * 0.2} L${cx - s * 0.7},${cy + s * 0.2} Z`
    case 'vertical':
      return `M${cx - s * 0.1},${cy - s * 0.8} L${cx + s * 0.1},${cy - s * 0.8} L${cx + s * 0.1},${cy + s * 0.5} L${cx - s * 0.1},${cy + s * 0.5} Z`
    case 'diagonal':
      return `M${cx - s * 0.7},${cy - s * 0.3} L${cx + s * 0.3},${cy - s * 0.8} L${cx + s * 0.7},${cy + s * 0.3} L${cx - s * 0.3},${cy + s * 0.8} Z`
    default:
      return `M${cx - s},${cy} L${cx + s},${cy}`
  }
}

// ---------------------------------------------------------------------------
// 2D result shape SVG
// ---------------------------------------------------------------------------

function generate2DShape(shapeName: string, cx: number, cy: number, size: number): string {
  const s = size * 0.4
  const enLower = shapeName.toLowerCase()
  switch (enLower) {
    case 'circle':
      // Approximation with path for animation
      return `M${cx},${cy - s} A${s},${s} 0 1,1 ${cx},${cy + s} A${s},${s} 0 1,1 ${cx},${cy - s}`
    case 'square':
      return `M${cx - s},${cy - s} L${cx + s},${cy - s} L${cx + s},${cy + s} L${cx - s},${cy + s} Z`
    case 'rectangle':
      return `M${cx - s * 1.3},${cy - s * 0.7} L${cx + s * 1.3},${cy - s * 0.7} L${cx + s * 1.3},${cy + s * 0.7} L${cx - s * 1.3},${cy + s * 0.7} Z`
    case 'triangle':
      return `M${cx},${cy - s} L${cx + s},${cy + s * 0.7} L${cx - s},${cy + s * 0.7} Z`
    case 'ellipse':
      return `M${cx},${cy - s * 0.6} A${s * 1.2},${s * 0.6} 0 1,1 ${cx},${cy + s * 0.6} A${s * 1.2},${s * 0.6} 0 1,1 ${cx},${cy - s * 0.6}`
    case 'trapezoid':
      return `M${cx - s * 0.5},${cy - s * 0.7} L${cx + s * 0.5},${cy - s * 0.7} L${cx + s},${cy + s * 0.7} L${cx - s},${cy + s * 0.7} Z`
    default:
      return `M${cx - s},${cy - s} L${cx + s},${cy - s} L${cx + s},${cy + s} L${cx - s},${cy + s} Z`
  }
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CrossSectionDiagram({
  data,
  className = '',
  width = 500,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: CrossSectionDiagramProps) {
  const { solid, plane, title } = data

  const stepDefs = useMemo(() => [
    { id: 'solid', label: STEP_LABELS.solid.en, labelHe: STEP_LABELS.solid.he },
    { id: 'plane', label: STEP_LABELS.plane.en, labelHe: STEP_LABELS.plane.he },
    { id: 'section', label: STEP_LABELS.section.en, labelHe: STEP_LABELS.section.he },
    { id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he },
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
  const accentColor = diagram.colors.accent

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const svgWidth = width
  const svgHeight = height
  const solidCx = svgWidth * 0.35
  const solidCy = svgHeight * 0.45
  const solidSize = Math.min(svgWidth, svgHeight) * 0.35
  const resultCx = svgWidth * 0.78
  const resultCy = svgHeight * 0.45

  const solidName = SOLID_NAMES[solid]?.[language] ?? solid
  const crossSectionShape = getCrossSectionShape(solid, plane)
  const resultShapeName = crossSectionShape[language]
  const resultShapeEn = crossSectionShape.en

  const solidGeometry = useMemo(
    () => generateSolidOutline(solid, solidCx, solidCy, solidSize),
    [solid, solidCx, solidCy, solidSize]
  )

  const cuttingPlanePath = useMemo(
    () => generateCuttingPlane(plane, solidCx, solidCy, solidSize),
    [plane, solidCx, solidCy, solidSize]
  )

  const resultPath = useMemo(
    () => generate2DShape(resultShapeEn, resultCx, resultCy, solidSize),
    [resultShapeEn, resultCx, resultCy, solidSize]
  )

  return (
    <div
      data-testid="cross-section-diagram"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="csd-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="csd-svg"
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        width="100%"
        height="auto"
        className="overflow-visible"
      >
        {/* Step 0: 3D solid */}
        <AnimatePresence>
          {isVisible('solid') && (
            <motion.g
              data-testid="csd-solid"
              initial="hidden"
              animate={isCurrent('solid') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {solidGeometry.map((geom, i) =>
                geom.type === 'ellipse' && geom.ellipseData ? (
                  <ellipse
                    key={`solid-${i}`}
                    cx={geom.ellipseData.cx}
                    cy={geom.ellipseData.cy}
                    rx={geom.ellipseData.rx}
                    ry={geom.ellipseData.ry}
                    fill={hexToRgba(primaryColor, 0.05)}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight}
                  />
                ) : (
                  <motion.path
                    key={`solid-${i}`}
                    d={geom.outline}
                    fill={hexToRgba(primaryColor, 0.05)}
                    stroke={primaryColor}
                    strokeWidth={diagram.lineWeight}
                    strokeLinejoin="round"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                  />
                )
              )}
              <text
                x={solidCx}
                y={solidCy + solidSize * 0.7}
                textAnchor="middle"
                fontSize={13}
                fontWeight={600}
                className="fill-gray-700 dark:fill-gray-300"
              >
                {solidName}
              </text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Cutting plane */}
        <AnimatePresence>
          {isVisible('plane') && (
            <motion.g
              data-testid="csd-plane"
              initial="hidden"
              animate={isCurrent('plane') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={cuttingPlanePath}
                fill={hexToRgba(accentColor, 0.15)}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6 3"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.6 }}
              />
              <motion.text
                x={solidCx + solidSize * 0.6}
                y={solidCy - solidSize * 0.5}
                textAnchor="start"
                fontSize={11}
                fontWeight={500}
                fill={accentColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? `חתך ${plane}` : `${plane} cut`}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Highlight cross-section on solid */}
        <AnimatePresence>
          {isVisible('section') && (
            <motion.g
              data-testid="csd-section"
              initial="hidden"
              animate={isCurrent('section') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={cuttingPlanePath}
                fill={hexToRgba(primaryColor, 0.35)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight + 1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />

              {/* Arrow pointing to result */}
              <motion.line
                x1={solidCx + solidSize * 0.55}
                y1={solidCy}
                x2={resultCx - solidSize * 0.45}
                y2={resultCy}
                stroke="#9ca3af"
                strokeWidth={2}
                strokeDasharray="6 3"
                markerEnd="url(#arrowhead)"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.3 }}
              />

              {/* Arrowhead marker */}
              <defs>
                <marker
                  id="arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="9"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="#9ca3af" />
                </marker>
              </defs>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Resulting 2D shape */}
        <AnimatePresence>
          {isVisible('result') && (
            <motion.g
              data-testid="csd-result"
              initial="hidden"
              animate={isCurrent('result') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={resultPath}
                fill={hexToRgba(primaryColor, 0.2)}
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight + 1}
                strokeLinejoin="round"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 200, damping: 20 }}
              />
              <motion.text
                x={resultCx}
                y={resultCy + solidSize * 0.55}
                textAnchor="middle"
                fontSize={14}
                fontWeight={700}
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {resultShapeName}
              </motion.text>

              <motion.text
                x={resultCx}
                y={resultCy + solidSize * 0.72}
                textAnchor="middle"
                fontSize={11}
                fill="#6b7280"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'חתך רוחב' : 'Cross-section'}
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
          subjectColor={primaryColor}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default CrossSectionDiagram
