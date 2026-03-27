/**
 * Tests for fsrs-optimizer.ts
 *
 * Tests shouldOptimize, getUserFSRSParams, and optimizeFSRSParams.
 * All functions take a SupabaseClient as first argument — we mock it directly.
 */

import { FSRS_PARAMS } from '@/lib/srs/fsrs'
import {
  shouldOptimize,
  getUserFSRSParams,
  optimizeFSRSParams,
} from '@/lib/srs/fsrs-optimizer'

// Suppress log output during tests
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

// =============================================================================
// Helpers to build mock Supabase chains
// =============================================================================

function makeCountChain(count: number) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockResolvedValue({ count })
  return chain
}

function makeSingleChain(data: unknown) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.maybeSingle = jest.fn().mockResolvedValue({ data })
  return chain
}

function makeLogsChain(
  data: unknown[] | null,
  count: number | null
) {
  const chain: Record<string, jest.Mock> = {}
  chain.select = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockReturnValue(chain)
  chain.order = jest.fn().mockReturnValue(chain)
  chain.limit = jest.fn().mockResolvedValue({ data, count })
  return chain
}

function makeUpdateChain(error: unknown = null) {
  const chain: Record<string, jest.Mock> = {}
  chain.update = jest.fn().mockReturnValue(chain)
  chain.eq = jest.fn().mockResolvedValue({ error })
  return chain
}

// =============================================================================
// shouldOptimize
// =============================================================================

describe('shouldOptimize', () => {
  it('returns false when review count is below 50', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeCountChain(30)),
    } as unknown as Parameters<typeof shouldOptimize>[0]

    const result = await shouldOptimize(supabase, 'user-1')

    expect(result.should).toBe(false)
    expect(result.reviewCount).toBe(30)
  })

  it('returns true when review count is exactly 50', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeCountChain(50)),
    } as unknown as Parameters<typeof shouldOptimize>[0]

    const result = await shouldOptimize(supabase, 'user-1')

    expect(result.should).toBe(true)
    expect(result.reviewCount).toBe(50)
  })

  it('returns true when review count exceeds 50', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeCountChain(200)),
    } as unknown as Parameters<typeof shouldOptimize>[0]

    const result = await shouldOptimize(supabase, 'user-1')

    expect(result.should).toBe(true)
    expect(result.reviewCount).toBe(200)
  })

  it('treats null count as 0', async () => {
    const chain: Record<string, jest.Mock> = {}
    chain.select = jest.fn().mockReturnValue(chain)
    chain.eq = jest.fn().mockResolvedValue({ count: null })
    const supabase = {
      from: jest.fn().mockReturnValue(chain),
    } as unknown as Parameters<typeof shouldOptimize>[0]

    const result = await shouldOptimize(supabase, 'user-1')

    expect(result.should).toBe(false)
    expect(result.reviewCount).toBe(0)
  })
})

// =============================================================================
// getUserFSRSParams
// =============================================================================

describe('getUserFSRSParams', () => {
  it('returns default FSRS_PARAMS when no custom params exist', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeSingleChain(null)),
    } as unknown as Parameters<typeof getUserFSRSParams>[0]

    const result = await getUserFSRSParams(supabase, 'user-1')

    expect(result).toEqual(FSRS_PARAMS)
  })

  it('returns default FSRS_PARAMS when fsrs_params has no w field', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(
        makeSingleChain({ fsrs_params: { requestRetention: 0.85 } })
      ),
    } as unknown as Parameters<typeof getUserFSRSParams>[0]

    const result = await getUserFSRSParams(supabase, 'user-1')

    expect(result).toEqual(FSRS_PARAMS)
  })

  it('merges custom params with defaults', async () => {
    const customParams = {
      w: [0.5, 0.7, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49, 0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61],
      requestRetention: 0.85,
    }
    const supabase = {
      from: jest.fn().mockReturnValue(
        makeSingleChain({ fsrs_params: customParams })
      ),
    } as unknown as Parameters<typeof getUserFSRSParams>[0]

    const result = await getUserFSRSParams(supabase, 'user-1')

    expect(result.requestRetention).toBe(0.85)
    expect(result.w[0]).toBe(0.5)
    // Should still have defaults for fields not overridden
    expect(result.maximumInterval).toBe(FSRS_PARAMS.maximumInterval)
    expect(result.easyBonus).toBe(FSRS_PARAMS.easyBonus)
    expect(result.hardInterval).toBe(FSRS_PARAMS.hardInterval)
  })

  it('returns default params when data row exists but fsrs_params is null', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(
        makeSingleChain({ fsrs_params: null })
      ),
    } as unknown as Parameters<typeof getUserFSRSParams>[0]

    const result = await getUserFSRSParams(supabase, 'user-1')

    expect(result).toEqual(FSRS_PARAMS)
  })
})

// =============================================================================
// optimizeFSRSParams
// =============================================================================

describe('optimizeFSRSParams', () => {
  it('returns not optimized when fewer than 50 reviews', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeLogsChain(null, 30)),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(false)
    expect(result.reviewCount).toBe(30)
    expect(result.params).toBeUndefined()
  })

  it('returns not optimized when logs data is null', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeLogsChain(null, 60)),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(false)
  })

  it('blends retention toward actual rate and clamps to [0.80, 0.95]', async () => {
    // Build 100 logs where all are "Good" (rating=3) so retention = 100%
    const logs = Array.from({ length: 100 }, () => ({
      rating: 3,
      elapsed_days: 5,
      stability_before: 5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) {
          return makeLogsChain(logs, 100)
        }
        // Second call: update
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(true)
    expect(result.params).toBeDefined()
    // Actual retention = 1.0, blend = 0.9 + (1.0 - 0.9) * 0.5 = 0.95
    // Clamped to [0.80, 0.95] -> 0.95
    expect(result.params!.requestRetention).toBe(0.95)
  })

  it('clamps retention to minimum 0.80 when actual retention is very low', async () => {
    // Build 100 logs where all are "Again" (rating=1) so retention = 0%
    const logs = Array.from({ length: 100 }, () => ({
      rating: 1,
      elapsed_days: 5,
      stability_before: 5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(true)
    // Actual retention = 0.0, blend = 0.9 + (0.0 - 0.9) * 0.5 = 0.45
    // Clamped to 0.80
    expect(result.params!.requestRetention).toBe(0.8)
  })

  it('scales w[0], w[1] up when new-card retention is high (>0.8)', async () => {
    // All logs are "Good" (rating=3) and stability <= 1 (new cards)
    const logs = Array.from({ length: 100 }, () => ({
      rating: 3,
      elapsed_days: 0,
      stability_before: 0.5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(true)
    // New card retention = 1.0 > 0.8, so multiplier = 1.2
    expect(result.params!.w[0]).toBeCloseTo(FSRS_PARAMS.w[0] * 1.2)
    expect(result.params!.w[1]).toBeCloseTo(FSRS_PARAMS.w[1] * 1.2)
  })

  it('scales w[0], w[1] down when new-card retention is low (<0.6)', async () => {
    // Mix: 70 Again (rating=1) on new cards + 30 Good (rating=3) on old cards
    const logs = [
      ...Array.from({ length: 70 }, () => ({
        rating: 1,
        elapsed_days: 0,
        stability_before: 0.5,
        difficulty_before: 0.3,
      })),
      ...Array.from({ length: 30 }, () => ({
        rating: 3,
        elapsed_days: 5,
        stability_before: 5,
        difficulty_before: 0.3,
      })),
    ]

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(true)
    // New card logs: 70 Again (retention=0) out of 70 new card logs
    // New card retention = 0/70 = 0.0 < 0.6 -> multiplier = 0.8
    expect(result.params!.w[0]).toBeCloseTo(FSRS_PARAMS.w[0] * 0.8)
    expect(result.params!.w[1]).toBeCloseTo(FSRS_PARAMS.w[1] * 0.8)
  })

  it('keeps w[0], w[1] unchanged when new-card retention is moderate (0.6-0.8)', async () => {
    // 70% new cards succeed: 70 Good (new) + 30 Again (new)
    const logs = [
      ...Array.from({ length: 70 }, () => ({
        rating: 3,
        elapsed_days: 0,
        stability_before: 0.5,
        difficulty_before: 0.3,
      })),
      ...Array.from({ length: 30 }, () => ({
        rating: 1,
        elapsed_days: 0,
        stability_before: 0.5,
        difficulty_before: 0.3,
      })),
    ]

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(true)
    // New card retention = 70/100 = 0.70 -> between 0.6 and 0.8 -> multiplier = 1.0
    expect(result.params!.w[0]).toBeCloseTo(FSRS_PARAMS.w[0])
    expect(result.params!.w[1]).toBeCloseTo(FSRS_PARAMS.w[1])
  })

  it('does not change other w values beyond w[0] and w[1]', async () => {
    const logs = Array.from({ length: 100 }, () => ({
      rating: 3,
      elapsed_days: 0,
      stability_before: 0.5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.params).toBeDefined()
    // w[2] through w[16] should be unchanged
    for (let i = 2; i < 17; i++) {
      expect(result.params!.w[i]).toBe(FSRS_PARAMS.w[i])
    }
  })

  it('returns not optimized when DB update fails', async () => {
    const logs = Array.from({ length: 100 }, () => ({
      rating: 3,
      elapsed_days: 5,
      stability_before: 5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain({ message: 'DB error' })
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.optimized).toBe(false)
    expect(result.reviewCount).toBe(100)
    expect(result.params).toBeUndefined()
  })

  it('returns the review count even when not optimized', async () => {
    const supabase = {
      from: jest.fn().mockReturnValue(makeLogsChain([], 10)),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.reviewCount).toBe(10)
  })

  it('preserves default easyBonus, hardInterval, maximumInterval', async () => {
    const logs = Array.from({ length: 100 }, () => ({
      rating: 3,
      elapsed_days: 5,
      stability_before: 5,
      difficulty_before: 0.3,
    }))

    let callIdx = 0
    const supabase = {
      from: jest.fn().mockImplementation(() => {
        callIdx++
        if (callIdx === 1) return makeLogsChain(logs, 100)
        return makeUpdateChain(null)
      }),
    } as unknown as Parameters<typeof optimizeFSRSParams>[0]

    const result = await optimizeFSRSParams(supabase, 'user-1')

    expect(result.params!.easyBonus).toBe(FSRS_PARAMS.easyBonus)
    expect(result.params!.hardInterval).toBe(FSRS_PARAMS.hardInterval)
    expect(result.params!.maximumInterval).toBe(FSRS_PARAMS.maximumInterval)
  })
})
