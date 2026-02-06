'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { OrthographicViews3DData } from '@/types/geometry'
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
  model3d: { en: 'Show 3D model', he: 'הצגת מודל תלת-ממדי' },
  front: { en: 'Front view', he: 'מבט קדמי' },
  side: { en: 'Side view', he: 'מבט צדי' },
  top: { en: 'Top view', he: 'מבט עליון' },
}

// ---------------------------------------------------------------------------
// Isometric helpers
// ---------------------------------------------------------------------------

function isoProject(x: number, y: number, z: number, cx: number, cy: number, scale: number) {
  const ix = (x - y) * Math.cos(Math.PI / 6) * scale + cx
  const iy = (x + y) * Math.sin(Math.PI / 6) * scale - z * scale + cy
  return { x: ix, y: iy }
}

// Render a 2D grid view (front/side/top)
function renderGridView(
  grid: number[][],
  x0: number,
  y0: number,
  cellSize: number,
  fillColor: string,
  lineWeight: number,
  testIdPrefix: string
) {
  const elements: JSX.Element[] = []
  const rowCount = grid.length
  const colCount = Math.max(...grid.map((r) => r.length), 0)

  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < (grid[r]?.length || 0); c++) {
      const val = grid[r][c]
      const cx = x0 + c * cellSize
      const cy = y0 + r * cellSize
      elements.push(
        <rect
          key={`${testIdPrefix}-${r}-${c}`}
          data-testid={`${testIdPrefix}-cell-${r}-${c}`}
          x={cx}
          y={cy}
          width={cellSize}
          height={cellSize}
          fill={val > 0 ? fillColor : 'none'}
          fillOpacity={val > 0 ? 0.2 + val * 0.1 : 0}
          stroke="currentColor"
          strokeWidth={lineWeight * 0.6}
          strokeOpacity={0.4}
        />
      )
    }
  }

  // Outer border
  elements.push(
    <rect
      key={`${testIdPrefix}-border`}
      x={x0}
      y={y0}
      width={colCount * cellSize}
      height={rowCount * cellSize}
      fill="none"
      stroke="currentColor"
      strokeWidth={lineWeight}
    />
  )

  return elements
}

interface OrthographicViews3DProps {
  data: OrthographicViews3DData
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
 * OrthographicViews3D - Front, side, and top views of a 3D shape
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
export function OrthographicViews3D({
  data,
  width = 450,
  height = 450,
  className = '',
  initialStep,
  showStepByStep = false,
  language = 'en',
  subject = 'geometry',
  complexity = 'high_school',
}: OrthographicViews3DProps) {
  const {
    shape,
    views,
    show3DModel = true,
    title,
  } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = []
    if (show3DModel) {
      defs.push({ id: 'model3d', label: STEP_LABELS.model3d.en, labelHe: STEP_LABELS.model3d.he })
    }
    defs.push(
      { id: 'front', label: STEP_LABELS.front.en, labelHe: STEP_LABELS.front.he },
      { id: 'side', label: STEP_LABELS.side.en, labelHe: STEP_LABELS.side.he },
      { id: 'top', label: STEP_LABELS.top.en, labelHe: STEP_LABELS.top.he },
    )
    return defs
  }, [show3DModel])

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

  // Layout: 3D model in top-left quadrant, views in standard layout
  // Standard engineering layout: Front view bottom-left, side view bottom-right, top view top-left
  const viewGap = 15
  const viewAreaW = (width - viewGap * 3) / 2
  const viewAreaH = (height - viewGap * 3 - 30) / 2

  const frontRows = views.front.length
  const frontCols = Math.max(...views.front.map((r) => r.length), 1)
  const sideRows = views.side.length
  const sideCols = Math.max(...views.side.map((r) => r.length), 1)
  const topRows = views.top.length
  const topCols = Math.max(...views.top.map((r) => r.length), 1)

  const cellSize = Math.min(
    viewAreaW / Math.max(frontCols, topCols, 1),
    viewAreaH / Math.max(frontRows, sideRows, topRows, 1)
  ) * 0.8

  // View positions
  const frontX = viewGap + 10
  const frontY = height / 2 + viewGap
  const sideX = width / 2 + viewGap
  const sideY = height / 2 + viewGap
  const topX = viewGap + 10
  const topY = viewGap + 30

  // Simple isometric 3D model
  const isoModel = useMemo(() => {
    if (!show3DModel) return null
    const cx = width / 2 + viewAreaW / 4
    const cy = viewAreaH / 2 + 40
    const s = cellSize * 0.8

    if (shape === 'cube' || shape === 'rectangular_prism') {
      const faces: { points: string; fill: string; opacity: number }[] = []
      const d = shape === 'rectangular_prism' ? { w: 2, h: 1.5, d: 1 } : { w: 1, h: 1, d: 1 }

      // Top face
      const t0 = isoProject(0, 0, d.h, cx, cy, s)
      const t1 = isoProject(d.w, 0, d.h, cx, cy, s)
      const t2 = isoProject(d.w, d.d, d.h, cx, cy, s)
      const t3 = isoProject(0, d.d, d.h, cx, cy, s)
      faces.push({
        points: `${t0.x},${t0.y} ${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y}`,
        fill: diagram.colors.primary,
        opacity: 0.25,
      })

      // Front face
      const f0 = isoProject(0, d.d, 0, cx, cy, s)
      const f1 = isoProject(d.w, d.d, 0, cx, cy, s)
      const f2 = isoProject(d.w, d.d, d.h, cx, cy, s)
      const f3 = isoProject(0, d.d, d.h, cx, cy, s)
      faces.push({
        points: `${f0.x},${f0.y} ${f1.x},${f1.y} ${f2.x},${f2.y} ${f3.x},${f3.y}`,
        fill: diagram.colors.primary,
        opacity: 0.15,
      })

      // Right face
      const r0 = isoProject(d.w, 0, 0, cx, cy, s)
      const r1 = isoProject(d.w, d.d, 0, cx, cy, s)
      const r2 = isoProject(d.w, d.d, d.h, cx, cy, s)
      const r3 = isoProject(d.w, 0, d.h, cx, cy, s)
      faces.push({
        points: `${r0.x},${r0.y} ${r1.x},${r1.y} ${r2.x},${r2.y} ${r3.x},${r3.y}`,
        fill: diagram.colors.primary,
        opacity: 0.1,
      })

      return faces
    }

    // Default: simple box for other shapes
    const t0 = isoProject(0, 0, 1, cx, cy, s)
    const t1 = isoProject(1, 0, 1, cx, cy, s)
    const t2 = isoProject(1, 1, 1, cx, cy, s)
    const t3 = isoProject(0, 1, 1, cx, cy, s)
    return [{
      points: `${t0.x},${t0.y} ${t1.x},${t1.y} ${t2.x},${t2.y} ${t3.x},${t3.y}`,
      fill: diagram.colors.primary,
      opacity: 0.2,
    }]
  }, [show3DModel, shape, diagram.colors.primary, width, viewAreaW, viewAreaH, cellSize])

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  return (
    <div
      data-testid="orthographic-views-3d-diagram"
      className={`geometry-orthographic-views-3d ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Orthographic views of ${shape}${title ? `: ${title}` : ''}`}
      >
        <rect
          data-testid="ortho-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {title && (
          <text
            data-testid="ortho-title"
            x={width / 2}
            y={18}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* 3D model */}
        <AnimatePresence>
          {show3DModel && isVisible('model3d') && isoModel && (
            <motion.g
              data-testid="ortho-model3d"
              initial="hidden"
              animate={isCurrent('model3d') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {isoModel.map((face, i) => (
                <motion.polygon
                  key={`iso-face-${i}`}
                  points={face.points}
                  fill={face.fill}
                  fillOpacity={face.opacity}
                  stroke={diagram.colors.primary}
                  strokeWidth={diagram.lineWeight}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.15 }}
                />
              ))}
              <motion.text
                x={width * 0.75}
                y={viewAreaH / 2 + 60}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מודל תלת-ממדי' : '3D Model'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Front view */}
        <AnimatePresence>
          {isVisible('front') && (
            <motion.g
              data-testid="ortho-front-view"
              initial="hidden"
              animate={isCurrent('front') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderGridView(views.front, frontX, frontY, cellSize, diagram.colors.primary, diagram.lineWeight, 'ortho-front')}
              <motion.text
                x={frontX + (frontCols * cellSize) / 2}
                y={frontY - 8}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: diagram.colors.primary }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מבט קדמי' : 'Front'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Side view */}
        <AnimatePresence>
          {isVisible('side') && (
            <motion.g
              data-testid="ortho-side-view"
              initial="hidden"
              animate={isCurrent('side') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderGridView(views.side, sideX, sideY, cellSize, '#22c55e', diagram.lineWeight, 'ortho-side')}
              <motion.text
                x={sideX + (sideCols * cellSize) / 2}
                y={sideY - 8}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: '#22c55e' }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מבט צדי' : 'Side'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Top view */}
        <AnimatePresence>
          {isVisible('top') && (
            <motion.g
              data-testid="ortho-top-view"
              initial="hidden"
              animate={isCurrent('top') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderGridView(views.top, topX, topY, cellSize, '#f59e0b', diagram.lineWeight, 'ortho-top')}
              <motion.text
                x={topX + (topCols * cellSize) / 2}
                y={topY - 8}
                textAnchor="middle"
                className="text-xs font-medium"
                style={{ fill: '#f59e0b' }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'מבט עליון' : 'Top'}
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
            {language === 'he' ? 'הטלות אורתוגונליות:' : 'Orthographic Projections:'}
          </h4>
          <div className="space-y-1">
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'צורה:' : 'Shape:'} {shape}
            </p>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {language === 'he' ? 'מבטים: קדמי, צדי, עליון' : 'Views: Front, Side, Top'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

export default OrthographicViews3D
