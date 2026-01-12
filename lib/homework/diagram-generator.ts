/**
 * Automatic Diagram Generator
 *
 * Generates physics and math diagrams based on problem analysis.
 * This ensures diagrams appear even when the AI model doesn't return them.
 */

import type { TutorDiagramState, QuestionAnalysis } from './types'

// ============================================================================
// Physics Diagram Generation
// ============================================================================

interface ForceData {
  name: string
  type: 'weight' | 'normal' | 'friction' | 'tension' | 'applied' | 'spring'
  magnitude: number
  angle: number
  symbol: string
  subscript?: string
}

interface PhysicsContext {
  mass?: number
  angle?: number // For inclined planes
  appliedForce?: number
  frictionCoefficient?: number
  tension?: number
  gravity?: number
}

/**
 * Detect if a problem involves physics concepts that need diagrams
 */
export function detectPhysicsDiagramType(
  questionText: string,
  topic: string,
  subject: string
): 'fbd' | 'inclined_plane' | 'projectile' | null {
  const text = (questionText + ' ' + topic).toLowerCase()

  // Check for inclined plane problems
  if (
    text.includes('incline') ||
    text.includes('slope') ||
    text.includes('ramp') ||
    (text.includes('angle') && (text.includes('surface') || text.includes('plane')))
  ) {
    return 'inclined_plane'
  }

  // Check for free body diagram problems
  if (
    text.includes('force') ||
    text.includes('friction') ||
    text.includes('tension') ||
    text.includes('newton') ||
    text.includes('f = ma') ||
    text.includes('equilibrium') ||
    text.includes('acceleration') ||
    text.includes('pull') ||
    text.includes('push') ||
    (subject === 'science' && text.includes('block'))
  ) {
    return 'fbd'
  }

  // Check for projectile motion
  if (
    text.includes('projectile') ||
    text.includes('trajectory') ||
    text.includes('launch') ||
    (text.includes('throw') && text.includes('angle'))
  ) {
    return 'projectile'
  }

  return null
}

/**
 * Extract physics values from problem text
 */
export function extractPhysicsContext(questionText: string): PhysicsContext {
  const context: PhysicsContext = {
    gravity: 10, // Default to 10 m/s²
  }

  // Extract mass (e.g., "5 kg", "10kg", "mass of 5")
  const massMatch = questionText.match(/(\d+(?:\.\d+)?)\s*kg/i) ||
    questionText.match(/mass\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/i)
  if (massMatch) {
    context.mass = parseFloat(massMatch[1])
  }

  // Extract angle (e.g., "30°", "30 degrees", "angle of 30")
  const angleMatch = questionText.match(/(\d+(?:\.\d+)?)\s*(?:°|degrees?)/i) ||
    questionText.match(/angle\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/i)
  if (angleMatch) {
    context.angle = parseFloat(angleMatch[1])
  }

  // Extract applied force (e.g., "20 N", "force of 20")
  const forceMatch = questionText.match(/(\d+(?:\.\d+)?)\s*N(?:ewtons?)?/i) ||
    questionText.match(/(?:applied|horizontal|pull|push)?\s*force\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/i)
  if (forceMatch) {
    context.appliedForce = parseFloat(forceMatch[1])
  }

  // Extract friction coefficient
  const frictionMatch = questionText.match(/(?:coefficient|μ|mu)\s*(?:of\s*(?:kinetic\s*)?friction)?\s*(?:is|=)?\s*(\d+(?:\.\d+)?)/i) ||
    questionText.match(/μ[ks]?\s*=?\s*(\d+(?:\.\d+)?)/i)
  if (frictionMatch) {
    context.frictionCoefficient = parseFloat(frictionMatch[1])
  }

  // Extract tension
  const tensionMatch = questionText.match(/tension\s*(?:of|is|=)?\s*(\d+(?:\.\d+)?)/i)
  if (tensionMatch) {
    context.tension = parseFloat(tensionMatch[1])
  }

  // Check for gravity value
  const gravityMatch = questionText.match(/g\s*=\s*(\d+(?:\.\d+)?)/i)
  if (gravityMatch) {
    context.gravity = parseFloat(gravityMatch[1])
  }

  return context
}

/**
 * Generate a Free Body Diagram for a horizontal surface problem
 */
export function generateFBDDiagram(
  context: PhysicsContext,
  questionText: string
): TutorDiagramState {
  const mass = context.mass || 5
  const g = context.gravity || 10
  const weight = mass * g

  const forces: ForceData[] = [
    {
      name: 'weight',
      type: 'weight',
      magnitude: weight,
      angle: -90, // Straight down
      symbol: 'W',
      subscript: '',
    },
    {
      name: 'normal',
      type: 'normal',
      magnitude: weight, // On horizontal surface, N = W
      angle: 90, // Straight up
      symbol: 'N',
      subscript: '',
    },
  ]

  // Add friction if mentioned or coefficient given
  if (context.frictionCoefficient || questionText.toLowerCase().includes('friction')) {
    const frictionMag = context.frictionCoefficient
      ? context.frictionCoefficient * weight
      : weight * 0.3 // Default estimate
    forces.push({
      name: 'friction',
      type: 'friction',
      magnitude: Math.round(frictionMag * 10) / 10,
      angle: 180, // Opposing motion (assume rightward motion)
      symbol: 'f',
      subscript: 'k',
    })
  }

  // Add applied/tension force if present
  if (context.appliedForce || context.tension) {
    const forceMag = context.appliedForce || context.tension || 20
    forces.push({
      name: 'applied',
      type: context.tension ? 'tension' : 'applied',
      magnitude: forceMag,
      angle: 0, // Horizontal right
      symbol: context.tension ? 'T' : 'F',
      subscript: context.tension ? '' : 'app',
    })
  }

  return {
    type: 'fbd',
    visibleStep: 0,
    totalSteps: forces.length + 1,
    data: {
      object: {
        type: 'block',
        label: 'm',
        mass: mass,
        color: '#e0e7ff',
      },
      forces: forces,
      showDecomposition: false,
    },
    stepConfig: [
      { step: 0, visibleForces: [], stepLabel: 'Start with the object' },
      { step: 1, visibleForces: ['weight'], highlightForces: ['weight'], stepLabel: `Weight: W = mg = ${mass} × ${g} = ${weight}N`, showCalculation: `W = mg = ${weight}N` },
      { step: 2, visibleForces: ['weight', 'normal'], highlightForces: ['normal'], stepLabel: 'Normal force balances weight vertically', showCalculation: `N = ${weight}N` },
      ...forces.slice(2).map((f, i) => ({
        step: 3 + i,
        visibleForces: forces.slice(0, 3 + i).map(x => x.name),
        highlightForces: [f.name],
        stepLabel: `${f.type === 'friction' ? 'Friction opposes motion' : 'Applied force'}: ${f.symbol}${f.subscript ? '_' + f.subscript : ''} = ${f.magnitude}N`,
        showCalculation: `${f.symbol}${f.subscript || ''} = ${f.magnitude}N`,
      })),
    ],
  }
}

/**
 * Generate an Inclined Plane diagram
 */
export function generateInclinedPlaneDiagram(
  context: PhysicsContext,
  questionText: string
): TutorDiagramState {
  const mass = context.mass || 5
  const angle = context.angle || 30
  const g = context.gravity || 10
  const weight = mass * g

  const angleRad = (angle * Math.PI) / 180
  const normalMag = Math.round(weight * Math.cos(angleRad) * 10) / 10
  const weightParallel = Math.round(weight * Math.sin(angleRad) * 10) / 10

  const forces: ForceData[] = [
    {
      name: 'weight',
      type: 'weight',
      magnitude: weight,
      angle: -90,
      symbol: 'W',
      subscript: '',
    },
    {
      name: 'normal',
      type: 'normal',
      magnitude: normalMag,
      angle: 90 - angle, // Perpendicular to inclined surface
      symbol: 'N',
      subscript: '',
    },
  ]

  // Add friction
  if (context.frictionCoefficient || questionText.toLowerCase().includes('friction')) {
    const mu = context.frictionCoefficient || 0.3
    const frictionMag = Math.round(mu * normalMag * 10) / 10
    forces.push({
      name: 'friction',
      type: 'friction',
      magnitude: frictionMag,
      angle: 180 - angle, // Up the slope
      symbol: 'f',
      subscript: 'k',
    })
  }

  return {
    type: 'inclined_plane',
    visibleStep: 0,
    totalSteps: forces.length + 2,
    data: {
      angle: angle,
      object: {
        type: 'block',
        label: 'm',
        mass: mass,
        color: '#e0e7ff',
      },
      forces: forces,
      showDecomposition: true,
      frictionCoefficient: context.frictionCoefficient,
    },
    stepConfig: [
      { step: 0, visibleForces: [], stepLabel: `Object on ${angle}° incline` },
      { step: 1, visibleForces: ['weight'], highlightForces: ['weight'], stepLabel: `Weight points straight down: W = ${weight}N`, showCalculation: `W = mg = ${mass} × ${g} = ${weight}N` },
      { step: 2, visibleForces: ['weight', 'normal'], highlightForces: ['normal'], stepLabel: `Normal force perpendicular to surface: N = ${normalMag}N`, showCalculation: `N = mg·cos(${angle}°) = ${normalMag}N` },
      ...forces.slice(2).map((f, i) => ({
        step: 3 + i,
        visibleForces: forces.slice(0, 3 + i).map(x => x.name),
        highlightForces: [f.name],
        stepLabel: f.type === 'friction'
          ? `Friction up the slope: f = ${f.magnitude}N`
          : `Force: ${f.symbol} = ${f.magnitude}N`,
        showCalculation: f.type === 'friction'
          ? `f = μN = ${context.frictionCoefficient || 0.3} × ${normalMag} = ${f.magnitude}N`
          : `${f.symbol} = ${f.magnitude}N`,
      })),
      {
        step: forces.length + 1,
        visibleForces: forces.map(f => f.name),
        showComponents: true,
        stepLabel: `Weight component down slope: ${weightParallel}N`,
        showCalculation: `W_∥ = mg·sin(${angle}°) = ${weightParallel}N`,
      },
    ],
  }
}

// ============================================================================
// Math Diagram Generation
// ============================================================================

/**
 * Detect if a problem involves math concepts that need diagrams
 */
export function detectMathDiagramType(
  questionText: string,
  topic: string
): 'long_division' | 'equation' | 'fraction' | null {
  const text = (questionText + ' ' + topic).toLowerCase()

  // Check for long division
  if (
    text.includes('divide') ||
    text.includes('division') ||
    text.includes('÷') ||
    text.match(/\d+\s*÷\s*\d+/)
  ) {
    return 'long_division'
  }

  // Check for equation solving
  if (
    text.includes('solve') ||
    text.includes('equation') ||
    text.includes('find x') ||
    text.includes('find the value') ||
    text.match(/\d*x\s*[+\-]\s*\d+\s*=/)
  ) {
    return 'equation'
  }

  // Check for fraction operations
  if (
    text.includes('fraction') ||
    text.includes('numerator') ||
    text.includes('denominator') ||
    text.match(/\d+\/\d+/)
  ) {
    return 'fraction'
  }

  return null
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a diagram based on problem analysis
 * Returns null if no diagram is appropriate for the problem
 */
export function generateDiagramForProblem(
  analysis: QuestionAnalysis
): TutorDiagramState | undefined {
  const { questionText, topic, subject } = analysis

  // Try physics diagrams first
  const physicsType = detectPhysicsDiagramType(questionText, topic, subject)
  if (physicsType) {
    const context = extractPhysicsContext(questionText)

    switch (physicsType) {
      case 'fbd':
        return generateFBDDiagram(context, questionText)
      case 'inclined_plane':
        return generateInclinedPlaneDiagram(context, questionText)
      // Add more physics diagram types as needed
    }
  }

  // Try math diagrams
  const mathType = detectMathDiagramType(questionText, topic)
  if (mathType) {
    // Math diagrams would need more complex parsing
    // For now, return undefined - can be extended later
    return undefined
  }

  return undefined
}

/**
 * Ensure a tutor response has a diagram if appropriate
 * This is called after getting the AI response to add diagrams if missing
 */
export function ensureDiagramInResponse(
  analysis: QuestionAnalysis,
  existingDiagram?: TutorDiagramState
): TutorDiagramState | undefined {
  // If there's already a diagram, use it
  if (existingDiagram) {
    return existingDiagram
  }

  // Generate a diagram based on the problem
  return generateDiagramForProblem(analysis)
}
