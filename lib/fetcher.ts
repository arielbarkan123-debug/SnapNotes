/**
 * Simple fetch wrapper for SWR
 * Handles JSON parsing, error responses, and timeouts
 */

// Default timeout for fetch requests (30 seconds)
const FETCH_TIMEOUT_MS = 30000

export class FetchError extends Error {
  status: number
  info: unknown

  constructor(message: string, status: number, info?: unknown) {
    super(message)
    this.name = 'FetchError'
    this.status = status
    this.info = info
  }
}

/**
 * Creates an AbortController with timeout
 */
function createTimeoutController(timeout: number = FETCH_TIMEOUT_MS): {
  controller: AbortController
  clear: () => void
} {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), timeout)
  return {
    controller,
    clear: () => clearTimeout(timeoutId),
  }
}

/**
 * Default fetcher for SWR
 * Automatically parses JSON and throws on error responses
 * Includes timeout protection (30s default)
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const { controller, clear } = createTimeoutController()

  try {
    const response = await fetch(url, { signal: controller.signal })

    if (!response.ok) {
      let info: unknown
      try {
        info = await response.json()
      } catch {
        info = await response.text()
      }

      throw new FetchError(
        `An error occurred while fetching ${url}`,
        response.status,
        info
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(
        `Request to ${url} timed out after ${FETCH_TIMEOUT_MS}ms`,
        408, // Request Timeout
        { timeout: true }
      )
    }
    throw error
  } finally {
    clear()
  }
}

/**
 * Fetcher with options (for POST requests, etc.)
 * Includes timeout protection (30s default)
 */
export async function fetcherWithOptions<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const { controller, clear } = createTimeoutController()

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
      ...options,
      signal: controller.signal,
    })

    if (!response.ok) {
      let info: unknown
      try {
        info = await response.json()
      } catch {
        info = await response.text()
      }

      throw new FetchError(
        `An error occurred while fetching ${url}`,
        response.status,
        info
      )
    }

    return response.json()
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new FetchError(
        `Request to ${url} timed out after ${FETCH_TIMEOUT_MS}ms`,
        408, // Request Timeout
        { timeout: true }
      )
    }
    throw error
  } finally {
    clear()
  }
}

export default fetcher
