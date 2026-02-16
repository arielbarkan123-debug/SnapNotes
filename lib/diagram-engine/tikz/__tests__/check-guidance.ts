/**
 * check-guidance.ts
 *
 * Validates that every category used by a TikZ template has a corresponding
 * entry in CATEGORY_GUIDANCE, and that there are no orphan guidance entries
 * (guidance for categories that no template references).
 *
 * Run with: npx tsx lib/tikz/__tests__/check-guidance.ts
 */

import { ALL_TEMPLATES } from '../templates'
import { CATEGORY_GUIDANCE } from '../category-guidance'

// ---------- 1. Collect unique categories from templates ----------

const templateCategories = new Set<string>()
for (const t of ALL_TEMPLATES) {
  templateCategories.add(t.category)
}

// ---------- 2. Collect keys from guidance ----------

const guidanceCategories = new Set<string>(Object.keys(CATEGORY_GUIDANCE))

// ---------- 3. Compare ----------

const missingFromGuidance: string[] = [] // used by templates but absent in guidance
const orphanInGuidance: string[] = []    // present in guidance but unused by any template

for (const cat of templateCategories) {
  if (!guidanceCategories.has(cat)) {
    missingFromGuidance.push(cat)
  }
}

for (const cat of guidanceCategories) {
  if (!templateCategories.has(cat)) {
    orphanInGuidance.push(cat)
  }
}

// ---------- 4. Check guidance entry quality (non-empty, >= 100 chars) ----------

interface QualityIssue {
  category: string
  length: number
  problem: string
}

const qualityIssues: QualityIssue[] = []

for (const [cat, text] of Object.entries(CATEGORY_GUIDANCE)) {
  const trimmed = text.trim()
  if (trimmed.length === 0) {
    qualityIssues.push({ category: cat, length: 0, problem: 'EMPTY — guidance text is blank' })
  } else if (trimmed.length < 100) {
    qualityIssues.push({
      category: cat,
      length: trimmed.length,
      problem: `TOO SHORT — only ${trimmed.length} chars (minimum 100)`,
    })
  }
}

// ---------- 5. Print summary ----------

let hasErrors = false

console.log('='.repeat(60))
console.log('  TikZ Category Guidance Audit')
console.log('='.repeat(60))
console.log()
console.log(`Templates loaded:           ${ALL_TEMPLATES.length}`)
console.log(`Unique template categories: ${templateCategories.size}`)
console.log(`Guidance entries:           ${guidanceCategories.size}`)
console.log()

// --- Errors: categories used by templates but missing guidance ---
if (missingFromGuidance.length > 0) {
  hasErrors = true
  console.log('ERROR: Categories used by templates but MISSING from guidance:')
  for (const cat of missingFromGuidance.sort()) {
    // Find which templates use this category
    const templates = ALL_TEMPLATES.filter((t) => t.category === cat).map((t) => t.id)
    console.log(`  - "${cat}"  (used by: ${templates.join(', ')})`)
  }
  console.log()
} else {
  console.log('OK: Every template category has a matching guidance entry.')
  console.log()
}

// --- Warnings: orphan guidance entries ---
if (orphanInGuidance.length > 0) {
  console.log('WARNING: Guidance entries with NO matching template (orphans):')
  for (const cat of orphanInGuidance.sort()) {
    console.log(`  - "${cat}"`)
  }
  console.log()
} else {
  console.log('OK: No orphan guidance entries.')
  console.log()
}

// --- Quality issues ---
if (qualityIssues.length > 0) {
  hasErrors = true
  console.log('ERROR: Guidance entries that are empty or under 100 characters:')
  for (const issue of qualityIssues.sort((a, b) => a.category.localeCompare(b.category))) {
    console.log(`  - "${issue.category}" (${issue.length} chars) — ${issue.problem}`)
  }
  console.log()
} else {
  console.log('OK: All guidance entries are non-empty and >= 100 characters.')
  console.log()
}

// --- Final verdict ---
console.log('='.repeat(60))
if (hasErrors) {
  console.log('  RESULT: FAIL — see errors above')
  console.log('='.repeat(60))
  process.exit(1)
} else if (orphanInGuidance.length > 0) {
  console.log('  RESULT: PASS with warnings')
  console.log('='.repeat(60))
  process.exit(0)
} else {
  console.log('  RESULT: PASS — all checks green')
  console.log('='.repeat(60))
  process.exit(0)
}
