/**
 * Layered TikZ Generator Tests
 *
 * Tests for generateLayeredTikz with mocked Anthropic API calls.
 * Covers success path, validation failures, and error handling.
 */

// We use a shared object reference to hold the mock function.
// `var` is used intentionally because jest.mock() factories are hoisted
// above `const`/`let` declarations, but `var` declarations are hoisted with initialization.
/* eslint-disable no-var */
var mockMessagesCreate: jest.Mock
/* eslint-enable no-var */

jest.mock('@anthropic-ai/sdk', () => {
  mockMessagesCreate = jest.fn()
  return {
    __esModule: true,
    default: jest.fn(() => ({
      messages: { create: mockMessagesCreate },
    })),
  }
})

jest.mock('@/lib/ai/claude', () => ({
  AI_MODEL: 'claude-sonnet-4-6',
}))

jest.mock('@/lib/diagram-engine/tikz', () => ({
  buildTikzPrompt: jest.fn().mockReturnValue('Base TikZ prompt for question'),
}))

jest.mock('@/lib/diagram-engine/tikz/layered-tikz-prompt', () => ({
  LAYERED_TIKZ_INSTRUCTIONS: '\n\nLAYERED TIKZ INSTRUCTIONS HERE',
  STEP_METADATA_PROMPT: 'Generate step metadata JSON',
}))

jest.mock('@/lib/diagram-engine/step-renderer', () => ({
  validateStepByStepSource: jest.fn(),
}))

import { buildTikzPrompt } from '@/lib/diagram-engine/tikz'
import { validateStepByStepSource } from '@/lib/diagram-engine/step-renderer'
import { generateLayeredTikz } from '@/lib/diagram-engine/layered-tikz-generator'

const mockValidate = validateStepByStepSource as jest.MockedFunction<typeof validateStepByStepSource>
const mockBuildTikzPrompt = buildTikzPrompt as jest.MockedFunction<typeof buildTikzPrompt>

// Valid layered TikZ code
const VALID_LAYERED_TIKZ = `\\usetikzlibrary{arrows.meta}
\\begin{tikzpicture}[scale=1.5]
% === LAYER 1: Draw the object ===
\\draw[thick] (0,0) rectangle (2,1);
\\node at (1,0.5) {Box};
% === LAYER 2: Weight force ===
\\draw[-{Stealth},very thick,red] (1,0) -- (1,-1.5) node[below] {$mg$};
% === LAYER 3: Normal force ===
\\draw[-{Stealth},very thick,blue] (1,1) -- (1,2.5) node[above] {$N$};
\\end{tikzpicture}`

// Valid metadata JSON
const VALID_METADATA = {
  steps: [
    {
      layer: 1,
      label: 'Draw the object',
      labelHe: 'שרטוט העצם',
      explanation: 'Draw the box representing the object on the surface.',
      explanationHe: 'שרטוט הקופסה המייצגת את העצם על המשטח.',
    },
    {
      layer: 2,
      label: 'Weight force',
      labelHe: 'כוח המשקל',
      explanation: 'Add the weight force (mg) pulling downward.',
      explanationHe: 'הוספת כוח המשקל (mg) הפועל כלפי מטה.',
    },
    {
      layer: 3,
      label: 'Normal force',
      labelHe: 'כוח נורמלי',
      explanation: 'Add the normal force pushing upward from the surface.',
      explanationHe: 'הוספת הכוח הנורמלי הדוחף כלפי מעלה מהמשטח.',
    },
  ],
}

beforeEach(() => {
  mockMessagesCreate.mockReset()
  mockValidate.mockReset()
  mockBuildTikzPrompt.mockReset()
  mockBuildTikzPrompt.mockReturnValue('Base TikZ prompt for question')
  jest.spyOn(console, 'log').mockImplementation(() => {})
  jest.spyOn(console, 'warn').mockImplementation(() => {})
  jest.spyOn(console, 'error').mockImplementation(() => {})
})

afterEach(() => {
  jest.restoreAllMocks()
})

// ─── Successful Generation ─────────────────────────────────────────────────────

describe('generateLayeredTikz - successful generation', () => {
  it('returns StepByStepSource with valid layered TikZ and metadata', async () => {
    mockValidate.mockReturnValue(true)

    // First call: generate layered TikZ code
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })

    // Second call: generate step metadata
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(VALID_METADATA) }],
    })

    const result = await generateLayeredTikz('Draw a free body diagram for a 5kg box')

    expect(result).not.toBeNull()
    expect(result!.tikzCode).toBe(VALID_LAYERED_TIKZ)
    expect(result!.steps).toHaveLength(3)
    expect(result!.steps[0].layer).toBe(1)
    expect(result!.steps[0].label).toBe('Draw the object')
    expect(result!.steps[1].layer).toBe(2)
    expect(result!.steps[2].layer).toBe(3)
  })

  it('calls buildTikzPrompt with the question', async () => {
    mockValidate.mockReturnValue(true)

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(VALID_METADATA) }],
    })

    await generateLayeredTikz('Draw a triangle')

    expect(mockBuildTikzPrompt).toHaveBeenCalledWith('Draw a triangle')
  })

  it('makes two API calls (TikZ generation + metadata)', async () => {
    mockValidate.mockReturnValue(true)

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(VALID_METADATA) }],
    })

    await generateLayeredTikz('Draw a free body diagram')

    expect(mockMessagesCreate).toHaveBeenCalledTimes(2)
  })

  it('strips markdown code fences from TikZ response', async () => {
    mockValidate.mockReturnValue(true)

    const wrappedTikz = '```latex\n' + VALID_LAYERED_TIKZ + '\n```'

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: wrappedTikz }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(VALID_METADATA) }],
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).not.toBeNull()
    expect(result!.tikzCode).toBe(VALID_LAYERED_TIKZ)
  })

  it('handles tikz code fence variant', async () => {
    mockValidate.mockReturnValue(true)

    const wrappedTikz = '```tikz\n' + VALID_LAYERED_TIKZ + '\n```'

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: wrappedTikz }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(VALID_METADATA) }],
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).not.toBeNull()
    expect(result!.tikzCode).toBe(VALID_LAYERED_TIKZ)
  })
})

// ─── TikZ Without Layer Markers ─────────────────────────────────────────────────

describe('generateLayeredTikz - no layer markers', () => {
  it('returns null when TikZ code has no layer markers', async () => {
    const tikzNoLayers = `\\begin{tikzpicture}
\\draw (0,0) -- (1,1);
\\end{tikzpicture}`

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: tikzNoLayers }],
    })

    const result = await generateLayeredTikz('Draw a line')

    expect(result).toBeNull()
    // Should not make a second API call for metadata
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
  })
})

// ─── Invalid TikZ (No tikzpicture) ──────────────────────────────────────────────

describe('generateLayeredTikz - invalid TikZ', () => {
  it('returns null when response is not valid TikZ', async () => {
    // Has layer markers but no tikzpicture
    const invalidTikz = `% === LAYER 1: Something ===
This is not TikZ code at all.
% === LAYER 2: Something else ===
Still not TikZ.`

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: invalidTikz }],
    })

    const result = await generateLayeredTikz('Draw something')

    expect(result).toBeNull()
    expect(mockMessagesCreate).toHaveBeenCalledTimes(1)
  })
})

// ─── Invalid Metadata JSON ──────────────────────────────────────────────────────

describe('generateLayeredTikz - invalid metadata', () => {
  it('returns null when metadata response has no JSON', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: 'No JSON here, just plain text.' }],
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })

  it('returns null when metadata JSON is malformed', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: '{ invalid json content' }],
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })
})

// ─── Validation Failure ─────────────────────────────────────────────────────────

describe('generateLayeredTikz - validation failure', () => {
  it('returns null when validateStepByStepSource returns false', async () => {
    mockValidate.mockReturnValue(false)

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })

    // Metadata with missing required fields
    const incompleteMetadata = {
      steps: [
        { layer: 1, label: 'Step 1' }, // Missing labelHe, explanation, explanationHe
      ],
    }

    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: JSON.stringify(incompleteMetadata) }],
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
    expect(mockValidate).toHaveBeenCalled()
  })
})

// ─── API Errors ─────────────────────────────────────────────────────────────────

describe('generateLayeredTikz - API errors', () => {
  it('returns null when first API call throws', async () => {
    mockMessagesCreate.mockRejectedValueOnce(new Error('API rate limited'))

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })

  it('returns null when second API call throws', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockRejectedValueOnce(new Error('Server error'))

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })

  it('returns null when first API call returns no text block', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [], // No blocks at all
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })

  it('returns null when second API call returns no text block', async () => {
    mockMessagesCreate.mockResolvedValueOnce({
      content: [{ type: 'text', text: VALID_LAYERED_TIKZ }],
    })
    mockMessagesCreate.mockResolvedValueOnce({
      content: [], // No blocks
    })

    const result = await generateLayeredTikz('Draw a diagram')

    expect(result).toBeNull()
  })
})
