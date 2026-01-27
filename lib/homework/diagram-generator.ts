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
  // Match patterns for division - ordered from most specific to most general
  const patterns = [
    // Direct division notation
    /(\d[\d,]*)\s*[÷]\s*(\d+)/,                           // 7,248 ÷ 8 (direct)
    /(\d[\d,]*)\s*\/\s*(\d+)/,                            // 456/12 (fraction notation)

    // ASCII long division notation: "8 | 7,248" - divisor | dividend
    /(\d+)\s*\|\s*(\d[\d,]*)/,                            // 8 | 7,248 (reversed - divisor first)

    // Division with words between number and symbol: "7,248 crayons ÷ 8 boxes"
    /(\d[\d,]*)\s+\w+\s*[÷]\s*(\d+)/,                     // 7,248 crayons ÷ 8
    /(\d[\d,]*)\s+(?:\w+\s+)+[÷]\s*(\d+)/,                // 7,248 red crayons ÷ 8

    // Word-based division
    /divide\s+(\d[\d,]*)\s+by\s+(\d+)/i,                  // divide 456 by 12
    /(\d[\d,]*)\s+divided\s+by\s+(\d+)/i,                 // 456 divided by 12
    /(\d[\d,]*)\s+into\s+(\d+)\s+equal/i,                 // 7248 into 8 equal groups

    // Word problems with context
    /(\d+)\s+(?:boxes?|groups?|parts?|pieces?).*?(\d[\d,]*)/i, // 8 boxes...7248 (reversed)
    /(\d[\d,]*)\s+(?:\w+\s+)*(?:among|between|into)\s+(\d+)/i,  // 7,248 crayons among 8 boxes
    /(\d+)\s+equal\s+(?:groups?|parts?|pieces?|portions?).*?(\d[\d,]*)/i, // 8 equal groups...7248
    /share\s+(\d[\d,]*).*?(?:among|between|into)\s+(\d+)/i,  // share 7248 among 8

    // Very general: just find two numbers where one is much larger (for long division context)
    // Only use this if we're confident this is a division problem
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

/**
 * Generate a diagram from tutor's response message text
 * This is used as a fallback when the original question didn't trigger diagram generation
 * but the tutor's message contains division-related content
 */
export function generateDiagramFromTutorMessage(
  messageText: string
): TutorDiagramState | undefined {
  // Try to generate a long division diagram from the message
  // This catches cases where tutor writes about dividing numbers
  const divisionDiagram = generateLongDivisionDiagram(messageText)
  if (divisionDiagram) {
    return divisionDiagram
  }

  // Future: Could add other diagram types here (equations, fractions, etc.)

  return undefined
}

// ============================================================================
// Chemistry Diagram Generation
// ============================================================================

// Common elements data for automatic diagram generation
const ELEMENT_DATA: Record<string, { symbol: string; name: string; atomicNumber: number; protons: number; neutrons: number; electrons: number[] }> = {
  hydrogen: { symbol: 'H', name: 'Hydrogen', atomicNumber: 1, protons: 1, neutrons: 0, electrons: [1] },
  helium: { symbol: 'He', name: 'Helium', atomicNumber: 2, protons: 2, neutrons: 2, electrons: [2] },
  lithium: { symbol: 'Li', name: 'Lithium', atomicNumber: 3, protons: 3, neutrons: 4, electrons: [2, 1] },
  beryllium: { symbol: 'Be', name: 'Beryllium', atomicNumber: 4, protons: 4, neutrons: 5, electrons: [2, 2] },
  boron: { symbol: 'B', name: 'Boron', atomicNumber: 5, protons: 5, neutrons: 6, electrons: [2, 3] },
  carbon: { symbol: 'C', name: 'Carbon', atomicNumber: 6, protons: 6, neutrons: 6, electrons: [2, 4] },
  nitrogen: { symbol: 'N', name: 'Nitrogen', atomicNumber: 7, protons: 7, neutrons: 7, electrons: [2, 5] },
  oxygen: { symbol: 'O', name: 'Oxygen', atomicNumber: 8, protons: 8, neutrons: 8, electrons: [2, 6] },
  fluorine: { symbol: 'F', name: 'Fluorine', atomicNumber: 9, protons: 9, neutrons: 10, electrons: [2, 7] },
  neon: { symbol: 'Ne', name: 'Neon', atomicNumber: 10, protons: 10, neutrons: 10, electrons: [2, 8] },
  sodium: { symbol: 'Na', name: 'Sodium', atomicNumber: 11, protons: 11, neutrons: 12, electrons: [2, 8, 1] },
  magnesium: { symbol: 'Mg', name: 'Magnesium', atomicNumber: 12, protons: 12, neutrons: 12, electrons: [2, 8, 2] },
  aluminum: { symbol: 'Al', name: 'Aluminum', atomicNumber: 13, protons: 13, neutrons: 14, electrons: [2, 8, 3] },
  silicon: { symbol: 'Si', name: 'Silicon', atomicNumber: 14, protons: 14, neutrons: 14, electrons: [2, 8, 4] },
  phosphorus: { symbol: 'P', name: 'Phosphorus', atomicNumber: 15, protons: 15, neutrons: 16, electrons: [2, 8, 5] },
  sulfur: { symbol: 'S', name: 'Sulfur', atomicNumber: 16, protons: 16, neutrons: 16, electrons: [2, 8, 6] },
  chlorine: { symbol: 'Cl', name: 'Chlorine', atomicNumber: 17, protons: 17, neutrons: 18, electrons: [2, 8, 7] },
  argon: { symbol: 'Ar', name: 'Argon', atomicNumber: 18, protons: 18, neutrons: 22, electrons: [2, 8, 8] },
  potassium: { symbol: 'K', name: 'Potassium', atomicNumber: 19, protons: 19, neutrons: 20, electrons: [2, 8, 8, 1] },
  calcium: { symbol: 'Ca', name: 'Calcium', atomicNumber: 20, protons: 20, neutrons: 20, electrons: [2, 8, 8, 2] },
  iron: { symbol: 'Fe', name: 'Iron', atomicNumber: 26, protons: 26, neutrons: 30, electrons: [2, 8, 14, 2] },
  copper: { symbol: 'Cu', name: 'Copper', atomicNumber: 29, protons: 29, neutrons: 35, electrons: [2, 8, 18, 1] },
  zinc: { symbol: 'Zn', name: 'Zinc', atomicNumber: 30, protons: 30, neutrons: 35, electrons: [2, 8, 18, 2] },
  gold: { symbol: 'Au', name: 'Gold', atomicNumber: 79, protons: 79, neutrons: 118, electrons: [2, 8, 18, 32, 18, 1] },
}

/**
 * Detect if a problem involves chemistry concepts that need diagrams
 */
export function detectChemistryDiagramType(
  questionText: string,
  topic: string,
  subject: string
): 'atom' | 'molecule' | null {
  const text = (questionText + ' ' + topic).toLowerCase()

  // Check for molecule-related problems
  if (
    text.includes('molecule') ||
    text.includes('bond') ||
    text.includes('covalent') ||
    text.includes('ionic bond') ||
    text.includes('h2o') ||
    text.includes('water molecule') ||
    text.includes('co2') ||
    text.includes('carbon dioxide') ||
    text.includes('ch4') ||
    text.includes('methane') ||
    text.includes('nh3') ||
    text.includes('ammonia') ||
    text.includes('molecular geometry') ||
    text.includes('vsepr')
  ) {
    return 'molecule'
  }

  // Check for atom-related problems
  if (
    text.includes('atom') ||
    text.includes('electron') ||
    text.includes('proton') ||
    text.includes('neutron') ||
    text.includes('nucleus') ||
    text.includes('electron shell') ||
    text.includes('electron configuration') ||
    text.includes('valence') ||
    text.includes('periodic table') ||
    text.includes('atomic number') ||
    text.includes('atomic structure') ||
    subject === 'chemistry'
  ) {
    // Check if a specific element is mentioned
    for (const element of Object.keys(ELEMENT_DATA)) {
      if (text.includes(element)) {
        return 'atom'
      }
    }
    // Check for element symbols
    for (const data of Object.values(ELEMENT_DATA)) {
      if (text.includes(` ${data.symbol.toLowerCase()} `) || text.includes(`(${data.symbol.toLowerCase()})`)) {
        return 'atom'
      }
    }
  }

  return null
}

/**
 * Extract element name from question text
 */
function extractElementName(questionText: string): string | null {
  const text = questionText.toLowerCase()

  // Check for element names
  for (const element of Object.keys(ELEMENT_DATA)) {
    if (text.includes(element)) {
      return element
    }
  }

  // Check for element symbols
  for (const [name, data] of Object.entries(ELEMENT_DATA)) {
    if (text.includes(` ${data.symbol.toLowerCase()} `) || text.includes(`(${data.symbol.toLowerCase()})`)) {
      return name
    }
  }

  return null
}

/**
 * Generate an atom diagram for an element
 */
export function generateAtomDiagram(elementName: string): TutorDiagramState | undefined {
  const element = ELEMENT_DATA[elementName.toLowerCase()]
  if (!element) return undefined

  const shells = element.electrons.map((count, index) => ({
    n: index + 1,
    electrons: count,
    maxElectrons: index === 0 ? 2 : index === 1 ? 8 : index === 2 ? 18 : 32,
  }))

  const totalSteps = shells.length + 2 // Nucleus + each shell + summary

  return {
    type: 'atom',
    visibleStep: 0,
    totalSteps,
    data: {
      element: {
        symbol: element.symbol,
        name: element.name,
        atomicNumber: element.atomicNumber,
        protons: element.protons,
        neutrons: element.neutrons,
        shells,
      },
      showProtonCount: true,
      showNeutronCount: true,
      showElectronCount: true,
      showSymbol: true,
      showName: true,
      showAtomicNumber: true,
      showElectronConfig: true,
      showShellCapacity: true,
      highlightValence: true,
      showExplanations: true,
      title: `${element.name} Atom (${element.symbol})`,
      steps: [
        {
          description: `${element.name} has atomic number ${element.atomicNumber}`,
          highlightShell: undefined,
        },
        ...shells.map((shell, index) => ({
          description: `Shell ${index + 1} has ${shell.electrons} electron${shell.electrons !== 1 ? 's' : ''} (max ${shell.maxElectrons})`,
          highlightShell: index + 1,
        })),
        {
          description: `Valence electrons: ${shells[shells.length - 1].electrons}`,
          highlightShell: shells.length,
        },
      ],
    },
    stepConfig: [
      { step: 0, stepLabel: `${element.name} (${element.symbol}) - Atomic number ${element.atomicNumber}`, showCalculation: `${element.protons} protons, ${element.neutrons} neutrons` },
      ...shells.map((shell, index) => ({
        step: index + 1,
        stepLabel: `Shell ${index + 1}: ${shell.electrons} electron${shell.electrons !== 1 ? 's' : ''}`,
        showCalculation: `Maximum capacity: ${shell.maxElectrons} electrons`,
      })),
      { step: shells.length + 1, stepLabel: `Valence electrons: ${shells[shells.length - 1].electrons}`, showCalculation: 'Outermost shell determines chemical behavior' },
    ],
  }
}

// Common molecules data
const MOLECULE_DATA: Record<string, { name: string; formula: string; geometry: string; atoms: Array<{ symbol: string; x: number; y: number }>; bonds: Array<{ from: number; to: number; type: string }> }> = {
  water: {
    name: 'Water',
    formula: 'H₂O',
    geometry: 'bent',
    atoms: [
      { symbol: 'O', x: 150, y: 100 },
      { symbol: 'H', x: 80, y: 160 },
      { symbol: 'H', x: 220, y: 160 },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
    ],
  },
  co2: {
    name: 'Carbon Dioxide',
    formula: 'CO₂',
    geometry: 'linear',
    atoms: [
      { symbol: 'C', x: 150, y: 100 },
      { symbol: 'O', x: 60, y: 100 },
      { symbol: 'O', x: 240, y: 100 },
    ],
    bonds: [
      { from: 0, to: 1, type: 'double' },
      { from: 0, to: 2, type: 'double' },
    ],
  },
  methane: {
    name: 'Methane',
    formula: 'CH₄',
    geometry: 'tetrahedral',
    atoms: [
      { symbol: 'C', x: 150, y: 100 },
      { symbol: 'H', x: 150, y: 30 },
      { symbol: 'H', x: 80, y: 140 },
      { symbol: 'H', x: 220, y: 140 },
      { symbol: 'H', x: 150, y: 170 },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
      { from: 0, to: 3, type: 'single' },
      { from: 0, to: 4, type: 'single' },
    ],
  },
  ammonia: {
    name: 'Ammonia',
    formula: 'NH₃',
    geometry: 'trigonal_pyramidal',
    atoms: [
      { symbol: 'N', x: 150, y: 80 },
      { symbol: 'H', x: 80, y: 140 },
      { symbol: 'H', x: 150, y: 160 },
      { symbol: 'H', x: 220, y: 140 },
    ],
    bonds: [
      { from: 0, to: 1, type: 'single' },
      { from: 0, to: 2, type: 'single' },
      { from: 0, to: 3, type: 'single' },
    ],
  },
}

/**
 * Detect which molecule is referenced in the text
 */
function detectMoleculeName(questionText: string): string | null {
  const text = questionText.toLowerCase()

  if (text.includes('water') || text.includes('h2o') || text.includes('h₂o')) return 'water'
  if (text.includes('carbon dioxide') || text.includes('co2') || text.includes('co₂')) return 'co2'
  if (text.includes('methane') || text.includes('ch4') || text.includes('ch₄')) return 'methane'
  if (text.includes('ammonia') || text.includes('nh3') || text.includes('nh₃')) return 'ammonia'

  return null
}

/**
 * Generate a molecule diagram
 */
export function generateMoleculeDiagram(moleculeName: string): TutorDiagramState | undefined {
  const molecule = MOLECULE_DATA[moleculeName.toLowerCase()]
  if (!molecule) return undefined

  return {
    type: 'molecule',
    visibleStep: 0,
    totalSteps: molecule.atoms.length + 2,
    data: {
      name: molecule.name,
      formula: molecule.formula,
      atoms: molecule.atoms.map((a, i) => ({
        id: `atom-${i}`,
        symbol: a.symbol,
        x: a.x,
        y: a.y,
      })),
      bonds: molecule.bonds.map((b, i) => ({
        id: `bond-${i}`,
        atom1: `atom-${b.from}`,
        atom2: `atom-${b.to}`,
        type: b.type as 'single' | 'double' | 'triple',
      })),
      geometry: molecule.geometry as 'linear' | 'bent' | 'trigonal_planar' | 'tetrahedral' | 'trigonal_pyramidal',
      showAngles: true,
      showGeometryLabel: true,
      showExplanations: true,
      title: `${molecule.name} (${molecule.formula})`,
    },
    stepConfig: [
      { step: 0, stepLabel: `${molecule.name} - ${molecule.formula}`, showCalculation: `Geometry: ${molecule.geometry.replace('_', ' ')}` },
      ...molecule.atoms.map((a, i) => ({
        step: i + 1,
        stepLabel: `Add ${a.symbol} atom`,
        showCalculation: `Position ${i + 1}`,
      })),
      { step: molecule.atoms.length + 1, stepLabel: 'Complete molecule', showCalculation: `${molecule.bonds.length} bonds formed` },
    ],
  }
}

// ============================================================================
// Biology Diagram Generation
// ============================================================================

/**
 * Detect if a problem involves biology concepts that need diagrams
 */
export function detectBiologyDiagramType(
  questionText: string,
  topic: string,
  subject: string
): 'cell' | 'dna' | null {
  const text = (questionText + ' ' + topic).toLowerCase()

  // Check for DNA-related problems
  if (
    text.includes('dna') ||
    text.includes('nucleotide') ||
    text.includes('base pair') ||
    text.includes('adenine') ||
    text.includes('thymine') ||
    text.includes('guanine') ||
    text.includes('cytosine') ||
    text.includes('double helix') ||
    text.includes('genetic') ||
    text.includes('replication')
  ) {
    return 'dna'
  }

  // Check for cell-related problems
  if (
    text.includes('cell') ||
    text.includes('organelle') ||
    text.includes('nucleus') ||
    text.includes('mitochondria') ||
    text.includes('chloroplast') ||
    text.includes('ribosome') ||
    text.includes('membrane') ||
    text.includes('cytoplasm') ||
    text.includes('vacuole') ||
    text.includes('endoplasmic reticulum') ||
    text.includes('golgi') ||
    subject === 'biology'
  ) {
    return 'cell'
  }

  return null
}

/**
 * Generate a cell diagram
 */
export function generateCellDiagram(isPlantCell: boolean = false): TutorDiagramState {
  const organelles = [
    { type: 'nucleus', name: 'Nucleus', description: 'Contains DNA, controls cell activities' },
    { type: 'mitochondria', name: 'Mitochondria', description: 'Powerhouse - produces ATP energy' },
    { type: 'endoplasmic_reticulum', name: 'Endoplasmic Reticulum', description: 'Protein and lipid synthesis' },
    { type: 'golgi_apparatus', name: 'Golgi Apparatus', description: 'Packages and ships proteins' },
    { type: 'ribosome', name: 'Ribosomes', description: 'Protein synthesis' },
    { type: 'cell_membrane', name: 'Cell Membrane', description: 'Controls what enters/exits cell' },
  ]

  if (isPlantCell) {
    organelles.push(
      { type: 'chloroplast', name: 'Chloroplast', description: 'Photosynthesis - makes glucose' },
      { type: 'cell_wall', name: 'Cell Wall', description: 'Provides structure and support' },
      { type: 'vacuole', name: 'Central Vacuole', description: 'Stores water and nutrients' }
    )
  }

  return {
    type: 'cell',
    visibleStep: 0,
    totalSteps: organelles.length + 1,
    data: {
      cellType: isPlantCell ? 'plant' : 'animal',
      organelles: organelles.map((o, i) => ({
        id: `organelle-${i}`,
        type: o.type,
        name: o.name,
        highlighted: false,
      })),
      showLabels: true,
      title: isPlantCell ? 'Plant Cell' : 'Animal Cell',
      steps: organelles.map((o, i) => ({
        description: o.description,
        highlightOrganelle: `organelle-${i}`,
      })),
    },
    stepConfig: [
      { step: 0, stepLabel: `${isPlantCell ? 'Plant' : 'Animal'} Cell Overview` },
      ...organelles.map((o, i) => ({
        step: i + 1,
        stepLabel: o.name,
        showCalculation: o.description,
      })),
    ],
  }
}

/**
 * Generate a DNA diagram
 */
export function generateDNADiagram(): TutorDiagramState {
  const basePairs = [
    { base1: 'A', base2: 'T', color1: '#ef4444', color2: '#22c55e' },
    { base1: 'T', base2: 'A', color1: '#22c55e', color2: '#ef4444' },
    { base1: 'G', base2: 'C', color1: '#3b82f6', color2: '#eab308' },
    { base1: 'C', base2: 'G', color1: '#eab308', color2: '#3b82f6' },
    { base1: 'A', base2: 'T', color1: '#ef4444', color2: '#22c55e' },
  ]

  return {
    type: 'dna',
    visibleStep: 0,
    totalSteps: basePairs.length + 2,
    data: {
      basePairs: basePairs.map((bp, i) => ({
        id: `pair-${i}`,
        base1: bp.base1 as 'A' | 'T' | 'G' | 'C',
        base2: bp.base2 as 'A' | 'T' | 'G' | 'C',
        position: i,
      })),
      showBackbone: true,
      showHydrogenBonds: true,
      showLabels: true,
      title: 'DNA Double Helix',
      steps: [
        { description: 'DNA has two strands twisted together' },
        ...basePairs.map((bp, i) => ({
          description: `${bp.base1} pairs with ${bp.base2} (${bp.base1 === 'A' ? 'Adenine-Thymine' : 'Guanine-Cytosine'})`,
          highlightPair: i,
        })),
        { description: 'Base pairing rules: A-T and G-C' },
      ],
    },
    stepConfig: [
      { step: 0, stepLabel: 'DNA Double Helix Structure', showCalculation: 'Two complementary strands' },
      ...basePairs.map((bp, i) => ({
        step: i + 1,
        stepLabel: `Base Pair ${i + 1}: ${bp.base1}-${bp.base2}`,
        showCalculation: bp.base1 === 'A' || bp.base1 === 'T' ? '2 hydrogen bonds' : '3 hydrogen bonds',
      })),
      { step: basePairs.length + 1, stepLabel: 'Complete Double Helix', showCalculation: 'A pairs with T, G pairs with C' },
    ],
  }
}

// ============================================================================
// Error Logging Utility
// ============================================================================

/**
 * Log diagram generation errors with context
 */
function logDiagramError(
  context: string,
  error: unknown,
  details?: Record<string, unknown>
): void {
  const errorMessage = error instanceof Error ? error.message : String(error)
  const errorStack = error instanceof Error ? error.stack : undefined

  console.error(`[DiagramGenerator] ${context}:`, {
    error: errorMessage,
    stack: errorStack,
    ...details,
    timestamp: new Date().toISOString(),
  })
}

/**
 * Validate diagram state structure before returning
 */
function validateDiagramState(
  diagram: TutorDiagramState | undefined,
  diagramType: string
): TutorDiagramState | undefined {
  if (!diagram) return undefined

  // Validate required fields
  if (!diagram.type) {
    logDiagramError('Invalid diagram state', new Error('Missing type field'), { diagramType })
    return undefined
  }

  if (!diagram.data || typeof diagram.data !== 'object') {
    logDiagramError('Invalid diagram state', new Error('Missing or invalid data field'), { diagramType })
    return undefined
  }

  if (typeof diagram.visibleStep !== 'number' || diagram.visibleStep < 0) {
    // Auto-fix: set to 0 if missing or invalid
    diagram.visibleStep = 0
  }

  if (diagram.totalSteps !== undefined && (typeof diagram.totalSteps !== 'number' || diagram.totalSteps < 1)) {
    logDiagramError('Invalid diagram state', new Error('Invalid totalSteps'), { diagramType, totalSteps: diagram.totalSteps })
    diagram.totalSteps = 1
  }

  return diagram
}

// ============================================================================
// Main Generator Function
// ============================================================================

/**
 * Generate a diagram based on problem analysis
 * Returns undefined if no diagram is appropriate or if generation fails
 *
 * @param analysis - The question analysis containing questionText, topic, and subject
 * @returns TutorDiagramState or undefined
 */
export function generateDiagramForProblem(
  analysis: QuestionAnalysis
): TutorDiagramState | undefined {
  // Input validation
  if (!analysis) {
    logDiagramError('generateDiagramForProblem', new Error('Missing analysis parameter'))
    return undefined
  }

  const { questionText, topic, subject } = analysis

  // Validate required fields
  if (!questionText || typeof questionText !== 'string') {
    logDiagramError('generateDiagramForProblem', new Error('Missing or invalid questionText'), {
      questionText: questionText ? typeof questionText : 'undefined',
    })
    return undefined
  }

  // Normalize inputs to prevent errors
  const safeQuestionText = questionText.trim()
  const safeTopic = (topic || '').trim()
  const safeSubject = (subject || '').trim()

  if (safeQuestionText.length === 0) {
    return undefined // Empty question, no diagram needed
  }

  try {
    // Try physics diagrams first
    const physicsType = detectPhysicsDiagramType(safeQuestionText, safeTopic, safeSubject)
    if (physicsType) {
      try {
        const context = extractPhysicsContext(safeQuestionText)

        switch (physicsType) {
          case 'fbd': {
            const diagram = generateFBDDiagram(context, safeQuestionText)
            return validateDiagramState(diagram, 'fbd')
          }
          case 'inclined_plane': {
            const diagram = generateInclinedPlaneDiagram(context, safeQuestionText)
            return validateDiagramState(diagram, 'inclined_plane')
          }
        }
      } catch (physicsError) {
        logDiagramError('Physics diagram generation failed', physicsError, {
          physicsType,
          questionText: safeQuestionText.substring(0, 100),
        })
        // Continue to try other diagram types
      }
    }

    // Try math diagrams
    const mathType = detectMathDiagramType(safeQuestionText, safeTopic)
    if (mathType === 'long_division') {
      try {
        const diagram = generateLongDivisionDiagram(safeQuestionText)
        return validateDiagramState(diagram, 'long_division')
      } catch (mathError) {
        logDiagramError('Math diagram generation failed', mathError, {
          mathType,
          questionText: safeQuestionText.substring(0, 100),
        })
        // Continue to try other diagram types
      }
    }

    // Try chemistry diagrams
    const chemistryType = detectChemistryDiagramType(safeQuestionText, safeTopic, safeSubject)
    if (chemistryType) {
      try {
        if (chemistryType === 'atom') {
          const elementName = extractElementName(safeQuestionText)
          if (elementName) {
            const diagram = generateAtomDiagram(elementName)
            return validateDiagramState(diagram, 'atom')
          } else {
            logDiagramError('Chemistry atom diagram skipped', new Error('Could not extract element name'), {
              chemistryType,
              questionText: safeQuestionText.substring(0, 100),
            })
          }
        } else if (chemistryType === 'molecule') {
          const moleculeName = detectMoleculeName(safeQuestionText)
          if (moleculeName) {
            const diagram = generateMoleculeDiagram(moleculeName)
            return validateDiagramState(diagram, 'molecule')
          } else {
            logDiagramError('Chemistry molecule diagram skipped', new Error('Could not detect molecule name'), {
              chemistryType,
              questionText: safeQuestionText.substring(0, 100),
            })
          }
        }
      } catch (chemistryError) {
        logDiagramError('Chemistry diagram generation failed', chemistryError, {
          chemistryType,
          questionText: safeQuestionText.substring(0, 100),
        })
        // Continue to try other diagram types
      }
    }

    // Try biology diagrams
    const biologyType = detectBiologyDiagramType(safeQuestionText, safeTopic, safeSubject)
    if (biologyType) {
      try {
        if (biologyType === 'dna') {
          const diagram = generateDNADiagram()
          return validateDiagramState(diagram, 'dna')
        } else if (biologyType === 'cell') {
          const isPlantCell = safeQuestionText.toLowerCase().includes('plant')
          const diagram = generateCellDiagram(isPlantCell)
          return validateDiagramState(diagram, 'cell')
        }
      } catch (biologyError) {
        logDiagramError('Biology diagram generation failed', biologyError, {
          biologyType,
          questionText: safeQuestionText.substring(0, 100),
        })
      }
    }

    // No diagram type detected
    return undefined

  } catch (error) {
    logDiagramError('Unexpected error in generateDiagramForProblem', error, {
      questionText: safeQuestionText.substring(0, 100),
      topic: safeTopic,
      subject: safeSubject,
    })
    return undefined
  }
}

/**
 * Ensure a tutor response has a diagram if appropriate
 * This is called after getting the AI response to add diagrams if missing
 *
 * @param analysis - The question analysis
 * @param existingDiagram - An existing diagram from the AI response (if any)
 * @returns Validated diagram or undefined
 */
export function ensureDiagramInResponse(
  analysis: QuestionAnalysis,
  existingDiagram?: TutorDiagramState
): TutorDiagramState | undefined {
  try {
    // If there's already a diagram, validate and return it
    if (existingDiagram) {
      const validated = validateDiagramState(existingDiagram, existingDiagram.type || 'unknown')
      if (validated) {
        return validated
      }
      // If validation failed, log and try to generate a new one
      logDiagramError('Existing diagram validation failed, attempting regeneration', new Error('Invalid existing diagram'), {
        existingDiagramType: existingDiagram.type,
      })
    }

    // Generate a diagram based on the problem
    return generateDiagramForProblem(analysis)
  } catch (error) {
    logDiagramError('Error in ensureDiagramInResponse', error, {
      hasExistingDiagram: !!existingDiagram,
      analysisProvided: !!analysis,
    })
    return undefined
  }
}
