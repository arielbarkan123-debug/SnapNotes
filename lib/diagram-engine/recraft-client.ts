// Recraft V3 API client
// Docs: https://www.recraft.ai/docs/api-reference/getting-started

import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:recraft-client')
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
  // NOTE: Recraft V4 does NOT support negative_prompt, style, or no_text controls.
  // Text suppression relies ENTIRELY on the prompt itself — the caller must ensure
  // the prompt ends with "No text or labels." and avoids enumerating component names.
  // Labels are added as a client-side SVG overlay after image generation.
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
  log.info(`API key present: ${!!apiKey}, length: ${apiKey?.length || 0}`)
  if (!apiKey) {
    throw new Error('RECRAFT_API_KEY is not configured. Add it to .env.local')
  }

  // Recraft V4 does NOT support styles, negative_prompt, or controls.
  // Text suppression is handled via the prompt itself (prompt rewriter adds "no text" instructions).
  // See: https://www.recraft.ai/docs/api-reference/styles
  const body: Record<string, unknown> = {
    prompt: params.prompt,
    model: 'recraftv4',
    response_format: 'url',
  }

  if (params.size) {
    body.size = params.size
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)

  log.info(`Calling API with prompt: "${params.prompt.slice(0, 100)}..."`)

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

    log.info(`API response status: ${response.status}`)

    if (!response.ok) {
      const errorText = await response.text()
      let message = `Recraft API error (${response.status})`
      try {
        const parsed: RecraftErrorResponse = JSON.parse(errorText)
        if (parsed.code === 'not_enough_credits') {
          message = '[RECRAFT] Out of credits. The Recraft image generation budget has run out. The app cannot generate diagrams until credits are added at recraft.ai.'
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
    log.info(`API response data count: ${result.data?.length || 0}`)

    if (!result.data || result.data.length === 0) {
      throw new Error('Recraft API returned no images')
    }

    log.info(`Success! Image URL: ${result.data[0].url.slice(0, 80)}...`)
    return result.data[0]
  } finally {
    clearTimeout(timeout)
  }
}
