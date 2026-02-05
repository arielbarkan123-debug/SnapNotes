/**
 * Centralized diagram schema registry.
 *
 * Each schema tells the AI what JSON to produce for a given diagram type.
 * Schemas are added here as components are built. The AI system prompt
 * pulls from this registry via getDiagramSchemaPrompt().
 */

export interface DiagramSchema {
  type: string
  subject: string
  gradeRange: string
  description: string
  jsonExample: string
}

export const DIAGRAM_SCHEMAS: Record<string, DiagramSchema> = {
  // ---- MATH: Currently Implemented ----

  number_line: {
    type: 'number_line',
    subject: 'math',
    gradeRange: '1-12',
    description: 'Number line with points, intervals, and inequalities',
    jsonExample: JSON.stringify({
      type: 'number_line',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        min: -5,
        max: 10,
        title: '-2 \u2264 x < 5',
        points: [
          { value: -2, label: '-2', style: 'filled', color: '#6366f1' },
          { value: 5, label: '5', style: 'hollow', color: '#6366f1' },
        ],
        intervals: [
          { start: -2, end: 5, startInclusive: true, endInclusive: false, color: '#6366f1' },
        ],
      },
    }),
  },

  coordinate_plane: {
    type: 'coordinate_plane',
    subject: 'math',
    gradeRange: '5-12',
    description: 'Coordinate plane with curves, points, and lines. Expressions: x^2, sin(x), cos(x), sqrt(x), abs(x), exp(x), log(x)',
    jsonExample: JSON.stringify({
      type: 'coordinate_plane',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        xMin: -5, xMax: 5, yMin: -5, yMax: 10, showGrid: true,
        title: 'y = x\u00b2 - 2x - 3',
        curves: [{ id: 'f', expression: 'x^2 - 2*x - 3', color: '#6366f1' }],
        points: [{ id: 'v', x: 1, y: -4, label: 'Vertex (1,-4)', color: '#ef4444' }],
        lines: [{ id: 'sym', points: [{ x: 1, y: -100 }, { x: 1, y: 100 }], color: '#9ca3af', dashed: true, type: 'line' }],
      },
    }),
  },

  long_division: {
    type: 'long_division',
    subject: 'math',
    gradeRange: '3-6',
    description: 'Step-by-step long division visualization',
    jsonExample: JSON.stringify({
      type: 'long_division',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        dividend: 156,
        divisor: 12,
        steps: [
          { quotientDigit: '1', multiply: '12', subtract: '3', bringDown: '6', remainder: '36' },
          { quotientDigit: '3', multiply: '36', subtract: '0', bringDown: '', remainder: '0' },
        ],
      },
    }),
  },

  equation: {
    type: 'equation',
    subject: 'math',
    gradeRange: '6-12',
    description: 'Step-by-step equation solving with highlighted operations',
    jsonExample: JSON.stringify({
      type: 'equation',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        steps: [
          { expression: '2x + 5 = 13', explanation: 'Original equation' },
          { expression: '2x = 8', explanation: 'Subtract 5 from both sides' },
          { expression: 'x = 4', explanation: 'Divide both sides by 2' },
        ],
      },
    }),
  },

  fraction: {
    type: 'fraction',
    subject: 'math',
    gradeRange: '3-8',
    description: 'Fraction operation visualization (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'fraction',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        operation: 'add',
        fraction1: { numerator: 1, denominator: 3 },
        fraction2: { numerator: 1, denominator: 4 },
        result: { numerator: 7, denominator: 12 },
        steps: [
          { explanation: 'Find common denominator: LCD = 12' },
          { explanation: '4/12 + 3/12' },
          { explanation: '= 7/12' },
        ],
      },
    }),
  },

  factoring: {
    type: 'factoring',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Polynomial factoring with step-by-step breakdown',
    jsonExample: JSON.stringify({
      type: 'factoring',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: 'x\u00b2 + 5x + 6',
        factoredForm: '(x + 2)(x + 3)',
        steps: [
          { expression: 'x\u00b2 + 5x + 6', explanation: 'Find two numbers that multiply to 6 and add to 5' },
          { expression: '2 \u00d7 3 = 6, 2 + 3 = 5', explanation: 'Numbers: 2 and 3' },
          { expression: '(x + 2)(x + 3)', explanation: 'Write in factored form' },
        ],
      },
    }),
  },

  completing_square: {
    type: 'completing_square',
    subject: 'math',
    gradeRange: '9-12',
    description: 'Completing the square method visualization',
    jsonExample: JSON.stringify({
      type: 'completing_square',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        original: 'x\u00b2 + 6x + 2 = 0',
        steps: [
          { expression: 'x\u00b2 + 6x = -2', explanation: 'Move constant to right side' },
          { expression: 'x\u00b2 + 6x + 9 = -2 + 9', explanation: 'Add (6/2)\u00b2 = 9 to both sides' },
          { expression: '(x + 3)\u00b2 = 7', explanation: 'Factor left side as perfect square' },
          { expression: 'x = -3 \u00b1 \u221a7', explanation: 'Take square root of both sides' },
        ],
      },
    }),
  },

  polynomial: {
    type: 'polynomial',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Polynomial operations (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'polynomial',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        operation: 'multiply',
        poly1: '(2x + 3)',
        poly2: '(x - 1)',
        steps: [
          { expression: '2x(x - 1) + 3(x - 1)', explanation: 'Distribute each term' },
          { expression: '2x\u00b2 - 2x + 3x - 3', explanation: 'Multiply' },
          { expression: '2x\u00b2 + x - 3', explanation: 'Combine like terms' },
        ],
      },
    }),
  },

  radical: {
    type: 'radical',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Radical simplification step-by-step',
    jsonExample: JSON.stringify({
      type: 'radical',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: '\u221a72',
        steps: [
          { expression: '\u221a(36 \u00d7 2)', explanation: 'Find largest perfect square factor' },
          { expression: '\u221a36 \u00d7 \u221a2', explanation: 'Split the radical' },
          { expression: '6\u221a2', explanation: 'Simplify \u221a36 = 6' },
        ],
      },
    }),
  },

  systems: {
    type: 'systems',
    subject: 'math',
    gradeRange: '8-12',
    description: 'Systems of equations solving (substitution, elimination, or graphing)',
    jsonExample: JSON.stringify({
      type: 'systems',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        method: 'elimination',
        equation1: '2x + y = 7',
        equation2: 'x - y = 2',
        steps: [
          { expression: '2x + y = 7\nx - y = 2', explanation: 'Original system' },
          { expression: '3x = 9', explanation: 'Add equations to eliminate y' },
          { expression: 'x = 3', explanation: 'Divide by 3' },
          { expression: 'x = 3, y = 1', explanation: 'Substitute back: 3 - y = 2, y = 1' },
        ],
      },
    }),
  },

  inequality: {
    type: 'inequality',
    subject: 'math',
    gradeRange: '7-12',
    description: 'Inequality solving with number line visualization',
    jsonExample: JSON.stringify({
      type: 'inequality',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        steps: [
          { expression: '3x - 2 > 7', explanation: 'Original inequality' },
          { expression: '3x > 9', explanation: 'Add 2 to both sides' },
          { expression: 'x > 3', explanation: 'Divide by 3' },
        ],
        numberLine: { min: -2, max: 8, point: 3, direction: 'right', inclusive: false },
      },
    }),
  },

  // ---- PHYSICS: Currently Implemented ----

  fbd: {
    type: 'fbd',
    subject: 'physics',
    gradeRange: '9-12',
    description: 'Free body diagram with forces on an object. Object types: block, sphere, wedge, particle, car, person. Force angles: 0=right, 90=up, -90=down, 180=left.',
    jsonExample: JSON.stringify({
      type: 'fbd',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        object: { type: 'block', position: { x: 150, y: 150 }, mass: 5, label: 'm', color: '#e0e7ff' },
        forces: [
          { name: 'weight', type: 'weight', magnitude: 50, angle: -90, symbol: 'W', color: '#22c55e' },
          { name: 'normal', type: 'normal', magnitude: 50, angle: 90, symbol: 'N', color: '#3b82f6' },
          { name: 'friction', type: 'friction', magnitude: 15, angle: 180, symbol: 'f', subscript: 'k', color: '#ef4444' },
        ],
        title: 'Forces on block',
        showForceMagnitudes: true,
      },
      stepConfig: [
        { step: 0, visibleForces: [], stepLabel: 'Object' },
        { step: 1, visibleForces: ['weight'], highlightForces: ['weight'], stepLabel: 'Weight = 50N' },
        { step: 2, visibleForces: ['weight', 'normal', 'friction'], stepLabel: 'All forces' },
      ],
    }),
  },
}

/**
 * Generate a prompt string listing available diagram schemas for the AI.
 * Optionally filter by subject.
 */
export function getDiagramSchemaPrompt(subject?: string): string {
  const filtered = Object.values(DIAGRAM_SCHEMAS).filter(
    (s) => !subject || s.subject === subject
  )

  if (filtered.length === 0) return ''

  return filtered
    .map(
      (s) =>
        `### Diagram Schema: ${s.type}\n${s.description}\nGrades: ${s.gradeRange}\nExample: ${s.jsonExample}`
    )
    .join('\n\n')
}
