import { TIKZ_CORE_PROMPT } from './core-prompt'
import { CATEGORY_GUIDANCE } from './category-guidance'
import { detectTopic } from './topic-detector'
import { isAdvancedTopic, getAdvancedGuidance } from './advanced-fallback'

export interface TikzTemplate {
  id: string
  name: string
  keywords: string[]
  gradeRange: [number, number]
  topics: number[]
  category: string
  referenceCode: string
}

export interface TopicMatch {
  template: TikzTemplate
  confidence: number
  secondaryTemplates: TikzTemplate[]
}

/**
 * Build a topic-aware TikZ system prompt.
 *
 * For elementary math topics (grades 1-6): injects a specific template with
 * proven TikZ reference code and category-specific guidance.
 *
 * For advanced topics (physics, high school math, biology, chemistry): injects
 * the relevant physics/math/science guidance sections preserved from the
 * original monolithic prompt.
 *
 * For ambiguous prompts: includes both an elementary template (if matched)
 * and the relevant advanced guidance.
 *
 * @param userPrompt - The user's diagram request
 * @returns The assembled system prompt string
 */
export function buildTikzPrompt(userPrompt: string): string {
  const match = detectTopic(userPrompt)
  const { template, secondaryTemplates } = match
  const advanced = isAdvancedTopic(userPrompt)

  // Build the assembled prompt
  const parts: string[] = [TIKZ_CORE_PROMPT]

  // Elementary template priority: when we have a confident elementary template match
  // (confidence >= 0.6), use it even if advanced keywords also match. This prevents
  // elementary science topics (water cycle, simple circuits, magnets) from getting
  // the complex advanced physics/biology guidance meant for high school.
  const useElementaryPath = match.confidence >= 0.6

  if (advanced && !useElementaryPath) {
    // Advanced topic with no strong elementary match: use physics/math/science guidance
    const advancedGuidance = getAdvancedGuidance(userPrompt)
    parts.push(`\n\n${advancedGuidance}`)

    // If we also have a weak elementary match, include it as supplementary
    if (match.confidence >= 0.3) {
      const guidance = CATEGORY_GUIDANCE[template.category] || ''
      if (guidance) {
        parts.push(`\n\nADDITIONAL GUIDANCE:\n${guidance}`)
      }
      parts.push(
        `\n\nREFERENCE TEMPLATE — ${template.name.toUpperCase()}:\n${template.referenceCode}`
      )
    }
  } else if (match.confidence >= 0.3) {
    // Elementary match: include category guidance + reference template
    const guidance = CATEGORY_GUIDANCE[template.category] || ''
    if (guidance) {
      parts.push(`\n\nTOPIC-SPECIFIC GUIDANCE:\n${guidance}`)
    }

    parts.push(
      `\n\nREFERENCE TEMPLATE — ${template.name.toUpperCase()}:\nThe following is a proven, compilable TikZ template for this topic. Use it as a structural reference. Adapt values, labels, and counts to match the user's specific request, but keep the same TikZ patterns and structure.\n\n${template.referenceCode}`
    )

    // If there's a secondary match with low primary confidence, include it
    if (secondaryTemplates.length > 0 && match.confidence < 0.9) {
      const secondary = secondaryTemplates[0]
      const secondaryGuidance = CATEGORY_GUIDANCE[secondary.category] || ''
      if (secondaryGuidance) {
        parts.push(
          `\n\nALTERNATIVE TEMPLATE — ${secondary.name.toUpperCase()} (if more relevant):\n${secondaryGuidance}\n\n${secondary.referenceCode}`
        )
      }
    }
  } else {
    // No confident match at all — include the fallback advanced guidance
    // so the model still has useful instructions
    const advancedGuidance = getAdvancedGuidance(userPrompt)
    parts.push(`\n\n${advancedGuidance}`)
  }

  return parts.join('')
}

export { detectTopic } from './topic-detector'
export { ALL_TEMPLATES } from './templates'
