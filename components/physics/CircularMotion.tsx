'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { type DiagramStepConfig, type Force } from '@/types/physics'
import { ForceVector } from './ForceVector'
import { useDiagramBase } from '@/hooks/useDiagramBase'
import type { SubjectKey } from '@/lib/diagram-theme'
import type { VisualComplexityLevel } from '@/lib/visual-complexity'
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

interface CircularMotionData {
  /** Radius of the circular path */
  radius: number
  /** Mass of the object */
  mass?: number
  /** Speed of the object */
  speed?: number
  /** Angular position in degrees (0 = right, counterclockwise positive) */
  angularPosition?: number
  /** Show velocity vector tangent to path */
  showVelocity?: boolean
  /** Show centripetal acceleration */
  showAcceleration?: boolean
  /** Show centripetal force */
  showCentripetalForce?: boolean
  /** Show angular velocity */
  showAngularVelocity?: boolean
  /** Forces acting on the object */
  forces?: Force[]
  /** Type: horizontal (turntable), vertical (ferris wheel), banked (car) */
  type?: 'horizontal' | 'vertical' | 'banked'
  /** Bank angle for banked curves */
  bankAngle?: number
  /** Title */
  title?: string
  /** Object label */
  objectLabel?: string
}

interface CircularMotionProps {
  data: CircularMotionData
  initialStep?: number
  stepConfig?: DiagramStepConfig[]
  onStepComplete?: () => void
  animationDuration?: number
  width?: number
  height?: number
  className?: string
  subject?: SubjectKey
  complexity?: VisualComplexityLevel
  language?: 'en' | 'he'
}

// ---------------------------------------------------------------------------
// Step label translations
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<string, { en: string; he: string }> = {
  path: { en: 'Draw the path', he: '\u05E6\u05D9\u05D5\u05E8 \u05D4\u05DE\u05E1\u05DC\u05D5\u05DC' },
  object: { en: 'Place the object', he: '\u05DE\u05D9\u05E7\u05D5\u05DD \u05D4\u05E2\u05E6\u05DD' },
  velocity: { en: 'Show velocity', he: '\u05D4\u05E6\u05D2\u05EA \u05DE\u05D4\u05D9\u05E8\u05D5\u05EA' },
  centripetal: { en: 'Centripetal force', he: '\u05DB\u05D5\u05D7 \u05E6\u05E0\u05D8\u05E8\u05D9\u05E4\u05D8\u05DC\u05D9' },
  angular: { en: 'Angular velocity', he: '\u05DE\u05D4\u05D9\u05E8\u05D5\u05EA \u05D6\u05D5\u05D5\u05D9\u05EA\u05D9\u05EA' },
  forces: { en: 'Additional forces', he: '\u05DB\u05D5\u05D7\u05D5\u05EA \u05E0\u05D5\u05E1\u05E4\u05D9\u05DD' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CircularMotion - SVG component for circular motion diagrams
 *
 * Quality checklist:
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
 */
export function CircularMotion({
  data,
  initialStep = 0,
  stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration = 500,
  width = 400,
  height = 400,
  className = '',
  subject = 'physics',
  complexity = 'middle_school',
  language = 'en',
}: CircularMotionProps) {
  const {
    radius,
    mass,
    speed,
    angularPosition = 45,
    showVelocity = true,
    showAcceleration = false,
    showCentripetalForce = false,
    showAngularVelocity = false,
    forces = [],
    type = 'horizontal',
    bankAngle = 0,
    title,
    objectLabel,
  } = data

  const reducedMotion = prefersReducedMotion()

  const centerX = width / 2
  const centerY = height / 2
  const displayRadius = Math.min(width, height) * 0.35 // Scale to fit

  // ------ Detect optional features ------
  const hasVelocity = showVelocity
  const hasCentripetal = showAcceleration || showCentripetalForce
  const hasAngular = showAngularVelocity
  const hasForces = forces.length > 0

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'path', label: STEP_LABELS.path.en, labelHe: STEP_LABELS.path.he },
      { id: 'object', label: STEP_LABELS.object.en, labelHe: STEP_LABELS.object.he },
    ]
    if (hasVelocity) {
      defs.push({ id: 'velocity', label: STEP_LABELS.velocity.en, labelHe: STEP_LABELS.velocity.he })
    }
    if (hasCentripetal) {
      defs.push({ id: 'centripetal', label: STEP_LABELS.centripetal.en, labelHe: STEP_LABELS.centripetal.he })
    }
    if (hasAngular) {
      defs.push({ id: 'angular', label: STEP_LABELS.angular.en, labelHe: STEP_LABELS.angular.he })
    }
    if (hasForces) {
      defs.push({ id: 'forces', label: STEP_LABELS.forces.en, labelHe: STEP_LABELS.forces.he })
    }
    return defs
  }, [hasVelocity, hasCentripetal, hasAngular, hasForces])

  // useDiagramBase -- step control, colors, lineWeight, RTL
  const diagram = useDiagramBase({
    totalSteps: stepDefs.length,
    subject,
    complexity,
    initialStep: initialStep,
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
    [diagram.colors.primary],
  )

  // Calculate object position on circle
  const objectPos = useMemo(() => {
    const angleRad = (angularPosition * Math.PI) / 180
    return {
      x: centerX + displayRadius * Math.cos(angleRad),
      y: centerY - displayRadius * Math.sin(angleRad),
    }
  }, [centerX, centerY, displayRadius, angularPosition])

  // Calculate velocity direction (tangent to circle, perpendicular to radius)
  const velocityAngle = angularPosition + 90 // Tangent is perpendicular to radius

  // Current step config
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > diagram.currentStep) {
      return stepConfig[diagram.currentStep]
    }
    return { step: diagram.currentStep }
  }, [diagram.currentStep, stepConfig])

  // Visible forces based on step
  const visibleForces = useMemo(() => {
    if (currentStepConfig.visibleForces) {
      return forces.filter(f => currentStepConfig.visibleForces?.includes(f.name))
    }
    // When forces step is visible, show all forces
    if (isVisible('forces')) {
      return forces
    }
    return []
  }, [forces, currentStepConfig, isVisible])

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // ---------------------------------------------------------------------------
  // Render helpers
  // ---------------------------------------------------------------------------

  // Render circular path
  const renderPath = () => (
    <AnimatePresence>
      {isVisible('path') && (
        <motion.g
          data-testid="cm-path"
          initial="hidden"
          animate={isCurrent('path') ? 'spotlight' : 'visible'}
          variants={spotlight}
        >
          {/* Dashed circle path */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={displayRadius}
            fill="none"
            stroke={diagram.colors.light}
            strokeWidth={diagram.lineWeight}
            strokeDasharray="8 4"
            initial="hidden"
            animate="visible"
            variants={lineDrawVariants}
          />

          {/* Center point */}
          <motion.circle
            cx={centerX}
            cy={centerY}
            r={4}
            fill={diagram.colors.primary}
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
          />

          {/* Radius line to object position */}
          <motion.line
            x1={centerX}
            y1={centerY}
            x2={objectPos.x}
            y2={objectPos.y}
            stroke={diagram.colors.accent}
            strokeWidth={1.5}
            strokeDasharray="4 3"
            initial="hidden"
            animate="visible"
            variants={lineDrawVariants}
          />

          {/* Radius label */}
          <motion.text
            x={(centerX + objectPos.x) / 2 + 10}
            y={(centerY + objectPos.y) / 2}
            fontSize={12}
            fill={diagram.colors.accent}
            fontFamily="'Inter', system-ui, sans-serif"
            initial="hidden"
            animate="visible"
            variants={labelAppearVariants}
            transition={{ delay: 0.3 }}
          >
            r = {radius}m
          </motion.text>
        </motion.g>
      )}
    </AnimatePresence>
  )

  // Render the moving object
  const renderObject = () => (
    <AnimatePresence>
      {isVisible('object') && (
        <motion.g
          data-testid="cm-object"
          initial="hidden"
          animate={isCurrent('object') ? 'spotlight' : 'visible'}
          variants={spotlight}
        >
          {/* Shadow */}
          <ellipse
            cx={objectPos.x + 2}
            cy={objectPos.y + 3}
            rx={15}
            ry={5}
            fill="rgba(0,0,0,0.1)"
          />

          {/* Object (sphere/particle) */}
          <circle
            cx={objectPos.x}
            cy={objectPos.y}
            r={18}
            fill="url(#object-grad-circular)"
            stroke={diagram.colors.primary}
            strokeWidth={diagram.lineWeight}
          />

          {/* Highlight */}
          <ellipse
            cx={objectPos.x - 5}
            cy={objectPos.y - 5}
            rx={5}
            ry={4}
            fill="rgba(255,255,255,0.5)"
          />

          {/* Label */}
          {(objectLabel || mass) && (
            <motion.text
              x={objectPos.x}
              y={objectPos.y + 35}
              textAnchor="middle"
              fontSize={11}
              className="fill-current text-gray-600 dark:text-gray-400"
              fontFamily="'Inter', system-ui, sans-serif"
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
              transition={{ delay: 0.2 }}
            >
              {objectLabel || (mass ? `m = ${mass} kg` : '')}
            </motion.text>
          )}
        </motion.g>
      )}
    </AnimatePresence>
  )

  // Render velocity vector
  const renderVelocity = () => {
    if (!hasVelocity) return null

    return (
      <AnimatePresence>
        {isVisible('velocity') && (
          <motion.g
            data-testid="cm-velocity"
            initial="hidden"
            animate={isCurrent('velocity') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <ForceVector
              force={{
                name: 'velocity',
                type: 'applied',
                magnitude: speed ? speed * 5 : 40,
                angle: velocityAngle,
                symbol: 'v',
                color: '#8b5cf6',
              }}
              origin={objectPos}
              scale={1}
              highlighted={currentStepConfig.highlightForces?.includes('velocity')}
              showLabel={true}
              showMagnitude={speed !== undefined}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={200}
              useGradient={true}
            />
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Render centripetal acceleration/force
  const renderCentripetal = () => {
    if (!hasCentripetal) return null

    const centripetalAngle = angularPosition + 180 // Points toward center

    return (
      <AnimatePresence>
        {isVisible('centripetal') && (
          <motion.g
            data-testid="cm-centripetal"
            initial="hidden"
            animate={isCurrent('centripetal') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            <ForceVector
              force={{
                name: showCentripetalForce ? 'Fc' : 'ac',
                type: 'centripetal',
                magnitude: 35,
                angle: centripetalAngle,
                symbol: showCentripetalForce ? 'F' : 'a',
                subscript: 'c',
                color: diagram.colors.primary,
              }}
              origin={objectPos}
              scale={1}
              highlighted={true}
              showLabel={true}
              showMagnitude={false}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={400}
              useGradient={true}
            />
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Render angular velocity indicator
  const renderAngularVelocity = () => {
    if (!hasAngular) return null

    return (
      <AnimatePresence>
        {isVisible('angular') && (
          <motion.g
            data-testid="cm-angular"
            initial="hidden"
            animate={isCurrent('angular') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            {/* Curved arrow around center */}
            <motion.path
              d={`M ${centerX + 25} ${centerY}
                  A 25 25 0 0 0 ${centerX} ${centerY - 25}`}
              fill="none"
              stroke={diagram.colors.accent}
              strokeWidth={diagram.lineWeight}
              markerEnd="url(#omega-arrow)"
              initial="hidden"
              animate="visible"
              variants={lineDrawVariants}
            />
            <motion.text
              x={centerX + 35}
              y={centerY - 15}
              fontSize={14}
              fill={diagram.colors.primary}
              fontFamily="'Inter', system-ui, sans-serif"
              fontWeight="500"
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
              transition={{ delay: 0.3 }}
            >
              {'\u03C9'}
            </motion.text>
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Render additional forces
  const renderForces = () => {
    if (!hasForces) return null

    return (
      <AnimatePresence>
        {isVisible('forces') && (
          <motion.g
            data-testid="cm-forces"
            initial="hidden"
            animate={isCurrent('forces') ? 'spotlight' : 'visible'}
            variants={spotlight}
          >
            {visibleForces.map((force, index) => (
              <ForceVector
                key={force.name}
                force={force}
                origin={force.origin ? { x: centerX + force.origin.x, y: centerY + force.origin.y } : objectPos}
                scale={2}
                highlighted={currentStepConfig.highlightForces?.includes(force.name)}
                showLabel={true}
                showMagnitude={currentStepConfig.highlightForces?.includes(force.name)}
                animation="draw"
                animationDuration={reducedMotion ? 0 : animationDuration}
                animationDelay={200 + index * 150}
                useGradient={true}
              />
            ))}
          </motion.g>
        )}
      </AnimatePresence>
    )
  }

  // Render diagram based on type
  const renderTypeSpecific = () => {
    if (type === 'vertical') {
      // Add ground line for vertical circle (like ferris wheel)
      return (
        <motion.g
          data-testid="cm-ground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <line
            x1={0}
            y1={centerY + displayRadius + 30}
            x2={width}
            y2={centerY + displayRadius + 30}
            stroke={diagram.colors.light}
            strokeWidth={diagram.lineWeight}
          />
          {/* Hatching */}
          {Array.from({ length: 20 }).map((_, i) => (
            <line
              key={i}
              x1={i * 25}
              y1={centerY + displayRadius + 30}
              x2={i * 25 + 15}
              y2={centerY + displayRadius + 40}
              stroke={diagram.colors.light}
              strokeWidth={1}
            />
          ))}
        </motion.g>
      )
    }

    if (type === 'banked') {
      // Show banked curve cross-section
      const bankRad = (bankAngle * Math.PI) / 180
      return (
        <motion.g
          data-testid="cm-banked"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          {/* Banked surface */}
          <line
            x1={centerX - 80}
            y1={centerY + displayRadius + 20}
            x2={centerX + 80}
            y2={centerY + displayRadius + 20 - 160 * Math.tan(bankRad)}
            stroke={diagram.colors.accent}
            strokeWidth={diagram.lineWeight + 1}
          />
          {/* Bank angle arc */}
          <path
            d={`M ${centerX + 50} ${centerY + displayRadius + 20}
                A 30 30 0 0 0 ${centerX + 50 + 30 * Math.cos(bankRad)} ${centerY + displayRadius + 20 - 30 * Math.sin(bankRad)}`}
            fill="none"
            stroke={diagram.colors.primary}
            strokeWidth={2}
          />
          <text
            x={centerX + 90}
            y={centerY + displayRadius + 10}
            fontSize={12}
            fill={diagram.colors.primary}
            fontFamily="'Inter', system-ui, sans-serif"
          >
            {'\u03B8'} = {bankAngle}{'\u00B0'}
          </text>
        </motion.g>
      )
    }

    return null
  }

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div
      data-testid="circular-motion"
      className={className}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Circular motion diagram with radius ${radius}m`}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id="bg-gradient-circular" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="stop-color-white dark:stop-color-gray-900" stopColor="currentColor" />
            <stop offset="100%" stopColor={diagram.backgrounds.light.fill} />
          </linearGradient>

          <radialGradient id="object-grad-circular" cx="30%" cy="30%">
            <stop offset="0%" stopColor={diagram.colors.light} />
            <stop offset="100%" stopColor={diagram.colors.primary} stopOpacity={0.6} />
          </radialGradient>

          <pattern id="grid-pattern-circular" width="20" height="20" patternUnits="userSpaceOnUse">
            <path d="M 20 0 L 0 0 0 20" fill="none" stroke={diagram.backgrounds.light.grid} strokeWidth="0.5" />
          </pattern>

          <marker id="omega-arrow" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
            <path d="M 0 0 L 10 5 L 0 10 z" fill={diagram.colors.accent} />
          </marker>
        </defs>

        {/* Background */}
        <rect
          data-testid="cm-background"
          width={width}
          height={height}
          rx={12}
          className="fill-white dark:fill-gray-900"
        />
        <rect width={width} height={height} fill="url(#grid-pattern-circular)" opacity={0.5} rx={12} />

        {/* Title */}
        {title && (
          <motion.text
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

        {/* Type-specific elements */}
        {renderTypeSpecific()}

        {/* Circular path */}
        {renderPath()}

        {/* Moving object */}
        {renderObject()}

        {/* Velocity vector */}
        {renderVelocity()}

        {/* Centripetal acceleration/force */}
        {renderCentripetal()}

        {/* Angular velocity */}
        {renderAngularVelocity()}

        {/* Additional forces */}
        {renderForces()}
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

export default CircularMotion
