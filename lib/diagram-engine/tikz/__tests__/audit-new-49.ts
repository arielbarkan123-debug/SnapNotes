/**
 * Audit of 49 new templates (topics 156-224) against the TikZ topic detector.
 *
 * Covers: Math (14), Life Science (4), Earth & Space Science (12),
 * Social Studies (5), Language Arts (11), Health/Wellness (3).
 *
 * For each prompt, verifies:
 *   1. Which template it matches
 *   2. The confidence score
 *   3. Whether the match is correct (based on expected template)
 *   4. The total prompt size that would be generated
 *
 * Run with: npx tsx lib/tikz/__tests__/audit-new-49.ts
 */

import { detectTopic } from '../topic-detector'
import { isAdvancedTopic } from '../advanced-fallback'
import { buildTikzPrompt } from '../index'

// --- Test Case Type ---

interface TestCase {
  id: number
  topic: number
  prompt: string
  expected: string[]        // acceptable template IDs (first is primary)
  subject: string           // for display grouping
}

// --- All 49 Test Cases (Topics 156-224) ---

const TEST_CASES: TestCase[] = [
  // Math — Elapsed Time, Probability, Patterns (Topics 156-167)
  { id: 1,  topic: 156, prompt: 'How much time passed between 2:00 and 4:30 on the clock', expected: ['elapsed-time'], subject: 'Math' },
  { id: 2,  topic: 158, prompt: 'Spin the spinner what is the probability of landing on red', expected: ['probability-elementary'], subject: 'Math' },
  { id: 3,  topic: 160, prompt: 'What comes next in this growing pattern of shapes', expected: ['pattern-sequences-elementary'], subject: 'Math' },
  { id: 4,  topic: 162, prompt: 'Convert 36 inches to feet using a measurement conversion chart', expected: ['measurement-conversion'], subject: 'Math' },
  { id: 5,  topic: 164, prompt: 'Complete the input output table using the rule multiply by 3', expected: ['input-output-table'], subject: 'Math' },
  { id: 6,  topic: 165, prompt: 'Round 47 to the nearest ten using a rounding number line', expected: ['rounding-number-line'], subject: 'Math' },
  { id: 7,  topic: 166, prompt: 'Put 34 28 and 51 in order from least to greatest using greater than less than signs', expected: ['comparing-ordering-numbers'], subject: 'Math' },

  // Math — Skip Counting through Expanded Form (Topics 168-179)
  { id: 8,  topic: 168, prompt: 'Skip count by fives from 5 to 50 on a hundreds chart', expected: ['skip-counting'], subject: 'Math' },
  { id: 9,  topic: 170, prompt: 'Draw 3d shapes like cube sphere cylinder and cone with labels', expected: ['3d-shapes'], subject: 'Math' },
  { id: 10, topic: 172, prompt: 'Find the perimeter of a rectangle that is 6 cm by 4 cm', expected: ['perimeter-area-elementary'], subject: 'Math' },
  { id: 11, topic: 174, prompt: 'Money math practice with counting money and coin values', expected: ['coin-money'], subject: 'Math' },
  { id: 12, topic: 176, prompt: 'Sort these numbers into even and odd groups', expected: ['even-odd-numbers'], subject: 'Math' },
  { id: 13, topic: 177, prompt: 'Fill in the times table multiplication chart for 1 through 10', expected: ['multiplication-table'], subject: 'Math' },
  { id: 14, topic: 178, prompt: 'Decompose number write in expanded form break apart number into place value expanded', expected: ['expanded-form'], subject: 'Math' },

  // Life Science — New templates (Topics 180-186)
  { id: 15, topic: 180, prompt: 'Show how animals use camouflage and mimicry as adaptations for survival', expected: ['animal-adaptations'], subject: 'Life Science' },
  { id: 16, topic: 182, prompt: 'Compare which animals hibernate in winter versus which ones migrate south', expected: ['hibernation-migration'], subject: 'Life Science' },
  { id: 17, topic: 184, prompt: 'How does a bee help with pollination carrying pollen between flowers', expected: ['pollination-photosynthesis'], subject: 'Life Science' },
  { id: 18, topic: 186, prompt: 'Which traits are inherited from parents and which are learned behaviors', expected: ['inherited-learned-traits'], subject: 'Life Science' },

  // Earth & Space Science — New templates (Topics 187-202)
  { id: 19, topic: 187, prompt: 'Show the layers of soil from topsoil to bedrock with humus', expected: ['soil-layers'], subject: 'Earth & Space' },
  { id: 20, topic: 188, prompt: 'Explain how fossils form step by step over millions of years fossilization', expected: ['fossil-formation'], subject: 'Earth & Space' },
  { id: 21, topic: 190, prompt: 'Compare renewable energy like solar and wind with nonrenewable fossil fuels', expected: ['renewable-nonrenewable'], subject: 'Earth & Space' },
  { id: 22, topic: 192, prompt: 'Reduce reuse recycle how can we practice conservation and reduce waste', expected: ['recycling-conservation'], subject: 'Earth & Space' },
  { id: 23, topic: 193, prompt: 'How does a volcano erupt and what causes earthquakes and tornadoes natural disaster', expected: ['natural-disasters'], subject: 'Earth & Space' },
  { id: 24, topic: 196, prompt: 'Why do we have day and night because the earth rotation spins', expected: ['day-night-rotation'], subject: 'Earth & Space' },
  { id: 25, topic: 197, prompt: 'What are the physical properties of matter like mass volume and density', expected: ['properties-of-matter'], subject: 'Earth & Space' },
  { id: 26, topic: 198, prompt: 'When you dissolve sugar in water is it a mixture or a solution', expected: ['mixtures-solutions'], subject: 'Earth & Space' },
  { id: 27, topic: 199, prompt: 'Rubbing a balloon on hair creates static electricity with positive and negative charges', expected: ['static-electricity'], subject: 'Earth & Space' },
  { id: 28, topic: 200, prompt: 'How do shadows change size when the light source moves closer', expected: ['shadow-light'], subject: 'Earth & Space' },
  { id: 29, topic: 201, prompt: 'What do plants need sunlight water and soil for plant growth requirements', expected: ['plant-needs'], subject: 'Earth & Space' },
  { id: 30, topic: 202, prompt: 'Decomposers like fungi and bacteria break down dead matter in the nutrient cycle', expected: ['decomposition-cycle'], subject: 'Earth & Space' },

  // Social Studies — New templates (Topics 203-209)
  { id: 31, topic: 203, prompt: 'Label the seven continents and five oceans on a world map', expected: ['world-continents'], subject: 'Social Studies' },
  { id: 32, topic: 205, prompt: 'What are goods and services and what is supply and demand economics', expected: ['economics-elementary'], subject: 'Social Studies' },
  { id: 33, topic: 207, prompt: 'Use grid coordinates on a map to find the location of the school', expected: ['map-grid-coordinates'], subject: 'Social Studies' },
  { id: 34, topic: 208, prompt: 'What are natural resources like land water and air that we use', expected: ['natural-resources'], subject: 'Social Studies' },
  { id: 35, topic: 209, prompt: 'Who are the community helpers like firefighter police teacher doctor', expected: ['community-helpers'], subject: 'Social Studies' },

  // Language Arts — New templates (Topics 210-219, 223-224)
  { id: 36, topic: 210, prompt: 'Label the parts of speech in this sentence noun verb adjective adverb', expected: ['parts-of-speech'], subject: 'Language Arts' },
  { id: 37, topic: 211, prompt: 'Diagram this sentence showing the subject and predicate on a line', expected: ['sentence-diagram'], subject: 'Language Arts' },
  { id: 38, topic: 212, prompt: 'Story elements chart showing characters setting plot and story parts', expected: ['story-elements'], subject: 'Language Arts' },
  { id: 39, topic: 213, prompt: 'What are nonfiction text features like table of contents heading caption glossary', expected: ['text-features'], subject: 'Language Arts' },
  { id: 40, topic: 214, prompt: 'Explain the writing process steps prewrite draft revise edit publish', expected: ['writing-process'], subject: 'Language Arts' },
  { id: 41, topic: 216, prompt: 'Fact or opinion chart sort these statements into facts and opinions', expected: ['fact-opinion'], subject: 'Language Arts' },
  { id: 42, topic: 217, prompt: 'Show the parts of a friendly letter with greeting body and closing', expected: ['letter-format'], subject: 'Language Arts' },
  { id: 43, topic: 218, prompt: 'Identify the text structure and signal words in this passage chronological order', expected: ['text-structure'], subject: 'Language Arts' },
  { id: 44, topic: 219, prompt: 'Break the word unhelpful into prefix root word and suffix', expected: ['word-parts'], subject: 'Language Arts' },
  { id: 45, topic: 223, prompt: 'Why did the author write this to persuade inform or entertain readers', expected: ['authors-purpose'], subject: 'Language Arts' },
  { id: 46, topic: 224, prompt: 'What genre is this book fiction nonfiction fantasy biography mystery', expected: ['genre-chart'], subject: 'Language Arts' },

  // Health / Wellness — New templates (Topics 220-222)
  { id: 47, topic: 220, prompt: 'Show the physical activity pyramid with daily exercise levels', expected: ['activity-pyramid'], subject: 'Health' },
  { id: 48, topic: 221, prompt: 'Identify your feelings and emotions chart happy sad angry scared surprised', expected: ['feelings-emotions'], subject: 'Health' },
  { id: 49, topic: 222, prompt: 'Show the hand washing steps with soap and water to prevent germs hygiene', expected: ['hand-washing-steps'], subject: 'Health' },
]

// --- Result Type ---

interface TestResult {
  id: number
  topic: number
  prompt: string
  subject: string
  detectedTemplate: string
  confidence: number
  promptSize: number
  expectedTemplates: string[]
  isAdvancedActual: boolean
  passed: boolean
  reason?: string
}

// --- Run Audit ---

function runAudit(): TestResult[] {
  const results: TestResult[] = []

  for (const tc of TEST_CASES) {
    const match = detectTopic(tc.prompt)
    const advanced = isAdvancedTopic(tc.prompt)
    const fullPrompt = buildTikzPrompt(tc.prompt)
    const promptSize = fullPrompt.length

    let passed = false
    let reason: string | undefined

    if (tc.expected.includes(match.template.id)) {
      passed = true
    } else {
      passed = false
      reason = 'Expected one of [' + tc.expected.join(', ') + '], got "' + match.template.id + '"'
    }

    // Warn if an elementary topic is being flagged as advanced
    if (advanced && passed) {
      // Not a failure, but flag it for awareness
    }

    results.push({
      id: tc.id,
      topic: tc.topic,
      prompt: tc.prompt,
      subject: tc.subject,
      detectedTemplate: match.template.id,
      confidence: match.confidence,
      promptSize,
      expectedTemplates: tc.expected,
      isAdvancedActual: advanced,
      passed,
      reason,
    })
  }

  return results
}

// --- Format & Print ---

function truncate(s: string, len: number): string {
  return s.length <= len ? s.padEnd(len) : s.slice(0, len - 3) + '...'
}

function main() {
  console.log('='.repeat(140))
  console.log('  TIKZ NEW TEMPLATE AUDIT -- 49 PROMPTS (Topics 156-224)')
  console.log('='.repeat(140))
  console.log()

  const results = runAudit()

  // Column headers
  const header = [
    '#'.padStart(3),
    'T#'.padStart(3),
    'Subject'.padEnd(17),
    'Prompt'.padEnd(55),
    'Detected'.padEnd(25),
    'Conf'.padStart(5),
    'Size'.padStart(7),
    'Adv?'.padStart(4),
    'Result'.padEnd(6),
  ].join(' | ')

  console.log(header)
  console.log('-'.repeat(140))

  let currentSubject = ''
  for (const r of results) {
    if (r.subject !== currentSubject) {
      if (currentSubject) console.log()  // blank line between subject groups
      currentSubject = r.subject
    }

    const status = r.passed ? 'PASS' : 'FAIL'
    const statusColor = r.passed ? '\x1b[32m' : '\x1b[31m'
    const advFlag = r.isAdvancedActual ? '\x1b[33mY\x1b[0m' : 'N'
    const reset = '\x1b[0m'

    const row = [
      String(r.id).padStart(3),
      String(r.topic).padStart(3),
      r.subject.padEnd(17),
      truncate(r.prompt, 55),
      r.detectedTemplate.padEnd(25),
      r.confidence.toFixed(2).padStart(5),
      String(r.promptSize).padStart(7),
      advFlag.padStart(4),
      statusColor + status + reset,
    ].join(' | ')

    console.log(row)
  }

  // --- Summary ---

  console.log()
  console.log('='.repeat(140))
  console.log('  SUMMARY')
  console.log('='.repeat(140))

  const passed = results.filter((r) => r.passed)
  const failed = results.filter((r) => !r.passed)
  const advancedFlagged = results.filter((r) => r.isAdvancedActual)
  const promptSizes = results.map((r) => r.promptSize)
  const avgSize = promptSizes.reduce((a, b) => a + b, 0) / promptSizes.length
  const minSize = Math.min(...promptSizes)
  const maxSize = Math.max(...promptSizes)
  const confidences = results.map((r) => r.confidence)
  const avgConf = confidences.reduce((a, b) => a + b, 0) / confidences.length

  console.log()
  console.log('  Total tests:            ' + results.length)
  console.log('  \x1b[32mPassed:                 ' + passed.length + '\x1b[0m')
  console.log('  \x1b[31mFailed:                 ' + failed.length + '\x1b[0m')
  console.log('  Pass rate:              ' + ((passed.length / results.length) * 100).toFixed(1) + '%')
  console.log()
  console.log('  Avg confidence:         ' + avgConf.toFixed(3))
  console.log('  Avg prompt size:        ' + Math.round(avgSize).toLocaleString() + ' chars')
  console.log('  Min prompt size:        ' + minSize.toLocaleString() + ' chars')
  console.log('  Max prompt size:        ' + maxSize.toLocaleString() + ' chars')
  console.log()
  console.log('  \x1b[33mFlagged as advanced:     ' + advancedFlagged.length + '\x1b[0m (should route to elementary via priority logic)')

  // --- Subject-level breakdown ---

  console.log()
  console.log('  Subject-level breakdown:')
  const subjects = [...new Set(results.map((r) => r.subject))]
  for (const s of subjects) {
    const subResults = results.filter((r) => r.subject === s)
    const subPassed = subResults.filter((r) => r.passed).length
    const subTotal = subResults.length
    const pct = ((subPassed / subTotal) * 100).toFixed(0)
    const indicator = subPassed === subTotal ? '\x1b[32m' : '\x1b[33m'
    console.log('    ' + indicator + s.padEnd(20) + subPassed + '/' + subTotal + ' (' + pct + '%)' + '\x1b[0m')
  }

  // --- Failed test details ---

  if (failed.length > 0) {
    console.log()
    console.log('  FAILED TEST DETAILS:')
    console.log('  ' + '-'.repeat(110))
    for (const f of failed) {
      console.log('  #' + f.id + ' (Topic ' + f.topic + '): "' + f.prompt + '"')
      console.log('    ' + f.reason)
      console.log('    Detected: ' + f.detectedTemplate + ' (confidence: ' + f.confidence.toFixed(2) + ')')
      console.log('    isAdvancedTopic: ' + f.isAdvancedActual)
      console.log()
    }
  }

  // --- Confidence distribution ---

  console.log()
  console.log('  CONFIDENCE DISTRIBUTION:')
  const confBuckets = [0, 0.33, 0.5, 0.67, 1.0, Infinity]
  const confLabels = ['  0.00 - 0.33', '  0.34 - 0.50', '  0.51 - 0.67', '  0.68 - 1.00']
  for (let i = 0; i < confLabels.length; i++) {
    const count = confidences.filter((c) => c >= confBuckets[i] && c < confBuckets[i + 1]).length
    const bar = '#'.repeat(count)
    console.log('    ' + confLabels[i] + ': ' + String(count).padStart(3) + ' ' + bar)
  }

  // --- Prompt size distribution ---

  console.log()
  console.log('  PROMPT SIZE DISTRIBUTION:')
  const sizeBuckets = [0, 2000, 4000, 6000, 8000, 10000, 15000, Infinity]
  const sizeLabels = ['     0 -  2k', '   2k -  4k', '   4k -  6k', '   6k -  8k', '   8k - 10k', '  10k - 15k', '  15k+      ']
  for (let i = 0; i < sizeLabels.length; i++) {
    const count = promptSizes.filter((s) => s >= sizeBuckets[i] && s < sizeBuckets[i + 1]).length
    if (count > 0) {
      const bar = '#'.repeat(count)
      console.log('    ' + sizeLabels[i] + ': ' + String(count).padStart(3) + ' ' + bar)
    }
  }

  console.log()
  console.log('='.repeat(140))

  // Exit with error code if there are failures
  if (failed.length > 0) {
    process.exit(1)
  }
}

main()
