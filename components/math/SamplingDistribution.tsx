'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { SamplingDistributionData } from '@/types/math'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SamplingDistributionProps {
  data: SamplingDistributionData
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
  population: { en: 'Show population distribution', he: 'הצגת התפלגות אוכלוסייה' },
  sampling: { en: 'Show sampling process', he: 'הצגת תהליך דגימה' },
  distribution: { en: 'Build sampling distribution', he: 'בניית התפלגות דגימה' },
  clt: { en: 'Show CLT normal curve', he: 'הצגת עקומה נורמלית (CLT)' },
}

// ---------------------------------------------------------------------------
// Helper: Normal PDF for curve drawing
// ---------------------------------------------------------------------------

function normalPDF(x: number, mean: number, std: number): number {
  const coefficient = 1 / (std * Math.sqrt(2 * Math.PI))
  const exponent = -0.5 * Math.pow((x - mean) / std, 2)
  return coefficient * Math.exp(exponent)
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SamplingDistribution({
  data,
  className = '',
  width = 450,
  height = 350,
  complexity: forcedComplexity,
  subject = 'math',
  language = 'en',
  initialStep,
}: SamplingDistributionProps) {
  const {
    populationMean,
    populationStd,
    sampleSize,
    numSamples,
    sampleMeans = [],
    showCLT = false,
    title,
  } = data

  const standardError = populationStd / Math.sqrt(sampleSize)

  // Build step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'population', label: STEP_LABELS.population.en, labelHe: STEP_LABELS.population.he },
      { id: 'sampling', label: STEP_LABELS.sampling.en, labelHe: STEP_LABELS.sampling.he },
      { id: 'distribution', label: STEP_LABELS.distribution.en, labelHe: STEP_LABELS.distribution.he },
    ]
    if (showCLT) {
      defs.push({ id: 'clt', label: STEP_LABELS.clt.en, labelHe: STEP_LABELS.clt.he })
    }
    return defs
  }, [showCLT])

  // useDiagramBase
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity: forcedComplexity ?? 'high_school',
    initialStep: initialStep ?? 0,
    stepSpotlights: stepDefs.map((s) => s.id),
    language,
  })

  // Step visibility helpers
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

  // ---------------------------------------------------------------------------
  // Layout calculations
  // ---------------------------------------------------------------------------

  const padding = { top: 40, right: 30, bottom: 45, left: 50 }
  // Split height: top portion for population, bottom for sampling distribution
  const topSectionHeight = 80
  const bottomSectionTop = padding.top + topSectionHeight + 20
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - bottomSectionTop - padding.bottom

  // Population curve drawing area
  const popCurveH = topSectionHeight - 10
  const popBaseY = padding.top + topSectionHeight

  // Sampling distribution histogram
  const xMin = populationMean - 4 * standardError
  const xMax = populationMean + 4 * standardError
  const xRange = xMax - xMin || 1

  const toSvgX = (val: number) => padding.left + ((val - xMin) / xRange) * plotWidth
  const meanX = toSvgX(populationMean)

  // Build histogram bins from sampleMeans
  const histogramData = useMemo(() => {
    if (sampleMeans.length === 0) return []
    const numBins = Math.min(20, Math.max(5, Math.ceil(Math.sqrt(sampleMeans.length))))
    const binWidth = xRange / numBins
    const bins = Array.from({ length: numBins }, (_, i) => ({
      min: xMin + i * binWidth,
      max: xMin + (i + 1) * binWidth,
      count: 0,
    }))
    sampleMeans.forEach((m) => {
      const idx = Math.min(Math.floor((m - xMin) / binWidth), numBins - 1)
      if (idx >= 0 && idx < numBins) bins[idx].count++
    })
    return bins
  }, [sampleMeans, xMin, xRange])

  const maxBinCount = Math.max(...histogramData.map((b) => b.count), 1)
  const barBaseY = bottomSectionTop + plotHeight

  // CLT normal curve path
  const cltPath = useMemo(() => {
    const numPoints = 100
    const points: string[] = []
    for (let i = 0; i <= numPoints; i++) {
      const x = xMin + (i / numPoints) * xRange
      const density = normalPDF(x, populationMean, standardError)
      // Scale density to plotHeight
      const maxDensity = normalPDF(populationMean, populationMean, standardError)
      const svgX = toSvgX(x)
      const svgY = barBaseY - (density / maxDensity) * plotHeight * 0.85
      points.push(i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`)
    }
    return points.join(' ')
  }, [xMin, xRange, populationMean, standardError, plotHeight, barBaseY])

  // Population curve path (rough sketch)
  const popCurvePath = useMemo(() => {
    const numPoints = 60
    const points: string[] = []
    const popXMin = populationMean - 3.5 * populationStd
    const popXMax = populationMean + 3.5 * populationStd
    const popRange = popXMax - popXMin
    for (let i = 0; i <= numPoints; i++) {
      const x = popXMin + (i / numPoints) * popRange
      const density = normalPDF(x, populationMean, populationStd)
      const maxDensity = normalPDF(populationMean, populationMean, populationStd)
      const svgX = padding.left + (i / numPoints) * plotWidth
      const svgY = popBaseY - (density / maxDensity) * popCurveH * 0.85
      points.push(i === 0 ? `M ${svgX} ${svgY}` : `L ${svgX} ${svgY}`)
    }
    return points.join(' ')
  }, [populationMean, populationStd, plotWidth, popBaseY, popCurveH])

  return (
    <div
      data-testid="sampling-distribution"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Sampling distribution${title ? `: ${title}` : ''}, n=${sampleSize}, ${numSamples} samples`}
      >
        {/* Background */}
        <rect
          data-testid="sd-background"
          width={width}
          height={height}
          rx={4}
          className="fill-white dark:fill-gray-900"
        />

        {/* Title */}
        {title && (
          <text
            data-testid="sd-title"
            x={width / 2}
            y={20}
            textAnchor="middle"
            className="fill-current text-sm font-medium"
          >
            {title}
          </text>
        )}

        {/* -- Step 0: Population distribution sketch ---------------------- */}
        <AnimatePresence>
          {isVisible('population') && (
            <motion.g
              data-testid="sd-population"
              initial="hidden"
              animate={isCurrent('population') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Population curve */}
              <motion.path
                data-testid="sd-pop-curve"
                d={popCurvePath}
                fill="none"
                stroke={primaryColor}
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Population baseline */}
              <motion.line
                x1={padding.left}
                y1={popBaseY}
                x2={padding.left + plotWidth}
                y2={popBaseY}
                stroke="currentColor"
                strokeWidth={1}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Population mean marker */}
              <motion.line
                data-testid="sd-pop-mean"
                x1={padding.left + plotWidth / 2}
                y1={popBaseY}
                x2={padding.left + plotWidth / 2}
                y2={popBaseY - popCurveH * 0.85}
                stroke={accentColor}
                strokeWidth={1.5}
                strokeDasharray="4,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Label */}
              <motion.text
                x={padding.left + plotWidth / 2}
                y={padding.top - 5}
                textAnchor="middle"
                className="text-xs font-medium"
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'אוכלוסייה' : 'Population'}: {'\u03BC'}={populationMean}, {'\u03C3'}={populationStd}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 1: Sampling process ------------------------------------ */}
        <AnimatePresence>
          {isVisible('sampling') && (
            <motion.g
              data-testid="sd-sampling"
              initial="hidden"
              animate={isCurrent('sampling') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Arrow from population to sampling dist */}
              <motion.path
                data-testid="sd-arrow"
                d={`M ${padding.left + plotWidth / 2} ${popBaseY + 5} L ${padding.left + plotWidth / 2} ${bottomSectionTop - 10}`}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                fill="none"
                markerEnd="url(#sd-arrowhead)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Arrowhead marker */}
              <defs>
                <marker
                  id="sd-arrowhead"
                  markerWidth="10"
                  markerHeight="7"
                  refX="10"
                  refY="3.5"
                  orient="auto"
                >
                  <polygon points="0 0, 10 3.5, 0 7" fill="currentColor" />
                </marker>
              </defs>

              {/* Label */}
              <motion.text
                x={padding.left + plotWidth / 2 + 10}
                y={(popBaseY + bottomSectionTop) / 2}
                className="fill-current text-xs"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                n={sampleSize}, {numSamples}x
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 2: Sampling distribution histogram ---------------------- */}
        <AnimatePresence>
          {isVisible('distribution') && (
            <motion.g
              data-testid="sd-distribution"
              initial="hidden"
              animate={isCurrent('distribution') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {/* Axes */}
              <motion.line
                x1={padding.left}
                y1={barBaseY}
                x2={padding.left + plotWidth}
                y2={barBaseY}
                stroke="currentColor"
                strokeWidth={diagram.lineWeight}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* Histogram bars */}
              {histogramData.map((bin, i) => {
                const x1 = toSvgX(bin.min)
                const x2 = toSvgX(bin.max)
                const bw = x2 - x1
                const barH = (bin.count / maxBinCount) * plotHeight * 0.85
                const topY = barBaseY - barH

                return (
                  <motion.rect
                    key={`hbin-${i}`}
                    data-testid={`sd-bin-${i}`}
                    x={x1}
                    y={topY}
                    width={bw}
                    height={Math.max(barH, 0)}
                    fill={primaryColor}
                    opacity={0.6}
                    stroke={primaryColor}
                    strokeWidth={0.5}
                    initial={{ scaleY: 0 }}
                    animate={{ scaleY: 1 }}
                    transition={{
                      type: 'spring',
                      stiffness: 200,
                      damping: 20,
                      delay: i * 0.03,
                    }}
                    style={{ transformOrigin: `${x1 + bw / 2}px ${barBaseY}px` }}
                  />
                )
              })}

              {/* Mean marker */}
              <motion.line
                data-testid="sd-mean-line"
                x1={meanX}
                y1={bottomSectionTop}
                x2={meanX}
                y2={barBaseY}
                stroke={accentColor}
                strokeWidth={diagram.lineWeight}
                strokeDasharray="6,3"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              {/* SE label */}
              <motion.text
                x={padding.left + plotWidth / 2}
                y={barBaseY + 15}
                textAnchor="middle"
                className="text-xs"
                fill={primaryColor}
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                SE = {'\u03C3'}/{'\u221A'}n = {standardError.toFixed(2)}
              </motion.text>
            </motion.g>
          )}
        </AnimatePresence>

        {/* -- Step 3: CLT Normal curve overlay ----------------------------- */}
        <AnimatePresence>
          {showCLT && isVisible('clt') && (
            <motion.g
              data-testid="sd-clt"
              initial="hidden"
              animate={isCurrent('clt') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              <motion.path
                data-testid="sd-clt-curve"
                d={cltPath}
                fill="none"
                stroke="#ef4444"
                strokeWidth={diagram.lineWeight + 0.5}
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
              />

              <motion.text
                x={width - padding.right - 5}
                y={bottomSectionTop + 15}
                textAnchor="end"
                className="text-xs font-medium"
                fill="#ef4444"
                initial="hidden"
                animate="visible"
                variants={labelAppearVariants}
              >
                {language === 'he' ? 'עקומה נורמלית (CLT)' : 'Normal (CLT)'}
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

export default SamplingDistribution
