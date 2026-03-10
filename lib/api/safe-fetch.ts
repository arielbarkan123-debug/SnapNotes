
import { createLogger } from '@/lib/logger'

const log = createLogger('api:safe-fetch')
/**
 * Safe fetch utility that prevents common errors:
 * 1. Checks Content-Type before parsing JSON
 * 2. Never calls .json() twice
 * 3. Provides meaningful timeout error messages
 * 4. Handles non-JSON responses gracefully
 */

export interface SafeFetchOptions extends RequestInit {
  /** Custom timeout message */
  timeoutMessage?: string
  /** Custom server error message */
  serverErrorMessage?: string
}

export interface SafeFetchResult<T> {
  ok: boolean
  status: number
  data: T | null
  error: string | null
}

/**
 * Safely fetch JSON from an API endpoint
 *
 * @example
 * const { ok, data, error } = await safeFetch<{ sessionId: string }>('/api/practice/session', {
 *   method: 'POST',
 *   body: JSON.stringify({ sessionType: 'quick' }),
 * })
 *
 * if (!ok) {
 *   showError(error)
 *   return
 * }
 *
 * router.push(`/practice/${data.sessionId}`)
 */
export async function safeFetch<T = unknown>(
  url: string,
  options: SafeFetchOptions = {}
): Promise<SafeFetchResult<T>> {
  const {
    timeoutMessage = 'Server timeout. Please try again.',
    serverErrorMessage = 'Server error. Please try again.',
    ...fetchOptions
  } = options

  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...fetchOptions.headers,
      },
      ...fetchOptions,
    })

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      log.error({ detail: [response.status, contentType] }, `Non-JSON response from ${url}`)

      // Detect timeout errors (Vercel returns HTML for these)
      if (response.status === 504 || response.status === 503 || response.status === 502) {
        return {
          ok: false,
          status: response.status,
          data: null,
          error: timeoutMessage,
        }
      }

      return {
        ok: false,
        status: response.status,
        data: null,
        error: serverErrorMessage,
      }
    }

    // Parse JSON once
    let data: T
    try {
      data = await response.json()
    } catch (parseError) {
      log.error({ detail: parseError }, `JSON parse error from ${url}`)
      return {
        ok: false,
        status: response.status,
        data: null,
        error: serverErrorMessage,
      }
    }

    // Handle non-OK responses (but with valid JSON)
    if (!response.ok) {
      const errorMessage = (data as { error?: string; message?: string })?.error
        || (data as { error?: string; message?: string })?.message
        || serverErrorMessage

      return {
        ok: false,
        status: response.status,
        data,
        error: errorMessage,
      }
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
    }
  } catch (networkError) {
    log.error({ detail: networkError }, `Network error for ${url}`)
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Connection error. Please check your internet and try again.',
    }
  }
}

/**
 * Safe fetch for FormData uploads (doesn't set Content-Type header)
 */
export async function safeFetchFormData<T = unknown>(
  url: string,
  formData: FormData,
  options: Omit<SafeFetchOptions, 'body'> = {}
): Promise<SafeFetchResult<T>> {
  const {
    timeoutMessage = 'Upload timeout. Please try again with fewer or smaller files.',
    serverErrorMessage = 'Upload failed. Please try again.',
    headers,
    ...fetchOptions
  } = options

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
      // Don't set Content-Type for FormData - browser sets it with boundary
      headers: headers as HeadersInit,
      ...fetchOptions,
    })

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      log.error({ detail: [response.status, contentType] }, `Non-JSON response from ${url}`)

      if (response.status === 504 || response.status === 503 || response.status === 502) {
        return {
          ok: false,
          status: response.status,
          data: null,
          error: timeoutMessage,
        }
      }

      return {
        ok: false,
        status: response.status,
        data: null,
        error: serverErrorMessage,
      }
    }

    let data: T
    try {
      data = await response.json()
    } catch (parseError) {
      log.error({ detail: parseError }, `JSON parse error from ${url}`)
      return {
        ok: false,
        status: response.status,
        data: null,
        error: serverErrorMessage,
      }
    }

    if (!response.ok) {
      const errorMessage = (data as { error?: string; message?: string })?.error
        || (data as { error?: string; message?: string })?.message
        || serverErrorMessage

      return {
        ok: false,
        status: response.status,
        data,
        error: errorMessage,
      }
    }

    return {
      ok: true,
      status: response.status,
      data,
      error: null,
    }
  } catch (networkError) {
    log.error({ detail: networkError }, `Network error for ${url}`)
    return {
      ok: false,
      status: 0,
      data: null,
      error: 'Connection error. Please check your internet and try again.',
    }
  }
}
