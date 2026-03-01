/**
 * YouTube Transcript Extractor
 *
 * Extracts captions/subtitles from YouTube videos using the timedtext API.
 * No API key required for public captions.
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

// ─── Transcript Extraction ───────────────────────────────────────────────────

/**
 * Extract transcript from a YouTube video URL.
 */
export async function extractYouTubeTranscript(url: string): Promise<VideoTranscript> {
  const videoId = parseVideoId(url)
  if (!videoId) {
    throw new Error('Invalid YouTube URL')
  }

  // Fetch the video page to get title and caption info
  // CONSENT=YES cookie bypasses EU consent page that Vercel servers may hit
  const pageUrl = `https://www.youtube.com/watch?v=${videoId}`
  const pageResponse = await fetch(pageUrl, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
      'Accept-Language': 'en-US,en;q=0.9',
      'Cookie': 'CONSENT=YES+cb.20210328-17-p0.en+FX+292; GPS=1',
    },
  })

  if (!pageResponse.ok) {
    throw new Error(`Failed to fetch video page: ${pageResponse.status}`)
  }

  const pageHtml = await pageResponse.text()

  // Extract title
  const titleMatch = pageHtml.match(/<title>(.*?)<\/title>/)
  const title = titleMatch
    ? titleMatch[1].replace(' - YouTube', '').trim()
    : 'Untitled Video'

  // Extract caption track info from the page's player response JSON
  const captionTrackUrl = extractCaptionTrackUrl(pageHtml)

  if (!captionTrackUrl) {
    throw new Error('No captions available for this video. Try a video with subtitles enabled.')
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
