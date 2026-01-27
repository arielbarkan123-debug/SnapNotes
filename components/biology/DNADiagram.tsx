'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type DNADiagramData,
  type Nucleotide,
  type BasePair,
  BASE_COLORS,
  DNA_BACKBONE_COLOR,
  HYDROGEN_BOND_COLOR,
  generateBasePairs,
} from '@/types/biology'
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface DNADiagramProps {
  data: DNADiagramData
  /** Current step to display */
  currentStep?: number
  /** Callback when step animation completes */
  onStepComplete?: () => void
  /** Animation duration in ms */
  animationDuration?: number
  /** Width of the SVG */
  width?: number
  /** Height of the SVG */
  height?: number
  /** Additional className */
  className?: string
  /** Language for labels */
  language?: 'en' | 'he'
}

/**
 * DNADiagram - Visualizes DNA double helix structure
 *
 * Features:
 * - Ladder or helix display mode
 * - Step-by-step base pair reveal
 * - Color-coded nucleotides (A-T, G-C)
 * - Hydrogen bond visualization
 * - Sugar-phosphate backbone
 */
export function DNADiagram({
  data,
  currentStep = 0,
  onStepComplete: _onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 400,
  height = 450,
  className = '',
  language = 'en',
}: DNADiagramProps) {
  const {
    sequence,
    displayMode = 'ladder',
    steps,
    showBaseLabels = true,
    showHydrogenBonds = true,
    showBackbone = true,
    showDirectionality = false,
    helixAngle: _helixAngle = 0,
    title,
  } = data

  const reducedMotion = prefersReducedMotion()

  // Generate base pairs from sequence
  const basePairs = useMemo(() => generateBasePairs(sequence), [sequence])

  // Calculate layout
  const paddingTop = title ? 50 : 30
  const paddingBottom = 50
  const availableHeight = height - paddingTop - paddingBottom
  const pairSpacing = Math.min(40, availableHeight / (basePairs.length || 1))
  const centerX = width / 2
  const ladderWidth = 120
  const backboneOffset = ladderWidth / 2 + 15

  // Determine visible base pairs based on step
  const visiblePairs = useMemo(() => {
    if (steps && steps.length > 0) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      if (currentStepConfig.type === 'backbone') return []
      if (currentStepConfig.type === 'bases') {
        // Show all bases without pairing lines
        return basePairs.map((bp) => ({ ...bp, showBond: false }))
      }
      if (currentStepConfig.type === 'pair' && currentStepConfig.basePairPosition !== undefined) {
        return basePairs.slice(0, currentStepConfig.basePairPosition + 1)
      }
      if (['label', 'complete'].includes(currentStepConfig.type)) {
        return basePairs
      }
    }
    // Default: show pairs progressively
    return basePairs.slice(0, Math.max(0, currentStep))
  }, [currentStep, steps, basePairs])

  // Show backbone based on step
  const shouldShowBackbone = useMemo(() => {
    if (!showBackbone) return false
    if (steps) {
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      return ['backbone', 'bases', 'pair', 'label', 'complete'].includes(currentStepConfig.type)
    }
    return currentStep >= 0
  }, [showBackbone, steps, currentStep])

  // Get base name
  const getBaseName = (base: Nucleotide): string => {
    const names: Record<string, Record<Nucleotide, string>> = {
      en: {
        A: 'Adenine',
        T: 'Thymine',
        G: 'Guanine',
        C: 'Cytosine',
        U: 'Uracil',
      },
      he: {
        A: 'אדנין',
        T: 'תימין',
        G: 'גואנין',
        C: 'ציטוזין',
        U: 'אורציל',
      },
    }
    return names[language]?.[base] || base
  }

  // Render backbone strands
  const renderBackbone = () => {
    if (!shouldShowBackbone) return null

    const startY = paddingTop
    const endY = paddingTop + pairSpacing * (basePairs.length - 1)

    if (displayMode === 'ladder') {
      return (
        <motion.g
          className="dna-backbone"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.5 }}
        >
          {/* Left strand (5' to 3') */}
          <motion.line
            x1={centerX - backboneOffset}
            y1={startY}
            x2={centerX - backboneOffset}
            y2={endY}
            stroke={DNA_BACKBONE_COLOR}
            strokeWidth={6}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, ease: 'easeOut' }}
          />

          {/* Right strand (3' to 5') */}
          <motion.line
            x1={centerX + backboneOffset}
            y1={startY}
            x2={centerX + backboneOffset}
            y2={endY}
            stroke={DNA_BACKBONE_COLOR}
            strokeWidth={6}
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: reducedMotion ? 0 : 0.6, delay: reducedMotion ? 0 : 0.1, ease: 'easeOut' }}
          />

          {/* Directionality labels */}
          {showDirectionality && (
            <>
              {/* Left strand */}
              <text
                x={centerX - backboneOffset - 20}
                y={startY - 10}
                textAnchor="middle"
                fontSize={12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
                fill={COLORS.gray[600]}
              >
                5&apos;
              </text>
              <text
                x={centerX - backboneOffset - 20}
                y={endY + 20}
                textAnchor="middle"
                fontSize={12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
                fill={COLORS.gray[600]}
              >
                3&apos;
              </text>

              {/* Right strand */}
              <text
                x={centerX + backboneOffset + 20}
                y={startY - 10}
                textAnchor="middle"
                fontSize={12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
                fill={COLORS.gray[600]}
              >
                3&apos;
              </text>
              <text
                x={centerX + backboneOffset + 20}
                y={endY + 20}
                textAnchor="middle"
                fontSize={12}
                fontFamily="'JetBrains Mono', monospace"
                fontWeight="600"
                fill={COLORS.gray[600]}
              >
                5&apos;
              </text>
            </>
          )}
        </motion.g>
      )
    }

    // Helix mode - curved backbones
    const helixAmplitude = 30
    const helixPeriod = 4 // Complete twist every 4 base pairs

    const generateHelixPath = (side: 'left' | 'right') => {
      const points: string[] = []
      const phase = side === 'right' ? Math.PI : 0

      for (let i = 0; i <= basePairs.length - 1; i += 0.1) {
        const y = paddingTop + i * pairSpacing
        const x = centerX + Math.sin((i / helixPeriod) * 2 * Math.PI + phase) * helixAmplitude
        points.push(`${i === 0 ? 'M' : 'L'} ${x} ${y}`)
      }

      return points.join(' ')
    }

    return (
      <motion.g
        className="dna-backbone-helix"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: reducedMotion ? 0 : 0.5 }}
      >
        <motion.path
          d={generateHelixPath('left')}
          fill="none"
          stroke={DNA_BACKBONE_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, ease: 'easeOut' }}
        />
        <motion.path
          d={generateHelixPath('right')}
          fill="none"
          stroke={DNA_BACKBONE_COLOR}
          strokeWidth={6}
          strokeLinecap="round"
          initial={{ pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: reducedMotion ? 0 : 0.8, delay: reducedMotion ? 0 : 0.1, ease: 'easeOut' }}
        />
      </motion.g>
    )
  }

  // Render a single base pair
  const renderBasePair = (pair: BasePair, index: number) => {
    const y = paddingTop + index * pairSpacing
    const leftX = centerX - ladderWidth / 2
    const rightX = centerX + ladderWidth / 2
    const baseRadius = 14
    const baseDelay = index * 0.1

    // Determine number of hydrogen bonds (A-T has 2, G-C has 3)
    const numBonds = pair.left === 'A' || pair.left === 'T' ? 2 : 3

    // Is this pair currently highlighted?
    const isHighlighted = pair.highlighted

    return (
      <AnimatePresence key={`pair-${index}`}>
        <motion.g
          className="base-pair"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ delay: reducedMotion ? 0 : baseDelay }}
        >
          {/* Hydrogen bonds between bases */}
          {showHydrogenBonds && (
            <motion.g
              className="hydrogen-bonds"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: reducedMotion ? 0 : baseDelay + 0.2 }}
            >
              {Array.from({ length: numBonds }).map((_, bondIndex) => {
                const bondOffset = (bondIndex - (numBonds - 1) / 2) * 8
                return (
                  <motion.line
                    key={bondIndex}
                    x1={leftX + baseRadius + 5}
                    y1={y + bondOffset}
                    x2={rightX - baseRadius - 5}
                    y2={y + bondOffset}
                    stroke={HYDROGEN_BOND_COLOR}
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{
                      duration: reducedMotion ? 0 : 0.3,
                      delay: reducedMotion ? 0 : baseDelay + 0.3 + bondIndex * 0.05,
                    }}
                  />
                )
              })}
            </motion.g>
          )}

          {/* Left base */}
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: reducedMotion ? 0 : baseDelay,
            }}
          >
            {/* Base glow for highlight */}
            {isHighlighted && (
              <circle
                cx={leftX}
                cy={y}
                r={baseRadius + 4}
                fill={hexToRgba(BASE_COLORS[pair.left], 0.3)}
              />
            )}
            {/* Base circle */}
            <circle
              cx={leftX}
              cy={y}
              r={baseRadius}
              fill={BASE_COLORS[pair.left]}
              stroke={hexToRgba(BASE_COLORS[pair.left], 0.8)}
              strokeWidth={2}
            />
            {/* Base letter */}
            <text
              x={leftX}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              fill="white"
            >
              {pair.left}
            </text>

            {/* Base label */}
            {showBaseLabels && (
              <text
                x={leftX - baseRadius - 8}
                y={y}
                textAnchor="end"
                dominantBaseline="central"
                fontSize={9}
                fontFamily="'Inter', system-ui, sans-serif"
                fill={COLORS.gray[500]}
              >
                {getBaseName(pair.left)}
              </text>
            )}
          </motion.g>

          {/* Right base (complementary) */}
          <motion.g
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: 'spring',
              stiffness: 300,
              damping: 20,
              delay: reducedMotion ? 0 : baseDelay + 0.1,
            }}
          >
            {/* Base glow for highlight */}
            {isHighlighted && (
              <circle
                cx={rightX}
                cy={y}
                r={baseRadius + 4}
                fill={hexToRgba(BASE_COLORS[pair.right], 0.3)}
              />
            )}
            {/* Base circle */}
            <circle
              cx={rightX}
              cy={y}
              r={baseRadius}
              fill={BASE_COLORS[pair.right]}
              stroke={hexToRgba(BASE_COLORS[pair.right], 0.8)}
              strokeWidth={2}
            />
            {/* Base letter */}
            <text
              x={rightX}
              y={y}
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={14}
              fontWeight="700"
              fontFamily="'JetBrains Mono', monospace"
              fill="white"
            >
              {pair.right}
            </text>

            {/* Base label */}
            {showBaseLabels && (
              <text
                x={rightX + baseRadius + 8}
                y={y}
                textAnchor="start"
                dominantBaseline="central"
                fontSize={9}
                fontFamily="'Inter', system-ui, sans-serif"
                fill={COLORS.gray[500]}
              >
                {getBaseName(pair.right)}
              </text>
            )}
          </motion.g>
        </motion.g>
      </AnimatePresence>
    )
  }

  // Render legend
  const renderLegend = () => (
    <motion.g
      className="dna-legend"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: reducedMotion ? 0 : 0.5 }}
    >
      <rect
        x={10}
        y={height - 65}
        width={140}
        height={55}
        fill="white"
        stroke={COLORS.gray[200]}
        strokeWidth={1}
        rx={6}
        style={{ filter: SHADOWS.soft }}
      />

      {/* Base pair labels */}
      {[
        { bases: 'A-T', colors: [BASE_COLORS.A, BASE_COLORS.T], bonds: 2 },
        { bases: 'G-C', colors: [BASE_COLORS.G, BASE_COLORS.C], bonds: 3 },
      ].map((item, i) => (
        <g key={item.bases} transform={`translate(20, ${height - 52 + i * 22})`}>
          <circle cx={0} cy={0} r={6} fill={item.colors[0]} />
          <line x1={8} y1={0} x2={22} y2={0} stroke={HYDROGEN_BOND_COLOR} strokeWidth={2} strokeDasharray="2 2" />
          <circle cx={30} cy={0} r={6} fill={item.colors[1]} />
          <text x={45} y={4} fontSize={10} fontFamily="'Inter', system-ui, sans-serif" fill={COLORS.gray[600]}>
            {item.bases} ({item.bonds} {language === 'he' ? 'קשרי מימן' : 'H-bonds'})
          </text>
        </g>
      ))}
    </motion.g>
  )

  // Step info
  const renderStepInfo = () => {
    const currentStepConfig = steps?.[Math.min(currentStep, (steps?.length || 1) - 1)]
    const label = currentStepConfig
      ? (language === 'he' ? currentStepConfig.descriptionHe : currentStepConfig.description)
      : null

    if (!label) return null

    return (
      <motion.g
        className="step-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.3, duration: 0.3 }}
      >
        <rect
          x={width - 180}
          y={height - 45}
          width={170}
          height={35}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
          style={{ filter: SHADOWS.soft }}
        />
        <text
          x={width - 95}
          y={height - 24}
          textAnchor="middle"
          fontSize={11}
          fill={COLORS.gray[600]}
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {label}
        </text>
      </motion.g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`dna-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`DNA structure with ${basePairs.length} base pairs`}
    >
      {/* Definitions */}
      <defs>
        <linearGradient id="dna-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#dna-bg-gradient)" rx={12} />

      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={25}
          textAnchor="middle"
          fontSize={16}
          fontWeight="600"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[800]}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {title}
        </motion.text>
      )}

      {/* Backbone strands */}
      {renderBackbone()}

      {/* Base pairs */}
      {visiblePairs.map((pair, index) => renderBasePair(pair, index))}

      {/* Legend */}
      {renderLegend()}

      {/* Step info */}
      {renderStepInfo()}

      {/* Step counter */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <rect
          x={width - 75}
          y={8}
          width={65}
          height={22}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={width - 42}
          y={21}
          textAnchor="middle"
          fontSize={11}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {language === 'he' ? `שלב ${currentStep + 1}` : `Step ${currentStep + 1}`}
        </text>
      </motion.g>
    </svg>
  )
}

export default DNADiagram
