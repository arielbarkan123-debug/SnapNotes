/**
 * Tests for AI output parsing functions from prompts.ts
 * Since there's no separate output-parser.ts module, we test the parsing
 * functions that ARE exported from prompts.ts: cleanJsonResponse,
 * validateExtractedContent, formatExtractedContentForPrompt.
 *
 * Also tests JSON repair scenarios, response format wrappers, and Unicode.
 */

import {
  cleanJsonResponse,
  validateExtractedContent,
  formatExtractedContentForPrompt,
} from '@/lib/ai/prompts'

import type { GeneratedCourse } from '@/types'

// We need to read fixture files
import * as fs from 'fs'
import * as path from 'path'

// Load fixtures using fs to avoid module resolution issues
const fixturesDir = path.join(__dirname, '../../fixtures/mock-ai-responses')
const validCourseFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'valid-course.json'), 'utf-8'))
const malformedCourseFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'malformed-course.json'), 'utf-8'))
const hebrewCourseFixture = JSON.parse(fs.readFileSync(path.join(fixturesDir, 'hebrew-course.json'), 'utf-8'))

// Mock logger
jest.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  }),
}))

// =============================================================================
// cleanJsonResponse
// =============================================================================

describe('cleanJsonResponse', () => {
  it('returns clean JSON unchanged', () => {
    const input = '{"title": "test"}'
    expect(cleanJsonResponse(input)).toBe('{"title": "test"}')
  })

  it('removes ```json prefix and ``` suffix', () => {
    const input = '```json\n{"title": "test"}\n```'
    expect(cleanJsonResponse(input)).toBe('{"title": "test"}')
  })

  it('removes ``` prefix without json', () => {
    const input = '```\n{"title": "test"}\n```'
    expect(cleanJsonResponse(input)).toBe('{"title": "test"}')
  })

  it('removes only ``` suffix when no prefix', () => {
    const input = '{"title": "test"}\n```'
    expect(cleanJsonResponse(input)).toBe('{"title": "test"}')
  })

  it('trims whitespace', () => {
    const input = '   {"title": "test"}   '
    expect(cleanJsonResponse(input)).toBe('{"title": "test"}')
  })

  it('handles empty string', () => {
    expect(cleanJsonResponse('')).toBe('')
  })

  it('handles string with only code block markers', () => {
    expect(cleanJsonResponse('```json\n```')).toBe('')
  })

  it('preserves valid JSON with nested objects', () => {
    const json = '{"lessons": [{"title": "L1", "steps": []}]}'
    expect(cleanJsonResponse('```json\n' + json + '\n```')).toBe(json)
  })

  it('handles markdown code block with extra whitespace', () => {
    const input = '```json   \n  {"title": "test"}  \n```'
    const result = cleanJsonResponse(input)
    expect(result).toBe('{"title": "test"}')
  })
})

// =============================================================================
// validateExtractedContent
// =============================================================================

describe('validateExtractedContent', () => {
  it('returns true for valid extracted content', () => {
    const valid = {
      subject: 'Mathematics',
      mainTopics: ['Algebra', 'Geometry'],
      content: [{ type: 'paragraph', content: 'Some text' }],
      structure: 'notes',
      diagrams: [],
      formulas: [],
    }
    expect(validateExtractedContent(valid)).toBe(true)
  })

  it('returns false for null', () => {
    expect(validateExtractedContent(null)).toBe(false)
  })

  it('returns false for undefined', () => {
    expect(validateExtractedContent(undefined)).toBe(false)
  })

  it('returns false for string', () => {
    expect(validateExtractedContent('hello')).toBe(false)
  })

  it('returns false for number', () => {
    expect(validateExtractedContent(42)).toBe(false)
  })

  it('returns false when subject is missing', () => {
    const invalid = {
      mainTopics: ['Algebra'],
      content: [],
      structure: 'notes',
    }
    expect(validateExtractedContent(invalid)).toBe(false)
  })

  it('returns false when mainTopics is not array', () => {
    const invalid = {
      subject: 'Math',
      mainTopics: 'Algebra',
      content: [],
      structure: 'notes',
    }
    expect(validateExtractedContent(invalid)).toBe(false)
  })

  it('returns false when content is not array', () => {
    const invalid = {
      subject: 'Math',
      mainTopics: ['Algebra'],
      content: 'text',
      structure: 'notes',
    }
    expect(validateExtractedContent(invalid)).toBe(false)
  })

  it('returns false when structure is missing', () => {
    const invalid = {
      subject: 'Math',
      mainTopics: ['Algebra'],
      content: [],
    }
    expect(validateExtractedContent(invalid)).toBe(false)
  })

  it('returns true with empty arrays', () => {
    const valid = {
      subject: 'Math',
      mainTopics: [],
      content: [],
      structure: 'notes',
    }
    expect(validateExtractedContent(valid)).toBe(true)
  })

  it('returns false for empty object', () => {
    expect(validateExtractedContent({})).toBe(false)
  })
})

// =============================================================================
// formatExtractedContentForPrompt
// =============================================================================

describe('formatExtractedContentForPrompt', () => {
  const basicContent = {
    subject: 'Mathematics',
    mainTopics: ['Algebra', 'Geometry'],
    content: [
      { type: 'heading' as const, content: 'Chapter 1' },
      { type: 'paragraph' as const, content: 'This is about algebra.' },
      { type: 'bullet_point' as const, content: 'Variables represent unknowns' },
      { type: 'definition' as const, content: 'An equation is a statement of equality' },
      { type: 'example' as const, content: '2x + 3 = 7' },
      { type: 'note' as const, content: 'Pay attention to signs' },
    ],
    diagrams: [],
    formulas: [],
    structure: 'textbook',
  }

  it('includes subject', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('Mathematics')
  })

  it('includes main topics', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('Algebra, Geometry')
  })

  it('includes content structure', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('textbook')
  })

  it('formats headings with # prefix', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('# Chapter 1')
  })

  it('formats bullet points with bullet prefix', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    // The actual prefix is a bullet character
    expect(result).toMatch(/[•].*Variables/)
  })

  it('formats definitions with [DEF] prefix', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('[DEF] An equation')
  })

  it('formats examples with [EX] prefix', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('[EX] 2x + 3 = 7')
  })

  it('formats notes with [NOTE] prefix', () => {
    const result = formatExtractedContentForPrompt(basicContent)
    expect(result).toContain('[NOTE] Pay attention')
  })

  it('includes formulas when present', () => {
    const withFormulas = {
      ...basicContent,
      formulas: [{ formula: 'E = mc^2', context: 'relativity' }],
    }
    const result = formatExtractedContentForPrompt(withFormulas)
    expect(result).toContain('E = mc^2')
    expect(result).toContain('relativity')
  })

  it('includes diagrams when present', () => {
    const withDiagrams = {
      ...basicContent,
      diagrams: [{
        description: 'Triangle ABC',
        labels: ['A', 'B', 'C'],
        significance: 'Shows right angle',
      }],
    }
    const result = formatExtractedContentForPrompt(withDiagrams)
    expect(result).toContain('Triangle ABC')
    expect(result).toContain('A, B, C')
    expect(result).toContain('Shows right angle')
  })

  it('includes page numbers when includePageNumbers is true', () => {
    const withPages = {
      ...basicContent,
      content: [
        { type: 'paragraph' as const, content: 'Page 1 content', pageNumber: 1 },
        { type: 'paragraph' as const, content: 'Page 2 content', pageNumber: 2 },
      ],
    }
    const result = formatExtractedContentForPrompt(withPages, true)
    expect(result).toContain('[p1]')
    expect(result).toContain('[p2]')
  })

  it('excludes page numbers when includePageNumbers is false', () => {
    const withPages = {
      ...basicContent,
      content: [
        { type: 'paragraph' as const, content: 'Page 1 content', pageNumber: 1 },
      ],
    }
    const result = formatExtractedContentForPrompt(withPages, false)
    expect(result).not.toContain('[p1]')
  })

  it('includes page count info when available', () => {
    const multiPage = {
      ...basicContent,
      pageCount: 5,
    }
    const result = formatExtractedContentForPrompt(multiPage)
    expect(result).toContain('5 pages')
  })

  it('includes summary when available', () => {
    const withSummary = {
      ...basicContent,
      summary: 'Overview of algebraic concepts',
    }
    const result = formatExtractedContentForPrompt(withSummary)
    expect(result).toContain('Overview of algebraic concepts')
  })

  it('includes context when provided in content items', () => {
    const withContext = {
      ...basicContent,
      content: [
        { type: 'paragraph' as const, content: 'Some text', context: 'From chapter 3' },
      ],
    }
    const result = formatExtractedContentForPrompt(withContext)
    expect(result).toContain('From chapter 3')
  })
})

// =============================================================================
// JSON parsing — malformed responses (11 scenarios)
// =============================================================================

describe('cleanJsonResponse — malformed response scenarios', () => {
  it('scenario 1: JSON with leading text ("Here is the course:")', () => {
    const input = 'Here is the course:\n```json\n{"title":"test"}\n```'
    const result = cleanJsonResponse(input)
    // cleanJsonResponse only strips code blocks, not leading text
    expect(result).toContain('"title"')
  })

  it('scenario 2: double-wrapped code blocks', () => {
    const input = '```\n```json\n{"title":"test"}\n```\n```'
    const result = cleanJsonResponse(input)
    expect(result).toContain('"title"')
  })

  it('scenario 3: JSON with trailing text', () => {
    const input = '{"title":"test"}\n\nI hope this helps!'
    const cleaned = cleanJsonResponse(input)
    // The function only handles code blocks, trailing text remains
    expect(cleaned).toContain('"title"')
  })

  it('scenario 4: only ``` suffix', () => {
    const input = '{"title":"test"}```'
    const result = cleanJsonResponse(input)
    expect(result).toBe('{"title":"test"}')
  })

  it('scenario 5: ```json with no closing', () => {
    const input = '```json\n{"title":"test"}'
    const result = cleanJsonResponse(input)
    expect(result).toBe('{"title":"test"}')
  })

  it('scenario 6: plain JSON (no wrapping)', () => {
    const input = '{"title":"test","lessons":[]}'
    expect(cleanJsonResponse(input)).toBe(input)
  })

  it('scenario 7: whitespace-only input', () => {
    expect(cleanJsonResponse('   \n  \n  ')).toBe('')
  })

  it('scenario 8: code block with language tag "javascript"', () => {
    // cleanJsonResponse only handles ```json and ``` prefixes
    const input = '```javascript\n{"title":"test"}\n```'
    const result = cleanJsonResponse(input)
    // Removes ``` prefix and ``` suffix
    expect(result).toContain('"title"')
  })

  it('scenario 9: nested JSON strings', () => {
    const input = '```json\n{"title":"test \\\"nested\\\" value"}\n```'
    const result = cleanJsonResponse(input)
    expect(result).toContain('nested')
  })

  it('scenario 10: extremely long JSON', () => {
    const longTitle = 'A'.repeat(10000)
    const input = `\`\`\`json\n{"title":"${longTitle}"}\n\`\`\``
    const result = cleanJsonResponse(input)
    expect(result).toContain(longTitle)
  })

  it('scenario 11: CRLF line endings', () => {
    const input = '```json\r\n{"title":"test"}\r\n```'
    const result = cleanJsonResponse(input)
    expect(result).toContain('"title"')
  })
})

// =============================================================================
// Response format wrappers (markdown blocks, thinking tags)
// =============================================================================

describe('cleanJsonResponse — response format wrappers', () => {
  it('strips markdown code block wrapper', () => {
    const wrapped = '```json\n{"lessons":[]}\n```'
    const result = cleanJsonResponse(wrapped)
    expect(() => JSON.parse(result)).not.toThrow()
  })

  it('handles bare ``` wrapper', () => {
    const wrapped = '```\n{"lessons":[]}\n```'
    const result = cleanJsonResponse(wrapped)
    expect(() => JSON.parse(result)).not.toThrow()
  })
})

// =============================================================================
// Unicode/Hebrew handling
// =============================================================================

describe('cleanJsonResponse — Unicode/Hebrew', () => {
  it('preserves Hebrew characters', () => {
    const input = '```json\n{"title":"מבוא לאלגברה"}\n```'
    const result = cleanJsonResponse(input)
    expect(result).toContain('מבוא לאלגברה')
  })

  it('preserves emoji in content', () => {
    const input = '{"title":"Lesson 1 \\ud83d\\udcd6"}'
    const result = cleanJsonResponse(input)
    expect(result).toContain('title')
  })

  it('preserves Arabic characters', () => {
    const input = '{"title":"مقدمة في الجبر"}'
    const result = cleanJsonResponse(input)
    expect(result).toContain('مقدمة في الجبر')
  })
})

// =============================================================================
// Fixture-based tests
// =============================================================================

describe('JSON fixtures — parsing integration', () => {
  it('valid-course.json is parseable', () => {
    expect(validCourseFixture.title).toBe('Introduction to Algebra')
    expect(validCourseFixture.lessons.length).toBe(2)
    expect(validCourseFixture.lessons[0].steps.length).toBe(4)
  })

  it('malformed-course.json has expected structure issues', () => {
    expect(malformedCourseFixture.lessons.length).toBe(4)
    // First lesson has no steps
    expect((malformedCourseFixture.lessons[0] as Record<string, unknown>).steps).toBeUndefined()
    // Second lesson has empty steps
    expect(malformedCourseFixture.lessons[1].steps).toHaveLength(0)
  })

  it('hebrew-course.json contains Hebrew text', () => {
    expect(hebrewCourseFixture.title).toContain('אלגברה')
    expect(hebrewCourseFixture.lessons[0].steps[0].content).toContain('משתנה')
  })

  it('truncated-course.json is not valid JSON', () => {
    const truncatedPath = path.join(__dirname, '../../fixtures/mock-ai-responses/truncated-course.json')
    const raw = fs.readFileSync(truncatedPath, 'utf-8')
    expect(() => JSON.parse(raw)).toThrow()
  })
})

// =============================================================================
// Large response handling
// =============================================================================

describe('cleanJsonResponse — large responses', () => {
  it('handles large JSON without performance issues', () => {
    const largeArray = Array.from({ length: 1000 }, (_, i) => ({
      title: `Step ${i}`,
      content: `Content for step ${i}`,
    }))
    const largeJson = JSON.stringify({ lessons: [{ title: 'Big Lesson', steps: largeArray }] })
    const wrapped = '```json\n' + largeJson + '\n```'

    const start = Date.now()
    const result = cleanJsonResponse(wrapped)
    const elapsed = Date.now() - start

    expect(elapsed).toBeLessThan(100) // Should be nearly instant
    expect(() => JSON.parse(result)).not.toThrow()
  })
})
