import { DIAGRAM_SCHEMAS, getDiagramSchemaPrompt } from '@/lib/diagram-schemas'

describe('DIAGRAM_SCHEMAS', () => {
  it('has schemas for all currently implemented math types', () => {
    const mathTypes = [
      'long_division', 'equation', 'fraction', 'number_line',
      'coordinate_plane', 'factoring', 'completing_square',
      'polynomial', 'radical', 'systems', 'inequality',
    ]
    for (const type of mathTypes) {
      expect(DIAGRAM_SCHEMAS[type]).toBeDefined()
      expect(DIAGRAM_SCHEMAS[type].type).toBe(type)
      expect(DIAGRAM_SCHEMAS[type].description).toBeTruthy()
      expect(DIAGRAM_SCHEMAS[type].jsonExample).toBeTruthy()
    }
  })

  it('has schemas for physics types', () => {
    expect(DIAGRAM_SCHEMAS.fbd).toBeDefined()
    expect(DIAGRAM_SCHEMAS.fbd.subject).toBe('physics')
  })

  it('each schema has required fields', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(schema.type).toBe(key)
      expect(schema.subject).toBeTruthy()
      expect(schema.description).toBeTruthy()
      expect(schema.jsonExample).toBeTruthy()
    }
  })

  it('jsonExample is valid JSON for each schema', () => {
    for (const [key, schema] of Object.entries(DIAGRAM_SCHEMAS)) {
      expect(() => JSON.parse(schema.jsonExample)).not.toThrow()
      const parsed = JSON.parse(schema.jsonExample)
      expect(parsed.type).toBe(key)
    }
  })
})

describe('getDiagramSchemaPrompt', () => {
  it('returns prompt string listing all schemas', () => {
    const prompt = getDiagramSchemaPrompt()
    expect(prompt).toContain('coordinate_plane')
    expect(prompt).toContain('number_line')
    expect(prompt).toContain('fbd')
  })

  it('filters by subject', () => {
    const mathPrompt = getDiagramSchemaPrompt('math')
    expect(mathPrompt).toContain('coordinate_plane')
    expect(mathPrompt).not.toContain('fbd')

    const physicsPrompt = getDiagramSchemaPrompt('physics')
    expect(physicsPrompt).toContain('fbd')
    expect(physicsPrompt).not.toContain('coordinate_plane')
  })

  it('returns empty string for unknown subject', () => {
    const prompt = getDiagramSchemaPrompt('underwater_basket_weaving')
    expect(prompt).toBe('')
  })
})
