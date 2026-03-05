import { parseStepMetadata } from '@/lib/diagram-engine/step-capture/parse-metadata'

describe('parseStepMetadata', () => {
  it('parses valid JSON block from AI response', () => {
    const response = `Here is your code...

\`\`\`json
{ "steps": [
  { "step": 1, "label": "Draw the object", "labelHe": "ציור העצם", "explanation": "We start by...", "explanationHe": "מתחילים ב..." },
  { "step": 2, "label": "Add weight", "labelHe": "הוספת משקל", "explanation": "Next we add...", "explanationHe": "לאחר מכן..." }
]}
\`\`\``

    const result = parseStepMetadata(response)
    expect(result).toHaveLength(2)
    expect(result![0].label).toBe('Draw the object')
    expect(result![1].labelHe).toBe('הוספת משקל')
  })

  it('parses JSON without code fences', () => {
    const response = `{ "steps": [
      { "step": 1, "label": "Setup", "labelHe": "הגדרה", "explanation": "First...", "explanationHe": "ראשית..." }
    ]}`

    const result = parseStepMetadata(response)
    expect(result).toHaveLength(1)
  })

  it('returns null for invalid JSON', () => {
    const result = parseStepMetadata('not json at all')
    expect(result).toBeNull()
  })

  it('returns null for JSON missing required fields', () => {
    const result = parseStepMetadata('{ "steps": [{ "step": 1, "label": "only label" }] }')
    expect(result).toBeNull()
  })

  it('handles steps array at top level', () => {
    const response = `[
      { "step": 1, "label": "A", "labelHe": "א", "explanation": "E", "explanationHe": "ה" }
    ]`
    const result = parseStepMetadata(response)
    expect(result).toHaveLength(1)
  })
})
