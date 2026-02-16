// Recraft V3 API client
// Docs: https://www.recraft.ai/docs/api-reference/getting-started

export type RecraftStyle =
  | 'digital_illustration'
  | 'realistic_image'
  | 'vector_illustration'

export type RecraftSize =
  | '1024x1024'
  | '1365x1024'
  | '1024x1365'
  | '1536x1024'
  | '1024x1536'
  | '1820x1024'
  | '1024x1820'

export type RecraftFormat = 'png' | 'svg'

export interface RecraftGenerateParams {
  prompt: string
  style: RecraftStyle
  size?: RecraftSize
  format?: RecraftFormat
  negative_prompt?: string
  no_text?: boolean
}

export interface RecraftImage {
  url: string
}

interface RecraftResponse {
  data: RecraftImage[]
}

interface RecraftErrorResponse {
  error?: { message?: string }
  message?: string
  code?: string
}

const RECRAFT_API_URL = 'https://external.api.recraft.ai/v1/images/generations'
const REQUEST_TIMEOUT_MS = 90_000

export async function generateRecraftImage(
  params: RecraftGenerateParams
): Promise<RecraftImage> {
  const apiKey = process.env.RECRAFT_API_KEY
  console.log(`[RecraftClient] API key present: ${!!apiKey}, length: ${apiKey?.length || 0}`)
  if (!apiKey) {
    throw new Error('RECRAFT_API_KEY is not configured. Add it to .env.local')
  }

  // SVG format requires vector_illustration style
  const effectiveStyle =
    params.format === 'svg' ? 'vector_illustration' : params.style

  const body: Record<string, unknown> = {
    prompt: params.prompt,
    model: 'recraftv3',
    style: effectiveStyle,
    response_format: 'url',
  }

  if (params.size) {
    body.size = params.size
  }

  if (params.negative_prompt) {
    body.negative_prompt = params.negative_prompt
  }

  if (params.no_text) {
    body.controls = { no_text: true }
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  console.log(`[RecraftClient] Calling API with prompt: "${params.prompt.slice(0, 100)}..."`)

  try {
    const response = await fetch(RECRAFT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    })

    console.log(`[RecraftClient] API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      let message = `Recraft API error (${response.status})`
      try {
        const parsed: RecraftErrorResponse = JSON.parse(errorText)
        if (parsed.code === 'not_enough_credits') {
          message = 'Recraft API credits exhausted. Add credits at recraft.ai'
        } else {
          message =
            parsed.error?.message || parsed.message || parsed.code || message
        }
      } catch {
        if (errorText.length < 200) message += `: ${errorText}`
      }
      if (response.status === 429) {
        message = 'Recraft rate limit exceeded. Wait a moment and try again.'
      }
      throw new Error(message)
    }

    const result: RecraftResponse = await response.json()
    console.log(`[RecraftClient] API response data count: ${result.data?.length || 0}`)

    if (!result.data || result.data.length === 0) {
      throw new Error('Recraft API returned no images')
    }

    console.log(`[RecraftClient] Success! Image URL: ${result.data[0].url.slice(0, 80)}...`)
    return result.data[0]
  } finally {
    clearTimeout(timeout)
  }
}
