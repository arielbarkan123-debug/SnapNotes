/**
 * Rate limiting for API routes.
 *
 * Backend selection (automatic):
 *   - If UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN are set → Redis (multi-instance safe)
 *   - Otherwise → NO rate limiting (requests allowed, loud warning logged)
 *
 * On Vercel serverless, in-memory fallbacks are useless — each invocation is a
 * separate process. Without Redis configured, rate limiting is non-functional.
 *
 * To disable all rate limiting: set RATE_LIMIT_DISABLED=true
 */

import type { Redis as UpstashRedis } from '@upstash/redis'
import { createLogger } from '@/lib/logger'

const log = createLogger('lib:rate-limit')

// Warn once at module load time if Redis is not configured
if (
  typeof process !== 'undefined' &&
  !process.env.UPSTASH_REDIS_REST_URL &&
  process.env.RATE_LIMIT_DISABLED !== 'true' &&
  process.env.NODE_ENV !== 'test'
) {
  log.warn('UPSTASH_REDIS_REST_URL not set — rate limiting is DISABLED. Set UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN in Vercel env vars.')
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RateLimitConfig {
  /** Maximum number of requests allowed in the window */
  limit: number
  /** Time window in milliseconds */
  windowMs: number
}

export interface RateLimitResult {
  /** Whether the request is allowed */
  allowed: boolean
  /** Number of remaining requests in the current window */
  remaining: number
  /** Time in ms until the rate limit resets */
  resetIn: number
  /** Total limit for the window */
  limit: number
}

// ---------------------------------------------------------------------------
// No-backend fallback — allows request but logs a warning every time
// ---------------------------------------------------------------------------

function checkNoBackend(identifier: string, config: RateLimitConfig): RateLimitResult {
  log.warn(
    { identifier },
    'NO RATE LIMITING BACKEND — request allowed without limit. Configure UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN.'
  )
  return { allowed: true, remaining: config.limit, resetIn: config.windowMs, limit: config.limit }
}

// ---------------------------------------------------------------------------
// Redis backend (Upstash) — loaded lazily to avoid errors when not configured
// ---------------------------------------------------------------------------

type RedisClient = UpstashRedis

// Module-level singleton — Promise prevents multiple Redis instances during
// concurrent cold starts (multiple async calls all pass `if (redisClient)`
// before any of them assigns it).
let redisClient: RedisClient | null | 'unavailable' = null
let redisInitPromise: Promise<RedisClient | null> | null = null

async function getRedisClient(): Promise<RedisClient | null> {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!url || !token) return null
  if (redisClient === 'unavailable') return null
  if (redisClient) return redisClient

  if (!redisInitPromise) {
    redisInitPromise = (async () => {
      try {
        const { Redis } = await import('@upstash/redis')
        redisClient = new Redis({ url, token })
        return redisClient
      } catch (err) {
        log.warn({ err }, 'Failed to initialise Upstash Redis — falling back to in-memory rate limiting')
        redisClient = 'unavailable'
        return null
      }
    })()
  }

  return redisInitPromise
}

async function checkRedis(
  redis: RedisClient,
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const key = `rl:${identifier}`
  const windowSec = Math.ceil(config.windowMs / 1000)

  try {
    // Fixed-window counter using INCR + EXPIRE NX + TTL (three-command pipeline).
    // EXPIRE NX (Redis 7+, Upstash-supported) sets the TTL only when the key
    // has no existing expiry — i.e. only on the first request of each window.
    // Without NX, EXPIRE would reset the TTL on every request, turning the
    // fixed window into a sliding one that never expires under steady load.
    // TTL fetches the actual remaining seconds so resetIn is accurate, not
    // always the full window duration.
    const pipeline = redis.pipeline()
    pipeline.incr(key)
    pipeline.expire(key, windowSec, 'NX')
    pipeline.ttl(key)
    const [count, , ttlSec] = (await pipeline.exec()) as [number, number, number]

    const remaining = Math.max(0, config.limit - count)
    const resetIn = ttlSec > 0 ? ttlSec * 1000 : config.windowMs

    if (count > config.limit) {
      return { allowed: false, remaining: 0, resetIn, limit: config.limit }
    }
    return { allowed: true, remaining, resetIn, limit: config.limit }
  } catch (err) {
    // Fail open on Redis errors to avoid blocking legitimate users
    log.error({ err }, 'Redis rate-limit check failed — allowing request')
    return { allowed: true, remaining: config.limit, resetIn: config.windowMs, limit: config.limit }
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Check rate limit for a given identifier (usually user ID or IP).
 *
 * Now async — uses Redis when configured, otherwise in-memory.
 * All callers that used `checkRateLimit(...)` must now `await` it.
 */
export async function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  if (process.env.RATE_LIMIT_DISABLED === 'true') {
    return { allowed: true, remaining: config.limit, resetIn: config.windowMs, limit: config.limit }
  }

  const redis = await getRedisClient()
  if (redis) return checkRedis(redis, identifier, config)
  return checkNoBackend(identifier, config)
}

/**
 * Parse rate limit from environment variable.
 * Format: "limit,windowMs" e.g. "10,60000" for 10 req/min.
 */
function parseRateLimitEnv(
  envVar: string | undefined,
  defaultLimit: number,
  defaultWindowMs: number
): RateLimitConfig {
  if (!envVar) return { limit: defaultLimit, windowMs: defaultWindowMs }
  const [limitStr, windowMsStr] = envVar.split(',')
  const limit = parseInt(limitStr, 10)
  const windowMs = parseInt(windowMsStr, 10)
  if (isNaN(limit) || isNaN(windowMs) || limit <= 0 || windowMs <= 0) {
    log.warn(`Invalid rate limit env format: ${envVar}, using defaults`)
    return { limit: defaultLimit, windowMs: defaultWindowMs }
  }
  return { limit, windowMs }
}

/**
 * Pre-configured rate limits. Override via environment variables.
 */
export const RATE_LIMITS = {
  // AI-intensive (expensive)
  generateCourse:    parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_COURSE,     5, 60_000),
  generateExam:      parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_EXAM,       10, 60_000),
  generateQuestions: parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_QUESTIONS,  20, 60_000),
  chat:              parseRateLimitEnv(process.env.RATE_LIMIT_CHAT,                30, 60_000),
  studyPlanChat:     parseRateLimitEnv(process.env.RATE_LIMIT_STUDY_PLAN_CHAT,     30, 60_000),
  evaluateAnswer:    parseRateLimitEnv(process.env.RATE_LIMIT_EVALUATE_ANSWER,     30, 60_000),
  // Medium
  upload:            parseRateLimitEnv(process.env.RATE_LIMIT_UPLOAD,              20, 60_000),
  search:            parseRateLimitEnv(process.env.RATE_LIMIT_SEARCH,              50, 60_000),
  // Auth (brute-force protection)
  login:             parseRateLimitEnv(process.env.RATE_LIMIT_LOGIN,               10, 15 * 60_000),
  forgotPassword:    parseRateLimitEnv(process.env.RATE_LIMIT_FORGOT_PASSWORD,      5, 60 * 60_000),
}

/** Rate limit response headers. */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit':     result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset':     Math.ceil(result.resetIn / 1000).toString(),
  }
}

/** Get identifier — user ID when authenticated, IP otherwise. */
export function getIdentifier(userId: string | undefined, request: Request): string {
  if (userId) return `user:${userId}`
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'
  return `ip:${ip}`
}
