/**
 * Parse step metadata JSON from AI response text.
 *
 * The AI is instructed to output a JSON block at the end of its response:
 * { "steps": [{ "step": 1, "label": "...", "labelHe": "...", "explanation": "...", "explanationHe": "..." }] }
 */

export interface StepMetadataEntry {
  step: number
  label: string
  labelHe: string
  explanation: string
  explanationHe: string
}

/**
 * Extract and validate step metadata from AI response text.
 * Returns null if parsing fails or metadata is invalid.
 */
export function parseStepMetadata(text: string): StepMetadataEntry[] | null {
  try {
    // Strip markdown code fences if present
    let jsonText = text
    const fenceMatch = text.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) {
      jsonText = fenceMatch[1].trim()
    }

    // Try to find a JSON object or array
    const jsonMatch = jsonText.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (!jsonMatch) return null

    const parsed = JSON.parse(jsonMatch[1])

    // Handle both { "steps": [...] } and direct array
    const steps: unknown[] = Array.isArray(parsed)
      ? parsed
      : parsed?.steps

    if (!Array.isArray(steps) || steps.length === 0) return null

    // Validate each entry
    const validated: StepMetadataEntry[] = []
    for (const entry of steps) {
      if (!entry || typeof entry !== 'object') return null
      const e = entry as Record<string, unknown>

      if (
        typeof e.step !== 'number' ||
        typeof e.label !== 'string' ||
        typeof e.labelHe !== 'string' ||
        typeof e.explanation !== 'string' ||
        typeof e.explanationHe !== 'string'
      ) {
        return null
      }

      validated.push({
        step: e.step,
        label: e.label,
        labelHe: e.labelHe,
        explanation: e.explanation,
        explanationHe: e.explanationHe,
      })
    }

    return validated
  } catch {
    return null
  }
}
