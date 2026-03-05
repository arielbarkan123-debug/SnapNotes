import { inject } from '@/lib/diagram-engine/smart-pipeline/inject'
import type { ComputedProblem, AnalysisResult } from '@/lib/diagram-engine/smart-pipeline/types'

const mockAnalysis: AnalysisResult = {
  domain: 'mechanics',
  problemType: 'inclined_plane_friction',
  givenValues: {
    mass: { value: 5, unit: 'kg' },
    angle: { value: 30, unit: 'degrees' },
    friction_coeff: { value: 0.2, unit: '' },
  },
  unknowns: ['acceleration', 'normal_force', 'friction_force'],
  formulas: ['N = mg·cos(θ)', 'f = μN', 'a = (mg·sin(θ) - f)/m'],
  sympyCode: 'print("test")',
  diagramHints: {
    diagramType: 'fbd',
    elementsToShow: ['weight', 'normal', 'friction', 'net_force'],
    coordinateRanges: { x: [-2, 10], y: [-2, 8] },
  },
}

const mockComputed: ComputedProblem = {
  values: {
    W: { name: 'W', value: 49, unit: 'N', formula: 'W = m × g', step: 'W = 5 × 9.8 = 49 N' },
    N: { name: 'N', value: 42.43, unit: 'N', formula: 'N = mg·cos(θ)', step: 'N = 49 × cos(30°) = 42.43 N' },
    f: { name: 'f', value: 8.49, unit: 'N', formula: 'f = μN', step: 'f = 0.2 × 42.43 = 8.49 N' },
    a: { name: 'a', value: 3.2, unit: 'm/s²', formula: 'a = F_net/m', step: 'a = (24.5 - 8.49)/5 = 3.20 m/s²' },
  },
  solutionSteps: [
    'W = mg = 5 × 9.8 = 49 N',
    'N = mg·cos(30°) = 42.43 N',
    'f = μN = 0.2 × 42.43 = 8.49 N',
    'a = (mg·sin(30°) - f)/m = 3.20 m/s²',
  ],
  rawOutput: '{}',
  computeTimeMs: 1500,
}

describe('inject', () => {
  const originalQuestion = 'A 5 kg box on a 30 degree incline with μ=0.2. Find acceleration.'

  it('starts with PRE-COMPUTED VALUES header', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toMatch(/^PRE-COMPUTED VALUES/)
  })

  it('includes problem metadata', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('Problem type: inclined_plane_friction')
    expect(result).toContain('Domain: mechanics')
  })

  it('includes all computed values with units', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('W = 49 N')
    expect(result).toContain('N = 42.43 N')
    expect(result).toContain('f = 8.49 N')
    expect(result).toContain('a = 3.2 m/s²')
  })

  it('includes solution steps', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('SOLUTION STEPS:')
    expect(result).toContain('W = mg = 5 × 9.8 = 49 N')
    expect(result).toContain('N = mg·cos(30°) = 42.43 N')
  })

  it('includes CRITICAL instruction', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('CRITICAL: Use ONLY these values')
  })

  it('includes original question at the end', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('ORIGINAL QUESTION:')
    expect(result).toContain(originalQuestion)
  })

  it('includes diagram hints in output', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('DIAGRAM HINTS:')
    expect(result).toContain('Diagram type: fbd')
    expect(result).toContain('Elements to show: weight, normal, friction, net_force')
    expect(result).toContain('X range: [-2, 10]')
    expect(result).toContain('Y range: [-2, 8]')
  })

  it('handles analysis without diagram hints gracefully', () => {
    const noHintsAnalysis: AnalysisResult = {
      ...mockAnalysis,
      diagramHints: {
        diagramType: '',
        elementsToShow: [],
      },
    }
    const result = inject(mockComputed, noHintsAnalysis, originalQuestion)
    // Should not crash, and should not contain DIAGRAM HINTS header
    expect(result).not.toContain('DIAGRAM HINTS:')
    expect(result).toContain('COMPUTED VALUES:')
  })

  it('handles integer values without decimals', () => {
    const result = inject(mockComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('W = 49 N') // not "49.0"
  })

  it('handles NaN/Infinity values gracefully', () => {
    const brokenComputed: ComputedProblem = {
      values: {
        force: { name: 'force', value: Infinity, unit: 'N', formula: '', step: '' },
      },
      solutionSteps: [],
      rawOutput: '{}',
      computeTimeMs: 100,
    }
    // Should not throw — formatNumber guards against Infinity
    const result = inject(brokenComputed, mockAnalysis, originalQuestion)
    expect(result).toContain('force = Infinity N')
  })
})
