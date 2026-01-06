/**
 * Math Methods Library
 *
 * Comprehensive database of solving methods organized by topic.
 * Each method includes:
 * - When to use it
 * - Visual type for representation
 * - Step template for AI to follow
 */

import type { MathVisualType } from '@/types'

export interface MathMethod {
  id: string
  name: string
  nameHebrew: string
  whenToUse: string
  whenToUseHebrew: string
  visualType?: MathVisualType
  priority: number // 1 = always show, 2 = show when applicable, 3 = alternative
  stepTemplate: string[]
}

export interface TopicMethods {
  topicId: string
  topicName: string
  topicNameHebrew: string
  methods: MathMethod[]
}

// =============================================================================
// ALGEBRA METHODS
// =============================================================================

export const LINEAR_EQUATIONS_METHODS: MathMethod[] = [
  {
    id: 'linear_isolation',
    name: 'Isolation Method',
    nameHebrew: 'שיטת הבידוד',
    whenToUse: 'Standard method for any linear equation ax + b = c',
    whenToUseHebrew: 'שיטה סטנדרטית לכל משוואה לינארית ax + b = c',
    visualType: 'number_line',
    priority: 1,
    stepTemplate: [
      'Identify the equation form: ax + b = c',
      'Isolate the variable term: subtract b from both sides',
      'Solve for x: divide both sides by coefficient a',
      'Verify by substitution',
    ],
  },
  {
    id: 'linear_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'Visual verification or when graph is requested',
    whenToUseHebrew: 'אימות ויזואלי או כשנדרש גרף',
    visualType: 'coordinate_plane',
    priority: 3,
    stepTemplate: [
      'Rewrite as y = ax + b',
      'Plot the line',
      'Find x-intercept (where y = 0)',
      'The x-intercept is the solution',
    ],
  },
]

export const QUADRATIC_EQUATIONS_METHODS: MathMethod[] = [
  {
    id: 'quadratic_formula',
    name: 'Quadratic Formula',
    nameHebrew: 'נוסחת השורשים',
    whenToUse: 'Works for ANY quadratic equation - always reliable',
    whenToUseHebrew: 'עובד לכל משוואה ריבועית - תמיד אמין',
    visualType: 'coordinate_plane',
    priority: 1,
    stepTemplate: [
      'Identify coefficients: a, b, c from ax² + bx + c = 0',
      'Write the formula: x = (-b ± √(b²-4ac)) / 2a',
      'Calculate discriminant Δ = b² - 4ac',
      'Substitute values into formula',
      'Calculate both solutions x₁ and x₂',
      'Verify by substitution (optional)',
    ],
  },
  {
    id: 'factoring',
    name: 'Factoring (Sum-Product)',
    nameHebrew: 'פירוק לגורמים (סכום-מכפלה)',
    whenToUse: 'When roots are integers or simple fractions',
    whenToUseHebrew: 'כשהשורשים הם מספרים שלמים או שברים פשוטים',
    visualType: 'table',
    priority: 2,
    stepTemplate: [
      'Identify: need p,q where p+q = b/a and p×q = c/a',
      'List factor pairs of c',
      'Find pair that sums to b',
      'Write factored form: a(x-p)(x-q) = 0',
      'Solve each factor: x = p, x = q',
    ],
  },
  {
    id: 'completing_square',
    name: 'Completing the Square',
    nameHebrew: 'השלמה לריבוע',
    whenToUse: 'When vertex form is needed or for deriving the quadratic formula',
    whenToUseHebrew: 'כשנדרשת צורת קודקוד או להוכחת נוסחת השורשים',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Start with ax² + bx + c = 0',
      'Divide by a: x² + (b/a)x + (c/a) = 0',
      'Move constant: x² + (b/a)x = -c/a',
      'Add (b/2a)² to both sides',
      'Factor left side as perfect square',
      'Take square root of both sides',
      'Solve for x',
    ],
  },
  {
    id: 'quadratic_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For visualization, estimation, or verification',
    whenToUseHebrew: 'להמחשה, הערכה או אימות',
    visualType: 'coordinate_plane',
    priority: 3,
    stepTemplate: [
      'Plot y = ax² + bx + c',
      'Find vertex: x = -b/2a',
      'Find x-intercepts (roots)',
      'Mark solutions on graph',
    ],
  },
]

export const SYSTEMS_OF_EQUATIONS_METHODS: MathMethod[] = [
  {
    id: 'substitution',
    name: 'Substitution Method',
    nameHebrew: 'שיטת ההצבה',
    whenToUse: 'When one variable is easily isolated',
    whenToUseHebrew: 'כשקל לבודד משתנה אחד',
    priority: 1,
    stepTemplate: [
      'Isolate one variable in one equation',
      'Substitute into the other equation',
      'Solve the resulting single-variable equation',
      'Substitute back to find the other variable',
      'Verify in both original equations',
    ],
  },
  {
    id: 'elimination',
    name: 'Elimination Method',
    nameHebrew: 'שיטת החיסור/חיבור',
    whenToUse: 'When coefficients can be easily matched',
    whenToUseHebrew: 'כשאפשר להתאים מקדמים בקלות',
    priority: 1,
    stepTemplate: [
      'Multiply equations to match one coefficient',
      'Add or subtract equations to eliminate one variable',
      'Solve for remaining variable',
      'Substitute back to find eliminated variable',
      'Verify in both equations',
    ],
  },
  {
    id: 'graphical_system',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For visualization or when exact solution not needed',
    whenToUseHebrew: 'להמחשה או כשלא נדרש פתרון מדויק',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Rewrite both equations in slope-intercept form',
      'Plot both lines',
      'Find intersection point',
      'Read coordinates of intersection',
    ],
  },
  {
    id: 'cramers_rule',
    name: "Cramer's Rule (Determinants)",
    nameHebrew: 'כלל קרמר (דטרמיננטות)',
    whenToUse: 'For 2x2 or 3x3 systems, especially in exams',
    whenToUseHebrew: 'למערכות 2x2 או 3x3, במיוחד במבחנים',
    visualType: 'table',
    priority: 2,
    stepTemplate: [
      'Write coefficient matrix and calculate determinant D',
      'Calculate Dx by replacing x-column with constants',
      'Calculate Dy by replacing y-column with constants',
      'x = Dx/D, y = Dy/D',
    ],
  },
]

export const INEQUALITIES_METHODS: MathMethod[] = [
  {
    id: 'inequality_number_line',
    name: 'Number Line Method',
    nameHebrew: 'שיטת ציר המספרים',
    whenToUse: 'For linear inequalities and showing solution sets',
    whenToUseHebrew: 'לאי-שוויונות לינאריים והצגת קבוצת פתרונות',
    visualType: 'number_line',
    priority: 1,
    stepTemplate: [
      'Solve as equation to find boundary point',
      'Test a point in each region',
      'Mark solution region on number line',
      'Use filled circle (≤,≥) or open circle (<,>)',
    ],
  },
  {
    id: 'sign_table',
    name: 'Sign Table Method',
    nameHebrew: 'שיטת טבלת סימנים',
    whenToUse: 'For polynomial and rational inequalities',
    whenToUseHebrew: 'לאי-שוויונות פולינומיים ורציונליים',
    visualType: 'table',
    priority: 1,
    stepTemplate: [
      'Find all zeros and undefined points',
      'Create sign table with intervals',
      'Determine sign in each interval',
      'Select intervals satisfying inequality',
    ],
  },
  {
    id: 'inequality_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For 2-variable inequalities or visual verification',
    whenToUseHebrew: 'לאי-שוויונות דו-משתניים או אימות ויזואלי',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Graph the boundary line/curve',
      'Use dashed line for < or >, solid for ≤ or ≥',
      'Test a point to determine which side to shade',
      'Shade the solution region',
    ],
  },
]

// =============================================================================
// FUNCTIONS METHODS
// =============================================================================

export const FINDING_ROOTS_METHODS: MathMethod[] = [
  {
    id: 'roots_factoring',
    name: 'Factoring',
    nameHebrew: 'פירוק לגורמים',
    whenToUse: 'When polynomial can be factored',
    whenToUseHebrew: 'כשאפשר לפרק את הפולינום',
    priority: 1,
    stepTemplate: [
      'Factor the polynomial completely',
      'Set each factor equal to zero',
      'Solve each equation',
      'List all roots',
    ],
  },
  {
    id: 'synthetic_division',
    name: 'Synthetic Division',
    nameHebrew: 'חילוק סינתטי',
    whenToUse: 'For higher degree polynomials with known root',
    whenToUseHebrew: 'לפולינומים ממעלה גבוהה עם שורש ידוע',
    visualType: 'table',
    priority: 2,
    stepTemplate: [
      'Use Rational Root Theorem to find candidate roots',
      'Test candidates using synthetic division',
      'When remainder is 0, root is found',
      'Continue with reduced polynomial',
    ],
  },
  {
    id: 'roots_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For estimation or when exact roots are irrational',
    whenToUseHebrew: 'להערכה או כשהשורשים אי-רציונליים',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Plot the function',
      'Identify x-intercepts',
      'Zoom in for better precision',
      'Note approximate values',
    ],
  },
]

export const DOMAIN_RANGE_METHODS: MathMethod[] = [
  {
    id: 'domain_algebraic',
    name: 'Algebraic Method',
    nameHebrew: 'שיטה אלגברית',
    whenToUse: 'Standard approach for any function',
    whenToUseHebrew: 'גישה סטנדרטית לכל פונקציה',
    priority: 1,
    stepTemplate: [
      'Identify restrictions: denominators ≠ 0',
      'Identify restrictions: even roots ≥ 0',
      'Identify restrictions: logarithm arguments > 0',
      'Express domain in interval notation',
    ],
  },
  {
    id: 'domain_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For visualization and complex functions',
    whenToUseHebrew: 'להמחשה ולפונקציות מורכבות',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Plot the function',
      'Domain: project graph onto x-axis',
      'Range: project graph onto y-axis',
      'Note any gaps or asymptotes',
    ],
  },
]

// =============================================================================
// CALCULUS METHODS
// =============================================================================

export const DERIVATIVE_METHODS: MathMethod[] = [
  {
    id: 'power_rule',
    name: 'Power Rule',
    nameHebrew: 'כלל החזקה',
    whenToUse: 'For terms of the form xⁿ',
    whenToUseHebrew: 'לביטויים מהצורה xⁿ',
    priority: 1,
    stepTemplate: [
      'Identify power n in xⁿ',
      'Apply rule: d/dx(xⁿ) = n·xⁿ⁻¹',
      'Simplify result',
    ],
  },
  {
    id: 'chain_rule',
    name: 'Chain Rule',
    nameHebrew: 'כלל השרשרת',
    whenToUse: 'For composite functions f(g(x))',
    whenToUseHebrew: 'לפונקציות מורכבות f(g(x))',
    priority: 1,
    stepTemplate: [
      'Identify outer function f and inner function g',
      'Find f\'(g(x)) - derivative of outer',
      'Find g\'(x) - derivative of inner',
      'Multiply: f\'(g(x)) · g\'(x)',
    ],
  },
  {
    id: 'product_rule',
    name: 'Product Rule',
    nameHebrew: 'כלל המכפלה',
    whenToUse: 'For products f(x)·g(x)',
    whenToUseHebrew: 'למכפלות f(x)·g(x)',
    priority: 1,
    stepTemplate: [
      'Identify f and g',
      'Find f\' and g\'',
      'Apply: (fg)\' = f\'g + fg\'',
      'Simplify',
    ],
  },
  {
    id: 'quotient_rule',
    name: 'Quotient Rule',
    nameHebrew: 'כלל המנה',
    whenToUse: 'For quotients f(x)/g(x)',
    whenToUseHebrew: 'למנות f(x)/g(x)',
    priority: 1,
    stepTemplate: [
      'Identify f (numerator) and g (denominator)',
      'Find f\' and g\'',
      'Apply: (f/g)\' = (f\'g - fg\') / g²',
      'Simplify',
    ],
  },
  {
    id: 'derivative_table',
    name: 'Standard Derivatives Table',
    nameHebrew: 'טבלת נגזרות סטנדרטיות',
    whenToUse: 'For common functions (sin, cos, eˣ, ln, etc.)',
    whenToUseHebrew: 'לפונקציות נפוצות (sin, cos, eˣ, ln, וכו\')',
    visualType: 'table',
    priority: 1,
    stepTemplate: [
      'Identify standard function form',
      'Look up derivative in table',
      'Apply chain rule if needed',
    ],
  },
]

export const LIMITS_METHODS: MathMethod[] = [
  {
    id: 'direct_substitution',
    name: 'Direct Substitution',
    nameHebrew: 'הצבה ישירה',
    whenToUse: 'When function is continuous at the point',
    whenToUseHebrew: 'כשהפונקציה רציפה בנקודה',
    priority: 1,
    stepTemplate: [
      'Substitute the limit value directly',
      'If result is defined, that\'s the limit',
      'If 0/0 or ∞/∞, use other methods',
    ],
  },
  {
    id: 'factoring_limits',
    name: 'Factoring and Canceling',
    nameHebrew: 'פירוק וצמצום',
    whenToUse: 'When direct substitution gives 0/0',
    whenToUseHebrew: 'כשהצבה ישירה נותנת 0/0',
    priority: 1,
    stepTemplate: [
      'Factor numerator and denominator',
      'Cancel common factors',
      'Substitute again',
    ],
  },
  {
    id: 'lhopital',
    name: "L'Hôpital's Rule",
    nameHebrew: 'כלל לופיטל',
    whenToUse: 'When limit is 0/0 or ∞/∞ form',
    whenToUseHebrew: 'כשהגבול מהצורה 0/0 או ∞/∞',
    priority: 2,
    stepTemplate: [
      'Verify indeterminate form (0/0 or ∞/∞)',
      'Differentiate numerator and denominator separately',
      'Evaluate the new limit',
      'Repeat if still indeterminate',
    ],
  },
  {
    id: 'squeeze_theorem',
    name: 'Squeeze Theorem',
    nameHebrew: 'משפט הסנדוויץ\'',
    whenToUse: 'When function is bounded by two converging functions',
    whenToUseHebrew: 'כשהפונקציה חסומה בין שתי פונקציות מתכנסות',
    visualType: 'coordinate_plane',
    priority: 3,
    stepTemplate: [
      'Find lower bound g(x) ≤ f(x)',
      'Find upper bound f(x) ≤ h(x)',
      'Show lim g(x) = lim h(x) = L',
      'Conclude lim f(x) = L',
    ],
  },
]

export const INTEGRAL_METHODS: MathMethod[] = [
  {
    id: 'integral_power_rule',
    name: 'Power Rule',
    nameHebrew: 'כלל החזקה',
    whenToUse: 'For terms of the form xⁿ',
    whenToUseHebrew: 'לביטויים מהצורה xⁿ',
    priority: 1,
    stepTemplate: [
      'Identify power n',
      'Apply: ∫xⁿdx = xⁿ⁺¹/(n+1) + C',
      'Note: n ≠ -1',
    ],
  },
  {
    id: 'u_substitution',
    name: 'u-Substitution',
    nameHebrew: 'הצבה (שיטת u)',
    whenToUse: 'When integrand contains function and its derivative',
    whenToUseHebrew: 'כשהאינטגרנד מכיל פונקציה ונגזרתה',
    priority: 1,
    stepTemplate: [
      'Choose u = inner function',
      'Find du = u\'dx',
      'Rewrite integral in terms of u',
      'Integrate',
      'Substitute back for x',
    ],
  },
  {
    id: 'integration_by_parts',
    name: 'Integration by Parts',
    nameHebrew: 'אינטגרציה בחלקים',
    whenToUse: 'For products of different function types (LIATE)',
    whenToUseHebrew: 'למכפלות של סוגי פונקציות שונים (LIATE)',
    priority: 2,
    stepTemplate: [
      'Use LIATE to choose u: Logs, Inverse trig, Algebraic, Trig, Exponential',
      'Set dv = remaining part',
      'Find du and v',
      'Apply: ∫udv = uv - ∫vdu',
    ],
  },
  {
    id: 'partial_fractions',
    name: 'Partial Fractions',
    nameHebrew: 'שברים חלקיים',
    whenToUse: 'For rational functions with factorable denominator',
    whenToUseHebrew: 'לפונקציות רציונליות עם מכנה שניתן לפירוק',
    visualType: 'table',
    priority: 2,
    stepTemplate: [
      'Factor denominator completely',
      'Write partial fraction decomposition',
      'Solve for coefficients',
      'Integrate each fraction separately',
    ],
  },
]

// =============================================================================
// GEOMETRY METHODS
// =============================================================================

export const TRIANGLE_METHODS: MathMethod[] = [
  {
    id: 'law_of_sines',
    name: 'Law of Sines',
    nameHebrew: 'משפט הסינוסים',
    whenToUse: 'When you have AAS, ASA, or SSA (ambiguous)',
    whenToUseHebrew: 'כשיש AAS, ASA, או SSA (מקרה דו-משמעי)',
    visualType: 'triangle',
    priority: 1,
    stepTemplate: [
      'Write: a/sinA = b/sinB = c/sinC',
      'Identify known angle-side pair',
      'Set up proportion with unknown',
      'Solve for unknown',
      'Check for ambiguous case in SSA',
    ],
  },
  {
    id: 'law_of_cosines',
    name: 'Law of Cosines',
    nameHebrew: 'משפט הקוסינוסים',
    whenToUse: 'When you have SSS or SAS',
    whenToUseHebrew: 'כשיש SSS או SAS',
    visualType: 'triangle',
    priority: 1,
    stepTemplate: [
      'For finding side: c² = a² + b² - 2ab·cosC',
      'For finding angle: cosC = (a² + b² - c²) / 2ab',
      'Substitute known values',
      'Solve for unknown',
    ],
  },
  {
    id: 'area_base_height',
    name: 'Area: Base × Height',
    nameHebrew: 'שטח: בסיס × גובה',
    whenToUse: 'When base and height are known',
    whenToUseHebrew: 'כשהבסיס והגובה ידועים',
    visualType: 'triangle',
    priority: 1,
    stepTemplate: [
      'Identify base b',
      'Identify height h (perpendicular to base)',
      'Apply: Area = ½ × b × h',
    ],
  },
  {
    id: 'area_sas',
    name: 'Area: SAS Formula',
    nameHebrew: 'שטח: נוסחת צלע-זווית-צלע',
    whenToUse: 'When two sides and included angle are known',
    whenToUseHebrew: 'כששתי צלעות והזווית ביניהן ידועות',
    visualType: 'triangle',
    priority: 2,
    stepTemplate: [
      'Identify sides a and b',
      'Identify included angle C',
      'Apply: Area = ½ × a × b × sinC',
    ],
  },
  {
    id: 'herons_formula',
    name: "Heron's Formula",
    nameHebrew: 'נוסחת הרון',
    whenToUse: 'When all three sides are known (SSS)',
    whenToUseHebrew: 'כששלוש הצלעות ידועות (SSS)',
    visualType: 'triangle',
    priority: 2,
    stepTemplate: [
      'Calculate semi-perimeter: s = (a + b + c) / 2',
      'Apply: Area = √[s(s-a)(s-b)(s-c)]',
    ],
  },
  {
    id: 'coordinate_geometry',
    name: 'Coordinate Method',
    nameHebrew: 'שיטת קואורדינטות',
    whenToUse: 'When vertices are given as coordinates',
    whenToUseHebrew: 'כשקודקודי המשולש נתונים כקואורדינטות',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Use distance formula for sides',
      'Use shoelace formula for area',
      'Area = ½|x₁(y₂-y₃) + x₂(y₃-y₁) + x₃(y₁-y₂)|',
    ],
  },
]

export const CIRCLE_METHODS: MathMethod[] = [
  {
    id: 'central_angle',
    name: 'Central Angle Theorem',
    nameHebrew: 'משפט הזווית המרכזית',
    whenToUse: 'Relationship between central and inscribed angles',
    whenToUseHebrew: 'קשר בין זווית מרכזית לזווית היקפית',
    visualType: 'circle',
    priority: 1,
    stepTemplate: [
      'Central angle = 2 × inscribed angle (same arc)',
      'Inscribed angle = ½ × central angle',
    ],
  },
  {
    id: 'tangent_properties',
    name: 'Tangent Properties',
    nameHebrew: 'תכונות המשיק',
    whenToUse: 'Problems involving tangent lines to circles',
    whenToUseHebrew: 'בעיות הכוללות משיקים למעגל',
    visualType: 'circle',
    priority: 1,
    stepTemplate: [
      'Tangent ⊥ radius at point of tangency',
      'Two tangents from external point are equal',
      'Use Pythagorean theorem with radius',
    ],
  },
  {
    id: 'arc_length',
    name: 'Arc Length and Sector Area',
    nameHebrew: 'אורך קשת ושטח גזרה',
    whenToUse: 'Finding arc length or sector area',
    whenToUseHebrew: 'מציאת אורך קשת או שטח גזרה',
    visualType: 'circle',
    priority: 1,
    stepTemplate: [
      'Arc length: L = (θ/360°) × 2πr or L = θr (radians)',
      'Sector area: A = (θ/360°) × πr² or A = ½r²θ (radians)',
    ],
  },
]

// =============================================================================
// TRIGONOMETRY METHODS
// =============================================================================

export const TRIG_EQUATIONS_METHODS: MathMethod[] = [
  {
    id: 'unit_circle_method',
    name: 'Unit Circle Method',
    nameHebrew: 'שיטת מעגל היחידה',
    whenToUse: 'For standard angle values',
    whenToUseHebrew: 'לערכי זוויות סטנדרטיות',
    visualType: 'unit_circle',
    priority: 1,
    stepTemplate: [
      'Isolate trig function: sin(x) = k',
      'Find reference angle using unit circle',
      'Determine all angles in [0, 2π) with same value',
      'Add general solution: + 2πn',
    ],
  },
  {
    id: 'cast_rule',
    name: 'CAST Rule (ASTC)',
    nameHebrew: 'כלל CAST (כל סיני תן קוסי)',
    whenToUse: 'To find all solutions by quadrant',
    whenToUseHebrew: 'למציאת כל הפתרונות לפי רביע',
    visualType: 'unit_circle',
    priority: 1,
    stepTemplate: [
      'Find reference angle α',
      'Use CAST: All(Q1), Sin(Q2), Tan(Q3), Cos(Q4)',
      'Determine which quadrants give correct sign',
      'Write solutions for each valid quadrant',
    ],
  },
  {
    id: 'inverse_trig',
    name: 'Inverse Trig Functions',
    nameHebrew: 'פונקציות טריגונומטריות הפוכות',
    whenToUse: 'When using calculator or for principal value',
    whenToUseHebrew: 'בשימוש במחשבון או לערך ראשי',
    priority: 2,
    stepTemplate: [
      'Use inverse function: x = arcsin(k)',
      'Note the principal value range',
      'Find all solutions using symmetry',
    ],
  },
  {
    id: 'trig_graphical',
    name: 'Graphical Method',
    nameHebrew: 'שיטה גרפית',
    whenToUse: 'For visualization and multiple solutions',
    whenToUseHebrew: 'להמחשה ולפתרונות מרובים',
    visualType: 'coordinate_plane',
    priority: 2,
    stepTemplate: [
      'Plot y = trig function',
      'Plot y = constant value',
      'Find intersection points',
      'Note periodic nature',
    ],
  },
]

export const TRIG_IDENTITIES_METHODS: MathMethod[] = [
  {
    id: 'pythagorean_identities',
    name: 'Pythagorean Identities',
    nameHebrew: 'זהויות פיתגוריות',
    whenToUse: 'To convert between sin² and cos²',
    whenToUseHebrew: 'להמרה בין sin² ל-cos²',
    visualType: 'unit_circle',
    priority: 1,
    stepTemplate: [
      'sin²θ + cos²θ = 1',
      'tan²θ + 1 = sec²θ',
      '1 + cot²θ = csc²θ',
    ],
  },
  {
    id: 'double_angle',
    name: 'Double Angle Formulas',
    nameHebrew: 'נוסחאות זווית כפולה',
    whenToUse: 'When dealing with 2θ',
    whenToUseHebrew: 'כשעובדים עם 2θ',
    visualType: 'table',
    priority: 1,
    stepTemplate: [
      'sin(2θ) = 2sinθcosθ',
      'cos(2θ) = cos²θ - sin²θ = 2cos²θ - 1 = 1 - 2sin²θ',
      'tan(2θ) = 2tanθ / (1 - tan²θ)',
    ],
  },
  {
    id: 'sum_difference',
    name: 'Sum/Difference Formulas',
    nameHebrew: 'נוסחאות סכום/הפרש',
    whenToUse: 'For sin(A±B), cos(A±B), tan(A±B)',
    whenToUseHebrew: 'עבור sin(A±B), cos(A±B), tan(A±B)',
    visualType: 'table',
    priority: 2,
    stepTemplate: [
      'sin(A±B) = sinAcosB ± cosAsinB',
      'cos(A±B) = cosAcosB ∓ sinAsinB',
      'tan(A±B) = (tanA ± tanB) / (1 ∓ tanAtanB)',
    ],
  },
]

// =============================================================================
// PROBABILITY & STATISTICS METHODS
// =============================================================================

export const COUNTING_METHODS: MathMethod[] = [
  {
    id: 'tree_diagram_counting',
    name: 'Tree Diagram',
    nameHebrew: 'דיאגרמת עץ',
    whenToUse: 'For sequential events with limited outcomes',
    whenToUseHebrew: 'לאירועים רצופים עם תוצאות מוגבלות',
    visualType: 'tree_diagram',
    priority: 1,
    stepTemplate: [
      'Draw first branch for first event',
      'Add branches for each subsequent event',
      'Count total paths (multiply branch counts)',
    ],
  },
  {
    id: 'permutations',
    name: 'Permutations',
    nameHebrew: 'תמורות',
    whenToUse: 'When ORDER MATTERS',
    whenToUseHebrew: 'כשהסדר חשוב',
    priority: 1,
    stepTemplate: [
      'Identify n (total items) and r (items to arrange)',
      'Apply: P(n,r) = n! / (n-r)!',
      'For all items: P(n,n) = n!',
    ],
  },
  {
    id: 'combinations',
    name: 'Combinations',
    nameHebrew: 'צירופים',
    whenToUse: 'When ORDER DOES NOT MATTER',
    whenToUseHebrew: 'כשהסדר לא חשוב',
    priority: 1,
    stepTemplate: [
      'Identify n (total items) and r (items to choose)',
      'Apply: C(n,r) = n! / [r!(n-r)!]',
      'Think: "How many ways to choose?"',
    ],
  },
]

export const PROBABILITY_METHODS: MathMethod[] = [
  {
    id: 'venn_diagram',
    name: 'Venn Diagram Method',
    nameHebrew: 'שיטת דיאגרמת ון',
    whenToUse: 'For union, intersection, complement problems',
    whenToUseHebrew: 'לבעיות איחוד, חיתוך, משלים',
    visualType: 'tree_diagram', // Will render as venn in future
    priority: 1,
    stepTemplate: [
      'Draw circles for each event',
      'Fill in intersection first',
      'Fill remaining regions',
      'Use: P(A∪B) = P(A) + P(B) - P(A∩B)',
    ],
  },
  {
    id: 'tree_diagram_prob',
    name: 'Probability Tree',
    nameHebrew: 'עץ הסתברות',
    whenToUse: 'For conditional probability and sequential events',
    whenToUseHebrew: 'להסתברות מותנית ואירועים רצופים',
    visualType: 'tree_diagram',
    priority: 1,
    stepTemplate: [
      'Draw branches with probabilities',
      'Multiply along paths for AND',
      'Add final probabilities for OR',
    ],
  },
  {
    id: 'probability_table',
    name: 'Two-Way Table',
    nameHebrew: 'טבלה דו-כיוונית',
    whenToUse: 'For joint and conditional probabilities',
    whenToUseHebrew: 'להסתברויות משותפות ומותנות',
    visualType: 'table',
    priority: 1,
    stepTemplate: [
      'Create table with row and column events',
      'Fill in joint probabilities',
      'Calculate marginal probabilities (row/column totals)',
      'Conditional: P(A|B) = P(A∩B) / P(B)',
    ],
  },
]

// =============================================================================
// METHODS INDEX BY TOPIC
// =============================================================================

export const ALL_MATH_METHODS: Record<string, TopicMethods> = {
  // Algebra
  linear_equations: {
    topicId: 'linear_equations',
    topicName: 'Linear Equations',
    topicNameHebrew: 'משוואות לינאריות',
    methods: LINEAR_EQUATIONS_METHODS,
  },
  quadratic_equations: {
    topicId: 'quadratic_equations',
    topicName: 'Quadratic Equations',
    topicNameHebrew: 'משוואות ריבועיות',
    methods: QUADRATIC_EQUATIONS_METHODS,
  },
  systems_of_equations: {
    topicId: 'systems_of_equations',
    topicName: 'Systems of Equations',
    topicNameHebrew: 'מערכות משוואות',
    methods: SYSTEMS_OF_EQUATIONS_METHODS,
  },
  inequalities: {
    topicId: 'inequalities',
    topicName: 'Inequalities',
    topicNameHebrew: 'אי-שוויונות',
    methods: INEQUALITIES_METHODS,
  },

  // Functions
  finding_roots: {
    topicId: 'finding_roots',
    topicName: 'Finding Roots',
    topicNameHebrew: 'מציאת שורשים',
    methods: FINDING_ROOTS_METHODS,
  },
  domain_range: {
    topicId: 'domain_range',
    topicName: 'Domain and Range',
    topicNameHebrew: 'תחום וטווח',
    methods: DOMAIN_RANGE_METHODS,
  },

  // Calculus
  derivatives: {
    topicId: 'derivatives',
    topicName: 'Derivatives',
    topicNameHebrew: 'נגזרות',
    methods: DERIVATIVE_METHODS,
  },
  limits: {
    topicId: 'limits',
    topicName: 'Limits',
    topicNameHebrew: 'גבולות',
    methods: LIMITS_METHODS,
  },
  integrals: {
    topicId: 'integrals',
    topicName: 'Integrals',
    topicNameHebrew: 'אינטגרלים',
    methods: INTEGRAL_METHODS,
  },

  // Geometry
  triangles: {
    topicId: 'triangles',
    topicName: 'Triangles',
    topicNameHebrew: 'משולשים',
    methods: TRIANGLE_METHODS,
  },
  circles: {
    topicId: 'circles',
    topicName: 'Circles',
    topicNameHebrew: 'מעגלים',
    methods: CIRCLE_METHODS,
  },

  // Trigonometry
  trig_equations: {
    topicId: 'trig_equations',
    topicName: 'Trigonometric Equations',
    topicNameHebrew: 'משוואות טריגונומטריות',
    methods: TRIG_EQUATIONS_METHODS,
  },
  trig_identities: {
    topicId: 'trig_identities',
    topicName: 'Trigonometric Identities',
    topicNameHebrew: 'זהויות טריגונומטריות',
    methods: TRIG_IDENTITIES_METHODS,
  },

  // Probability & Statistics
  counting: {
    topicId: 'counting',
    topicName: 'Counting Principles',
    topicNameHebrew: 'עקרונות ספירה',
    methods: COUNTING_METHODS,
  },
  probability: {
    topicId: 'probability',
    topicName: 'Probability',
    topicNameHebrew: 'הסתברות',
    methods: PROBABILITY_METHODS,
  },
}

/**
 * Get methods for a specific topic
 */
export function getMethodsForTopic(topicId: string): MathMethod[] {
  return ALL_MATH_METHODS[topicId]?.methods ?? []
}

/**
 * Get primary methods (priority 1) for a topic
 */
export function getPrimaryMethods(topicId: string): MathMethod[] {
  return getMethodsForTopic(topicId).filter((m) => m.priority === 1)
}

/**
 * Detect topic from problem text
 */
export function detectMathTopic(problemText: string): string | null {
  const lowerText = problemText.toLowerCase()

  // Quadratic detection
  if (
    lowerText.includes('x²') ||
    lowerText.includes('x^2') ||
    lowerText.includes('quadratic') ||
    lowerText.includes('ריבועית')
  ) {
    return 'quadratic_equations'
  }

  // Linear detection
  if (
    (lowerText.includes('x') || lowerText.includes('=')) &&
    !lowerText.includes('²') &&
    !lowerText.includes('^')
  ) {
    if (lowerText.includes('system') || lowerText.includes('מערכת')) {
      return 'systems_of_equations'
    }
    return 'linear_equations'
  }

  // Inequality detection
  if (
    lowerText.includes('<') ||
    lowerText.includes('>') ||
    lowerText.includes('≤') ||
    lowerText.includes('≥') ||
    lowerText.includes('inequality') ||
    lowerText.includes('אי-שוויון')
  ) {
    return 'inequalities'
  }

  // Calculus detection
  if (
    lowerText.includes('derivative') ||
    lowerText.includes('נגזרת') ||
    lowerText.includes("f'(x)") ||
    lowerText.includes('d/dx')
  ) {
    return 'derivatives'
  }
  if (
    lowerText.includes('limit') ||
    lowerText.includes('גבול') ||
    lowerText.includes('lim')
  ) {
    return 'limits'
  }
  if (
    lowerText.includes('integral') ||
    lowerText.includes('אינטגרל') ||
    lowerText.includes('∫')
  ) {
    return 'integrals'
  }

  // Geometry detection
  if (
    lowerText.includes('triangle') ||
    lowerText.includes('משולש') ||
    lowerText.includes('angle') ||
    lowerText.includes('זווית')
  ) {
    return 'triangles'
  }
  if (
    lowerText.includes('circle') ||
    lowerText.includes('מעגל') ||
    lowerText.includes('radius') ||
    lowerText.includes('רדיוס')
  ) {
    return 'circles'
  }

  // Trigonometry detection
  if (
    lowerText.includes('sin') ||
    lowerText.includes('cos') ||
    lowerText.includes('tan') ||
    lowerText.includes('trig')
  ) {
    if (lowerText.includes('identity') || lowerText.includes('זהות')) {
      return 'trig_identities'
    }
    return 'trig_equations'
  }

  // Probability detection
  if (
    lowerText.includes('probability') ||
    lowerText.includes('הסתברות') ||
    lowerText.includes('likely')
  ) {
    return 'probability'
  }
  if (
    lowerText.includes('permutation') ||
    lowerText.includes('combination') ||
    lowerText.includes('תמורה') ||
    lowerText.includes('צירוף')
  ) {
    return 'counting'
  }

  return null
}

/**
 * Get AI prompt instructions for math methods
 */
export function getMathMethodsPromptInstructions(topicId: string, language: 'en' | 'he' = 'en'): string {
  const topic = ALL_MATH_METHODS[topicId]
  if (!topic) return ''

  const methods = topic.methods
  const isHebrew = language === 'he'

  let instructions = `\n## ${isHebrew ? topic.topicNameHebrew : topic.topicName}\n\n`
  instructions += isHebrew
    ? 'פתור באמצעות השיטות הבאות (מהראשית לחלופית):\n\n'
    : 'Solve using the following methods (from primary to alternative):\n\n'

  methods.forEach((method, index) => {
    const name = isHebrew ? method.nameHebrew : method.name
    const whenToUse = isHebrew ? method.whenToUseHebrew : method.whenToUse

    instructions += `### ${isHebrew ? 'שיטה' : 'METHOD'} ${index + 1}: ${name}\n`
    instructions += `${isHebrew ? 'מתי להשתמש' : 'When to use'}: ${whenToUse}\n`

    if (method.visualType) {
      instructions += `${isHebrew ? 'סוג ויזואלי' : 'Visual type'}: ${method.visualType}\n`
    }

    instructions += `${isHebrew ? 'שלבים' : 'Steps'}:\n`
    method.stepTemplate.forEach((step, stepIndex) => {
      instructions += `${stepIndex + 1}. ${step}\n`
    })
    instructions += '\n'
  })

  return instructions
}
