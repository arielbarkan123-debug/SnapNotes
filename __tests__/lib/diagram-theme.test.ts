import { SUBJECT_COLORS, getSubjectColor, getAdaptiveLineWeight, DIAGRAM_BACKGROUNDS } from '@/lib/diagram-theme'

describe('Subject Color System', () => {
  it('returns correct primary color for each subject', () => {
    expect(SUBJECT_COLORS.math.primary).toBe('#6366f1')
    expect(SUBJECT_COLORS.physics.primary).toBe('#f97316')
    expect(SUBJECT_COLORS.chemistry.primary).toBe('#10b981')
    expect(SUBJECT_COLORS.biology.primary).toBe('#84cc16')
    expect(SUBJECT_COLORS.geometry.primary).toBe('#ec4899')
    expect(SUBJECT_COLORS.economy.primary).toBe('#f59e0b')
  })

  it('returns full palette with primary, accent, light, dark, bg, bgDark variants', () => {
    const math = SUBJECT_COLORS.math
    expect(math).toHaveProperty('primary')
    expect(math).toHaveProperty('accent')
    expect(math).toHaveProperty('light')
    expect(math).toHaveProperty('dark')
    expect(math).toHaveProperty('bg')
    expect(math).toHaveProperty('bgDark')
    expect(math).toHaveProperty('curve')
    expect(math).toHaveProperty('point')
    expect(math).toHaveProperty('highlight')
  })

  it('getSubjectColor returns palette for given subject', () => {
    const geo = getSubjectColor('geometry')
    expect(geo.primary).toBe('#ec4899')
    expect(geo.accent).toBe('#d946ef')
  })
})

describe('Adaptive Line Weight', () => {
  it('returns 4px for elementary', () => {
    expect(getAdaptiveLineWeight('elementary')).toBe(4)
  })
  it('returns 3px for middle', () => {
    expect(getAdaptiveLineWeight('middle')).toBe(3)
  })
  it('returns 2px for high school', () => {
    expect(getAdaptiveLineWeight('high')).toBe(2)
  })
  it('returns 2px for advanced', () => {
    expect(getAdaptiveLineWeight('advanced')).toBe(2)
  })
})

describe('Diagram Backgrounds', () => {
  it('has light and dark mode backgrounds', () => {
    expect(DIAGRAM_BACKGROUNDS.light).toHaveProperty('fill')
    expect(DIAGRAM_BACKGROUNDS.light).toHaveProperty('grid')
    expect(DIAGRAM_BACKGROUNDS.light).toHaveProperty('axis')
    expect(DIAGRAM_BACKGROUNDS.light).toHaveProperty('text')
    expect(DIAGRAM_BACKGROUNDS.dark).toHaveProperty('fill')
    expect(DIAGRAM_BACKGROUNDS.dark).toHaveProperty('grid')
    expect(DIAGRAM_BACKGROUNDS.dark).toHaveProperty('axis')
    expect(DIAGRAM_BACKGROUNDS.dark).toHaveProperty('text')
  })

  it('light mode has white-ish fill', () => {
    expect(DIAGRAM_BACKGROUNDS.light.fill).toBe('#ffffff')
  })

  it('dark mode has dark fill', () => {
    expect(DIAGRAM_BACKGROUNDS.dark.fill).toBe('#1a1a2e')
  })
})
