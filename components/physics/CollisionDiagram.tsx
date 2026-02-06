'use client'

import { useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { DiagramStepConfig, PhysicsObject } from '@/types/physics'
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

interface CollisionObject {
  object: PhysicsObject
  velocity: { before: number; after?: number }
  position?: { x: number; y: number }
}

interface CollisionDiagramData {
  /** Objects involved in collision */
  objects: CollisionObject[]
  /** Type of collision */
  collisionType: 'elastic' | 'inelastic' | 'perfectly_inelastic'
  /** Show before state */
  showBefore?: boolean
  /** Show after state */
  showAfter?: boolean
  /** Show momentum vectors */
  showMomentum?: boolean
  /** Show kinetic energy comparison */
  showEnergy?: boolean
  /** Title */
  title?: string
}

interface CollisionDiagramProps {
  data: CollisionDiagramData
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
  setup: { en: 'Setup', he: 'הגדרה' },
  before: { en: 'Before collision', he: 'לפני התנגשות' },
  collision: { en: 'Collision', he: 'התנגשות' },
  after: { en: 'After collision', he: 'אחרי התנגשות' },
  momentum: { en: 'Momentum conservation', he: 'שימור תנע' },
  energy: { en: 'Energy comparison', he: 'השוואת אנרגיה' },
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * CollisionDiagram - SVG component for collision problems
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
 * - Before/after visualization
 * - Velocity vectors
 * - Momentum arrows
 * - Elastic/inelastic collision types
 * - Energy comparison bars
 */
export function CollisionDiagram({
  data,
  initialStep,
  stepConfig: _stepConfig,
  onStepComplete: _onStepComplete,
  animationDuration: _animationDuration = 500,
  width = 500,
  height = 350,
  className = '',
  language = 'en',
  subject = 'physics',
  complexity = 'middle_school',
}: CollisionDiagramProps) {
  const {
    objects,
    collisionType,
    showBefore = true,
    showAfter = true,
    showMomentum = false,
    showEnergy = false,
    title,
  } = data

  const reducedMotion = prefersReducedMotion()

  // Layout constants
  const beforeY = height * 0.3
  const afterY = height * 0.7
  const objectSpacing = 120
  const centerX = width / 2

  // ------ Detect optional features ------
  const hasMomentum = showMomentum
  const hasEnergy = showEnergy

  // Build dynamic step definitions
  const stepDefs = useMemo(() => {
    const defs: Array<{ id: string; label: string; labelHe: string }> = [
      { id: 'setup', label: STEP_LABELS.setup.en, labelHe: STEP_LABELS.setup.he },
    ]
    if (showBefore) {
      defs.push({ id: 'before', label: STEP_LABELS.before.en, labelHe: STEP_LABELS.before.he })
    }
    if (showAfter) {
      defs.push({ id: 'collision', label: STEP_LABELS.collision.en, labelHe: STEP_LABELS.collision.he })
      defs.push({ id: 'after', label: STEP_LABELS.after.en, labelHe: STEP_LABELS.after.he })
    }
    if (hasMomentum) {
      defs.push({ id: 'momentum', label: STEP_LABELS.momentum.en, labelHe: STEP_LABELS.momentum.he })
    }
    if (hasEnergy) {
      defs.push({ id: 'energy', label: STEP_LABELS.energy.en, labelHe: STEP_LABELS.energy.he })
    }
    return defs
  }, [showBefore, showAfter, hasMomentum, hasEnergy])

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

  // Current step label
  const currentStepDef = stepDefs[diagram.currentStep]
  const stepLabel = language === 'he' ? currentStepDef?.labelHe : currentStepDef?.label

  // Object animation variants
  const objectVariants = {
    hidden: { opacity: 0, scale: 0.8 },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring' as const,
        stiffness: 300,
        damping: 25,
        duration: reducedMotion ? 0 : 0.4,
      },
    },
  }

  // Render a collision object (block/sphere)
  const renderObject = (
    obj: CollisionObject,
    x: number,
    y: number,
    velocity: number,
    label: string,
    index: number
  ) => {
    const { object } = obj
    const objSize = object.width || 50
    const gradientId = `collision-obj-${index}-${label}`
    const defaultColor = index === 0 ? diagram.colors.primary : diagram.colors.accent

    return (
      <motion.g
        key={`${label}-obj-${index}`}
        data-testid={`collision-object-${label}-${index}`}
        initial="hidden"
        animate="visible"
        variants={objectVariants}
        transition={{ delay: index * 0.1 }}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={object.color || defaultColor} />
            <stop
              offset="100%"
              stopColor={object.color ? hexToRgba(object.color, 0.7) : hexToRgba(defaultColor, 0.7)}
            />
          </linearGradient>
        </defs>

        {/* Shadow */}
        <rect
          x={x - objSize / 2 + 2}
          y={y - objSize / 2 + 2}
          width={objSize}
          height={objSize}
          fill="rgba(0,0,0,0.1)"
          rx={object.type === 'sphere' ? objSize / 2 : 6}
        />

        {/* Object */}
        {object.type === 'sphere' ? (
          <circle
            cx={x}
            cy={y}
            r={objSize / 2}
            fill={`url(#${gradientId})`}
            stroke={COLORS.gray[500]}
            strokeWidth={diagram.lineWeight}
          />
        ) : (
          <rect
            x={x - objSize / 2}
            y={y - objSize / 2}
            width={objSize}
            height={objSize}
            fill={`url(#${gradientId})`}
            stroke={COLORS.gray[500]}
            strokeWidth={diagram.lineWeight}
            rx={6}
          />
        )}

        {/* Mass label */}
        <text
          x={x}
          y={y - 5}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={14}
          fontWeight="600"
          fill="white"
          fontFamily="'Inter', system-ui, sans-serif"
        >
          {object.label || `m${index + 1}`}
        </text>
        {object.mass && (
          <text
            x={x}
            y={y + 12}
            textAnchor="middle"
            fontSize={10}
            fill="white"
            fontFamily="'JetBrains Mono', monospace"
          >
            {object.mass}kg
          </text>
        )}

        {/* Velocity vector */}
        {velocity !== 0 && (
          <>
            <motion.line
              x1={x + (velocity > 0 ? objSize / 2 + 5 : -objSize / 2 - 5)}
              y1={y}
              x2={
                x +
                (velocity > 0
                  ? objSize / 2 + 5 + Math.abs(velocity) * 3
                  : -objSize / 2 - 5 - Math.abs(velocity) * 3)
              }
              y2={y}
              stroke={diagram.colors.primary}
              strokeWidth={diagram.lineWeight}
              markerEnd="url(#velocity-arrow)"
              initial="hidden"
              animate="visible"
              variants={lineDrawVariants}
              transition={{ delay: 0.3 }}
            />
            <motion.text
              x={
                x +
                (velocity > 0
                  ? objSize / 2 + 20 + Math.abs(velocity) * 1.5
                  : -objSize / 2 - 20 - Math.abs(velocity) * 1.5)
              }
              y={y - 12}
              textAnchor="middle"
              fontSize={11}
              fill={diagram.colors.primary}
              fontFamily="'JetBrains Mono', monospace"
              initial="hidden"
              animate="visible"
              variants={labelAppearVariants}
              transition={{ delay: 0.4 }}
            >
              v = {velocity > 0 ? '+' : ''}
              {velocity} m/s
            </motion.text>
          </>
        )}
      </motion.g>
    )
  }

  // Render before state
  const renderBeforeState = () => {
    if (!showBefore) return null

    return (
      <motion.g
        data-testid="collision-before-state"
        initial="hidden"
        animate={isCurrent('before') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Section label */}
        <motion.text
          x={40}
          y={beforeY - 50}
          fontSize={14}
          fontWeight="600"
          fill={diagram.colors.primary}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
        >
          {language === 'he' ? 'לפני:' : 'Before:'}
        </motion.text>

        {/* Objects */}
        {objects.map((obj, index) => {
          const x = centerX + (index - (objects.length - 1) / 2) * objectSpacing
          return renderObject(obj, x, beforeY, obj.velocity.before, 'before', index)
        })}

        {/* Collision point indicator */}
        <motion.circle
          cx={centerX}
          cy={beforeY}
          r={5}
          fill={diagram.colors.accent}
          initial={{ scale: 0 }}
          animate={{ scale: [0, 1.5, 1] }}
          transition={{ duration: reducedMotion ? 0 : 0.5, delay: 0.5 }}
        />
      </motion.g>
    )
  }

  // Render collision arrow
  const renderCollisionArrow = () => {
    return (
      <motion.g
        data-testid="collision-arrow"
        initial="hidden"
        animate={isCurrent('collision') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        <motion.line
          x1={centerX}
          y1={beforeY + 40}
          x2={centerX}
          y2={afterY - 50}
          stroke={COLORS.gray[400]}
          strokeWidth={diagram.lineWeight}
          strokeDasharray="6 4"
          initial="hidden"
          animate="visible"
          variants={lineDrawVariants}
        />
        <motion.polygon
          points={`${centerX},${afterY - 45} ${centerX - 6},${afterY - 55} ${centerX + 6},${afterY - 55}`}
          fill={COLORS.gray[400]}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
        />
        <motion.text
          x={centerX + 15}
          y={(beforeY + afterY) / 2}
          fontSize={10}
          fill={COLORS.gray[500]}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.5 }}
        >
          {language === 'he' ? 'התנגשות' : 'Collision'}
        </motion.text>
      </motion.g>
    )
  }

  // Render after state
  const renderAfterState = () => {
    if (!showAfter) return null

    const isPerfectlyInelastic = collisionType === 'perfectly_inelastic'

    return (
      <motion.g
        data-testid="collision-after-state"
        initial="hidden"
        animate={isCurrent('after') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        {/* Section label */}
        <motion.text
          x={40}
          y={afterY - 50}
          fontSize={14}
          fontWeight="600"
          fill={diagram.colors.primary}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
        >
          {language === 'he' ? 'אחרי:' : 'After:'}
        </motion.text>

        {/* Collision type label */}
        <motion.text
          x={width - 40}
          y={afterY - 50}
          textAnchor="end"
          fontSize={11}
          fill={COLORS.gray[500]}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.2 }}
        >
          {collisionType === 'elastic'
            ? language === 'he'
              ? 'אלסטית'
              : 'Elastic'
            : collisionType === 'inelastic'
              ? language === 'he'
                ? 'לא אלסטית'
                : 'Inelastic'
              : language === 'he'
                ? 'לא אלסטית מושלמת'
                : 'Perfectly Inelastic'}
        </motion.text>

        {/* Objects after collision */}
        {isPerfectlyInelastic ? (
          // Combined object for perfectly inelastic
          <motion.g
            data-testid="collision-combined-object"
            initial="hidden"
            animate="visible"
            variants={objectVariants}
            transition={{ delay: 0.6 }}
          >
            <rect
              x={centerX - 40}
              y={afterY - 30}
              width={80}
              height={60}
              fill="url(#combined-gradient)"
              stroke={COLORS.gray[600]}
              strokeWidth={diagram.lineWeight}
              rx={8}
            />
            <defs>
              <linearGradient id="combined-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor={diagram.colors.primary} />
                <stop offset="50%" stopColor="#a78bfa" />
                <stop offset="100%" stopColor={diagram.colors.accent} />
              </linearGradient>
            </defs>
            <text
              x={centerX}
              y={afterY - 5}
              textAnchor="middle"
              fontSize={12}
              fontWeight="600"
              fill="white"
              fontFamily="'Inter', system-ui, sans-serif"
            >
              {objects.map((o) => o.object.label || 'm').join('+')}
            </text>
            <text
              x={centerX}
              y={afterY + 12}
              textAnchor="middle"
              fontSize={10}
              fill="white"
              fontFamily="'JetBrains Mono', monospace"
            >
              {objects.reduce((sum, o) => sum + (o.object.mass || 1), 0)}kg
            </text>

            {/* Combined velocity */}
            {objects[0].velocity.after !== undefined && (
              <motion.line
                x1={centerX + 45}
                y1={afterY}
                x2={centerX + 45 + Math.abs(objects[0].velocity.after) * 3}
                y2={afterY}
                stroke={diagram.colors.primary}
                strokeWidth={diagram.lineWeight}
                markerEnd="url(#velocity-arrow)"
                initial="hidden"
                animate="visible"
                variants={lineDrawVariants}
                transition={{ delay: 0.8 }}
              />
            )}
          </motion.g>
        ) : (
          // Separate objects for elastic/inelastic
          objects.map((obj, index) => {
            const x = centerX + (index - (objects.length - 1) / 2) * objectSpacing
            const afterVelocity =
              obj.velocity.after !== undefined ? obj.velocity.after : obj.velocity.before
            return renderObject(obj, x, afterY, afterVelocity, 'after', index + 10)
          })
        )}
      </motion.g>
    )
  }

  // Render momentum comparison
  const renderMomentum = () => {
    if (!showMomentum) return null

    const beforeMomentum = objects.reduce(
      (sum, obj) => sum + (obj.object.mass || 1) * obj.velocity.before,
      0
    )
    const afterMomentum = objects.reduce(
      (sum, obj) => sum + (obj.object.mass || 1) * (obj.velocity.after ?? obj.velocity.before),
      0
    )
    const isConserved = Math.abs(beforeMomentum - afterMomentum) < 0.1

    return (
      <motion.g
        data-testid="collision-momentum"
        initial="hidden"
        animate={isCurrent('momentum') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        <rect
          x={width - 150}
          y={height - 80}
          width={140}
          height={70}
          className="fill-white dark:fill-gray-800"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
        />
        <motion.text
          x={width - 80}
          y={height - 62}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fill={diagram.colors.primary}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
        >
          {language === 'he' ? 'תנע' : 'Momentum'}
        </motion.text>
        <motion.text
          x={width - 80}
          y={height - 42}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-600 dark:fill-gray-400"
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.1 }}
        >
          p{language === 'he' ? ' לפני' : '₁'} = {beforeMomentum.toFixed(1)} kg·m/s
        </motion.text>
        <motion.text
          x={width - 80}
          y={height - 25}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-600 dark:fill-gray-400"
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.2 }}
        >
          p{language === 'he' ? ' אחרי' : '₂'} = {afterMomentum.toFixed(1)} kg·m/s
        </motion.text>
        <motion.text
          x={width - 80}
          y={height - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight="600"
          fill={isConserved ? COLORS.success[600] : COLORS.error[600]}
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.3 }}
        >
          {isConserved
            ? language === 'he'
              ? 'נשמר ✓'
              : '✓ Conserved'
            : language === 'he'
              ? 'לא שווה ≠'
              : '≠ Not equal'}
        </motion.text>
      </motion.g>
    )
  }

  // Render energy comparison
  const renderEnergy = () => {
    if (!showEnergy) return null

    const beforeKE = objects.reduce(
      (sum, obj) => sum + 0.5 * (obj.object.mass || 1) * obj.velocity.before ** 2,
      0
    )
    const afterKE = objects.reduce(
      (sum, obj) =>
        sum + 0.5 * (obj.object.mass || 1) * (obj.velocity.after ?? obj.velocity.before) ** 2,
      0
    )
    const energyLoss = beforeKE - afterKE
    const isConserved = Math.abs(energyLoss) < 0.1

    return (
      <motion.g
        data-testid="collision-energy"
        initial="hidden"
        animate={isCurrent('energy') ? 'spotlight' : 'visible'}
        variants={spotlight}
      >
        <rect
          x={10}
          y={height - 80}
          width={140}
          height={70}
          className="fill-white dark:fill-gray-800"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={6}
        />
        <motion.text
          x={80}
          y={height - 62}
          textAnchor="middle"
          fontSize={12}
          fontWeight="600"
          fill={diagram.colors.accent}
          fontFamily="'Inter', system-ui, sans-serif"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
        >
          {language === 'he' ? 'אנרגיה קינטית' : 'Kinetic Energy'}
        </motion.text>
        <motion.text
          x={80}
          y={height - 42}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-600 dark:fill-gray-400"
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.1 }}
        >
          KE{language === 'he' ? ' לפני' : '₁'} = {beforeKE.toFixed(1)} J
        </motion.text>
        <motion.text
          x={80}
          y={height - 25}
          textAnchor="middle"
          fontSize={10}
          className="fill-gray-600 dark:fill-gray-400"
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.2 }}
        >
          KE{language === 'he' ? ' אחרי' : '₂'} = {afterKE.toFixed(1)} J
        </motion.text>
        <motion.text
          x={80}
          y={height - 8}
          textAnchor="middle"
          fontSize={10}
          fontWeight="600"
          fill={isConserved ? COLORS.success[600] : COLORS.warning[600]}
          fontFamily="'JetBrains Mono', monospace"
          initial="hidden"
          animate="visible"
          variants={labelAppearVariants}
          transition={{ delay: 0.3 }}
        >
          {isConserved
            ? language === 'he'
              ? 'נשמרת ✓'
              : '✓ Conserved'
            : language === 'he'
              ? `אבדה: ${energyLoss.toFixed(1)} J`
              : `Lost: ${energyLoss.toFixed(1)} J`}
        </motion.text>
      </motion.g>
    )
  }

  return (
    <div
      data-testid="collision-diagram"
      className={`collision-diagram ${className}`}
      style={{ width: '100%', maxWidth: width }}
    >
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        className="text-gray-800 dark:text-gray-200"
        role="img"
        aria-label={`Collision diagram: ${collisionType} collision with ${objects.length} objects`}
      >
        {/* Definitions */}
        <defs>
          <linearGradient id="bg-gradient-collision" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" className="[stop-color:white] dark:[stop-color:#111827]" />
            <stop offset="100%" className="[stop-color:#f9fafb] dark:[stop-color:#1f2937]" />
          </linearGradient>

          <pattern id="grid-pattern-collision" width="20" height="20" patternUnits="userSpaceOnUse">
            <path
              d="M 20 0 L 0 0 0 20"
              fill="none"
              className="stroke-gray-100 dark:stroke-gray-800"
              strokeWidth="0.5"
            />
          </pattern>

          <marker
            id="velocity-arrow"
            markerWidth="10"
            markerHeight="10"
            refX="9"
            refY="5"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10 z" fill={diagram.colors.primary} />
          </marker>
        </defs>

        {/* Background */}
        <rect
          data-testid="collision-background"
          width={width}
          height={height}
          rx={12}
          className="fill-white dark:fill-gray-900"
        />
        <rect
          width={width}
          height={height}
          fill="url(#grid-pattern-collision)"
          opacity={0.5}
          rx={12}
        />

        {/* ── Step 0: Setup / Title ─────────────────────────────────── */}
        <AnimatePresence>
          {isVisible('setup') && (
            <motion.g
              data-testid="collision-setup"
              initial="hidden"
              animate={isCurrent('setup') ? 'spotlight' : 'visible'}
              variants={spotlight}
            >
              {title && (
                <motion.text
                  x={width / 2}
                  y={28}
                  textAnchor="middle"
                  fontSize={16}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  className="fill-gray-800 dark:fill-gray-200"
                  initial="hidden"
                  animate="visible"
                  variants={labelAppearVariants}
                >
                  {title}
                </motion.text>
              )}
            </motion.g>
          )}
        </AnimatePresence>

        {/* ── Step 1: Before state ──────────────────────────────────── */}
        <AnimatePresence>{isVisible('before') && renderBeforeState()}</AnimatePresence>

        {/* ── Step 2: Collision arrow ───────────────────────────────── */}
        <AnimatePresence>{isVisible('collision') && renderCollisionArrow()}</AnimatePresence>

        {/* ── Step 3: After state ───────────────────────────────────── */}
        <AnimatePresence>{isVisible('after') && renderAfterState()}</AnimatePresence>

        {/* ── Step 4: Momentum comparison ───────────────────────────── */}
        <AnimatePresence>{isVisible('momentum') && renderMomentum()}</AnimatePresence>

        {/* ── Step 5: Energy comparison ─────────────────────────────── */}
        <AnimatePresence>{isVisible('energy') && renderEnergy()}</AnimatePresence>
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

export default CollisionDiagram
