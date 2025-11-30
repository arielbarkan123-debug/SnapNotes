/**
 * Simple fetch wrapper for SWR
 * Handles JSON parsing and error responses
 */

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
 * Default fetcher for SWR
 * Automatically parses JSON and throws on error responses
 */
export async function fetcher<T = unknown>(url: string): Promise<T> {
  const response = await fetch(url)

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
}

/**
 * Fetcher with options (for POST requests, etc.)
 */
export async function fetcherWithOptions<T = unknown>(
  url: string,
  options?: RequestInit
): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
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
}

export default fetcher
