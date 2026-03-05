import { captureTikzSteps } from '@/lib/diagram-engine/step-capture/tikz-steps'

// Mock tikz-executor
const mockCompileTikZ = jest.fn()
jest.mock('@/lib/diagram-engine/tikz-executor', () => ({
  compileTikZ: (...args: unknown[]) => mockCompileTikZ(...args),
}))

// Mock global fetch (not available in Node test env)
const mockFetchFn = jest.fn()
global.fetch = mockFetchFn as unknown as typeof fetch

beforeEach(() => {
  mockCompileTikZ.mockReset()
  mockFetchFn.mockReset()
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// Uses STEP markers (new format) — tikz-steps.ts normalizes to LAYER for the parser
const SAMPLE_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === STEP 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
% === STEP 2: Weight force ===
\\draw[-{Stealth},red] (1,0) -- (1,-1.5) node[below] {$mg$};
% === STEP 3: Normal force ===
\\draw[-{Stealth},blue] (1,1) -- (1,2.5) node[above] {$N$};
\\end{tikzpicture}`

describe('captureTikzSteps', () => {
  it('compiles N cumulative steps and returns buffers', async () => {
    // Mock QuickLaTeX returning URLs
    mockCompileTikZ.mockResolvedValue({ url: 'https://quicklatex.com/fake.png' })

    // Mock fetch for downloading the images
    mockFetchFn.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(Buffer.from('fake-png-data').buffer),
    })

    const result = await captureTikzSteps(SAMPLE_TIKZ)

    expect(result.buffers).toHaveLength(3)
    expect(result.buffers[0]).toBeInstanceOf(Buffer)
    expect(mockCompileTikZ).toHaveBeenCalledTimes(3)
    // Step 1 TikZ should contain rectangle but not $mg$
    const firstCallArg = mockCompileTikZ.mock.calls[0][0] as string
    expect(firstCallArg).toContain('rectangle')
    expect(firstCallArg).not.toContain('$mg$')
  })

  it('returns null buffer for failed step compilations', async () => {
    mockCompileTikZ
      .mockResolvedValueOnce({ url: 'https://quicklatex.com/ok.png' })
      .mockResolvedValueOnce({ error: 'syntax error' })
      .mockResolvedValueOnce({ url: 'https://quicklatex.com/ok2.png' })

    mockFetchFn.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(Buffer.from('png').buffer),
    })

    const result = await captureTikzSteps(SAMPLE_TIKZ)

    expect(result.buffers).toHaveLength(3)
    expect(result.buffers[0]).toBeInstanceOf(Buffer)
    expect(result.buffers[1]).toBeNull()
    expect(result.buffers[2]).toBeInstanceOf(Buffer)
  })

  it('returns empty buffers for code with no step markers', async () => {
    const noSteps = `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`

    const result = await captureTikzSteps(noSteps)
    // No step markers → single implicit layer (layer 1) → only 1 step = still renders
    // The parser wraps bare code as layer 1 when no markers found
    expect(result.buffers.length).toBeLessThanOrEqual(1)
  })

  it('also works with LAYER markers (backward compat)', async () => {
    const layerTikz = `\\begin{tikzpicture}
% === LAYER 1: First ===
\\draw (0,0) -- (1,0);
% === LAYER 2: Second ===
\\draw (0,0) -- (0,1);
\\end{tikzpicture}`

    mockCompileTikZ.mockResolvedValue({ url: 'https://quicklatex.com/ok.png' })
    mockFetchFn.mockResolvedValue({
      ok: true,
      arrayBuffer: () => Promise.resolve(Buffer.from('png').buffer),
    })

    const result = await captureTikzSteps(layerTikz)
    expect(result.buffers).toHaveLength(2)
  })
})
