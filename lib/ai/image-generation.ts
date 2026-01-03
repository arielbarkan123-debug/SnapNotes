/**
 * Image Generation using Gemini Nano Banana API
 * Uses gemini-2.5-flash-image model for AI-generated course covers
 */

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY
const IS_DEV = process.env.NODE_ENV === 'development'

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_DELAY_MS = 1000

// Only log in development to avoid leaking data in production
function devLog(...args: unknown[]) {
  if (IS_DEV) {
    console.log(...args)
  }
}

function devError(...args: unknown[]) {
  if (IS_DEV) {
    console.error(...args)
  }
}

interface GenerateImageResult {
  success: boolean
  imageBase64?: string
  mimeType?: string
  imageUrl?: string
  error?: string
}

interface GeminiImageResponse {
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string
        inlineData?: {
          mimeType: string
          data: string
        }
      }>
    }
  }>
  error?: {
    code: number
    message: string
    status: string
  }
}

/**
 * Sleep helper for retry delays
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Check if error is retryable (transient failures)
 */
function isRetryableError(error: string): boolean {
  const retryablePatterns = [
    'rate',
    'quota',
    'timeout',
    'network',
    'ECONNRESET',
    'ETIMEDOUT',
    '503',
    '429',
    '500',
    '502',
    '504'
  ]
  return retryablePatterns.some(pattern =>
    error.toLowerCase().includes(pattern.toLowerCase())
  )
}

/**
 * Generate a cover image for a course using Gemini Nano Banana
 * Includes retry logic with exponential backoff
 */
export async function generateCourseImage(courseTitle: string): Promise<GenerateImageResult> {
  if (!GOOGLE_AI_API_KEY) {
    devError('[ImageGen] GOOGLE_AI_API_KEY not configured')
    return { success: false, error: 'API key not configured' }
  }

  let lastError: string = 'Unknown error'

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    const result = await generateCourseImageAttempt(courseTitle, attempt)

    if (result.success) {
      return result
    }

    lastError = result.error || 'Unknown error'

    // Don't retry non-retryable errors (region restrictions, permanent failures)
    if (!isRetryableError(lastError)) {
      return result
    }

    // Don't sleep after the last attempt
    if (attempt < MAX_RETRIES) {
      const delay = INITIAL_DELAY_MS * Math.pow(2, attempt - 1) // Exponential backoff
      devLog(`[ImageGen] Retry ${attempt}/${MAX_RETRIES} in ${delay}ms`)
      await sleep(delay)
    }
  }

  return { success: false, error: `Failed after ${MAX_RETRIES} attempts: ${lastError}` }
}

/**
 * Single attempt to generate a cover image
 */
async function generateCourseImageAttempt(courseTitle: string, attempt: number): Promise<GenerateImageResult> {
  // Build a detailed prompt for educational cover images
  const prompt = `Generate a beautiful, professional cover image for an educational course titled "${courseTitle}".

Requirements:
- Modern, clean aesthetic with vibrant colors
- Abstract or symbolic representation of the subject matter
- NO text, words, letters, or numbers in the image
- Suitable as a course thumbnail/cover
- Professional and visually appealing
- Good color harmony and composition`

  try {
    devLog(`[ImageGen] Attempt ${attempt}/${MAX_RETRIES} - Generating image`)

    const response = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': GOOGLE_AI_API_KEY as string,
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [{ text: prompt }]
            }
          ],
          generationConfig: {
            responseModalities: ['IMAGE', 'TEXT'],
          },
        }),
      }
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      devError('[ImageGen] Gemini API error:', response.status)

      const errorMessage = errorData?.error?.message || response.statusText

      if (errorMessage.includes('not available') || errorMessage.includes('region') || errorMessage.includes('country')) {
        return {
          success: false,
          error: 'Image generation not available in your region.'
        }
      }

      if (errorMessage.includes('quota') || errorMessage.includes('rate')) {
        return {
          success: false,
          error: 'API rate limit reached. Please try again later.'
        }
      }

      return {
        success: false,
        error: `API error: ${response.status} - ${errorMessage}`
      }
    }

    const data: GeminiImageResponse = await response.json()

    // Extract image from Gemini response - look for inlineData in parts
    if (data.candidates && data.candidates.length > 0) {
      const candidate = data.candidates[0]
      const parts = candidate.content?.parts || []

      for (const part of parts) {
        if (part.inlineData) {
          devLog(`[ImageGen] Success on attempt ${attempt}`)
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          }
        }
      }
    }

    devError('[ImageGen] No image in response')
    return { success: false, error: 'No image generated in response' }
  } catch (error) {
    devError('[ImageGen] Failed to generate image:', error instanceof Error ? error.message : 'Unknown')
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }
  }
}

/**
 * Convert base64 image to a data URL
 */
export function createImageDataUrl(base64: string, mimeType: string): string {
  return `data:${mimeType};base64,${base64}`
}
