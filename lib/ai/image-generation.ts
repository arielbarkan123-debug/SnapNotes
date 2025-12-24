/**
 * Image Generation using Gemini Nano Banana API
 * Uses gemini-2.5-flash-image model for AI-generated course covers
 */

const GOOGLE_AI_API_KEY = process.env.GOOGLE_AI_API_KEY

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
 * Generate a cover image for a course using Gemini Nano Banana
 */
export async function generateCourseImage(courseTitle: string): Promise<GenerateImageResult> {
  if (!GOOGLE_AI_API_KEY) {
    console.error('[ImageGen] GOOGLE_AI_API_KEY not configured')
    return { success: false, error: 'API key not configured' }
  }

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
    console.log('[ImageGen] Generating image with Gemini for:', courseTitle)

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${GOOGLE_AI_API_KEY}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      console.error('[ImageGen] Gemini API error:', response.status, errorData)

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
          console.log('[ImageGen] Image generated successfully with Gemini')
          return {
            success: true,
            imageBase64: part.inlineData.data,
            mimeType: part.inlineData.mimeType || 'image/png',
          }
        }
      }
    }

    console.error('[ImageGen] No image in response:', JSON.stringify(data).substring(0, 500))
    return { success: false, error: 'No image generated in response' }
  } catch (error) {
    console.error('[ImageGen] Failed to generate image:', error)
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
