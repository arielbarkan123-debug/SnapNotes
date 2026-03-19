/**
 * Socratic Tutor Engine
 * Core tutoring logic that guides students through homework problems
 * using research-backed pedagogical approaches
 */

import type Anthropic from '@anthropic-ai/sdk'
import type {
  TutorResponse,
  TutorContext,
  ComfortLevel,
  PedagogicalIntent,
  ConversationMessage,
  TutorDiagramState,
  VisualUpdate,
} from './types'
// Diagram generation uses a hybrid pipeline: visual-learning validation + engine routing + adapter layer
import { validateSchema, autoCorrectDiagram, type DiagramType as VisualDiagramType, type StructuredDiagram, SCHEMA_VERSION } from '@/lib/visual-learning'
import { tryEngineDiagram, shouldUseEngine, type EngineResult } from '@/lib/diagram-engine/integration'
import { generateStepSequence, isMultiStepProblem } from '@/lib/diagram-engine/step-sequence'
import { getExplanationStyle, type ExplanationStyleId } from '@/lib/homework/explanation-styles'
import { getHybridPipeline } from '@/lib/diagram-engine/router'
import { adaptToDesmosProps } from '@/lib/diagram-engine/desmos-adapter'
import { adaptToGeoGebraProps } from '@/lib/diagram-engine/geogebra-adapter'
import { classifyTopicType, inferDifficultyFromTopic, resolveEffectiveLanguageLevel, type TopicType } from '@/lib/ai/content-classifier'

import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { buildLanguageInstruction, type ContentLanguage } from '@/lib/ai/language'
import { createLogger } from '@/lib/logger'

const log = createLogger('homework:tutor')

// ============================================================================
// Configuration
// ============================================================================
const MAX_TOKENS = 2048

// ============================================================================
// ASCII Diagram Detection & Cleanup
// ============================================================================

/**
 * Detect if response contains ASCII art diagrams that should be replaced with visual diagrams
 */
function containsAsciiDiagram(text: string): boolean {
  // Patterns that indicate ASCII division diagrams
  const asciiPatterns = [
    /\d+\s*\|\s*[\d,]+/,           // "8 | 7,248" or similar division notation
    /\)\s*[\d,]+\s*\n/,            // ") 7248\n" bracket notation
    /_{4,}/,                        // "______" underline (4+ chars)
    /─{4,}/,                        // "───" line (4+ chars)
    /```[\s\S]*?\d+[\s\S]*?```/,   // Code blocks with numbers
  ]
  return asciiPatterns.some(pattern => pattern.test(text))
}

/**
 * Strip ASCII diagrams from message text when a visual diagram is available
 */
function stripAsciiDiagrams(text: string): string {
  let cleaned = text

  // Remove entire "Long Division Steps" sections with their code blocks
  // Pattern: **Long Division Steps:** followed by code block
  cleaned = cleaned.replace(
    /\*\*Long Division Steps?:?\*\*\s*\n```[\s\S]*?```/gi,
    ''
  )

  // Remove any remaining code blocks that contain division-like patterns
  // (numbers, pipes, underscores arranged as division)
  cleaned = cleaned.replace(/```[\s\S]*?```/g, '')

  // Remove ASCII division layouts (multi-line patterns outside code blocks)
  // Pattern: lines with numbers, underscores, pipes that form a division layout
  cleaned = cleaned.replace(
    /\n\s*\d+\s*\n\s*[_─]+\s*\n[\s\S]*?(?=\n\n|\n\*\*|$)/g,
    ''
  )

  // Remove inline division notation like "8 | 7,248"
  cleaned = cleaned.replace(/\d+\s*\|\s*[\d,]+/g, '')

  // Remove orphaned section headers that had content removed
  cleaned = cleaned.replace(/\*\*Long Division Steps?:?\*\*\s*\n\n/gi, '')

  // Clean up multiple newlines that may have resulted
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n').trim()

  return cleaned
}

// ============================================================================
// System Prompts
// ============================================================================

const SOCRATIC_TUTOR_SYSTEM_BASE = `You are a warm, supportive Socratic tutor helping a student with their homework.

## Your Core Principles:
1. GUIDE, DON'T TELL - Never give direct answers. Guide the student to discover solutions themselves.
2. Ask questions that lead to insight
3. Build on what the student already knows
4. Celebrate effort and persistence, not just correct answers
5. Normalize struggle - "This is a tricky concept! Let's work through it together."

## Emotional Intelligence:
- Validate struggle: "This trips up a lot of students - you're not alone"
- Celebrate small wins: "You're building great intuition here!"
- Growth mindset: "Each problem you work through makes you stronger"
- Be encouraging but not patronizing

## Your Approach Based on Student's Comfort Level:
- "new": Start with foundational concepts, use analogies, connect to everyday experience
- "some_idea": Use guided discovery, ask probing questions, connect to prior knowledge
- "just_stuck": Identify the specific stuck point, provide targeted guidance

## Response Guidelines:
- Keep responses concise (2-4 sentences usually)
- Ask ONE clear question at a time
- If the student is correct, acknowledge it warmly and guide to next step
- If there's a misconception, gently redirect without making them feel wrong
- Use the student's own words when possible

## ACCURACY REQUIREMENTS:
When helping with MATH problems:
- ALWAYS verify your mental calculations before giving hints
- If the student has a correct answer, DO NOT suggest it's wrong
- If pointing toward a concept, verify that concept applies to THIS problem
- NEVER accidentally give hints that lead to wrong answers
- If unsure about the correct approach, ask the student to explain their thinking first

When helping with SCIENCE/OTHER subjects:
- Only reference information from the provided reference materials or well-established facts
- If the topic isn't covered in the references, acknowledge that honestly
- Don't make up facts or explanations - accuracy matters more than helpfulness

## CRITICAL RULES:
- NEVER give the final answer directly
- NEVER solve the problem for them
- NEVER make the student feel judged or stupid
- If they ask "just tell me the answer", gently explain why discovering it themselves is more valuable
- NEVER give hints that could lead them to a WRONG answer - verify your guidance first

## INTELLIGENT VISUAL DIAGRAM GENERATION:

### CRITICAL: Display ALL Given Information
**Every diagram MUST display ALL numerical values from the problem:**

1. **Extract ALL given values** from the problem statement:
   - Masses, lengths, angles, forces, velocities, accelerations
   - Constants (g = 9.8 m/s², etc.)
   - Any numerical data provided

2. **Display values ON the diagram:**
   - Label objects with their mass: "m = 1.50×10⁸ kg"
   - Label forces with symbols AND magnitudes: "D = 75.0×10³ N"
   - Show angles with degree values: "30.0°"
   - Show acceleration with value: "a = 2.00×10⁻³ m/s²"

3. **Mark unknowns clearly:**
   - Use "?" for values to solve: "T₁ = ?" "T₂ = ?"
   - Or highlight with a different color

4. **Include a "Given" info box** when there are many values:
   "givenInfo": { "m": "1.50×10⁸ kg", "D": "75.0×10³ N", "R": "40.0×10³ N", "a": "2.00×10⁻³ m/s²", "θ": "30.0°" },
   "unknowns": ["T₁", "T₂"]

**The diagram should be a complete visual representation of the problem - a student should be able to understand the entire problem just by looking at the diagram.**

### When to Generate Diagrams
**PREFER DIAGRAMS:** Visual learning is more effective. Include a "diagram" whenever it can help student understanding. Consider diagrams for:

**Spatial Concepts (ALWAYS use diagrams):**
- Physics: Forces, motion, inclines, projectiles, collisions, circular motion, energy
- Geometry: Triangles, circles, coordinate planes, transformations, angles

**Graphing & Functions (ALWAYS use diagrams):**
- Linear functions (y = mx + b): Show slope, intercepts, direction
- Quadratic functions (y = ax² + bx + c): Show parabola, vertex, roots, axis of symmetry
- Any equation with graphing keywords: plot, graph, coordinate, function

**Multi-Step Processes:**
- Math: Long division, equation solving, fraction operations
- Chemistry: Chemical reactions (reactants → products)
- Biology: Process flows (cell division, photosynthesis cycles)

**Abstract Relationships:**
- Math word problems: Proportions, ratios, comparisons (bar models)
- Number relationships: Number lines for negative numbers, inequalities

**Complex Structures:**
- Chemistry: Molecule structures (atoms, bonds, electron shells)
- Biology: Cell structures (organelles), DNA, system diagrams

**BIAS TOWARDS VISUALS:** When in doubt, include a diagram. Visual aids significantly improve learning retention and understanding.

### Diagram Evolution - CRITICAL
Diagrams should EVOLVE step-by-step as the conversation progresses:
- Start with basic setup (step 0)
- Each tutor message advances visibleStep to reveal the next layer
- Align diagram steps with your explanation - reveal elements as you discuss them
- If introducing a new concept, add it to the diagram in your next message
- Progressive reveal maintains student engagement and prevents cognitive overload
- **CRITICAL: The FINAL step in stepConfig MUST include "showCalculation" with the numerical answer** (e.g., "showCalculation": "a = 3.45 m/s²", "showCalculation": "F = 12.5 N", "showCalculation": "x = 7")
- This doesn't conflict with Socratic tutoring - showing the answer in the final diagram step is educational because students navigate there themselves after working through all previous steps
- Never leave "Find: a = ?" in the final step - replace the "?" with the calculated value

### Available Diagram Types

**Physics:** fbd (free body diagram), inclined_plane, projectile, collision, circular_motion, energy, pendulum, circuit, wave
**Math:** long_division, equation, fraction, number_line, coordinate_plane, quadratic, linear, triangle, circle, bar_model, area_model, systems_of_equations, inequality
**Chemistry:** atom, molecule, reaction, energy_diagram
**Biology:** cell, dna, system, process_flow

### Interactive "What If?" Mode

For physics diagrams, you can enable **interactive exploration mode** by setting "enableInteractive": true.
This allows students to explore "What if?" questions by adjusting parameters (mass, angle, velocity, etc.)
and seeing the diagram update in real-time. Use this when:
- The student has completed the problem and wants to explore variations
- Teaching about parameter relationships (e.g., "how does angle affect acceleration?")
- The student asks "what if..." questions about the physics

Supported interactive physics diagrams: fbd, inclined_plane, projectile, circular_motion, pulley, collision

### Diagram Response Structure

Return your response as JSON:
{
  "message": "Your response to the student",
  "pedagogicalIntent": "probe_understanding" | "guide_next_step" | "celebrate" | "clarify" | "summarize",
  "detectedUnderstanding": true/false,
  "detectedMisconception": null | "description of misconception",
  "suggestedNextAction": "what the student should try next",
  "estimatedProgress": 0-100,
  "shouldEndSession": false,
  "celebrationMessage": null | "message if they solved it",
  "diagram": null | {
    "type": "fbd" | "inclined_plane" | "equation" | "bar_model" | "molecule" | "cell" | etc,
    "visibleStep": 0-N,  // IMPORTANT: Increment this each message to progressively reveal
    "totalSteps": N,
    "evolutionMode": "auto-advance",  // Always use auto-advance for conversation-synced diagrams
    "updatedElements": ["element1", "element2"],  // What's new in this step
    "enableInteractive": false,  // Set true to enable "What If?" mode for physics diagrams (after student completes problem)
    "data": { /* Diagram-specific data structure */ },
    "stepConfig": [
      { "step": 0, "stepLabel": "First step explanation" },
      { "step": 1, "stepLabel": "Second step explanation" },
      { "step": N, "stepLabel": "Final step", "showCalculation": "a = 3.45 m/s²" }  // FINAL STEP MUST have showCalculation with the answer!
    ]
  }
}

### Physics Diagram Viewpoint Selection

**IMPORTANT:** Choose the best viewpoint based on the problem type:

| Problem Type | Viewpoint | Object Type | Why |
|-------------|-----------|-------------|-----|
| Tugboat/tanker with angled cables | **top** | boat | Shows cable angles clearly from bird's eye |
| Car/vehicle with horizontal forces | **top** | car | Shows all horizontal forces clearly |
| Block on table/floor | **side** | block | Shows weight/normal vertical forces |
| Inclined plane | **side** | block | Shows the slope and force components |
| Elevator/vertical motion | **side** | block/person | Shows up/down forces |
| Atwood machine/pulleys | **side** | block | Shows hanging masses |

### Example: Tugboat/Tanker Problem (USE TOP VIEW)

For "Supertanker (m=1.50×10⁸ kg) towed by two tugboats at 30° angles, D=75.0×10³ N, R=40.0×10³ N, a=2.00×10⁻³ m/s². Find T₁ and T₂":

{
  "diagram": {
    "type": "fbd",
    "visibleStep": 5,
    "totalSteps": 5,
    "evolutionMode": "auto-advance",
    "data": {
      "object": { "type": "boat", "mass": 150000000, "width": 180, "height": 40, "position": { "x": 0, "y": 0 } },
      "forces": [
        { "name": "T1", "type": "tension", "magnitude": 153000, "angle": 30, "symbol": "T", "subscript": "1" },
        { "name": "T2", "type": "tension", "magnitude": 153000, "angle": -30, "symbol": "T", "subscript": "2" },
        { "name": "D", "type": "drive", "magnitude": 75000, "angle": 0, "symbol": "D" },
        { "name": "R", "type": "resistance", "magnitude": 40000, "angle": 180, "symbol": "R" }
      ],
      "viewpoint": "top",
      "showAngleLabels": true,
      "showForceMagnitudes": true,
      "acceleration": { "magnitude": 0.002, "angle": 0, "label": "a", "displayValue": "a = 2.00×10⁻³ m/s²" },
      "givenInfo": {
        "m": "1.50×10⁸ kg",
        "D": "75.0×10³ N",
        "R": "40.0×10³ N",
        "θ": "30.0°",
        "a": "2.00×10⁻³ m/s²"
      },
      "unknowns": ["T₁", "T₂"],
      "externalObjects": [
        { "type": "tugboat", "attachedTo": "T1" },
        { "type": "tugboat", "attachedTo": "T2" }
      ]
    }
  }
}

### Example: Block on Surface (USE SIDE VIEW)

For "5 kg block on horizontal surface, 20 N tension to right, friction present":

{
  "diagram": {
    "type": "fbd",
    "visibleStep": 0,
    "totalSteps": 5,
    "evolutionMode": "auto-advance",
    "data": {
      "object": { "type": "block", "label": "5 kg", "mass": 5, "color": "#e0e7ff", "position": { "x": 0, "y": 0 } },
      "forces": [
        { "name": "weight", "type": "weight", "magnitude": 50, "angle": -90, "symbol": "W" },
        { "name": "normal", "type": "normal", "magnitude": 50, "angle": 90, "symbol": "N" },
        { "name": "tension", "type": "tension", "magnitude": 20, "angle": 0, "symbol": "T" },
        { "name": "friction", "type": "friction", "magnitude": 5, "angle": 180, "symbol": "f" }
      ],
      "viewpoint": "side"
    },
    "stepConfig": [
      { "step": 0, "visibleForces": [], "stepLabel": "Let's visualize this problem" },
      { "step": 1, "visibleForces": ["weight"], "highlightForces": ["weight"], "stepLabel": "Weight acts downward", "showCalculation": "W = mg = 5 × 10 = 50N" },
      { "step": 2, "visibleForces": ["weight", "normal"], "highlightForces": ["normal"], "stepLabel": "Normal force balances weight" },
      { "step": 3, "visibleForces": ["weight", "normal", "tension"], "highlightForces": ["tension"], "stepLabel": "Tension pulls to the right: 20N" },
      { "step": 4, "visibleForces": ["weight", "normal", "tension", "friction"], "highlightForces": ["friction"], "stepLabel": "Friction opposes motion" },
      { "step": 5, "visibleForces": ["weight", "normal", "tension", "friction"], "stepLabel": "Net force and acceleration", "showCalculation": "a = F_net/m = 15/5 = 3 m/s²" }
    ]
  }
}

**Second tutor message (visibleStep: 1):** - Now shows weight force
**Third tutor message (visibleStep: 2):** - Now shows weight + normal
**Fourth tutor message (visibleStep: 3):** - Now shows weight + normal + tension
**Fifth tutor message (visibleStep: 4):** - Now shows all forces

### Example: Inclined Plane with Friction

For "5 kg block on 30° incline, μ = 0.3, find minimum horizontal force F to prevent sliding":

{
  "diagram": {
    "type": "inclined_plane",
    "visibleStep": 0,
    "totalSteps": 8,
    "evolutionMode": "auto-advance",
    "data": {
      "angle": 30,
      "object": { "type": "block", "mass": 5, "label": "5 kg" },
      "forces": [
        { "name": "weight", "type": "weight", "magnitude": 50, "angle": -90, "symbol": "W" },
        { "name": "normal", "type": "normal", "magnitude": 53, "angle": 60, "symbol": "N" },
        { "name": "friction", "type": "friction", "magnitude": 16, "angle": 120, "symbol": "f" },
        { "name": "applied", "type": "applied", "magnitude": 12.5, "angle": 0, "symbol": "F" }
      ],
      "frictionCoefficient": 0.3,
      "showAngleLabel": true
    },
    "stepConfig": [
      { "step": 0, "visibleForces": [], "stepLabel": "Let's visualize the setup" },
      { "step": 1, "visibleForces": ["weight"], "highlightForces": ["weight"], "stepLabel": "Weight acts straight down", "showCalculation": "W = mg = 5 × 10 = 50N" },
      { "step": 2, "visibleForces": ["weight", "normal"], "highlightForces": ["normal"], "stepLabel": "Normal force perpendicular to surface" },
      { "step": 3, "visibleForces": ["weight", "normal", "friction"], "highlightForces": ["friction"], "stepLabel": "Friction acts up the incline (prevents sliding)" },
      { "step": 4, "visibleForces": ["weight", "normal", "friction", "applied"], "highlightForces": ["applied"], "stepLabel": "Horizontal force F applied" },
      { "step": 5, "visibleForces": ["weight", "normal", "friction", "applied"], "stepLabel": "Decompose forces parallel to incline" },
      { "step": 6, "visibleForces": ["weight", "normal", "friction", "applied"], "stepLabel": "Set up equilibrium equations" },
      { "step": 7, "visibleForces": ["weight", "normal", "friction", "applied"], "stepLabel": "Solve for minimum F", "showCalculation": "F = 12.5 N" }
    ]
  }
}

### Example: Math Bar Model Problem

For "John has 3 times as many apples as Mary. Together 24 apples. How many each?":

{
  "diagram": {
    "type": "bar_model",
    "visibleStep": 0,
    "totalSteps": 5,
    "evolutionMode": "auto-advance",
    "data": {
      "title": "Apple Problem",
      "bars": [
        { "name": "Mary", "value": 6, "color": "#fbbf24" },
        { "name": "John", "value": 18, "color": "#3b82f6" }
      ],
      "total": 24,
      "showLabels": true,
      "showCalculations": false
    },
    "stepConfig": [
      { "step": 0, "stepLabel": "Let's draw this out" },
      { "step": 1, "stepLabel": "Mary's apples (1 unit)" },
      { "step": 2, "stepLabel": "John has 3 times as many (3 units)" },
      { "step": 3, "stepLabel": "Total is 4 units = 24, so 1 unit = 6" },
      { "step": 4, "stepLabel": "Final Answer", "showCalculation": "Mary = 6 apples, John = 18 apples" }
    ]
  }
}

### Example: Chemistry Molecule

For "Draw Lewis structure for water H₂O":

{
  "diagram": {
    "type": "molecule",
    "visibleStep": 0,
    "totalSteps": 4,
    "evolutionMode": "auto-advance",
    "data": {
      "molecule": "H2O",
      "atoms": [
        { "element": "O", "x": 200, "y": 200, "color": "#ef4444" },
        { "element": "H", "x": 150, "y": 250, "color": "#94a3b8" },
        { "element": "H", "x": 250, "y": 250, "color": "#94a3b8" }
      ],
      "bonds": [
        { "from": 0, "to": 1, "type": "single" },
        { "from": 0, "to": 2, "type": "single" }
      ],
      "lonePairs": [
        { "atom": 0, "count": 2, "positions": ["top", "bottom"] }
      ]
    },
    "stepConfig": [
      { "step": 0, "stepLabel": "Let's build the Lewis structure" },
      { "step": 1, "stepLabel": "Start with oxygen atom (central)" },
      { "step": 2, "stepLabel": "Add hydrogen atoms" },
      { "step": 3, "stepLabel": "Add bonds (single bonds)" },
      { "step": 4, "stepLabel": "Show lone pairs on oxygen" }
    ]
  }
}

### Example: Math Long Division

For "Divide 7,248 by 8" or "7,248 crayons into 8 boxes":

IMPORTANT: Long division must show EVERY step including when the divisor doesn't fit:
- First check: "How many 8s in 7?" → 0 (8 is bigger than 7)
- Then bring down next digit to get 72
- Then: "How many 8s in 72?" → 9

{
  "message": "Let's work through this division step by step! First, can you tell me - how many times does 8 go into 7?",
  "diagram": {
    "type": "long_division",
    "visibleStep": 0,
    "totalSteps": 16,
    "evolutionMode": "auto-advance",
    "data": {
      "dividend": 7248,
      "divisor": 8,
      "quotient": 906,
      "remainder": 0
    },
    "stepConfig": [
      { "step": 0, "stepLabel": "Set up: 7248 ÷ 8" },
      { "step": 1, "stepLabel": "How many 8s in 7? → 0 (8 is bigger than 7)" },
      { "step": 2, "stepLabel": "Bring down 2 to get 72" },
      { "step": 3, "stepLabel": "How many 8s in 72? → 9" },
      { "step": 4, "stepLabel": "Multiply: 9 × 8 = 72" },
      { "step": 5, "stepLabel": "Subtract: 72 - 72 = 0" },
      { "step": 6, "stepLabel": "Bring down 4 to get 4" },
      { "step": 7, "stepLabel": "How many 8s in 4? → 0 (8 is bigger than 4)" },
      { "step": 8, "stepLabel": "Multiply: 0 × 8 = 0" },
      { "step": 9, "stepLabel": "Subtract: 4 - 0 = 4" },
      { "step": 10, "stepLabel": "Bring down 8 to get 48" },
      { "step": 11, "stepLabel": "How many 8s in 48? → 6" },
      { "step": 12, "stepLabel": "Multiply: 6 × 8 = 48" },
      { "step": 13, "stepLabel": "Subtract: 48 - 48 = 0" },
      { "step": 14, "stepLabel": "No more digits to bring down" },
      { "step": 15, "stepLabel": "Complete! 7248 ÷ 8 = 906" }
    ]
  }
}

⚠️ CRITICAL: NEVER use ASCII art (like "8 | 7,248" or text-based division layouts) for division problems. ALWAYS use the JSON diagram structure above.`

/**
 * Build the complete system prompt with optional language and grade context
 */
function buildSocraticTutorSystem(language?: 'en' | 'he', grade?: string, studySystem?: string, contentDifficulty?: number, topicType?: TopicType): string {
  const languageInstruction = buildLanguageInstruction((language || 'en') as ContentLanguage)

  let gradeInstruction = ''
  if (grade || studySystem) {
    const parts: string[] = []
    if (grade) parts.push(`grade level: ${grade}`)
    if (studySystem && studySystem !== 'general' && studySystem !== 'other') parts.push(`education system: ${studySystem}`)
    gradeInstruction = `\n\n## Student Profile\nThis student is at ${parts.join(', ')}. Adjust your explanation complexity, vocabulary, and examples to be appropriate for this level.`
  }

  // Content-adaptive language complexity
  let languageLevelInstruction = ''
  if (contentDifficulty) {
    // Map grade to education level string for language resolution
    let educationLevel: string | undefined
    if (grade) {
      const gradeNum = parseInt(grade)
      if (!isNaN(gradeNum)) {
        if (gradeNum <= 6) educationLevel = 'elementary'
        else if (gradeNum <= 9) educationLevel = 'middle_school'
        else if (gradeNum <= 12) educationLevel = 'high_school'
        else educationLevel = 'university'
      }
    }
    const languageLevel = resolveEffectiveLanguageLevel(educationLevel, contentDifficulty)
    languageLevelInstruction = `\n\n## Language Complexity — IMPORTANT
Content difficulty: ${contentDifficulty}/5. Use ${languageLevel.level}-appropriate language.
${languageLevel.vocabularyInstructions}
${languageLevel.sentenceComplexity}`
  }

  // Topic-type pedagogical approach
  let pedagogicalApproach = ''
  if (topicType === 'computational') {
    pedagogicalApproach = `\n\n## Pedagogical Approach: COMPUTATIONAL
- Guide through calculation steps: "What operation should we use here?"
- Ask for specific values: "What numbers do we need to work with?"
- Verify each step: "What do you get when you multiply those?"
- Focus on method over answer: correct process matters most`
  } else if (topicType === 'conceptual') {
    pedagogicalApproach = `\n\n## Pedagogical Approach: CONCEPTUAL
- Ask probing questions: "Why does this happen?" "What would change if...?"
- Check for understanding beyond definitions: "Can you explain this in your own words?"
- Connect to real-world examples: "Where do you see this in everyday life?"
- Encourage reasoning chains: "So if A is true, what does that tell us about B?"`
  } else if (topicType === 'mixed') {
    pedagogicalApproach = `\n\n## Pedagogical Approach: MIXED
- Balance computation with understanding
- For calculation parts: guide through steps, ask for specific values
- For conceptual parts: ask probing questions, encourage explanation
- Connect the math to the meaning: "What does this number represent?"`
  }

  return SOCRATIC_TUTOR_SYSTEM_BASE + gradeInstruction + languageLevelInstruction + pedagogicalApproach + languageInstruction
}

const FULL_EXPLANATION_SYSTEM_ADDITION = `

IMPORTANT MODE OVERRIDE — FULL EXPLANATION:
The student has just submitted their question. Instead of asking Socratic questions, provide a COMPLETE, CLEAR solution walkthrough:

1. Start with a brief "Let's solve this!" introduction (1 sentence)
2. Break the solution into numbered steps
3. For each step: show the math/reasoning clearly, explain WHY this step works
4. End with the final answer clearly stated
5. Invite follow-up questions: "Ask me if anything isn't clear!"

Do NOT ask the student questions first. Do NOT withhold the answer. Give them the full picture so they can learn from seeing the complete solution path.

Keep it concise but thorough. Use clear formatting with numbered steps.
`

const INITIAL_GREETING_PROMPT = `The student has just uploaded their homework question. Generate a warm, encouraging opening message.

QUESTION: {questionText}
TOPIC: {topic}
DIFFICULTY: {difficulty}/5
STUDENT COMFORT: {comfortLevel}
STUDENT'S INITIAL ATTEMPT: {initialAttempt}

Your opening should:
1. Acknowledge the question warmly
2. Validate that it's a good/interesting problem
3. If they shared an initial attempt, acknowledge what they tried
4. Ask about their comfort level OR ask a probing question to understand what they know
5. Set a supportive, non-judgmental tone

Keep it brief - 2-3 sentences max.`

// ============================================================================
// Visual Update Conversion
// ============================================================================

/**
 * Convert a TutorDiagramState to a VisualUpdate for the VisualSolvingPanel.
 * Returns null for engine_image and step_sequence (they use inline rendering).
 */
function diagramToVisualUpdate(
  diagram: TutorDiagramState,
  stepNumber: number,
): VisualUpdate | null {
  const diagramType = diagram.type

  // engine_image and step_sequence are rendered inline, not in the panel
  if (diagramType === 'engine_image' || diagramType === 'step_sequence') {
    return null
  }

  const stepLabel = diagram.stepConfig?.[diagram.visibleStep]?.stepLabel || `Step ${stepNumber}`
  const stepLabelHe = diagram.stepConfig?.[diagram.visibleStep]?.stepLabelHe

  // Check if this diagram type has a hybrid (client-side) pipeline
  const hybridPipeline = getHybridPipeline(diagramType)

  if (hybridPipeline === 'desmos') {
    const desmosProps = adaptToDesmosProps(diagramType, diagram.data)
    if (desmosProps) {
      return {
        tool: 'desmos',
        action: 'replace',
        stepNumber,
        stepLabel,
        stepLabelHe,
        desmosExpressions: desmosProps.expressions.map((e) => ({
          id: e.id,
          latex: e.latex,
          color: e.color,
          label: e.label,
          hidden: e.hidden,
        })),
        desmosConfig: {
          xRange: [desmosProps.xMin ?? -10, desmosProps.xMax ?? 10],
          yRange: [desmosProps.yMin ?? -10, desmosProps.yMax ?? 10],
          showGrid: desmosProps.showGrid,
        },
        title: desmosProps.title,
      }
    }
  }

  if (hybridPipeline === 'geogebra') {
    const geogebraProps = adaptToGeoGebraProps(diagramType, diagram.data)
    if (geogebraProps) {
      return {
        tool: 'geogebra',
        action: 'replace',
        stepNumber,
        stepLabel,
        stepLabelHe,
        geogebraCommands: geogebraProps.commands.map((c) => ({
          command: c.command,
          label: c.label,
          color: c.color,
          showLabel: c.showLabel,
        })),
        title: geogebraProps.title,
      }
    }
  }

  if (hybridPipeline === 'recharts') {
    // Map the diagram data to recharts format
    const data = diagram.data
    const chartType = (data.chartType as string) || diagramType
    const chartTypeMap: Record<string, 'bar' | 'histogram' | 'pie' | 'line' | 'scatter' | 'box_plot' | 'dot_plot'> = {
      bar_chart: 'bar',
      histogram: 'histogram',
      pie_chart: 'pie',
      line_chart: 'line',
      dot_plot: 'dot_plot',
      box_plot: 'box_plot',
      frequency_table: 'bar',
      stem_leaf_plot: 'bar',
    }
    const mappedType = chartTypeMap[chartType] || 'bar'

    return {
      tool: 'recharts',
      action: 'replace',
      stepNumber,
      stepLabel,
      stepLabelHe,
      rechartsData: {
        chartType: mappedType,
        data: data.data as VisualUpdate['rechartsData'] extends { data?: infer D } ? D : never,
        // Map AI-generated 'name' field to renderer's 'label' field
        boxPlotData: Array.isArray(data.boxPlotData)
          ? (data.boxPlotData as Array<Record<string, unknown>>).map((d) => ({
              label: (d.label as string) || (d.name as string) || '',
              min: d.min as number,
              q1: d.q1 as number,
              median: d.median as number,
              q3: d.q3 as number,
              max: d.max as number,
              outliers: d.outliers as number[] | undefined,
            }))
          : undefined,
        xLabel: data.xLabel as string | undefined,
        yLabel: data.yLabel as string | undefined,
      },
      title: data.title as string | undefined,
    }
  }

  // For non-hybrid types (SVG-based), wrap the diagram in the svgDiagram field
  return {
    tool: 'svg',
    action: 'replace',
    stepNumber,
    stepLabel,
    stepLabelHe,
    svgDiagram: diagram,
    title: diagram.data.title as string | undefined,
  }
}

/**
 * Attach a visual update to a tutor response if it contains a diagram.
 * Mutates tutorResponse in place.
 */
function attachVisualUpdate(tutorResponse: TutorResponse, context: TutorContext): void {
  if (!tutorResponse.diagram) return

  const stepNumber = context.session.conversation
    .filter((m) => m.role === 'tutor')
    .length + 1
  const visualUpdate = diagramToVisualUpdate(tutorResponse.diagram, stepNumber)
  if (visualUpdate) {
    tutorResponse.visualUpdate = visualUpdate
  }
}

// ============================================================================
// Main Functions
// ============================================================================

/**
 * Generate the initial greeting when a session starts
 */
export async function generateInitialGreeting(context: TutorContext, enableDiagrams = true, explanationStyle?: ExplanationStyleId, pipelineMode: 'off' | 'quick' | 'accurate' = 'quick'): Promise<TutorResponse> {
  const client = getAnthropicClient()
  const questionText = context.questionAnalysis.questionText

  log.info(`generateInitialGreeting called with: "${questionText.slice(0, 80)}...", pipelineMode=${pipelineMode}`)
  log.info(`shouldUseEngine result: ${shouldUseEngine(questionText)}`)

  // Pipeline selection: quick forces TikZ (fast HTTP API, ~8s). Accurate uses AI router
  // (Recraft/Matplotlib/LaTeX, but can take 30-50s — too slow for greeting).
  // Exception: anatomy/biology topics need Recraft even in quick mode (TikZ can't render them).
  const isQuickMode = pipelineMode === 'quick'
  const needsRecraft = /\b(anatomy|human eye|human heart|human brain|human lung|human ear|human skin|cell structure|cell diagram|organ|dna|bacteria|virus|labeled)\b/i
  const forcePipeline = isQuickMode
    ? (needsRecraft.test(questionText) ? undefined : 'tikz' as const)
    : undefined
  const skipVerification = isQuickMode  // quick mode Recraft skips Phase 3
  const skipQA = isQuickMode
  const skipStepCapture = isQuickMode

  // Fire engine diagram in parallel with AI call (if topic needs it)
  const enginePromise: Promise<EngineResult | undefined> = enableDiagrams && shouldUseEngine(questionText)
    ? tryEngineDiagram(questionText, forcePipeline, { skipStepCapture, skipQA, skipVerification, userId: context.session.user_id }).catch((err): EngineResult => {
        log.warn('Engine diagram failed for greeting:', err)
        return { diagramStatus: { status: 'failed', reason: String(err) } }
      })
    : Promise.resolve(undefined)

  const prompt = INITIAL_GREETING_PROMPT
    .replace('{questionText}', questionText)
    .replace('{topic}', context.questionAnalysis.topic)
    .replace('{difficulty}', String(context.questionAnalysis.difficultyEstimate))
    .replace('{comfortLevel}', context.session.comfort_level || 'unknown')
    .replace('{initialAttempt}', context.session.initial_attempt || 'none provided')

  // Infer content difficulty and topic type for language/pedagogy adaptation
  const contentDifficulty = context.questionAnalysis.difficultyEstimate ||
    inferDifficultyFromTopic(context.questionAnalysis.topic)
  const topicType = classifyTopicType(
    context.questionAnalysis.topic,
    context.questionAnalysis.subject
  )

  // Apply explanation style to system prompt
  const style = getExplanationStyle(explanationStyle)
  let systemPrompt = buildSocraticTutorSystem(context.language, context.grade, context.studySystem, contentDifficulty, topicType)
  if (style.systemPromptModifier) {
    systemPrompt += '\n\n' + style.systemPromptModifier
  }
  if (style.forceLanguageLevel === 'simple') {
    systemPrompt += '\n\nIMPORTANT: Use only simple vocabulary suitable for a young learner. No jargon.'
  }

  // Inject student intelligence from Learning Intelligence Engine
  if (context.studentIntelligence) {
    const si = context.studentIntelligence
    systemPrompt += `\n\n## About This Student
${si.studentAbilitySummary}
Explanation depth: ${si.explanationDepth}
Preferred style: ${si.preferredExplanationStyle}
Scaffolding level: ${si.scaffoldingLevel}/5
${si.anticipatedMisconceptions.length > 0 ? `Common mistakes: ${si.anticipatedMisconceptions.slice(0, 3).join('; ')}` : ''}
${si.knownPrerequisiteGaps.length > 0 ? `Known weak areas: ${si.knownPrerequisiteGaps.slice(0, 5).join(', ')}` : ''}`
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: systemPrompt,
    messages: [{ role: 'user', content: prompt }],
  })

  const tutorResponse = parseTutorResponse(response)

  // Strip any ASCII diagrams from the AI response (we use the engine diagram instead)
  if (containsAsciiDiagram(tutorResponse.message)) {
    tutorResponse.message = stripAsciiDiagrams(tutorResponse.message)
  }

  // Save AI-generated diagram as fallback before engine processing
  const greetingAiDiagram = tutorResponse.diagram

  // Respect diagram mode from explanation style
  const diagramMode = style.diagramMode

  // Skip diagrams entirely for Socratic mode
  if (diagramMode === 'none') {
    delete tutorResponse.diagram
    return tutorResponse
  }

  // For step_sequence mode (Visual Builder) or multi-step problems, try step sequence
  if (enableDiagrams && (diagramMode === 'step_sequence' || isMultiStepProblem(questionText))) {
    try {
      log.info(`Multi-step problem detected, generating step sequence`)
      const sequence = await generateStepSequence(questionText)
      if (sequence.steps.length > 0) {
        tutorResponse.diagram = {
          type: 'step_sequence' as const,
          visibleStep: 0,
          totalSteps: sequence.totalSteps,
          data: {
            steps: sequence.steps,
            summary: sequence.summary,
            summaryHe: sequence.summaryHe,
            partial: sequence.partial,
          },
        }
        // Generate visual update for the panel
        attachVisualUpdate(tutorResponse, context)
        return tutorResponse
      }
    } catch (err) {
      log.warn({ detail: err }, 'Step sequence failed, falling back to single diagram')
      // Fall through to single diagram
    }
  }

  // Engine diagram takes priority over AI diagram (higher quality images)
  const engineResponse = await enginePromise
  const { engineResult, diagramStatus } = engineResponse ?? {}
  log.info(`Engine result received: ${engineResult ? 'success' : 'undefined'}`)
  tutorResponse.diagramStatus = diagramStatus
  if (engineResult) {
    log.info(`Engine result details - pipeline: ${engineResult.pipeline}, imageUrl length: ${engineResult.imageUrl?.length || 0}`)
    tutorResponse.diagram = {
      type: 'engine_image',
      visibleStep: 0,
      data: {
        imageUrl: engineResult.imageUrl,
        pipeline: engineResult.pipeline,
        overlay: engineResult.overlay,
        qaVerdict: engineResult.qaVerdict,
      },
      // Pass step-by-step source if available (TikZ pipeline only)
      stepByStepSource: engineResult.stepByStepSource,
      // Pass pre-rendered step images if available (all pipelines)
      stepImages: engineResult.stepImages,
    }
  } else if (greetingAiDiagram && (greetingAiDiagram.type === 'engine_image' || greetingAiDiagram.type === 'step_sequence')) {
    // Engine didn't produce a result — restore AI-generated diagram only if it's
    // a type the frontend can render (engine_image or step_sequence).
    tutorResponse.diagram = greetingAiDiagram
    log.info(`Using AI-generated diagram fallback (type: ${greetingAiDiagram.type})`)
  } else {
    log.info(`No engine result and no AI diagram - diagram will be undefined`)
  }

  // Generate visual update for the panel
  attachVisualUpdate(tutorResponse, context)

  return tutorResponse
}

/**
 * Generate a tutor response to a student message
 */
export async function generateTutorResponse(
  context: TutorContext,
  studentMessage: string,
  enableDiagrams = true,
  explanationStyle?: ExplanationStyleId,
  pipelineMode: 'off' | 'quick' | 'accurate' = 'quick',
): Promise<TutorResponse> {
  const client = getAnthropicClient()

  // Detect auto-start sentinel — switch to full-explanation mode
  const isAutoStart = studentMessage === '__auto_start__'
  const effectiveStudentMessage = isAutoStart
    ? 'Please explain how to solve this problem step by step.'
    : studentMessage

  // Extract previous diagram from conversation history
  const previousDiagram = getPreviousDiagram(context.recentMessages)
  const conversationTurn = context.recentMessages.length + 1

  // Build conversation context
  const contextPrompt = buildContextPrompt(context)

  // Add diagram continuation instructions if a diagram exists
  const diagramContinuationPrompt = buildDiagramContinuationPrompt(previousDiagram, conversationTurn)

  // Build messages array from conversation history
  const messages: Anthropic.MessageParam[] = []

  // Add context as first user message (including diagram continuation)
  messages.push({
    role: 'user',
    content: contextPrompt + diagramContinuationPrompt,
  })

  // Add a brief assistant acknowledgment
  messages.push({
    role: 'assistant',
    content: 'I understand. I\'m ready to help guide this student through the problem using Socratic questioning.',
  })

  // Add conversation history
  for (const msg of context.recentMessages.slice(-10)) {
    messages.push({
      role: msg.role === 'student' ? 'user' : 'assistant',
      content: msg.role === 'student'
        ? `STUDENT: ${msg.content}`
        : msg.content,
    })
  }

  // Add the new student message
  messages.push({
    role: 'user',
    content: `STUDENT: ${effectiveStudentMessage}`,
  })

  // Combine question + student message for diagram routing
  // This ensures topics like "human eye labeled" are detected from the conversation
  const diagramTopic = `${context.questionAnalysis.questionText} ${effectiveStudentMessage}`

  // Detect if student explicitly requests a diagram in their follow-up message
  // e.g., "show me the free body diagram", "draw the force diagram", "give me a visual"
  const DIAGRAM_REQUEST_PATTERN = /\b(show me|draw|display|create|make|give me|generate|see|visualize)\b.*(diagram|fbd|free body|visual|picture|image|illustration|graph|chart|force diagram)/i
  const studentRequestsDiagram = !isAutoStart && DIAGRAM_REQUEST_PATTERN.test(effectiveStudentMessage)

  if (studentRequestsDiagram) {
    log.info(`Student explicitly requested diagram. enableDiagrams=${enableDiagrams}, previousDiagram=${!!previousDiagram}. Overriding toggle.`)
  }

  // Fire engine diagram in parallel with AI call
  // Trigger when: (1) diagrams enabled and no previous diagram, OR (2) student explicitly requests a diagram
  // Note: studentRequestsDiagram overrides enableDiagrams toggle — if the student asks for a diagram, we generate it
  const engineConditions = {
    enabledOrRequested: enableDiagrams || studentRequestsDiagram,
    noPreviousOrRequested: !previousDiagram || studentRequestsDiagram,
    engineSupported: shouldUseEngine(diagramTopic),
  }
  const shouldFireEngine = engineConditions.enabledOrRequested && engineConditions.noPreviousOrRequested && engineConditions.engineSupported
  log.info(`Engine conditions: ${JSON.stringify(engineConditions)} → fire=${shouldFireEngine}, pipelineMode=${pipelineMode}`)

  // Pipeline selection: quick forces TikZ (fast HTTP API, ~8s). Accurate uses AI router
  // (Recraft/Matplotlib/LaTeX, but can take 30-50s — too slow for chat responses).
  // Exception: anatomy/biology topics need Recraft even in quick mode (TikZ can't render them).
  const isQuickMode = pipelineMode === 'quick'
  const needsRecraft = /\b(anatomy|human eye|human heart|human brain|human lung|human ear|human skin|cell structure|cell diagram|organ|dna|bacteria|virus|labeled)\b/i
  const forcePipeline = isQuickMode
    ? (needsRecraft.test(diagramTopic) ? undefined : 'tikz' as const)
    : undefined
  const skipVerification = isQuickMode  // quick mode Recraft skips Phase 3
  const skipQA = isQuickMode
  const skipStepCapture = isQuickMode

  const enginePromise: Promise<EngineResult | undefined> = shouldFireEngine
    ? tryEngineDiagram(diagramTopic, forcePipeline, { skipStepCapture, skipQA, skipVerification, userId: context.session.user_id }).catch((err): EngineResult => {
        log.warn('Engine diagram failed for chat:', err)
        return { diagramStatus: { status: 'failed', reason: String(err) } }
      })
    : Promise.resolve(undefined)

  // Infer content difficulty and topic type for language/pedagogy adaptation
  const contentDifficulty = context.questionAnalysis.difficultyEstimate ||
    inferDifficultyFromTopic(context.questionAnalysis.topic)
  const topicType = classifyTopicType(
    context.questionAnalysis.topic,
    context.questionAnalysis.subject
  )

  // Apply explanation style to system prompt
  const style = getExplanationStyle(explanationStyle)
  let chatSystemPrompt = buildSocraticTutorSystem(context.language, context.grade, context.studySystem, contentDifficulty, topicType)

  // Override with full explanation mode for auto-start
  if (isAutoStart) {
    chatSystemPrompt += FULL_EXPLANATION_SYSTEM_ADDITION
  }

  if (style.systemPromptModifier) {
    chatSystemPrompt += '\n\n' + style.systemPromptModifier
  }
  if (style.forceLanguageLevel === 'simple') {
    chatSystemPrompt += '\n\nIMPORTANT: Use only simple vocabulary suitable for a young learner. No jargon.'
  }

  // Inject student intelligence from Learning Intelligence Engine
  if (context.studentIntelligence) {
    const si = context.studentIntelligence
    chatSystemPrompt += `\n\n## About This Student
${si.studentAbilitySummary}
Explanation depth: ${si.explanationDepth}
Preferred style: ${si.preferredExplanationStyle}
Scaffolding level: ${si.scaffoldingLevel}/5
${si.anticipatedMisconceptions.length > 0 ? `Common mistakes: ${si.anticipatedMisconceptions.slice(0, 3).join('; ')}` : ''}
${si.knownPrerequisiteGaps.length > 0 ? `Known weak areas: ${si.knownPrerequisiteGaps.slice(0, 5).join(', ')}` : ''}`
  }

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: chatSystemPrompt,
    messages,
  })

  const tutorResponse = parseTutorResponse(response)

  // Strip any ASCII diagrams from the AI response
  if (containsAsciiDiagram(tutorResponse.message)) {
    tutorResponse.message = stripAsciiDiagrams(tutorResponse.message)
  }

  // Save AI-generated diagram as fallback before engine processing
  const aiDiagram = tutorResponse.diagram

  // Respect diagram mode from explanation style
  const chatDiagramMode = style.diagramMode

  // Skip diagrams entirely for Socratic mode
  if (chatDiagramMode === 'none') {
    delete tutorResponse.diagram
    return tutorResponse
  }

  // For step_sequence mode (Visual Builder) or multi-step problems with guide/show_answer intent
  // SKIP step sequence on auto-start: it generates 3-5 diagrams sequentially (30-150s)
  // which causes Vercel function timeouts. The single engine diagram (parallel) is enough.
  const intent = tutorResponse.pedagogicalIntent
  if (enableDiagrams && !previousDiagram && !isAutoStart && !isQuickMode &&
      (chatDiagramMode === 'step_sequence' ||
       (isMultiStepProblem(diagramTopic) && (intent === 'show_answer' || intent === 'guide_next_step')))) {
    try {
      log.info(`Multi-step problem with ${intent} intent, generating step sequence`)
      const sequence = await generateStepSequence(diagramTopic)
      if (sequence.steps.length > 0) {
        tutorResponse.diagram = {
          type: 'step_sequence' as const,
          visibleStep: 0,
          totalSteps: sequence.totalSteps,
          data: {
            steps: sequence.steps,
            summary: sequence.summary,
            summaryHe: sequence.summaryHe,
            partial: sequence.partial,
          },
        }
        // Generate visual update for the panel
        attachVisualUpdate(tutorResponse, context)
        return tutorResponse
      }
    } catch (err) {
      log.warn({ detail: err }, 'Step sequence failed, falling back to single diagram')
      // Fall through to single diagram
    }
  }

  // Log diagram pipeline state for debugging
  log.info(`Diagram pipeline: isAutoStart=${isAutoStart}, pipelineMode=${pipelineMode}, enableDiagrams=${enableDiagrams}, aiDiagramType=${aiDiagram?.type || 'none'}, enginePromisePending=${enginePromise !== Promise.resolve(undefined)}`)

  // For auto-start: skip waiting for engine if AI already has a renderable diagram (saves 5-15s)
  // For normal messages: engine takes priority (higher quality images)
  // Only engine_image and step_sequence are renderable — SVG component types (fbd, etc.) are NOT supported on frontend
  if (isAutoStart && aiDiagram && (aiDiagram.type === 'engine_image' || aiDiagram.type === 'step_sequence')) {
    // Use AI diagram immediately — don't wait for engine
    tutorResponse.diagram = aiDiagram
    log.info(`Auto-start: using AI diagram (type: ${aiDiagram.type}), skipping engine wait`)
  } else {
    // Engine diagram takes priority over AI diagram (higher quality images).
    // CRITICAL: The engine can take 60-90s (SymPy + AI + sandbox + TikZ + step capture).
    // Race against a hard timeout to prevent Vercel function 504 and client AbortError.
    // Auto-start gets 45s budget (must respond fast), normal messages get 60s.
    const ENGINE_TIMEOUT_MS = isAutoStart ? 45_000 : 60_000
    const engineStartTime = Date.now()
    const engineTimeout = new Promise<undefined>((resolve) =>
      setTimeout(() => resolve(undefined), ENGINE_TIMEOUT_MS)
    )
    const engineResponse = await Promise.race([enginePromise, engineTimeout])
    const engineElapsed = Date.now() - engineStartTime
    const { engineResult, diagramStatus } = engineResponse ?? {}

    if (engineResult) {
      log.info(`Engine diagram succeeded in ${engineElapsed}ms — pipeline: ${engineResult.pipeline}, imageUrl length: ${engineResult.imageUrl?.length}`)
      tutorResponse.diagram = {
        type: 'engine_image',
        visibleStep: 0,
        data: {
          imageUrl: engineResult.imageUrl,
          pipeline: engineResult.pipeline,
          overlay: engineResult.overlay,
          qaVerdict: engineResult.qaVerdict,
        },
        // Pass step-by-step source if available (TikZ pipeline only)
        stepByStepSource: engineResult.stepByStepSource,
        // Pass pre-rendered step images if available (all pipelines)
        stepImages: engineResult.stepImages,
      }
      tutorResponse.diagramStatus = diagramStatus
    } else if (!engineResult && engineElapsed >= ENGINE_TIMEOUT_MS - 100) {
      log.warn(`Engine diagram TIMED OUT after ${engineElapsed}ms (budget: ${ENGINE_TIMEOUT_MS}ms) — returning without diagram`)
      // Let engine finish in background (result is cached for next request)
      enginePromise.catch((err) => { log.warn({ err }, 'Background engine diagram failed after timeout') })
      tutorResponse.diagramStatus = { status: 'timeout', willRetryOnNext: true }
    } else {
      log.warn(`Engine diagram returned undefined in ${engineElapsed}ms (did not timeout — engine failed or was skipped)`)
      tutorResponse.diagramStatus = diagramStatus
    }

    if (!engineResult) {
      if (aiDiagram && (aiDiagram.type === 'engine_image' || aiDiagram.type === 'step_sequence')) {
        // Engine didn't produce a result — restore AI-generated diagram only if it's
        // a type the frontend can render (engine_image or step_sequence).
        // React SVG component types (fbd, coordinate_plane, etc.) are NOT supported.
        tutorResponse.diagram = aiDiagram
        log.info(`Using AI-generated diagram fallback (type: ${aiDiagram.type})`)
      } else {
        // Engine didn't produce a result and AI diagram is not renderable.
        // MUST delete to prevent non-renderable types (fbd, etc.) from reaching frontend.
        delete tutorResponse.diagram
        log.info(`No engine result. AI diagram type '${aiDiagram?.type || 'none'}' not renderable. Diagram removed.`)
      }
    }
  }

  // Generate visual update for the panel
  attachVisualUpdate(tutorResponse, context)

  return tutorResponse
}

/**
 * Check if the student's response indicates they've solved the problem
 */
export async function checkForSolution(
  context: TutorContext,
  studentAnswer: string
): Promise<{ solved: boolean; feedback: string }> {
  const client = getAnthropicClient()

  const prompt = `The student is working on this problem:
QUESTION: ${context.questionAnalysis.questionText}
TOPIC: ${context.questionAnalysis.topic}

They've provided this answer/response: "${studentAnswer}"

Has the student correctly solved the problem or arrived at the right understanding?

Return JSON: {"solved": true/false, "feedback": "brief feedback on their answer"}`

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  })

  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return { solved: false, feedback: 'Could not evaluate response' }
  }

  try {
    const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        solved: Boolean(parsed.solved),
        feedback: String(parsed.feedback || ''),
      }
    }
  } catch {
    // Fall through
  }

  return { solved: false, feedback: '' }
}

// ============================================================================
// Comfort Level Specific Responses
// ============================================================================

/**
 * Generate response tailored to comfort level
 */
export function getComfortLevelGuidance(comfortLevel: ComfortLevel): string {
  switch (comfortLevel) {
    case 'new':
      return `The student is new to this topic. Use:
- Simple language and everyday analogies
- Build from very basic concepts
- More worked examples and scaffolding
- Extra encouragement and patience`

    case 'some_idea':
      return `The student has some familiarity. Use:
- Guided discovery questions
- Connect to what they might already know
- Medium level of scaffolding
- Balance between guidance and independence`

    case 'just_stuck':
      return `The student understands but is stuck on something specific. Use:
- Targeted questions to identify the stuck point
- Minimal scaffolding - they're close
- Help them see what they might be missing
- Encourage them to trust their knowledge`

    default:
      return 'Adjust your approach based on the student\'s responses.'
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Extract the most recent diagram from conversation history
 * Returns null if no diagram found
 */
function getPreviousDiagram(recentMessages: ConversationMessage[]): TutorDiagramState | null {
  // Search backwards through messages to find most recent diagram
  for (let i = recentMessages.length - 1; i >= 0; i--) {
    const msg = recentMessages[i]
    if (msg.role === 'tutor' && msg.diagram) {
      return msg.diagram
    }
  }
  return null
}

/**
 * Build diagram continuation instructions for Claude
 * Tells Claude to continue evolving an existing diagram
 */
function buildDiagramContinuationPrompt(previousDiagram: TutorDiagramState | null, conversationTurn: number): string {
  if (!previousDiagram) {
    return '' // No previous diagram, Claude will decide if one is needed
  }

  const nextStep = (previousDiagram.visibleStep ?? 0) + 1
  // Calculate total steps from multiple sources - prefer explicit totalSteps, then stepConfig, then data.steps
  const dataSteps = (previousDiagram.data as { steps?: unknown[] })?.steps
  const totalSteps = previousDiagram.totalSteps ?? previousDiagram.stepConfig?.length ?? dataSteps?.length ?? 5

  // Don't advance if we're already at the last step
  if (nextStep >= totalSteps) {
    return `
## EXISTING DIAGRAM:
You previously created a ${previousDiagram.type} diagram (currently showing step ${previousDiagram.visibleStep}/${totalSteps}).
The diagram is complete. Only include it again if you need to reference it in your explanation.`
  }

  return `
## DIAGRAM EVOLUTION - IMPORTANT:
You previously created a ${previousDiagram.type} diagram for this problem.
Current state: Step ${previousDiagram.visibleStep}/${totalSteps}

CONTINUE EVOLVING THIS DIAGRAM with your next response:
- Increment visibleStep to ${nextStep} to reveal the next layer
- Keep the same diagram type and data structure
- Add new elements that align with what you're explaining in this message
- Update the "updatedElements" field with what's new in step ${nextStep}
- Set "evolutionMode": "auto-advance"
- Set "conversationTurn": ${conversationTurn}

The diagram should progressively reveal concepts as you guide the student through the problem.`
}

function buildContextPrompt(context: TutorContext): string {
  const { questionAnalysis, referenceAnalysis, session } = context

  let prompt = `TUTORING SESSION CONTEXT

## HOMEWORK QUESTION (READ CAREFULLY):
${questionAnalysis.questionText}

## PROBLEM DETAILS:
- SUBJECT: ${questionAnalysis.subject}
- TOPIC: ${questionAnalysis.topic}
- DIFFICULTY: ${questionAnalysis.difficultyEstimate}/5
- QUESTION TYPE: ${questionAnalysis.questionType || 'unknown'}
- ESTIMATED STEPS: ${questionAnalysis.estimatedSteps || 'unknown'}

## KEY CONCEPTS NEEDED:
${(questionAnalysis.requiredConcepts || []).map((c, i) => `${i + 1}. ${c}`).join('\n') || 'Not specified'}

## COMMON MISTAKES (watch for these):
${(questionAnalysis.commonMistakes || []).map((m) => `- ${m}`).join('\n') || 'None identified'}

## APPROACH GUIDANCE (do NOT share directly with student):
${questionAnalysis.solutionApproach}

## STUDENT INFO:
- Comfort level: ${session.comfort_level || 'not specified'}
- Initial attempt: ${session.initial_attempt || 'none provided'}
- Hints used: ${context.hintsUsed}/4
- Current progress: ${context.currentProgress}%${context.grade ? `\n- Grade: ${context.grade}` : ''}${context.studySystem && context.studySystem !== 'general' && context.studySystem !== 'other' ? `\n- Study system: ${context.studySystem}` : ''}

${getComfortLevelGuidance(session.comfort_level || 'some_idea')}

## ACCURACY REMINDER:
- Before giving any hint, mentally verify it leads to the CORRECT approach
- If student's work looks correct, DO NOT imply it's wrong
- Double-check any numbers or calculations before mentioning them`

  if (referenceAnalysis && referenceAnalysis.extractedContent) {
    prompt += `

## REFERENCE MATERIALS (from student's notes/textbook):
${referenceAnalysis.extractedContent.slice(0, 2500)}

## KEY FORMULAS (use these when helping):
${(referenceAnalysis.keyFormulas || []).map((f, i) => `${i + 1}. ${f}`).join('\n') || 'None extracted'}

## KEY DEFINITIONS:
${(referenceAnalysis.keyDefinitions || []).slice(0, 5).map((d, i) => `${i + 1}. ${d}`).join('\n') || 'None extracted'}`
  }

  return prompt
}

function parseTutorResponse(response: Anthropic.Message): TutorResponse {
  const textContent = response.content.find((b) => b.type === 'text')
  if (!textContent || textContent.type !== 'text') {
    return getDefaultResponse()
  }

  const text = textContent.text

  // Try to parse JSON response
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        message: String(parsed.message || text),
        pedagogicalIntent: validateIntent(parsed.pedagogicalIntent),
        detectedUnderstanding: Boolean(parsed.detectedUnderstanding),
        detectedMisconception: parsed.detectedMisconception || null,
        suggestedNextAction: String(parsed.suggestedNextAction || ''),
        estimatedProgress: Math.min(100, Math.max(0, Number(parsed.estimatedProgress) || 0)),
        shouldEndSession: Boolean(parsed.shouldEndSession),
        celebrationMessage: parsed.celebrationMessage || undefined,
        diagram: parseDiagramResponse(parsed.diagram),
      }
    }
  } catch {
    // Fall through to plain text handling
  }

  // If no JSON, use the text as-is
  return {
    message: text,
    pedagogicalIntent: 'guide_next_step',
    detectedUnderstanding: false,
    detectedMisconception: null,
    suggestedNextAction: '',
    estimatedProgress: 0,
    shouldEndSession: false,
  }
}

/**
 * Parse and validate diagram response from tutor
 */
function parseDiagramResponse(diagram: unknown): TutorResponse['diagram'] {
  if (!diagram || typeof diagram !== 'object') {
    return undefined
  }

  const d = diagram as Record<string, unknown>

  // Validate required fields - includes both physics and math diagram types
  // Valid diagram types — kept in sync with lib/diagram-engine/router.ts type lists
  // Includes both server-side (visual-learning) and client-side (hybrid) renderer types
  const validTypes = [
    // Physics diagrams (server-side visual-learning renderers)
    'fbd', 'inclined_plane', 'projectile', 'pulley', 'circuit', 'wave', 'optics', 'motion',
    'collision', 'circular_motion', 'energy', 'pendulum',
    // Math diagrams (server-side visual-learning renderers)
    'long_division', 'equation', 'fraction', 'number_line', 'circle', 'bar_model', 'area_model',
    'quadratic', 'linear', 'systems_of_equations', 'inequality',
    // Chemistry diagrams (server-side visual-learning renderers)
    'atom', 'molecule', 'reaction', 'energy_diagram',
    // Biology diagrams (server-side visual-learning renderers)
    'cell', 'dna', 'system', 'process_flow',
    // Desmos types (client-side hybrid renderers — see router.ts DESMOS_TYPES)
    'coordinate_plane', 'function_graph', 'linear_equation', 'quadratic_graph',
    'inequality_graph', 'system_of_equations', 'scatter_plot_regression',
    'trigonometric_graph', 'piecewise_function', 'parametric_curve', 'polar_graph',
    // GeoGebra types (client-side hybrid renderers — see router.ts GEOGEBRA_TYPES)
    'triangle', 'circle_geometry', 'angle_measurement', 'parallel_lines',
    'polygon', 'transformation', 'congruence', 'similarity',
    'pythagorean_theorem', 'circle_theorems', 'construction',
    // Recharts types (client-side hybrid renderers — see router.ts RECHARTS_TYPES)
    'box_plot', 'histogram', 'dot_plot', 'bar_chart', 'pie_chart',
    'line_chart', 'stem_leaf_plot', 'frequency_table',
    // Mermaid types (client-side hybrid renderers — see router.ts MERMAID_TYPES)
    'tree_diagram', 'flowchart', 'sequence_diagram', 'factor_tree', 'probability_tree',
  ]
  if (!d.type || !validTypes.includes(String(d.type))) {
    return undefined
  }

  if (!d.data || typeof d.data !== 'object') {
    return undefined
  }

  // Type is one of the valid diagram types
  type DiagramType = NonNullable<TutorResponse['diagram']>['type']

  // Map tutor diagram types to visual-learning types for validation
  const visualTypeMap: Record<string, VisualDiagramType | null> = {
    'fbd': 'free_body_diagram',
    'inclined_plane': 'inclined_plane',
    'projectile': 'projectile_motion',
    'circular_motion': 'circular_motion',
    'collision': 'collision',
    'energy': null, // No direct mapping yet
    'pendulum': 'pendulum',
    'coordinate_plane': 'coordinate_plane',
    'number_line': 'number_line',
    'long_division': 'long_division',
    'triangle': 'triangle',
    'circle': 'circle',
    'atom': 'atom',
    'molecule': 'molecule',
  }

  const diagramType = String(d.type) as DiagramType
  const visualType = visualTypeMap[diagramType]

  // Validate and auto-correct if we have a mapping
  let validatedData = d.data as Record<string, unknown>
  if (visualType) {
    try {
      // Create a StructuredDiagram for validation
      const structuredDiagram: StructuredDiagram = {
        type: visualType,
        data: d.data as never, // Type cast since data structure varies
        steps: [],
        source: 'ai',
        confidence: 0.8,
        schemaVersion: SCHEMA_VERSION,
      }

      const result = validateSchema(structuredDiagram)

      // If validation found issues, try auto-correction
      if (!result.valid || result.warnings.length > 0) {
        const corrected = autoCorrectDiagram(structuredDiagram)
        validatedData = corrected.data as unknown as Record<string, unknown>
      }

      // Log warnings for debugging (in development)
      if (process.env.NODE_ENV === 'development' && result.warnings.length > 0) {
        log.info({ detail: result.warnings.map(w => w.message) }, `${visualType}`)
      }
    } catch {
      // If validation fails, use original data
    }
  }

  return {
    type: diagramType,
    data: validatedData,
    visibleStep: typeof d.visibleStep === 'number' ? d.visibleStep : 0,
    totalSteps: typeof d.totalSteps === 'number' ? d.totalSteps : undefined,
    stepConfig: Array.isArray(d.stepConfig) ? d.stepConfig : undefined,
  }
}

function validateIntent(intent: unknown): PedagogicalIntent {
  const valid: PedagogicalIntent[] = [
    'probe_understanding',
    'give_hint',
    'celebrate',
    'clarify',
    'guide_next_step',
    'show_answer',
    'summarize',
  ]
  if (typeof intent === 'string' && valid.includes(intent as PedagogicalIntent)) {
    return intent as PedagogicalIntent
  }
  return 'guide_next_step'
}

function getDefaultResponse(): TutorResponse {
  return {
    message: "I'm here to help! Could you tell me more about what you're thinking?",
    pedagogicalIntent: 'probe_understanding',
    detectedUnderstanding: false,
    detectedMisconception: null,
    suggestedNextAction: 'Share your current thinking',
    estimatedProgress: 0,
    shouldEndSession: false,
  }
}
