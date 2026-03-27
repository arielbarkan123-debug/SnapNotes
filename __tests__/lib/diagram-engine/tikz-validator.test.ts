/**
 * Tests for diagram-engine/tikz-validator.ts
 *
 * Covers: validateTikzBeforeCompilation, buildValidationRetryPrompt,
 *         banned features, auto-fixes, size violations, layer markers.
 */

// Mock sanitizeUnicode from tikz-executor
jest.mock('@/lib/diagram-engine/tikz-executor', () => ({
  sanitizeUnicode: jest.fn((code: string) => {
    // Simple mock: replace ° with LaTeX equivalent
    return code.replace(/°/g, '^{\\circ}')
  }),
}))

import {
  validateTikzBeforeCompilation,
  buildValidationRetryPrompt,
  type TikzValidationResult,
} from '@/lib/diagram-engine/tikz-validator'

const VALID_TIKZ = `\\begin{tikzpicture}
\\draw[fill=blue!20] (0,0) circle (1);
\\node[fill=white] at (0,0) {A};
\\end{tikzpicture}`

describe('validateTikzBeforeCompilation', () => {
  // ── Valid code ──

  it('accepts valid TikZ code', () => {
    const result = validateTikzBeforeCompilation(VALID_TIKZ)
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  // ── Structure errors ──

  it('rejects code missing \\begin{tikzpicture}', () => {
    const result = validateTikzBeforeCompilation('\\draw (0,0) -- (1,1);')
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.type === 'structure_error')).toBe(true)
  })

  // ── Banned features ──

  it('rejects \\pgfmathsetmacro', () => {
    const code = `\\begin{tikzpicture}
\\pgfmathsetmacro{\\angle}{30}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('pgfmathsetmacro'))).toBe(true)
  })

  it('rejects \\pgfmathparse', () => {
    const code = `\\begin{tikzpicture}
\\pgfmathparse{cos(30)}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('pgfmathparse'))).toBe(true)
  })

  it('rejects plot[domain=...]', () => {
    const code = `\\begin{tikzpicture}
\\draw plot[domain=0:6, samples=50] (\\x, {sin(\\x r)});
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('plot[domain='))).toBe(true)
  })

  it('rejects \\foreach with too many iterations (range with step)', () => {
    const code = `\\begin{tikzpicture}
\\foreach \\x in {0,0.1,...,6} {
  \\draw (\\x,0) -- (\\x,1);
}
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('foreach'))).toBe(true)
  })

  it('accepts \\foreach with few iterations', () => {
    const code = `\\begin{tikzpicture}
\\foreach \\x in {1,2,3,4} {
  \\draw (\\x,0) -- (\\x,1);
}
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    // Should have no foreach-related errors
    expect(result.errors.filter(e => e.message.includes('foreach'))).toHaveLength(0)
  })

  it('rejects decorations.markings', () => {
    const code = `\\begin{tikzpicture}
\\draw[decoration={markings, mark=at position 0.5 with {\\arrow{>}}}, postaction={decorate}] (0,0) -- (2,0);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('decorations.markings'))).toBe(true)
  })

  it('rejects gradient fills', () => {
    const code = `\\begin{tikzpicture}
\\draw[top color=blue, bottom color=white] (0,0) rectangle (2,2);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('Gradient'))).toBe(true)
  })

  it('rejects shading fills', () => {
    const code = `\\begin{tikzpicture}
\\draw[shading=ball] (0,0) circle (1);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.message.includes('Gradient'))).toBe(true)
  })

  // ── Size violations ──

  it('rejects code exceeding max size (2800 chars)', () => {
    const longCode = `\\begin{tikzpicture}\n${'\\draw (0,0) -- (1,1);\n'.repeat(200)}\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(longCode)
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.type === 'size_violation')).toBe(true)
  })

  // ── Auto-fixes ──

  it('auto-fixes \\definecolor{...}{RGB}{...}', () => {
    const code = `\\definecolor{myblue}{RGB}{0,100,200}
\\begin{tikzpicture}
\\draw[fill=myblue] (0,0) circle (1);
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.autoFixed.length).toBeGreaterThan(0)
    expect(result.autoFixed.some(d => d.includes('definecolor'))).toBe(true)
    expect(result.fixedCode).toBeDefined()
    expect(result.fixedCode).not.toContain('\\definecolor')
  })

  it('auto-fixes \\color{red}', () => {
    const code = `\\begin{tikzpicture}
\\node[fill=white] at (0,0) {\\color{red} Important};
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.autoFixed.some(d => d.includes('\\color{red}'))).toBe(true)
    expect(result.fixedCode).toBeDefined()
    expect(result.fixedCode).not.toContain('\\color{red}')
  })

  it('auto-fixes Unicode characters', () => {
    const code = `\\begin{tikzpicture}
\\node at (0,0) {90°};
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.autoFixed.some(d => d.includes('Unicode'))).toBe(true)
    expect(result.fixedCode).toBeDefined()
    expect(result.fixedCode).not.toContain('°')
  })

  // ── Layer markers ──

  it('requires layer markers when requireLayers=true', () => {
    const result = validateTikzBeforeCompilation(VALID_TIKZ, { requireLayers: true })
    expect(result.valid).toBe(false)
    expect(result.errors.some(e => e.type === 'missing_layers')).toBe(true)
  })

  it('passes layer check when markers are present', () => {
    const code = `\\begin{tikzpicture}
% === LAYER 1: Base shape ===
\\draw (0,0) circle (1);
% === LAYER 2: Labels ===
\\node at (0,0) {A};
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code, { requireLayers: true })
    expect(result.errors.filter(e => e.type === 'missing_layers')).toHaveLength(0)
  })

  it('does not require layer markers when requireLayers is not set', () => {
    const result = validateTikzBeforeCompilation(VALID_TIKZ)
    expect(result.errors.filter(e => e.type === 'missing_layers')).toHaveLength(0)
  })

  // ── Warnings ──

  it('warns about nodes without fill=white', () => {
    const code = `\\begin{tikzpicture}
\\node[above] at (0,1) {Label};
\\end{tikzpicture}`
    const result = validateTikzBeforeCompilation(code)
    expect(result.warnings.some(w => w.type === 'missing_label_style')).toBe(true)
  })

  it('warns about high complexity code', () => {
    // Build code with >60 non-comment lines
    const lines = ['\\begin{tikzpicture}']
    for (let i = 0; i < 65; i++) {
      lines.push(`\\draw (${i},0) -- (${i},1);`)
    }
    lines.push('\\end{tikzpicture}')
    const code = lines.join('\n')
    const result = validateTikzBeforeCompilation(code)
    expect(result.warnings.some(w => w.type === 'complexity')).toBe(true)
  })
})

describe('buildValidationRetryPrompt', () => {
  it('returns empty string for valid results', () => {
    const result: TikzValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      autoFixed: [],
    }
    expect(buildValidationRetryPrompt(result)).toBe('')
  })

  it('includes error messages and fix instructions', () => {
    const result: TikzValidationResult = {
      valid: false,
      errors: [
        {
          type: 'banned_feature',
          message: '\\pgfmathsetmacro on line 2',
          line: 2,
          fixInstruction: 'Pre-compute values.',
        },
      ],
      warnings: [],
      autoFixed: [],
    }
    const prompt = buildValidationRetryPrompt(result)
    expect(prompt).toContain('pgfmathsetmacro')
    expect(prompt).toContain('Pre-compute values.')
    expect(prompt).toContain('MUST be fixed')
  })

  it('numbers multiple errors', () => {
    const result: TikzValidationResult = {
      valid: false,
      errors: [
        {
          type: 'banned_feature',
          message: 'Error A',
          fixInstruction: 'Fix A',
        },
        {
          type: 'size_violation',
          message: 'Error B',
          fixInstruction: 'Fix B',
        },
      ],
      warnings: [],
      autoFixed: [],
    }
    const prompt = buildValidationRetryPrompt(result)
    expect(prompt).toContain('1. Error A')
    expect(prompt).toContain('2. Error B')
  })
})
