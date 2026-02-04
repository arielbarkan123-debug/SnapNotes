'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { motion, AnimatePresence, useAnimation, type Variants } from 'framer-motion'
import {
  type FreeBodyDiagramData,
  type DiagramStepConfig,
  type Force,
} from '@/types/physics'
import { ForceVector } from './ForceVector'
import {
  COLORS,
  SHADOWS,
  hexToRgba,
} from '@/lib/diagram-theme'
import {
  createForceAnimationSequence,
  prefersReducedMotion,
} from '@/lib/diagram-animations'
import {
  calculateForceOrigin,
  type PhysicsObject as LayoutPhysicsObject,
} from '@/lib/visual-learning'

interface FreeBodyDiagramProps {
  data: FreeBodyDiagramData
  /** Current step to display (0 = base, 1+ = progressive force reveal) */
  currentStep?: number
  /** Step configuration for progressive reveal */
  stepConfig?: DiagramStepConfig[]
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
 * FreeBodyDiagram - Enhanced SVG component with choreographed animations
 *
 * Features:
 * - Framer Motion for smooth, choreographed animations
 * - Progressive force reveal with educational sequencing
 * - Object fade-in before forces appear
 * - Forces animate in order: weight → normal → friction → tension → net
 * - Professional visual design with gradients and shadows
 * - Step-synced with tutor explanations
 * - Accessibility: respects prefers-reduced-motion
 */
export function FreeBodyDiagram({
  data,
  currentStep = 0,
  stepConfig,
  onStepComplete,
  animationDuration = 500,
  width = 400,
  height = 350,
  className = '',
  language = 'en',
}: FreeBodyDiagramProps) {
  const {
    object,
    forces,
    coordinateSystem = 'standard',
    showComponents: _showComponents = false,
    showNetForce = false,
    showAngles = false,
    title,
    referenceAngle = 0,
    forceScale = 1,
    viewpoint = 'side',
    showAngleLabels = false,
    externalObjects = [],
    acceleration,
    givenInfo,
    unknowns = [],
    showForceMagnitudes = true,
  } = data

  const _controls = useAnimation()
  const reducedMotion = prefersReducedMotion()
  const [completedAnimations, setCompletedAnimations] = useState<Set<string>>(new Set())
  const [isObjectVisible, setIsObjectVisible] = useState(currentStep > 0)

  // Calculate center of diagram
  const centerX = width / 2
  const centerY = height / 2

  // Get current step configuration
  const currentStepConfig = useMemo(() => {
    if (stepConfig && stepConfig.length > currentStep) {
      return stepConfig[currentStep]
    }
    // Default: show all forces up to current step
    return {
      step: currentStep,
      visibleForces: forces.slice(0, currentStep).map((f) => f.name),
    }
  }, [currentStep, stepConfig, forces])

  // Calculate which forces should be visible based on step
  const visibleForces = useMemo(() => {
    if (currentStepConfig.visibleForces) {
      return forces.filter((f) => currentStepConfig.visibleForces?.includes(f.name))
    }
    // If no step config, show forces progressively
    return forces.slice(0, currentStep)
  }, [forces, currentStep, currentStepConfig])

  // Calculate highlighted forces
  const highlightedForces = useMemo(() => {
    return new Set(currentStepConfig.highlightForces || [])
  }, [currentStepConfig])

  // Create choreographed animation sequence for forces
  const forceAnimationSequence = useMemo(() => {
    const forceNames = visibleForces.map((f) => f.type.toLowerCase())
    return createForceAnimationSequence(forceNames, reducedMotion ? 0 : animationDuration / 1000)
  }, [visibleForces, animationDuration, reducedMotion])

  // Calculate animation delay for each force (choreographed)
  const getForceDelay = useCallback(
    (force: Force): number => {
      const type = force.type.toLowerCase()
      const sequence = forceAnimationSequence.get(type)
      // Add base delay for object to appear first
      const objectDelay = reducedMotion ? 0 : 200
      return objectDelay + (sequence?.delay || 0) * 1000
    },
    [forceAnimationSequence, reducedMotion]
  )

  // Handle animation completion for choreography
  const handleForceAnimationComplete = useCallback(
    (forceName: string) => {
      setCompletedAnimations((prev) => {
        const next = new Set(prev)
        next.add(forceName)
        return next
      })

      // Check if all forces have completed
      if (completedAnimations.size + 1 >= visibleForces.length) {
        onStepComplete?.()
      }
    },
    [completedAnimations, visibleForces, onStepComplete]
  )

  // Trigger object visibility when step changes
  useEffect(() => {
    if (currentStep > 0 && !isObjectVisible) {
      setIsObjectVisible(true)
    }
  }, [currentStep, isObjectVisible])

  // Animation variants for the object
  const objectVariants: Variants = {
    hidden: {
      opacity: 0,
      scale: 0.8,
    },
    visible: {
      opacity: 1,
      scale: 1,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 25,
        duration: reducedMotion ? 0 : 0.4,
      },
    },
  }

  // Render physics object with animation
  const renderObject = () => {
    const objSize = 50
    const objWidth = object.width || objSize
    const objHeight = object.height || objSize
    const objX = centerX - objWidth / 2
    const objY = centerY - objHeight / 2
    const gradientId = 'fbd-object-gradient'

    const objectContent = (() => {
      switch (object.type) {
        case 'block':
        case 'crate':
          return (
            <>
              {/* Shadow */}
              <rect
                x={objX + 3}
                y={objY + 3}
                width={objWidth}
                height={objHeight}
                fill="rgba(0,0,0,0.15)"
                rx={6}
              />
              {/* Main block with gradient */}
              <rect
                x={objX}
                y={objY}
                width={objWidth}
                height={objHeight}
                fill={`url(#${gradientId})`}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
                rx={6}
              />
              {object.label && (
                <text
                  x={centerX}
                  y={centerY - (object.mass ? 5 : 0)}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={centerY + 15}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={12}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'sphere':
          return (
            <>
              {/* Shadow */}
              <ellipse
                cx={centerX + 3}
                cy={centerY + 5}
                rx={(object.radius || objSize / 2) * 0.9}
                ry={(object.radius || objSize / 2) * 0.5}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Main sphere with gradient */}
              <circle
                cx={centerX}
                cy={centerY}
                r={object.radius || objSize / 2}
                fill={`url(#${gradientId})`}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
              />
              {/* Highlight for 3D effect */}
              <ellipse
                cx={centerX - 8}
                cy={centerY - 8}
                rx={8}
                ry={6}
                fill="rgba(255,255,255,0.5)"
              />
              {object.label && (
                <text
                  x={centerX}
                  y={centerY}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={16}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
            </>
          )

        case 'particle':
          return (
            <>
              <circle cx={centerX} cy={centerY} r={10} fill={COLORS.gray[600]} />
              <circle cx={centerX - 2} cy={centerY - 2} r={3} fill="rgba(255,255,255,0.4)" />
              {object.label && (
                <text
                  x={centerX + 18}
                  y={centerY - 12}
                  textAnchor="start"
                  fontSize={14}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
            </>
          )

        case 'boat':
          // Boat/ship shape - great for tugboat/tanker problems
          const boatWidth = object.width || 100
          const boatHeight = object.height || 40
          const bx = centerX - boatWidth / 2
          const by = centerY - boatHeight / 2
          
          // TOP-DOWN VIEW (bird's eye) - like the reference tanker diagram
          if (viewpoint === 'top') {
            const tankerLength = object.width || 160
            const tankerWidth = object.height || 35
            const tx = centerX - tankerLength / 2
            const ty = centerY - tankerWidth / 2
            return (
              <>
                {/* Tanker hull - top-down view (elongated rectangle with pointed bow) */}
                <path
                  d={`M ${tx + 15} ${ty}
                      L ${tx + tankerLength - 20} ${ty}
                      L ${tx + tankerLength} ${ty + tankerWidth / 2}
                      L ${tx + tankerLength - 20} ${ty + tankerWidth}
                      L ${tx + 15} ${ty + tankerWidth}
                      L ${tx} ${ty + tankerWidth / 2}
                      Z`}
                  fill="#d4a574"
                  stroke="#8b7355"
                  strokeWidth={2}
                />
                {/* Cargo holds - rectangular sections on deck */}
                {[0.15, 0.30, 0.45, 0.60, 0.75].map((pos, i) => (
                  <rect
                    key={i}
                    x={tx + tankerLength * pos}
                    y={ty + 5}
                    width={tankerLength * 0.12}
                    height={tankerWidth - 10}
                    fill="#c4956a"
                    stroke="#8b7355"
                    strokeWidth={1}
                    rx={2}
                  />
                ))}
                {/* Bridge/superstructure at stern */}
                <rect
                  x={tx + 8}
                  y={ty + tankerWidth * 0.25}
                  width={tankerLength * 0.08}
                  height={tankerWidth * 0.5}
                  fill="#f5f5f4"
                  stroke="#8b7355"
                  strokeWidth={1}
                  rx={2}
                />
                {/* Bow point highlight */}
                <path
                  d={`M ${tx + tankerLength - 20} ${ty + 3}
                      L ${tx + tankerLength - 5} ${ty + tankerWidth / 2}
                      L ${tx + tankerLength - 20} ${ty + tankerWidth - 3}`}
                  fill="#60a5fa"
                  opacity={0.3}
                />
              </>
            )
          }
          
          // SIDE VIEW (original)
          return (
            <>
              {/* Water waves (below boat) */}
              <path
                d={`M ${bx - 20} ${by + boatHeight + 5} 
                    Q ${bx} ${by + boatHeight} ${bx + 20} ${by + boatHeight + 5}
                    Q ${bx + 40} ${by + boatHeight + 10} ${bx + 60} ${by + boatHeight + 5}
                    Q ${bx + 80} ${by + boatHeight} ${bx + 100} ${by + boatHeight + 5}
                    Q ${bx + boatWidth + 20} ${by + boatHeight + 10} ${bx + boatWidth + 40} ${by + boatHeight + 5}`}
                fill="none"
                stroke="#60a5fa"
                strokeWidth={2}
                opacity={0.5}
              />
              {/* Shadow */}
              <ellipse
                cx={centerX}
                cy={by + boatHeight + 8}
                rx={boatWidth / 2 + 5}
                ry={6}
                fill="rgba(0,0,0,0.1)"
              />
              {/* Hull (boat body) */}
              <path
                d={`M ${bx} ${by + boatHeight * 0.3}
                    L ${bx + boatWidth * 0.1} ${by + boatHeight}
                    L ${bx + boatWidth * 0.9} ${by + boatHeight}
                    L ${bx + boatWidth} ${by + boatHeight * 0.3}
                    L ${bx + boatWidth * 0.95} ${by}
                    L ${bx + boatWidth * 0.05} ${by}
                    Z`}
                fill={object.color || '#475569'}
                stroke={COLORS.gray[600]}
                strokeWidth={2}
              />
              {/* Deck */}
              <rect
                x={bx + boatWidth * 0.15}
                y={by - boatHeight * 0.3}
                width={boatWidth * 0.5}
                height={boatHeight * 0.4}
                fill={object.color || '#64748b'}
                stroke={COLORS.gray[500]}
                strokeWidth={1.5}
                rx={3}
              />
              {/* Bridge/cabin */}
              <rect
                x={bx + boatWidth * 0.25}
                y={by - boatHeight * 0.6}
                width={boatWidth * 0.3}
                height={boatHeight * 0.35}
                fill="#94a3b8"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
                rx={2}
              />
              {/* Windows */}
              <rect
                x={bx + boatWidth * 0.28}
                y={by - boatHeight * 0.55}
                width={boatWidth * 0.1}
                height={boatHeight * 0.15}
                fill="#bfdbfe"
                rx={1}
              />
              <rect
                x={bx + boatWidth * 0.42}
                y={by - boatHeight * 0.55}
                width={boatWidth * 0.1}
                height={boatHeight * 0.15}
                fill="#bfdbfe"
                rx={1}
              />
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX}
                  y={centerY + boatHeight * 0.6}
                  textAnchor="middle"
                  fontSize={14}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={centerY + boatHeight * 0.6 + 16}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'car':
          // Car shape for vehicle problems
          const carWidth = object.width || 80
          const carHeight = object.height || 30
          const cx = centerX - carWidth / 2
          const cy = centerY - carHeight / 2
          return (
            <>
              {/* Shadow */}
              <ellipse
                cx={centerX}
                cy={cy + carHeight + 8}
                rx={carWidth / 2}
                ry={4}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Car body */}
              <path
                d={`M ${cx + carWidth * 0.1} ${cy + carHeight}
                    L ${cx} ${cy + carHeight}
                    L ${cx} ${cy + carHeight * 0.5}
                    L ${cx + carWidth * 0.15} ${cy + carHeight * 0.5}
                    L ${cx + carWidth * 0.25} ${cy}
                    L ${cx + carWidth * 0.75} ${cy}
                    L ${cx + carWidth * 0.85} ${cy + carHeight * 0.5}
                    L ${cx + carWidth} ${cy + carHeight * 0.5}
                    L ${cx + carWidth} ${cy + carHeight}
                    L ${cx + carWidth * 0.9} ${cy + carHeight}
                    Z`}
                fill={object.color || '#3b82f6'}
                stroke={COLORS.gray[600]}
                strokeWidth={2}
              />
              {/* Windows */}
              <path
                d={`M ${cx + carWidth * 0.28} ${cy + carHeight * 0.1}
                    L ${cx + carWidth * 0.48} ${cy + carHeight * 0.1}
                    L ${cx + carWidth * 0.48} ${cy + carHeight * 0.45}
                    L ${cx + carWidth * 0.2} ${cy + carHeight * 0.45}
                    Z`}
                fill="#bfdbfe"
              />
              <path
                d={`M ${cx + carWidth * 0.52} ${cy + carHeight * 0.1}
                    L ${cx + carWidth * 0.72} ${cy + carHeight * 0.1}
                    L ${cx + carWidth * 0.8} ${cy + carHeight * 0.45}
                    L ${cx + carWidth * 0.52} ${cy + carHeight * 0.45}
                    Z`}
                fill="#bfdbfe"
              />
              {/* Wheels */}
              <circle
                cx={cx + carWidth * 0.2}
                cy={cy + carHeight}
                r={carHeight * 0.25}
                fill="#374151"
                stroke="#1f2937"
                strokeWidth={2}
              />
              <circle
                cx={cx + carWidth * 0.2}
                cy={cy + carHeight}
                r={carHeight * 0.12}
                fill="#9ca3af"
              />
              <circle
                cx={cx + carWidth * 0.8}
                cy={cy + carHeight}
                r={carHeight * 0.25}
                fill="#374151"
                stroke="#1f2937"
                strokeWidth={2}
              />
              <circle
                cx={cx + carWidth * 0.8}
                cy={cy + carHeight}
                r={carHeight * 0.12}
                fill="#9ca3af"
              />
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX}
                  y={cy + carHeight + 25}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={cy + carHeight + 40}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'truck':
          // Truck shape
          const truckWidth = object.width || 100
          const truckHeight = object.height || 40
          const tx = centerX - truckWidth / 2
          const ty = centerY - truckHeight / 2
          return (
            <>
              {/* Shadow */}
              <ellipse
                cx={centerX}
                cy={ty + truckHeight + 8}
                rx={truckWidth / 2}
                ry={5}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Cargo area */}
              <rect
                x={tx}
                y={ty}
                width={truckWidth * 0.65}
                height={truckHeight}
                fill={object.color || '#64748b'}
                stroke={COLORS.gray[600]}
                strokeWidth={2}
                rx={2}
              />
              {/* Cab */}
              <path
                d={`M ${tx + truckWidth * 0.65} ${ty + truckHeight}
                    L ${tx + truckWidth * 0.65} ${ty + truckHeight * 0.3}
                    L ${tx + truckWidth * 0.75} ${ty}
                    L ${tx + truckWidth} ${ty}
                    L ${tx + truckWidth} ${ty + truckHeight}
                    Z`}
                fill={object.color ? object.color : '#475569'}
                stroke={COLORS.gray[600]}
                strokeWidth={2}
              />
              {/* Cab window */}
              <rect
                x={tx + truckWidth * 0.78}
                y={ty + truckHeight * 0.1}
                width={truckWidth * 0.18}
                height={truckHeight * 0.35}
                fill="#bfdbfe"
                rx={2}
              />
              {/* Wheels */}
              <circle
                cx={tx + truckWidth * 0.15}
                cy={ty + truckHeight}
                r={truckHeight * 0.22}
                fill="#374151"
                stroke="#1f2937"
                strokeWidth={2}
              />
              <circle
                cx={tx + truckWidth * 0.4}
                cy={ty + truckHeight}
                r={truckHeight * 0.22}
                fill="#374151"
                stroke="#1f2937"
                strokeWidth={2}
              />
              <circle
                cx={tx + truckWidth * 0.85}
                cy={ty + truckHeight}
                r={truckHeight * 0.22}
                fill="#374151"
                stroke="#1f2937"
                strokeWidth={2}
              />
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX}
                  y={ty + truckHeight + 22}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={ty + truckHeight + 36}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'airplane':
          // Airplane for aerodynamics problems
          const planeWidth = object.width || 90
          const planeHeight = object.height || 30
          const px = centerX - planeWidth / 2
          const py = centerY - planeHeight / 2
          return (
            <>
              {/* Fuselage */}
              <ellipse
                cx={centerX}
                cy={centerY}
                rx={planeWidth * 0.45}
                ry={planeHeight * 0.25}
                fill={object.color || '#e2e8f0'}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
              />
              {/* Nose */}
              <ellipse
                cx={px + planeWidth * 0.9}
                cy={centerY}
                rx={planeWidth * 0.12}
                ry={planeHeight * 0.18}
                fill={object.color || '#cbd5e1'}
                stroke={COLORS.gray[400]}
                strokeWidth={1.5}
              />
              {/* Wings */}
              <path
                d={`M ${centerX - planeWidth * 0.1} ${centerY}
                    L ${centerX - planeWidth * 0.25} ${py - planeHeight * 0.5}
                    L ${centerX + planeWidth * 0.1} ${py - planeHeight * 0.5}
                    L ${centerX + planeWidth * 0.05} ${centerY}
                    Z`}
                fill="#94a3b8"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
              />
              <path
                d={`M ${centerX - planeWidth * 0.1} ${centerY}
                    L ${centerX - planeWidth * 0.25} ${py + planeHeight * 1.5}
                    L ${centerX + planeWidth * 0.1} ${py + planeHeight * 1.5}
                    L ${centerX + planeWidth * 0.05} ${centerY}
                    Z`}
                fill="#94a3b8"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
              />
              {/* Tail */}
              <path
                d={`M ${px + planeWidth * 0.05} ${centerY}
                    L ${px} ${py - planeHeight * 0.3}
                    L ${px + planeWidth * 0.15} ${centerY}
                    Z`}
                fill="#94a3b8"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
              />
              {/* Windows */}
              {[0.3, 0.4, 0.5, 0.6].map((offset, i) => (
                <circle
                  key={i}
                  cx={px + planeWidth * offset}
                  cy={centerY - planeHeight * 0.08}
                  r={3}
                  fill="#bfdbfe"
                />
              ))}
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX}
                  y={py + planeHeight + 25}
                  textAnchor="middle"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={py + planeHeight + 40}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'person':
          // Stick figure person
          const personHeight = object.height || 60
          const headRadius = personHeight * 0.12
          const bodyTop = centerY - personHeight / 2 + headRadius * 2
          return (
            <>
              {/* Head */}
              <circle
                cx={centerX}
                cy={centerY - personHeight / 2 + headRadius}
                r={headRadius}
                fill={object.color || '#fcd34d'}
                stroke={COLORS.gray[600]}
                strokeWidth={2}
              />
              {/* Body */}
              <line
                x1={centerX}
                y1={bodyTop}
                x2={centerX}
                y2={centerY + personHeight * 0.1}
                stroke={COLORS.gray[600]}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Arms */}
              <line
                x1={centerX - personHeight * 0.25}
                y1={bodyTop + personHeight * 0.15}
                x2={centerX + personHeight * 0.25}
                y2={bodyTop + personHeight * 0.15}
                stroke={COLORS.gray[600]}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Legs */}
              <line
                x1={centerX}
                y1={centerY + personHeight * 0.1}
                x2={centerX - personHeight * 0.15}
                y2={centerY + personHeight / 2}
                stroke={COLORS.gray[600]}
                strokeWidth={3}
                strokeLinecap="round"
              />
              <line
                x1={centerX}
                y1={centerY + personHeight * 0.1}
                x2={centerX + personHeight * 0.15}
                y2={centerY + personHeight / 2}
                stroke={COLORS.gray[600]}
                strokeWidth={3}
                strokeLinecap="round"
              />
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX + personHeight * 0.3}
                  y={centerY}
                  textAnchor="start"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={centerY + personHeight / 2 + 18}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'rocket':
          // Rocket for thrust problems
          const rocketWidth = object.width || 25
          const rocketHeight = object.height || 70
          const rx = centerX - rocketWidth / 2
          const ry = centerY - rocketHeight / 2
          return (
            <>
              {/* Flame */}
              <path
                d={`M ${rx + rocketWidth * 0.3} ${ry + rocketHeight}
                    Q ${centerX} ${ry + rocketHeight + 25} ${rx + rocketWidth * 0.7} ${ry + rocketHeight}
                    Q ${centerX} ${ry + rocketHeight + 15} ${rx + rocketWidth * 0.3} ${ry + rocketHeight}`}
                fill="#f97316"
                opacity={0.9}
              />
              <path
                d={`M ${rx + rocketWidth * 0.4} ${ry + rocketHeight}
                    Q ${centerX} ${ry + rocketHeight + 15} ${rx + rocketWidth * 0.6} ${ry + rocketHeight}
                    Q ${centerX} ${ry + rocketHeight + 8} ${rx + rocketWidth * 0.4} ${ry + rocketHeight}`}
                fill="#fbbf24"
              />
              {/* Body */}
              <path
                d={`M ${rx} ${ry + rocketHeight * 0.25}
                    L ${rx} ${ry + rocketHeight}
                    L ${rx + rocketWidth} ${ry + rocketHeight}
                    L ${rx + rocketWidth} ${ry + rocketHeight * 0.25}
                    Q ${rx + rocketWidth} ${ry} ${centerX} ${ry}
                    Q ${rx} ${ry} ${rx} ${ry + rocketHeight * 0.25}
                    Z`}
                fill={object.color || '#e2e8f0'}
                stroke={COLORS.gray[500]}
                strokeWidth={2}
              />
              {/* Window */}
              <circle
                cx={centerX}
                cy={ry + rocketHeight * 0.35}
                r={rocketWidth * 0.25}
                fill="#60a5fa"
                stroke={COLORS.gray[400]}
                strokeWidth={1}
              />
              {/* Fins */}
              <path
                d={`M ${rx} ${ry + rocketHeight * 0.7}
                    L ${rx - rocketWidth * 0.3} ${ry + rocketHeight}
                    L ${rx} ${ry + rocketHeight}
                    Z`}
                fill="#ef4444"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
              />
              <path
                d={`M ${rx + rocketWidth} ${ry + rocketHeight * 0.7}
                    L ${rx + rocketWidth + rocketWidth * 0.3} ${ry + rocketHeight}
                    L ${rx + rocketWidth} ${ry + rocketHeight}
                    Z`}
                fill="#ef4444"
                stroke={COLORS.gray[500]}
                strokeWidth={1}
              />
              {/* Labels */}
              {object.label && (
                <text
                  x={centerX + rocketWidth}
                  y={centerY}
                  textAnchor="start"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX + rocketWidth}
                  y={centerY + 16}
                  textAnchor="start"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        case 'pendulum':
          // Pendulum bob
          const bobRadius = object.radius || 20
          return (
            <>
              {/* String/rod to top */}
              <line
                x1={centerX}
                y1={30}
                x2={centerX}
                y2={centerY - bobRadius}
                stroke={COLORS.gray[500]}
                strokeWidth={2}
              />
              {/* Pivot point */}
              <circle cx={centerX} cy={30} r={4} fill={COLORS.gray[600]} />
              {/* Bob shadow */}
              <ellipse
                cx={centerX + 3}
                cy={centerY + bobRadius + 5}
                rx={bobRadius * 0.8}
                ry={bobRadius * 0.3}
                fill="rgba(0,0,0,0.15)"
              />
              {/* Bob */}
              <circle
                cx={centerX}
                cy={centerY}
                r={bobRadius}
                fill={`url(#${gradientId})`}
                stroke={COLORS.gray[400]}
                strokeWidth={2}
              />
              {/* Highlight */}
              <ellipse
                cx={centerX - bobRadius * 0.3}
                cy={centerY - bobRadius * 0.3}
                rx={bobRadius * 0.25}
                ry={bobRadius * 0.2}
                fill="rgba(255,255,255,0.5)"
              />
              {object.label && (
                <text
                  x={centerX + bobRadius + 10}
                  y={centerY}
                  textAnchor="start"
                  fontSize={13}
                  fontWeight="600"
                  fontFamily="'Inter', system-ui, sans-serif"
                  fill={COLORS.gray[700]}
                >
                  {object.label}
                </text>
              )}
              {object.mass && (
                <text
                  x={centerX}
                  y={centerY + bobRadius + 20}
                  textAnchor="middle"
                  fontSize={11}
                  fontFamily="'JetBrains Mono', monospace"
                  fill={COLORS.gray[500]}
                >
                  m = {object.mass} kg
                </text>
              )}
            </>
          )

        default:
          return (
            <rect
              x={objX}
              y={objY}
              width={objWidth}
              height={objHeight}
              fill={`url(#${gradientId})`}
              stroke={COLORS.gray[400]}
              strokeWidth={2}
              rx={4}
            />
          )
      }
    })()

    return (
      <motion.g
        className="physics-object"
        initial="hidden"
        animate={isObjectVisible ? 'visible' : 'hidden'}
        variants={objectVariants}
      >
        {objectContent}
      </motion.g>
    )
  }

  // Render coordinate axes with subtle styling
  const renderAxes = () => {
    if (coordinateSystem === 'none') return null

    const axisLength = 60
    const rotation = coordinateSystem === 'inclined' ? -referenceAngle : 0

    return (
      <motion.g
        className="coordinate-axes"
        transform={`rotate(${rotation}, ${centerX}, ${centerY})`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ delay: reducedMotion ? 0 : 0.1, duration: 0.3 }}
      >
        {/* X-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX + axisLength}
          y2={centerY}
          stroke={COLORS.gray[400]}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <polygon
          points={`${centerX + axisLength},${centerY} ${centerX + axisLength - 7},${centerY - 4} ${centerX + axisLength - 7},${centerY + 4}`}
          fill={COLORS.gray[400]}
        />
        <text
          x={centerX + axisLength + 12}
          y={centerY}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {coordinateSystem === 'inclined' ? 'x∥' : 'x'}
        </text>

        {/* Y-axis */}
        <line
          x1={centerX}
          y1={centerY}
          x2={centerX}
          y2={centerY - axisLength}
          stroke={COLORS.gray[400]}
          strokeWidth={1.5}
          strokeDasharray="5 3"
        />
        <polygon
          points={`${centerX},${centerY - axisLength} ${centerX - 4},${centerY - axisLength + 7} ${centerX + 4},${centerY - axisLength + 7}`}
          fill={COLORS.gray[400]}
        />
        <text
          x={centerX}
          y={centerY - axisLength - 12}
          textAnchor="middle"
          dominantBaseline="middle"
          fontSize={12}
          fontFamily="'Inter', system-ui, sans-serif"
          fontWeight={500}
          fill={COLORS.gray[500]}
        >
          {coordinateSystem === 'inclined' ? 'y⊥' : 'y'}
        </text>
      </motion.g>
    )
  }

  // Calculate force origin points using smart layout engine
  const getForceOrigin = (force: Force): { x: number; y: number } => {
    const objSize = object.width || object.height || 50

    // If force has explicit origin, use it
    if (force.origin) {
      return {
        x: centerX + force.origin.x,
        y: centerY + force.origin.y,
      }
    }

    // Create layout-compatible object
    // Map physics types to layout types: sphere -> ball, particle -> point, others -> block
    const layoutType = object.type === 'sphere' ? 'ball'
      : object.type === 'particle' ? 'point'
      : 'block'
    const layoutObject: LayoutPhysicsObject = {
      id: 'main-object',
      type: layoutType,
      position: { x: centerX, y: centerY },
      size: objSize,
    }

    // Get surface angle from referenceAngle (used for inclined coordinate systems)
    const surfaceAngle = referenceAngle || 0

    // Create minimal force info for layout engine (only needed fields)
    const forceInput = {
      type: force.type,
      angle: force.angle ?? 0,
      origin: force.origin,
    }

    // Use layout engine for smart positioning
    const origin = calculateForceOrigin(forceInput, layoutObject, surfaceAngle)

    return origin
  }

  // Render forces with choreographed draw animations
  const renderForces = () => {
    const defaultScale = 2.5

    return (
      <AnimatePresence>
        {visibleForces.map((force) => {
          const isHighlighted = highlightedForces.has(force.name)
          const origin = getForceOrigin(force)
          const animDelay = getForceDelay(force)

          // Check if this force is an unknown (show ? instead of value)
          const isUnknown = unknowns.includes(force.name) || unknowns.includes(force.symbol || '')
          
          return (
            <ForceVector
              key={force.name}
              force={isUnknown ? { ...force, magnitude: 0 } : force}
              origin={origin}
              scale={forceScale * defaultScale}
              highlighted={isHighlighted}
              showLabel={true}
              showMagnitude={showForceMagnitudes || isHighlighted}
              showAngle={showAngles && isHighlighted}
              referenceAngle={referenceAngle}
              animation="draw"
              animationDuration={reducedMotion ? 0 : animationDuration}
              animationDelay={animDelay}
              useGradient={true}
              onAnimationComplete={() => handleForceAnimationComplete(force.name)}
            />
          )
        })}
      </AnimatePresence>
    )
  }

  // Render net force if enabled
  const renderNetForce = () => {
    if (!showNetForce || !currentStepConfig.showNetForce) return null

    let netX = 0
    let netY = 0

    visibleForces.forEach((force) => {
      const angleRad = ((force.angle ?? 0) * Math.PI) / 180
      netX += (force.magnitude ?? 0) * Math.cos(angleRad)
      netY += (force.magnitude ?? 0) * Math.sin(angleRad)
    })

    const netMagnitude = Math.sqrt(netX * netX + netY * netY)
    const netAngle = (Math.atan2(netY, netX) * 180) / Math.PI

    if (netMagnitude < 0.01) return null

    const netForce: Force = {
      name: 'net',
      type: 'net',
      magnitude: netMagnitude,
      angle: netAngle,
      symbol: 'F',
      subscript: 'net',
    }

    // Net force appears after all other forces
    const netDelay = reducedMotion ? 0 : 200 + visibleForces.length * 250

    return (
      <ForceVector
        force={netForce}
        origin={{ x: centerX, y: centerY }}
        scale={forceScale * 2.5}
        highlighted={true}
        showLabel={true}
        showMagnitude={true}
        animation="draw"
        animationDuration={reducedMotion ? 0 : animationDuration}
        animationDelay={netDelay}
        useGradient={true}
      />
    )
  }

  // Render step label with animation
  const renderStepLabel = () => {
    const label =
      language === 'he' ? currentStepConfig.stepLabelHe : currentStepConfig.stepLabel

    if (!label && !currentStepConfig.showCalculation) return null

    return (
      <motion.g
        className="step-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reducedMotion ? 0 : 0.3, duration: 0.3 }}
      >
        {/* Background card for step info */}
        {(label || currentStepConfig.showCalculation) && (
          <rect
            x={width - 170}
            y={height - 60}
            width={160}
            height={50}
            fill="white"
            stroke={COLORS.gray[200]}
            strokeWidth={1}
            rx={6}
            style={{ filter: SHADOWS.soft }}
          />
        )}
        {label && (
          <text
            x={width - 90}
            y={height - 40}
            textAnchor="middle"
            fontSize={12}
            fill={COLORS.gray[600]}
            fontFamily="'Inter', system-ui, sans-serif"
            fontStyle="italic"
          >
            {label}
          </text>
        )}
        {currentStepConfig.showCalculation && (
          <text
            x={width - 90}
            y={height - 22}
            textAnchor="middle"
            fontSize={13}
            fill={COLORS.primary[600]}
            fontFamily="'JetBrains Mono', monospace"
            fontWeight="500"
          >
            {currentStepConfig.showCalculation}
          </text>
        )}
      </motion.g>
    )
  }

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={`free-body-diagram ${className}`}
      style={{ borderRadius: '12px', overflow: 'hidden' }}
      role="img"
      aria-label={`Free body diagram${title ? `: ${title}` : ''} with ${forces.length} forces`}
    >
      {/* Definitions */}
      <defs>
        {/* Object gradient */}
        <linearGradient id="fbd-object-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={object.color || COLORS.gray[100]} />
          <stop offset="100%" stopColor={object.color ? hexToRgba(object.color, 0.8) : COLORS.gray[200]} />
        </linearGradient>

        {/* Background gradient */}
        <linearGradient id="fbd-bg-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor={COLORS.gray[50]} />
        </linearGradient>

        {/* Subtle grid pattern */}
        <pattern id="fbd-grid-pattern" width="20" height="20" patternUnits="userSpaceOnUse">
          <path
            d="M 20 0 L 0 0 0 20"
            fill="none"
            stroke={COLORS.gray[100]}
            strokeWidth="0.75"
          />
        </pattern>
      </defs>

      {/* Background with subtle gradient */}
      <rect width={width} height={height} fill="url(#fbd-bg-gradient)" rx={12} />

      {/* Subtle grid */}
      <rect width={width} height={height} fill="url(#fbd-grid-pattern)" opacity={0.6} rx={12} />

      {/* Title */}
      {title && (
        <motion.text
          x={width / 2}
          y={28}
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

      {/* Coordinate axes (behind object) */}
      {renderAxes()}

      {/* Physics object */}
      {renderObject()}

      {/* Force vectors with choreographed animations */}
      {renderForces()}

      {/* Angle labels for tension vectors */}
      {showAngleLabels && visibleForces.filter(f => f.type === 'tension').map((force, i) => {
        const safeAngle = force.angle ?? 0
        const angleRad = (safeAngle * Math.PI) / 180
        const labelDist = 60
        const labelX = centerX + Math.cos(angleRad) * labelDist
        const labelY = centerY - Math.sin(angleRad) * labelDist
        const arcRadius = 35
        const startAngle = 0
        const endAngle = safeAngle
        const startX = centerX + arcRadius * Math.cos(startAngle * Math.PI / 180)
        const startY = centerY - arcRadius * Math.sin(startAngle * Math.PI / 180)
        const endX = centerX + arcRadius * Math.cos(endAngle * Math.PI / 180)
        const endY = centerY - arcRadius * Math.sin(endAngle * Math.PI / 180)
        const largeArc = Math.abs(endAngle - startAngle) > 180 ? 1 : 0
        const sweep = endAngle > startAngle ? 0 : 1
        
        return (
          <g key={`angle-${i}`}>
            {/* Angle arc */}
            <path
              d={`M ${startX} ${startY} A ${arcRadius} ${arcRadius} 0 ${largeArc} ${sweep} ${endX} ${endY}`}
              fill="none"
              stroke="#64748b"
              strokeWidth={1.5}
              strokeDasharray="4,2"
            />
            {/* Angle label */}
            <text
              x={labelX}
              y={labelY}
              textAnchor="middle"
              fontSize={12}
              fontFamily="'Inter', sans-serif"
              fill="#374151"
            >
              {Math.abs(force.angle ?? 0).toFixed(1)}°
            </text>
          </g>
        )
      })}

      {/* External objects (tugboats) */}
      {externalObjects.map((ext, i) => {
        const attachedForce = visibleForces.find(f => f.name === ext.attachedTo)
        if (!attachedForce || ext.type !== 'tugboat') return null
        
        const angleRad = (attachedForce.angle * Math.PI) / 180
        const dist = attachedForce.magnitude * forceScale * 2.5 + 30
        const tugX = centerX + Math.cos(angleRad) * dist + (ext.offset?.x || 0)
        const tugY = centerY - Math.sin(angleRad) * dist + (ext.offset?.y || 0)
        const tugAngle = attachedForce.angle + 180 // Face the tanker
        
        return (
          <g key={`ext-${i}`} transform={`translate(${tugX}, ${tugY}) rotate(${-tugAngle})`}>
            {/* Simple tugboat shape */}
            <path
              d="M -12 -6 L 12 -6 L 15 0 L 12 6 L -12 6 L -15 0 Z"
              fill="#94a3b8"
              stroke="#64748b"
              strokeWidth={1.5}
            />
            {/* Cabin */}
            <rect x="-6" y="-4" width="6" height="8" fill="#cbd5e1" rx={1} />
          </g>
        )
      })}

      {/* Acceleration arrow */}
      {acceleration && (
        <g>
          <defs>
            <marker id="accel-arrow" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto">
              <path d="M0,0 L0,6 L8,3 z" fill="#eab308" />
            </marker>
          </defs>
          <line
            x1={centerX + (object.width || 100) / 2 + 20}
            y1={centerY}
            x2={centerX + (object.width || 100) / 2 + 80}
            y2={centerY}
            stroke="#eab308"
            strokeWidth={3}
            markerEnd="url(#accel-arrow)"
          />
          <text
            x={centerX + (object.width || 100) / 2 + 90}
            y={centerY + 5}
            fontSize={14}
            fontFamily="'Inter', sans-serif"
            fontWeight="600"
            fill="#eab308"
          >
            {acceleration.displayValue || `${acceleration.label || 'a'}`}
          </text>
        </g>
      )}

      {/* Given Information Box */}
      {givenInfo && Object.keys(givenInfo).length > 0 && (
        <g transform={`translate(${width - 140}, 10)`}>
          <rect
            x={0}
            y={0}
            width={130}
            height={20 + Object.keys(givenInfo).length * 18 + (unknowns.length > 0 ? 25 : 0)}
            fill="white"
            stroke="#e5e7eb"
            strokeWidth={1}
            rx={6}
            style={{ filter: 'drop-shadow(0 1px 2px rgba(0,0,0,0.1))' }}
          />
          <text x={10} y={16} fontSize={11} fontWeight="600" fill="#374151">
            Given:
          </text>
          {Object.entries(givenInfo).map(([key, value], i) => (
            <text
              key={key}
              x={10}
              y={34 + i * 16}
              fontSize={11}
              fontFamily="'JetBrains Mono', monospace"
              fill="#4b5563"
            >
              {key} = {value}
            </text>
          ))}
          {unknowns.length > 0 && (
            <text 
              x={10} 
              y={34 + Object.keys(givenInfo).length * 16 + 6} 
              fontSize={11} 
              fontWeight="600" 
              fill="#dc2626"
            >
              Find: {unknowns.join(', ')} = ?
            </text>
          )}
        </g>
      )}

      {/* Net force (if enabled) */}
      {renderNetForce()}

      {/* Step information */}
      {renderStepLabel()}

      {/* Step indicator with progress */}
      <motion.g
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        <rect
          x={8}
          y={height - 28}
          width={80}
          height={20}
          fill="white"
          stroke={COLORS.gray[200]}
          strokeWidth={1}
          rx={4}
        />
        <text
          x={48}
          y={height - 15}
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

export default FreeBodyDiagram
