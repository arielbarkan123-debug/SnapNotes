/**
 * AI Cheatsheet Generator
 *
 * Generates condensed study cheatsheets from course content.
 * Supports multiple block types: formulas, definitions, key facts, examples, warnings.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheatsheetBlockType =
  | 'section_header'
  | 'formula'
  | 'definition'
  | 'key_fact'
  | 'example'
  | 'warning'

export interface CheatsheetBlock {
  type: CheatsheetBlockType
  title: string
  titleHe: string
  content: string
  contentHe: string
  latex?: string // For formula blocks
  severity?: 'low' | 'medium' | 'high' // For key_fact blocks
  collapsible?: boolean // For example blocks
}

export interface Cheatsheet {
  title: string
  titleHe: string
  subject: string
  blocks: CheatsheetBlock[]
}

// ─── Generation ──────────────────────────────────────────────────────────────

const CHEATSHEET_PROMPT = `You are an expert study guide creator. Given course content, create a condensed cheatsheet with structured blocks.

Block types:
1. section_header: Section divider with title
2. formula: Mathematical formula with LaTeX notation + explanation
3. definition: Term definition with clear explanation
4. key_fact: Important fact with severity level (low=good to know, medium=important, high=must know)
5. example: Worked example with solution (mark as collapsible)
6. warning: Common mistake or gotcha to watch out for

Return JSON (no markdown):
{
  "title": "Cheatsheet title",
  "titleHe": "Hebrew title",
  "subject": "Subject area",
  "blocks": [
    {
      "type": "section_header",
      "title": "Section Name",
      "titleHe": "Hebrew",
      "content": "",
      "contentHe": ""
    },
    {
      "type": "formula",
      "title": "Formula Name",
      "titleHe": "Hebrew name",
      "content": "What this formula does and when to use it",
      "contentHe": "Hebrew explanation",
      "latex": "E = mc^2"
    },
    {
      "type": "definition",
      "title": "Term",
      "titleHe": "Hebrew term",
      "content": "Clear definition",
      "contentHe": "Hebrew definition"
    },
    {
      "type": "key_fact",
      "title": "Fact name",
      "titleHe": "Hebrew",
      "content": "The important fact",
      "contentHe": "Hebrew",
      "severity": "high"
    },
    {
      "type": "example",
      "title": "Example: Solving X",
      "titleHe": "Hebrew",
      "content": "Step by step solution...",
      "contentHe": "Hebrew solution",
      "collapsible": true
    },
    {
      "type": "warning",
      "title": "Common Mistake",
      "titleHe": "Hebrew",
      "content": "What students often get wrong",
      "contentHe": "Hebrew"
    }
  ]
}

Rules:
- Maximum 25 blocks
- Be concise — this is a cheatsheet, not a textbook
- Formulas must use valid LaTeX
- Group related content under section headers
- Most important facts should be severity "high"
- Examples should be marked collapsible
- Hebrew should be natural, not literal translation`

/**
 * Generate a cheatsheet from course content.
 */
export async function generateCheatsheet(
  courseTitle: string,
  lessonContents: Array<{ title: string; content: string }>,
): Promise<Cheatsheet> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
  const client = new Anthropic({ apiKey })

  const contentText = lessonContents.map((l, i) =>
    `Lesson ${i + 1}: "${l.title}"\n${l.content}`
  ).join('\n\n---\n\n')

  // Truncate if too long
  const truncated = contentText.length > 10000
    ? contentText.slice(0, 10000) + '\n\n[Content truncated...]'
    : contentText

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 5000,
    system: CHEATSHEET_PROMPT,
    messages: [{
      role: 'user',
      content: `Create a study cheatsheet for the course: "${courseTitle}"\n\nCourse content:\n${truncated}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse cheatsheet generation')
  }

  const result = JSON.parse(jsonMatch[0])

  return {
    title: result.title || `${courseTitle} Cheatsheet`,
    titleHe: result.titleHe || result.title || courseTitle,
    subject: result.subject || 'General',
    blocks: (result.blocks || []).slice(0, 25),
  }
}
