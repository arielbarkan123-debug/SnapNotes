/**
 * Socratic Tutor Engine
 * Core tutoring logic that guides students through homework problems
 * using research-backed pedagogical approaches
 */

import Anthropic from '@anthropic-ai/sdk'
import type {
  TutorResponse,
  TutorContext,
  ComfortLevel,
  PedagogicalIntent,
  ConversationMessage,
  TutorDiagramState,
} from './types'
import { ensureDiagramInResponse, generateDiagramFromTutorMessage } from './diagram-generator'

// ============================================================================
// Configuration
// ============================================================================

const AI_MODEL = 'claude-sonnet-4-5-20250929'
const MAX_TOKENS = 2048

let anthropicClient: Anthropic | null = null

function getAnthropicClient(): Anthropic {
  if (!anthropicClient) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY environment variable is not set')
    }
    anthropicClient = new Anthropic({ apiKey })
  }
  return anthropicClient
}

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

/**
 * Build language-specific instruction for Hebrew support
 */
function buildLanguageInstruction(language?: 'en' | 'he'): string {
  if (language === 'he') {
    return `
## Language Requirement - CRITICAL
Respond ONLY in Hebrew (עברית).
- All messages, questions, and feedback must be in Hebrew
- Keep mathematical notation standard (numbers, symbols, formulas)
- Use proper Hebrew educational terminology
- Maintain a warm, supportive tone in Hebrew
`
  }
  return ''
}

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
**Biology:** cell, system, process_flow

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
 * Build the complete system prompt with optional language instruction
 */
function buildSocraticTutorSystem(language?: 'en' | 'he'): string {
  const languageInstruction = buildLanguageInstruction(language)
  return SOCRATIC_TUTOR_SYSTEM_BASE + languageInstruction
}

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
// Main Functions
// ============================================================================

/**
 * Generate the initial greeting when a session starts
 */
export async function generateInitialGreeting(context: TutorContext): Promise<TutorResponse> {
  const client = getAnthropicClient()

  const prompt = INITIAL_GREETING_PROMPT
    .replace('{questionText}', context.questionAnalysis.questionText)
    .replace('{topic}', context.questionAnalysis.topic)
    .replace('{difficulty}', String(context.questionAnalysis.difficultyEstimate))
    .replace('{comfortLevel}', context.session.comfort_level || 'unknown')
    .replace('{initialAttempt}', context.session.initial_attempt || 'none provided')

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSocraticTutorSystem(context.language),
    messages: [{ role: 'user', content: prompt }],
  })

  const tutorResponse = parseTutorResponse(response)

  // Ensure diagram is present for physics/math problems
  const originalDiagram = tutorResponse.diagram
  tutorResponse.diagram = ensureDiagramInResponse(
    context.questionAnalysis,
    tutorResponse.diagram
  )

  // ENHANCED: If no diagram yet, also check the tutor's response message for division
  // This catches cases where the original question didn't have "divide" keywords
  // but the tutor's explanation does
  if (!tutorResponse.diagram && containsAsciiDiagram(tutorResponse.message)) {
    const diagramFromMessage = generateDiagramFromTutorMessage(tutorResponse.message)
    if (diagramFromMessage) {
      tutorResponse.diagram = diagramFromMessage
    }
  }

  // If we generated a fallback diagram and message has ASCII diagrams, clean them up
  if (!originalDiagram && tutorResponse.diagram && containsAsciiDiagram(tutorResponse.message)) {
    tutorResponse.message = stripAsciiDiagrams(tutorResponse.message)
  }

  return tutorResponse
}

/**
 * Generate a tutor response to a student message
 */
export async function generateTutorResponse(
  context: TutorContext,
  studentMessage: string
): Promise<TutorResponse> {
  const client = getAnthropicClient()

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
    content: `STUDENT: ${studentMessage}`,
  })

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS,
    system: buildSocraticTutorSystem(context.language),
    messages,
  })

  const tutorResponse = parseTutorResponse(response)

  // Set diagram metadata if diagram was returned
  if (tutorResponse.diagram) {
    tutorResponse.diagram.evolutionMode = 'auto-advance'
    tutorResponse.diagram.conversationTurn = conversationTurn
  }

  // Ensure diagram is present for physics/math problems (fallback generation)
  const originalDiagram = tutorResponse.diagram
  tutorResponse.diagram = ensureDiagramInResponse(
    context.questionAnalysis,
    tutorResponse.diagram
  )

  // ENHANCED: If no diagram yet, also check the tutor's response message for division
  // This catches cases where the original question didn't have "divide" keywords
  // but the tutor's explanation does (e.g., "7,248 crayons ÷ 8 boxes")
  if (!tutorResponse.diagram && containsAsciiDiagram(tutorResponse.message)) {
    const diagramFromMessage = generateDiagramFromTutorMessage(tutorResponse.message)
    if (diagramFromMessage) {
      tutorResponse.diagram = diagramFromMessage
    }
  }

  // If we generated a fallback diagram and message has ASCII diagrams, clean them up
  if (!originalDiagram && tutorResponse.diagram && containsAsciiDiagram(tutorResponse.message)) {
    tutorResponse.message = stripAsciiDiagrams(tutorResponse.message)
  }

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
- Current progress: ${context.currentProgress}%

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
  const validTypes = [
    // Physics diagrams
    'fbd', 'inclined_plane', 'projectile', 'pulley', 'circuit', 'wave', 'optics', 'motion',
    'collision', 'circular_motion', 'energy', 'pendulum',
    // Math diagrams
    'long_division', 'equation', 'fraction', 'number_line', 'coordinate_plane', 'triangle', 'circle', 'bar_model', 'area_model',
    'quadratic', 'linear', 'systems_of_equations', 'inequality',
    // Chemistry diagrams
    'atom', 'molecule', 'reaction', 'energy_diagram',
    // Biology diagrams
    'cell', 'dna', 'system', 'process_flow',
  ]
  if (!d.type || !validTypes.includes(String(d.type))) {
    return undefined
  }

  if (!d.data || typeof d.data !== 'object') {
    return undefined
  }

  // Type is one of the valid diagram types
  type DiagramType = NonNullable<TutorResponse['diagram']>['type']

  return {
    type: String(d.type) as DiagramType,
    data: d.data as Record<string, unknown>,
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
