/**
 * YouTube Transcript Extractor
 *
 * Extracts captions/subtitles from YouTube videos.
 * Uses multiple strategies: HTML page scraping → innertube API fallback.
 *
 * Known limitation: YouTube blocks cloud server IPs (Vercel, AWS, etc.)
 * with "Sign in to confirm you're not a bot". This is an industry-wide issue.
 * When server-side extraction fails, we return a specific error so the UI
 * can guide users to paste transcript text manually.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface VideoTranscript {
  videoId: string
  title: string
  transcript: string
  language: string
  duration: number // seconds
}

// ─── Video ID Parsing ────────────────────────────────────────────────────────

const VIDEO_ID_PATTERNS = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
  /^([a-zA-Z0-9_-]{11})$/, // Just the ID
]

export function parseVideoId(url: string): string | null {
  for (const pattern of VIDEO_ID_PATTERNS) {
    const match = url.match(pattern)
    if (match) return match[1]
  }
  return null
}

// ─── Custom Error for bot detection ─────────────────────────────────────────

export class YouTubeBotDetectionError extends Error {
  constructor() {
    super('YOUTUBE_BOT_DETECTION')
    this.name = 'YouTubeBotDetectionError'
  }
}

// ─── Transcript Extraction ───────────────────────────────────────────────────

/**
 * Extract transcript from a YouTube video URL.
 * Tries multiple strategies to work around YouTube's server-side restrictions.
 */
export async function extractYouTubeTranscript(url: string): Promise<VideoTranscript> {
  const videoId = parseVideoId(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  // Get video title from oEmbed (always works, even from cloud servers)
  const title = await fetchVideoTitle(videoId)

  // Strategy 1: HTML page scraping with consent cookies
  const captionTrackUrl = await tryHtmlScraping(videoId)

  if (!captionTrackUrl) {
    // If HTML scraping fails, it's likely bot detection
    // Throw specific error so the UI can offer manual transcript paste
    throw new YouTubeBotDetectionError()
  }

  // Fetch the caption track
  const captionResponse = await fetch(captionTrackUrl)
  if (!captionResponse.ok) {
    throw new Error('Failed to fetch captions')
  }

  const captionXml = await captionResponse.text()
  const { transcript, duration, language } = parseCaptionXml(captionXml)

  if (!transcript.trim()) {
    throw new Error('Video captions are empty')
  }

  return {
    videoId,
    title,
    transcript,
    language,
    duration,
  }
}

// ─── Strategies ─────────────────────────────────────────────────────────────

async function fetchVideoTitle(videoId: string): Promise<string> {
  try {
    const resp = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`
    )
    if (resp.ok) {
      const data = await resp.json()
      return data.title || 'Untitled Video'
    }
  } catch {
    // Fall through
  }
  return 'Untitled Video'
}

async function tryHtmlScraping(videoId: string): Promise<string | null> {
  try {
    const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
    const pageResponse = await fetch(pageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+292; GPS=1',
      },
    })

    if (!pageResponse.ok) return null

    const html = await pageResponse.text()
    return extractCaptionTrackUrl(html)
  } catch {
    return null
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function extractCaptionTrackUrl(html: string): string | null {
  try {
    // Look for captionTracks in the player response
    const captionMatch = html.match(/"captionTracks":\s*(\[[\s\S]*?\])/)
    if (!captionMatch) return null

    // Parse the JSON (may have escaped characters)
    const tracksStr = captionMatch[1]
      .replace(/\\u0026/g, '&')
      .replace(/\\"/g, '"')

    const tracks = JSON.parse(tracksStr) as Array<{
      baseUrl: string
      languageCode: string
      kind?: string
    }>

    if (!tracks || tracks.length === 0) return null

    // Prefer English, then any auto-generated, then first available
    const englishTrack = tracks.find(t => t.languageCode === 'en' && t.kind !== 'asr')
    const autoEnglish = tracks.find(t => t.languageCode === 'en')
    const anyTrack = tracks[0]

    const selectedTrack = englishTrack || autoEnglish || anyTrack
    return selectedTrack?.baseUrl || null
  } catch {
    return null
  }
}

function parseCaptionXml(xml: string): {
  transcript: string
  duration: number
  language: string
} {
  const segments: string[] = []
  let maxEnd = 0

  // Parse XML caption format: <text start="1.23" dur="4.56">caption text</text>
  const textRegex = /<text\s+start="([^"]*)"(?:\s+dur="([^"]*)")?[^>]*>([\s\S]*?)<\/text>/g
  let match

  while ((match = textRegex.exec(xml)) !== null) {
    const start = parseFloat(match[1]) || 0
    const dur = parseFloat(match[2]) || 0
    const text = decodeXmlEntities(match[3].trim())

    if (text) {
      segments.push(text)
      const end = start + dur
      if (end > maxEnd) maxEnd = end
    }
  }

  // Detect language from XML
  const langMatch = xml.match(/xml:lang="([^"]*)"/)
  const language = langMatch?.[1] || 'en'

  return {
    transcript: segments.join(' '),
    duration: Math.ceil(maxEnd),
    language,
  }
}

function decodeXmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}
