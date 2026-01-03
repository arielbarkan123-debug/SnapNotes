/**
 * Simple in-memory rate limiting for API routes
 *
 * Note: This is suitable for single-instance deployments.
 * For multi-instance/serverless, use Redis (e.g., Upstash) instead.
 */

interface RateLimitEntry {
  count: number
  resetTime: number
}

// In-memory store for rate limiting
// Map<identifier, RateLimitEntry>
const rateLimitStore = new Map<string, RateLimitEntry>()

// Clean up expired entries periodically (every 5 minutes)
let lastCleanup = Date.now()
const CLEANUP_INTERVAL_MS = 5 * 60 * 1000

function cleanup() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return

  lastCleanup = now
  for (const [key, entry] of rateLimitStore.entries()) {
    if (now > entry.resetTime) {
      rateLimitStore.delete(key)
    }
  }
}

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

/**
 * Check rate limit for a given identifier (usually user ID or IP)
 */
export function checkRateLimit(
  identifier: string,
  config: RateLimitConfig
): RateLimitResult {
  cleanup()

  const now = Date.now()
  const key = identifier
  const entry = rateLimitStore.get(key)

  // No existing entry or window expired - create new entry
  if (!entry || now > entry.resetTime) {
    rateLimitStore.set(key, {
      count: 1,
      resetTime: now + config.windowMs,
    })
    return {
      allowed: true,
      remaining: config.limit - 1,
      resetIn: config.windowMs,
      limit: config.limit,
    }
  }

  // Within existing window
  const remaining = Math.max(0, config.limit - entry.count - 1)
  const resetIn = entry.resetTime - now

  if (entry.count >= config.limit) {
    // Rate limit exceeded
    return {
      allowed: false,
      remaining: 0,
      resetIn,
      limit: config.limit,
    }
  }

  // Increment counter
  entry.count++
  return {
    allowed: true,
    remaining,
    resetIn,
    limit: config.limit,
  }
}

/**
 * Parse rate limit from environment variable
 * Format: "limit,windowMs" e.g., "10,60000" for 10 requests per minute
 */
function parseRateLimitEnv(envVar: string | undefined, defaultLimit: number, defaultWindowMs: number): RateLimitConfig {
  if (!envVar) {
    return { limit: defaultLimit, windowMs: defaultWindowMs }
  }
  const [limitStr, windowMsStr] = envVar.split(',')
  const limit = parseInt(limitStr, 10)
  const windowMs = parseInt(windowMsStr, 10)
  if (isNaN(limit) || isNaN(windowMs) || limit <= 0 || windowMs <= 0) {
    console.warn(`Invalid rate limit env format: ${envVar}, using defaults`)
    return { limit: defaultLimit, windowMs: defaultWindowMs }
  }
  return { limit, windowMs }
}

/**
 * Pre-configured rate limits for different API operations
 * All limits can be overridden via environment variables:
 * RATE_LIMIT_GENERATE_COURSE, RATE_LIMIT_CHAT, etc.
 */
export const RATE_LIMITS = {
  // AI-intensive operations (expensive)
  generateCourse: parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_COURSE, 5, 60 * 1000),
  generateExam: parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_EXAM, 10, 60 * 1000),
  generateQuestions: parseRateLimitEnv(process.env.RATE_LIMIT_GENERATE_QUESTIONS, 20, 60 * 1000),
  chat: parseRateLimitEnv(process.env.RATE_LIMIT_CHAT, 30, 60 * 1000),
  evaluateAnswer: parseRateLimitEnv(process.env.RATE_LIMIT_EVALUATE_ANSWER, 30, 60 * 1000),

  // Medium operations
  upload: parseRateLimitEnv(process.env.RATE_LIMIT_UPLOAD, 20, 60 * 1000),
  search: parseRateLimitEnv(process.env.RATE_LIMIT_SEARCH, 50, 60 * 1000),

  // Auth operations (protect against brute force)
  login: parseRateLimitEnv(process.env.RATE_LIMIT_LOGIN, 10, 15 * 60 * 1000),
  forgotPassword: parseRateLimitEnv(process.env.RATE_LIMIT_FORGOT_PASSWORD, 5, 60 * 60 * 1000),
}

/**
 * Get rate limit headers for response
 */
export function getRateLimitHeaders(result: RateLimitResult): Record<string, string> {
  return {
    'X-RateLimit-Limit': result.limit.toString(),
    'X-RateLimit-Remaining': result.remaining.toString(),
    'X-RateLimit-Reset': Math.ceil(result.resetIn / 1000).toString(),
  }
}

/**
 * Helper to get identifier from request
 * Prefers user ID if authenticated, falls back to IP
 */
export function getIdentifier(
  userId: string | undefined,
  request: Request
): string {
  if (userId) {
    return `user:${userId}`
  }

  // Get IP from headers (handle proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded
    ? forwarded.split(',')[0].trim()
    : request.headers.get('x-real-ip') || 'unknown'

  return `ip:${ip}`
}
