// Mock E2B to prevent ESM import issues in Jest
jest.mock('@e2b/code-interpreter', () => ({
  Sandbox: { create: jest.fn() },
}))

import {
  parseLatexStepMarkers,
  buildCumulativeLatexStep,
} from '@/lib/diagram-engine/step-capture/latex-steps'

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const SAMPLE_LATEX = `\\documentclass[border=20pt,varwidth]{standalone}
\\usepackage{amsmath}
\\begin{document}

% === STEP 1: Write the equation ===
\\begin{align}
2x + 5 &= 13
\\end{align}

% === STEP 2: Subtract 5 ===
\\begin{align}
2x + 5 &= 13 \\\\
2x &= 8
\\end{align}

% === STEP 3: Solve for x ===
\\begin{align}
2x + 5 &= 13 \\\\
2x &= 8 \\\\
x &= \\boxed{4}
\\end{align}

\\end{document}`

describe('parseLatexStepMarkers', () => {
  it('finds all STEP markers', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    expect(markers).toHaveLength(3)
    expect(markers[0]).toEqual({ step: 1, description: 'Write the equation', line: expect.any(Number) })
    expect(markers[2].description).toBe('Solve for x')
  })

  it('returns empty for code without markers', () => {
    const markers = parseLatexStepMarkers('\\documentclass{article}\n\\begin{document}\nHello\n\\end{document}')
    expect(markers).toHaveLength(0)
  })
})

describe('buildCumulativeLatexStep', () => {
  it('step 1 includes only first step content', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step1 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 1)
    expect(step1).toContain('\\documentclass')
    expect(step1).toContain('\\begin{document}')
    expect(step1).toContain('2x + 5 &= 13')
    expect(step1).not.toContain('2x &= 8')
    expect(step1).toContain('\\end{document}')
  })

  it('step 2 includes steps 1 and 2', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step2 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 2)
    expect(step2).toContain('2x + 5 &= 13')
    expect(step2).toContain('2x &= 8')
    expect(step2).not.toContain('\\boxed{4}')
  })

  it('final step includes everything', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step3 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 3)
    expect(step3).toContain('\\boxed{4}')
  })

  it('preserves preamble in all steps', () => {
    const markers = parseLatexStepMarkers(SAMPLE_LATEX)
    const step1 = buildCumulativeLatexStep(SAMPLE_LATEX, markers, 1)
    expect(step1).toContain('\\usepackage{amsmath}')
  })
})
