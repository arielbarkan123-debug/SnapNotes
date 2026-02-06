'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { PulleySystemData, DiagramStepConfig } from '@/types/physics'
import { ForceVector } from './ForceVector'
import { COLORS, hexToRgba } from '@/lib/diagram-theme'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'
import {
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
  prefersReducedMotion,
} from '@/lib/diagram-animations'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface PulleySystemProps {
  data: PulleySystemData
  /** @deprecated Use initialStep instead */
  currentStep?: number
  /** Starting step (0-indexed) */
  initialStep?: number
  stepConfig?: DiagramStepConfig[]
  onStepComplete?: () => void
  animationDuration?: number
  width?: number
  height?: number
  className?: string
  language?: 'en' | 'he'
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  setup: { en: 'Draw pulley system', he: '\u05E6\u05D9\u05D5\u05E8 \u05DE\u05E2\u05E8\u05DB\u05EA \u05D2\u05DC\u05D2\u05DC' },
  masses: { en: 'Add masses', he: '\u05D4\u05D5\u05E1\u05E4\u05EA \u05DE\u05E1\u05D5\u05EA' },
  tensions: { en: 'Show tension forces', he: '\u05D4\u05E6\u05D2\u05EA \u05DB\u05D5\u05D7\u05D5\u05EA \u05DE\u05EA\u05D9\u05D7\u05D4' },
  acceleration: { en: 'Show acceleration', he: '\u05D4\u05E6\u05D2\u05EA \u05EA\u05D0\u05D5\u05E6\u05D4' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * PulleySystem - SVG component for rendering pulley system diagrams
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
 * - [x] Progressive reveal with AnimatePresence + isVisible()
 *
 * Features:
 * - Single and multiple pulley configurations
 * - Masses connected via ropes
 * - Tension vectors
 * - Animated rope/string
 * - Acceleration indicators
 */
export function PulleySystem({
  data,
  initialStep,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration = 500,
  width = 450,
  height = 400,
  className = '',
  language = 'en',
  subject = 'physics',
  complexity = 'middle_school',
}: PulleySystemProps) {
  const { pulleys, masses, tensions = [], showAcceleration = false, title } = data

  const reducedMotion = prefersReducedMotion()

  // Determine which step groups exist based on data
  const hasTensions = tensions.length > 0
  const hasAcceleration = showAcceleration

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'setup', label: STEP_LABELS.setup.en, labelHe: STEP_LABELS.setup.he },
      { id: 'masses', label: STEP_LABELS.masses.en, labelHe: STEP_LABELS.masses.he },
    ]
    if (hasTensions) {
      defs.push({ id: 'tensions', label: STEP_LABELS.tensions.en, labelHe: STEP_LABELS.tensions.he })
    }
    if (hasAcceleration) {
      defs.push({ id: 'acceleration', label: STEP_LABELS.acceleration.en, labelHe: STEP_LABELS.acceleration.he })
    }
    return defs
  }, [hasTensions, hasAcceleration])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
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

  // Spotlight variants
  const spotlight = useMemo(
    () => createSpotlightVariants(diagram.colors.primary),
    [diagram.colors.primary]
  )

  // Get current step config for tension visibility
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > diagram.currentStep) {
      return stepConfig[diagram.currentStep]
    }
    return { step: diagram.currentStep, visibleForces: tensions.map((t) => t.name) }
  }, [diagram.currentStep, stepConfig, tensions])

  // Visible tensions based on step
  const visibleTensions = useMemo(() => {
    if (!isVisible('tensions')) return []
    if (currentStepConfig.visibleForces) {
      return tensions.filter((t) => currentStepConfig.visibleForces?.includes(t.name))
    }
    return tensions
  }, [tensions, currentStepConfig, isVisible])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Render a pulley wheel
  const renderPulley = (pulley: (typeof pulleys)[0], index: number) => {
    const { position, radius, fixed = true } = pulley
    const gradientId = `pulley-gradient-${index}`

    return (
      <motion.g
        key={`pulley-${index}`}
        data-testid={`pulley-${index}`}
        initial="hidden"
        animate={isCurrent('setup') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Pulley mounting bracket (for fixed pulleys) */}
        {fixed && (
          <>
            <rect
              x={position.x - radius * 0.3}
              y={position.y - radius - 20}
              width={radius * 0.6}
              height={20}
              fill={COLORS.gray[500]}
              stroke={COLORS.gray[600]}
              strokeWidth={diagram.lineWeight}
            />
            {/* Ceiling/support */}
            <motion.line
              x1={position.x - radius * 1.5}
              y1={position.y - radius - 20}
              x2={position.x + radius * 1.5}
              y2={position.y - radius - 20}
              stroke={COLORS.gray[600]}
              strokeWidth={diagram.lineWeight + 2}
              initial="hidden"
              animate="visible"
              variants={lineDrawVariants}
            />
            {/* Hatching for fixed support */}
            {[-1, -0.5, 0, 0.5, 1].map((offset, i) => (
              <line
                key={i}
                x1={position.x + offset * radius}
                y1={position.y - radius - 20}
                x2={position.x + offset * radius - 8}
                y2={position.y - radius - 30}
                stroke={COLORS.gray[500]}
                strokeWidth={1.5}
              />
            ))}
          </>
        )}

        {/* Pulley wheel shadow */}
        <ellipse
          cx={position.x + 2}
          cy={position.y + 3}
          rx={radius}
          ry={radius * 0.3}
          fill="rgba(0,0,0,0.1)"
        />

        {/* Pulley wheel */}
        <defs>
          <radialGradient id={gradientId} cx="30%" cy="30%">
            <stop offset="0%" stopColor={COLORS.gray[300]} />
            <stop offset="100%" stopColor={COLORS.gray[500]} />
          </radialGradient>
        </defs>
        <circle
          cx={position.x}
          cy={position.y}
          r={radius}
          fill={`url(#${gradientId})`}
          stroke={COLORS.gray[600]}
          strokeWidth={diagram.lineWeight}
        />

        {/* Inner groove */}
        <circle
          cx={position.x}
          cy={position.y}
          r={radius * 0.7}
          fill="none"
          stroke={COLORS.gray[400]}
          strokeWidth={diagram.lineWeight - 1}
        />

        {/* Axle */}
        <circle
          cx={position.x}
          cy={position.y}
          r={radius * 0.15}
          fill={COLORS.gray[700]}
          stroke={COLORS.gray[800]}
          strokeWidth={1}
        />
      </motion.g>
    )
  }

  // Render a mass block
  const renderMass = (massData: (typeof masses)[0], index: number) => {
    const { object, attachedTo, side } = massData
    const pulley = pulleys[attachedTo]

    // Calculate position based on which side of pulley
    const xOffset = side === 'left' ? -pulley.radius - 30 : pulley.radius + 30
    const massX = pulley.position.x + xOffset
    const massY = pulley.position.y + 100 // Hanging below

    const blockWidth = object.width || 50
    const blockHeight = object.height || 50
    const gradientId = `mass-gradient-${index}`

    return (
      <motion.g
        key={`mass-${index}`}
        data-testid={`mass-${index}`}
        initial="hidden"
        animate={isCurrent('masses') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Rope from pulley to mass */}
        <motion.path
          data-testid={`rope-${index}`}
          d={`M ${pulley.position.x + (side === 'left' ? -pulley.radius : pulley.radius)} ${pulley.position.y}
              L ${massX} ${massY - blockHeight / 2}`}
          fill="none"
          stroke={COLORS.gray[600]}
          strokeWidth={diagram.lineWeight}
          strokeLinecap="round"
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />

        {/* Shadow */}
        <rect
          x={massX - blockWidth / 2 + 3}
          y={massY - blockHeight / 2 + 3}
          width={blockWidth}
          height={blockHeight}
          fill="rgba(0,0,0,0.1)"
          rx={4}
        />

        {/* Mass block */}
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={object.color || COLORS.gray[200]} />
            <stop offset="100%" stopColor={object.color ? hexToRgba(object.color, 0.7) : COLORS.gray[400]} />
          </linearGradient>
        </defs>
        <rect
          x={massX - blockWidth / 2}
          y={massY - blockHeight / 2}
          width={blockWidth}
          height={blockHeight}
          fill={`url(#${gradientId})`}
          stroke={COLORS.gray[500]}
          strokeWidth={diagram.lineWeight}
          rx={4}
        />

        {/* Label */}
        {object.label && (
          <motion.text
            x={massX}
            y={massY - (object.mass ? 5 : 0)}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={14}
            fontWeight="600"
            fontFamily="'Inter', system-ui, sans-serif"
            fill={COLORS.gray[700]}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          >
            {object.label}
          </motion.text>
        )}

        {/* Mass value */}
        {object.mass && (
          <motion.text
            x={massX}
            y={massY + 12}
            textAnchor="middle"
            dominantBaseline="middle"
            fontSize={11}
            fontFamily="'JetBrains Mono', monospace"
            fill={COLORS.gray[500]}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
            transition={{ delay: 0.1 }}
          >
            {object.mass} kg
          </motion.text>
        )}
      </motion.g>
    )
  }

  // Render acceleration arrows
  const renderAcceleration = (massData: (typeof masses)[0], index: number) => {
    const { object, attachedTo, side } = massData
    const pulley = pulleys[attachedTo]

    const xOffset = side === 'left' ? -pulley.radius - 30 : pulley.radius + 30
    const massX = pulley.position.x + xOffset
    const massY = pulley.position.y + 100

    const blockWidth = object.width || 50

    return (
      <motion.g
        key={`accel-${index}`}
        data-testid={`acceleration-${index}`}
        initial="hidden"
        animate={isCurrent('acceleration') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        <motion.line
          x1={massX + blockWidth / 2 + 15}
          y1={massY}
          x2={massX + blockWidth / 2 + 15}
          y2={massY + 25}
          stroke={diagram.colors.primary}
          strokeWidth={diagram.lineWeight}
          markerEnd="url(#accel-arrow)"
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />
        <motion.text
          x={massX + blockWidth / 2 + 25}
          y={massY + 15}
          fontSize={12}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight="500"
          fill={diagram.colors.primary}
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.2 }}
        >
          a
        </motion.text>
      </motion.g>
    )
  }

  // Render tension forces
  const renderTensions = () => {
    return (
      <AnimatePresence>
        {visibleTensions.map((tension, index) => {
          // Calculate position based on tension config
          const origin = tension.origin || { x: width / 2, y: height / 2 }
          return (
            <ForceVector
              key={tension.name}
              force={tension}
              origin={{ x: origin.x, y: origin.y }}
              scale={2}
              highlighted={currentStepConfig.highlightForces?.includes(tension.name)}
              showLabel={true}
              showMagnitude={currentStepConfig.highlightForces?.includes(tension.name)}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={reducedMotion ? 0 : 300 + index * 150}
              useGradient={true}
            />
          )
        })}
      </AnimatePresence>
    )
  }

  return (
    <div
      data-testid="pulley-system"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={title || `Pulley system with ${pulleys.length} pulley(s) and ${masses.length} mass(es)`}
      >
        {/* Definitions */}
        <defs>
          {/* Background gradient */}
          <linearGradient id="bg-gradient-pulley" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" className="dark:stop-color-gray-900" />
            <stop offset="100%" stopColor={COLORS.gray[50]} className="dark:stop-color-gray-800" />
          </linearGradient>

          {/* Grid pattern */}
          <pattern id="grid-pattern-pulley" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              stroke={COLORS.gray[100]}
              strokeWidth="0.5"
            />
          </pattern>

          {/* Acceleration arrow marker */}
          <marker
            id="accel-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="5"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={diagram.colors.primary} />
          </marker>
        </defs>

        {/* Background */}
        <rect
          data-testid="pulley-background"
          width={width}
          height={height}
          rx={12}
          className="fill-white dark:fill-gray-900"
        />
        <rect width={width} height={height} fill="url(#grid-pattern-pulley)" opacity={0.5} rx={12} />

        {/* Title */}
        {title && (
          <motion.text
            data-testid="pulley-title"
            x={width / 2}
            y={28}
            textAnchor="middle"
            fontSize={16}
            fontWeight="600"
            fontFamily="'Inter', system-ui, sans-serif"
            className="fill-current"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {title}
          </motion.text>
        )}

        {/* ---- Step 0: Draw pulley system (setup) ---- */}
        <AnimatePresence>
          {isVisible('setup') && (
            <motion.g data-testid="pulley-setup">
              {pulleys.map((pulley, index) => renderPulley(pulley, index))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 1: Add masses ---- */}
        <AnimatePresence>
          {isVisible('masses') && (
            <motion.g data-testid="pulley-masses">
              {masses.map((mass, index) => renderMass(mass, index))}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 2: Show tension forces ---- */}
        <AnimatePresence>
          {hasTensions && isVisible('tensions') && (
            <motion.g
              data-testid="pulley-tensions"
              initial="hidden"
              animate={isCurrent('tensions') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {renderTensions()}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ---- Step 3: Show acceleration ---- */}
        <AnimatePresence>
          {hasAcceleration && isVisible('acceleration') && (
            <motion.g data-testid="pulley-acceleration">
              {masses.map((mass, index) => renderAcceleration(mass, index))}
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
          subjectColor={diagram.colors.primary}
          className="mt-2"
        />
      )}
    </div>
  )
}

export default PulleySystem
