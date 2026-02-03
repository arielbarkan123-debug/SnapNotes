# NoteSnap Visual Learning System - Master Plan

## Executive Summary

After deep analysis of the codebase, competitor platforms (Desmos, PhET, Khan Academy, Brilliant, 3Blue1Brown), and educational research, this document outlines the comprehensive strategy to make NoteSnap the **best visual learning platform in the world**.

**Core Insight**: The difference between "showing a diagram" and "visual learning" is the difference between a static picture and an interactive understanding experience. We need to transform NoteSnap from diagram generation to **intelligent visual teaching**.

---

## Part 1: The Vision - Perfect Visual Learning

### What Students Actually Need

When a student uploads a physics problem about an inclined plane, they don't just need a picture. They need:

1. **Immediate Context** - See the scenario clearly before any math
2. **Progressive Understanding** - One concept at a time, building knowledge
3. **Visual-Math Connection** - See how each visual element maps to equations
4. **Interactive Exploration** - "What if the angle was steeper?"
5. **Error Recognition** - Visual feedback when they make mistakes

### The Gold Standard Experience

**User uploads**: "A 5kg block sits on a 30° inclined plane with μ = 0.2. Find acceleration."

**Perfect Response**:

```
STEP 0: THE SCENARIO (0.5s)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Given:                    [Large, clear diagram]   │
│  • m = 5 kg                                         │
│  • θ = 30°                      ╱╲                  │
│  • μ = 0.2                    ╱    ╲  [Block]       │
│                             ╱________╲              │
│  Find: a = ?                    θ                   │
│                                                     │
└─────────────────────────────────────────────────────┘
"Let's understand this problem. We have a block on a slope."
[Next Step →]
```

```
STEP 1: IDENTIFY FORCES (animate each force appearing)
┌─────────────────────────────────────────────────────┐
│                                                     │
│                        N ↑                          │
│                          │                          │
│                    ╱─────┼─────╲                    │
│                  ╱   [Block]    ╲                   │
│                ╱        │         ╲                 │
│              ╱──────────┼──────────╲                │
│                    W ↓                              │
│                                                     │
│  ✓ Weight (W = mg) pointing DOWN                    │
│  ✓ Normal force (N) perpendicular to surface       │
│                                                     │
└─────────────────────────────────────────────────────┘
"First, identify all forces. Weight always points down (toward Earth's center)."
```

```
STEP 2: ADD FRICTION
┌─────────────────────────────────────────────────────┐
│                                                     │
│                        N ↑                          │
│               f ←──────┼                            │
│                    ╱───┼─────╲                      │
│                  ╱ [Block]    ╲                     │
│                ╱       │        ╲                   │
│              ╱─────────┼─────────╲                  │
│                   W ↓                               │
│                                                     │
│  ✓ Friction (f = μN) opposes motion (up the slope) │
│                                                     │
└─────────────────────────────────────────────────────┘
"Friction always opposes motion. If the block tends to slide down, friction points up."
```

```
STEP 3: DECOMPOSE WEIGHT (animation shows decomposition)
┌─────────────────────────────────────────────────────┐
│                                                     │
│                        N ↑                          │
│               f ←──────┼────→ W∥                    │
│                    ╱───┼─────╲                      │
│                  ╱ [Block]    ╲                     │
│                ╱       │╲       ╲                   │
│              ╱─────────┼──╲──────╲                  │
│                   W⊥ ↓   ╲→ W                       │
│                                                     │
│  W∥ = mg·sin(θ) = 5 × 9.8 × sin(30°) = 24.5 N     │
│  W⊥ = mg·cos(θ) = 5 × 9.8 × cos(30°) = 42.4 N     │
│                                                     │
└─────────────────────────────────────────────────────┘
"We decompose weight into components parallel and perpendicular to the slope."
```

```
STEP 4: APPLY NEWTON'S SECOND LAW
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Perpendicular: N = W⊥ = 42.4 N (balanced)         │
│                                                     │
│  Parallel: ΣF = ma                                  │
│           W∥ - f = ma                               │
│           24.5 - μN = 5a                            │
│           24.5 - (0.2 × 42.4) = 5a                  │
│           24.5 - 8.5 = 5a                           │
│           16 = 5a                                   │
│                                                     │
│           ╔═══════════════════╗                     │
│           ║  a = 3.2 m/s²  ↓  ║                     │
│           ╚═══════════════════╝                     │
│                                                     │
│  The block accelerates DOWN the slope.             │
│                                                     │
└─────────────────────────────────────────────────────┘
```

```
INTERACTIVE MODE (optional)
┌─────────────────────────────────────────────────────┐
│                                                     │
│  Angle θ:    [====●==========] 30°                  │
│  Mass m:     [========●======] 5 kg                 │
│  Friction μ: [==●============] 0.2                  │
│                                                     │
│  Result: a = 3.2 m/s² (sliding down)               │
│                                                     │
│  Try: Set μ = 0.58 to see when block stops sliding │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Part 2: Current System Analysis

### What We Have (35+ Diagram Components)

| Category | Components | Quality |
|----------|------------|---------|
| Physics | FBD, InclinedPlane, Projectile, Pulley, Circular, Collision | Medium |
| Math | LongDivision, CoordinatePlane, NumberLine, Triangle, Fractions | Good |
| Chemistry | Atom, Molecule | Basic |
| Biology | Cell, DNA | Basic |

### Critical Weaknesses

#### 1. **Data Extraction is Primitive**
```typescript
// CURRENT: Regex-based, brittle
const mass = text.match(/(\d+(?:\.\d+)?)\s*kg/)?.[1]  // Misses "mass of five kilograms"

// NEEDED: Semantic understanding
{
  mass: { value: 5, unit: "kg", confidence: 0.95 },
  angle: { value: 30, unit: "degrees", confidence: 0.98 },
  friction: { value: 0.2, unit: "dimensionless", confidence: 0.90 }
}
```

#### 2. **No Visual-Step Synchronization**
- Tutor says "Now add friction" but diagram doesn't highlight friction
- Steps are numbered but not linked to visual state
- No animation between steps

#### 3. **Force Vectors Overlap**
- All forces originate from object center
- Labels collide with arrows
- No collision detection or smart positioning

#### 4. **No Interactive Exploration**
- All diagrams are static images
- Students can't adjust parameters
- No "what if" mode

#### 5. **AI Doesn't Output Structured Diagram Data**
- AI writes text descriptions
- Diagram generator guesses from keywords
- Often mismatches between AI explanation and generated diagram

---

## Part 3: The Solution Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INPUT                                │
│    (Photo upload, text question, voice input)                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTELLIGENT ANALYSIS                           │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐              │
│  │ OCR/Vision  │  │  Question   │  │  Context    │              │
│  │  Pipeline   │→ │  Classifier │→ │  Extractor  │              │
│  └─────────────┘  └─────────────┘  └─────────────┘              │
│                                          │                       │
│                    ┌─────────────────────┴──────────────────┐   │
│                    │     STRUCTURED PROBLEM DATA            │   │
│                    │  {type, parameters, constraints, goal} │   │
│                    └─────────────────────┬──────────────────┘   │
└──────────────────────────────────────────│──────────────────────┘
                                           │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AI TUTORING ENGINE                            │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              CLAUDE API (with structured output)         │    │
│  │                                                          │    │
│  │  Input: Structured problem data + Visual schema          │    │
│  │  Output: {                                               │    │
│  │    explanation: "...",                                   │    │
│  │    diagram: { type, data, steps[] },                     │    │
│  │    steps: [{ text, visualState, formula }]               │    │
│  │  }                                                       │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VALIDATION LAYER                               │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Schema     │  │   Physics    │  │    Auto      │          │
│  │  Validator   │→ │  Consistency │→ │  Corrector   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                                                                  │
│  • Checks all required fields exist                             │
│  • Validates force angles are physically correct                │
│  • Auto-fixes common errors (e.g., wrong sign on angle)         │
│  • Returns confidence score                                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   VISUAL RENDERING ENGINE                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Layout     │  │  Collision   │  │  Animation   │          │
│  │   Engine     │→ │  Detection   │→ │  Sequencer   │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
│                           │                                      │
│                           ▼                                      │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              DIAGRAM COMPONENT LIBRARY                   │    │
│  │  Physics | Math | Chemistry | Biology | Generic          │    │
│  └─────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                   INTERACTIVE LAYER                              │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Parameter   │  │  "What If"   │  │    Step      │          │
│  │   Sliders    │  │    Mode      │  │  Navigation  │          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└─────────────────────────────────────────────────────────────────┘
```

---

## Part 4: Detailed Technical Specifications

### 4.1 Structured Problem Data Schema

```typescript
interface ProblemAnalysis {
  // Classification
  subject: 'physics' | 'math' | 'chemistry' | 'biology';
  topic: string;  // e.g., "inclined_plane", "quadratic", "stoichiometry"
  difficulty: 'elementary' | 'middle' | 'high' | 'advanced';

  // Extracted Parameters (with confidence)
  parameters: {
    [key: string]: {
      value: number | string;
      unit?: string;
      confidence: number;  // 0.0 - 1.0
      source: 'extracted' | 'inferred' | 'default';
    }
  };

  // What the problem is asking
  goal: {
    find: string[];      // ["acceleration", "tension"]
    prove?: string;      // For proofs
    graph?: string;      // For graphing problems
  };

  // Constraints
  constraints: {
    equilibrium?: boolean;
    frictionless?: boolean;
    massless_rope?: boolean;
    // ... more
  };

  // Recommended visualization
  recommendedDiagram: {
    type: string;
    confidence: number;
    alternativeTypes?: string[];
  };
}
```

### 4.2 AI Output Schema (Structured JSON)

```typescript
interface TutorResponse {
  // The teaching content
  introduction: string;

  // Diagram specification
  diagram: {
    type: DiagramType;
    data: DiagramData;  // Type-specific

    // Step-by-step visual states
    steps: DiagramStep[];
  };

  // Explanation steps (synced with diagram steps)
  explanationSteps: {
    stepNumber: number;
    title: string;
    explanation: string;
    formula?: string;        // KaTeX
    calculation?: string;    // Worked math

    // Visual synchronization
    diagramStepIndex: number;
    highlightElements?: string[];
  }[];

  // Final answer
  answer: {
    value: string | number;
    unit?: string;
    explanation: string;
  };

  // Interactive exploration suggestions
  exploration?: {
    question: string;
    parameterToAdjust: string;
    interestingValues: number[];
  };
}
```

### 4.3 Diagram Step Schema

```typescript
interface DiagramStep {
  stepNumber: number;

  // What to show
  visibleElements: string[];   // IDs of elements to display

  // What to emphasize
  highlightElements: string[]; // IDs to highlight (glow, color change)
  newElements: string[];       // IDs that are NEW this step (animate in)

  // Annotations
  annotations: {
    id: string;
    type: 'label' | 'calculation' | 'arrow' | 'bracket';
    position: { x: number; y: number };
    content: string;
  }[];

  // Animation
  animation: {
    type: 'fade' | 'draw' | 'grow' | 'decompose';
    duration: number;
    delay?: number;
  };
}
```

### 4.4 Layout Engine

```typescript
// Anti-overlap algorithm
interface LayoutEngine {
  // Input: Raw element positions
  // Output: Adjusted positions with no overlaps

  calculateLayout(elements: DiagramElement[]): AdjustedElement[];

  // Collision detection
  detectCollisions(elements: DiagramElement[]): Collision[];

  // Label positioning
  positionLabel(
    label: Label,
    anchor: Point,
    existingLabels: Label[]
  ): Point;

  // Force vector smart origins
  calculateForceOrigins(
    object: PhysicsObject,
    forces: Force[]
  ): Map<string, Point>;
}

// Force origin rules
const FORCE_ORIGIN_RULES = {
  weight: 'center',           // Center of mass
  normal: 'surface_contact',  // Where object touches surface
  friction: 'surface_front',  // Front edge of contact
  tension: 'attachment_point', // Where rope attaches
  applied: 'point_of_application',
  spring: 'spring_attachment',
};

// Label positioning priority
const LABEL_POSITIONS = [
  'end_of_arrow',      // First choice: at arrow tip
  'perpendicular_offset', // Second: offset perpendicular to arrow
  'curved_leader',     // Third: curved line to safe area
];
```

### 4.5 Physics Validation Rules

```typescript
interface PhysicsValidator {
  // Validate force directions
  validateForceAngles(diagram: PhysicsDiagram): ValidationResult;

  // Check equilibrium conditions
  checkEquilibrium(forces: Force[]): {
    netForce: Vector2D;
    isBalanced: boolean;
    imbalanceDirection?: number;
  };

  // Validate inclined plane geometry
  validateInclinedPlane(data: InclinedPlaneData): {
    valid: boolean;
    errors: string[];
    corrections: Partial<InclinedPlaneData>;
  };
}

// Validation rules
const PHYSICS_RULES = {
  // Weight must point at -90° (straight down)
  weight_angle: { expected: -90, tolerance: 0 },

  // Normal must be perpendicular to surface
  normal_to_surface: { perpendicular: true, tolerance: 1 },

  // Friction must oppose motion
  friction_opposes_motion: true,

  // On inclined plane, normal angle = 90 - plane_angle
  inclined_normal: (planeAngle: number) => 90 - planeAngle,
};
```

---

## Part 5: Component Improvements

### 5.1 FreeBodyDiagram Redesign

**Problems:**
- All forces from center → overlapping
- Labels collide with arrows
- No given info display

**Solution:**

```typescript
// Smart force origins based on force type
function getForceOrigin(force: Force, object: PhysicsObject): Point {
  const { center, bounds } = object;

  switch (force.type) {
    case 'weight':
      return center;  // From center of mass

    case 'normal':
      // From surface contact point, perpendicular to surface
      return getSurfaceContactPoint(object, force.surfaceAngle);

    case 'friction':
      // From front edge of contact
      return offsetAlongSurface(
        getSurfaceContactPoint(object, force.surfaceAngle),
        force.direction === 'left' ? -10 : 10
      );

    case 'tension':
      // From attachment point
      return force.attachmentPoint || getEdgePoint(object, force.angle);

    default:
      return center;
  }
}

// Label positioning with collision avoidance
function positionLabel(force: Force, existingLabels: Label[]): Point {
  const arrowEnd = calculateArrowEnd(force);

  // Try positions in priority order
  const candidates = [
    offsetFromArrowTip(arrowEnd, force.angle, 20),
    offsetPerpendicular(arrowEnd, force.angle, 25),
    offsetWithLeader(arrowEnd, findSafeArea(existingLabels)),
  ];

  for (const pos of candidates) {
    if (!collidesWithAny(pos, existingLabels)) {
      return pos;
    }
  }

  // Fallback: use leader line to safe area
  return offsetWithLeader(arrowEnd, findSafeArea(existingLabels));
}
```

### 5.2 CoordinatePlane Enhancement (Desmos-like)

**Add:**
- Real-time equation input
- Multiple functions with different colors
- Parameter sliders (a, b, c in ax² + bx + c)
- Auto-scaling to fit key features
- Touch/drag to pan and zoom

```typescript
interface EnhancedCoordinatePlane {
  // Dynamic equation support
  equations: {
    id: string;
    expression: string;  // "x^2 - 4"
    color: string;
    visible: boolean;
  }[];

  // Parameter sliders
  parameters: {
    name: string;      // "a"
    value: number;     // 2
    min: number;       // -10
    max: number;       // 10
    step: number;      // 0.1
  }[];

  // Key points to always show
  keyPoints: {
    vertex?: boolean;
    intercepts?: boolean;
    asymptotes?: boolean;
  };

  // Interaction
  interaction: {
    pan: boolean;
    zoom: boolean;
    trace: boolean;  // Show coordinates as you move
  };
}
```

### 5.3 Interactive Parameter Sliders

```tsx
// Generic parameter slider component
interface ParameterSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  unit?: string;
  onChange: (value: number) => void;

  // Visual feedback
  color?: string;
  showValue?: boolean;
  marks?: { value: number; label: string }[];
}

function ParameterSlider({
  label, value, min, max, step, unit, onChange, color, marks
}: ParameterSliderProps) {
  return (
    <div className="parameter-slider">
      <label>{label}</label>
      <input
        type="range"
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ accentColor: color }}
      />
      <span className="value">
        {value}{unit}
      </span>
      {marks && (
        <div className="marks">
          {marks.map(m => (
            <span key={m.value} style={{ left: `${(m.value - min) / (max - min) * 100}%` }}>
              {m.label}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
```

### 5.4 "What If" Mode

```tsx
interface WhatIfModeProps {
  diagram: DiagramData;
  parameters: ParameterDefinition[];
  calculateResult: (params: Record<string, number>) => {
    value: number;
    unit: string;
    description: string;
  };
  suggestions?: {
    question: string;
    parameterChanges: Record<string, number>;
  }[];
}

function WhatIfMode({ diagram, parameters, calculateResult, suggestions }: WhatIfModeProps) {
  const [values, setValues] = useState(
    Object.fromEntries(parameters.map(p => [p.name, p.default]))
  );

  const result = useMemo(() => calculateResult(values), [values]);

  return (
    <div className="what-if-mode">
      <h3>Explore: What if...?</h3>

      <div className="parameter-controls">
        {parameters.map(p => (
          <ParameterSlider
            key={p.name}
            label={p.label}
            value={values[p.name]}
            min={p.min}
            max={p.max}
            step={p.step}
            unit={p.unit}
            onChange={(v) => setValues({ ...values, [p.name]: v })}
          />
        ))}
      </div>

      <div className="diagram-preview">
        <DiagramRenderer
          diagram={{ ...diagram, ...valuesToDiagramData(values) }}
          interactive={false}
        />
      </div>

      <div className="result-display">
        <strong>Result:</strong> {result.description}
        <div className="value">{result.value} {result.unit}</div>
      </div>

      {suggestions && (
        <div className="suggestions">
          <h4>Try these:</h4>
          {suggestions.map((s, i) => (
            <button
              key={i}
              onClick={() => setValues({ ...values, ...s.parameterChanges })}
            >
              {s.question}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
```

---

## Part 6: AI Prompt Engineering

### 6.1 System Prompt for Visual Learning

```typescript
const VISUAL_LEARNING_SYSTEM_PROMPT = `
You are NoteSnap's visual learning tutor. Your goal is to help students understand concepts through clear visuals and step-by-step explanations.

## CRITICAL REQUIREMENTS

### 1. ALWAYS GENERATE STRUCTURED DIAGRAM DATA

For every problem that can be visualized, output a \`\`\`diagram JSON block:

\`\`\`diagram
{
  "type": "inclined_plane",
  "data": {
    "angle": 30,
    "object": {
      "label": "Block",
      "mass": 5,
      "color": "#e5e7eb"
    },
    "forces": [
      {
        "name": "weight",
        "type": "weight",
        "magnitude": 49,
        "angle": -90,
        "symbol": "W",
        "components": true
      },
      {
        "name": "normal",
        "type": "normal",
        "magnitude": 42.4,
        "angle": 60,
        "symbol": "N"
      },
      {
        "name": "friction",
        "type": "friction",
        "magnitude": 8.5,
        "angle": 120,
        "symbol": "f"
      }
    ],
    "frictionCoefficient": 0.2,
    "showDecomposition": true
  },
  "steps": [
    {
      "stepNumber": 0,
      "title": "The Scenario",
      "visibleElements": ["plane", "object"],
      "newElements": ["plane", "object"]
    },
    {
      "stepNumber": 1,
      "title": "Weight Force",
      "visibleElements": ["plane", "object", "weight"],
      "newElements": ["weight"],
      "highlightElements": ["weight"]
    },
    {
      "stepNumber": 2,
      "title": "Normal Force",
      "visibleElements": ["plane", "object", "weight", "normal"],
      "newElements": ["normal"],
      "highlightElements": ["normal"]
    },
    {
      "stepNumber": 3,
      "title": "Friction Force",
      "visibleElements": ["plane", "object", "weight", "normal", "friction"],
      "newElements": ["friction"],
      "highlightElements": ["friction"]
    },
    {
      "stepNumber": 4,
      "title": "Weight Components",
      "visibleElements": ["plane", "object", "weight", "normal", "friction", "weight_parallel", "weight_perp"],
      "newElements": ["weight_parallel", "weight_perp"],
      "highlightElements": ["weight_parallel", "weight_perp"]
    }
  ]
}
\`\`\`

### 2. FORCE ANGLE CONVENTIONS

- Weight: ALWAYS -90° (straight down)
- Normal on flat surface: ALWAYS 90° (straight up)
- Normal on inclined plane: (90 - θ)° from horizontal, perpendicular to surface
- Friction: Opposite to motion direction, parallel to surface
- Tension: Along the rope direction

### 3. CALCULATION ACCURACY

- Use g = 9.8 m/s² unless problem specifies otherwise
- Show all intermediate steps
- Round final answers appropriately (usually 2-3 significant figures)
- Include units in all calculations

### 4. STEP-BY-STEP STRUCTURE

Each explanation step should:
1. Introduce ONE new concept
2. Connect to the visual (reference the diagram element by name)
3. Show the relevant formula
4. Perform the calculation if applicable

### 5. PARAMETER EXTRACTION

Extract ALL given values and structure them:
- Mass: "5 kg" → { value: 5, unit: "kg" }
- Angle: "30 degrees" → { value: 30, unit: "degrees" }
- Coefficient: "μ = 0.2" → { value: 0.2, unit: "dimensionless" }

### 6. DIAGRAM TYPE SELECTION

| Problem Type | Diagram Type | When to Use |
|--------------|--------------|-------------|
| Forces on object | free_body_diagram | Any statics/dynamics problem |
| Object on slope | inclined_plane | Ramp/incline problems |
| Thrown object | projectile_motion | Projectile problems |
| Rope and pulleys | pulley_system | Atwood machines, pulleys |
| Graph a function | coordinate_plane | Graphing, functions |
| Solve equation | equation_steps | Algebraic manipulation |
| Long division | long_division | Division problems |
| Atom structure | atom_diagram | Chemistry atomic structure |
| Molecule | molecule_diagram | Molecular geometry |

### 7. INTERACTIVE SUGGESTIONS

When appropriate, suggest parameter explorations:

"exploration": {
  "question": "What friction coefficient would make the block stay still?",
  "parameterToAdjust": "frictionCoefficient",
  "interestingValues": [0.1, 0.3, 0.577]
}
`;
```

### 6.2 Response Parsing

```typescript
function parseAIResponse(response: string): TutorResponse {
  // Extract diagram JSON block
  const diagramMatch = response.match(/```diagram\n([\s\S]*?)\n```/);

  if (diagramMatch) {
    const diagramData = JSON.parse(diagramMatch[1]);

    // Validate against schema
    const validation = validateDiagramSchema(diagramData);
    if (!validation.valid) {
      console.warn('Diagram validation failed:', validation.errors);
      // Attempt auto-correction
      diagramData = autoCorrectDiagram(diagramData, validation.errors);
    }

    // Physics consistency check
    const physicsCheck = validatePhysicsConsistency(diagramData);
    if (!physicsCheck.valid) {
      console.warn('Physics validation failed:', physicsCheck.errors);
      diagramData = autoCorrectPhysics(diagramData, physicsCheck.corrections);
    }

    return {
      text: response.replace(/```diagram[\s\S]*?```/, ''),
      diagram: diagramData,
      confidence: validation.confidence * physicsCheck.confidence,
    };
  }

  // Fallback: try to generate diagram programmatically
  return {
    text: response,
    diagram: attemptProgrammaticGeneration(response),
    confidence: 0.5,
  };
}
```

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Week 1-2)
**Goal: Fix critical issues, establish patterns**

- [ ] **Day 1-2**: Create `lib/visual-learning/types.ts` with all schemas
- [ ] **Day 3-4**: Create `lib/visual-learning/validator.ts` for diagram validation
- [ ] **Day 5-6**: Create `lib/visual-learning/layout-engine.ts` for anti-overlap
- [ ] **Day 7-8**: Update `InclinedPlane.tsx` with smart force positioning
- [ ] **Day 9-10**: Update `FreeBodyDiagram.tsx` with same improvements
- [ ] **Day 11-12**: Update AI prompts in `tutor-engine.ts`
- [ ] **Day 13-14**: Testing and bug fixes

**Deliverables:**
- No more overlapping labels
- Force vectors start from logical positions
- AI outputs structured diagram data
- Validation catches common errors

### Phase 2: Step Synchronization (Week 3-4)
**Goal: Perfect visual-explanation alignment**

- [ ] Create `StepSyncManager` class
- [ ] Add step metadata to all diagram components
- [ ] Implement animation sequencing
- [ ] Add step navigation controls
- [ ] Sync explanation text with visual state

**Deliverables:**
- Each explanation step highlights relevant diagram element
- Smooth animations between steps
- "Back" and "Next" controls work perfectly

### Phase 3: Interactivity (Week 5-6)
**Goal: Add exploration capabilities**

- [ ] Create `ParameterSlider` component
- [ ] Create `WhatIfMode` component
- [ ] Add sliders to physics diagrams
- [ ] Implement real-time diagram updates
- [ ] Add exploration suggestions from AI

**Deliverables:**
- Students can adjust angle/mass/friction and see results
- "What if" mode available on physics problems
- AI suggests interesting explorations

### Phase 4: Enhanced Graphing (Week 7-8)
**Goal: Desmos-quality graphing**

- [ ] Integrate Desmos API (or build equivalent)
- [ ] Add equation input field
- [ ] Implement parameter sliders for functions
- [ ] Add trace mode (show coordinates on hover)
- [ ] Implement pan/zoom

**Deliverables:**
- Real-time function graphing
- Multiple equations with colors
- Interactive exploration of functions

### Phase 5: Quality & Polish (Week 9-10)
**Goal: Production-ready quality**

- [ ] Comprehensive testing
- [ ] Mobile optimization
- [ ] Accessibility audit
- [ ] Performance optimization
- [ ] Error boundary improvements
- [ ] Analytics integration

**Deliverables:**
- Works perfectly on all devices
- Accessible to all users
- Fast and responsive
- Errors handled gracefully

---

## Part 8: Success Metrics

### Quantitative Metrics

| Metric | Current | Target | How to Measure |
|--------|---------|--------|----------------|
| Diagram generation success rate | ~70% | 95% | % of visualizable problems that get diagrams |
| Label overlap rate | ~20% | 0% | Automated collision detection |
| Physics accuracy | Unknown | 99% | Automated physics validation |
| Step synchronization | 0% | 100% | Manual review + user feedback |
| Interactive engagement | 0% | 30% | % of students who use sliders |

### Qualitative Metrics

- **User satisfaction**: "Was this visual helpful?" survey
- **Learning outcomes**: Pre/post quiz performance
- **Engagement**: Time spent exploring "what if" scenarios
- **Retention**: Do students return to review visuals?

---

## Part 9: Competitive Advantage

### What Makes This Better Than Competitors

| Feature | Desmos | Khan | PhET | Brilliant | NoteSnap |
|---------|--------|------|------|-----------|----------|
| Auto-generate from problem | ❌ | ❌ | ❌ | ❌ | ✅ |
| Step-by-step sync | ❌ | Partial | ❌ | Partial | ✅ |
| AI tutoring + visuals | ❌ | ❌ | ❌ | ❌ | ✅ |
| Real-time graphing | ✅ | ❌ | ❌ | ❌ | ✅ (planned) |
| Physics simulations | ❌ | ❌ | ✅ | ❌ | ✅ (planned) |
| Parameter exploration | ✅ | ❌ | ✅ | ✅ | ✅ (planned) |
| Multi-subject support | ❌ | ✅ | Physics only | ✅ | ✅ |
| Mobile-first | ❌ | ✅ | ❌ | ✅ | ✅ |

### Unique Value Proposition

**"Upload any homework problem, get an expert tutor who shows you exactly what's happening, step by step, with visuals you can explore."**

No other platform combines:
1. AI tutoring (like ChatGPT)
2. Professional diagrams (like textbooks)
3. Interactive exploration (like Desmos/PhET)
4. Step-by-step alignment (like the best teachers)

---

## Conclusion

This plan transforms NoteSnap from "an app that sometimes shows diagrams" to "the best visual learning platform in the world." The key insights:

1. **Structured data is everything** - AI must output structured JSON, not just text
2. **Synchronization matters** - Visual and explanation must be perfectly aligned
3. **Interactivity drives understanding** - Let students explore, not just view
4. **Quality over quantity** - Better to have 10 perfect diagram types than 50 mediocre ones
5. **Validation prevents errors** - Check physics and layout before rendering

Execute this plan, and NoteSnap will be unmatched in visual learning.
