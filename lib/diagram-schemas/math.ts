import type { DiagramSchema } from './types'

/**
 * Math diagram schemas — core, elementary, middle school, and high school.
 */
export const mathSchemas: Record<string, DiagramSchema> = {
  // ---- MATH: Currently Implemented ----

  number_line: {
    type: 'number_line',
    subject: 'math',
    gradeRange: '1-12',
    engine: 'svg',
    description: 'Number line with points, intervals, and inequalities. Use points array to plot values and intervals array to highlight distances or ranges between them.',
    jsonExample: JSON.stringify({
      type: 'number_line',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        min: -5,
        max: 8,
        title: 'Distance between -2 and 5',
        points: [
          { value: -2, label: 'A = -2', style: 'filled' },
          { value: 5, label: 'B = 5', style: 'filled' },
        ],
        intervals: [
          { start: -2, end: 5, startInclusive: true, endInclusive: true, color: '#6366f1', label: '|5 - (-2)| = 7' },
        ],
      },
    }),
  },

  coordinate_plane: {
    type: 'coordinate_plane',
    subject: 'math',
    gradeRange: '5-12',
    engine: 'desmos',
    description: 'Coordinate plane with curves, points, and lines. Expressions: x^2, sin(x), cos(x), sqrt(x), abs(x), exp(x), log(x)',
    jsonExample: JSON.stringify({
      type: 'coordinate_plane',
      visibleStep: 0,
      totalSteps: 5,
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
    engine: 'svg',
    description: 'Step-by-step long division visualization showing the full divide-multiply-subtract-bring down algorithm. Each quotient digit produces one cycle of 4 step types: divide → multiply → subtract → bring_down. The "position" field is the 0-indexed column of the RIGHTMOST digit being worked on in the dividend (e.g., for dividend 156: position 1 means columns 0-1 cover "15", position 2 means the column for "6"). totalSteps in the outer wrapper = 1 (setup) + number_of_quotient_digits (division iterations) + 1 (result). Provide explanation/explanationHe on each step to narrate the algorithm for students. Include calculation strings showing the arithmetic.',
    jsonExample: JSON.stringify({
      type: 'long_division',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        dividend: 156,
        divisor: 4,
        quotient: 39,
        remainder: 0,
        title: '156 ÷ 4',
        steps: [
          {
            step: 0,
            type: 'setup',
            position: 0,
            explanation: 'Set up the problem: 156 ÷ 4. We will divide each part of 156 by 4.',
            explanationHe: 'הגדרת התרגיל: 156 ÷ 4. נחלק כל חלק של 156 ב-4.',
          },
          {
            step: 1,
            type: 'divide',
            position: 1,
            quotientDigit: 3,
            explanation: 'Divide: How many times does 4 go into 15? 4 × 3 = 12, so the first quotient digit is 3.',
            explanationHe: 'חילוק: כמה פעמים 4 נכנס ב-15? 4 × 3 = 12, אז הספרה הראשונה במנה היא 3.',
            calculation: '15 ÷ 4 = 3',
          },
          {
            step: 2,
            type: 'multiply',
            position: 1,
            product: 12,
            explanation: 'Multiply: 3 × 4 = 12. Write 12 below 15.',
            explanationHe: 'כפל: 3 × 4 = 12. כתוב 12 מתחת ל-15.',
            calculation: '3 × 4 = 12',
          },
          {
            step: 3,
            type: 'subtract',
            position: 1,
            difference: 3,
            explanation: 'Subtract: 15 − 12 = 3.',
            explanationHe: 'חיסור: 15 − 12 = 3.',
            calculation: '15 − 12 = 3',
          },
          {
            step: 4,
            type: 'bring_down',
            position: 2,
            workingNumber: 36,
            explanation: 'Bring down the 6 to make 36.',
            explanationHe: 'הורד את ה-6 כדי לקבל 36.',
            calculation: '3 → 36',
          },
          {
            step: 5,
            type: 'divide',
            position: 2,
            quotientDigit: 9,
            explanation: 'Divide: How many times does 4 go into 36? 4 × 9 = 36, so the next quotient digit is 9.',
            explanationHe: 'חילוק: כמה פעמים 4 נכנס ב-36? 4 × 9 = 36, אז הספרה הבאה במנה היא 9.',
            calculation: '36 ÷ 4 = 9',
          },
          {
            step: 6,
            type: 'multiply',
            position: 2,
            product: 36,
            explanation: 'Multiply: 9 × 4 = 36. Write 36 below 36.',
            explanationHe: 'כפל: 9 × 4 = 36. כתוב 36 מתחת ל-36.',
            calculation: '9 × 4 = 36',
          },
          {
            step: 7,
            type: 'subtract',
            position: 2,
            difference: 0,
            explanation: 'Subtract: 36 − 36 = 0. No remainder!',
            explanationHe: 'חיסור: 36 − 36 = 0. אין שארית!',
            calculation: '36 − 36 = 0',
          },
        ],
      },
    }),
  },

  equation: {
    type: 'equation',
    subject: 'math',
    gradeRange: '6-12',
    engine: 'svg',
    description: 'Step-by-step equation solving with highlighted operations. Each step MUST have leftSide and rightSide (the two sides of the equation separated by "="). Show the operation applied to BOTH sides at each step so students see the balance principle. Include a final verification step using "simplify" operation. Also provide variable and solution at the top level for the final answer display.',
    jsonExample: JSON.stringify({
      type: 'equation',
      visibleStep: 0,
      totalSteps: 6,
      data: {
        originalEquation: '3x + 7 = 22',
        variable: 'x',
        solution: '5',
        title: 'Solve for x',
        steps: [
          { step: 0, equation: '3x + 7 = 22', leftSide: '3x + 7', rightSide: '22', operation: 'initial', description: 'Write the original equation', descriptionHe: 'כתוב את המשוואה המקורית' },
          { step: 1, equation: '3x + 7 - 7 = 22 - 7', leftSide: '3x + 7 - 7', rightSide: '22 - 7', operation: 'subtract', description: 'Subtract 7 from both sides to isolate the variable term', descriptionHe: 'חסר 7 משני האגפים כדי לבודד את האיבר עם x', calculation: '-7' },
          { step: 2, equation: '3x = 15', leftSide: '3x', rightSide: '15', operation: 'simplify', description: 'Simplify both sides: 7 - 7 cancels on the left, 22 - 7 = 15 on the right', descriptionHe: 'פשט את שני האגפים: 7 - 7 מתבטל בצד שמאל, 22 - 7 = 15 בצד ימין' },
          { step: 3, equation: '3x / 3 = 15 / 3', leftSide: '\\frac{3x}{3}', rightSide: '\\frac{15}{3}', operation: 'divide', description: 'Divide both sides by 3 to solve for x', descriptionHe: 'חלק את שני האגפים ב-3 כדי למצוא את x', calculation: '\\div 3' },
          { step: 4, equation: 'x = 5', leftSide: 'x', rightSide: '5', operation: 'simplify', description: 'Simplify both sides: 3x / 3 = x on the left, 15 / 3 = 5 on the right', descriptionHe: 'פשט את שני האגפים: 3x / 3 = x בצד שמאל, 15 / 3 = 5 בצד ימין' },
          { step: 5, equation: '3(5) + 7 = 22', leftSide: '3(5) + 7', rightSide: '22', operation: 'simplify', description: 'Verify: substitute x = 5 back into the original equation: 15 + 7 = 22', descriptionHe: 'בדיקה: הצב x = 5 בחזרה למשוואה המקורית: 15 + 7 = 22' },
        ],
      },
    }),
  },

  fraction: {
    type: 'fraction',
    subject: 'math',
    gradeRange: '3-8',
    engine: 'svg',
    description: 'Fraction operation visualization (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'fraction',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        operationType: 'add',
        fraction1: { numerator: 1, denominator: 3 },
        fraction2: { numerator: 1, denominator: 4 },
        result: { numerator: 7, denominator: 12 },
        steps: [
          { step: 0, type: 'find_lcd', fractions: [{ numerator: 1, denominator: 3 }, { numerator: 1, denominator: 4 }], lcd: 12, description: 'Find the Lowest Common Denominator', descriptionHe: 'מציאת המכנה המשותף הנמוך ביותר' },
          { step: 1, type: 'convert', fractions: [{ numerator: 4, denominator: 12 }, { numerator: 3, denominator: 12 }], calculation: '1/3 × 4/4 = 4/12, 1/4 × 3/3 = 3/12', description: 'Multiply each fraction to get common denominator', descriptionHe: 'כפול כל שבר כדי לקבל מכנה משותף' },
          { step: 2, type: 'operate', fractions: [{ numerator: 4, denominator: 12 }, { numerator: 3, denominator: 12 }], calculation: '4/12 + 3/12 = 7/12', description: 'Add the numerators', descriptionHe: 'חבר את המונים' },
          { step: 3, type: 'result', fractions: [{ numerator: 7, denominator: 12 }], result: { numerator: 7, denominator: 12 }, description: '= 7/12' },
        ],
      },
    }),
  },

  factoring: {
    type: 'factoring',
    subject: 'math',
    gradeRange: '8-12',
    engine: 'svg',
    description: 'Polynomial factoring with step-by-step breakdown',
    jsonExample: JSON.stringify({
      type: 'factoring',
      visibleStep: 0,
      totalSteps: 6,
      data: {
        expression: 'x^2 + 5x + 6',
        a: 1,
        b: 5,
        c: 6,
        product: 6,
        sum: 5,
        factor1: '(x + 2)',
        factor2: '(x + 3)',
        factoredForm: '(x + 2)(x + 3)',
        method: 'simple',
        steps: [
          { step: 0, type: 'identify', description: 'Identify a, b, c: a=1, b=5, c=6', descriptionHe: 'זיהוי a, b, c: a=1, b=5, c=6', calculation: 'a \\cdot c = 1 \\times 6 = 6' },
          { step: 1, type: 'find_factors', description: 'Find two numbers that multiply to 6 and add to 5', descriptionHe: 'מצא שני מספרים שמכפלתם 6 וסכומם 5', factorPairs: [{ a: 1, b: 6, product: 6, sum: 7 }, { a: 2, b: 3, product: 6, sum: 5, isCorrect: true }] },
          { step: 2, type: 'test_pair', description: 'Check: 2 × 3 = 6 and 2 + 3 = 5 ✓', descriptionHe: 'בדיקה: 2 × 3 = 6 ו-2 + 3 = 5 ✓', calculation: '2 \\times 3 = 6,\\quad 2 + 3 = 5' },
          { step: 3, type: 'write_factors', description: 'Write in factored form', descriptionHe: 'כתוב בצורה מפורקת', calculation: '(x + 2)(x + 3)' },
        ],
      },
    }),
  },

  completing_square: {
    type: 'completing_square',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'svg',
    description: 'Completing the square method visualization',
    jsonExample: JSON.stringify({
      type: 'completing_square',
      visibleStep: 0,
      totalSteps: 8,
      data: {
        originalEquation: 'x^2 + 6x + 5 = 0',
        a: 1,
        b: 6,
        c: 5,
        halfB: 3,
        squaredHalfB: 9,
        variable: 'x',
        solutions: ['-1', '-5'],
        vertexForm: '(x + 3)^2 = 4',
        steps: [
          { step: 1, type: 'identify', description: 'Identify coefficients: a = 1, b = 6, c = 5', leftSide: 'x^2 + 6x + 5', rightSide: '0' },
          { step: 2, type: 'isolate', description: 'Move constant to the right side: subtract 5 from both sides', leftSide: 'x^2 + 6x', rightSide: '-5', calculation: 'x^2 + 6x + 5 - 5 = 0 - 5' },
          { step: 3, type: 'half_b', description: 'Take half of b: 6 \u00f7 2 = 3', leftSide: 'x^2 + 6x', rightSide: '-5', calculation: 'b/2 = 6/2 = 3', highlightValue: '3' },
          { step: 4, type: 'square_it', description: 'Square the result: 3\u00b2 = 9', leftSide: 'x^2 + 6x', rightSide: '-5', calculation: '(b/2)^2 = 3^2 = 9', highlightValue: '9' },
          { step: 5, type: 'add_both', description: 'Add 9 to both sides to complete the square', leftSide: 'x^2 + 6x + 9', rightSide: '4', calculation: '-5 + 9 = 4', highlightValue: '9', highlighted: true },
          { step: 6, type: 'factor_left', description: 'Factor the left side as a perfect square trinomial', leftSide: '(x + 3)^2', rightSide: '4', calculation: 'x^2 + 6x + 9 = (x + 3)(x + 3)' },
          { step: 7, type: 'sqrt_both', description: 'Take the square root of both sides', leftSide: 'x + 3', rightSide: '\u00b12', calculation: '\u221a((x + 3)^2) = \u00b1\u221a4 = \u00b12' },
          { step: 8, type: 'solve', description: 'Solve for x: x = -3 + 2 = -1 or x = -3 - 2 = -5', leftSide: 'x', rightSide: '-1 or -5', calculation: 'x = -3 \u00b1 2' },
        ],
      },
    }),
  },

  polynomial: {
    type: 'polynomial',
    subject: 'math',
    gradeRange: '8-12',
    engine: 'svg',
    description: 'Polynomial operations (add, subtract, multiply, divide)',
    jsonExample: JSON.stringify({
      type: 'polynomial',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        polynomial1: '2x\u00b2 + 3x - 1',
        polynomial2: 'x\u00b2 - 4x + 2',
        operation: 'add',
        result: '3x\u00b2 - x + 1',
        variable: 'x',
        terms1: [
          { coefficient: 2, exponent: 2 },
          { coefficient: 3, exponent: 1 },
          { coefficient: -1, exponent: 0 },
        ],
        terms2: [
          { coefficient: 1, exponent: 2 },
          { coefficient: -4, exponent: 1 },
          { coefficient: 2, exponent: 0 },
        ],
        resultTerms: [
          { coefficient: 3, exponent: 2 },
          { coefficient: -1, exponent: 1 },
          { coefficient: 1, exponent: 0 },
        ],
        steps: [
          { step: 0, type: 'setup', description: 'Write both polynomials' },
          { step: 1, type: 'align', description: 'Align terms by degree', highlightExponent: 2 },
          { step: 2, type: 'combine', description: 'Add x\u00b2 terms: 2 + 1 = 3', highlightExponent: 2, calculation: '2x\u00b2 + x\u00b2 = 3x\u00b2' },
          { step: 3, type: 'combine', description: 'Add x terms: 3 + (-4) = -1', highlightExponent: 1, calculation: '3x + (-4x) = -x' },
          { step: 4, type: 'complete', description: 'Add constants: -1 + 2 = 1', highlightExponent: 0, calculation: '-1 + 2 = 1' },
        ],
        title: 'Add two polynomials',
      },
    }),
  },

  radical: {
    type: 'radical',
    subject: 'math',
    gradeRange: '8-12',
    engine: 'svg',
    description: 'Radical simplification step-by-step',
    jsonExample: JSON.stringify({
      type: 'radical',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        originalExpression: '\u221a72',
        radicand: 72,
        index: 2,
        primeFactors: [
          { base: 2, exponent: 3 },
          { base: 3, exponent: 2 },
        ],
        extracted: 6,
        remaining: 2,
        simplifiedForm: '6\u221a2',
        method: 'prime_factorization',
        steps: [
          { step: 0, type: 'identify', description: 'Identify the radicand', expression: '\u221a72' },
          { step: 1, type: 'factor', description: 'Find prime factorization: 72 = 2\u00b3 \u00d7 3\u00b2', expression: '\u221a(2\u00b3 \u00d7 3\u00b2)' },
          { step: 2, type: 'group', description: 'Group pairs for square root extraction', expression: '\u221a(2\u00b2 \u00d7 3\u00b2 \u00d7 2)' },
          { step: 3, type: 'extract', description: 'Extract perfect squares: 2 \u00d7 3 = 6', expression: '6\u221a2', calculation: '2 \u00d7 3 = 6' },
          { step: 4, type: 'complete', description: 'Simplified form: 6\u221a2', expression: '6\u221a2' },
        ],
        title: 'Simplify \u221a72',
      },
    }),
  },

  systems: {
    type: 'systems',
    subject: 'math',
    gradeRange: '8-12',
    engine: 'svg',
    description: 'Systems of equations solving (substitution, elimination, or graphing)',
    jsonExample: JSON.stringify({
      type: 'systems',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        equation1: '2x + y = 7',
        equation2: 'x - y = 2',
        variables: ['x', 'y'],
        method: 'elimination',
        solutions: { x: '3', y: '1' },
        steps: [
          { step: 0, type: 'setup', description: 'Write the system of equations', equations: [{ leftSide: '2x + y', rightSide: '7' }, { leftSide: 'x - y', rightSide: '2' }] },
          { step: 1, type: 'add', description: 'Add equations to eliminate y', equations: [{ leftSide: '2x + y + x - y', rightSide: '7 + 2' }], calculation: '(2x + y) + (x - y) = 7 + 2' },
          { step: 2, type: 'solve_variable', description: 'Simplify and solve for x', equations: [{ leftSide: '3x', rightSide: '9' }], solvingFor: 'x', found: { variable: 'x', value: '3' } },
          { step: 3, type: 'back_substitute', description: 'Substitute x = 3 into equation 2', equations: [{ leftSide: '3 - y', rightSide: '2' }], found: { variable: 'y', value: '1' } },
          { step: 4, type: 'complete', description: 'Solution: x = 3, y = 1', equations: [{ leftSide: '2(3) + 1', rightSide: '7 \u2713' }, { leftSide: '3 - 1', rightSide: '2 \u2713' }] },
        ],
        title: 'Solve the system by elimination',
      },
    }),
  },

  inequality: {
    type: 'inequality',
    subject: 'math',
    gradeRange: '7-12',
    engine: 'svg',
    description: 'Inequality solving with number line visualization',
    jsonExample: JSON.stringify({
      type: 'inequality',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        originalInequality: '3x - 2 > 7',
        variable: 'x',
        solution: 'x > 3',
        boundaryValue: 3,
        finalOperator: '>',
        intervalNotation: '(3, \u221e)',
        numberLineBounds: { min: -2, max: 8 },
        title: 'Solve 3x - 2 > 7',
      },
    }),
  },

  triangle: {
    type: 'triangle',
    subject: 'math',
    gradeRange: '5-12',
    engine: 'geogebra',
    description: 'Triangle with labeled vertices, sides, angles, and optional altitude',
    jsonExample: JSON.stringify({
      type: 'triangle',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        vertices: [
          { label: 'A', x: 50, y: 250 },
          { label: 'B', x: 350, y: 250 },
          { label: 'C', x: 50, y: 50 },
        ],
        sides: [
          { from: 'A', to: 'B', length: '5' },
          { from: 'A', to: 'C', length: '3' },
          { from: 'B', to: 'C', length: '4' },
        ],
        angles: [
          { vertex: 'A', measure: '53.1\u00b0' },
          { vertex: 'B', measure: '36.9\u00b0' },
          { vertex: 'C', measure: '90\u00b0', rightAngle: true },
        ],
        altitude: { from: 'C', to: 'A' },
        title: 'Right Triangle (3-4-5)',
      },
    }),
  },

  circle: {
    type: 'circle',
    subject: 'math',
    gradeRange: '5-12',
    engine: 'geogebra',
    description: 'Circle with radius, diameter, and optional chords/sectors. IMPORTANT: Always set showRadius:true and radiusLabel to the actual value from the question (e.g. "r = 15 cm"). Use the exact number and units the student provided. Only include centerLabel when center coordinates are relevant (coordinate geometry, equation of a circle). For area/circumference questions, omit centerLabel and centerX/centerY — just use centerX:0, centerY:0.',
    jsonExample: JSON.stringify({
      type: 'circle',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        centerX: 0,
        centerY: 0,
        radius: 15,
        showRadius: true,
        radiusLabel: 'r = 15 cm',
        title: 'Circle with radius 15 cm',
      },
    }),
  },

  unit_circle: {
    type: 'unit_circle',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'svg',
    description: 'Unit circle showing angles with sin/cos values and optional quadrant highlighting',
    jsonExample: JSON.stringify({
      type: 'unit_circle',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        angles: [
          { degrees: 30, radians: '\u03c0/6', sin: '1/2', cos: '\u221a3/2' },
          { degrees: 45, radians: '\u03c0/4', sin: '\u221a2/2', cos: '\u221a2/2' },
          { degrees: 60, radians: '\u03c0/3', sin: '\u221a3/2', cos: '1/2' },
        ],
        showSinCos: true,
        highlightQuadrant: 1,
        title: 'Standard angles in Quadrant I',
      },
    }),
  },

  tree_diagram: {
    type: 'tree_diagram',
    subject: 'math',
    gradeRange: '5-12',
    engine: 'mermaid',
    description: 'Probability tree diagram with branching nodes and probabilities',
    jsonExample: JSON.stringify({
      type: 'tree_diagram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        root: {
          label: 'Start',
          children: [
            {
              label: 'Heads',
              probability: '1/2',
              children: [
                { label: 'Heads', probability: '1/2' },
                { label: 'Tails', probability: '1/2' },
              ],
            },
            {
              label: 'Tails',
              probability: '1/2',
              children: [
                { label: 'Heads', probability: '1/2' },
                { label: 'Tails', probability: '1/2' },
              ],
            },
          ],
        },
        showProbabilities: true,
        title: 'Two coin flips',
      },
    }),
  },

  interactive_coordinate_plane: {
    type: 'interactive_coordinate_plane',
    subject: 'math',
    gradeRange: '7-12',
    engine: 'desmos',
    description: 'Interactive coordinate plane where students can drag points and add new points. Uses the same data format as coordinate_plane.',
    jsonExample: JSON.stringify({
      type: 'interactive_coordinate_plane',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        xMin: -10, xMax: 10, yMin: -10, yMax: 10, showGrid: true,
        title: 'Plot the points',
        points: [
          { id: 'A', x: 2, y: 3, label: 'A(2,3)', color: '#6366f1' },
          { id: 'B', x: -1, y: 4, label: 'B(-1,4)', color: '#ef4444' },
        ],
      },
    }),
  },

  equation_grapher: {
    type: 'equation_grapher',
    subject: 'math',
    gradeRange: '8-12',
    engine: 'desmos',
    description: 'Interactive equation grapher for plotting and comparing functions. Students can type equations to see live graphs.',
    jsonExample: JSON.stringify({
      type: 'equation_grapher',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        equations: [
          { expression: 'x^2', color: '#3b82f6' },
          { expression: '2*x + 1', color: '#ef4444' },
        ],
        xRange: [-5, 5],
        yRange: [-5, 10],
      },
    }),
  },

  // ---- ELEMENTARY MATH: Grades 1-5 (New) ----

  counting_objects_array: {
    type: 'counting_objects_array',
    subject: 'math',
    gradeRange: '1-3',
    engine: 'svg',
    description: 'Array of objects for counting, addition, or subtraction with grouping. 3 steps: 1) Show grid outlines, 2) Place colored objects in grid, 3) Show result label. Object types: circle, star, heart, square. For addition use two groups with different colors. groupSize controls objects per row (default 5).',
    jsonExample: JSON.stringify({
      type: 'counting_objects_array',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        objects: [{ type: 'circle', count: 4, color: '#ef4444' }, { type: 'circle', count: 3, color: '#3b82f6' }],
        operation: 'add',
        total: 7,
        title: 'How many apples in all?',
        groupSize: 5,
      },
    }),
  },

  ten_frame: {
    type: 'ten_frame',
    subject: 'math',
    gradeRange: '1-2',
    engine: 'svg',
    description: 'Ten frame (2x5 grid) showing filled and empty circles for number sense. 3 steps: 1) Show empty ten frame grid, 2) Place colored counters, 3) Show the count total. Use total=10 for one frame, total=20 for two frames. highlightFilled is an array of 0-based indices to highlight specific counters (e.g. to show 7 = 5 + 2, highlight indices 5,6).',
    jsonExample: JSON.stringify({
      type: 'ten_frame',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        filled: 7,
        total: 10,
        color: '#6366f1',
        title: 'Showing 7: that is 5 and 2 more!',
        highlightFilled: [5, 6],
      },
    }),
  },

  part_part_whole: {
    type: 'part_part_whole',
    subject: 'math',
    gradeRange: '1-3',
    engine: 'svg',
    description: 'Part-part-whole model (number bond) showing how two parts combine into a whole. 4 steps: 1) Show circles and connecting lines, 2) Reveal the whole number, 3) Reveal the two part numbers, 4) Show the relationship equation. Set showParts=true to show equation as "part1 + part2 = whole", or false for "whole = part1 + part2". Use labels to give meaningful names to parts.',
    jsonExample: JSON.stringify({
      type: 'part_part_whole',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        whole: 8,
        part1: 5,
        part2: 3,
        showParts: true,
        title: 'Breaking apart 8',
        labels: { whole: 'Total marbles', part1: 'Red marbles', part2: 'Blue marbles' },
      },
    }),
  },

  bar_model: {
    type: 'bar_model',
    subject: 'math',
    gradeRange: '1-5',
    engine: 'svg',
    description: 'Bar model (tape diagram) for word problem visualization. 4 steps: 1) Show bar outline with part dividers, 2) Fill parts with colors, 3) Add value and name labels, 4) Show total bracket underneath. Operations: add, subtract, compare, multiply, divide. Set unknownPart to the 0-based index of the part to show as "?" (for subtraction/missing-addend problems).',
    jsonExample: JSON.stringify({
      type: 'bar_model',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        parts: [{ value: 7, label: 'Gave away', color: '#ef4444' }, { value: 5, label: 'Left over', color: '#3b82f6' }],
        total: 12,
        operation: 'subtract',
        title: 'Tom had 12 apples and gave 7 away',
        unknownPart: 1,
      },
    }),
  },

  place_value_chart: {
    type: 'place_value_chart',
    subject: 'math',
    gradeRange: '1-4',
    engine: 'svg',
    description: 'Place value chart showing digits in columns. Steps: 1) Show column headers, 2) Reveal digits, 3) Show expanded form (only if showExpanded=true, making totalSteps=3; otherwise totalSteps=2). Columns: ones, tens, hundreds, thousands, ten_thousands. List all columns the number needs. Use highlightColumn to emphasize a specific place value.',
    jsonExample: JSON.stringify({
      type: 'place_value_chart',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        number: 347,
        columns: ['hundreds', 'tens', 'ones'],
        showExpanded: true,
        title: 'What is the value of each digit in 347?',
        highlightColumn: 'tens',
      },
    }),
  },

  base_10_blocks: {
    type: 'base_10_blocks',
    subject: 'math',
    gradeRange: '1-4',
    engine: 'svg',
    description: 'Base-10 blocks (manipulatives) representing a number with unit cubes (ones), rods (tens), and flats (hundreds). 3 steps: 1) Show the number, 2) Show decomposition text (e.g. "2 x 100 + 3 x 10 + 5 x 1"), 3) Draw the actual blocks. Set showDecomposition=true to show the decomposition text in step 2.',
    jsonExample: JSON.stringify({
      type: 'base_10_blocks',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        number: 235,
        showDecomposition: true,
        title: 'How many flats, rods, and cubes make 235?',
      },
    }),
  },

  picture_graph: {
    type: 'picture_graph',
    subject: 'math',
    gradeRange: '1-3',
    engine: 'recharts',
    description: 'Picture graph (pictograph) with icons representing data. 3 steps: 1) Show category labels and row lines, 2) Place icons row by row with count at end, 3) Show the key. Icon types: circle, star, heart, square, triangle, diamond. Use the SAME icon for all categories (the icon represents one unit). symbolValue sets how much each icon is worth (default 1). Use symbolValue=2 for scaled pictographs.',
    jsonExample: JSON.stringify({
      type: 'picture_graph',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        categories: [
          { label: 'Dogs', count: 5, icon: 'heart' },
          { label: 'Cats', count: 3, icon: 'heart' },
          { label: 'Fish', count: 4, icon: 'heart' },
          { label: 'Birds', count: 2, icon: 'heart' },
        ],
        title: 'Our Class Pets',
        symbolValue: 1,
        showKey: true,
      },
    }),
  },

  bar_graph: {
    type: 'bar_graph',
    subject: 'math',
    gradeRange: '2-4',
    engine: 'recharts',
    description: 'Bar graph with labeled categories and a scale. 3 steps: 1) Draw axes and grid lines, 2) Grow the bars, 3) Add category and value labels. scale controls the grid line spacing (e.g. scale=2 puts grid lines at 2,4,6...). orientation: vertical (default) or horizontal. Use yAxisLabel and xAxisLabel for axis titles. Max value should be a multiple of scale for clean grid lines.',
    jsonExample: JSON.stringify({
      type: 'bar_graph',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        categories: [
          { label: 'Soccer', value: 8, color: '#22c55e' },
          { label: 'Basketball', value: 6, color: '#f59e0b' },
          { label: 'Swimming', value: 4, color: '#3b82f6' },
          { label: 'Dance', value: 3, color: '#ec4899' },
        ],
        title: 'Favorite Sports in Our Class',
        scale: 2,
        orientation: 'vertical',
        yAxisLabel: 'Number of Students',
        xAxisLabel: 'Sport',
      },
    }),
  },

  fraction_circle: {
    type: 'fraction_circle',
    subject: 'math',
    gradeRange: '2-4',
    engine: 'svg',
    description: 'Circle divided into equal parts showing a fraction',
    jsonExample: JSON.stringify({
      type: 'fraction_circle',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        numerator: 3,
        denominator: 4,
        showLabel: true,
        color: '#6366f1',
        title: 'Show 3/4',
      },
    }),
  },

  fraction_bar: {
    type: 'fraction_bar',
    subject: 'math',
    gradeRange: '2-4',
    engine: 'svg',
    description: 'Bar divided into equal parts showing a fraction',
    jsonExample: JSON.stringify({
      type: 'fraction_bar',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        numerator: 2,
        denominator: 5,
        color: '#3b82f6',
        title: 'Show 2/5',
        showLabel: true,
      },
    }),
  },

  fraction_number_line: {
    type: 'fraction_number_line',
    subject: 'math',
    gradeRange: '3-5',
    engine: 'svg',
    description: 'Number line with fraction tick marks and plotted fractions',
    jsonExample: JSON.stringify({
      type: 'fraction_number_line',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        fractions: [
          { numerator: 1, denominator: 4 },
          { numerator: 3, denominator: 4 },
        ],
        min: 0,
        max: 1,
        denominator: 4,
        showTickMarks: true,
        title: 'Plot 1/4 and 3/4',
      },
    }),
  },

  multiplication_array: {
    type: 'multiplication_array',
    subject: 'math',
    gradeRange: '2-4',
    engine: 'svg',
    description: 'Array of dots/objects showing multiplication as rows x columns',
    jsonExample: JSON.stringify({
      type: 'multiplication_array',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        rows: 3,
        columns: 4,
        showPartialProducts: false,
        color: '#6366f1',
        title: '3 \u00d7 4 = 12',
      },
    }),
  },

  area_model_multiplication: {
    type: 'area_model_multiplication',
    subject: 'math',
    gradeRange: '3-5',
    engine: 'svg',
    description: 'Area model for multi-digit multiplication with partial products',
    jsonExample: JSON.stringify({
      type: 'area_model_multiplication',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        factor1: 23,
        factor2: 15,
        showPartials: true,
        decomposition1: [20, 3],
        decomposition2: [10, 5],
        title: '23 \u00d7 15',
      },
    }),
  },

  scaled_bar_graph: {
    type: 'scaled_bar_graph',
    subject: 'math',
    gradeRange: '3-5',
    engine: 'recharts',
    description: 'Bar graph with scaled axis (each gridline represents more than 1)',
    jsonExample: JSON.stringify({
      type: 'scaled_bar_graph',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        data: [
          { label: 'Fiction', value: 30, color: '#6366f1' },
          { label: 'Non-fiction', value: 20, color: '#3b82f6' },
          { label: 'Poetry', value: 10, color: '#22c55e' },
        ],
        scale: 5,
        title: 'Books Read',
        yAxisLabel: 'Number of books',
        showGridLines: true,
      },
    }),
  },

  equivalent_fraction_model: {
    type: 'equivalent_fraction_model',
    subject: 'math',
    gradeRange: '3-5',
    engine: 'svg',
    description: 'Side-by-side models showing two equivalent fractions',
    jsonExample: JSON.stringify({
      type: 'equivalent_fraction_model',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        fraction1: { numerator: 1, denominator: 2 },
        fraction2: { numerator: 2, denominator: 4 },
        showAlignment: true,
        modelType: 'bar',
        title: '1/2 = 2/4',
      },
    }),
  },

  mixed_number_model: {
    type: 'mixed_number_model',
    subject: 'math',
    gradeRange: '3-5',
    engine: 'svg',
    description: 'Visual model of a mixed number showing wholes and a fractional part',
    jsonExample: JSON.stringify({
      type: 'mixed_number_model',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        wholeNumber: 2,
        fraction: { numerator: 3, denominator: 4 },
        showImproper: true,
        modelType: 'circle',
        title: '2 3/4',
      },
    }),
  },

  decimal_grid: {
    type: 'decimal_grid',
    subject: 'math',
    gradeRange: '4-5',
    engine: 'svg',
    description: 'Grid (10x10 or 10x1) showing decimal values as shaded cells',
    jsonExample: JSON.stringify({
      type: 'decimal_grid',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        value: 0.35,
        gridSize: 100,
        showFractionEquivalent: true,
        title: '0.35 on a hundredths grid',
      },
    }),
  },

  fraction_multiplication_area: {
    type: 'fraction_multiplication_area',
    subject: 'math',
    gradeRange: '4-5',
    engine: 'svg',
    description: 'Area model for fraction multiplication showing overlap',
    jsonExample: JSON.stringify({
      type: 'fraction_multiplication_area',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        fraction1: { numerator: 2, denominator: 3 },
        fraction2: { numerator: 3, denominator: 4 },
        showOverlap: true,
        showProduct: true,
        title: '2/3 \u00d7 3/4',
      },
    }),
  },

  fraction_division_model: {
    type: 'fraction_division_model',
    subject: 'math',
    gradeRange: '5-6',
    engine: 'svg',
    description: 'Visual model for fraction division showing how many groups fit',
    jsonExample: JSON.stringify({
      type: 'fraction_division_model',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        dividend: { numerator: 3, denominator: 4 },
        divisor: { numerator: 1, denominator: 4 },
        showGroups: true,
        quotient: { numerator: 3, denominator: 1 },
        title: '3/4 \u00f7 1/4 = 3',
      },
    }),
  },

  volume_model: {
    type: 'volume_model',
    subject: 'math',
    gradeRange: '5-6',
    engine: 'svg',
    description: '3D rectangular prism with unit cubes to visualize volume',
    jsonExample: JSON.stringify({
      type: 'volume_model',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        length: 4,
        width: 3,
        height: 2,
        showUnitCubes: true,
        showLayers: true,
        showFormula: true,
        title: 'Volume = 4 \u00d7 3 \u00d7 2 = 24',
      },
    }),
  },

  order_of_operations_tree: {
    type: 'order_of_operations_tree',
    subject: 'math',
    gradeRange: '5-6',
    engine: 'mermaid',
    description: 'Tree diagram showing step-by-step PEMDAS evaluation. Each entry in the steps array becomes one tree node. The component builds stepDefs as: 1 (show expression) + steps.length (one per operation) + 1 (final answer) = steps.length + 2 total steps. Set totalSteps = steps.length + 2. Each step has { operation, result, highlighted? }. Use "highlighted: true" on the most important teaching step. Order the steps according to PEMDAS: Parentheses first, then Exponents, then Multiplication/Division left-to-right, then Addition/Subtraction left-to-right.',
    jsonExample: JSON.stringify({
      type: 'order_of_operations_tree',
      visibleStep: 0,
      totalSteps: 6,
      data: {
        expression: '(2 + 3)\u00b2 \u00d7 4 \u2212 6',
        steps: [
          { operation: '(2 + 3) = 5', result: 5, highlighted: true },
          { operation: '5\u00b2 = 25', result: 25 },
          { operation: '25 \u00d7 4 = 100', result: 100 },
          { operation: '100 \u2212 6 = 94', result: 94 },
        ],
        title: 'Evaluate: (2 + 3)\u00b2 \u00d7 4 \u2212 6',
        showParentheses: true,
      },
    }),
  },

  quadrant_one_coordinate_plane: {
    type: 'quadrant_one_coordinate_plane',
    subject: 'math',
    gradeRange: '5-6',
    engine: 'desmos',
    description: 'Coordinate plane restricted to Quadrant I (positive x and y only)',
    jsonExample: JSON.stringify({
      type: 'quadrant_one_coordinate_plane',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        xMin: 0, xMax: 10, yMin: 0, yMax: 10, showGrid: true,
        title: 'Plot the points',
        points: [
          { id: 'A', x: 2, y: 5, label: 'A(2,5)', color: '#6366f1' },
          { id: 'B', x: 7, y: 3, label: 'B(7,3)', color: '#ef4444' },
        ],
      },
    }),
  },

  // ---- MIDDLE SCHOOL MATH: Grades 6-8 (New) ----

  double_number_line: {
    type: 'double_number_line',
    subject: 'math',
    gradeRange: '6-7',
    engine: 'svg',
    description: 'Two aligned number lines showing proportional relationships',
    jsonExample: JSON.stringify({
      type: 'double_number_line',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        topLine: { label: 'Miles', values: [0, 3, 6, 9], unit: 'mi' },
        bottomLine: { label: 'Hours', values: [0, 1, 2, 3], unit: 'hr' },
        title: '3 miles per hour',
        highlightPair: 2,
      },
    }),
  },

  ratio_table: {
    type: 'ratio_table',
    subject: 'math',
    gradeRange: '6-7',
    engine: 'svg',
    description: 'Table showing equivalent ratios in columns',
    jsonExample: JSON.stringify({
      type: 'ratio_table',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        columns: [
          { header: 'Cups of flour', values: [2, 4, 6, 8] },
          { header: 'Cups of sugar', values: [1, 2, 3, 4] },
        ],
        showEquivalence: true,
        title: 'Flour to sugar ratio 2:1',
      },
    }),
  },

  tape_diagram_ratio: {
    type: 'tape_diagram_ratio',
    subject: 'math',
    gradeRange: '6-7',
    engine: 'svg',
    description: 'Tape diagram showing a ratio with labeled parts',
    jsonExample: JSON.stringify({
      type: 'tape_diagram_ratio',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        ratio: [3, 2],
        labels: ['Boys', 'Girls'],
        totalValue: 25,
        title: 'Boys to Girls = 3:2',
      },
    }),
  },

  percent_bar_model: {
    type: 'percent_bar_model',
    subject: 'math',
    gradeRange: '6-7',
    engine: 'svg',
    description: 'Bar showing parts as percentages of a whole',
    jsonExample: JSON.stringify({
      type: 'percent_bar_model',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        total: 200,
        parts: [
          { value: 50, percent: 25, label: 'Tax', color: '#ef4444' },
          { value: 150, percent: 75, label: 'Base price', color: '#3b82f6' },
        ],
        showPercents: true,
        title: '25% of 200 = 50',
      },
    }),
  },

  dot_plot: {
    type: 'dot_plot',
    subject: 'math',
    gradeRange: '6-7',
    engine: 'recharts',
    description: 'Dot plot showing frequency of data values on a number line',
    jsonExample: JSON.stringify({
      type: 'dot_plot',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        data: [1, 2, 2, 3, 3, 3, 4, 4, 5],
        min: 0,
        max: 6,
        title: 'Quiz Scores',
        xAxisLabel: 'Score',
      },
    }),
  },

  histogram: {
    type: 'histogram',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'recharts',
    description: 'Histogram with bins showing distribution of continuous data',
    jsonExample: JSON.stringify({
      type: 'histogram',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        bins: [
          { min: 0, max: 10, count: 3 },
          { min: 10, max: 20, count: 7 },
          { min: 20, max: 30, count: 5 },
          { min: 30, max: 40, count: 2 },
        ],
        title: 'Test Score Distribution',
        xAxisLabel: 'Score',
        yAxisLabel: 'Frequency',
        binWidth: 10,
      },
    }),
  },

  box_plot: {
    type: 'box_plot',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'recharts',
    description: 'Box-and-whisker plot showing five-number summary',
    jsonExample: JSON.stringify({
      type: 'box_plot',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        min: 12,
        q1: 25,
        median: 35,
        q3: 45,
        max: 58,
        title: 'Test Scores',
        showLabels: true,
      },
    }),
  },

  stem_and_leaf_plot: {
    type: 'stem_and_leaf_plot',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'recharts',
    description: 'Stem-and-leaf plot organizing data by tens and ones digits',
    jsonExample: JSON.stringify({
      type: 'stem_and_leaf_plot',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        stems: [
          { stem: 4, leaves: [2, 5, 7] },
          { stem: 5, leaves: [1, 3, 3, 8] },
          { stem: 6, leaves: [0, 4] },
        ],
        title: 'Student Heights (inches)',
        stemLabel: 'Stem',
        leafLabel: 'Leaf',
        key: '5|3 = 53 inches',
      },
    }),
  },

  measures_of_center: {
    type: 'measures_of_center',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'recharts',
    description: 'Visualization of mean, median, and mode on a data set',
    jsonExample: JSON.stringify({
      type: 'measures_of_center',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        data: [2, 3, 5, 5, 7, 8, 10],
        mean: 5.71,
        median: 5,
        mode: [5],
        range: 8,
        title: 'Mean, Median, Mode',
        showOnNumberLine: true,
      },
    }),
  },

  probability_tree: {
    type: 'probability_tree',
    subject: 'math',
    gradeRange: '7-8',
    engine: 'mermaid',
    description: 'Probability tree with levels of branches and outcome probabilities',
    jsonExample: JSON.stringify({
      type: 'probability_tree',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        levels: [
          { branches: [{ label: 'H', probability: 0.5 }, { label: 'T', probability: 0.5 }] },
          { branches: [{ label: 'H', probability: 0.5, children: [0] }, { label: 'T', probability: 0.5, children: [0] }, { label: 'H', probability: 0.5, children: [1] }, { label: 'T', probability: 0.5, children: [1] }] },
        ],
        outcomes: [{ path: ['H', 'H'], probability: 0.25 }, { path: ['H', 'T'], probability: 0.25 }],
        title: 'Two coin flips',
      },
    }),
  },

  sample_space_diagram: {
    type: 'sample_space_diagram',
    subject: 'math',
    gradeRange: '7-8',
    engine: 'svg',
    description: 'Grid showing all outcomes for two independent events',
    jsonExample: JSON.stringify({
      type: 'sample_space_diagram',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        event1: { name: 'Die', outcomes: ['1', '2', '3', '4', '5', '6'] },
        event2: { name: 'Coin', outcomes: ['H', 'T'] },
        favorableOutcomes: [['6', 'H']],
        title: 'Die and Coin Sample Space',
      },
    }),
  },

  venn_diagram: {
    type: 'venn_diagram',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'svg',
    description: 'Venn diagram showing set relationships with intersections',
    jsonExample: JSON.stringify({
      type: 'venn_diagram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        sets: [
          { label: 'Even', elements: ['2', '4', '6', '8'], color: '#3b82f6' },
          { label: 'Multiples of 3', elements: ['3', '6', '9'], color: '#ef4444' },
        ],
        intersections: [{ setIndices: [0, 1], elements: ['6'] }],
        title: 'Even numbers and Multiples of 3',
      },
    }),
  },

  net_diagram_3d: {
    type: 'net_diagram_3d',
    subject: 'math',
    gradeRange: '6-8',
    engine: 'svg',
    description: 'Unfolded net of a 3D shape with labeled dimensions',
    jsonExample: JSON.stringify({
      type: 'net_diagram_3d',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        shape: 'rectangular_prism',
        dimensions: { length: 4, width: 3, height: 2 },
        showFoldLines: true,
        showLabels: true,
        title: 'Net of a rectangular prism',
      },
    }),
  },

  cross_section_diagram: {
    type: 'cross_section_diagram',
    subject: 'math',
    gradeRange: '7-8',
    engine: 'svg',
    description: 'Cross section of a 3D solid cut by a plane',
    jsonExample: JSON.stringify({
      type: 'cross_section_diagram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        solid: 'cylinder',
        plane: 'horizontal',
        planePosition: 0.5,
        showCrossSection: true,
        title: 'Horizontal cross section of a cylinder',
      },
    }),
  },

  scale_drawing: {
    type: 'scale_drawing',
    subject: 'math',
    gradeRange: '7-8',
    engine: 'svg',
    description: 'Scale drawing showing original and scaled shapes side by side',
    jsonExample: JSON.stringify({
      type: 'scale_drawing',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        scaleFactor: 2,
        originalDimensions: { length: 5, width: 3 },
        scaledDimensions: { length: 10, width: 6 },
        shape: 'rectangle',
        showMeasurements: true,
        title: 'Scale factor 1:2',
      },
    }),
  },

  slope_triangle: {
    type: 'slope_triangle',
    subject: 'math',
    gradeRange: '8',
    engine: 'desmos',
    description: 'Right triangle on a coordinate plane showing rise and run for slope',
    jsonExample: JSON.stringify({
      type: 'slope_triangle',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        point1: { x: 1, y: 2 },
        point2: { x: 4, y: 8 },
        rise: 6,
        run: 3,
        slope: 2,
        showRiseRun: true,
        showSlopeFormula: true,
        title: 'Slope = rise/run = 6/3 = 2',
      },
    }),
  },

  system_of_equations_graph: {
    type: 'system_of_equations_graph',
    subject: 'math',
    gradeRange: '8',
    engine: 'desmos',
    description: 'Graph of two linear equations showing their intersection point',
    jsonExample: JSON.stringify({
      type: 'system_of_equations_graph',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        equations: [
          { slope: 1, yIntercept: 1, expression: 'y = x + 1', color: '#3b82f6' },
          { slope: -1, yIntercept: 5, expression: 'y = -x + 5', color: '#ef4444' },
        ],
        solution: { x: 2, y: 3 },
        showSolution: true,
        title: 'System: y = x+1 and y = -x+5',
      },
    }),
  },

  scatter_plot_trend_line: {
    type: 'scatter_plot_trend_line',
    subject: 'math',
    gradeRange: '8',
    engine: 'desmos',
    description: 'Scatter plot with data points and an optional trend line',
    jsonExample: JSON.stringify({
      type: 'scatter_plot_trend_line',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        points: [{ x: 1, y: 2 }, { x: 2, y: 4 }, { x: 3, y: 5 }, { x: 4, y: 8 }, { x: 5, y: 9 }],
        trendLine: { slope: 1.7, yIntercept: 0.3, rSquared: 0.96 },
        xLabel: 'Hours studied',
        yLabel: 'Score',
        title: 'Study Hours vs Score',
      },
    }),
  },

  two_way_frequency_table: {
    type: 'two_way_frequency_table',
    subject: 'math',
    gradeRange: '8',
    engine: 'recharts',
    description: 'Two-way frequency table showing joint and marginal frequencies',
    jsonExample: JSON.stringify({
      type: 'two_way_frequency_table',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        rowHeaders: ['Male', 'Female'],
        columnHeaders: ['Cat', 'Dog'],
        data: [[10, 15], [12, 8]],
        rowLabel: 'Gender',
        columnLabel: 'Pet',
        showMarginals: true,
        title: 'Pet preference by gender',
      },
    }),
  },

  pythagorean_theorem_diagram: {
    type: 'pythagorean_theorem_diagram',
    subject: 'math',
    gradeRange: '8',
    engine: 'geogebra',
    description: 'Right triangle with squares on each side illustrating a\u00b2 + b\u00b2 = c\u00b2',
    jsonExample: JSON.stringify({
      type: 'pythagorean_theorem_diagram',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        sideA: 3,
        sideB: 4,
        hypotenuse: 5,
        showSquares: true,
        showLabels: true,
        title: '3\u00b2 + 4\u00b2 = 5\u00b2',
      },
    }),
  },

  transformation_diagram: {
    type: 'transformation_diagram',
    subject: 'math',
    gradeRange: '8',
    engine: 'geogebra',
    description: 'Coordinate plane showing a shape before and after a geometric transformation',
    jsonExample: JSON.stringify({
      type: 'transformation_diagram',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        original: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        transformed: [{ x: -1, y: 1 }, { x: -3, y: 1 }, { x: -2, y: 3 }],
        transformationType: 'reflection',
        transformationParams: { axis: 'y-axis' },
        showOriginal: true,
        showGrid: true,
        title: 'Reflection over y-axis',
      },
    }),
  },

  // ---- HIGH SCHOOL MATH: Grades 9-12 (New) ----

  quadratic_graph: {
    type: 'quadratic_graph',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'desmos',
    description: 'Parabola with vertex, roots, and axis of symmetry. 6-step progressive reveal: (0) axes with grid, (1) plot vertex point, (2) draw axis of symmetry, (3) trace parabola curve, (4) mark roots on x-axis, (5) show equation. Provide a, b, c coefficients. vertex, roots, axisOfSymmetry are optional (component can compute them), but providing them is recommended for educational accuracy. domain controls x-axis range.',
    jsonExample: JSON.stringify({
      type: 'quadratic_graph',
      visibleStep: 0,
      totalSteps: 6,
      data: {
        a: 1,
        b: -6,
        c: 8,
        expression: 'x\u00b2 - 6x + 8',
        vertex: { x: 3, y: -1 },
        roots: [2, 4],
        axisOfSymmetry: 3,
        showVertex: true,
        showRoots: true,
        showAxisOfSymmetry: true,
        domain: { min: -1, max: 7 },
        title: 'Graphing y = x\u00b2 - 6x + 8 step by step',
      },
    }),
  },

  residual_plot: {
    type: 'residual_plot',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'desmos',
    description: 'Plot of residuals (predicted vs residual) to assess regression fit',
    jsonExample: JSON.stringify({
      type: 'residual_plot',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        residuals: [
          { predicted: 2, residual: 0.3 },
          { predicted: 4, residual: -0.5 },
          { predicted: 6, residual: 0.1 },
          { predicted: 8, residual: -0.2 },
        ],
        showZeroLine: true,
        title: 'Residual plot',
      },
    }),
  },

  complex_number_plane: {
    type: 'complex_number_plane',
    subject: 'math',
    gradeRange: '10-12',
    engine: 'desmos',
    description: 'Complex (Argand) plane with plotted complex numbers. Steps: (0) axes, (1) plot points, (2) show modulus/argument. Provide points array with real, imaginary, optional label and color. Set showModulus/showArgument for extra step.',
    jsonExample: JSON.stringify({
      type: 'complex_number_plane',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        points: [
          { real: 3, imaginary: 2, label: 'z\u2081 = 3+2i', color: '#6366f1' },
          { real: -1, imaginary: 1, label: 'z\u2082 = -1+i', color: '#ef4444' },
        ],
        showModulus: true,
        showArgument: true,
        title: 'Plotting complex numbers on the Argand plane',
      },
    }),
  },

  conic_sections: {
    type: 'conic_sections',
    subject: 'math',
    gradeRange: '10-12',
    engine: 'desmos',
    description: 'Conic section. Steps: (0) axes, (1) mark center, (2) draw curve, (3) show features (foci, directrix, asymptotes), (4) show equation. totalSteps = 3 base + (showFoci||showDirectrix||showAsymptotes ? 1 : 0) + 1 for equation. Type: circle, ellipse, parabola, or hyperbola.',
    jsonExample: JSON.stringify({
      type: 'conic_sections',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        type: 'ellipse',
        center: { x: 0, y: 0 },
        radiusX: 5,
        radiusY: 3,
        expression: 'x\u00b2/25 + y\u00b2/9 = 1',
        showFoci: true,
        title: 'Graphing the ellipse x\u00b2/25 + y\u00b2/9 = 1',
      },
    }),
  },

  polynomial_graph: {
    type: 'polynomial_graph',
    subject: 'math',
    gradeRange: '10-12',
    engine: 'desmos',
    description: 'Polynomial function graph. 5 steps: (0) axes, (1) plot zeros on x-axis, (2) trace curve through zeros, (3) mark turning points, (4) show end behavior arrows. Provide coefficients, degree, zeros, turningPoints array, and endBehavior.',
    jsonExample: JSON.stringify({
      type: 'polynomial_graph',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        coefficients: [1, 0, -4, 0],
        degree: 3,
        expression: 'x\u00b3 - 4x',
        zeros: [-2, 0, 2],
        turningPoints: [
          { x: -1.15, y: 3.08 },
          { x: 1.15, y: -3.08 },
        ],
        endBehavior: { left: 'down', right: 'up' },
        domain: { min: -4, max: 4 },
        title: 'Graphing y = x\u00b3 - 4x step by step',
      },
    }),
  },

  exponential_graph: {
    type: 'exponential_graph',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'desmos',
    description: 'Exponential function graph. 5 steps: (0) axes, (1) draw horizontal asymptote, (2) plot y-intercept, (3) trace exponential curve, (4) show equation. Provide base, coefficient, asymptote, yIntercept, and showAsymptote.',
    jsonExample: JSON.stringify({
      type: 'exponential_graph',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        base: 2,
        coefficient: 1,
        asymptote: 0,
        expression: '2^x',
        isGrowth: true,
        showAsymptote: true,
        yIntercept: 1,
        domain: { min: -3, max: 4 },
        title: 'Graphing y = 2^x step by step',
      },
    }),
  },

  logarithmic_graph: {
    type: 'logarithmic_graph',
    subject: 'math',
    gradeRange: '10-12',
    engine: 'desmos',
    description: 'Logarithmic function graph. 5 steps: (0) axes, (1) draw vertical asymptote, (2) plot key points, (3) trace curve, (4) show equation. Provide base, coefficient, asymptote, keyPoints, showAsymptote.',
    jsonExample: JSON.stringify({
      type: 'logarithmic_graph',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        base: 10,
        coefficient: 1,
        asymptote: 0,
        expression: 'log(x)',
        showAsymptote: true,
        keyPoints: [{ x: 1, y: 0, label: '(1,0)' }, { x: 10, y: 1, label: '(10,1)' }, { x: 100, y: 2, label: '(100,2)' }],
        domain: { min: 0.1, max: 20 },
        title: 'Graphing y = log(x) step by step',
      },
    }),
  },

  rational_function_graph: {
    type: 'rational_function_graph',
    subject: 'math',
    gradeRange: '10-12',
    engine: 'desmos',
    description: 'Rational function graph with asymptotes, holes, and intercepts',
    jsonExample: JSON.stringify({
      type: 'rational_function_graph',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        numerator: 'x + 1',
        denominator: 'x - 2',
        expression: '(x+1)/(x-2)',
        verticalAsymptotes: [2],
        horizontalAsymptote: 1,
        xIntercepts: [-1],
        showAsymptotes: true,
        domain: { min: -5, max: 7 },
        title: 'y = (x+1)/(x-2)',
      },
    }),
  },

  binomial_distribution: {
    type: 'binomial_distribution',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'recharts',
    description: 'Binomial probability distribution bar chart',
    jsonExample: JSON.stringify({
      type: 'binomial_distribution',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        n: 10,
        p: 0.5,
        showMean: true,
        showStd: true,
        title: 'B(10, 0.5)',
      },
    }),
  },

  probability_distribution: {
    type: 'probability_distribution',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'recharts',
    description: 'Discrete or continuous probability distribution with expected value',
    jsonExample: JSON.stringify({
      type: 'probability_distribution',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        outcomes: [
          { value: 1, probability: 0.1, label: '1' },
          { value: 2, probability: 0.2, label: '2' },
          { value: 3, probability: 0.4, label: '3' },
          { value: 4, probability: 0.2, label: '4' },
          { value: 5, probability: 0.1, label: '5' },
        ],
        expectedValue: 3,
        type: 'discrete',
        title: 'Probability Distribution',
      },
    }),
  },

  parametric_curve: {
    type: 'parametric_curve',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'desmos',
    description: 'Parametric curve defined by x(t) and y(t) expressions',
    jsonExample: JSON.stringify({
      type: 'parametric_curve',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        xExpression: 'cos(t)',
        yExpression: 'sin(t)',
        tRange: { min: 0, max: 6.283 },
        showDirection: true,
        title: 'Unit circle as parametric curve',
      },
    }),
  },

  limit_visualization: {
    type: 'limit_visualization',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'desmos',
    description: 'Limit visualization. 4 steps: (0) draw function curve, (1) approach from left (x\u2192a\u207b), (2) approach from right (x\u2192a\u207a), (3) show limit value or DNE. Provide expression, approachValue, leftLimit, rightLimit. Set showApproachArrows and showDiscontinuity.',
    jsonExample: JSON.stringify({
      type: 'limit_visualization',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        expression: '(x^2-1)/(x-1)',
        approachValue: 1,
        leftLimit: 2,
        rightLimit: 2,
        showApproachArrows: true,
        showDiscontinuity: true,
        domain: { min: -2, max: 4 },
        title: 'lim(x\u21921) (x\u00b2-1)/(x-1) = 2',
      },
    }),
  },

  derivative_tangent_line: {
    type: 'derivative_tangent_line',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'desmos',
    description: 'Derivative tangent line. 4 steps: (0) draw function curve, (1) mark point on curve, (2) draw tangent line through point, (3) show slope value. With secantLines, adds extra step showing secant lines converging. Provide expression, point {x,y}, slope, tangentLine {slope, yIntercept}.',
    jsonExample: JSON.stringify({
      type: 'derivative_tangent_line',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        expression: 'x^2',
        point: { x: 2, y: 4 },
        slope: 4,
        tangentLine: { slope: 4, yIntercept: -4 },
        domain: { min: -2, max: 5 },
        title: "Finding f'(2) for f(x) = x\u00b2",
      },
    }),
  },

  sequence_diagram: {
    type: 'sequence_diagram',
    subject: 'math',
    gradeRange: '9-12',
    engine: 'mermaid',
    description: 'Arithmetic or geometric sequence with terms, common difference/ratio, pattern arrows, and optional explicit formula',
    jsonExample: JSON.stringify({
      type: 'sequence_diagram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        type: 'arithmetic',
        terms: [3, 7, 11, 15, 19],
        firstTerm: 3,
        commonDifferenceOrRatio: 4,
        formula: 'a\u2099 = 3 + (n-1)\u00b74',
        showFormula: true,
        showDifferences: true,
        title: 'Arithmetic sequence: d = 4',
      },
    }),
  },

  sampling_distribution: {
    type: 'sampling_distribution',
    subject: 'math',
    gradeRange: '11-12',
    engine: 'recharts',
    description: 'Sampling distribution visualization showing population curve, sampling process, histogram of sample means, and optional CLT normal overlay',
    jsonExample: JSON.stringify({
      type: 'sampling_distribution',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        populationMean: 100,
        populationStd: 15,
        sampleSize: 30,
        numSamples: 500,
        sampleMeans: [99.2, 101.5, 98.7, 100.3, 102.1],
        showCLT: true,
        title: 'Sampling Distribution of x\u0304 (n=30)',
      },
    }),
  },
}
