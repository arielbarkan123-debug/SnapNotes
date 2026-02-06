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

  triangle: {
    type: 'triangle',
    subject: 'math',
    gradeRange: '5-12',
    description: 'Triangle with labeled vertices, sides, angles, and optional altitude',
    jsonExample: JSON.stringify({
      type: 'triangle',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        vertices: [
          { label: 'A', x: 150, y: 50 },
          { label: 'B', x: 50, y: 250 },
          { label: 'C', x: 300, y: 250 },
        ],
        sides: [
          { from: 'A', to: 'B', length: 10, label: '10 cm' },
          { from: 'B', to: 'C', length: 12, label: '12 cm' },
          { from: 'A', to: 'C', length: 8, label: '8 cm' },
        ],
        angles: [
          { vertex: 'A', value: 60, label: '60\u00b0' },
          { vertex: 'B', value: 50, label: '50\u00b0' },
          { vertex: 'C', value: 70, label: '70\u00b0' },
        ],
        title: 'Triangle ABC',
      },
    }),
  },

  circle: {
    type: 'circle',
    subject: 'math',
    gradeRange: '5-12',
    description: 'Circle with radius, diameter, center label, and optional chords/sectors',
    jsonExample: JSON.stringify({
      type: 'circle',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        centerX: 0,
        centerY: 0,
        radius: 5,
        centerLabel: 'O',
        showRadius: true,
        radiusLabel: 'r = 5',
        showDiameter: true,
        title: 'Circle with radius 5',
      },
    }),
  },

  unit_circle: {
    type: 'unit_circle',
    subject: 'math',
    gradeRange: '9-12',
    description: 'Unit circle showing angles with sin/cos values and optional quadrant highlighting',
    jsonExample: JSON.stringify({
      type: 'unit_circle',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Probability tree diagram with branching nodes and probabilities',
    jsonExample: JSON.stringify({
      type: 'tree_diagram',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Interactive equation grapher for plotting and comparing functions. Students can type equations to see live graphs.',
    jsonExample: JSON.stringify({
      type: 'equation_grapher',
      visibleStep: 0,
      totalSteps: 2,
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

  // ---- GEOMETRY: Currently Implemented ----

  triangle_geometry: {
    type: 'triangle_geometry',
    subject: 'geometry',
    gradeRange: '7-12',
    description: 'Geometry triangle with side lengths, angles, height, area/perimeter calculations',
    jsonExample: JSON.stringify({
      type: 'triangle_geometry',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        type: 'scalene',
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        sides: {
          a: 10,
          b: 12,
          c: 8,
          labels: { a: '10 cm', b: '12 cm', c: '8 cm' },
        },
        angles: { A: 55.77, B: 82.82, C: 41.41 },
        height: { value: 7.5, from: 'A', showLine: true },
        title: 'Find the area of triangle ABC',
        showFormulas: true,
      },
    }),
  },

  regular_polygon: {
    type: 'regular_polygon',
    subject: 'geometry',
    gradeRange: '7-12',
    description: 'Regular polygon with side length, apothem, central angle, and interior angle',
    jsonExample: JSON.stringify({
      type: 'regular_polygon',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        sides: 6,
        sideLength: 5,
        sideLabel: '5 cm',
        showApothem: true,
        showCentralAngle: true,
        showInteriorAngle: true,
        title: 'Regular hexagon',
        showFormulas: true,
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

  // ---- ELEMENTARY MATH: Grades 1-5 (New) ----

  counting_objects_array: {
    type: 'counting_objects_array',
    subject: 'math',
    gradeRange: '1-3',
    description: 'Array of objects for counting, addition, or subtraction with grouping',
    jsonExample: JSON.stringify({
      type: 'counting_objects_array',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        objects: [{ type: 'star', count: 5, color: '#f59e0b' }, { type: 'star', count: 3, color: '#3b82f6' }],
        operation: 'add',
        total: 8,
        title: '5 + 3 = 8',
        groupSize: 5,
      },
    }),
  },

  ten_frame: {
    type: 'ten_frame',
    subject: 'math',
    gradeRange: '1-2',
    description: 'Ten frame showing filled and empty circles for number sense',
    jsonExample: JSON.stringify({
      type: 'ten_frame',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        filled: 7,
        total: 10,
        color: '#3b82f6',
        title: 'Show 7 on a ten frame',
      },
    }),
  },

  part_part_whole: {
    type: 'part_part_whole',
    subject: 'math',
    gradeRange: '1-3',
    description: 'Part-part-whole model showing how two parts make a whole',
    jsonExample: JSON.stringify({
      type: 'part_part_whole',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        whole: 10,
        part1: 6,
        part2: 4,
        showParts: true,
        title: '6 + 4 = 10',
        labels: { whole: 'Total', part1: 'Part A', part2: 'Part B' },
      },
    }),
  },

  bar_model: {
    type: 'bar_model',
    subject: 'math',
    gradeRange: '1-5',
    description: 'Bar model (tape diagram) for word problem visualization',
    jsonExample: JSON.stringify({
      type: 'bar_model',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        parts: [{ value: 12, label: 'Red', color: '#ef4444' }, { value: 8, label: 'Blue', color: '#3b82f6' }],
        total: 20,
        operation: 'add',
        title: 'Red + Blue = 20',
      },
    }),
  },

  place_value_chart: {
    type: 'place_value_chart',
    subject: 'math',
    gradeRange: '1-4',
    description: 'Place value chart showing digits in ones, tens, hundreds, thousands columns',
    jsonExample: JSON.stringify({
      type: 'place_value_chart',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        number: 352,
        columns: ['ones', 'tens', 'hundreds'],
        showExpanded: true,
        title: 'Place value of 352',
      },
    }),
  },

  base_10_blocks: {
    type: 'base_10_blocks',
    subject: 'math',
    gradeRange: '1-4',
    description: 'Base-10 blocks representing a number with units, rods, and flats',
    jsonExample: JSON.stringify({
      type: 'base_10_blocks',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        number: 234,
        showDecomposition: true,
        title: 'Represent 234 with base-10 blocks',
        operation: 'represent',
      },
    }),
  },

  picture_graph: {
    type: 'picture_graph',
    subject: 'math',
    gradeRange: '1-3',
    description: 'Picture graph (pictograph) with icons representing data categories',
    jsonExample: JSON.stringify({
      type: 'picture_graph',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        categories: [
          { label: 'Apples', count: 4, icon: 'apple' },
          { label: 'Bananas', count: 6, icon: 'banana' },
          { label: 'Oranges', count: 3, icon: 'orange' },
        ],
        title: 'Favorite Fruits',
        symbolValue: 1,
        showKey: true,
      },
    }),
  },

  bar_graph: {
    type: 'bar_graph',
    subject: 'math',
    gradeRange: '2-4',
    description: 'Bar graph with labeled categories and a scale',
    jsonExample: JSON.stringify({
      type: 'bar_graph',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        categories: [
          { label: 'Red', value: 5, color: '#ef4444' },
          { label: 'Blue', value: 8, color: '#3b82f6' },
          { label: 'Green', value: 3, color: '#22c55e' },
        ],
        title: 'Favorite Colors',
        scale: 1,
        orientation: 'vertical',
        yAxisLabel: 'Votes',
      },
    }),
  },

  fraction_circle: {
    type: 'fraction_circle',
    subject: 'math',
    gradeRange: '2-4',
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
    description: 'Tree diagram showing order of operations (PEMDAS) evaluation',
    jsonExample: JSON.stringify({
      type: 'order_of_operations_tree',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: '3 + 4 \u00d7 2',
        steps: [
          { operation: '4 \u00d7 2', result: 8 },
          { operation: '3 + 8', result: 11 },
        ],
        title: '3 + 4 \u00d7 2 = 11',
      },
    }),
  },

  quadrant_one_coordinate_plane: {
    type: 'quadrant_one_coordinate_plane',
    subject: 'math',
    gradeRange: '5-6',
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
    description: 'Two aligned number lines showing proportional relationships',
    jsonExample: JSON.stringify({
      type: 'double_number_line',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Table showing equivalent ratios in columns',
    jsonExample: JSON.stringify({
      type: 'ratio_table',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Tape diagram showing a ratio with labeled parts',
    jsonExample: JSON.stringify({
      type: 'tape_diagram_ratio',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Bar showing parts as percentages of a whole',
    jsonExample: JSON.stringify({
      type: 'percent_bar_model',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Histogram with bins showing distribution of continuous data',
    jsonExample: JSON.stringify({
      type: 'histogram',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Box-and-whisker plot showing five-number summary',
    jsonExample: JSON.stringify({
      type: 'box_plot',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Stem-and-leaf plot organizing data by tens and ones digits',
    jsonExample: JSON.stringify({
      type: 'stem_and_leaf_plot',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Visualization of mean, median, and mode on a data set',
    jsonExample: JSON.stringify({
      type: 'measures_of_center',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Probability tree with levels of branches and outcome probabilities',
    jsonExample: JSON.stringify({
      type: 'probability_tree',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Grid showing all outcomes for two independent events',
    jsonExample: JSON.stringify({
      type: 'sample_space_diagram',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Venn diagram showing set relationships with intersections',
    jsonExample: JSON.stringify({
      type: 'venn_diagram',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Unfolded net of a 3D shape with labeled dimensions',
    jsonExample: JSON.stringify({
      type: 'net_diagram_3d',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Cross section of a 3D solid cut by a plane',
    jsonExample: JSON.stringify({
      type: 'cross_section_diagram',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Scale drawing showing original and scaled shapes side by side',
    jsonExample: JSON.stringify({
      type: 'scale_drawing',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Right triangle on a coordinate plane showing rise and run for slope',
    jsonExample: JSON.stringify({
      type: 'slope_triangle',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Graph of two linear equations showing their intersection point',
    jsonExample: JSON.stringify({
      type: 'system_of_equations_graph',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Scatter plot with data points and an optional trend line',
    jsonExample: JSON.stringify({
      type: 'scatter_plot_trend_line',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Two-way frequency table showing joint and marginal frequencies',
    jsonExample: JSON.stringify({
      type: 'two_way_frequency_table',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Right triangle with squares on each side illustrating a\u00b2 + b\u00b2 = c\u00b2',
    jsonExample: JSON.stringify({
      type: 'pythagorean_theorem_diagram',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Coordinate plane showing a shape before and after a geometric transformation',
    jsonExample: JSON.stringify({
      type: 'transformation_diagram',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Parabola with vertex, roots, and axis of symmetry',
    jsonExample: JSON.stringify({
      type: 'quadratic_graph',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        a: 1,
        b: -4,
        c: 3,
        expression: 'x\u00b2 - 4x + 3',
        vertex: { x: 2, y: -1 },
        roots: [1, 3],
        axisOfSymmetry: 2,
        showVertex: true,
        showRoots: true,
        showAxisOfSymmetry: true,
        title: 'y = x\u00b2 - 4x + 3',
      },
    }),
  },

  residual_plot: {
    type: 'residual_plot',
    subject: 'math',
    gradeRange: '9-12',
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
    description: 'Complex (Argand) plane with plotted complex numbers',
    jsonExample: JSON.stringify({
      type: 'complex_number_plane',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        points: [
          { real: 3, imaginary: 2, label: '3+2i', color: '#6366f1' },
          { real: -1, imaginary: 4, label: '-1+4i', color: '#ef4444' },
        ],
        showModulus: true,
        title: 'Complex number plane',
      },
    }),
  },

  conic_sections: {
    type: 'conic_sections',
    subject: 'math',
    gradeRange: '10-12',
    description: 'Conic section (circle, ellipse, parabola, or hyperbola) with key features',
    jsonExample: JSON.stringify({
      type: 'conic_sections',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        type: 'ellipse',
        center: { x: 0, y: 0 },
        radiusX: 5,
        radiusY: 3,
        expression: 'x\u00b2/25 + y\u00b2/9 = 1',
        showFoci: true,
        title: 'Ellipse: x\u00b2/25 + y\u00b2/9 = 1',
      },
    }),
  },

  polynomial_graph: {
    type: 'polynomial_graph',
    subject: 'math',
    gradeRange: '10-12',
    description: 'Polynomial function graph showing zeros, turning points, and end behavior',
    jsonExample: JSON.stringify({
      type: 'polynomial_graph',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        coefficients: [1, 0, -4, 0],
        degree: 3,
        expression: 'x\u00b3 - 4x',
        zeros: [-2, 0, 2],
        endBehavior: { left: 'down', right: 'up' },
        domain: { min: -4, max: 4 },
        title: 'y = x\u00b3 - 4x',
      },
    }),
  },

  exponential_graph: {
    type: 'exponential_graph',
    subject: 'math',
    gradeRange: '9-12',
    description: 'Exponential function graph with asymptote',
    jsonExample: JSON.stringify({
      type: 'exponential_graph',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        base: 2,
        coefficient: 1,
        asymptote: 0,
        expression: '2^x',
        isGrowth: true,
        showAsymptote: true,
        domain: { min: -3, max: 4 },
        title: 'y = 2^x',
      },
    }),
  },

  logarithmic_graph: {
    type: 'logarithmic_graph',
    subject: 'math',
    gradeRange: '10-12',
    description: 'Logarithmic function graph with vertical asymptote',
    jsonExample: JSON.stringify({
      type: 'logarithmic_graph',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        base: 10,
        asymptote: 0,
        expression: 'log(x)',
        showAsymptote: true,
        keyPoints: [{ x: 1, y: 0, label: '(1,0)' }, { x: 10, y: 1, label: '(10,1)' }],
        domain: { min: 0.1, max: 20 },
        title: 'y = log(x)',
      },
    }),
  },

  rational_function_graph: {
    type: 'rational_function_graph',
    subject: 'math',
    gradeRange: '10-12',
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
    description: 'Binomial probability distribution bar chart',
    jsonExample: JSON.stringify({
      type: 'binomial_distribution',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Discrete or continuous probability distribution with expected value',
    jsonExample: JSON.stringify({
      type: 'probability_distribution',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Parametric curve defined by x(t) and y(t) expressions',
    jsonExample: JSON.stringify({
      type: 'parametric_curve',
      visibleStep: 0,
      totalSteps: 2,
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
    description: 'Graph showing the limit of a function as x approaches a value',
    jsonExample: JSON.stringify({
      type: 'limit_visualization',
      visibleStep: 0,
      totalSteps: 3,
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
    description: 'Function graph with a tangent line at a given point showing the derivative',
    jsonExample: JSON.stringify({
      type: 'derivative_tangent_line',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        expression: 'x^2',
        point: { x: 2, y: 4 },
        slope: 4,
        tangentLine: { slope: 4, yIntercept: -4 },
        domain: { min: -2, max: 5 },
        title: "f(x) = x\u00b2, f'(2) = 4",
      },
    }),
  },

  sequence_diagram: {
    type: 'sequence_diagram',
    subject: 'math',
    gradeRange: '9-12',
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

  // ---- GEOMETRY: New Schemas ----

  angle_types: {
    type: 'angle_types',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Diagram showing different angle types (acute, right, obtuse, straight, reflex)',
    jsonExample: JSON.stringify({
      type: 'angle_types',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angles: [
          { measure: 45, type: 'acute', label: '45\u00b0', vertex: { x: 100, y: 100 }, ray1Angle: 0, ray2Angle: 45 },
          { measure: 90, type: 'right', label: '90\u00b0', vertex: { x: 250, y: 100 }, ray1Angle: 0, ray2Angle: 90 },
        ],
        title: 'Types of Angles',
      },
    }),
  },

  complementary_supplementary: {
    type: 'complementary_supplementary',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Two angles that are complementary (sum to 90) or supplementary (sum to 180)',
    jsonExample: JSON.stringify({
      type: 'complementary_supplementary',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angle1: 60,
        angle2: 30,
        relationship: 'complementary',
        showSum: true,
        vertex: { x: 150, y: 150 },
        title: 'Complementary angles: 60\u00b0 + 30\u00b0 = 90\u00b0',
      },
    }),
  },

  vertical_angles: {
    type: 'vertical_angles',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Two intersecting lines forming vertical (opposite) angle pairs',
    jsonExample: JSON.stringify({
      type: 'vertical_angles',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angle1: 65,
        angle2: 65,
        intersection: { x: 150, y: 150 },
        showCongruenceMarks: true,
        title: 'Vertical angles are congruent',
      },
    }),
  },

  parallel_lines_transversal: {
    type: 'parallel_lines_transversal',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Two parallel lines cut by a transversal showing angle relationships',
    jsonExample: JSON.stringify({
      type: 'parallel_lines_transversal',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        line1Y: 80,
        line2Y: 200,
        transversalAngle: 60,
        highlightAngles: [{ position: 'interior', side: 'alternate', type: 'alternate_interior' }],
        showAngleMeasures: true,
        title: 'Parallel lines and transversal',
      },
    }),
  },

  triangle_angle_sum: {
    type: 'triangle_angle_sum',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Triangle showing that interior angles sum to 180 degrees',
    jsonExample: JSON.stringify({
      type: 'triangle_angle_sum',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        angles: [60, 70, 50],
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        labels: ['A', 'B', 'C'],
        showSum: true,
        title: '60\u00b0 + 70\u00b0 + 50\u00b0 = 180\u00b0',
      },
    }),
  },

  exterior_angle_theorem: {
    type: 'exterior_angle_theorem',
    subject: 'geometry',
    gradeRange: '7-8',
    description: 'Triangle exterior angle equals sum of two non-adjacent interior angles',
    jsonExample: JSON.stringify({
      type: 'exterior_angle_theorem',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        interiorAngles: [50, 60, 70],
        exteriorAngle: 110,
        exteriorAtVertex: 2,
        vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
        showRelationship: true,
        title: 'Exterior angle = 50\u00b0 + 60\u00b0 = 110\u00b0',
      },
    }),
  },

  perpendicular_bisector_construction: {
    type: 'perpendicular_bisector_construction',
    subject: 'geometry',
    gradeRange: '9-10',
    description: 'Compass-and-straightedge construction of a perpendicular bisector',
    jsonExample: JSON.stringify({
      type: 'perpendicular_bisector_construction',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        point1: { x: 50, y: 150 },
        point2: { x: 250, y: 150 },
        showConstruction: true,
        showArcs: true,
        showBisector: true,
        showMidpoint: true,
        title: 'Perpendicular bisector construction',
      },
    }),
  },

  rotation_coordinate_plane: {
    type: 'rotation_coordinate_plane',
    subject: 'geometry',
    gradeRange: '8-10',
    description: 'Shape rotated about a center point on the coordinate plane',
    jsonExample: JSON.stringify({
      type: 'rotation_coordinate_plane',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        originalVertices: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        centerOfRotation: { x: 0, y: 0 },
        angleDegrees: 90,
        showCenter: true,
        showArc: true,
        showPrime: true,
        title: '90\u00b0 rotation about origin',
      },
    }),
  },

  dilation_coordinate_plane: {
    type: 'dilation_coordinate_plane',
    subject: 'geometry',
    gradeRange: '8-10',
    description: 'Shape dilated from a center point by a scale factor',
    jsonExample: JSON.stringify({
      type: 'dilation_coordinate_plane',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        originalVertices: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        centerOfDilation: { x: 0, y: 0 },
        scaleFactor: 2,
        showCenter: true,
        showRays: true,
        showPrime: true,
        title: 'Dilation with scale factor 2',
      },
    }),
  },

  tessellation_pattern: {
    type: 'tessellation_pattern',
    subject: 'geometry',
    gradeRange: '8-10',
    description: 'Tiling pattern with repeated congruent shapes covering a plane',
    jsonExample: JSON.stringify({
      type: 'tessellation_pattern',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        baseShape: 'hexagon',
        rows: 3,
        columns: 4,
        showTransformations: true,
        colors: ['#3b82f6', '#22c55e', '#f59e0b'],
        title: 'Hexagonal tessellation',
      },
    }),
  },

  inscribed_angle_theorem: {
    type: 'inscribed_angle_theorem',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Circle showing inscribed angle is half the central angle subtending the same arc',
    jsonExample: JSON.stringify({
      type: 'inscribed_angle_theorem',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        radius: 100,
        centralAngle: 80,
        inscribedAngle: 40,
        arcAngle: 80,
        inscribedVertex: 180,
        arcEndpoints: [30, 110],
        showRelationship: true,
        title: 'Inscribed angle = \u00bd central angle',
      },
    }),
  },

  triangle_congruence: {
    type: 'triangle_congruence',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Two triangles with marked congruent parts and a congruence criterion (SSS, SAS, ASA, AAS, HL)',
    jsonExample: JSON.stringify({
      type: 'triangle_congruence',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle1: { vertices: [{ x: 50, y: 50 }, { x: 50, y: 200 }, { x: 200, y: 200 }], sides: [5, 7, 5], angles: [45, 90, 45] },
        triangle2: { vertices: [{ x: 250, y: 50 }, { x: 250, y: 200 }, { x: 400, y: 200 }], sides: [5, 7, 5], angles: [45, 90, 45] },
        criterion: 'SAS',
        correspondingParts: [{ type: 'side', index1: 0, index2: 0 }, { type: 'angle', index1: 1, index2: 1 }, { type: 'side', index1: 1, index2: 1 }],
        showCongruenceMarks: true,
        title: 'SAS Congruence',
      },
    }),
  },

  triangle_similarity: {
    type: 'triangle_similarity',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Two similar triangles with proportional sides and equal angles',
    jsonExample: JSON.stringify({
      type: 'triangle_similarity',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle1: { vertices: [{ x: 50, y: 50 }, { x: 50, y: 150 }, { x: 150, y: 150 }], sides: [3, 4, 5], angles: [37, 90, 53] },
        triangle2: { vertices: [{ x: 250, y: 50 }, { x: 250, y: 250 }, { x: 450, y: 250 }], sides: [6, 8, 10], angles: [37, 90, 53] },
        criterion: 'AA',
        scaleFactor: 2,
        showRatios: true,
        title: 'AA Similarity (scale factor 2)',
      },
    }),
  },

  law_of_sines_cosines: {
    type: 'law_of_sines_cosines',
    subject: 'geometry',
    gradeRange: '10-12',
    description: 'Triangle with labeled sides and angles for Law of Sines or Law of Cosines',
    jsonExample: JSON.stringify({
      type: 'law_of_sines_cosines',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        triangle: {
          vertices: [{ x: 150, y: 50 }, { x: 50, y: 250 }, { x: 300, y: 250 }],
          sides: [8, 10, 12],
          angles: [41.4, 55.8, 82.8],
        },
        law: 'cosines',
        solveFor: 'side',
        knownParts: ['a=8', 'b=10', 'C=82.8\u00b0'],
        showFormula: true,
        showSubstitution: true,
        title: 'Law of Cosines: find side c',
      },
    }),
  },

  transformations_composition: {
    type: 'transformations_composition',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Composition of multiple geometric transformations applied in sequence',
    jsonExample: JSON.stringify({
      type: 'transformations_composition',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        originalShape: [{ x: 1, y: 1 }, { x: 3, y: 1 }, { x: 2, y: 3 }],
        transformations: [
          { type: 'reflection', params: { axis: 'y-axis' } },
          { type: 'translation', params: { dx: 2, dy: 3 } },
        ],
        finalShape: [{ x: 1, y: 4 }, { x: -1, y: 4 }, { x: 0, y: 6 }],
        showIntermediate: true,
        showOrder: true,
        title: 'Reflect then translate',
      },
    }),
  },

  orthographic_views_3d: {
    type: 'orthographic_views_3d',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Front, side, and top orthographic views of a 3D solid',
    jsonExample: JSON.stringify({
      type: 'orthographic_views_3d',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        shape: 'l_shape',
        views: {
          front: [[1, 1], [1, 0]],
          side: [[1, 1], [1, 0]],
          top: [[1, 1], [1, 0]],
        },
        show3DModel: true,
        title: 'Orthographic views of L-shape',
      },
    }),
  },

  tangent_radius_perpendicularity: {
    type: 'tangent_radius_perpendicularity',
    subject: 'geometry',
    gradeRange: '9-12',
    description: 'Circle showing that a radius to a tangent point is perpendicular to the tangent line',
    jsonExample: JSON.stringify({
      type: 'tangent_radius_perpendicularity',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        radius: 100,
        tangentPoint: 0,
        showRightAngle: true,
        showTangentLine: true,
        showRadius: true,
        title: 'Tangent \u22a5 Radius',
      },
    }),
  },

  // ============================================================================
  // GEOMETRY: Basic Shapes (for AI generation)
  // ============================================================================

  square: {
    type: 'square',
    subject: 'geometry',
    gradeRange: '3-8',
    description: 'Square with side length, area, perimeter, and optional diagonals',
    jsonExample: JSON.stringify({
      type: 'square',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        side: 6,
        sideLabel: 'a',
        showDiagonals: true,
        diagonalLabel: 'd',
        title: 'Square with Side 6',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  rectangle: {
    type: 'rectangle',
    subject: 'geometry',
    gradeRange: '3-8',
    description: 'Rectangle with width, height, area, perimeter, and optional diagonals',
    jsonExample: JSON.stringify({
      type: 'rectangle',
      visibleStep: 0,
      totalSteps: 5,
      data: {
        width: 8,
        height: 5,
        widthLabel: 'w',
        heightLabel: 'h',
        showDiagonals: true,
        diagonalLabel: 'd',
        title: 'Rectangle 8 x 5',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  parallelogram: {
    type: 'parallelogram',
    subject: 'geometry',
    gradeRange: '6-10',
    description: 'Parallelogram with base, side, height, and angle',
    jsonExample: JSON.stringify({
      type: 'parallelogram',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        base: 10,
        side: 6,
        height: 5,
        baseLabel: 'b',
        sideLabel: 's',
        heightLabel: 'h',
        angle: 60,
        showHeight: true,
        title: 'Parallelogram',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  rhombus: {
    type: 'rhombus',
    subject: 'geometry',
    gradeRange: '6-10',
    description: 'Rhombus with side length and diagonals',
    jsonExample: JSON.stringify({
      type: 'rhombus',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        side: 5,
        diagonal1: 8,
        diagonal2: 6,
        sideLabel: 's',
        d1Label: 'd\u2081',
        d2Label: 'd\u2082',
        showDiagonals: true,
        title: 'Rhombus',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  trapezoid: {
    type: 'trapezoid',
    subject: 'geometry',
    gradeRange: '6-10',
    description: 'Trapezoid with parallel bases and height',
    jsonExample: JSON.stringify({
      type: 'trapezoid',
      visibleStep: 0,
      totalSteps: 4,
      data: {
        topBase: 6,
        bottomBase: 10,
        height: 4,
        topLabel: 'a',
        bottomLabel: 'b',
        heightLabel: 'h',
        showHeight: true,
        isIsosceles: true,
        title: 'Trapezoid',
        showFormulas: true,
        showCalculations: true,
      },
    }),
  },

  // ============================================================================
  // MATH: Utility Tables (for AI generation)
  // ============================================================================

  area_model: {
    type: 'area_model',
    subject: 'math',
    gradeRange: '3-8',
    description: 'Area model for multiplication showing partitioned rectangle',
    jsonExample: JSON.stringify({
      type: 'area_model',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        factor1: 23,
        factor2: 15,
        showPartials: true,
        decomposition1: [20, 3],
        decomposition2: [10, 5],
        title: '23 \u00d7 15 Area Model',
      },
    }),
  },

  math_table: {
    type: 'math_table',
    subject: 'math',
    gradeRange: '3-12',
    description: 'General-purpose data table for math problems',
    jsonExample: JSON.stringify({
      type: 'math_table',
      visibleStep: 0,
      totalSteps: 2,
      data: {
        title: 'Function Values',
        headers: ['x', 'f(x) = 2x + 1'],
        rows: [
          ['-2', '-3'],
          ['-1', '-1'],
          ['0', '1'],
          ['1', '3'],
          ['2', '5'],
        ],
        highlightRow: 2,
      },
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

/**
 * Check if a grade falls within a gradeRange string like "3-8" or "8".
 */
function gradeInRange(grade: number, gradeRange: string): boolean {
  const parts = gradeRange.split('-').map(Number)
  if (parts.length === 1) {
    return grade === parts[0]
  }
  return grade >= parts[0] && grade <= parts[1]
}

/**
 * Generate a context-aware diagram schema prompt filtered by subject and grade.
 * Only includes schemas relevant to the current subject and grade level,
 * significantly reducing token usage compared to getDiagramSchemaPrompt().
 *
 * Falls back to a compact type-name-only summary if no subject is provided.
 */
export function getFilteredDiagramSchemaPrompt(
  subject?: string,
  grade?: number
): string {
  // If no subject context, return compact summary (just type names)
  if (!subject) {
    const typesBySubject: Record<string, string[]> = {}
    for (const schema of Object.values(DIAGRAM_SCHEMAS)) {
      if (!typesBySubject[schema.subject]) {
        typesBySubject[schema.subject] = []
      }
      typesBySubject[schema.subject].push(schema.type)
    }
    return Object.entries(typesBySubject)
      .map(([subj, types]) => `${subj}: ${types.join(', ')}`)
      .join('\n')
  }

  // Filter by subject
  let filtered = Object.values(DIAGRAM_SCHEMAS).filter(
    (s) => s.subject === subject
  )

  // Further filter by grade if provided
  if (grade !== undefined && grade > 0) {
    const gradeFiltered = filtered.filter((s) => gradeInRange(grade, s.gradeRange))
    // Only apply grade filter if it produces results; otherwise keep all for the subject
    if (gradeFiltered.length > 0) {
      filtered = gradeFiltered
    }
  }

  if (filtered.length === 0) return ''

  return filtered
    .map(
      (s) =>
        `### ${s.type}\n${s.description}\nGrades: ${s.gradeRange}\nExample: ${s.jsonExample}`
    )
    .join('\n\n')
}
