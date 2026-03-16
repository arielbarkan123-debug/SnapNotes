import {
  getContentLanguage,
  getExplicitToggleFlag,
  clearExplicitToggleFlag,
  resolveOutputLanguage,
  detectSourceLanguage,
  buildLanguageInstruction,
  type ContentLanguage,
} from '@/lib/ai/language'

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

jest.mock('next/headers', () => ({
  cookies: jest.fn(),
}))

jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}))

import { cookies } from 'next/headers'

const mockCookies = cookies as jest.MockedFunction<typeof cookies>

function makeMockSupabase(profileLanguage: string | null | undefined, shouldThrow = false) {
  const maybeSingle = jest.fn()
  if (shouldThrow) {
    maybeSingle.mockRejectedValue(new Error('DB error'))
  } else {
    maybeSingle.mockResolvedValue({
      data: profileLanguage != null ? { language: profileLanguage } : null,
      error: null,
    })
  }

  return {
    from: jest.fn().mockReturnValue({
      select: jest.fn().mockReturnValue({
        eq: jest.fn().mockReturnValue({
          maybeSingle,
        }),
      }),
    }),
    maybeSingle,
  }
}

const mockSet = jest.fn()

function setupCookie(value: string | undefined, extras?: Record<string, string>) {
  const cookieMap: Record<string, string> = { ...extras }
  if (value !== undefined) {
    cookieMap['NEXT_LOCALE'] = value
  }

  mockCookies.mockResolvedValue({
    get: jest.fn((name: string) =>
      name in cookieMap ? { name, value: cookieMap[name] } : undefined
    ),
    set: mockSet,
  } as never)
}

function setupCookieThrows() {
  ;(mockCookies as jest.Mock).mockRejectedValue(new Error('cookies() failed'))
}

// ---------------------------------------------------------------------------
// getContentLanguage
// ---------------------------------------------------------------------------

describe('getContentLanguage', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns cookie value when NEXT_LOCALE is "he"', async () => {
    setupCookie('he')
    const { from } = makeMockSupabase('en')
    const supabase = { from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('he')
    // Cookie wins — DB should NOT be queried
    expect(from).not.toHaveBeenCalled()
  })

  it('returns cookie value when NEXT_LOCALE is "en"', async () => {
    setupCookie('en')
    const { from } = makeMockSupabase('he')
    const supabase = { from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('en')
    expect(from).not.toHaveBeenCalled()
  })

  it('falls back to DB profile when cookie is absent', async () => {
    setupCookie(undefined)
    const mock = makeMockSupabase('he')
    const supabase = { from: mock.from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('he')
    expect(mock.from).toHaveBeenCalledWith('user_learning_profile')
  })

  it('falls back to DB profile when cookie has invalid value', async () => {
    setupCookie('fr')
    const mock = makeMockSupabase('he')
    const supabase = { from: mock.from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('he')
  })

  it('falls back to DB profile when cookies() throws', async () => {
    setupCookieThrows()
    const mock = makeMockSupabase('he')
    const supabase = { from: mock.from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('he')
  })

  it('returns "en" when no cookie and no DB profile', async () => {
    setupCookie(undefined)
    const mock = makeMockSupabase(null)
    const supabase = { from: mock.from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('en')
  })

  it('returns "en" when cookie throws and DB throws', async () => {
    setupCookieThrows()
    const mock = makeMockSupabase(null, true)
    const supabase = { from: mock.from } as never

    const result = await getContentLanguage(supabase, 'user-1')

    expect(result).toBe('en')
  })
})

// ---------------------------------------------------------------------------
// getExplicitToggleFlag
// ---------------------------------------------------------------------------

describe('getExplicitToggleFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('returns true when LANG_EXPLICIT cookie is "1"', async () => {
    setupCookie(undefined, { LANG_EXPLICIT: '1' })
    expect(await getExplicitToggleFlag()).toBe(true)
  })

  it('returns false when LANG_EXPLICIT cookie is absent', async () => {
    setupCookie(undefined)
    expect(await getExplicitToggleFlag()).toBe(false)
  })

  it('returns false when LANG_EXPLICIT cookie has unexpected value', async () => {
    setupCookie(undefined, { LANG_EXPLICIT: 'yes' })
    expect(await getExplicitToggleFlag()).toBe(false)
  })

  it('returns false when cookies() throws', async () => {
    setupCookieThrows()
    expect(await getExplicitToggleFlag()).toBe(false)
  })
})

// ---------------------------------------------------------------------------
// clearExplicitToggleFlag
// ---------------------------------------------------------------------------

describe('clearExplicitToggleFlag', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('sets LANG_EXPLICIT cookie with maxAge 0', async () => {
    setupCookie(undefined, { LANG_EXPLICIT: '1' })
    await clearExplicitToggleFlag()
    expect(mockSet).toHaveBeenCalledWith('LANG_EXPLICIT', '', { maxAge: 0, path: '/' })
  })

  it('does not throw when cookies() throws', async () => {
    setupCookieThrows()
    await expect(clearExplicitToggleFlag()).resolves.toBeUndefined()
  })
})

// ---------------------------------------------------------------------------
// resolveOutputLanguage
// ---------------------------------------------------------------------------

describe('resolveOutputLanguage', () => {
  it('returns user language when no source language', () => {
    expect(resolveOutputLanguage('en')).toBe('en')
    expect(resolveOutputLanguage('he')).toBe('he')
  })

  it('returns user language when source matches user', () => {
    expect(resolveOutputLanguage('en', 'en')).toBe('en')
    expect(resolveOutputLanguage('he', 'he')).toBe('he')
  })

  it('returns user language when explicitly set, even if source differs', () => {
    expect(resolveOutputLanguage('en', 'he', true)).toBe('en')
    expect(resolveOutputLanguage('he', 'en', true)).toBe('he')
  })

  it('returns source language when not explicitly set and source differs', () => {
    expect(resolveOutputLanguage('en', 'he', false)).toBe('he')
    expect(resolveOutputLanguage('he', 'en', false)).toBe('en')
  })

  it('returns source language when wasExplicitlySet is undefined and source differs', () => {
    expect(resolveOutputLanguage('en', 'he')).toBe('he')
    expect(resolveOutputLanguage('he', 'en')).toBe('en')
  })

  it('returns user language when source is undefined and explicit is true', () => {
    expect(resolveOutputLanguage('he', undefined, true)).toBe('he')
  })
})

// ---------------------------------------------------------------------------
// detectSourceLanguage
// ---------------------------------------------------------------------------

describe('detectSourceLanguage', () => {
  it('returns "he" for Hebrew-only text', () => {
    const hebrew = 'שלום עולם זה טקסט בעברית ארוך מספיק'
    expect(detectSourceLanguage(hebrew)).toBe('he')
  })

  it('returns "en" for English-only text', () => {
    const english = 'Hello world this is a sufficiently long English text sample'
    expect(detectSourceLanguage(english)).toBe('en')
  })

  it('returns "he" when Hebrew characters are >20% of alphabetic', () => {
    // ~25% Hebrew: 5 Hebrew chars among ~15 Latin chars = 25%
    const mixed = 'Hello worldשלום' // 10 latin + 4 hebrew = ~28% hebrew
    expect(detectSourceLanguage(mixed)).toBe('he')
  })

  it('returns "en" when Hebrew characters are <5% of alphabetic', () => {
    // Lots of English with a tiny bit of Hebrew
    const mostlyEnglish = 'This is a very long English text with many words and sentencesא'
    expect(detectSourceLanguage(mostlyEnglish)).toBe('en')
  })

  it('returns undefined for ambiguous mix (5-20% Hebrew)', () => {
    // Need ~10-15% Hebrew. 2 Hebrew out of ~18 total = ~11%
    const ambiguous = 'Hello world testingאב extra text here'
    const result = detectSourceLanguage(ambiguous)
    // Verify it is in the ambiguous range
    expect(result).toBeUndefined()
  })

  it('returns undefined for pure math / no alphabetic chars', () => {
    const math = '123 + 456 = 579 * 2 / 3'
    expect(detectSourceLanguage(math)).toBeUndefined()
  })

  it('returns undefined for empty string', () => {
    expect(detectSourceLanguage('')).toBeUndefined()
  })

  it('returns undefined for text with fewer than 10 alphabetic characters', () => {
    const short = 'Hi שלום'  // 2 latin + 4 hebrew = 6 total (< 10)
    expect(detectSourceLanguage(short)).toBeUndefined()
  })

  it('handles mixed content with numbers and symbols', () => {
    const withNumbers = 'The equation E=mc² explains mass-energy equivalence in physics clearly'
    expect(detectSourceLanguage(withNumbers)).toBe('en')
  })
})

// ---------------------------------------------------------------------------
// buildLanguageInstruction (unchanged — smoke test)
// ---------------------------------------------------------------------------

describe('buildLanguageInstruction', () => {
  it('returns Hebrew instruction for "he"', () => {
    const result = buildLanguageInstruction('he')
    expect(result).toContain('Hebrew')
    expect(result).toContain('עברית')
    expect(result).toContain('CRITICAL')
  })

  it('returns English instruction for "en"', () => {
    const result = buildLanguageInstruction('en')
    expect(result).toContain('English')
    expect(result).toContain('CRITICAL')
    expect(result).not.toContain('עברית')
  })
})
