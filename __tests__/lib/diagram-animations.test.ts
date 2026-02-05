import {
  spotlightVariants,
  createSpotlightVariants,
  lineDrawVariants,
  labelAppearVariants,
  createStepSequence,
} from '@/lib/diagram-animations'

describe('Spotlight Animation', () => {
  it('default spotlightVariants has hidden, visible, and spotlight states', () => {
    expect(spotlightVariants).toHaveProperty('hidden')
    expect(spotlightVariants).toHaveProperty('visible')
    expect(spotlightVariants).toHaveProperty('spotlight')
  })

  it('default spotlight uses math indigo glow', () => {
    const spotlight = spotlightVariants.spotlight as Record<string, unknown>
    expect(spotlight.scale).toEqual([1, 1.15, 1])
    const filters = spotlight.filter as string[]
    expect(filters[1]).toContain('99,102,241')
  })

  it('createSpotlightVariants uses provided color for glow', () => {
    const pinkVariants = createSpotlightVariants('#ec4899')
    const spotlight = pinkVariants.spotlight as Record<string, unknown>
    const filters = spotlight.filter as string[]
    // #ec4899 = rgb(236,72,153)
    expect(filters[1]).toContain('236,72,153')
    expect(filters[1]).not.toContain('99,102,241')
  })

  it('createSpotlightVariants produces correct structure', () => {
    const variants = createSpotlightVariants('#10b981')
    expect(variants).toHaveProperty('hidden')
    expect(variants).toHaveProperty('visible')
    expect(variants).toHaveProperty('spotlight')
    const hidden = variants.hidden as Record<string, unknown>
    expect(hidden.opacity).toBe(0)
    expect(hidden.scale).toBe(0.8)
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

  it('has visible state with opacity 1 and y 0', () => {
    const visible = labelAppearVariants.visible as Record<string, unknown>
    expect(visible.opacity).toBe(1)
    expect(visible.y).toBe(0)
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

  it('returns all elements when step >= length', () => {
    const elements = ['a', 'b', 'c']
    expect(createStepSequence(elements, 5)).toEqual(['a', 'b', 'c'])
    expect(createStepSequence(elements, 100)).toEqual(['a', 'b', 'c'])
  })

  it('returns first element for step 0', () => {
    expect(createStepSequence(['a', 'b', 'c'], 0)).toEqual(['a'])
  })

  it('returns empty array for empty input', () => {
    expect(createStepSequence([], 0)).toEqual([])
    expect(createStepSequence([], 5)).toEqual([])
  })
})
