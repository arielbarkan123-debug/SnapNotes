import {
  spotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
  createStepSequence,
} from '@/lib/diagram-animations'

describe('Spotlight Animation', () => {
  it('spotlightVariants has hidden, visible, and spotlight states', () => {
    expect(spotlightVariants).toHaveProperty('hidden')
    expect(spotlightVariants).toHaveProperty('visible')
    expect(spotlightVariants).toHaveProperty('spotlight')
  })

  it('spotlight state includes scale pulse and glow', () => {
    const spotlight = spotlightVariants.spotlight as Record<string, unknown>
    expect(spotlight.scale).toEqual([1, 1.15, 1])
    expect(spotlight).toHaveProperty('filter')
  })
})

describe('Line Draw Variants', () => {
  it('has hidden state with pathLength 0', () => {
    const hidden = lineDrawVariants.hidden as Record<string, unknown>
    expect(hidden.pathLength).toBe(0)
    expect(hidden.opacity).toBe(0)
  })

  it('has visible state with pathLength 1', () => {
    const visible = lineDrawVariants.visible as Record<string, unknown>
    expect(visible.pathLength).toBe(1)
    expect(visible.opacity).toBe(1)
  })
})

describe('Label Appear Variants', () => {
  it('has hidden state with opacity 0 and slight y offset', () => {
    const hidden = labelAppearVariants.hidden as Record<string, unknown>
    expect(hidden.opacity).toBe(0)
    expect(hidden.y).toBe(8)
  })
})

describe('createStepSequence', () => {
  it('returns elements visible up to and including the given step', () => {
    const elements = ['base', 'sideA', 'sideB', 'angleA', 'label']
    const visible = createStepSequence(elements, 2)
    expect(visible).toEqual(['base', 'sideA', 'sideB'])
  })

  it('returns empty array for step -1', () => {
    expect(createStepSequence(['a', 'b'], -1)).toEqual([])
  })
})
