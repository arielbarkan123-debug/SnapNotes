import {
  LAYERED_TIKZ_INSTRUCTIONS,
  STEP_METADATA_PROMPT,
} from '@/lib/diagram-engine/tikz/layered-tikz-prompt'

describe('LAYERED_TIKZ_INSTRUCTIONS', () => {
  it('is a non-empty string', () => {
    expect(typeof LAYERED_TIKZ_INSTRUCTIONS).toBe('string')
    expect(LAYERED_TIKZ_INSTRUCTIONS.length).toBeGreaterThan(0)
  })

  it('contains the step marker format', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP N:')
  })

  it('states steps are cumulative', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('CUMULATIVE')
  })

  it('requires absolute coordinates', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('ABSOLUTE COORDINATES')
  })

  it('recommends 3-6 steps', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('3-6 steps')
  })

  it('contains the Free Body Diagram example', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('EXAMPLE — Free Body Diagram')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 1: Draw the object on the surface ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 2: Weight force (gravity) ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 3: Normal force ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 4: Applied force and friction ===')
  })

  it('contains the Quadratic Function Graph example', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('EXAMPLE — Quadratic Function Graph')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 1: Coordinate axes ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 2: Plot the parabola ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 3: Mark the vertex ===')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('% === STEP 4: Mark x-intercepts and axis of symmetry ===')
  })

  it('specifies the step sequence guidelines', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('STEP SEQUENCE GUIDELINES')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('Step 1: Basic setup')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('Step N: Final answer')
  })

  it('contains all 7 rules', () => {
    for (let i = 1; i <= 7; i++) {
      expect(LAYERED_TIKZ_INSTRUCTIONS).toContain(`${i}.`)
    }
  })

  it('includes the additive-only rule', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('only ADD new elements')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('Never modify or remove elements')
  })

  it('includes teacher whiteboard order table', () => {
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('TEACHER WHITEBOARD ORDER')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('Free Body Diagram')
    expect(LAYERED_TIKZ_INSTRUCTIONS).toContain('Inclined Plane')
  })
})

describe('STEP_METADATA_PROMPT', () => {
  it('is a non-empty string', () => {
    expect(typeof STEP_METADATA_PROMPT).toBe('string')
    expect(STEP_METADATA_PROMPT.length).toBeGreaterThan(0)
  })

  it('requests JSON output', () => {
    expect(STEP_METADATA_PROMPT).toContain('Return JSON')
    expect(STEP_METADATA_PROMPT).toContain('no markdown fences')
  })

  it('defines the expected JSON schema fields', () => {
    expect(STEP_METADATA_PROMPT).toContain('"step"')
    expect(STEP_METADATA_PROMPT).toContain('"label"')
    expect(STEP_METADATA_PROMPT).toContain('"labelHe"')
    expect(STEP_METADATA_PROMPT).toContain('"explanation"')
    expect(STEP_METADATA_PROMPT).toContain('"explanationHe"')
  })

  it('specifies the steps array wrapper', () => {
    expect(STEP_METADATA_PROMPT).toContain('"steps"')
  })

  it('requires concise labels (3-5 words)', () => {
    expect(STEP_METADATA_PROMPT).toContain('3-5 words')
  })

  it('requires pedagogical explanations', () => {
    expect(STEP_METADATA_PROMPT).toContain('pedagogical')
    expect(STEP_METADATA_PROMPT).toContain('explain the WHY')
  })

  it('requires natural Hebrew translations', () => {
    expect(STEP_METADATA_PROMPT).toContain('Hebrew translations must be natural')
    expect(STEP_METADATA_PROMPT).toContain('not word-for-word')
  })

  it('maps one entry per step marker', () => {
    expect(STEP_METADATA_PROMPT).toContain('One entry per STEP marker')
  })
})
