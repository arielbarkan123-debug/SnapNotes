/**
 * Typed Fetch Wrapper
 *
 * A reusable fetch utility with consistent error handling and type safety.
 * Simplifies API calls across hooks and components.
 */

export interface FetchError extends Error {
  status?: number
  statusText?: string
  data?: unknown
}

export interface FetchOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
}

/**
 * Creates a FetchError with additional context
 */
function createFetchError(
  message: string,
  status?: number,
  statusText?: string,
  data?: unknown
): FetchError {
  const error = new Error(message) as FetchError
  error.name = 'FetchError'
  error.status = status
  error.statusText = statusText
  error.data = data
  return error
}

/**
 * Fetches JSON from an API endpoint with type safety and error handling
 *
 * @template T - The expected response type
 * @param url - The URL to fetch
 * @param options - Optional fetch configuration
 * @returns Promise resolving to the typed response data
 * @throws FetchError if the request fails or response is not ok
 *
 * @example
 * ```ts
 * // GET request
 * const courses = await fetchJSON<Course[]>('/api/courses')
 *
 * // POST request
 * const session = await fetchJSON<Session>('/api/sessions', {
 *   method: 'POST',
 *   body: { courseId: '123' }
 * })
 * ```
 */
export async function fetchJSON<T>(url: string, options?: FetchOptions): Promise<T> {
  const { body, ...restOptions } = options || {}

  const config: RequestInit = {
    ...restOptions,
    headers: {
      'Content-Type': 'application/json',
      ...restOptions?.headers,
    },
  }

  // Add body if provided
  if (body !== undefined) {
    config.body = JSON.stringify(body)
  }

  let response: Response
  try {
    response = await fetch(url, config)
  } catch (error) {
    throw createFetchError(
      error instanceof Error ? error.message : 'Network request failed'
    )
  }

  // Parse response
  let data: unknown
  try {
    data = await response.json()
  } catch {
    // Response might not be JSON
    if (!response.ok) {
      throw createFetchError(
        response.statusText || 'Request failed',
        response.status,
        response.statusText
      )
    }
    throw createFetchError('Invalid JSON response', response.status, response.statusText)
  }

  // Check for error response
  if (!response.ok) {
    const errorMessage =
      (data as { message?: string })?.message ||
      (data as { error?: string })?.error ||
      response.statusText ||
      'Request failed'

    throw createFetchError(errorMessage, response.status, response.statusText, data)
  }

  return data as T
}

/**
 * Creates a fetcher function for use with SWR
 *
 * @example
 * ```ts
 * const { data, error } = useSWR<Course[]>('/api/courses', swrFetcher)
 * ```
 */
export const swrFetcher = <T>(url: string): Promise<T> => fetchJSON<T>(url)

/**
 * Checks if an error is a FetchError
 */
export function isFetchError(error: unknown): error is FetchError {
  return error instanceof Error && error.name === 'FetchError'
}

/**
 * Extracts a user-friendly error message from any error
 */
export function getErrorMessage(error: unknown): string {
  if (isFetchError(error)) {
    return error.message
  }
  if (error instanceof Error) {
    return error.message
  }
  if (typeof error === 'string') {
    return error
  }
  return 'An unexpected error occurred'
}
