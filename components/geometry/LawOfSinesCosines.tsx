'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LawOfSinesCosinesData } from '@/types/geometry'
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
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  triangle: { en: 'Draw triangle', he: 'ציור המשולש' },
  labels: { en: 'Label known parts', he: 'סימון חלקים ידועים' },
  formula: { en: 'Show formula', he: 'הצגת הנוסחה' },
  substitution: { en: 'Substitute values', he: 'הצבת ערכים' },
  result: { en: 'Show result', he: 'הצגת התוצאה' },
}

interface LawOfSinesCosinesProps {
  data: LawOfSinesCosinesData
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
 * LawOfSinesCosines - SVG diagram for law of sines or cosines
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
export function LawOfSinesCosines({
  data,
  width = 400,
  height = 420,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: LawOfSinesCosinesProps) {
  const {
    triangle,
    law,
    solveFor,
    knownParts,
    showFormula = true,
    showSubstitution = true,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'triangle', label: STEP_LABELS.triangle.en, labelHe: STEP_LABELS.triangle.he },
      { id: 'labels', label: STEP_LABELS.labels.en, labelHe: STEP_LABELS.labels.he },
    ]
    if (showFormula) {
      defs.push({ id: 'formula', label: STEP_LABELS.formula.en, labelHe: STEP_LABELS.formula.he })
    }
    if (showSubstitution) {
      defs.push({ id: 'substitution', label: STEP_LABELS.substitution.en, labelHe: STEP_LABELS.substitution.he })
    }
    defs.push({ id: 'result', label: STEP_LABELS.result.en, labelHe: STEP_LABELS.result.he })
    return defs
  }, [showFormula, showSubstitution])

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

  // Triangle vertices in SVG space
  const padding = 60
  const svgVertices = useMemo(() => {
    const v = triangle.vertices
    // Normalize vertices into SVG space
    const xs = v.map((p) => p.x)
    const ys = v.map((p) => p.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const dataW = maxX - minX || 1
    const dataH = maxY - minY || 1
    const drawW = width - padding * 2
    const drawH = height - padding * 2 - 80
    const scale = Math.min(drawW / dataW, drawH / dataH)
    return v.map((p) => ({
      x: padding + (p.x - minX) * scale + (drawW - dataW * scale) / 2,
      y: padding + (p.y - minY) * scale + (drawH - dataH * scale) / 2,
      label: p.label || '',
    }))
  }, [triangle.vertices, width, height, padding])

  const trianglePath = `M ${svgVertices[0].x} ${svgVertices[0].y}
    L ${svgVertices[1].x} ${svgVertices[1].y}
    L ${svgVertices[2].x} ${svgVertices[2].y} Z`

  const sides = triangle.sides
  const angles = triangle.angles
  const sideLabels = ['a', 'b', 'c']
  const angleLabels = ['A', 'B', 'C']

  // Midpoints of sides for side labels (opposite side labeling)
  const sideMidpoints = [
    // side a opposite vertex A => midpoint of BC
    { x: (svgVertices[1].x + svgVertices[2].x) / 2, y: (svgVertices[1].y + svgVertices[2].y) / 2 },
    // side b opposite vertex B => midpoint of AC
    { x: (svgVertices[0].x + svgVertices[2].x) / 2, y: (svgVertices[0].y + svgVertices[2].y) / 2 },
    // side c opposite vertex C => midpoint of AB
    { x: (svgVertices[0].x + svgVertices[1].x) / 2, y: (svgVertices[0].y + svgVertices[1].y) / 2 },
  ]

  // Formula text
  const formulaText = useMemo(() => {
    if (law === 'sines') {
      return 'a/sin(A) = b/sin(B) = c/sin(C)'
    }
    return 'c² = a² + b² - 2ab·cos(C)'
  }, [law])

  const substitutionText = useMemo(() => {
    if (law === 'sines') {
      return `${sides[0]}/sin(${angles[0]}°) = ${sides[1]}/sin(${angles[1]}°)`
    }
    return `${sides[2]}² = ${sides[0]}² + ${sides[1]}² - 2(${sides[0]})(${sides[1]})·cos(${angles[2]}°)`
  }, [law, sides, angles])

  const resultText = useMemo(() => {
    if (law === 'sines') {
      if (solveFor === 'side') {
        const ratio = sides[0] / Math.sin((angles[0] * Math.PI) / 180)
        return `${language === 'he' ? 'יחס' : 'Ratio'} ≈ ${ratio.toFixed(2)}`
      }
      return `${language === 'he' ? 'זוויות' : 'Angles'}: ${angles.map((a) => `${a}°`).join(', ')}`
    }
    // Cosines result
    const c2 = sides[0] ** 2 + sides[1] ** 2 - 2 * sides[0] * sides[1] * Math.cos((angles[2] * Math.PI) / 180)
    const c = Math.sqrt(Math.abs(c2))
    return `c ≈ ${c.toFixed(2)}`
  }, [law, solveFor, sides, angles, language])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="law-of-sines-cosines-diagram"
      className={`geometry-law-of-sines-cosines ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Law of ${law} diagram${title ? `: ${title}` : ''}`}
      >
        {/* Background */}
        <rect
          data-testid="losc-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="losc-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: Draw triangle */}
        <AnimatePresence>
          {isVisible('triangle') && (
            <motion.g
              data-testid="losc-triangle"
              initial="hidden"
              animate={isCurrent('triangle') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={trianglePath}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.path
                data-testid="losc-triangle-path"
                d={trianglePath}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Vertex dots */}
              {svgVertices.map((v, i) => (
                <circle
                  key={`v-${i}`}
                  data-testid={`losc-vertex-${angleLabels[i]}`}
                  cx={v.x}
                  cy={v.y}
                  r={diagram.lineWeight + 1}
                  fill={diagram.colors.primary}
                />
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Labels */}
        <AnimatePresence>
          {isVisible('labels') && (
            <motion.g
              data-testid="losc-labels"
              initial="hidden"
              animate={isCurrent('labels') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Vertex labels */}
              {svgVertices.map((v, i) => {
                const cx = (svgVertices[0].x + svgVertices[1].x + svgVertices[2].x) / 3
                const cy = (svgVertices[0].y + svgVertices[1].y + svgVertices[2].y) / 3
                const dx = v.x - cx
                const dy = v.y - cy
                const dist = Math.sqrt(dx * dx + dy * dy) || 1
                const ox = (dx / dist) * 18
                const oy = (dy / dist) * 18
                const isKnown = knownParts.includes(angleLabels[i])
                return (
                  <motion.text
                    key={`label-${i}`}
                    data-testid={`losc-angle-label-${angleLabels[i]}`}
                    x={v.x + ox}
                    y={v.y + oy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-sm font-bold"
                    style={{ fill: isKnown ? GEOMETRY_COLORS.highlight.primary : 'currentColor' }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: i * 0.1 }}
                  >
                    {angleLabels[i]}={angles[i]}°
                  </motion.text>
                )
              })}

              {/* Side labels */}
              {sideMidpoints.map((mid, i) => {
                const cx = (svgVertices[0].x + svgVertices[1].x + svgVertices[2].x) / 3
                const cy = (svgVertices[0].y + svgVertices[1].y + svgVertices[2].y) / 3
                const dx = mid.x - cx
                const dy = mid.y - cy
                const dist = Math.sqrt(dx * dx + dy * dy) || 1
                const ox = (dx / dist) * 14
                const oy = (dy / dist) * 14
                const isKnown = knownParts.includes(sideLabels[i])
                return (
                  <motion.text
                    key={`side-${i}`}
                    data-testid={`losc-side-label-${sideLabels[i]}`}
                    x={mid.x + ox}
                    y={mid.y + oy}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-xs font-medium"
                    style={{ fill: isKnown ? diagram.colors.primary : GEOMETRY_COLORS.label.side }}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                    transition={{ delay: 0.3 + i * 0.1 }}
                  >
                    {sideLabels[i]}={sides[i]}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Formula */}
        <AnimatePresence>
          {isVisible('formula') && (
            <motion.g
              data-testid="losc-formula"
              initial="hidden"
              animate={isCurrent('formula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={20}
                y={height - 110}
                width={width - 40}
                height={28}
                rx={4}
                fill={diagram.colors.primary}
                fillOpacity={0.1}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.text
                data-testid="losc-formula-text"
                x={width / 2}
                y={height - 92}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {law === 'sines'
                  ? (language === 'he' ? 'משפט הסינוסים: ' : 'Law of Sines: ')
                  : (language === 'he' ? 'משפט הקוסינוסים: ' : 'Law of Cosines: ')}
                {formulaText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Substitution */}
        <AnimatePresence>
          {isVisible('substitution') && (
            <motion.g
              data-testid="losc-substitution"
              initial="hidden"
              animate={isCurrent('substitution') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="losc-substitution-text"
                x={width / 2}
                y={height - 60}
                textAnchor="middle"
                className="text-xs"
                style={{ fill: GEOMETRY_COLORS.label.formula }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {substitutionText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Result */}
        <AnimatePresence>
          {isVisible('result') && (
            <motion.g
              data-testid="losc-result"
              initial="hidden"
              animate={isCurrent('result') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 80}
                y={height - 42}
                width={160}
                height={28}
                rx={6}
                fill={GEOMETRY_COLORS.highlight.secondary}
                fillOpacity={0.15}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
              <motion.text
                data-testid="losc-result-text"
                x={width / 2}
                y={height - 24}
                textAnchor="middle"
                className="text-sm font-bold"
                style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {resultText}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Sines-specific: ratio arcs */}
        {law === 'sines' && isVisible('labels') && (
          <motion.g data-testid="losc-sines-arcs" initial={{ opacity: 0 }} animate={{ opacity: 0.5 }}>
            {svgVertices.map((v, i) => {
              const prev = svgVertices[(i + 2) % 3]
              const next = svgVertices[(i + 1) % 3]
              const a1 = Math.atan2(prev.y - v.y, prev.x - v.x)
              const a2 = Math.atan2(next.y - v.y, next.x - v.x)
              const r = 20
              const largeArc = Math.abs(a2 - a1) > Math.PI ? 1 : 0
              return (
                <motion.path
                  key={`arc-${i}`}
                  d={`M ${v.x + Math.cos(a1) * r} ${v.y + Math.sin(a1) * r} A ${r} ${r} 0 ${largeArc} 1 ${v.x + Math.cos(a2) * r} ${v.y + Math.sin(a2) * r}`}
                  fill="none"
                  stroke={GEOMETRY_COLORS.label.angle}
                  strokeWidth={1}
                  initial="hidden"
                  animate="visible"
                  variants={lineDrawVariants}
                />
              )
            })}
          </motion.g>
        )}
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

      {/* Step-by-step solution */}
      {showStepByStep && (
        <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <h4 className="text-sm font-medium mb-2">
            {language === 'he' ? 'פתרון מפורט:' : 'Step-by-Step Solution:'}
          </h4>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">{formulaText}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">{substitutionText}</p>
            <p className="text-xs font-medium text-green-600 dark:text-green-400">{resultText}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default LawOfSinesCosines
