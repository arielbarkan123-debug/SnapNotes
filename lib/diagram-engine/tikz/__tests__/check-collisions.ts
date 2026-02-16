/**
 * Comprehensive Keyword Collision & Duplicate Analysis for TikZ Template System
 *
 * Checks:
 * 1. Duplicate topic numbers across templates
 * 2. Topic number gaps (1-224)
 * 3. Keyword substring collisions between templates
 * 4. Cross-template prompt stealing (detectTopic mismatch)
 * 5. Duplicate keywords within templates
 * 6. Overly generic keywords (short common words)
 * 7. Category-to-ID consistency
 */

import { detectTopic, ALL_TEMPLATES } from '../index'

// ============================================================
// ANSI color helpers
// ============================================================
const RED = '\x1b[31m'
const GREEN = '\x1b[32m'
const YELLOW = '\x1b[33m'
const CYAN = '\x1b[36m'
const BOLD = '\x1b[1m'
const RESET = '\x1b[0m'

function header(title: string) {
  console.log(`\n${BOLD}${CYAN}${'='.repeat(70)}${RESET}`)
  console.log(`${BOLD}${CYAN}  ${title}${RESET}`)
  console.log(`${BOLD}${CYAN}${'='.repeat(70)}${RESET}\n`)
}

function pass(msg: string) {
  console.log(`  ${GREEN}PASS${RESET} ${msg}`)
}

function warn(msg: string) {
  console.log(`  ${YELLOW}WARN${RESET} ${msg}`)
}

function fail(msg: string) {
  console.log(`  ${RED}FAIL${RESET} ${msg}`)
}

function info(msg: string) {
  console.log(`  ${CYAN}INFO${RESET} ${msg}`)
}

// ============================================================
// Tracking
// ============================================================
let totalIssues = 0
let criticalIssues = 0
let warnings = 0

function countCritical() { totalIssues++; criticalIssues++ }
function countWarning() { totalIssues++; warnings++ }

// ============================================================
// CHECK 1: Duplicate topic numbers across templates
// ============================================================
function checkDuplicateTopics() {
  header('CHECK 1: Duplicate Topic Numbers Across Templates')

  const topicMap = new Map<number, string[]>()

  for (const t of ALL_TEMPLATES) {
    for (const topic of t.topics) {
      if (!topicMap.has(topic)) {
        topicMap.set(topic, [])
      }
      topicMap.get(topic)!.push(t.id)
    }
  }

  let dupes = 0
  const sortedTopics = [...topicMap.entries()].sort((a, b) => a[0] - b[0])

  for (const [topic, templates] of sortedTopics) {
    if (templates.length > 1) {
      dupes++
      fail(`Topic ${topic} appears in ${templates.length} templates: ${templates.join(', ')}`)
      countCritical()
    }
  }

  if (dupes === 0) {
    pass('No duplicate topic numbers found across templates.')
  } else {
    info(`Found ${dupes} topic numbers shared across multiple templates.`)
  }

  return topicMap
}

// ============================================================
// CHECK 2: Topic number gaps (1-224)
// ============================================================
function checkTopicGaps(topicMap: Map<number, string[]>) {
  header('CHECK 2: Topic Number Gaps (1-224)')

  const allTopics = new Set(topicMap.keys())
  const maxTopic = Math.max(...allTopics)
  const gaps: number[] = []

  for (let i = 1; i <= 224; i++) {
    if (!allTopics.has(i)) {
      gaps.push(i)
    }
  }

  if (gaps.length === 0) {
    pass(`All topics 1-224 are covered. No gaps.`)
  } else {
    // Group consecutive gaps for readability
    const ranges: string[] = []
    let start = gaps[0]
    let end = gaps[0]

    for (let i = 1; i < gaps.length; i++) {
      if (gaps[i] === end + 1) {
        end = gaps[i]
      } else {
        ranges.push(start === end ? `${start}` : `${start}-${end}`)
        start = gaps[i]
        end = gaps[i]
      }
    }
    ranges.push(start === end ? `${start}` : `${start}-${end}`)

    warn(`${gaps.length} missing topic numbers out of 1-224:`)
    console.log(`         Gaps: ${ranges.join(', ')}`)
    for (const _gap of gaps) {
      countWarning()
    }
  }

  info(`Highest topic number found: ${maxTopic}`)
  info(`Total unique topics covered: ${allTopics.size}`)
  info(`Total templates: ${ALL_TEMPLATES.length}`)
}

// ============================================================
// CHECK 3: Keyword substring collisions between templates
// ============================================================
function checkKeywordCollisions() {
  header('CHECK 3: Keyword Substring Collisions Between Templates')

  const collisions: Array<{
    templateA: string
    keywordA: string
    templateB: string
    keywordB: string
    type: 'substring-of' | 'contains'
  }> = []

  for (let i = 0; i < ALL_TEMPLATES.length; i++) {
    for (let j = i + 1; j < ALL_TEMPLATES.length; j++) {
      const a = ALL_TEMPLATES[i]
      const b = ALL_TEMPLATES[j]

      for (const kwA of a.keywords) {
        for (const kwB of b.keywords) {
          if (kwA === kwB) {
            // Exact duplicate across templates
            collisions.push({
              templateA: a.id,
              keywordA: kwA,
              templateB: b.id,
              keywordB: kwB,
              type: 'substring-of',
            })
          } else if (kwB.includes(kwA) && kwA.length >= 3) {
            collisions.push({
              templateA: a.id,
              keywordA: kwA,
              templateB: b.id,
              keywordB: kwB,
              type: 'substring-of',
            })
          } else if (kwA.includes(kwB) && kwB.length >= 3) {
            collisions.push({
              templateA: b.id,
              keywordA: kwB,
              templateB: a.id,
              keywordB: kwA,
              type: 'substring-of',
            })
          }
        }
      }
    }
  }

  if (collisions.length === 0) {
    pass('No keyword substring collisions found.')
  } else {
    // Group by severity
    const exactDupes = collisions.filter((c) => c.keywordA === c.keywordB)
    const substringCollisions = collisions.filter((c) => c.keywordA !== c.keywordB)

    if (exactDupes.length > 0) {
      console.log(`  ${RED}${BOLD}EXACT DUPLICATE keywords across templates (${exactDupes.length}):${RESET}`)
      for (const c of exactDupes) {
        fail(`"${c.keywordA}" in both [${c.templateA}] and [${c.templateB}]`)
        countCritical()
      }
    }

    if (substringCollisions.length > 0) {
      console.log(`\n  ${YELLOW}${BOLD}SUBSTRING collisions (${substringCollisions.length}):${RESET}`)
      // Deduplicate: only show unique pairs
      const seen = new Set<string>()
      for (const c of substringCollisions) {
        const key = `${c.keywordA}|${c.keywordB}|${c.templateA}|${c.templateB}`
        if (seen.has(key)) continue
        seen.add(key)
        warn(`"${c.keywordA}" [${c.templateA}] is a substring of "${c.keywordB}" [${c.templateB}]`)
        countWarning()
      }
    }
  }
}

// ============================================================
// CHECK 4: Cross-template prompt stealing
// ============================================================
function checkPromptStealing() {
  header('CHECK 4: Cross-Template Prompt Stealing (detectTopic)')

  let mismatches = 0
  let correct = 0

  for (const t of ALL_TEMPLATES) {
    const firstKeyword = t.keywords[0]
    const match = detectTopic(firstKeyword)

    if (match.template.id !== t.id) {
      mismatches++
      fail(
        `Template "${t.id}" first keyword "${firstKeyword}" -> detected as "${match.template.id}" ` +
        `(confidence: ${match.confidence.toFixed(2)})`
      )
      countCritical()
    } else {
      correct++
    }
  }

  if (mismatches === 0) {
    pass(`All ${ALL_TEMPLATES.length} templates correctly detected by their first keyword.`)
  } else {
    info(`${correct} correct, ${mismatches} mismatches out of ${ALL_TEMPLATES.length} templates.`)
  }
}

// ============================================================
// CHECK 5: Duplicate keywords within templates
// ============================================================
function checkDuplicateKeywordsWithinTemplates() {
  header('CHECK 5: Duplicate Keywords Within Templates')

  let templatesWithDupes = 0

  for (const t of ALL_TEMPLATES) {
    const seen = new Set<string>()
    const duplicates: string[] = []

    for (const kw of t.keywords) {
      const lower = kw.toLowerCase()
      if (seen.has(lower)) {
        duplicates.push(kw)
      }
      seen.add(lower)
    }

    if (duplicates.length > 0) {
      templatesWithDupes++
      fail(`Template "${t.id}" has duplicate keywords: ${duplicates.map(d => `"${d}"`).join(', ')}`)
      countCritical()
    }
  }

  if (templatesWithDupes === 0) {
    pass('No templates have duplicate keywords.')
  }
}

// ============================================================
// CHECK 6: Overly generic keywords
// ============================================================
function checkGenericKeywords() {
  header('CHECK 6: Overly Generic Keywords (< 5 chars, common words)')

  // Common short English words that are prone to false matching
  const commonShortWords = new Set([
    'cell', 'wave', 'rock', 'map', 'key', 'bar', 'line', 'net',
    'dot', 'box', 'set', 'tree', 'web', 'ray', 'arc', 'area',
    'base', 'coin', 'cone', 'cube', 'data', 'edge', 'face', 'form',
    'grid', 'half', 'heat', 'hole', 'inch', 'life', 'loop', 'mass',
    'mean', 'mode', 'moon', 'node', 'note', 'pair', 'part', 'path',
    'peak', 'plot', 'pole', 'pull', 'push', 'rate', 'root', 'rule',
    'salt', 'sand', 'seed', 'side', 'sign', 'size', 'soil', 'sort',
    'spin', 'star', 'stem', 'step', 'stop', 'sum', 'tens', 'term',
    'test', 'tick', 'time', 'tone', 'unit', 'vein', 'volt', 'watt',
    'word', 'work', 'zero', 'zoom', 'add', 'age', 'air', 'arm',
    'art', 'axe', 'axis', 'bay', 'bed', 'big', 'bit', 'body',
    'bone', 'bug', 'cap', 'car', 'core', 'cut', 'day', 'den',
    'dig', 'dim', 'dip', 'dry', 'ear', 'eat', 'egg', 'end',
    'eye', 'fat', 'fin', 'fit', 'fly', 'fog', 'fur', 'gap',
    'gas', 'gem', 'gun', 'gut', 'hug', 'ice', 'ink', 'ion',
    'jam', 'jar', 'jaw', 'jet', 'joy', 'lab', 'lap', 'law',
    'lay', 'leg', 'lid', 'lip', 'log', 'low', 'mud', 'nap',
    'nut', 'oak', 'odd', 'oil', 'old', 'ore', 'owl', 'pad',
    'pan', 'paw', 'pen', 'pet', 'pie', 'pig', 'pin', 'pit',
    'pod', 'pot', 'rib', 'rod', 'rot', 'row', 'rub', 'rug',
    'run', 'sap', 'saw', 'sea', 'set', 'shy', 'sit', 'six',
    'sky', 'sow', 'sun', 'tab', 'tag', 'tan', 'tap', 'tar',
    'tin', 'tip', 'top', 'toy', 'tub', 'tug', 'use', 'vet',
    'war', 'wax', 'wet', 'wig', 'win', 'yam', 'zip', 'zoo',
    'force', 'light', 'sound', 'plant', 'water', 'cycle',
    'decay', 'chart', 'graph', 'model', 'shape', 'angle',
    'scale', 'table', 'value', 'money', 'clock', 'count',
    'facts', 'order',
  ])

  let found = 0

  for (const t of ALL_TEMPLATES) {
    for (const kw of t.keywords) {
      // Check if keyword is a single common short word
      const lower = kw.toLowerCase().trim()
      if (lower.length < 5 && commonShortWords.has(lower)) {
        found++
        warn(`Template "${t.id}" has short generic keyword: "${kw}" (${kw.length} chars)`)
        countWarning()
      } else if (commonShortWords.has(lower)) {
        // Also catch longer common words that are still single words
        if (!lower.includes(' ') && lower.length <= 5) {
          found++
          warn(`Template "${t.id}" has generic single-word keyword: "${kw}"`)
          countWarning()
        }
      }
    }
  }

  if (found === 0) {
    pass('No overly generic single-word keywords found.')
  } else {
    info(`Found ${found} generic keywords that may cause false matches.`)
  }
}

// ============================================================
// CHECK 7: Category-to-ID consistency
// ============================================================
function checkCategoryIdConsistency() {
  header('CHECK 7: Category-to-ID Consistency')

  let mismatches = 0

  for (const t of ALL_TEMPLATES) {
    const idNorm = t.id.toLowerCase().replace(/-/g, '')
    const catNorm = t.category.toLowerCase().replace(/-/g, '')

    // Check if category matches or is closely related to id
    // Acceptable: id="foo-bar", category="foo-bar" (exact)
    // Acceptable: id="foo-bar", category="foo" (category is broader)
    // Suspicious: id="foo-bar", category="completely-different"

    const idMatches = t.id === t.category
    const idContainsCat = idNorm.includes(catNorm)
    const catContainsId = catNorm.includes(idNorm)

    // Also check if they share significant words
    const idWords = new Set(t.id.split('-'))
    const catWords = new Set(t.category.split('-'))
    const sharedWords = [...idWords].filter((w) => catWords.has(w) && w.length > 2)
    const hasSharedWords = sharedWords.length > 0

    // Known broader category patterns (e.g., category="earth-science" for id="rock-cycle")
    const broadCategories = new Set([
      'earth-science', 'life-science', 'physical-science', 'social-studies',
      'language-arts', 'health', 'math', 'stem',
    ])
    const isBroadCategory = broadCategories.has(t.category)

    if (!idMatches && !idContainsCat && !catContainsId && !hasSharedWords && !isBroadCategory) {
      mismatches++
      warn(`Template "${t.id}" has category "${t.category}" — no obvious relationship`)
      countWarning()
    }
  }

  if (mismatches === 0) {
    pass('All template categories are consistent with their IDs.')
  } else {
    info(`Found ${mismatches} templates with potentially inconsistent categories.`)
  }
}

// ============================================================
// BONUS: Summary statistics
// ============================================================
function printSummary() {
  header('SUMMARY')

  const allTopics = new Set<number>()
  let totalKeywords = 0

  for (const t of ALL_TEMPLATES) {
    for (const topic of t.topics) allTopics.add(topic)
    totalKeywords += t.keywords.length
  }

  info(`Total templates: ${ALL_TEMPLATES.length}`)
  info(`Total unique topic numbers: ${allTopics.size}`)
  info(`Total keywords across all templates: ${totalKeywords}`)
  info(`Average keywords per template: ${(totalKeywords / ALL_TEMPLATES.length).toFixed(1)}`)

  // Category distribution
  const categories = new Map<string, number>()
  for (const t of ALL_TEMPLATES) {
    categories.set(t.category, (categories.get(t.category) || 0) + 1)
  }
  info(`Unique categories: ${categories.size}`)

  console.log(`\n${BOLD}${'='.repeat(70)}${RESET}`)
  if (criticalIssues > 0) {
    console.log(`${RED}${BOLD}  CRITICAL ISSUES: ${criticalIssues}${RESET}`)
  }
  if (warnings > 0) {
    console.log(`${YELLOW}${BOLD}  WARNINGS: ${warnings}${RESET}`)
  }
  if (totalIssues === 0) {
    console.log(`${GREEN}${BOLD}  ALL CHECKS PASSED - No issues found!${RESET}`)
  } else {
    console.log(`${BOLD}  TOTAL ISSUES: ${totalIssues}${RESET}`)
  }
  console.log(`${BOLD}${'='.repeat(70)}${RESET}\n`)
}

// ============================================================
// RUN ALL CHECKS
// ============================================================
console.log(`\n${BOLD}TikZ Template Collision & Duplicate Analysis${RESET}`)
console.log(`Running against ${ALL_TEMPLATES.length} templates...\n`)

const topicMap = checkDuplicateTopics()
checkTopicGaps(topicMap)
checkKeywordCollisions()
checkPromptStealing()
checkDuplicateKeywordsWithinTemplates()
checkGenericKeywords()
checkCategoryIdConsistency()
printSummary()

// Exit with error code if critical issues found
if (criticalIssues > 0) {
  process.exit(1)
}
