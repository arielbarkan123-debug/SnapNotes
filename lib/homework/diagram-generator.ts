/**
 * Automatic Diagram Generator
 *
 * Generates physics and math diagrams based on problem analysis.
 * This ensures diagrams appear even when the AI model doesn't return them.
 */

import type { TutorDiagramState, QuestionAnalysis } from './types'
import type { LongDivisionStep } from '@/types/math'

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
): 'long_division' | 'equation' | 'fraction' | 'coordinate_plane' | 'bar_model' | 'triangle' | 'number_line' | null {
  const text = (questionText + ' ' + topic).toLowerCase()

  // Check for coordinate plane / graphing
  if (
    text.includes('graph') ||
    text.includes('plot') ||
    text.includes('coordinate') ||
    text.includes('x-axis') ||
    text.includes('y-axis') ||
    text.includes('function') ||
    text.match(/f\(x\)/) ||
    text.match(/y\s*=/)
  ) {
    return 'coordinate_plane'
  }

  // Check for word problems with comparisons (bar model)
  if (
    (text.includes('times as many') ||
     text.includes('more than') ||
     text.includes('less than') ||
     text.includes('together they have') ||
     text.includes('in total')) &&
    (text.includes('how many') ||
     text.includes('how much'))
  ) {
    return 'bar_model'
  }

  // Check for geometry (triangle)
  if (
    text.includes('triangle') ||
    text.includes('angle') && (text.includes('side') || text.includes('degree')) ||
    text.includes('pythagorean')
  ) {
    return 'triangle'
  }

  // Check for number line operations
  if (
    text.includes('number line') ||
    (text.includes('negative') && text.includes('positive')) ||
    text.includes('integers') ||
    text.includes('absolute value')
  ) {
    return 'number_line'
  }

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
// Long Division Diagram Generation
// ============================================================================

/**
 * Calculate all steps of long division programmatically
 * Returns steps conforming to the LongDivisionStep interface from types/math.ts
 */
function calculateLongDivisionSteps(dividend: number, divisor: number): LongDivisionStep[] {
  const steps: LongDivisionStep[] = []
  const dividendStr = dividend.toString()
  let currentDividend = 0
  let digitPosition = 0
  let stepIndex = 0

  // Setup step - bring down first digit(s) until >= divisor
  while (currentDividend < divisor && digitPosition < dividendStr.length) {
    currentDividend = currentDividend * 10 + parseInt(dividendStr[digitPosition])
    digitPosition++
  }

  steps.push({
    step: stepIndex++,
    type: 'setup',
    position: 0,
    workingNumber: currentDividend,
    explanation: `Set up: ${divisor} goes into ${currentDividend}`,
  })

  // Track quotient digit position for output
  let quotientPosition = 0

  // Division steps
  while (digitPosition <= dividendStr.length) {
    const quotientDigit = Math.floor(currentDividend / divisor)
    const product = quotientDigit * divisor
    const difference = currentDividend - product

    // Add divide step
    steps.push({
      step: stepIndex++,
      type: 'divide',
      position: quotientPosition,
      quotientDigit,
      explanation: `${divisor} goes into ${currentDividend} = ${quotientDigit} time${quotientDigit !== 1 ? 's' : ''}`,
    })

    // Add multiply step
    steps.push({
      step: stepIndex++,
      type: 'multiply',
      position: quotientPosition,
      product,
      calculation: `${quotientDigit} × ${divisor} = ${product}`,
      explanation: `Multiply: ${quotientDigit} × ${divisor} = ${product}`,
    })

    // Add subtract step
    steps.push({
      step: stepIndex++,
      type: 'subtract',
      position: quotientPosition,
      difference,
      calculation: `${currentDividend} − ${product} = ${difference}`,
      explanation: `Subtract: ${currentDividend} − ${product} = ${difference}`,
    })

    // Bring down next digit if available
    if (digitPosition < dividendStr.length) {
      const nextDigit = parseInt(dividendStr[digitPosition])
      const newWorkingNumber = difference * 10 + nextDigit
      steps.push({
        step: stepIndex++,
        type: 'bring_down',
        position: quotientPosition + 1,
        workingNumber: newWorkingNumber,
        explanation: `Bring down ${nextDigit} to get ${newWorkingNumber}`,
      })
      currentDividend = newWorkingNumber
    } else {
      // Final step - show remainder or complete
      if (difference > 0) {
        steps.push({
          step: stepIndex++,
          type: 'remainder',
          position: quotientPosition,
          difference,
          explanation: `Remainder: ${difference}`,
        })
      } else {
        steps.push({
          step: stepIndex++,
          type: 'complete',
          position: quotientPosition,
          explanation: 'Division complete with no remainder',
        })
      }
      currentDividend = difference
    }

    quotientPosition++
    digitPosition++
  }

  return steps
}

/**
 * Extract division numbers from problem text
 */
function extractDivisionNumbers(questionText: string): { dividend: number; divisor: number } | null {
  // Match patterns like: "7,248 ÷ 8", "divide 456 by 12", "456/12", "456 divided by 12"
  const patterns = [
    /(\d[\d,]*)\s*[÷/]\s*(\d+)/,                    // 7,248 ÷ 8 or 456/12
    /divide\s+(\d[\d,]*)\s+by\s+(\d+)/i,           // divide 456 by 12
    /(\d[\d,]*)\s+divided\s+by\s+(\d+)/i,          // 456 divided by 12
    /(\d[\d,]*)\s+into\s+(\d+)\s+equal/i,          // 7248 into 8 equal groups
    /(\d+)\s+(?:boxes?|groups?|parts?|pieces?).*?(\d[\d,]*)/i, // 8 boxes...7248 (reversed)
    // Word problem patterns - "X items...among/between Y groups"
    /(\d[\d,]*)\s+(?:\w+\s+)*(?:among|between|into)\s+(\d+)/i,  // 7,248 crayons among 8 boxes
    /(\d+)\s+equal\s+(?:groups?|parts?|pieces?|portions?).*?(\d[\d,]*)/i, // 8 equal groups...7248
    /share\s+(\d[\d,]*).*?(?:among|between|into)\s+(\d+)/i,  // share 7248 among 8
  ]

  for (const pattern of patterns) {
    const match = questionText.match(pattern)
    if (match) {
      let dividend = parseInt(match[1].replace(/,/g, ''))
      let divisor = parseInt(match[2].replace(/,/g, ''))

      // Handle reversed pattern (8 boxes...7248) - smaller is divisor
      if (dividend < divisor) {
        [dividend, divisor] = [divisor, dividend]
      }

      // Sanity check - divisor should be reasonable
      if (divisor > 0 && divisor <= dividend) {
        return { dividend, divisor }
      }
    }
  }

  return null
}

/**
 * Generate a Long Division diagram from problem text
 */
export function generateLongDivisionDiagram(
  questionText: string
): TutorDiagramState | undefined {
  const numbers = extractDivisionNumbers(questionText)
  if (!numbers) return undefined

  const { dividend, divisor } = numbers
  const quotient = Math.floor(dividend / divisor)
  const remainder = dividend % divisor
  const steps = calculateLongDivisionSteps(dividend, divisor)

  // Build step config for progressive reveal - use the step's explanation field
  const stepConfig = steps.map((step) => ({
    step: step.step,
    stepLabel: step.explanation || `Step ${step.step + 1}`,
    showCalculation: step.calculation,
  }))

  return {
    type: 'long_division',
    visibleStep: 0,
    totalSteps: steps.length,
    evolutionMode: 'auto-advance',
    data: {
      dividend,
      divisor,
      quotient,
      remainder,
      steps,
      title: `${dividend} ÷ ${divisor}`,
    },
    stepConfig,
  }
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
  if (mathType === 'long_division') {
    return generateLongDivisionDiagram(questionText)
  }
  // Future: equation, fraction, bar_model, etc.

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
