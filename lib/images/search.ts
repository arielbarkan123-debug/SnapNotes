/**
 * Web Image Search Utility
 *
 * Provides functions to search for relevant educational images
 * from Unsplash API to enhance course content when no images
 * are available from the source documents.
 */

// =============================================================================
// Types
// =============================================================================

export interface SearchedImage {
  /** URL to the image (regular size, ~1080px) */
  url: string
  /** URL to thumbnail (small size, ~400px) */
  thumbnailUrl: string
  /** Alt text description */
  alt: string
  /** Photographer credit */
  credit: string
  /** Link to photographer's profile */
  creditUrl: string
  /** Unsplash photo page URL (for attribution) */
  unsplashUrl: string
  /** Width of the image */
  width: number
  /** Height of the image */
  height: number
}

interface UnsplashPhoto {
  id: string
  urls: {
    raw: string
    full: string
    regular: string
    small: string
    thumb: string
  }
  alt_description: string | null
  description: string | null
  width: number
  height: number
  user: {
    name: string
    links: {
      html: string
    }
  }
  links: {
    html: string
  }
}

interface UnsplashSearchResponse {
  total: number
  total_pages: number
  results: UnsplashPhoto[]
}

// =============================================================================
// Configuration
// =============================================================================

const UNSPLASH_API_URL = 'https://api.unsplash.com'
const DEFAULT_PER_PAGE = 5
const MAX_PER_PAGE = 30
const IMAGE_SEARCH_TIMEOUT_MS = 5000 // 5 second timeout per search

// =============================================================================
// Main Functions
// =============================================================================

/**
 * Search for images on Unsplash by query
 *
 * @param query - Search query (e.g., "biology cell division", "calculus graph")
 * @param options - Search options
 * @returns Array of searched images
 */
export async function searchImages(
  query: string,
  options: {
    /** Number of images to return (default: 5, max: 30) */
    perPage?: number
    /** Orientation filter: landscape, portrait, squarish */
    orientation?: 'landscape' | 'portrait' | 'squarish'
  } = {}
): Promise<SearchedImage[]> {
  const accessKey = process.env.UNSPLASH_ACCESS_KEY

  if (!accessKey) {
    console.warn('UNSPLASH_ACCESS_KEY not set, skipping image search')
    return []
  }

  const { perPage = DEFAULT_PER_PAGE, orientation } = options

  try {
    const params = new URLSearchParams({
      query,
      per_page: Math.min(perPage, MAX_PER_PAGE).toString(),
    })

    if (orientation) {
      params.append('orientation', orientation)
    }

    // Add timeout to prevent hanging on slow API responses
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), IMAGE_SEARCH_TIMEOUT_MS)

    const response = await fetch(
      `${UNSPLASH_API_URL}/search/photos?${params.toString()}`,
      {
        headers: {
          Authorization: `Client-ID ${accessKey}`,
        },
        signal: controller.signal,
      }
    )

    clearTimeout(timeoutId)

    if (!response.ok) {
      if (response.status === 401) {
        console.error('Invalid Unsplash API key')
      } else if (response.status === 403) {
        console.error('Unsplash API rate limit exceeded')
      } else {
        console.error(`Unsplash API error: ${response.status}`)
      }
      return []
    }

    const data: UnsplashSearchResponse = await response.json()

    return data.results.map((photo) => ({
      url: photo.urls.regular,
      thumbnailUrl: photo.urls.small,
      alt: photo.alt_description || photo.description || query,
      credit: photo.user.name,
      creditUrl: photo.user.links.html,
      unsplashUrl: photo.links.html,
      width: photo.width,
      height: photo.height,
    }))
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      // Timeout - silently return empty array
      return []
    }
    console.error('Failed to search images:', error)
    return []
  }
}

/**
 * Search for educational images related to a course topic
 * Adds educational keywords to improve results
 *
 * @param topic - Main topic (e.g., "photosynthesis", "quadratic equations")
 * @param subject - Optional subject context (e.g., "biology", "math")
 * @returns Array of searched images
 */
export async function searchEducationalImages(
  topic: string,
  subject?: string
): Promise<SearchedImage[]> {
  // Build a search query optimized for educational content
  const educationalKeywords = ['diagram', 'illustration', 'educational', 'concept']
  const baseQuery = subject ? `${subject} ${topic}` : topic

  // Try different query variations to get the best results
  const queries = [
    `${baseQuery} ${educationalKeywords[0]}`,
    `${baseQuery} ${educationalKeywords[1]}`,
    baseQuery,
  ]

  // Try the first query
  let results = await searchImages(queries[0], {
    perPage: 3,
    orientation: 'landscape',
  })

  // If no results, try alternate queries
  if (results.length === 0 && queries.length > 1) {
    for (let i = 1; i < queries.length; i++) {
      results = await searchImages(queries[i], {
        perPage: 3,
        orientation: 'landscape',
      })
      if (results.length > 0) break
    }
  }

  return results
}

/**
 * Get images for multiple topics in batch
 * Useful for getting images for an entire course at once
 *
 * @param topics - Array of topics to search for
 * @param subject - Optional subject context
 * @returns Map of topic to images
 */
export async function searchImagesForTopics(
  topics: string[],
  subject?: string
): Promise<Map<string, SearchedImage[]>> {
  const results = new Map<string, SearchedImage[]>()

  // Process in parallel with a limit of 3 concurrent requests
  const batchSize = 3

  for (let i = 0; i < topics.length; i += batchSize) {
    const batch = topics.slice(i, i + batchSize)
    const promises = batch.map(async (topic) => {
      const images = await searchEducationalImages(topic, subject)
      return { topic, images }
    })

    const batchResults = await Promise.all(promises)
    batchResults.forEach(({ topic, images }) => {
      results.set(topic, images)
    })

    // Add a small delay between batches to respect rate limits
    if (i + batchSize < topics.length) {
      await new Promise((resolve) => setTimeout(resolve, 100))
    }
  }

  return results
}

/**
 * Get a single relevant image for a topic (first result)
 *
 * @param topic - Topic to search for
 * @param subject - Optional subject context
 * @returns Single image or null if not found
 */
export async function getImageForTopic(
  topic: string,
  subject?: string
): Promise<SearchedImage | null> {
  const images = await searchEducationalImages(topic, subject)
  return images.length > 0 ? images[0] : null
}
