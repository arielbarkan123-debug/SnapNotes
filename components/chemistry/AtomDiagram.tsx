'use client'

import { useState, useEffect, useMemo, Component, type ReactNode } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  type AtomDiagramData,
  type ElectronShell,
  SHELL_COLORS,
  CHARGE_COLORS,
  ELEMENT_CATEGORY_COLORS,
  generateElectronConfigNotation,
  getValenceElectrons,
} from '@/types/chemistry'

// Error Boundary for graceful fallback
interface ErrorBoundaryState {
  hasError: boolean
  error?: Error
}

class AtomDiagramErrorBoundary extends Component<
  { children: ReactNode; fallback?: ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: ReactNode; fallback?: ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="flex items-center justify-center h-64 bg-gray-100 rounded-lg p-4">
          <p className="text-gray-500 text-center">
            Unable to render atom diagram. Please try again.
          </p>
        </div>
      )
    }
    return this.props.children
  }
}
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import { prefersReducedMotion } from '@/lib/diagram-animations'

interface AtomDiagramProps {
  data: AtomDiagramData
  /** Current step to display (0 = nucleus only, 1+ = progressive shell reveal) */
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
  /** Show electron configuration notation (1s², 2s², etc.) */
  showElectronConfig?: boolean
  /** Show shell capacity labels (max 2, max 8, etc.) */
  showShellCapacity?: boolean
  /** Highlight valence (outermost) electrons */
  highlightValence?: boolean
  /** Show educational "Why" explanations */
  showExplanations?: boolean
}

/**
 * AtomDiagram - Visualizes atomic structure with electron shells
 *
 * Features:
 * - Animated electron orbit reveals (shell by shell)
 * - Nucleus with proton/neutron indication
 * - Element symbol and atomic information
 * - Step-synced for educational progression
 * - Accessibility: respects prefers-reduced-motion
 */
function AtomDiagram({
  data,
  currentStep = 0,
  onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 350,
  height = 350,
  className = '',
  language = 'en',
  showElectronConfig = true,
  showShellCapacity = true,
  highlightValence = true,
  showExplanations = true,
}: AtomDiagramProps) {
  // Data validation - ensure we have required fields
  const safeData = useMemo(() => {
    const element = data?.element || {
      atomicNumber: 1,
      symbol: '?',
      name: 'Unknown',
      atomicMass: 0,
      neutrons: 0,
      electronConfig: [{ n: 1, electrons: 1, maxElectrons: 2 }],
      category: 'nonmetal' as const,
    }

    // Ensure electronConfig is valid
    if (!element.electronConfig || !Array.isArray(element.electronConfig) || element.electronConfig.length === 0) {
      element.electronConfig = [{ n: 1, electrons: 1, maxElectrons: 2 }]
    }

    return {
      element,
      showProtonCount: data?.showProtonCount ?? true,
      showNeutronCount: data?.showNeutronCount ?? true,
      showElectronCount: data?.showElectronCount ?? true,
      showSymbol: data?.showSymbol ?? true,
      showName: data?.showName ?? true,
      showAtomicNumber: data?.showAtomicNumber ?? true,
      title: data?.title,
      steps: data?.steps,
    }
  }, [data])

  const {
    element,
    showProtonCount,
    showNeutronCount,
    showElectronCount,
    showSymbol,
    showName,
    showAtomicNumber,
    title,
    steps,
  } = safeData

  // Calculate full electron configuration notation (available for complete view)
  const _fullElectronConfig = useMemo(
    () => {
      try {
        return generateElectronConfigNotation(element.electronConfig)
      } catch {
        return ''
      }
    },
    [element.electronConfig]
  )

  // Get valence electron count
  const valenceElectrons = useMemo(
    () => {
      try {
        return getValenceElectrons(element.electronConfig)
      } catch {
        return 0
      }
    },
    [element.electronConfig]
  )

  // Check if a shell is the valence shell
  const isValenceShell = (shellIndex: number): boolean => {
    return highlightValence && shellIndex === element.electronConfig.length - 1
  }

  const reducedMotion = prefersReducedMotion()
  const [_animationComplete, setAnimationComplete] = useState<Set<number>>(new Set())

  // Calculate center and dimensions
  const centerX = width / 2
  const centerY = height / 2
  const maxRadius = Math.min(width, height) / 2 - 40
  const nucleusRadius = 25

  // Calculate shell radii based on number of shells
  const shellRadii = useMemo(() => {
    const numShells = element.electronConfig.length
    const minShellRadius = nucleusRadius + 25
    const shellSpacing = (maxRadius - minShellRadius) / Math.max(numShells, 1)

    return element.electronConfig.map((_, i) =>
      minShellRadius + (i * shellSpacing)
    )
  }, [element.electronConfig, maxRadius])

  // Determine which shells are visible based on step
  const visibleShells = useMemo(() => {
    if (steps && steps.length > 0) {
      // Use step configuration
      const currentStepConfig = steps[Math.min(currentStep, steps.length - 1)]
      if (currentStepConfig.type === 'nucleus') return 0
      if (currentStepConfig.type === 'shell' || currentStepConfig.type === 'electrons') {
        return currentStepConfig.shellNumber || 0
      }
      if (currentStepConfig.type === 'complete') {
        return element.electronConfig.length
      }
      return Math.min(currentStep, element.electronConfig.length)
    }
    // Default: show shells progressively (step 0 = nucleus, step 1+ = shells)
    return Math.min(Math.max(0, currentStep), element.electronConfig.length)
  }, [currentStep, steps, element.electronConfig.length])

  // Show nucleus after step 0
  const showNucleus = currentStep >= 0

  // Handle animation completion
  const handleShellAnimationComplete = (shellIndex: number) => {
    setAnimationComplete(prev => {
      const next = new Set(prev)
      next.add(shellIndex)
      return next
    })

    if (shellIndex === visibleShells - 1) {
      onStepComplete?.()
    }
  }

  // Reset animation state when step changes
  useEffect(() => {
    setAnimationComplete(new Set())
  }, [currentStep])

  // Generate electron positions around a shell
  const getElectronPositions = (shell: ElectronShell, radius: number) => {
    const positions: Array<{ x: number; y: number; delay: number }> = []
    const numElectrons = shell.electrons

    for (let i = 0; i < numElectrons; i++) {
      const angle = (2 * Math.PI * i) / numElectrons - Math.PI / 2
      positions.push({
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
        delay: i * 0.05, // Stagger electron appearance
      })
    }

    return positions
  }

  // Nucleus component
  const renderNucleus = () => {
    const categoryColor = ELEMENT_CATEGORY_COLORS[element.category]

    return (
      <motion.g
        className="nucleus"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{
          type: 'spring',
          stiffness: 300,
          damping: 20,
          duration: reducedMotion ? 0 : 0.5,
        }}
      >
        {/* Nucleus glow */}
        <motion.circle
          cx={centerX}
          cy={centerY}
          r={nucleusRadius + 5}
          fill={hexToRgba(categoryColor, 0.2)}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.2, 1] }}
          transition={{ duration: reducedMotion ? 0 : 0.6 }}
        />

        {/* Main nucleus */}
        <circle
          cx={centerX}
          cy={centerY}
          r={nucleusRadius}
          fill={`url(#atom-nucleus-gradient)`}
          stroke={categoryColor}
          strokeWidth={2}
        />

        {/* Proton/Neutron count in nucleus */}
        {(showProtonCount || showNeutronCount) && (
          <g className="nucleus-info">
            {showProtonCount && (
              <text
                x={centerX}
                y={centerY - (showNeutronCount ? 5 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fontFamily="'Inter', system-ui, sans-serif"
                fill={CHARGE_COLORS.positive}
              >
                {element.atomicNumber}p⁺
              </text>
            )}
            {showNeutronCount && (
              <text
                x={centerX}
                y={centerY + (showProtonCount ? 8 : 0)}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={10}
                fontWeight="600"
                fontFamily="'Inter', system-ui, sans-serif"
                fill={COLORS.gray[600]}
              >
                {element.neutrons}n⁰
              </text>
            )}
          </g>
        )}
      </motion.g>
    )
  }

  // Electron shell component
  const renderShell = (shell: ElectronShell, index: number) => {
    const radius = shellRadii[index]
    const shellColor = SHELL_COLORS[index % SHELL_COLORS.length]
    const electrons = getElectronPositions(shell, radius)
    const isVisible = index < visibleShells
    const baseDelay = index * 0.3
    const isValence = isValenceShell(index)

    // Enhanced valence shell color
    const effectiveShellColor = isValence ? '#f59e0b' : shellColor // amber for valence

    return (
      <AnimatePresence key={`shell-${index}`}>
        {isVisible && (
          <motion.g
            className={`electron-shell shell-${index + 1} ${isValence ? 'valence-shell' : ''}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onAnimationComplete={() => handleShellAnimationComplete(index)}
          >
            {/* Shell orbit ring - thicker for valence shell */}
            <motion.circle
              cx={centerX}
              cy={centerY}
              r={radius}
              fill="none"
              stroke={hexToRgba(effectiveShellColor, isValence ? 0.5 : 0.3)}
              strokeWidth={isValence ? 2.5 : 1.5}
              strokeDasharray={isValence ? 'none' : '6 4'}
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{
                pathLength: {
                  duration: reducedMotion ? 0 : 0.5,
                  delay: reducedMotion ? 0 : baseDelay,
                  ease: 'easeInOut',
                },
                opacity: { duration: 0.2, delay: reducedMotion ? 0 : baseDelay },
              }}
            />

            {/* Valence shell indicator */}
            {isValence && highlightValence && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : baseDelay + 0.5 }}
              >
                <rect
                  x={centerX + radius - 40}
                  y={centerY - radius - 22}
                  width={80}
                  height={18}
                  rx={4}
                  fill="#fef3c7"
                  stroke="#f59e0b"
                  strokeWidth={1}
                />
                <text
                  x={centerX + radius}
                  y={centerY - radius - 11}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={9}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill="#92400e"
                >
                  {language === 'he' ? `אלקטרוני ערכיות: ${valenceElectrons}` : `Valence: ${valenceElectrons}e⁻`}
                </text>
              </motion.g>
            )}

            {/* Shell label with capacity (n=1, max 2) */}
            <motion.g
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: reducedMotion ? 0 : baseDelay + 0.3 }}
            >
              <text
                x={centerX + radius + 12}
                y={centerY - 6}
                textAnchor="start"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="600"
                fontFamily="'Inter', system-ui, sans-serif"
                fill={isValence ? '#f59e0b' : COLORS.gray[600]}
              >
                n={shell.n}
              </text>
              {showShellCapacity && (
                <text
                  x={centerX + radius + 12}
                  y={centerY + 8}
                  textAnchor="start"
                  dominantBaseline="middle"
                  fontSize={10}
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[500]}
                >
                  {language === 'he' ? `מקס ${shell.maxElectrons}` : `max ${shell.maxElectrons}`}
                </text>
              )}
            </motion.g>

            {/* Electrons - with valence highlighting */}
            {electrons.map((pos, eIndex) => (
              <motion.g key={`electron-${index}-${eIndex}`}>
                {/* Electron glow - larger for valence */}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isValence ? 12 : 9}
                  fill={hexToRgba(effectiveShellColor, isValence ? 0.45 : 0.3)}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: reducedMotion ? 0 : baseDelay + 0.4 + pos.delay,
                  }}
                />

                {/* Electron - larger for valence */}
                <motion.circle
                  cx={pos.x}
                  cy={pos.y}
                  r={isValence ? 6 : 5}
                  fill={effectiveShellColor}
                  stroke={hexToRgba(effectiveShellColor, 0.8)}
                  strokeWidth={isValence ? 1.5 : 1}
                  initial={{ scale: 0, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{
                    type: 'spring',
                    stiffness: 400,
                    damping: 15,
                    delay: reducedMotion ? 0 : baseDelay + 0.4 + pos.delay,
                  }}
                />

                {/* Minus sign on electron */}
                <motion.text
                  x={pos.x}
                  y={pos.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={isValence ? 9 : 8}
                  fontWeight="bold"
                  fill="white"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: reducedMotion ? 0 : baseDelay + 0.5 + pos.delay }}
                >
                  −
                </motion.text>
              </motion.g>
            ))}

            {/* Electron count label for this shell */}
            {showElectronCount && (
              <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: reducedMotion ? 0 : baseDelay + 0.6 }}
              >
                <rect
                  x={centerX - radius - 35}
                  y={centerY - 10}
                  width={28}
                  height={20}
                  rx={4}
                  fill={isValence ? '#fef3c7' : 'white'}
                  stroke={isValence ? '#f59e0b' : COLORS.gray[200]}
                  strokeWidth={1}
                />
                <text
                  x={centerX - radius - 21}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={10}
                  fontWeight="600"
                  fontFamily="'JetBrains Mono', monospace"
                  fill={isValence ? '#92400e' : effectiveShellColor}
                >
                  {shell.electrons}e⁻
                </text>
              </motion.g>
            )}
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Element info display
  const renderElementInfo = () => {
    const categoryColor = ELEMENT_CATEGORY_COLORS[element.category]

    return (
      <motion.g
        className="element-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.2, duration: 0.3 }}
      >
        {/* Info card */}
        <rect
          x={10}
          y={height - 70}
          width={90}
          height={60}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={8}
          style={{ filter: SHADOWS.soft }}
        />

        {/* Category color indicator */}
        <rect
          x={10}
          y={height - 70}
          width={4}
          height={60}
          fill={categoryColor}
          rx={2}
        />

        {showAtomicNumber && (
          <text
            x={22}
            y={height - 55}
            fontSize={9}
            fontFamily="'JetBrains Mono', monospace"
            fill={COLORS.gray[500]}
          >
            {element.atomicNumber}
          </text>
        )}

        {showSymbol && (
          <text
            x={55}
            y={height - 35}
            textAnchor="middle"
            fontSize={24}
            fontWeight="700"
            fontFamily="'Inter', system-ui, sans-serif"
            fill={categoryColor}
          >
            {element.symbol}
          </text>
        )}

        {showName && (
          <text
            x={55}
            y={height - 18}
            textAnchor="middle"
            fontSize={9}
            fontFamily="'Inter', system-ui, sans-serif"
            fill={COLORS.gray[600]}
          >
            {element.name}
          </text>
        )}
      </motion.g>
    )
  }

  // Electron configuration notation display
  const renderElectronConfig = () => {
    if (!showElectronConfig || visibleShells === 0) return null

    // Only show config for shells that have been revealed
    const partialConfig = element.electronConfig.slice(0, visibleShells)
    const partialNotation = generateElectronConfigNotation(partialConfig)

    return (
      <motion.g
        className="electron-config"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.4, duration: 0.3 }}
      >
        {/* Config card */}
        <rect
          x={110}
          y={height - 70}
          width={Math.max(140, partialNotation.length * 8 + 20)}
          height={60}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={8}
          style={{ filter: SHADOWS.soft }}
        />

        {/* Header */}
        <text
          x={120}
          y={height - 55}
          fontSize={9}
          fontWeight="500"
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[500]}
        >
          {language === 'he' ? 'תצורת אלקטרונים:' : 'Electron Config:'}
        </text>

        {/* Configuration notation */}
        <text
          x={120}
          y={height - 35}
          fontSize={13}
          fontWeight="600"
          fontFamily="'JetBrains Mono', monospace"
          fill={COLORS.primary[600]}
        >
          {partialNotation}
        </text>

        {/* Total electrons */}
        <text
          x={120}
          y={height - 18}
          fontSize={9}
          fontFamily="'Inter', system-ui, sans-serif"
          fill={COLORS.gray[500]}
        >
          {language === 'he'
            ? `סה"כ: ${partialConfig.reduce((sum, s) => sum + s.electrons, 0)} אלקטרונים`
            : `Total: ${partialConfig.reduce((sum, s) => sum + s.electrons, 0)} electrons`}
        </text>
      </motion.g>
    )
  }

  // Get current step info for per-step explanations
  const currentStepInfo = steps?.[Math.min(currentStep, (steps?.length || 1) - 1)]

  // Educational explanation panel - prioritizes step-specific explanation over generated
  const renderEducationalExplanation = () => {
    if (!showExplanations || visibleShells === 0) return null

    // PRIORITY 1: Use step-specific explanation if provided
    const stepWhyExplanation = currentStepInfo
      ? (language === 'he' ? currentStepInfo.whyExplanationHe : currentStepInfo.whyExplanation)
      : null

    // PRIORITY 2: Generate explanation based on current shell (fallback)
    let message = ''
    if (stepWhyExplanation) {
      message = stepWhyExplanation
    } else {
      // Generate fallback explanation based on current shell state
      const currentShellIndex = Math.min(visibleShells - 1, element.electronConfig.length - 1)
      if (currentShellIndex < 0) return null

      const currentShell = element.electronConfig[currentShellIndex]
      const isFull = currentShell.electrons === currentShell.maxElectrons
      const isValence = currentShellIndex === element.electronConfig.length - 1

      if (language === 'he') {
        if (isValence) {
          message = `קליפת הערכיות מכילה ${currentShell.electrons} אלקטרונים. `
          message += isFull ? 'הקליפה מלאה - האטום יציב.' : `צריך ${currentShell.maxElectrons - currentShell.electrons} אלקטרונים להשלמה.`
        } else {
          message = isFull ? 'קליפה מלאה - האלקטרונים הבאים עוברים לקליפה הבאה.' : `קליפה ${currentShellIndex + 1} מכילה ${currentShell.electrons} מתוך ${currentShell.maxElectrons} אלקטרונים.`
        }
      } else {
        if (isValence) {
          message = `Valence shell has ${currentShell.electrons} electrons. `
          message += isFull ? 'Full shell - stable atom.' : `Needs ${currentShell.maxElectrons - currentShell.electrons} more to complete.`
        } else {
          message = isFull ? 'Full shell - electrons fill the next shell.' : `Shell ${currentShellIndex + 1} has ${currentShell.electrons} of ${currentShell.maxElectrons} electrons.`
        }
      }
    }

    // Also check for step-specific common mistake
    const stepCommonMistake = currentStepInfo
      ? (language === 'he' ? currentStepInfo.commonMistakeHe : currentStepInfo.commonMistake)
      : null

    return (
      <motion.g
        className="educational-explanation"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reducedMotion ? 0 : 0.5, duration: 0.3 }}
      >
        {/* Explanation box at top */}
        <rect
          x={10}
          y={title ? 42 : 8}
          width={width - 85}
          height={38}
          fill="#eff6ff"
          stroke="#3b82f6"
          strokeWidth={1}
          rx={6}
        />

        {/* Light bulb icon */}
        <text
          x={22}
          y={title ? 65 : 31}
          fontSize={14}
          dominantBaseline="middle"
        >
          💡
        </text>

        {/* Explanation text */}
        <text
          x={40}
          y={title ? 56 : 22}
          fontSize={9}
          fontWeight="500"
          fontFamily="'Inter', system-ui, sans-serif"
          fill="#1e40af"
        >
          {language === 'he' ? 'למה?' : 'Why?'}
        </text>
        <text
          x={40}
          y={title ? 70 : 36}
          fontSize={9}
          fontFamily="'Inter', system-ui, sans-serif"
          fill="#3b82f6"
        >
          {message.length > 60 ? message.substring(0, 57) + '...' : message}
        </text>

        {/* Common mistake warning (if step provides one) */}
        {stepCommonMistake && (
          <>
            <rect
              x={10}
              y={title ? 85 : 51}
              width={width - 85}
              height={20}
              fill="#fef3c7"
              stroke="#f59e0b"
              strokeWidth={1}
              rx={4}
            />
            <text
              x={22}
              y={title ? 97 : 63}
              fontSize={12}
              dominantBaseline="middle"
            >
              ⚠️
            </text>
            <text
              x={40}
              y={title ? 97 : 63}
              fontSize={8}
              fontFamily="'Inter', system-ui, sans-serif"
              fill="#92400e"
              dominantBaseline="middle"
            >
              {stepCommonMistake.length > 50 ? stepCommonMistake.substring(0, 47) + '...' : stepCommonMistake}
            </text>
          </>
        )}
      </motion.g>
    )
  }

  // Step info display
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
          x={width - 160}
          y={height - 45}
          width={150}
          height={35}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
          style={{ filter: SHADOWS.soft }}
        />
        <text
          x={width - 85}
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

  // Calculate total electrons for display
  const totalElectrons = element.electronConfig.reduce((sum, shell) => sum + shell.electrons, 0)

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`atom-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`${element.name} atom with ${element.atomicNumber} protons and ${totalElectrons} electrons`}
    >
      {/* Definitions */}
      <defs>
        {/* Nucleus gradient */}
        <radialGradient id="atom-nucleus-gradient" cx="35%" cy="35%">
          <stop offset="0%" stopColor={hexToRgba(CHARGE_COLORS.positive, 0.8)} />
          <stop offset="70%" stopColor={CHARGE_COLORS.positive} />
          <stop offset="100%" stopColor={hexToRgba(CHARGE_COLORS.positive, 0.6)} />
        </radialGradient>

        {/* Background gradient */}
        <linearGradient id="atom-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>
      </defs>

      {/* Background */}
      <rect width={width} height={height} fill="url(#atom-bg-gradient)" rx={12} />

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

      {/* Electron shells (render first so they're behind nucleus) */}
      {element.electronConfig.map((shell, index) => renderShell(shell, index))}

      {/* Nucleus (render after shells so it's on top) */}
      {showNucleus && renderNucleus()}

      {/* Educational explanation (at top) */}
      {renderEducationalExplanation()}

      {/* Element info card */}
      {renderElementInfo()}

      {/* Electron configuration notation */}
      {renderElectronConfig()}

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

// Wrapped export with error boundary
function AtomDiagramWithErrorBoundary(props: AtomDiagramProps) {
  return (
    <AtomDiagramErrorBoundary>
      <AtomDiagram {...props} />
    </AtomDiagramErrorBoundary>
  )
}

export { AtomDiagram, AtomDiagramWithErrorBoundary }
export default AtomDiagramWithErrorBoundary
