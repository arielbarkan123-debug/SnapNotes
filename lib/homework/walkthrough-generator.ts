/**
 * Walkthrough Generator
 *
 * Makes a single Claude call to generate a structured step-by-step solution
 * with layered TikZ code and bilingual explanations. Returns a WalkthroughSolution
 * that can be streamed to the client and compiled into step images.
 */

import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'
import { getAdvancedGuidance } from '@/lib/diagram-engine/tikz/advanced-fallback'
import type { WalkthroughSolution, WalkthroughStep } from '@/types/walkthrough'

// ============================================================================
// Walkthrough-Specific TikZ Prompt (replaces generic TIKZ_CORE_PROMPT)
// ============================================================================

const WALKTHROUGH_TIKZ_PROMPT = `You are a LaTeX/TikZ expert generating LAYERED diagrams for step-by-step walkthroughs.
Each layer will be compiled SEPARATELY via QuickLaTeX (limited remote pdflatex).

OUTPUT FORMAT:
- Output ONLY raw LaTeX inside the JSON tikzCode field.
- Start with \\usetikzlibrary if needed, then \\begin{tikzpicture}...\\end{tikzpicture}
- Use ONLY these TikZ libraries: arrows.meta, calc, positioning

QUICKLATEX LIMITS — CRITICAL:
BANNED (will crash): \\pgfmathsetmacro, \\pgfmathparse, plot[domain=...], \\foreach > 8 iters, \\definecolor{...}{RGB}{...}, decorations.markings, gradient fills.
SAFE: \\draw[smooth] plot coordinates {(x1,y1) (x2,y2)...}, pre-computed decimal numbers, built-in xcolor names (red, blue!70, green!60!black).
PRE-COMPUTE ALL coordinates as decimal numbers before writing code.

SPATIAL ZONE PLANNING — MUST FOLLOW:
Before writing TikZ, mentally divide the canvas into zones:
- TOP ZONE (y > main content): max-height labels, titles
- LEFT MARGIN (x < -0.5 from content): vertical dimension lines (heights)
- RIGHT MARGIN (x > content + 0.5): vertical annotations
- BOTTOM ZONE (y < -0.5 from content): horizontal dimension lines (widths, ranges)
- CENTER: the actual physics/math diagram
Never place labels inside the CENTER zone unless they are anchored to avoid overlap.

DIMENSION LINE CONVENTIONS (physics standard):
- HEIGHT labels: Vertical double-arrow on the LEFT side, label to the left:
  \\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (-0.8,0) -- (-0.8,3) node[midway, left, fill=white, inner sep=2pt] {$h = 15$ m};
- WIDTH/RANGE labels: Horizontal double-arrow BELOW the diagram, label below:
  \\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (0,-0.8) -- (5,-0.8) node[midway, below, fill=white, inner sep=2pt] {$R$};
- ANGLE labels: Arc placed OUTSIDE the angle, with explicit anchor:
  \\draw (0.8,0) arc (0:30:0.8); \\node[above right, fill=white, inner sep=1pt] at (0.9,0.25) {$30^{\\circ}$};

LABEL ANCHORING RULES — EVERY node MUST have positioning:
- Above a line: use "above" or anchor=south
- Below a line: use "below" or anchor=north
- Left of a point: use "left" or anchor=east
- Right of a point: use "right" or anchor=west
- NEVER use bare node{text} without a position — it WILL overlap other elements.
- ALL label nodes MUST have: fill=white, inner sep=2pt

VELOCITY VECTOR CONVENTIONS (for physics):
- v_0 (initial velocity): diagonal arrow FROM launch point, label ABOVE RIGHT of the arrow tip
- v_x (horizontal component): horizontal arrow FROM launch point, label BELOW the arrow
- v_y (vertical component): vertical arrow FROM launch point, label to the LEFT of the arrow
- Space components at least 0.8 TikZ units from each other to prevent overlap
- Draw components as dashed arrows, v_0 as solid thick arrow

CHARACTER BUDGET:
- Each LAYER: 300-500 characters max
- Total TikZ code: under 2500 characters (compiled multiple times)
- Keep it SIMPLE — fewer lines with correct placement beats more lines with overlaps

NO RED COLORING — CRITICAL:
Do NOT use \\color{red}, \\textcolor{red}, red fill, or any red in your TikZ code.
The build system automatically highlights new elements per step using a separate mechanism.
If you add red, it will conflict and create visual artifacts.

GENERAL DRAWING RULES:
- Scale: use scale=1.3 to 1.8
- ARROWS: use -{Stealth[length=3mm,width=2mm]} with very thick
- FLAT 2D ONLY: no 3D, no shading, no decorative elements
- COLORS: blue!70, green!60!black, orange!80!black, black for outlines
- Use \\draw arc for angles. NEVER use \\pic.
- No Unicode characters — use LaTeX: ^{\\circ}, \\theta, \\alpha, etc.`

// ============================================================================
// Reference layered template for projectile-from-building
// ============================================================================

const PROJECTILE_LAYERED_TEMPLATE = `
REFERENCE LAYERED TEMPLATE — Projectile from elevated position:
Follow this structure EXACTLY. Only change numbers/labels to match the problem.

\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Setup scene ===
% Ground
\\draw[thick] (-1.5,0) -- (10,0);
% Building
\\fill[gray!15] (0,0) rectangle (1.2,3);
\\draw[thick] (0,0) rectangle (1.2,3);
% Height dimension on LEFT side (not bottom!)
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick] (-0.6,0) -- (-0.6,3)
  node[midway, left, fill=white, inner sep=2pt] {$h=15$ m};
% === LAYER 2: Launch velocity ===
% v_0 diagonal arrow
\\draw[-{Stealth[length=3mm,width=2mm]}, very thick, blue!70] (1.2,3) -- (2.9,3.98)
  node[above right, fill=white, inner sep=2pt] {$\\vec{v}_0=20$ m/s};
% Angle arc
\\draw[thick] (2.0,3) arc (0:30:0.8);
\\node[above right, fill=white, inner sep=1pt] at (2.1,3.15) {$30^{\\circ}$};
% v_x component (BELOW, dashed)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, green!60!black] (1.2,3) -- (2.9,3)
  node[below, fill=white, inner sep=2pt] {$v_x=17.3$};
% v_y component (LEFT, dashed)
\\draw[-{Stealth[length=2.5mm]}, thick, dashed, orange!80!black] (1.2,3) -- (1.2,4)
  node[left, fill=white, inner sep=2pt] {$v_y=10$};
% === LAYER 3: Trajectory ===
\\draw[very thick, blue!70, smooth] plot coordinates {
  (1.2,3.0) (2.5,3.6) (3.8,3.7) (5.1,3.3) (6.4,2.4) (7.7,1.1) (8.6,0.0)
};
\\fill[blue!70] (1.2,3) circle (3pt);
\\fill[blue!70] (8.6,0) circle (3pt);
% Max height dashed line
\\draw[dashed, gray] (3.8,0) -- (3.8,3.7);
\\node[above, fill=white, inner sep=2pt] at (3.8,3.7) {$H_{max}$};
% === LAYER 4: Final answer ===
% Range arrow BELOW ground
\\draw[{Stealth[length=2mm]}-{Stealth[length=2mm]}, thick, green!60!black] (1.2,-0.6) -- (8.6,-0.6)
  node[midway, below, fill=white, inner sep=2pt] {$R=47.0$ m};
\\node[below=0.2cm, fill=white, inner sep=2pt] at (8.6,0) {Landing};
\\end{tikzpicture}`

// ============================================================================
// Build system prompt with optional topic guidance
// ============================================================================

function buildWalkthroughSystemPrompt(questionText: string): string {
  const topicGuidance = getAdvancedGuidance(questionText)

  // Detect if question involves elevated launch / building / cliff
  const lower = questionText.toLowerCase()
  const isProjectile = /projectile|trajectory|launch|thrown|throw|angle|range|building|cliff|height|elevation|ball.*m\/s/.test(lower)

  return `You are an expert math and physics tutor creating a step-by-step solution walkthrough.

Your task: Given a student's question, produce a STRUCTURED JSON response containing:
1. A step-by-step solution with bilingual explanations
2. Complete layered TikZ code with LAYER markers for an evolving diagram

${WALKTHROUGH_TIKZ_PROMPT}

${topicGuidance ? `TOPIC-SPECIFIC GUIDANCE:\n${topicGuidance}\n` : ''}
${isProjectile ? `LAYERED TEMPLATE FOR THIS PROBLEM TYPE:\n${PROJECTILE_LAYERED_TEMPLATE}\n` : ''}
WALKTHROUGH LAYER RULES:
- Structure TikZ with % === LAYER N: Description === markers (one per solution step)
- Each LAYER adds NEW elements cumulative to the diagram
- Use ABSOLUTE coordinates only — elements must not shift when layers are added
- Number of LAYER markers MUST equal number of steps

RESPONSE FORMAT — Output ONLY valid JSON, no markdown fences:
{
  "steps": [
    {
      "index": 0,
      "title": "Short title (3-6 words)",
      "titleHe": "כותרת קצרה בעברית",
      "explanation": "1-3 sentence explanation with inline LaTeX math ($...$). Explain the WHY, not just WHAT.",
      "explanationHe": "הסבר בעברית עם נוסחאות LaTeX",
      "equation": "v_x = v_0 \\\\cos\\\\theta = 20 \\\\cos 30^{\\\\circ} = 17.32 \\\\text{ m/s}",
      "newElements": "Brief description of new diagram elements"
    }
  ],
  "tikzCode": "\\\\usetikzlibrary{arrows.meta}\\n\\\\begin{tikzpicture}[scale=1.5]\\n% === LAYER 1: Setup scene ===\\n...\\n% === LAYER 2: Add forces ===\\n...\\n\\\\end{tikzpicture}",
  "finalAnswer": "The range is approximately 47.5 meters",
  "finalAnswerHe": "הטווח הוא כ-47.5 מטר"
}

STEP GUIDELINES:
- 3-5 steps total (not more, not fewer)
- Step 1: Identify given information and set up the problem
- Middle steps: Show key calculations/derivations
- Last step: State the final answer and verify
- Each step's explanation MUST use inline LaTeX: $v_0 = 20$ m/s, NOT "v₀ = 20 m/s"
- The "equation" field should contain the KEY equation for that step in LaTeX
- Hebrew translations must be natural, not word-for-word

TIKZ LAYER ORDER (must match steps 1:1):
- LAYER 1 → matches step[0] (index 0)
- LAYER 2 → matches step[1] (index 1)
- etc.
- Number of LAYER markers MUST equal number of steps`
}

// ============================================================================
// Generator
// ============================================================================

/**
 * Generate a structured walkthrough solution from a question.
 *
 * Returns the parsed WalkthroughSolution or throws on failure.
 * The caller should handle errors and update generation_status accordingly.
 */
export async function generateWalkthroughSolution(
  questionText: string,
  imageUrls?: string[],
): Promise<WalkthroughSolution> {
  const anthropic = getAnthropicClient()

  // Build user message with optional images
  const userContent: Array<{ type: 'text'; text: string } | { type: 'image'; source: { type: 'url'; url: string } }> = []

  if (imageUrls && imageUrls.length > 0) {
    for (const url of imageUrls) {
      userContent.push({
        type: 'image' as const,
        source: { type: 'url' as const, url },
      })
    }
  }

  userContent.push({
    type: 'text',
    text: `Generate a step-by-step solution walkthrough for this question:\n\n${questionText}\n\nRespond with ONLY the JSON object. No markdown, no explanation, no code fences.`,
  })

  // Build system prompt dynamically with topic-specific guidance
  const systemPrompt = buildWalkthroughSystemPrompt(questionText)

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: systemPrompt,
    messages: [
      {
        role: 'user',
        content: userContent as Anthropic.Messages.ContentBlockParam[],
      },
    ],
  })

  // Extract text response
  const textBlock = message.content.find(b => b.type === 'text')
  if (!textBlock || textBlock.type !== 'text') {
    throw new Error('No text response from Claude')
  }

  // Parse JSON (strip markdown fences if present)
  let jsonText = textBlock.text.trim()
  const fenceMatch = jsonText.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
  if (fenceMatch) {
    jsonText = fenceMatch[1].trim()
  }

  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    // Try to find JSON object in the response
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error(`Failed to parse walkthrough JSON: ${jsonText.slice(0, 200)}`)
    }
    parsed = JSON.parse(jsonMatch[0])
  }

  // Validate structure
  if (!Array.isArray(parsed.steps) || parsed.steps.length === 0) {
    throw new Error('Walkthrough response missing steps array')
  }
  if (typeof parsed.tikzCode !== 'string' || !parsed.tikzCode.includes('\\begin{tikzpicture}')) {
    throw new Error('Walkthrough response missing valid tikzCode')
  }

  // Build typed solution
  const steps: WalkthroughStep[] = (parsed.steps as Array<Record<string, unknown>>).map((s, i) => ({
    index: typeof s.index === 'number' ? s.index : i,
    title: String(s.title || `Step ${i + 1}`),
    titleHe: String(s.titleHe || s.title || `שלב ${i + 1}`),
    explanation: String(s.explanation || ''),
    explanationHe: String(s.explanationHe || s.explanation || ''),
    equation: s.equation ? String(s.equation) : undefined,
    newElements: s.newElements ? String(s.newElements) : undefined,
  }))

  return {
    steps,
    tikzCode: String(parsed.tikzCode),
    finalAnswer: String(parsed.finalAnswer || ''),
    finalAnswerHe: String(parsed.finalAnswerHe || parsed.finalAnswer || ''),
  }
}

// Type import for Anthropic SDK (only used for type annotation)
import type Anthropic from '@anthropic-ai/sdk'
