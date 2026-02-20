'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { RegularPolygonData } from '@/types/math'
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

interface RegularPolygonProps {
  data: RegularPolygonData
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
  drawPolygon: { en: 'Draw polygon', he: 'ציור מצולע' },
  labelSide: { en: 'Label side length', he: 'סימון אורך צלע' },
  showApothem: { en: 'Show apothem', he: 'הצגת אפותם' },
  showAngles: { en: 'Show angles', he: 'הצגת זוויות' },
  showFormulas: { en: 'Show formulas', he: 'הצגת נוסחאות' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function RegularPolygon({
  data,
  className = '',
  width = 450,
  height = 400,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: RegularPolygonProps) {
  const {
    sides: n,
    sideLength,
    sideLabel,
    showApothem,
    showCentralAngle,
    showInteriorAngle,
    title,
    showFormulas,
  } = data

  const padding = 50
  const cx = width / 2
  const cy = height / 2
  const maxR = Math.min(width, height) / 2 - padding
  // Circumradius: R = s / (2 * sin(pi/n))
  const circumradius = Math.min(maxR, maxR * 0.85)

  // Compute vertices using cos(2*pi*k/n) and sin(2*pi*k/n)
  // Rotate so first vertex is at top (-pi/2 offset)
  const vertices = useMemo(() => {
    const pts: Array<{ x: number; y: number }> = []
    for (let k = 0; k < n; k++) {
      const angle = (2 * Math.PI * k) / n - Math.PI / 2
      pts.push({
        x: cx + circumradius * Math.cos(angle),
        y: cy + circumradius * Math.sin(angle),
      })
    }
    return pts
  }, [n, cx, cy, circumradius])

  // Polygon path
  const polygonPath = useMemo(() => {
    if (vertices.length === 0) return ''
    return vertices.map((v, i) => `${i === 0 ? 'M' : 'L'} ${v.x} ${v.y}`).join(' ') + ' Z'
  }, [vertices])

  // Apothem: perpendicular distance from center to midpoint of a side
  const _apothemLength = useMemo(
    () => circumradius * Math.cos(Math.PI / n),
    [circumradius, n]
  )
  const apothemEndpoint = useMemo(() => {
    if (vertices.length < 2) return { x: cx, y: cy }
    const mid = {
      x: (vertices[0].x + vertices[1].x) / 2,
      y: (vertices[0].y + vertices[1].y) / 2,
    }
    return mid
  }, [vertices, cx, cy])

  // Central angle
  const centralAngle = 360 / n

  // Interior angle
  const interiorAngle = ((n - 2) * 180) / n

  // Formulas
  const perimeter = n * sideLength
  const areaFormula = useMemo(() => {
    const a = sideLength / (2 * Math.tan(Math.PI / n))
    return ((perimeter * a) / 2).toFixed(2)
  }, [n, sideLength, perimeter])

  // Build step definitions
  const hasApothem = showApothem !== false
  const hasAngles = showCentralAngle || showInteriorAngle
  const hasFormulas = showFormulas !== false

  const stepDefs = useMemo(() => {
    const defs = [
      { id: 'drawPolygon', label: STEP_LABELS.drawPolygon.en, labelHe: STEP_LABELS.drawPolygon.he },
      { id: 'labelSide', label: STEP_LABELS.labelSide.en, labelHe: STEP_LABELS.labelSide.he },
    ]
    if (hasApothem) {
      defs.push({ id: 'showApothem', label: STEP_LABELS.showApothem.en, labelHe: STEP_LABELS.showApothem.he })
    }
    if (hasAngles) {
      defs.push({ id: 'showAngles', label: STEP_LABELS.showAngles.en, labelHe: STEP_LABELS.showAngles.he })
    }
    if (hasFormulas) {
      defs.push({ id: 'showFormulas', label: STEP_LABELS.showFormulas.en, labelHe: STEP_LABELS.showFormulas.he })
    }
    return defs
  }, [hasApothem, hasAngles, hasFormulas])

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

  // Central angle arc path
  const centralAngleArc = useMemo(() => {
    if (vertices.length < 2) return ''
    const r = 25
    const a1 = Math.atan2(vertices[0].y - cy, vertices[0].x - cx)
    const a2 = Math.atan2(vertices[1].y - cy, vertices[1].x - cx)
    const startX = cx + r * Math.cos(a1)
    const startY = cy + r * Math.sin(a1)
    const endX = cx + r * Math.cos(a2)
    const endY = cy + r * Math.sin(a2)
    return `M ${startX} ${startY} A ${r} ${r} 0 0 1 ${endX} ${endY}`
  }, [vertices, cx, cy])

  // Interior angle arc path (at first vertex, between last side and first side)
  // The arc must sweep through the interior of the polygon (toward the center).
  const interiorAngleArc = useMemo(() => {
    if (vertices.length < 2) return ''
    const v = vertices[0]
    const prev = vertices[n - 1]
    const next = vertices[1]
    const r = 20
    const a1 = Math.atan2(prev.y - v.y, prev.x - v.x)
    const a2 = Math.atan2(next.y - v.y, next.x - v.x)
    const startX = v.x + r * Math.cos(a1)
    const startY = v.y + r * Math.sin(a1)
    const endX = v.x + r * Math.cos(a2)
    const endY = v.y + r * Math.sin(a2)

    // Interior angles of regular polygons are always < 180, so largeArc = 0.
    // Choose sweep direction so the arc passes through the interior (toward center).
    // Test both sweep directions and pick the one whose midpoint is closer to center.
    let diff = a2 - a1
    if (diff < 0) diff += 2 * Math.PI
    // sweep=1 (CCW) midpoint angle:
    const midCCW = a1 + diff / 2
    // sweep=0 (CW) midpoint angle:
    const midCW = a1 - (2 * Math.PI - diff) / 2
    const midCCWx = v.x + r * Math.cos(midCCW)
    const midCCWy = v.y + r * Math.sin(midCCW)
    const midCWx = v.x + r * Math.cos(midCW)
    const midCWy = v.y + r * Math.sin(midCW)
    const distCCW = Math.hypot(midCCWx - cx, midCCWy - cy)
    const distCW = Math.hypot(midCWx - cx, midCWy - cy)
    // The arc closer to center is the interior one
    const sweepFlag = distCCW < distCW ? 1 : 0

    return `M ${startX} ${startY} A ${r} ${r} 0 0 ${sweepFlag} ${endX} ${endY}`
  }, [vertices, n, cx, cy])

  const viewBox = `0 0 ${width} ${height}`

  return (
    <div
      data-testid="regular-polygon"
      className={`bg-white dark:bg-gray-900 rounded-lg p-4 ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      {title && (
        <div
          data-testid="rp-title"
          className="text-lg font-semibold text-gray-800 dark:text-gray-200 text-center mb-3"
        >
          {title}
        </div>
      )}

      <svg
        data-testid="rp-svg"
        viewBox={viewBox}
        width="100%"
        className="overflow-visible"
      >
        {/* Step 0: Draw polygon */}
        <AnimatePresence>
          {isVisible('drawPolygon') && (
            <motion.g
              data-testid="rp-polygon"
              initial="hidden"
              animate={isCurrent('drawPolygon') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                d={polygonPath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                strokeLinejoin="round"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Center dot */}
              <motion.circle
                cx={cx}
                cy={cy}
                r={3}
                fill={primaryColor}
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.3 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Label side */}
        <AnimatePresence>
          {isVisible('labelSide') && vertices.length >= 2 && (
            <motion.g
              data-testid="rp-side-label"
              initial="hidden"
              animate={isCurrent('labelSide') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Highlight first side */}
              <motion.line
                x1={vertices[0].x}
                y1={vertices[0].y}
                x2={vertices[1].x}
                y2={vertices[1].y}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight + 1}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Side length label */}
              {(() => {
                const mid = {
                  x: (vertices[0].x + vertices[1].x) / 2,
                  y: (vertices[0].y + vertices[1].y) / 2,
                }
                const dx = mid.x - cx
                const dy = mid.y - cy
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                const lx = mid.x + (dx / len) * 18
                const ly = mid.y + (dy / len) * 18
                return (
                  <motion.text
                    x={lx}
                    y={ly}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fill={accentColor}
                    fontSize={12}
                    fontWeight={600}
                    initial="hidden"
                    animate="visible"
                    variants={labelAppearVariants}
                  >
                    {sideLabel ?? `s = ${sideLength}`}
                  </motion.text>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Show apothem */}
        <AnimatePresence>
          {hasApothem && isVisible('showApothem') && (
            <motion.g
              data-testid="rp-apothem"
              initial="hidden"
              animate={isCurrent('showApothem') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.line
                x1={cx}
                y1={cy}
                x2={apothemEndpoint.x}
                y2={apothemEndpoint.y}
                stroke="#ef4444"
                strokeWidth={1.5}
                strokeDasharray="6 3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />
              {/* Apothem label */}
              <motion.text
                x={(cx + apothemEndpoint.x) / 2 + 12}
                y={(cy + apothemEndpoint.y) / 2}
                textAnchor="start"
                dominantBaseline="central"
                fill="#ef4444"
                fontSize={11}
                fontWeight={500}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'אפותם' : 'apothem'}
              </motion.text>
              {/* Midpoint dot */}
              <motion.circle
                cx={apothemEndpoint.x}
                cy={apothemEndpoint.y}
                r={3}
                fill="#ef4444"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 20, delay: 0.2 }}
              />
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: Show angles */}
        <AnimatePresence>
          {hasAngles && isVisible('showAngles') && (
            <motion.g
              data-testid="rp-angles"
              initial="hidden"
              animate={isCurrent('showAngles') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Central angle */}
              {showCentralAngle && (
                <>
                  {/* Lines from center to first two vertices */}
                  <motion.line
                    x1={cx}
                    y1={cy}
                    x2={vertices[0].x}
                    y2={vertices[0].y}
                    className="stroke-gray-500 dark:stroke-gray-400"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  <motion.line
                    x1={cx}
                    y1={cy}
                    x2={vertices[1].x}
                    y2={vertices[1].y}
                    className="stroke-gray-500 dark:stroke-gray-400"
                    strokeWidth={1}
                    strokeDasharray="4 2"
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {/* Central angle arc */}
                  <motion.path
                    d={centralAngleArc}
                    fill="none"
                    stroke="#f59e0b"
                    strokeWidth={1.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {/* Central angle label — positioned along the bisector of the central angle */}
                  {(() => {
                    const ca1 = Math.atan2(vertices[0].y - cy, vertices[0].x - cx)
                    const ca2 = Math.atan2(vertices[1].y - cy, vertices[1].x - cx)
                    let caDiff = ca2 - ca1
                    if (caDiff < 0) caDiff += 2 * Math.PI
                    const caMid = ca1 + caDiff / 2
                    return (
                      <motion.text
                        x={cx + 35 * Math.cos(caMid)}
                        y={cy + 35 * Math.sin(caMid)}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#f59e0b"
                        fontSize={10}
                        fontWeight={500}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {centralAngle.toFixed(1)}°
                      </motion.text>
                    )
                  })()}
                </>
              )}
              {/* Interior angle */}
              {showInteriorAngle && (
                <>
                  <motion.path
                    d={interiorAngleArc}
                    fill="none"
                    stroke="#22c55e"
                    strokeWidth={1.5}
                    initial="hidden"
                    animate="visible"
                    variants={lineDrawVariants}
                  />
                  {(() => {
                    // Position the interior angle label INSIDE the polygon.
                    // The interior bisector direction is from vertex toward center.
                    const v = vertices[0]
                    const prev = vertices[n - 1]
                    const next = vertices[1]
                    // Compute bisector of the two edges at this vertex
                    const a1 = Math.atan2(prev.y - v.y, prev.x - v.x)
                    const a2 = Math.atan2(next.y - v.y, next.x - v.x)
                    let mid = (a1 + a2) / 2
                    // Choose the bisector direction that points toward center
                    const testX = v.x + Math.cos(mid)
                    const testY = v.y + Math.sin(mid)
                    const distToCenter = Math.hypot(testX - cx, testY - cy)
                    const testX2 = v.x + Math.cos(mid + Math.PI)
                    const testY2 = v.y + Math.sin(mid + Math.PI)
                    const distToCenter2 = Math.hypot(testX2 - cx, testY2 - cy)
                    if (distToCenter2 < distToCenter) {
                      mid += Math.PI
                    }
                    const labelDist = 32
                    return (
                      <motion.text
                        x={v.x + Math.cos(mid) * labelDist}
                        y={v.y + Math.sin(mid) * labelDist}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill="#22c55e"
                        fontSize={10}
                        fontWeight={500}
                        initial="hidden"
                        animate="visible"
                        variants={labelAppearVariants}
                      >
                        {interiorAngle.toFixed(1)}°
                      </motion.text>
                    )
                  })()}
                </>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Show formulas */}
        <AnimatePresence>
          {hasFormulas && isVisible('showFormulas') && (
            <motion.g
              data-testid="rp-formulas"
              initial="hidden"
              animate={isCurrent('showFormulas') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                x={width / 2}
                y={height - 30}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400"
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                P = {n} × {sideLength} = {perimeter}
              </motion.text>
              <motion.text
                x={width / 2}
                y={height - 12}
                textAnchor="middle"
                className="fill-gray-600 dark:fill-gray-400"
                fontSize={12}
                fontWeight={600}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'שטח' : 'Area'} = ½ × P × a = {areaFormula}
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

export default RegularPolygon
