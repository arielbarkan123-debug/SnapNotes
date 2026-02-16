/**
 * Structural integrity check for the TikZ template system.
 * Run with: npx tsx lib/tikz/__tests__/check-structure.ts
 *
 * Checks:
 * 1. Grade range validity
 * 2. Grade coverage by subject
 * 3. referenceCode quality
 * 4. Template name quality
 * 5. Keywords minimum
 * 6. Topics minimum
 * 7. Export consistency
 */

import { ALL_TEMPLATES } from '../templates'
import * as fs from 'fs'
import * as path from 'path'

// ─── Types ───────────────────────────────────────────────────────────────────

interface Issue {
  templateId: string
  check: string
  message: string
  severity: 'ERROR' | 'WARNING'
}

// ─── Subject mapping ─────────────────────────────────────────────────────────
// Maps the section comments from templates/index.ts to subject areas.
// We use the template index position in ALL_TEMPLATES to figure out subject,
// but a more robust approach is to read templates/index.ts and parse the
// comment sections. Instead we'll map template IDs to subjects using a
// rule-based approach from the templates/index.ts section structure.

const SUBJECT_AREAS = [
  'math',
  'science',
  'social_studies',
  'language_arts',
  'health',
  'art_music',
  'stem',
] as const

type SubjectArea = (typeof SUBJECT_AREAS)[number]

/**
 * Classify a template into a subject area based on the section groupings
 * in templates/index.ts. We parse the index file to determine which
 * import belongs to which section.
 */
function buildSubjectMap(): Map<string, SubjectArea> {
  const indexPath = path.resolve(__dirname, '../templates/index.ts')
  const indexSource = fs.readFileSync(indexPath, 'utf-8')
  const lines = indexSource.split('\n')

  // Map: import variable name -> subject area
  const importToSubject = new Map<string, SubjectArea>()

  let currentSubject: SubjectArea = 'math'

  for (const line of lines) {
    // Detect section comments
    if (line.includes('// === Math') || line.includes('// Math')) {
      currentSubject = 'math'
    } else if (
      line.includes('// === Life Science') ||
      line.includes('// Life Science') ||
      line.includes('// === Earth & Space Science') ||
      line.includes('// Earth & Space') ||
      line.includes('// === Physical Science') ||
      line.includes('// Physical Science') ||
      line.includes('// === Additional Science') ||
      line.includes('// Additional Science')
    ) {
      currentSubject = 'science'
    } else if (
      line.includes('// === Social Studies') ||
      line.includes('// Social Studies')
    ) {
      currentSubject = 'social_studies'
    } else if (
      line.includes('// === Language Arts') ||
      line.includes('// Language Arts')
    ) {
      currentSubject = 'language_arts'
    } else if (
      line.includes('// === Health') ||
      line.includes('// Health')
    ) {
      currentSubject = 'health'
    } else if (
      line.includes('// === Art') ||
      line.includes('// Art')
    ) {
      currentSubject = 'art_music'
    } else if (
      line.includes('// === STEM') ||
      line.includes('// STEM')
    ) {
      currentSubject = 'stem'
    }

    // Match import lines: import { FOO_TEMPLATE } from './bar'
    const importMatch = line.match(
      /import\s+\{\s*(\w+)\s*\}\s+from\s+['"]\.\//
    )
    if (importMatch) {
      importToSubject.set(importMatch[1], currentSubject)
    }
  }

  // Now map template IDs to subjects by matching template variable names
  // We'll build a map from template ID to subject by using ALL_TEMPLATES
  // and matching their variable names to the importToSubject map

  // Build id -> subject by checking which variable name each template corresponds to
  // We can match by reading each template file and finding the export name
  const idToSubject = new Map<string, SubjectArea>()

  // Parse ALL_TEMPLATES entries from the index to get the order
  const allTemplatesBlock = indexSource.match(
    /export const ALL_TEMPLATES[^[]*\[([\s\S]*?)\]/
  )
  if (allTemplatesBlock) {
    const entries = allTemplatesBlock[1].match(/(\w+_TEMPLATE)/g) || []
    for (const varName of entries) {
      const subject = importToSubject.get(varName)
      // Find the template with this variable name in ALL_TEMPLATES
      // Variable names follow the pattern: FOO_BAR_TEMPLATE -> id: 'foo-bar'
      const expectedId = varName
        .replace(/_TEMPLATE$/, '')
        .toLowerCase()
        .replace(/_/g, '-')
        // Handle special cases
        .replace('three-d-shapes', '3d-shapes')

      if (subject) {
        idToSubject.set(expectedId, subject)
      }
    }
  }

  // For any templates not matched by variable name, try to match by ID
  for (const t of ALL_TEMPLATES) {
    if (!idToSubject.has(t.id)) {
      // Try to find it in the import map by building the variable name from the id
      const varName =
        t.id
          .replace(/^3d/, 'three-d')
          .replace(/-/g, '_')
          .toUpperCase() + '_TEMPLATE'
      const subject = importToSubject.get(varName)
      if (subject) {
        idToSubject.set(t.id, subject)
      } else {
        // Default: try to classify by category keywords
        idToSubject.set(t.id, classifyByCategory(t.category))
      }
    }
  }

  return idToSubject
}

function classifyByCategory(category: string): SubjectArea {
  const cat = category.toLowerCase()
  // Science-related
  if (
    [
      'life-cycles',
      'food-chains',
      'plant-anatomy',
      'animal-classification',
      'human-body-systems',
      'basic-cells',
      'habitats-ecosystems',
      'animal-adaptations',
      'plant-science',
      'earth-science',
      'water-cycle',
      'rock-cycle',
      'weather-clouds',
      'solar-system',
      'moon-phases',
      'earth-layers',
      'seasons-earth-tilt',
      'landforms',
      'erosion-weathering',
      'five-senses',
      'states-of-matter',
      'simple-machines',
      'magnets',
      'light-optics',
      'sound-waves',
      'energy-types',
      'forces-motion-elementary',
      'simple-circuits',
      'natural-disasters',
      'day-night-rotation',
      'properties-of-matter',
      'mixtures-solutions',
      'static-electricity',
      'shadow-light',
      'plant-needs',
      'decomposition-cycle',
    ].includes(cat)
  ) {
    return 'science'
  }
  // Social studies
  if (
    [
      'timelines',
      'map-elements',
      'government-structure',
      'community-map',
      'family-tree',
      'world-continents',
      'economics-elementary',
      'map-grid-coordinates',
      'natural-resources',
      'community-helpers',
    ].includes(cat)
  ) {
    return 'social_studies'
  }
  // Language arts
  if (
    [
      'venn-diagram',
      'plot-diagram',
      'concept-web',
      'sequence-chain',
      't-chart',
      'kwl-chart',
      'cause-effect',
      'fact-opinion',
      'letter-format',
      'text-structure',
      'word-parts',
      'authors-purpose',
      'genre-chart',
      'parts-of-speech',
      'sentence-diagram',
      'story-elements',
      'text-features',
      'writing-process',
    ].includes(cat)
  ) {
    return 'language_arts'
  }
  // Health
  if (
    [
      'nutrition-plate',
      'dental-health',
      'activity-pyramid',
      'feelings-emotions',
      'hand-washing-steps',
    ].includes(cat)
  ) {
    return 'health'
  }
  // Art/music
  if (['color-wheel', 'musical-staff'].includes(cat)) {
    return 'art_music'
  }
  // STEM
  if (
    [
      'scientific-method',
      'engineering-design',
      'data-table',
      'classification-key',
    ].includes(cat)
  ) {
    return 'stem'
  }
  return 'math'
}

// ─── Check functions ─────────────────────────────────────────────────────────

function checkGradeRangeValidity(issues: Issue[]): void {
  for (const t of ALL_TEMPLATES) {
    const [min, max] = t.gradeRange
    if (min > max) {
      issues.push({
        templateId: t.id,
        check: 'grade_range',
        message: `gradeRange min (${min}) > max (${max})`,
        severity: 'ERROR',
      })
    }
    if (min < 1) {
      issues.push({
        templateId: t.id,
        check: 'grade_range',
        message: `gradeRange min (${min}) < 1`,
        severity: 'ERROR',
      })
    }
    if (max > 12) {
      issues.push({
        templateId: t.id,
        check: 'grade_range',
        message: `gradeRange max (${max}) > 12`,
        severity: 'ERROR',
      })
    }
    if (!Number.isInteger(min) || !Number.isInteger(max)) {
      issues.push({
        templateId: t.id,
        check: 'grade_range',
        message: `gradeRange values must be integers: [${min}, ${max}]`,
        severity: 'ERROR',
      })
    }
  }
}

function checkGradeCoverageBySubject(issues: Issue[]): void {
  const subjectMap = buildSubjectMap()

  // Group templates by subject
  const subjectTemplates = new Map<SubjectArea, typeof ALL_TEMPLATES>()
  for (const area of SUBJECT_AREAS) {
    subjectTemplates.set(area, [])
  }

  for (const t of ALL_TEMPLATES) {
    const subject = subjectMap.get(t.id) || 'math'
    subjectTemplates.get(subject)!.push(t)
  }

  // For each subject, check that grades 1-6 are covered
  for (const [subject, templates] of subjectTemplates.entries()) {
    if (templates.length === 0) {
      issues.push({
        templateId: '*',
        check: 'grade_coverage',
        message: `Subject "${subject}" has NO templates at all`,
        severity: 'WARNING',
      })
      continue
    }

    for (let grade = 1; grade <= 6; grade++) {
      const coversGrade = templates.some(
        (t) => t.gradeRange[0] <= grade && grade <= t.gradeRange[1]
      )
      if (!coversGrade) {
        issues.push({
          templateId: '*',
          check: 'grade_coverage',
          message: `Subject "${subject}" has NO templates covering grade ${grade} (${templates.length} templates total, ranges: ${templates.map((t) => `${t.id}[${t.gradeRange}]`).join(', ')})`,
          severity: 'WARNING',
        })
      }
    }
  }

  // Print summary
  console.log('\n  Subject template counts:')
  for (const [subject, templates] of subjectTemplates.entries()) {
    const gradesCovered = new Set<number>()
    for (const t of templates) {
      for (let g = t.gradeRange[0]; g <= t.gradeRange[1]; g++) {
        gradesCovered.add(g)
      }
    }
    const covered16 = [1, 2, 3, 4, 5, 6].filter((g) =>
      gradesCovered.has(g)
    )
    console.log(
      `    ${subject.padEnd(16)} ${String(templates.length).padStart(3)} templates, grades 1-6 coverage: [${covered16.join(',')}]`
    )
  }
}

function checkReferenceCodeQuality(issues: Issue[]): void {
  const unicodePattern = /[^\x00-\x7F]/

  for (const t of ALL_TEMPLATES) {
    const code = t.referenceCode

    // Must contain \begin{tikzpicture} and \end{tikzpicture}
    if (!code.includes('\\begin{tikzpicture}')) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message: 'referenceCode missing \\begin{tikzpicture}',
        severity: 'ERROR',
      })
    }
    if (!code.includes('\\end{tikzpicture}')) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message: 'referenceCode missing \\end{tikzpicture}',
        severity: 'ERROR',
      })
    }

    // Must NOT contain Unicode characters
    if (unicodePattern.test(code)) {
      const unicodeChars = code.match(/[^\x00-\x7F]/g) || []
      const unique = [...new Set(unicodeChars)]
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message: `referenceCode contains Unicode characters: ${unique.map((c) => `"${c}" (U+${c.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')})`).join(', ')}`,
        severity: 'ERROR',
      })
    }

    // Must NOT contain \usepackage
    if (code.includes('\\usepackage')) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message:
          'referenceCode contains \\usepackage (should be in preamble, not in code)',
        severity: 'WARNING',
      })
    }

    // Must NOT contain \documentclass
    if (code.includes('\\documentclass')) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message:
          'referenceCode contains \\documentclass (should not be in template code)',
        severity: 'ERROR',
      })
    }

    // Code length between 200 and 5000 characters
    if (code.length < 200) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message: `referenceCode too short: ${code.length} chars (min 200)`,
        severity: 'WARNING',
      })
    }
    if (code.length > 5000) {
      issues.push({
        templateId: t.id,
        check: 'code_quality',
        message: `referenceCode too long: ${code.length} chars (max 5000)`,
        severity: 'WARNING',
      })
    }
  }
}

function checkTemplateNameQuality(issues: Issue[]): void {
  for (const t of ALL_TEMPLATES) {
    if (t.name.length <= 3) {
      issues.push({
        templateId: t.id,
        check: 'name_quality',
        message: `Template name too short: "${t.name}" (${t.name.length} chars, need > 3)`,
        severity: 'ERROR',
      })
    }
    if (t.name.length >= 50) {
      issues.push({
        templateId: t.id,
        check: 'name_quality',
        message: `Template name too long: "${t.name}" (${t.name.length} chars, need < 50)`,
        severity: 'WARNING',
      })
    }
  }
}

function checkKeywordsMinimum(issues: Issue[]): void {
  for (const t of ALL_TEMPLATES) {
    if (t.keywords.length < 5) {
      issues.push({
        templateId: t.id,
        check: 'keywords_min',
        message: `Only ${t.keywords.length} keywords (need >= 5): [${t.keywords.join(', ')}]`,
        severity: 'WARNING',
      })
    }
  }
}

function checkTopicsMinimum(issues: Issue[]): void {
  for (const t of ALL_TEMPLATES) {
    if (t.topics.length < 1) {
      issues.push({
        templateId: t.id,
        check: 'topics_min',
        message: 'No topics defined (need >= 1)',
        severity: 'ERROR',
      })
    }
  }
}

function checkExportConsistency(issues: Issue[]): void {
  const indexPath = path.resolve(__dirname, '../templates/index.ts')
  const indexSource = fs.readFileSync(indexPath, 'utf-8')

  // 1. Count imports (only from relative paths, not from '../index')
  const importMatches =
    indexSource.match(
      /import\s+\{\s*\w+\s*\}\s+from\s+['"]\.\/[^'"]+['"]/g
    ) || []
  const importCount = importMatches.length

  // Extract imported variable names
  const importedNames = new Set<string>()
  for (const m of importMatches) {
    const nameMatch = m.match(/import\s+\{\s*(\w+)\s*\}/)
    if (nameMatch) {
      importedNames.add(nameMatch[1])
    }
  }

  // 2. Extract ALL_TEMPLATES array entries using bracket-depth parsing
  //    The regex approach fails because the array contains nested `]` in comments.
  //    Instead, find the `= [` that starts the actual array literal (skipping
  //    the `[]` in the type annotation `TikzTemplate[]`).
  const allTemplatesEntries: string[] = []
  const arrayStartIdx = indexSource.indexOf('export const ALL_TEMPLATES')
  if (arrayStartIdx !== -1) {
    // Find `= [` to skip past `TikzTemplate[]`
    const eqSignIdx = indexSource.indexOf('= [', arrayStartIdx)
    const openBracketIdx = eqSignIdx !== -1 ? eqSignIdx + 2 : -1
    if (openBracketIdx !== -1) {
      // Find the matching closing bracket by counting bracket depth
      let depth = 0
      let closingIdx = -1
      for (let i = openBracketIdx; i < indexSource.length; i++) {
        if (indexSource[i] === '[') depth++
        else if (indexSource[i] === ']') {
          depth--
          if (depth === 0) {
            closingIdx = i
            break
          }
        }
      }
      if (closingIdx !== -1) {
        const arrayBody = indexSource.slice(openBracketIdx + 1, closingIdx)
        const entries = arrayBody.match(/(\w+_TEMPLATE)/g) || []
        allTemplatesEntries.push(...entries)
      }
    }
  }

  // 3. Extract named exports from the `export { ... }` block
  //    Use the same bracket-depth approach for reliability
  const exportedNames = new Set<string>()
  const exportIdx = indexSource.indexOf('\nexport {')
  if (exportIdx !== -1) {
    const openBraceIdx = indexSource.indexOf('{', exportIdx)
    if (openBraceIdx !== -1) {
      let depth = 0
      let closingIdx = -1
      for (let i = openBraceIdx; i < indexSource.length; i++) {
        if (indexSource[i] === '{') depth++
        else if (indexSource[i] === '}') {
          depth--
          if (depth === 0) {
            closingIdx = i
            break
          }
        }
      }
      if (closingIdx !== -1) {
        const exportBody = indexSource.slice(openBraceIdx + 1, closingIdx)
        const names = exportBody.match(/(\w+_TEMPLATE)/g) || []
        for (const n of names) {
          exportedNames.add(n)
        }
      }
    }
  }

  // Check: import count matches ALL_TEMPLATES array length
  const arrayLength = allTemplatesEntries.length
  if (importCount !== arrayLength) {
    issues.push({
      templateId: '*',
      check: 'export_consistency',
      message: `Import count (${importCount}) != ALL_TEMPLATES array length (${arrayLength})`,
      severity: 'ERROR',
    })
  }

  // Check: ALL_TEMPLATES array length matches runtime ALL_TEMPLATES.length
  if (arrayLength !== ALL_TEMPLATES.length) {
    issues.push({
      templateId: '*',
      check: 'export_consistency',
      message: `Parsed ALL_TEMPLATES entries (${arrayLength}) != runtime ALL_TEMPLATES.length (${ALL_TEMPLATES.length})`,
      severity: 'ERROR',
    })
  }

  // Check: every import is in ALL_TEMPLATES
  const allTemplatesSet = new Set(allTemplatesEntries)
  for (const name of importedNames) {
    if (!allTemplatesSet.has(name)) {
      issues.push({
        templateId: '*',
        check: 'export_consistency',
        message: `Imported "${name}" is NOT in ALL_TEMPLATES array`,
        severity: 'ERROR',
      })
    }
  }

  // Check: every ALL_TEMPLATES entry is imported
  for (const name of allTemplatesEntries) {
    if (!importedNames.has(name)) {
      issues.push({
        templateId: '*',
        check: 'export_consistency',
        message: `ALL_TEMPLATES entry "${name}" is NOT imported`,
        severity: 'ERROR',
      })
    }
  }

  // Check: every import is in named exports
  for (const name of importedNames) {
    if (!exportedNames.has(name)) {
      issues.push({
        templateId: '*',
        check: 'export_consistency',
        message: `Imported "${name}" is NOT in the named export block`,
        severity: 'WARNING',
      })
    }
  }

  // Check: every named export is imported
  for (const name of exportedNames) {
    if (!importedNames.has(name)) {
      issues.push({
        templateId: '*',
        check: 'export_consistency',
        message: `Named export "${name}" is NOT imported`,
        severity: 'ERROR',
      })
    }
  }

  // Print summary counts
  console.log('\n  Export consistency counts:')
  console.log(`    Imports:              ${importCount}`)
  console.log(`    ALL_TEMPLATES entries: ${arrayLength}`)
  console.log(`    Runtime array length:  ${ALL_TEMPLATES.length}`)
  console.log(`    Named exports:         ${exportedNames.size}`)
}

// ─── Duplicate ID check ──────────────────────────────────────────────────────

function checkDuplicateIds(issues: Issue[]): void {
  const seen = new Map<string, number>()
  for (const t of ALL_TEMPLATES) {
    seen.set(t.id, (seen.get(t.id) || 0) + 1)
  }
  for (const [id, count] of seen.entries()) {
    if (count > 1) {
      issues.push({
        templateId: id,
        check: 'duplicate_id',
        message: `Template ID "${id}" appears ${count} times in ALL_TEMPLATES`,
        severity: 'ERROR',
      })
    }
  }
}

// ─── Main ────────────────────────────────────────────────────────────────────

function main() {
  console.log('='.repeat(70))
  console.log('  TikZ Template System — Structural Integrity Check')
  console.log('='.repeat(70))
  console.log(`\n  Total templates loaded: ${ALL_TEMPLATES.length}\n`)

  const issues: Issue[] = []

  // 1. Grade range validity
  console.log('  [1/7] Checking grade range validity...')
  checkGradeRangeValidity(issues)

  // 2. Grade coverage by subject
  console.log('  [2/7] Checking grade coverage by subject...')
  checkGradeCoverageBySubject(issues)

  // 3. referenceCode quality
  console.log('\n  [3/7] Checking referenceCode quality...')
  checkReferenceCodeQuality(issues)

  // 4. Template name quality
  console.log('  [4/7] Checking template name quality...')
  checkTemplateNameQuality(issues)

  // 5. Keywords minimum
  console.log('  [5/7] Checking keywords minimum (>= 5)...')
  checkKeywordsMinimum(issues)

  // 6. Topics minimum
  console.log('  [6/7] Checking topics minimum (>= 1)...')
  checkTopicsMinimum(issues)

  // 7. Export consistency
  console.log('  [7/7] Checking export consistency...')
  checkExportConsistency(issues)

  // Bonus: duplicate IDs
  console.log('  [bonus] Checking for duplicate template IDs...')
  checkDuplicateIds(issues)

  // ─── Report ──────────────────────────────────────────────────────────────

  const errors = issues.filter((i) => i.severity === 'ERROR')
  const warnings = issues.filter((i) => i.severity === 'WARNING')

  console.log('\n' + '='.repeat(70))
  console.log(
    `  RESULTS: ${errors.length} errors, ${warnings.length} warnings`
  )
  console.log('='.repeat(70))

  if (errors.length > 0) {
    console.log('\n  ERRORS:')
    for (const e of errors) {
      console.log(`    [ERROR] ${e.templateId} (${e.check}): ${e.message}`)
    }
  }

  if (warnings.length > 0) {
    console.log('\n  WARNINGS:')
    for (const w of warnings) {
      console.log(
        `    [WARN]  ${w.templateId} (${w.check}): ${w.message}`
      )
    }
  }

  if (errors.length === 0 && warnings.length === 0) {
    console.log('\n  All checks passed with no issues.')
  }

  console.log('')

  // Exit with error code if there are ERRORs
  if (errors.length > 0) {
    process.exit(1)
  }
}

main()
