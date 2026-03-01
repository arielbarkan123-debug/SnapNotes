/**
 * Formula Scanner Analyzer
 *
 * Uses Claude Vision to extract formulas from images,
 * then analyzes each symbol, derivation, and relationships.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaSymbol {
  symbol: string       // e.g., "E"
  latex: string        // e.g., "E"
  name: string         // English name
  nameHe: string       // Hebrew name
  meaning: string      // English meaning
  meaningHe: string    // Hebrew meaning
  units: string        // e.g., "Joules (J)"
  typicalRange?: string // e.g., "any positive value"
}

export interface FormulaAnalysis {
  latex: string           // Full formula in LaTeX
  name: string            // English name (e.g., "Einstein's Mass-Energy Equivalence")
  nameHe: string          // Hebrew name
  subject: string         // e.g., "Physics", "Mathematics"
  symbols: FormulaSymbol[]
  derivation: string      // English derivation/explanation
  derivationHe: string    // Hebrew derivation
  relatedFormulas: Array<{
    latex: string
    name: string
    nameHe: string
    relationship: string  // How it relates
  }>
  practiceQuestion: string    // A practice question using this formula
  practiceQuestionHe: string
  practiceAnswer: string      // Answer to the practice question
  practiceAnswerHe: string
}

// ─── Claude Analysis ─────────────────────────────────────────────────────────

const ANALYZE_FORMULA_PROMPT = `You are a mathematics and science expert. Analyze the given formula and provide a comprehensive breakdown.

Return JSON (no markdown code blocks):
{
  "latex": "The formula in LaTeX notation",
  "name": "English name of the formula",
  "nameHe": "Hebrew name of the formula",
  "subject": "Subject area (Physics, Mathematics, Chemistry, etc.)",
  "symbols": [
    {
      "symbol": "Display symbol",
      "latex": "LaTeX for this symbol",
      "name": "English name",
      "nameHe": "Hebrew name",
      "meaning": "What this symbol represents in English",
      "meaningHe": "What this symbol represents in Hebrew",
      "units": "SI units (or 'dimensionless')",
      "typicalRange": "Typical values or range (optional)"
    }
  ],
  "derivation": "Brief derivation or explanation of where this formula comes from (2-4 sentences, English)",
  "derivationHe": "Same derivation in Hebrew",
  "relatedFormulas": [
    {
      "latex": "Related formula in LaTeX",
      "name": "English name",
      "nameHe": "Hebrew name",
      "relationship": "How it relates to the main formula"
    }
  ],
  "practiceQuestion": "A concrete practice problem using this formula (English)",
  "practiceQuestionHe": "Same question in Hebrew",
  "practiceAnswer": "Step-by-step solution (English)",
  "practiceAnswerHe": "Same solution in Hebrew"
}

Rules:
- Include ALL symbols in the formula, including constants
- Derivation should be accessible to a high school student
- Practice question should use concrete numbers
- Related formulas: 2-3 max
- If the formula is from a specific curriculum context, mention it
- Always provide both English AND Hebrew for every text field`

/**
 * Lazy-initialize Anthropic client to avoid module-level env var access
 */
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }
  return new Anthropic({ apiKey })
}

/**
 * Analyze a formula from LaTeX text input.
 */
export async function analyzeFormulaFromText(latexText: string): Promise<FormulaAnalysis> {
  const client = getClient()

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: ANALYZE_FORMULA_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze this formula: ${latexText}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse formula analysis response')
  }

  return JSON.parse(jsonMatch[0]) as FormulaAnalysis
}

/**
 * Extract formula from image using Claude Vision, then analyze it.
 */
export async function analyzeFormulaFromImage(imageUrl: string): Promise<FormulaAnalysis> {
  const client = getClient()

  // Step 1: Extract LaTeX from image
  const extractResponse = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: 'Extract the mathematical formula from this image and write it in LaTeX notation. Return ONLY the LaTeX formula, nothing else. If there are multiple formulas, return the main/primary one.',
        },
      ],
    }],
  })

  const extractedLatex = extractResponse.content[0].type === 'text'
    ? extractResponse.content[0].text.trim()
    : ''

  if (!extractedLatex) {
    throw new Error('Could not extract a formula from the image')
  }

  // Step 2: Analyze the extracted formula
  const analysis = await analyzeFormulaFromText(extractedLatex)

  // Override latex with what was extracted (in case AI modified it)
  analysis.latex = extractedLatex

  return analysis
}
