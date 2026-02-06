'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { VolumeModelData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'
import { hexToRgba } from '@/lib/diagram-theme'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface VolumeModelProps {
  data: VolumeModelData
  className?: string
  width?: number
  height?: number
  complexity?: VisualComplexityLevel
  subject?: SubjectKey
  language?: 'en' | 'he'
  initialStep?: number
  currentStep?: number
  totalSteps?: number
  onStepComplete?: () => void
  animationDuration?: number
  stepConfig?: unknown
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  outline: { en: 'Show outline', he: 'הצגת מתאר' },
  length: { en: 'Show length layer', he: 'הצגת שכבת אורך' },
  area: { en: 'Show width x length layer', he: 'הצגת שכבת רוחב \u00D7 אורך' },
  stack: { en: 'Stack height layers', he: 'הערמת שכבות גובה' },
  formula: { en: 'Show formula', he: 'הצגת הנוסחה' },
}

// ---------------------------------------------------------------------------
// Isometric Helpers
// ---------------------------------------------------------------------------

// Isometric projection: convert 3D (x, y, z) to 2D SVG coordinates
// Uses a 30-degree isometric view
const ISO_ANGLE = Math.PI / 6 // 30 degrees
const COS_A = Math.cos(ISO_ANGLE)
const SIN_A = Math.sin(ISO_ANGLE)

function isoProject(
  x: number,
  y: number,
  z: number,
  cubeSize: number,
  originX: number,
  originY: number
): { x: number; y: number } {
  // x goes right-down, y goes left-down, z goes up
  const px = originX + (x - y) * COS_A * cubeSize
  const py = originY + (x + y) * SIN_A * cubeSize - z * cubeSize
  return { x: px, y: py }
}

function cubePolygon(
  ix: number,
  iy: number,
  iz: number,
  face: 'top' | 'left' | 'right',
  cubeSize: number,
  originX: number,
  originY: number
): string {
  let corners: Array<{ x: number; y: number }>
  switch (face) {
    case 'top':
      corners = [
        isoProject(ix, iy, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy + 1, iz + 1, cubeSize, originX, originY),
        isoProject(ix, iy + 1, iz + 1, cubeSize, originX, originY),
      ]
      break
    case 'left':
      corners = [
        isoProject(ix, iy + 1, iz, cubeSize, originX, originY),
        isoProject(ix, iy + 1, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy + 1, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy + 1, iz, cubeSize, originX, originY),
      ]
      break
    case 'right':
      corners = [
        isoProject(ix + 1, iy, iz, cubeSize, originX, originY),
        isoProject(ix + 1, iy, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy + 1, iz + 1, cubeSize, originX, originY),
        isoProject(ix + 1, iy + 1, iz, cubeSize, originX, originY),
      ]
      break
  }
  return corners.map((c, i) => `${i === 0 ? 'M' : 'L'}${c.x.toFixed(1)},${c.y.toFixed(1)}`).join(' ') + ' Z'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function VolumeModel({
  data,
  className = '',
  width = 450,
  height = 380,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: VolumeModelProps) {
  const { length, width: w, height: h, showUnitCubes: _showUnitCubes, title } = data

  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'outline', label: STEP_LABELS.outline.en, labelHe: STEP_LABELS.outline.he },
      { id: 'length', label: STEP_LABELS.length.en, labelHe: STEP_LABELS.length.he },
      { id: 'area', label: STEP_LABELS.area.en, labelHe: STEP_LABELS.area.he },
      { id: 'stack', label: STEP_LABELS.stack.en, labelHe: STEP_LABELS.stack.he },
      { id: 'formula', label: STEP_LABELS.formula.en, labelHe: STEP_LABELS.formula.he },
    ]
    return defs
  }, [])

  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'elementary',
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
  const _lightColor = diagram.colors.light

  const spotlight = useMemo(
    () => createSpotlightVariants(primaryColor),
    [primaryColor]
  )

  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Calculate cube size to fit within the SVG
  const maxDim = Math.max(length, w, h)
  const availableWidth = width - 120
  const availableHeight = height - 130
  const cubeSize = Math.min(
    availableWidth / (maxDim * 2 * COS_A),
    availableHeight / (maxDim * SIN_A * 2 + maxDim)
  )

  // Origin point (center-bottom of the diagram)
  const originX = width / 2
  const originY = height - 80

  const volume = length * w * h

  // Determine which layers to show based on current step
  const showLengthLayer = isVisible('length')
  const showAreaLayer = isVisible('area')
  const showAllLayers = isVisible('stack')

  return (
    <div
      data-testid="volume-model"
      className={`bg-white dark:bg-gray-900 rounded-lg ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Volume model: ${length} x ${w} x ${h} = ${volume} cubic units`}
      >
        {/* Background */}
        <rect
          data-testid="vm-background"
          width={width}
          height={height}
          rx={8}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="vm-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            className="fill-current font-semibold"
            style={{ fontSize: 16 }}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            {title}
          </motion.text>
        )}

        {/* Step 0: Outline only (wireframe of the full prism) */}
        <AnimatePresence>
          {isVisible('outline') && (
            <motion.g
              data-testid="vm-outline"
              initial="hidden"
              animate={isCurrent('outline') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Draw wireframe edges of the rectangular prism */}
              {(() => {
                const corners = [
                  [0, 0, 0], [length, 0, 0], [length, w, 0], [0, w, 0],
                  [0, 0, h], [length, 0, h], [length, w, h], [0, w, h],
                ].map(([x, y, z]) => isoProject(x, y, z, cubeSize, originX, originY))

                const edges = [
                  [0, 1], [1, 2], [2, 3], [3, 0], // bottom
                  [4, 5], [5, 6], [6, 7], [7, 4], // top
                  [0, 4], [1, 5], [2, 6], [3, 7], // verticals
                ]

                return edges.map(([a, b], i) => (
                  <motion.line
                    key={`outline-edge-${i}`}
                    x1={corners[a].x}
                    y1={corners[a].y}
                    x2={corners[b].x}
                    y2={corners[b].y}
                    stroke="currentColor"
                    strokeWidth={diagram.lineWeight * 0.6}
                    strokeDasharray="6,3"
                    opacity={0.5}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 0.5 }}
                    transition={{ delay: i * 0.03, duration: 0.3 }}
                  />
                ))
              })()}

              {/* Dimension labels */}
              {(() => {
                const lMid = isoProject(length / 2, 0, 0, cubeSize, originX, originY)
                const wMid = isoProject(length, w / 2, 0, cubeSize, originX, originY)
                const hMid = isoProject(0, 0, h / 2, cubeSize, originX, originY)
                return (
                  <>
                    <motion.text
                      x={lMid.x}
                      y={lMid.y + 20}
                      textAnchor="middle"
                      style={{ fontSize: 14, fill: primaryColor, fontWeight: 600 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {language === 'he' ? `\u05D0\u05D5\u05E8\u05DA: ${length}` : `l = ${length}`}
                    </motion.text>
                    <motion.text
                      x={wMid.x + 15}
                      y={wMid.y + 15}
                      textAnchor="start"
                      style={{ fontSize: 14, fill: accentColor, fontWeight: 600 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {language === 'he' ? `\u05E8\u05D5\u05D7\u05D1: ${w}` : `w = ${w}`}
                    </motion.text>
                    <motion.text
                      x={hMid.x - 18}
                      y={hMid.y}
                      textAnchor="end"
                      style={{ fontSize: 14, fill: '#22c55e', fontWeight: 600 }}
                      initial="hidden"
                      animate="visible"
                      variants={labelAppearVariants}
                    >
                      {language === 'he' ? `\u05D2\u05D5\u05D1\u05D4: ${h}` : `h = ${h}`}
                    </motion.text>
                  </>
                )
              })()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 1: Length layer (single row of cubes along x-axis) */}
        <AnimatePresence>
          {showLengthLayer && !showAreaLayer && (
            <motion.g
              data-testid="vm-length-layer"
              initial="hidden"
              animate={isCurrent('length') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: length }, (_, ix) => (
                <motion.g
                  key={`length-cube-${ix}`}
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: Math.min(ix * 0.08, 1.5), type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <path d={cubePolygon(ix, 0, 0, 'top', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.3)} stroke={primaryColor} strokeWidth={1} />
                  <path d={cubePolygon(ix, 0, 0, 'left', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.2)} stroke={primaryColor} strokeWidth={1} />
                  <path d={cubePolygon(ix, 0, 0, 'right', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.15)} stroke={primaryColor} strokeWidth={1} />
                </motion.g>
              ))}
              {/* Count label */}
              <motion.text
                x={width / 2}
                y={height - 55}
                textAnchor="middle"
                style={{ fontSize: 14, fill: primaryColor, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {length} {language === 'he' ? 'קוביות' : 'cubes'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 2: Width x Length layer (first floor of cubes) */}
        <AnimatePresence>
          {showAreaLayer && !showAllLayers && (
            <motion.g
              data-testid="vm-area-layer"
              initial="hidden"
              animate={isCurrent('area') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {Array.from({ length: w }, (_, iy) =>
                Array.from({ length: length }, (_, ix) => {
                  const cubeIndex = iy * length + ix
                  return (
                    <motion.g
                      key={`area-cube-${ix}-${iy}`}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: Math.min(cubeIndex * 0.03, 1.5), type: 'spring', stiffness: 300, damping: 25 }}
                    >
                      <path d={cubePolygon(ix, iy, 0, 'top', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.3)} stroke={primaryColor} strokeWidth={0.8} />
                      {iy === w - 1 && <path d={cubePolygon(ix, iy, 0, 'left', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.2)} stroke={primaryColor} strokeWidth={0.8} />}
                      {ix === length - 1 && <path d={cubePolygon(ix, iy, 0, 'right', cubeSize, originX, originY)} fill={hexToRgba(primaryColor, 0.15)} stroke={primaryColor} strokeWidth={0.8} />}
                    </motion.g>
                  )
                })
              )}
              <motion.text
                x={width / 2}
                y={height - 55}
                textAnchor="middle"
                style={{ fontSize: 14, fill: primaryColor, fontWeight: 600 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {length} {'\u00D7'} {w} = {length * w} {language === 'he' ? 'קוביות' : 'cubes'}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 3: All layers stacked */}
        <AnimatePresence>
          {showAllLayers && (
            <motion.g
              data-testid="vm-all-layers"
              initial="hidden"
              animate={isCurrent('stack') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Draw cubes from back to front, bottom to top for proper overlap */}
              {/* One motion.g per layer to avoid hundreds of motion elements */}
              {Array.from({ length: h }, (_, iz) => (
                <motion.g
                  key={`layer-${iz}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: Math.min(iz * 0.15, 1.5) }}
                >
                  {Array.from({ length: w }, (_, iy) =>
                    Array.from({ length: length }, (_, ix) => {
                      const layerAlpha = 0.2 + (iz / h) * 0.3
                      const isFrontFace = iy === w - 1
                      const isRightFace = ix === length - 1
                      const isTopFace = iz === h - 1

                      return (
                        <g key={`cube-${ix}-${iy}-${iz}`}>
                          {isTopFace && (
                            <path
                              d={cubePolygon(ix, iy, iz, 'top', cubeSize, originX, originY)}
                              fill={hexToRgba(primaryColor, layerAlpha + 0.1)}
                              stroke={primaryColor}
                              strokeWidth={0.5}
                            />
                          )}
                          {isFrontFace && (
                            <path
                              d={cubePolygon(ix, iy, iz, 'left', cubeSize, originX, originY)}
                              fill={hexToRgba(primaryColor, layerAlpha - 0.05)}
                              stroke={primaryColor}
                              strokeWidth={0.5}
                            />
                          )}
                          {isRightFace && (
                            <path
                              d={cubePolygon(ix, iy, iz, 'right', cubeSize, originX, originY)}
                              fill={hexToRgba(primaryColor, layerAlpha - 0.1)}
                              stroke={primaryColor}
                              strokeWidth={0.5}
                            />
                          )}
                        </g>
                      )
                    })
                  )}
                </motion.g>
              ))}

              {/* Layer count labels on the side */}
              {Array.from({ length: h }, (_, iz) => {
                const labelPos = isoProject(-0.3, w, iz + 0.5, cubeSize, originX, originY)
                return (
                  <motion.text
                    key={`layer-label-${iz}`}
                    x={labelPos.x - 10}
                    y={labelPos.y}
                    textAnchor="end"
                    style={{ fontSize: 11, fill: '#22c55e', fontWeight: 500 }}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(iz * 0.15, 1.5) + 0.2 }}
                  >
                    {language === 'he' ? `\u05E9\u05DB\u05D1\u05D4 ${iz + 1}` : `Layer ${iz + 1}`}
                  </motion.text>
                )
              })}
            </motion.g>
          )}
        </AnimatePresence>

        {/* Step 4: Formula and total */}
        <AnimatePresence>
          {isVisible('formula') && (
            <motion.g
              data-testid="vm-formula"
              initial="hidden"
              animate={isCurrent('formula') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.text
                data-testid="vm-formula-label"
                x={width / 2}
                y={height - 45}
                textAnchor="middle"
                style={{ fontSize: 16, fill: primaryColor, fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                V = l {'\u00D7'} w {'\u00D7'} h = {length} {'\u00D7'} {w} {'\u00D7'} {h}
              </motion.text>
              <motion.text
                data-testid="vm-total-label"
                x={width / 2}
                y={height - 22}
                textAnchor="middle"
                style={{ fontSize: 20, fill: '#22c55e', fontWeight: 700 }}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                = {volume} {language === 'he' ? '\u05D9\u05D7\u05D9\u05D3\u05D5\u05EA \u05DE\u05E2\u05D5\u05E7\u05D1\u05D5\u05EA' : 'cubic units'}
              </motion.text>
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

export default VolumeModel
