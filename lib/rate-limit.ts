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
 * Pre-configured rate limits for different API operations
 */
export const RATE_LIMITS = {
  // AI-intensive operations (expensive)
  generateCourse: { limit: 5, windowMs: 60 * 1000 }, // 5 per minute
  generateExam: { limit: 10, windowMs: 60 * 1000 }, // 10 per minute
  generateQuestions: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  chat: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute
  evaluateAnswer: { limit: 30, windowMs: 60 * 1000 }, // 30 per minute

  // Medium operations
  upload: { limit: 20, windowMs: 60 * 1000 }, // 20 per minute
  search: { limit: 50, windowMs: 60 * 1000 }, // 50 per minute

  // Auth operations (protect against brute force)
  login: { limit: 10, windowMs: 15 * 60 * 1000 }, // 10 per 15 minutes
  forgotPassword: { limit: 5, windowMs: 60 * 60 * 1000 }, // 5 per hour
} as const

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
