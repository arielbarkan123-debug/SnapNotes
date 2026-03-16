/**
 * Centralized Content Language Resolution
 *
 * Single source of truth for determining what language AI-generated content
 * should be in. Used by ALL API routes that call Claude.
 *
 * Resolution order:
 * 1. NEXT_LOCALE cookie (set by Sidebar toggle — always most recent)
 * 2. user_learning_profile.language (persisted preference from Settings)
 * 3. 'en' (fallback)
 */

import { type SupabaseClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'
import { createLogger } from '@/lib/logger'

const log = createLogger('ai:language')

export type ContentLanguage = 'en' | 'he'

/**
 * Resolve the content language for a given user.
 *
 * This is the ONLY function that should determine content language.
 * Every API route that generates AI content must use this.
 *
 * Priority: cookie (most recent toggle) → DB profile → 'en'
 */
export async function getContentLanguage(
  supabase: SupabaseClient,
  userId: string
): Promise<ContentLanguage> {
  // 1. Try NEXT_LOCALE cookie (set by Sidebar toggle — most recent)
  try {
    const cookieStore = await cookies()
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value
    if (localeCookie === 'he') return 'he'
    if (localeCookie === 'en') return 'en'
  } catch {
    // cookies() may fail in some contexts — that's ok
  }

  // 2. Fall back to user_learning_profile.language
  try {
    const { data: profile } = await supabase
      .from('user_learning_profile')
      .select('language')
      .eq('user_id', userId)
      .maybeSingle()

    if (profile?.language === 'he' || profile?.language === 'en') {
      return profile.language
    }
  } catch (err) {
    log.warn({ err }, 'Failed to fetch user language preference')
  }

  // 3. Default to English
  return 'en'
}

/**
 * Resolve the output language considering user preference, source material,
 * and whether the user explicitly toggled their language.
 *
 * Priority:
 * - Explicit user toggle always wins (wasExplicitlySet = true)
 * - Source material language wins when no explicit toggle
 * - User preference is the fallback
 */
export function resolveOutputLanguage(
  userLanguage: ContentLanguage,
  sourceLanguage?: ContentLanguage,
  wasExplicitlySet?: boolean,
): ContentLanguage {
  // If user explicitly toggled → always wins (even over source material)
  if (wasExplicitlySet) return userLanguage
  // If source material detected and no explicit toggle → match source
  if (sourceLanguage) return sourceLanguage
  // Default to user preference
  return userLanguage
}

/**
 * Detect the primary language of a text based on character analysis.
 *
 * Returns 'he' if >20% of alphabetic characters are Hebrew,
 * 'en' if <5% are Hebrew, or undefined if ambiguous (5-20%)
 * or there are too few alphabetic characters to judge (<10).
 */
export function detectSourceLanguage(text: string): ContentLanguage | undefined {
  if (!text) return undefined

  let hebrewCount = 0
  let latinCount = 0

  for (const char of text) {
    const code = char.charCodeAt(0)
    // Hebrew: U+0590–U+05FF
    if (code >= 0x0590 && code <= 0x05FF) {
      hebrewCount++
    }
    // Latin: a-z, A-Z
    else if ((code >= 0x41 && code <= 0x5A) || (code >= 0x61 && code <= 0x7A)) {
      latinCount++
    }
  }

  const totalAlpha = hebrewCount + latinCount
  if (totalAlpha < 10) return undefined

  const hebrewRatio = hebrewCount / totalAlpha

  if (hebrewRatio > 0.20) return 'he'
  if (hebrewRatio < 0.05) return 'en'

  // Ambiguous range (5-20%)
  return undefined
}

/**
 * Build a language instruction block for any AI prompt.
 *
 * CRITICAL: This returns an instruction for BOTH Hebrew AND English.
 * The English instruction explicitly tells Claude to respond in English
 * even when the source material is in Hebrew. Without this, Claude
 * mirrors the input language, causing Hebrew source → Hebrew output
 * for English-preference users.
 */
export function buildLanguageInstruction(language: ContentLanguage): string {
  if (language === 'he') {
    return `
## Language Requirement - CRITICAL
Generate ALL content in Hebrew (עברית). This is mandatory.

### Hebrew Content Guidelines:
- ALL titles, explanations, key points, summaries, questions, answer options, and feedback in Hebrew
- Use proper Hebrew educational terminology
- Use right-to-left text flow naturally
- For mathematical formulas: keep standard notation (e.g., E=mc²) but explain in Hebrew
- For scientific terms: use Hebrew translations where commonly used, or transliterate technical terms
- For code or technical content: keep code in English, explain in Hebrew
- Maintain a natural, educational Hebrew writing style appropriate for the student's level

### Hebrew Writing Quality:
- Use formal but accessible Hebrew (לשון פורמלית אך נגישה)
- Avoid awkward translations - write naturally in Hebrew
- Use common Hebrew educational phrases
- Match the complexity of Hebrew to the student's education level
`
  }

  return `
## Language Requirement - CRITICAL
Generate ALL content in English. This is mandatory.
- Even if the source material, notes, or student content is in Hebrew or another language, YOU MUST respond in English.
- Translate any Hebrew or non-English concepts into English.
- Keep mathematical notation standard (numbers, symbols, formulas).
- Use clear, natural English appropriate for the student's level.
`
}
