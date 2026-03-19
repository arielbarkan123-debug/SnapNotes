/**
 * Smart Label Pipeline — Phases 1-3 + upload
 *
 * Phase 1A: generateLabelContent — Claude text call to generate bilingual label list
 * Phase 1B2: uploadBaseImage — Download Recraft CDN image → Supabase storage
 * Phase 2: mapLabelsToImage — Claude Vision maps labels to image coordinates
 * Phase 3: verifyLabelPlacement — Second Vision pass to verify/correct positions
 * Pure: computeLabelPositions — Assign label text positions + collision avoidance
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'
import { createServiceClient } from '@/lib/supabase/server'
import { createLogger } from '@/lib/logger'
import type { OverlayLabel } from '@/types'

const log = createLogger('diagram:label-pipeline')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
})

const BUCKET = 'diagram-steps'

// ─── Types ──────────────────────────────────────────────────────────────────

export interface LabelContent {
  text: string
  textHe: string
  description: string
  descriptionHe: string
  stepGroup: number
}

export interface VisionPositionResult {
  text: string
  found: boolean
  targetX?: number
  targetY?: number
}

// ─── Phase 1A: Generate Label Content ───────────────────────────────────────

const LABEL_CONTENT_PROMPT = `You are a science/education expert. Given a student's question about a topic, list the 6-12 key structures, components, or parts that would appear in an educational diagram of this topic.

For each structure provide:
- "text": correct English scientific/educational name (1-3 words)
- "textHe": correct Hebrew translation
- "description": one-sentence English description of the structure's function/role
- "descriptionHe": same description in Hebrew
- "stepGroup": integer 1-6 indicating teaching order (1 = teach first, 6 = teach last). Group related structures into the same stepGroup.

Return ONLY a valid JSON array. No explanation, no markdown fences:
[{"text":"Nucleus","textHe":"גרעין","description":"Control center containing DNA","descriptionHe":"מרכז הבקרה המכיל DNA","stepGroup":1}]

Student question: "{QUESTION}"`

/**
 * Phase 1A — Generate bilingual label content from domain knowledge.
 * Claude text call (no image) to produce 6-12 label items.
 * Returns empty array on failure (graceful degradation).
 */
export async function generateLabelContent(
  question: string,
): Promise<LabelContent[]> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 1500,
      messages: [
        {
          role: 'user',
          content: LABEL_CONTENT_PROMPT.replace('{QUESTION}', question),
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return []

    let jsonStr = textBlock.text.trim()
    // Strip markdown fences if present
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    // Find the JSON array even if surrounded by text
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const parsed = JSON.parse(jsonStr) as LabelContent[]
    if (!Array.isArray(parsed) || parsed.length === 0 || !parsed[0].text) {
      log.warn('Label content parse returned empty or invalid array')
      return []
    }

    log.info(`Generated ${parsed.length} label content items`)
    return parsed
  } catch (err) {
    if (err instanceof SyntaxError) {
      log.warn({ detail: err }, 'generateLabelContent JSON parse failed')
    } else {
      log.error({ detail: err }, 'generateLabelContent failed')
    }
    return []
  }
}

// ─── Phase 1B2: Upload Base Image ──────────────────────────────────────────

/**
 * Download image from Recraft CDN and upload to Supabase storage.
 * Returns permanent Supabase public URL, or null on failure.
 */
export async function uploadBaseImage(
  imageUrl: string,
  userId: string,
  diagramHash: string,
): Promise<string | null> {
  if (!imageUrl || typeof imageUrl !== 'string') {
    log.error('uploadBaseImage called with invalid imageUrl')
    return null
  }
  try {
    const response = await fetch(imageUrl, { signal: AbortSignal.timeout(15000) })
    if (!response.ok) {
      log.warn(`Failed to download image: HTTP ${response.status}`)
      return null
    }

    const buffer = Buffer.from(await response.arrayBuffer())
    const supabase = createServiceClient()
    const storagePath = `${userId}/${diagramHash}/base.png`

    const { data, error } = await supabase.storage
      .from(BUCKET)
      .upload(storagePath, buffer, {
        contentType: 'image/png',
        cacheControl: '86400',
        upsert: true,
      })

    if (error || !data) {
      log.warn({ detail: error?.message }, 'Supabase upload failed')
      return null
    }

    const { data: urlData } = supabase.storage
      .from(BUCKET)
      .getPublicUrl(data.path)

    log.info(`Base image uploaded: ${storagePath}`)
    return urlData.publicUrl
  } catch (err) {
    log.error({ detail: err }, 'uploadBaseImage failed')
    return null
  }
}

// ─── Phase 2: Map Labels to Image ──────────────────────────────────────────

const VISION_MAP_PROMPT = `You are an expert at identifying structures in educational diagrams.

The student asked: "{QUESTION}"

Here is a list of structures to locate in this image:
{LABEL_LIST}

For EACH structure, determine if it is visible in the image. If visible, provide the CENTER coordinates of where that structure appears, as percentage from top-left (0,0) to bottom-right (100,100).

Return ONLY a valid JSON array. No explanation, no markdown fences:
[{"text":"Nucleus","found":true,"targetX":45,"targetY":52},{"text":"Ribosome","found":false}]

Rules:
- targetX and targetY are percentages (0-100) pointing to the CENTER of the structure
- Set found=false if the structure is not clearly visible
- Be precise — the coordinates will be used to draw leader lines to each structure`

/**
 * Phase 2 — Claude Vision maps label text to image coordinates.
 * Returns position results with found/not-found status.
 */
export async function mapLabelsToImage(
  imageUrl: string,
  labelContent: LabelContent[],
  question: string,
): Promise<VisionPositionResult[]> {
  try {
    const labelList = labelContent.map(l => `- ${l.text}`).join('\n')
    const prompt = VISION_MAP_PROMPT
      .replace('{QUESTION}', question)
      .replace('{LABEL_LIST}', labelList)

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return []

    let jsonStr = textBlock.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const parsed = JSON.parse(jsonStr) as VisionPositionResult[]
    if (!Array.isArray(parsed) || parsed.length === 0) return []

    log.info(`Vision mapped ${parsed.filter(p => p.found).length}/${parsed.length} labels`)
    return parsed
  } catch (err) {
    if (err instanceof SyntaxError) {
      log.warn({ detail: err }, 'mapLabelsToImage JSON parse failed')
    } else {
      log.error({ detail: err }, 'mapLabelsToImage failed')
    }
    return []
  }
}

// ─── Phase 3: Verify Label Placement ────────────────────────────────────────

const VISION_VERIFY_PROMPT = `You are verifying label placements on an educational diagram.

Each label has a leader line pointing to a specific location (targetX, targetY) on the image. Check if each leader line actually points to the correct structure.

Labels to verify:
{LABEL_JSON}

For each label, check if the targetX,targetY coordinates actually point to the named structure. If a label's target is wrong, provide corrected coordinates.

Return ONLY a valid JSON array. No explanation, no markdown fences:
[{"text":"Nucleus","correct":true},{"text":"Vacuole","correct":false,"targetX":62,"targetY":38}]

Only include corrections for labels where the target is incorrect. For correct labels, just set correct=true.`

interface VerifyResult {
  text: string
  correct: boolean
  targetX?: number
  targetY?: number
}

/**
 * Phase 3 — Second Vision pass to verify target coordinates.
 * Applies corrections if returned. On failure, returns original labels unchanged.
 */
export async function verifyLabelPlacement(
  imageUrl: string,
  labels: OverlayLabel[],
): Promise<OverlayLabel[]> {
  try {
    const labelJson = JSON.stringify(
      labels.map(l => ({ text: l.text, targetX: l.targetX, targetY: l.targetY })),
    )
    const prompt = VISION_VERIFY_PROMPT.replace('{LABEL_JSON}', labelJson)

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: { type: 'url', url: imageUrl },
            },
            {
              type: 'text',
              text: prompt,
            },
          ],
        },
      ],
    })

    const textBlock = response.content.find(b => b.type === 'text')
    if (!textBlock || textBlock.type !== 'text') return labels

    let jsonStr = textBlock.text.trim()
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/)
    if (fenceMatch) jsonStr = fenceMatch[1].trim()
    const arrayMatch = jsonStr.match(/\[[\s\S]*\]/)
    if (arrayMatch) jsonStr = arrayMatch[0]

    const verifyResults = JSON.parse(jsonStr) as VerifyResult[]
    if (!Array.isArray(verifyResults)) return labels

    // Build correction map: text → corrected coordinates
    const corrections = new Map<string, { targetX: number; targetY: number }>()
    for (const v of verifyResults) {
      if (!v.correct && v.targetX != null && v.targetY != null) {
        corrections.set(v.text, { targetX: v.targetX, targetY: v.targetY })
      }
    }

    if (corrections.size === 0) {
      log.info('Verification passed — all labels correct')
      return labels
    }

    log.info(`Verification corrected ${corrections.size} labels`)
    return labels.map(label => {
      const fix = corrections.get(label.text)
      if (fix) {
        return { ...label, targetX: fix.targetX, targetY: fix.targetY }
      }
      return label
    })
  } catch (err) {
    if (err instanceof SyntaxError) {
      log.warn({ detail: err }, 'verifyLabelPlacement JSON parse failed — returning originals')
    } else {
      log.error({ detail: err }, 'verifyLabelPlacement failed — returning originals')
    }
    return labels
  }
}

// ─── Pure Algorithm: Compute Label Positions ────────────────────────────────

/**
 * Compute label text positions from Vision results.
 *
 * Pure function — no API calls, easily testable.
 *
 * 1. Filters to found labels only
 * 2. Clamps target positions to 5-95 safe margins
 * 3. Assigns label text x position: targetX < 40 → left (5), > 60 → right (95),
 *    middle zone → whichever side is less crowded
 * 4. Sets label y position = clamped targetY (leader line stays horizontal-ish)
 * 5. Enforces 6-unit minimum gap per side (spread algorithm)
 * 6. Merges optional label content data (textHe, description, stepGroup)
 */
export function computeLabelPositions(
  visionResults: VisionPositionResult[],
  labelContent?: LabelContent[],
): OverlayLabel[] {
  // Filter to found labels with valid coordinates
  const found = visionResults.filter(
    (r): r is VisionPositionResult & { targetX: number; targetY: number } =>
      r.found === true && r.targetX != null && r.targetY != null,
  )

  if (found.length === 0) return []

  // Build content lookup by text
  const contentMap = new Map<string, LabelContent>()
  if (labelContent) {
    for (const lc of labelContent) {
      contentMap.set(lc.text, lc)
    }
  }

  // Clamp target positions to safe margins
  const clamped = found.map(r => ({
    text: r.text,
    targetX: Math.max(5, Math.min(95, r.targetX)),
    targetY: Math.max(5, Math.min(95, r.targetY)),
  }))

  // First pass: assign sides based on targetX zone
  // Count definite left/right labels to decide where middle goes
  let leftCount = 0
  let rightCount = 0
  for (const c of clamped) {
    if (c.targetX < 40) leftCount++
    else if (c.targetX > 60) rightCount++
  }

  // Assign side and label x position
  const assigned: Array<{
    text: string
    x: number
    y: number
    targetX: number
    targetY: number
    side: 'left' | 'right'
  }> = []

  for (const c of clamped) {
    let side: 'left' | 'right'
    if (c.targetX < 40) {
      side = 'left'
    } else if (c.targetX > 60) {
      side = 'right'
    } else {
      // Middle zone: assign to less crowded side
      side = leftCount <= rightCount ? 'left' : 'right'
      if (side === 'left') leftCount++
      else rightCount++
    }

    assigned.push({
      text: c.text,
      x: side === 'left' ? 5 : 95,
      y: c.targetY, // Start with y = targetY; collision fix will adjust
      targetX: c.targetX,
      targetY: c.targetY,
      side,
    })
  }

  // Separate by side and sort by y
  const leftLabels = assigned.filter(a => a.side === 'left').sort((a, b) => a.y - b.y)
  const rightLabels = assigned.filter(a => a.side === 'right').sort((a, b) => a.y - b.y)

  // Enforce 6-unit minimum gap (spread algorithm)
  spreadLabels(leftLabels, 6)
  spreadLabels(rightLabels, 6)

  // Build final OverlayLabel array with merged content
  const allLabels = [...leftLabels, ...rightLabels]

  return allLabels.map(a => {
    const content = contentMap.get(a.text)
    const label: OverlayLabel = {
      text: a.text,
      x: a.x,
      y: a.y,
      targetX: a.targetX,
      targetY: a.targetY,
      found: true,
    }
    if (content) {
      label.textHe = content.textHe
      label.description = content.description
      label.descriptionHe = content.descriptionHe
      label.stepGroup = content.stepGroup
    }
    return label
  })
}

/**
 * Spread labels on the same side to enforce minimum gap.
 * Pushes down, then pushes up if labels exceed the lower bound.
 */
function spreadLabels(
  group: Array<{ y: number }>,
  minGap: number,
): void {
  // Push down
  for (let i = 1; i < group.length; i++) {
    const gap = group[i].y - group[i - 1].y
    if (gap < minGap) {
      group[i].y = Math.min(95, group[i - 1].y + minGap)
    }
  }

  // Push up if we exceeded the lower safe margin
  for (let i = group.length - 2; i >= 0; i--) {
    if (group[i + 1].y - group[i].y < minGap) {
      group[i].y = Math.max(5, group[i + 1].y - minGap)
    } else {
      break
    }
  }
}
