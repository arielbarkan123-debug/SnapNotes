/**
 * Tests for diagram-engine/router.ts
 *
 * Covers: routeQuestion, getHybridPipeline, getFallbackPipeline,
 *         fallback keyword scoring, TOPIC_RULES precedence.
 */

// Mock the tikz topic-detector (used internally by routeQuestion for fallback scoring)
jest.mock('@/lib/diagram-engine/tikz', () => ({
  detectTopic: jest.fn(() => ({ confidence: 0, template: null })),
}))

// Mock the logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

// Mock Anthropic SDK (imported at module level in router.ts)
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
})

import {
  routeQuestion,
  getHybridPipeline,
  getFallbackPipeline,
  DESMOS_TYPES,
  GEOGEBRA_TYPES,
  RECHARTS_TYPES,
  MERMAID_TYPES,
  HYBRID_FALLBACKS,
} from '@/lib/diagram-engine/router'
import type { Pipeline, HybridPipeline } from '@/lib/diagram-engine/router'

describe('routeQuestion', () => {
  // ── RECRAFT routing ──

  it('routes anatomy questions to recraft', () => {
    expect(routeQuestion('Draw the human eye anatomy')).toBe('recraft')
  })

  it('routes labeled body part questions to recraft', () => {
    expect(routeQuestion('Show me a labeled brain diagram')).toBe('recraft')
  })

  it('routes cell biology questions to recraft', () => {
    expect(routeQuestion('Diagram of a plant cell with organelles')).toBe('recraft')
  })

  it('routes DNA/chromosome to recraft', () => {
    expect(routeQuestion('Show the structure of DNA double helix')).toBe('recraft')
  })

  it('routes realistic/illustration requests to recraft', () => {
    expect(routeQuestion('Create a realistic illustration of a volcano')).toBe('recraft')
  })

  // ── TIKZ routing ──

  it('routes geometry questions to tikz', () => {
    expect(routeQuestion('Draw a triangle with sides 3, 4, 5')).toBe('tikz')
  })

  it('routes Bohr model / atomic structure to tikz', () => {
    expect(routeQuestion('Show the Bohr model of a carbon atom')).toBe('tikz')
  })

  it('routes cycles (water cycle, carbon cycle) to tikz', () => {
    expect(routeQuestion('Diagram the water cycle')).toBe('tikz')
  })

  it('routes Venn diagram to tikz', () => {
    expect(routeQuestion('Draw a Venn diagram for sets A and B')).toBe('tikz')
  })

  it('routes free body diagram to tikz', () => {
    expect(routeQuestion('Draw a free body diagram for a block on a ramp')).toBe('tikz')
  })

  // ── E2B-MATPLOTLIB routing ──

  it('routes graphing equations to e2b-matplotlib', () => {
    expect(routeQuestion('Graph the function y = x^2 + 3x - 2')).toBe('e2b-matplotlib')
  })

  it('routes scatter plot to e2b-matplotlib', () => {
    expect(routeQuestion('Create a scatter plot of the data')).toBe('e2b-matplotlib')
  })

  it('routes projectile motion to e2b-matplotlib', () => {
    expect(routeQuestion('A ball is kicked at 30 m/s, show the trajectory')).toBe('e2b-matplotlib')
  })

  it('routes unit circle to e2b-matplotlib', () => {
    expect(routeQuestion('Draw the unit circle with key angles')).toBe('e2b-matplotlib')
  })

  // ── E2B-LATEX routing ──

  it('routes long division to e2b-latex', () => {
    expect(routeQuestion('Solve 765/5 with long division')).toBe('e2b-latex')
  })

  it('routes equation solving to e2b-latex', () => {
    expect(routeQuestion('Solve the equation step by step: 2x + 3 = 7')).toBe('e2b-latex')
  })

  it('routes multiplication to e2b-latex', () => {
    expect(routeQuestion('Show 234 × 56 with long multiplication')).toBe('e2b-latex')
  })

  // ── Fallback scoring ──

  it('returns tikz as default when nothing matches', () => {
    // Use a question with no matching keywords at all
    expect(routeQuestion('What is the meaning of life?')).toBe('tikz')
  })
})

describe('getHybridPipeline', () => {
  it('returns desmos for coordinate_plane', () => {
    expect(getHybridPipeline('coordinate_plane')).toBe('desmos')
  })

  it('returns desmos for function_graph', () => {
    expect(getHybridPipeline('function_graph')).toBe('desmos')
  })

  it('returns geogebra for triangle', () => {
    expect(getHybridPipeline('triangle')).toBe('geogebra')
  })

  it('returns geogebra for circle_geometry', () => {
    expect(getHybridPipeline('circle_geometry')).toBe('geogebra')
  })

  it('returns recharts for histogram', () => {
    expect(getHybridPipeline('histogram')).toBe('recharts')
  })

  it('returns recharts for bar_chart', () => {
    expect(getHybridPipeline('bar_chart')).toBe('recharts')
  })

  it('returns mermaid for flowchart', () => {
    expect(getHybridPipeline('flowchart')).toBe('mermaid')
  })

  it('returns mermaid for factor_tree', () => {
    expect(getHybridPipeline('factor_tree')).toBe('mermaid')
  })

  it('returns null for unknown diagram types', () => {
    expect(getHybridPipeline('unknown_type')).toBeNull()
  })

  it('returns null for empty string', () => {
    expect(getHybridPipeline('')).toBeNull()
  })
})

describe('getFallbackPipeline', () => {
  it('tikz falls back to e2b-matplotlib', () => {
    expect(getFallbackPipeline('tikz')).toBe('e2b-matplotlib')
  })

  it('e2b-latex falls back to tikz', () => {
    expect(getFallbackPipeline('e2b-latex')).toBe('tikz')
  })

  it('e2b-matplotlib falls back to tikz', () => {
    expect(getFallbackPipeline('e2b-matplotlib')).toBe('tikz')
  })

  it('recraft falls back to tikz', () => {
    expect(getFallbackPipeline('recraft')).toBe('tikz')
  })
})

describe('HYBRID_FALLBACKS', () => {
  it('has fallback for desmos', () => {
    expect(HYBRID_FALLBACKS['desmos']).toBe('e2b-matplotlib')
  })

  it('has fallback for geogebra', () => {
    expect(HYBRID_FALLBACKS['geogebra']).toBe('tikz')
  })

  it('has fallback for recharts', () => {
    expect(HYBRID_FALLBACKS['recharts']).toBe('e2b-matplotlib')
  })

  it('has fallback for mermaid', () => {
    expect(HYBRID_FALLBACKS['mermaid']).toBe('tikz')
  })
})

describe('Pipeline type arrays', () => {
  it('DESMOS_TYPES contains expected types', () => {
    expect(DESMOS_TYPES).toContain('coordinate_plane')
    expect(DESMOS_TYPES).toContain('function_graph')
    expect(DESMOS_TYPES).toContain('quadratic_graph')
  })

  it('GEOGEBRA_TYPES contains expected types', () => {
    expect(GEOGEBRA_TYPES).toContain('triangle')
    expect(GEOGEBRA_TYPES).toContain('circle_geometry')
    expect(GEOGEBRA_TYPES).toContain('pythagorean_theorem')
  })

  it('RECHARTS_TYPES contains expected types', () => {
    expect(RECHARTS_TYPES).toContain('histogram')
    expect(RECHARTS_TYPES).toContain('pie_chart')
    expect(RECHARTS_TYPES).toContain('box_plot')
  })

  it('MERMAID_TYPES contains expected types', () => {
    expect(MERMAID_TYPES).toContain('flowchart')
    expect(MERMAID_TYPES).toContain('tree_diagram')
    expect(MERMAID_TYPES).toContain('probability_tree')
  })
})
