// Mock E2B to prevent ESM import issues in Jest
jest.mock('@e2b/code-interpreter', () => ({
  Sandbox: { create: jest.fn() },
}))

import {
  injectSaveFigCalls,
  parseStepMarkers,
} from '@/lib/diagram-engine/step-capture/matplotlib-steps'

beforeEach(() => {
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

const SAMPLE_PYTHON = `import matplotlib.pyplot as plt
import numpy as np

fig, ax = plt.subplots(figsize=(10,8))

# === STEP 1: Set up axes ===
ax.set_xlabel('x')
ax.set_ylabel('y')
ax.grid(True)

# === STEP 2: Plot the curve ===
x = np.linspace(-2, 6, 300)
ax.plot(x, x**2 - 4*x + 3, 'b-', linewidth=2)

# === STEP 3: Mark key points ===
ax.plot(2, -1, 'ro', markersize=10)

plt.savefig('diagram.png', dpi=150, bbox_inches='tight')
`

describe('parseStepMarkers', () => {
  it('finds all STEP markers with descriptions', () => {
    const markers = parseStepMarkers(SAMPLE_PYTHON)
    expect(markers).toHaveLength(3)
    expect(markers[0]).toEqual({ step: 1, description: 'Set up axes', line: 5 })
    expect(markers[1]).toEqual({ step: 2, description: 'Plot the curve', line: 10 })
    expect(markers[2]).toEqual({ step: 3, description: 'Mark key points', line: 14 })
  })

  it('returns empty for code without markers', () => {
    const markers = parseStepMarkers('import matplotlib\nplt.plot([1,2,3])\n')
    expect(markers).toHaveLength(0)
  })
})

describe('injectSaveFigCalls', () => {
  it('inserts plt.savefig after each STEP marker block', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    expect(result).toContain("plt.savefig('/tmp/step_1.png'")
    expect(result).toContain("plt.savefig('/tmp/step_2.png'")
    expect(result).toContain("plt.savefig('/tmp/step_3.png'")
  })

  it('preserves all original code', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    expect(result).toContain('ax.set_xlabel')
    expect(result).toContain('np.linspace')
    expect(result).toContain('ax.plot(2, -1')
  })

  it('places savefig before next STEP marker (not at end of line)', () => {
    const result = injectSaveFigCalls(SAMPLE_PYTHON)
    const lines = result.split('\n')
    // Find the savefig for step 1 — it should appear BEFORE the STEP 2 marker
    const saveFig1Line = lines.findIndex(l => l.includes("step_1.png"))
    const step2Line = lines.findIndex(l => l.includes('STEP 2'))
    expect(saveFig1Line).toBeLessThan(step2Line)
  })

  it('returns code unchanged if no markers', () => {
    const plain = 'import matplotlib\nplt.plot([1,2,3])\n'
    expect(injectSaveFigCalls(plain)).toBe(plain)
  })
})
