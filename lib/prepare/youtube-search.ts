/**
 * YouTube Data API v3 Client
 * Searches for educational videos to embed in study guides
 */

import type { GuideYouTubeVideo } from '@/types/prepare'

const YOUTUBE_API_BASE = 'https://www.googleapis.com/youtube/v3'

interface YouTubeSearchItem {
  id: { videoId: string }
  snippet: {
    title: string
    channelTitle: string
    thumbnails: {
      medium?: { url: string }
      default?: { url: string }
    }
  }
}

interface YouTubeSearchResponse {
  items?: YouTubeSearchItem[]
}

/**
 * Search YouTube for educational videos matching a query
 * Returns empty array if no API key is configured (graceful degradation)
 */
export async function searchYouTubeVideos(
  query: string,
  maxResults: number = 2
): Promise<GuideYouTubeVideo[]> {
  const apiKey = process.env.YOUTUBE_DATA_API_KEY
  if (!apiKey) {
    console.warn('[YouTube] No YOUTUBE_DATA_API_KEY configured, skipping video search')
    return []
  }

  try {
    const params = new URLSearchParams({
      part: 'snippet',
      q: query,
      type: 'video',
      maxResults: String(maxResults),
      videoEmbeddable: 'true',
      relevanceLanguage: 'en',
      safeSearch: 'strict',
      key: apiKey,
    })

    const response = await fetch(`${YOUTUBE_API_BASE}/search?${params}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      console.error(`[YouTube] API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data: YouTubeSearchResponse = await response.json()

    if (!data.items?.length) {
      return []
    }

    return data.items.map((item) => ({
      videoId: item.id.videoId,
      title: item.snippet.title,
      channelTitle: item.snippet.channelTitle,
      thumbnailUrl: item.snippet.thumbnails.medium?.url || item.snippet.thumbnails.default?.url || '',
      searchQuery: query,
    }))
  } catch (error) {
    console.error('[YouTube] Search failed:', error)
    return []
  }
}

/**
 * Search for multiple queries in parallel
 * Returns all results grouped by query
 */
export async function searchMultipleQueries(
  queries: string[],
  maxResultsPerQuery: number = 2
): Promise<GuideYouTubeVideo[]> {
  if (!queries.length) return []

  const results = await Promise.allSettled(
    queries.map((query) => searchYouTubeVideos(query, maxResultsPerQuery))
  )

  const allVideos: GuideYouTubeVideo[] = []
  const seenIds = new Set<string>()

  for (const result of results) {
    if (result.status === 'fulfilled') {
      for (const video of result.value) {
        if (!seenIds.has(video.videoId)) {
          seenIds.add(video.videoId)
          allVideos.push(video)
        }
      }
    }
  }

  return allVideos
}
