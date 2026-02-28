import { ALL_TEMPLATES } from './templates'
import type { TikzTemplate, TopicMatch } from './index'

/**
 * Check if a keyword matches in the prompt, using word-boundary matching
 * for short keywords (≤5 chars) to prevent substring false positives
 * (e.g., "ray" matching inside "array").
 */
function keywordMatches(lower: string, kw: string): boolean {
  if (kw.length <= 5) {
    // Use word-boundary regex for short keywords
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`\\b${escaped}\\b`).test(lower)
  }
  return lower.includes(kw)
}

/**
 * Detect which TikZ template best matches the user's prompt.
 * Uses keyword scoring with multi-word bonus and grade-level heuristics.
 */
export function detectTopic(prompt: string): TopicMatch {
  const lower = prompt.toLowerCase()

  let bestMatch: TikzTemplate | null = null
  let bestScore = 0
  const scores: Array<{ template: TikzTemplate; score: number }> = []

  for (const template of ALL_TEMPLATES) {
    let score = 0
    for (const kw of template.keywords) {
      if (keywordMatches(lower, kw)) {
        // Multi-word keywords get higher weight
        score += kw.split(' ').length
      }
    }

    // Grade-level bonus
    if (/grade\s*[12]|first\s*grade|second\s*grade|kindergarten/i.test(lower)) {
      if (template.gradeRange[0] <= 2) score += 2
    }
    if (/grade\s*[34]|third\s*grade|fourth\s*grade/i.test(lower)) {
      if (template.gradeRange[0] <= 4 && template.gradeRange[1] >= 3) score += 2
    }
    if (/grade\s*[56]|fifth\s*grade|sixth\s*grade/i.test(lower)) {
      if (template.gradeRange[1] >= 5) score += 2
    }

    if (score > 0) {
      scores.push({ template, score })
    }

    if (score > bestScore) {
      bestScore = score
      bestMatch = template
    }
  }

  // Find secondary matches (different from best, score > 0)
  const secondaryTemplates = scores
    .filter((s) => s.template.id !== bestMatch?.id && s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((s) => s.template)

  // If no template matched at all, return confidence 0 with no template.
  // This lets buildTikzPrompt() use the advanced fallback path instead of
  // forcing the "number-lines" template for unrelated topics (e.g., biology).
  if (!bestMatch) {
    const genericFallback = ALL_TEMPLATES.find((t) => t.id === 'number-lines')!
    return {
      template: genericFallback,
      confidence: 0,
      secondaryTemplates: [],
    }
  }

  return {
    template: bestMatch,
    confidence: Math.min(bestScore / 3, 1),
    secondaryTemplates,
  }
}
