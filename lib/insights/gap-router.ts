/**
 * Gap Auto-Router
 *
 * Detects prerequisite gaps when a student struggles with a topic.
 * Uses a hardcoded prerequisite map with Claude fallback for unknown topics.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { createClient } from '@/lib/supabase/server'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GapRoute {
  currentTopic: string
  prerequisiteTopic: string
  prerequisiteMastery: number
  miniLessonTitle: string
  miniLessonTitleHe: string
  reason: string
  reasonHe: string
}

// ─── Prerequisite Map ────────────────────────────────────────────────────────

const PREREQUISITE_MAP: Record<string, string[]> = {
  // Math
  'algebra': ['arithmetic', 'order of operations'],
  'linear equations': ['algebra', 'arithmetic'],
  'quadratic equations': ['linear equations', 'algebra', 'factoring'],
  'factoring': ['multiplication', 'algebra'],
  'fractions': ['division', 'multiplication'],
  'decimals': ['fractions', 'place value'],
  'percentages': ['fractions', 'decimals'],
  'ratios': ['fractions', 'division'],
  'proportions': ['ratios', 'fractions'],
  'geometry': ['measurement', 'arithmetic'],
  'area': ['multiplication', 'geometry'],
  'volume': ['area', 'multiplication'],
  'trigonometry': ['geometry', 'algebra', 'ratios'],
  'calculus': ['algebra', 'trigonometry', 'functions'],
  'functions': ['algebra', 'coordinate plane'],
  'coordinate plane': ['number line', 'algebra'],
  'statistics': ['arithmetic', 'fractions', 'percentages'],
  'probability': ['fractions', 'statistics'],
  'exponents': ['multiplication', 'arithmetic'],
  'logarithms': ['exponents', 'algebra'],
  'polynomials': ['algebra', 'exponents'],
  'inequalities': ['linear equations', 'number line'],

  // Science
  'forces': ['vectors', 'arithmetic'],
  'energy': ['forces', 'work'],
  'electricity': ['arithmetic', 'algebra'],
  'waves': ['trigonometry', 'energy'],
  'optics': ['waves', 'geometry'],
  'thermodynamics': ['energy', 'algebra'],
  'chemical equations': ['arithmetic', 'algebra'],
  'stoichiometry': ['chemical equations', 'ratios'],
  'organic chemistry': ['chemical equations', 'molecular structure'],
}

// ─── Main Function ───────────────────────────────────────────────────────────

/**
 * Detect if a student's poor performance on a topic is due to a prerequisite gap.
 * Called when student gets 3+ wrong answers on the same topic.
 *
 * @param userId - The user's ID
 * @param currentTopic - The topic they're struggling with
 * @param performance - Recent performance ratio (0-1) on this topic
 * @returns GapRoute if a gap is detected, null otherwise
 */
export async function detectPrerequisiteGap(
  userId: string,
  currentTopic: string,
  performance: number,
): Promise<GapRoute | null> {
  // Only trigger for poor performance
  if (performance > 0.4) return null

  const normalizedTopic = currentTopic.toLowerCase().trim()

  // Find prerequisites from map
  let prerequisites = PREREQUISITE_MAP[normalizedTopic]

  // If not in map, use Claude to identify prerequisites
  if (!prerequisites) {
    prerequisites = await identifyPrerequisitesWithClaude(currentTopic)
    if (!prerequisites || prerequisites.length === 0) return null
  }

  // Check mastery of each prerequisite, collect all gaps, return the worst
  const supabase = await createClient()
  let worstGap: GapRoute | null = null
  let lowestMastery = 1

  for (const prereq of prerequisites) {
    try {
      const { data: mastery } = await supabase
        .from('user_concept_mastery')
        .select('mastery_score')
        .eq('user_id', userId)
        .ilike('topic', `%${prereq}%`)
        .order('updated_at', { ascending: false })
        .limit(1)
        .single()

      const masteryScore = mastery?.mastery_score ?? 0

      // If prerequisite mastery is below threshold and worse than current worst, record it
      if (masteryScore < 0.5 && masteryScore < lowestMastery) {
        lowestMastery = masteryScore
        worstGap = {
          currentTopic,
          prerequisiteTopic: prereq,
          prerequisiteMastery: Math.round(masteryScore * 100),
          miniLessonTitle: `Review: ${capitalize(prereq)}`,
          miniLessonTitleHe: `חזרה: ${prereq}`,
          reason: `Your mastery of "${prereq}" is ${Math.round(masteryScore * 100)}%, which may be causing difficulty with "${currentTopic}".`,
          reasonHe: `השליטה שלך ב"${prereq}" היא ${Math.round(masteryScore * 100)}%, מה שעלול לגרום לקשיים עם "${currentTopic}".`,
        }
      }
    } catch {
      // user_concept_mastery table might not exist or no data
      continue
    }
  }

  return worstGap
}

// ─── Claude Fallback ─────────────────────────────────────────────────────────

async function identifyPrerequisitesWithClaude(topic: string): Promise<string[]> {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not set')
    const client = new Anthropic({ apiKey })

    const response = await client.messages.create({
      model: AI_MODEL,
      max_tokens: 200,
      system: 'You are a curriculum expert. Given a topic, return 2-3 prerequisite topics that a student must master before learning this topic. Return ONLY a JSON array of strings, no markdown.',
      messages: [{
        role: 'user',
        content: `What are the prerequisite topics for "${topic}"? Return as JSON array.`,
      }],
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    const match = text.match(/\[[\s\S]*?\]/)
    if (!match) return []

    const parsed = JSON.parse(match[0])
    return Array.isArray(parsed) ? parsed.map((s: unknown) => String(s).toLowerCase()) : []
  } catch {
    return []
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
