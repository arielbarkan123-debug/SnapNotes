'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { TriangleSimilarityData } from '@/types/geometry'
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
  triangle1: { en: 'Draw first triangle', he: 'ציור משולש ראשון' },
  triangle2: { en: 'Draw second (scaled) triangle', he: 'ציור משולש שני (מותאם)' },
  criterion: { en: 'Show similarity criterion', he: 'הצגת כלל דמיון' },
  ratios: { en: 'Show side ratios', he: 'הצגת יחסי צלעות' },
  scaleFactor: { en: 'Show scale factor', he: 'הצגת מקדם הקנ"מ' },
}

interface TriangleSimilarityProps {
  data: TriangleSimilarityData
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
 * TriangleSimilarity - Two similar triangles with proportional sides
 */
export function TriangleSimilarity({
  data,
  width = 500,
  height = 380,
  className = '',
  initialStep,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: TriangleSimilarityProps) {
  const { triangle1, triangle2, criterion, scaleFactor, title } = data

  const stepDefs = useMemo(
    () => [
      { id: 'triangle1', label: STEP_LABELS.triangle1.en, labelHe: STEP_LABELS.triangle1.he },
      { id: 'triangle2', label: STEP_LABELS.triangle2.en, labelHe: STEP_LABELS.triangle2.he },
      { id: 'criterion', label: STEP_LABELS.criterion.en, labelHe: STEP_LABELS.criterion.he },
      { id: 'ratios', label: STEP_LABELS.ratios.en, labelHe: STEP_LABELS.ratios.he },
      { id: 'scaleFactor', label: STEP_LABELS.scaleFactor.en, labelHe: STEP_LABELS.scaleFactor.he },
    ],
    []
  )

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

  // Map triangle vertices into SVG space
  const padding = 50
  const halfW = width / 2

  const mapVertices = (
    vertices: [{ x: number; y: number }, { x: number; y: number }, { x: number; y: number }],
    offsetX: number,
    areaW: number
  ) => {
    const xs = vertices.map((v) => v.x)
    const ys = vertices.map((v) => v.y)
    const minX = Math.min(...xs)
    const maxX = Math.max(...xs)
    const minY = Math.min(...ys)
    const maxY = Math.max(...ys)
    const rangeX = maxX - minX || 1
    const rangeY = maxY - minY || 1
    const svgScale = Math.min((areaW - padding * 2) / rangeX, (height - padding * 2 - 40) / rangeY) * 0.75
    const cxOff = offsetX + (areaW - rangeX * svgScale) / 2
    const cyOff = (height - 40 - rangeY * svgScale) / 2

    return vertices.map((v) => ({
      x: cxOff + (v.x - minX) * svgScale,
      y: cyOff + (v.y - minY) * svgScale,
    }))
  }

  const v1 = mapVertices(triangle1.vertices, 0, halfW)
  const v2 = mapVertices(triangle2.vertices, halfW, halfW)

  const triPath = (verts: { x: number; y: number }[]) =>
    `M ${verts[0].x} ${verts[0].y} L ${verts[1].x} ${verts[1].y} L ${verts[2].x} ${verts[2].y} Z`

  // Side midpoints for ratio labels
  const sideMidpoint = (verts: { x: number; y: number }[], i: number) => {
    const j = (i + 1) % 3
    return { x: (verts[i].x + verts[j].x) / 2, y: (verts[i].y + verts[j].y) / 2 }
  }

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  const ratioText = (idx: number) => {
    const s1 = triangle1.sides[idx]
    const s2 = triangle2.sides[idx]
    return `${s1}/${s2}`
  }

  return (
    <div
      data-testid="triangle-similarity-diagram"
      className={`geometry-triangle-similarity ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Triangle similarity (${criterion}, k=${scaleFactor})${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="ts-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="ts-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* Step 0: First triangle */}
        <AnimatePresence>
          {isVisible('triangle1') && (
            <motion.g
              data-testid="ts-triangle1"
              initial="hidden"
              animate={isCurrent('triangle1') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={triPath(v1)}
                fill={diagram.colors.primary}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.path
                d={triPath(v1)}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {v1.map((v, i) => (
                <motion.text
                  key={`v1-label-${i}`}
                  x={v.x + (v.x < halfW / 2 ? -12 : 12)}
                  y={v.y + (v.y < height / 2 ? -8 : 16)}
                  textAnchor="middle"
                  className="fill-current text-xs font-bold"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {String.fromCharCode(65 + i)}
                </motion.text>
              ))}
              {/* Side lengths */}
              {[0, 1, 2].map((i) => {
                const mid = sideMidpoint(v1, i)
                return (
                  <motion.text
                    key={`s1-${i}`}
                    x={mid.x}
                    y={mid.y - 6}
                    textAnchor="middle"
                    style={{ fill: diagram.colors.primary }}
                    className="text-[10px]"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {triangle1.sides[i]}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Second triangle (scaled) */}
        <AnimatePresence>
          {isVisible('triangle2') && (
            <motion.g
              data-testid="ts-triangle2"
              initial="hidden"
              animate={isCurrent('triangle2') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={triPath(v2)}
                fill={diagram.colors.accent}
                fillOpacity={0.08}
                stroke="none"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
              />
              <motion.path
                d={triPath(v2)}
                fill="none"
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {v2.map((v, i) => (
                <motion.text
                  key={`v2-label-${i}`}
                  x={v.x + (v.x < halfW + halfW / 2 ? -12 : 12)}
                  y={v.y + (v.y < height / 2 ? -8 : 16)}
                  textAnchor="middle"
                  className="fill-current text-xs font-bold"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {String.fromCharCode(68 + i)}
                </motion.text>
              ))}
              {[0, 1, 2].map((i) => {
                const mid = sideMidpoint(v2, i)
                return (
                  <motion.text
                    key={`s2-${i}`}
                    x={mid.x}
                    y={mid.y - 6}
                    textAnchor="middle"
                    style={{ fill: diagram.colors.accent }}
                    className="text-[10px]"
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {triangle2.sides[i]}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Criterion badge */}
        <AnimatePresence>
          {isVisible('criterion') && (
            <motion.g
              data-testid="ts-criterion"
              initial="hidden"
              animate={isCurrent('criterion') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 40}
                y={30}
                width={80}
                height={26}
                rx={6}
                fill={diagram.colors.primary}
                fillOpacity={0.15}
                stroke={diagram.colors.primary}
                strokeWidth={1}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              />
              <motion.text
                x={width / 2}
                y={47}
                textAnchor="middle"
                style={{ fill: diagram.colors.primary }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {criterion} {language === 'he' ? 'דמיון' : 'Similarity'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Side ratios */}
        <AnimatePresence>
          {isVisible('ratios') && (
            <motion.g
              data-testid="ts-ratios"
              initial="hidden"
              animate={isCurrent('ratios') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {[0, 1, 2].map((i) => (
                <motion.text
                  key={`ratio-${i}`}
                  x={width / 2}
                  y={height - 65 + i * 18}
                  textAnchor="middle"
                  style={{ fill: GEOMETRY_COLORS.highlight.secondary }}
                  className="text-xs font-medium"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                  transition={{ delay: i * 0.15 }}
                >
                  {String.fromCharCode(97 + i)}/{String.fromCharCode(100 + i)} = {ratioText(i)}
                </motion.text>
              ))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Scale factor */}
        <AnimatePresence>
          {isVisible('scaleFactor') && (
            <motion.g
              data-testid="ts-scale-factor"
              initial="hidden"
              animate={isCurrent('scaleFactor') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.rect
                x={width / 2 - 70}
                y={height - 30}
                width={140}
                height={24}
                rx={6}
                fill={GEOMETRY_COLORS.highlight.tertiary}
                fillOpacity={0.15}
                stroke={GEOMETRY_COLORS.highlight.tertiary}
                strokeWidth={1}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
              />
              <motion.text
                x={width / 2}
                y={height - 14}
                textAnchor="middle"
                style={{ fill: GEOMETRY_COLORS.highlight.tertiary }}
                className="text-xs font-bold"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מקדם: ' : 'Scale factor: '}k = {scaleFactor}
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
    </div>
  )
}

export default TriangleSimilarity
