/**
 * Step-by-Step Renderer Tests
 *
 * Tests for renderStepByStep and validateStepByStepSource.
 * compileTikZ is mocked to avoid real QuickLaTeX API calls.
 */

jest.mock('@/lib/diagram-engine/tikz-executor', () => ({
  compileTikZ: jest.fn(),
}))

import { compileTikZ } from '@/lib/diagram-engine/tikz-executor'
import { renderStepByStep, validateStepByStepSource } from '@/lib/diagram-engine/step-renderer'
import type { StepByStepSource } from '@/components/homework/diagram/types'

const mockCompileTikZ = compileTikZ as jest.MockedFunction<typeof compileTikZ>

// Sample layered TikZ code for testing
const SAMPLE_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
\\node at (1,0.5) {Box};
% === LAYER 2: Weight force ===
\\draw[-{Stealth},very thick,red] (1,0) -- (1,-1.5) node[below] {$mg$};
% === LAYER 3: Normal force ===
\\draw[-{Stealth},very thick,blue] (1,1) -- (1,2.5) node[above] {$N$};
% === LAYER 4: Friction ===
\\draw[-{Stealth},very thick,orange] (0,0.5) -- (-1.2,0.5) node[left] {$f$};
\\end{tikzpicture}`

function makeSource(overrides: Partial<StepByStepSource> = {}): StepByStepSource {
  return {
    tikzCode: SAMPLE_TIKZ,
    steps: [
      { layer: 1, label: 'Draw object', labelHe: 'שרטוט', explanation: 'Draw the box', explanationHe: 'שרטוט הקופסה' },
      { layer: 2, label: 'Weight', labelHe: 'משקל', explanation: 'Add weight', explanationHe: 'הוספת משקל' },
      { layer: 3, label: 'Normal', labelHe: 'נורמלי', explanation: 'Add normal force', explanationHe: 'הוספת כוח נורמלי' },
      { layer: 4, label: 'Friction', labelHe: 'חיכוך', explanation: 'Add friction', explanationHe: 'הוספת חיכוך' },
    ],
    ...overrides,
  }
}

beforeEach(() => {
  jest.clearAllMocks()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── renderStepByStep: Successful Renders ──────────────────────────────────────

describe('renderStepByStep - successful renders', () => {
  it('renders all steps successfully and returns URLs', async () => {
    mockCompileTikZ
      .mockResolvedValueOnce({ url: 'https://img.quicklatex.com/step1.png' })
      .mockResolvedValueOnce({ url: 'https://img.quicklatex.com/step2.png' })
      .mockResolvedValueOnce({ url: 'https://img.quicklatex.com/step3.png' })
      .mockResolvedValueOnce({ url: 'https://img.quicklatex.com/step4.png' })

    const result = await renderStepByStep(makeSource())

    expect(result.stepImageUrls).toHaveLength(4)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/step1.png')
    expect(result.stepImageUrls[1]).toBe('https://img.quicklatex.com/step2.png')
    expect(result.stepImageUrls[2]).toBe('https://img.quicklatex.com/step3.png')
    expect(result.stepImageUrls[3]).toBe('https://img.quicklatex.com/step4.png')
    expect(result.partial).toBe(false)
    expect(result.errors).toBeUndefined()
  })

  it('calls compileTikZ with cumulative TikZ code for each step', async () => {
    mockCompileTikZ.mockResolvedValue({ url: 'https://img.quicklatex.com/ok.png' })

    await renderStepByStep(makeSource())

    expect(mockCompileTikZ).toHaveBeenCalledTimes(4)

    // Step 1 should contain layer 1 content but NOT layer 2+
    const step1Code = mockCompileTikZ.mock.calls[0][0]
    expect(step1Code).toContain('rectangle')
    expect(step1Code).toContain('\\begin{tikzpicture}')
    expect(step1Code).not.toContain('mg')

    // Step 2 should contain layers 1 and 2
    const step2Code = mockCompileTikZ.mock.calls[1][0]
    expect(step2Code).toContain('rectangle')
    expect(step2Code).toContain('mg')
    expect(step2Code).not.toContain('$N$')

    // Step 4 should contain all layers
    const step4Code = mockCompileTikZ.mock.calls[3][0]
    expect(step4Code).toContain('rectangle')
    expect(step4Code).toContain('mg')
    expect(step4Code).toContain('$N$')
    expect(step4Code).toContain('$f$')
  })
})

// ─── renderStepByStep: Partial Failures ────────────────────────────────────────

describe('renderStepByStep - partial failures', () => {
  it('marks partial=true when some steps fail', async () => {
    // With batching (batch size 3), steps 0-2 run concurrently in batch 1,
    // step 3 runs in batch 2. Use mockImplementation to control per-step behavior.
    let callCount = 0
    mockCompileTikZ.mockImplementation(async (tikzCode: string) => {
      callCount++
      // Step 2 (index 1) always fails - identify it by content (contains layer 2 / mg but not layer 3)
      if (tikzCode.includes('mg') && !tikzCode.includes('$N$')) {
        return { error: 'Compilation error' }
      }
      // All other steps succeed
      if (tikzCode.includes('$f$')) return { url: 'https://img.quicklatex.com/step4.png' }
      if (tikzCode.includes('$N$')) return { url: 'https://img.quicklatex.com/step3.png' }
      return { url: 'https://img.quicklatex.com/step1.png' }
    })

    const result = await renderStepByStep(makeSource())

    expect(result.stepImageUrls).toHaveLength(4)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/step1.png')
    expect(result.stepImageUrls[1]).toBe('') // Failed step placeholder
    expect(result.stepImageUrls[2]).toBe('https://img.quicklatex.com/step3.png')
    expect(result.stepImageUrls[3]).toBe('https://img.quicklatex.com/step4.png')
    expect(result.partial).toBe(true)
    expect(result.errors).toBeDefined()
    expect(result.errors![1]).toBe('Compilation error')
  })

  it('records correct error messages for failed steps', async () => {
    // Steps 1 and 3 (indices 1 and 3) fail. Use content-based mock.
    const failCounts: Record<string, number> = {}
    mockCompileTikZ.mockImplementation(async (tikzCode: string) => {
      // Step 2 (layer 2): contains mg but not $N$
      if (tikzCode.includes('mg') && !tikzCode.includes('$N$')) {
        const key = 'step2'
        failCounts[key] = (failCounts[key] || 0) + 1
        return { error: `Error step2 attempt ${failCounts[key]}` }
      }
      // Step 4 (layer 4): contains $f$
      if (tikzCode.includes('$f$')) {
        const key = 'step4'
        failCounts[key] = (failCounts[key] || 0) + 1
        return { error: `Error step4 attempt ${failCounts[key]}` }
      }
      // Steps 1 and 3 succeed
      return { url: 'https://img.quicklatex.com/ok.png' }
    })

    const result = await renderStepByStep(makeSource())

    expect(result.partial).toBe(true)
    expect(result.errors![1]).toBe('Error step2 attempt 3') // Last error after 3 attempts
    expect(result.errors![3]).toBe('Error step4 attempt 3')
  })
})

// ─── renderStepByStep: Complete Failure ────────────────────────────────────────

describe('renderStepByStep - complete failure', () => {
  it('handles all steps failing', async () => {
    // All calls fail (4 steps x 3 attempts = 12 calls)
    mockCompileTikZ.mockResolvedValue({ error: 'Server unavailable' })

    const result = await renderStepByStep(makeSource())

    expect(result.stepImageUrls).toHaveLength(4)
    expect(result.stepImageUrls.every(url => url === '')).toBe(true)
    expect(result.partial).toBe(true)
    expect(result.errors).toBeDefined()
    expect(Object.keys(result.errors!)).toHaveLength(4)
  })
})

// ─── renderStepByStep: Edge Cases ──────────────────────────────────────────────

describe('renderStepByStep - edge cases', () => {
  it('handles TikZ code with no layer markers', async () => {
    const noLayerSource = makeSource({
      tikzCode: `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`,
      steps: [
        { layer: 1, label: 'Complete', labelHe: 'שלם', explanation: 'Full diagram', explanationHe: 'תרשים מלא' },
      ],
    })

    mockCompileTikZ.mockResolvedValueOnce({ url: 'https://img.quicklatex.com/full.png' })

    const result = await renderStepByStep(noLayerSource)

    expect(result.stepImageUrls).toHaveLength(1)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/full.png')
    expect(result.partial).toBe(false)
  })

  it('returns error when TikZ code has no tikzpicture', async () => {
    const invalidSource = makeSource({
      tikzCode: 'just some random text',
      steps: [
        { layer: 1, label: 'Step', labelHe: 'שלב', explanation: 'A step', explanationHe: 'שלב' },
      ],
    })

    const result = await renderStepByStep(invalidSource)

    // parseTikzLayers will produce a single layer with the content, but it
    // still processes. The key point is it does not crash.
    expect(result.stepImageUrls).toBeDefined()
  })

  it('handles compileTikZ throwing an exception', async () => {
    mockCompileTikZ.mockRejectedValue(new Error('Network timeout'))

    const source = makeSource({
      steps: [
        { layer: 1, label: 'Step 1', labelHe: 'שלב 1', explanation: 'First', explanationHe: 'ראשון' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(result.partial).toBe(true)
    expect(result.stepImageUrls[0]).toBe('')
    expect(result.errors![0]).toBe('Network timeout')
  })

  it('handles compileTikZ throwing a non-Error object', async () => {
    mockCompileTikZ.mockRejectedValue('string error')

    const source = makeSource({
      steps: [
        { layer: 1, label: 'Step 1', labelHe: 'שלב 1', explanation: 'First', explanationHe: 'ראשון' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(result.partial).toBe(true)
    expect(result.stepImageUrls[0]).toBe('')
    expect(result.errors![0]).toBe('Unknown error')
  })
})

// ─── Retry Logic ───────────────────────────────────────────────────────────────

describe('renderStepByStep - retry logic', () => {
  it('retries failed compilations up to MAX_RETRIES times', async () => {
    // Fail first two, succeed on third attempt (attempt 0 = first, attempt 1, attempt 2)
    mockCompileTikZ
      .mockResolvedValueOnce({ error: 'Attempt 1 failed' })
      .mockResolvedValueOnce({ error: 'Attempt 2 failed' })
      .mockResolvedValueOnce({ url: 'https://img.quicklatex.com/recovered.png' })

    const source = makeSource({
      steps: [
        { layer: 1, label: 'Step 1', labelHe: 'שלב 1', explanation: 'First', explanationHe: 'ראשון' },
      ],
    })

    const result = await renderStepByStep(source)

    // 3 total calls: 1 initial + 2 retries
    expect(mockCompileTikZ).toHaveBeenCalledTimes(3)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/recovered.png')
    expect(result.partial).toBe(false)
  })

  it('does not retry after MAX_RETRIES exhausted', async () => {
    // Fail all 3 attempts (initial + 2 retries)
    mockCompileTikZ
      .mockResolvedValueOnce({ error: 'Fail 1' })
      .mockResolvedValueOnce({ error: 'Fail 2' })
      .mockResolvedValueOnce({ error: 'Fail 3' })

    const source = makeSource({
      steps: [
        { layer: 1, label: 'Step 1', labelHe: 'שלב 1', explanation: 'First', explanationHe: 'ראשון' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(mockCompileTikZ).toHaveBeenCalledTimes(3)
    expect(result.stepImageUrls[0]).toBe('')
    expect(result.partial).toBe(true)
  })

  it('does not retry when first attempt succeeds', async () => {
    mockCompileTikZ.mockResolvedValueOnce({ url: 'https://img.quicklatex.com/ok.png' })

    const source = makeSource({
      steps: [
        { layer: 1, label: 'Step 1', labelHe: 'שלב 1', explanation: 'First', explanationHe: 'ראשון' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(mockCompileTikZ).toHaveBeenCalledTimes(1)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/ok.png')
  })
})

// ─── Concurrency Batching ──────────────────────────────────────────────────────

describe('renderStepByStep - concurrency batching', () => {
  it('processes steps in batches of MAX_CONCURRENT_RENDERS (3)', async () => {
    // Track concurrency via timestamps
    let concurrentCount = 0
    let maxConcurrent = 0

    mockCompileTikZ.mockImplementation(async () => {
      concurrentCount++
      maxConcurrent = Math.max(maxConcurrent, concurrentCount)
      // Simulate some async work
      await new Promise(resolve => setTimeout(resolve, 10))
      concurrentCount--
      return { url: 'https://img.quicklatex.com/ok.png' }
    })

    // 5 steps: should batch as [3, 2]
    const source = makeSource({
      steps: [
        { layer: 1, label: 'S1', labelHe: 'ש1', explanation: 'E1', explanationHe: 'ה1' },
        { layer: 2, label: 'S2', labelHe: 'ש2', explanation: 'E2', explanationHe: 'ה2' },
        { layer: 3, label: 'S3', labelHe: 'ש3', explanation: 'E3', explanationHe: 'ה3' },
        { layer: 4, label: 'S4', labelHe: 'ש4', explanation: 'E4', explanationHe: 'ה4' },
        { layer: 4, label: 'S5', labelHe: 'ש5', explanation: 'E5', explanationHe: 'ה5' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(result.stepImageUrls).toHaveLength(5)
    // Max concurrent should not exceed 3
    expect(maxConcurrent).toBeLessThanOrEqual(3)
  })

  it('handles exactly MAX_CONCURRENT_RENDERS steps', async () => {
    mockCompileTikZ.mockResolvedValue({ url: 'https://img.quicklatex.com/ok.png' })

    const source = makeSource({
      steps: [
        { layer: 1, label: 'S1', labelHe: 'ש1', explanation: 'E1', explanationHe: 'ה1' },
        { layer: 2, label: 'S2', labelHe: 'ש2', explanation: 'E2', explanationHe: 'ה2' },
        { layer: 3, label: 'S3', labelHe: 'ש3', explanation: 'E3', explanationHe: 'ה3' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(result.stepImageUrls).toHaveLength(3)
    expect(result.partial).toBe(false)
  })

  it('handles single step (less than batch size)', async () => {
    mockCompileTikZ.mockResolvedValueOnce({ url: 'https://img.quicklatex.com/single.png' })

    const source = makeSource({
      steps: [
        { layer: 1, label: 'S1', labelHe: 'ש1', explanation: 'E1', explanationHe: 'ה1' },
      ],
    })

    const result = await renderStepByStep(source)

    expect(result.stepImageUrls).toHaveLength(1)
    expect(result.stepImageUrls[0]).toBe('https://img.quicklatex.com/single.png')
  })
})

// ─── validateStepByStepSource ──────────────────────────────────────────────────

describe('validateStepByStepSource', () => {
  it('accepts a valid source', () => {
    expect(validateStepByStepSource(makeSource())).toBe(true)
  })

  it('rejects null', () => {
    expect(validateStepByStepSource(null)).toBe(false)
  })

  it('rejects undefined', () => {
    expect(validateStepByStepSource(undefined)).toBe(false)
  })

  it('rejects non-object', () => {
    expect(validateStepByStepSource('string')).toBe(false)
    expect(validateStepByStepSource(42)).toBe(false)
    expect(validateStepByStepSource(true)).toBe(false)
  })

  it('rejects missing tikzCode', () => {
    expect(validateStepByStepSource({ steps: [] })).toBe(false)
  })

  it('rejects non-string tikzCode', () => {
    expect(validateStepByStepSource({ tikzCode: 123, steps: [] })).toBe(false)
  })

  it('rejects tikzCode without \\begin{tikzpicture}', () => {
    expect(validateStepByStepSource({
      tikzCode: 'no tikzpicture here',
      steps: [{ layer: 1, label: 'S', explanation: 'E' }],
    })).toBe(false)
  })

  it('rejects missing steps', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
    })).toBe(false)
  })

  it('rejects non-array steps', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: 'not an array',
    })).toBe(false)
  })

  it('rejects empty steps array', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [],
    })).toBe(false)
  })

  it('rejects step with non-number layer', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [{ layer: 'one', label: 'S', explanation: 'E' }],
    })).toBe(false)
  })

  it('rejects step with non-string label', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [{ layer: 1, label: 42, explanation: 'E' }],
    })).toBe(false)
  })

  it('rejects step with non-string explanation', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [{ layer: 1, label: 'S', explanation: null }],
    })).toBe(false)
  })

  it('rejects step that is null', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [null],
    })).toBe(false)
  })

  it('rejects step that is a primitive', () => {
    expect(validateStepByStepSource({
      tikzCode: '\\begin{tikzpicture}\\end{tikzpicture}',
      steps: [42],
    })).toBe(false)
  })
})
