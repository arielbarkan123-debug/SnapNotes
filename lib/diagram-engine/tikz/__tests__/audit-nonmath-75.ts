/**
 * Audit of 75 non-math prompts (topics 81-155) against the TikZ topic detector.
 *
 * Covers: Life Science, Earth & Space, Physical Science, Social Studies,
 * Language Arts, Health, Art/Music, STEM/Engineering.
 *
 * For each prompt, verifies:
 *   1. Which template it matches
 *   2. The confidence score
 *   3. Whether the match is correct (based on expected template)
 *   4. The total prompt size that would be generated
 *
 * Run with: npx tsx lib/tikz/__tests__/audit-nonmath-75.ts
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

// --- All 75 Test Cases (Topics 81-155) ---

const TEST_CASES: TestCase[] = [
  // Life Science (Topics 81-98)
  { id: 1,  topic: 81,  prompt: 'Show the butterfly life cycle with egg, larva, pupa, and adult stages', expected: ['life-cycles'], subject: 'Life Science' },
  { id: 2,  topic: 82,  prompt: 'Draw the frog life cycle from egg to tadpole to adult', expected: ['life-cycles'], subject: 'Life Science' },
  { id: 3,  topic: 83,  prompt: 'Plant life cycle showing seed germination growth flowering', expected: ['life-cycles'], subject: 'Life Science' },
  { id: 4,  topic: 84,  prompt: 'Food chain: grass is eaten by rabbit eaten by fox eaten by eagle', expected: ['food-chains-webs'], subject: 'Life Science' },
  { id: 5,  topic: 85,  prompt: 'Draw a food web showing multiple predator prey relationships', expected: ['food-chains-webs'], subject: 'Life Science' },
  { id: 6,  topic: 86,  prompt: 'Label the parts of a flower: petal sepal stamen pistil', expected: ['plant-anatomy'], subject: 'Life Science' },
  { id: 7,  topic: 87,  prompt: 'Show seed germination stages with root and shoot', expected: ['plant-anatomy'], subject: 'Life Science' },
  { id: 8,  topic: 88,  prompt: 'Parts of a plant: roots stem leaves flower', expected: ['plant-anatomy'], subject: 'Life Science' },
  { id: 9,  topic: 89,  prompt: 'Animal classification tree showing mammals birds fish reptiles amphibians', expected: ['animal-classification'], subject: 'Life Science' },
  { id: 10, topic: 90,  prompt: 'Compare vertebrate and invertebrate animals with examples', expected: ['animal-classification'], subject: 'Life Science' },
  { id: 11, topic: 91,  prompt: 'Human skeletal system showing skull spine ribs', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 12, topic: 92,  prompt: 'Human muscular system with major muscle groups', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 13, topic: 93,  prompt: 'Draw the human respiratory system with lungs and diaphragm', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 14, topic: 94,  prompt: 'Human circulatory system showing heart arteries veins', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 15, topic: 95,  prompt: 'The human digestive system from mouth to intestine', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 16, topic: 96,  prompt: 'Human nervous system with brain spinal cord nerves', expected: ['human-body-systems'], subject: 'Life Science' },
  { id: 17, topic: 97,  prompt: 'Compare a plant cell and an animal cell with labels', expected: ['basic-cells'], subject: 'Life Science' },
  { id: 18, topic: 98,  prompt: 'Desert habitat showing ecosystem with plants and animals', expected: ['habitats-ecosystems'], subject: 'Life Science' },

  // Earth & Space Science (Topics 99-110)
  { id: 19, topic: 99,  prompt: 'Draw the water cycle with evaporation condensation precipitation', expected: ['water-cycle'], subject: 'Earth & Space' },
  { id: 20, topic: 100, prompt: 'Rock cycle showing igneous sedimentary metamorphic transformations', expected: ['rock-cycle'], subject: 'Earth & Space' },
  { id: 21, topic: 101, prompt: 'Types of clouds: cumulus stratus cirrus nimbus at different heights', expected: ['weather-clouds'], subject: 'Earth & Space' },
  { id: 22, topic: 102, prompt: 'Types of precipitation: rain snow sleet hail', expected: ['weather-clouds'], subject: 'Earth & Space' },
  { id: 23, topic: 103, prompt: 'Solar system showing all 8 planets in order from the sun', expected: ['solar-system'], subject: 'Earth & Space' },
  { id: 24, topic: 104, prompt: 'The 8 phases of the moon from new moon to full moon', expected: ['moon-phases'], subject: 'Earth & Space' },
  { id: 25, topic: 105, prompt: 'Layers of the earth: crust mantle outer core inner core', expected: ['earth-layers'], subject: 'Earth & Space' },
  { id: 26, topic: 106, prompt: 'Earth tilt and seasons showing summer winter solstice', expected: ['seasons-earth-tilt'], subject: 'Earth & Space' },
  { id: 27, topic: 107, prompt: 'Types of landforms: mountain valley plateau peninsula island', expected: ['landforms'], subject: 'Earth & Space' },
  { id: 28, topic: 108, prompt: 'Show erosion and weathering processes on rocks and soil', expected: ['erosion-weathering'], subject: 'Earth & Space' },
  { id: 29, topic: 109, prompt: 'Planet orbits around the sun showing elliptical paths', expected: ['solar-system'], subject: 'Earth & Space' },
  { id: 30, topic: 110, prompt: 'The five senses: sight hearing smell taste touch', expected: ['five-senses'], subject: 'Earth & Space' },

  // Physical Science (Topics 111-123)
  { id: 31, topic: 111, prompt: 'States of matter solid liquid gas with particles and phase changes', expected: ['states-of-matter'], subject: 'Physical Science' },
  { id: 32, topic: 112, prompt: 'Simple machine lever with fulcrum effort and load', expected: ['simple-machines'], subject: 'Physical Science' },
  { id: 33, topic: 113, prompt: 'Six simple machines: lever pulley inclined plane wheel and axle screw wedge', expected: ['simple-machines'], subject: 'Physical Science' },
  { id: 34, topic: 114, prompt: 'Bar magnets showing north and south pole attraction and repulsion', expected: ['magnets'], subject: 'Physical Science' },
  { id: 35, topic: 115, prompt: 'Magnetic field lines around a bar magnet', expected: ['magnets'], subject: 'Physical Science' },
  { id: 36, topic: 116, prompt: 'Light reflection off a mirror with angle of incidence and reflection', expected: ['light-optics'], subject: 'Physical Science' },
  { id: 37, topic: 117, prompt: 'Light passing through a prism showing the color spectrum rainbow', expected: ['light-optics'], subject: 'Physical Science' },
  { id: 38, topic: 118, prompt: 'Sound waves showing pitch amplitude and frequency', expected: ['sound-waves'], subject: 'Physical Science' },
  { id: 39, topic: 119, prompt: 'Types of energy: kinetic potential thermal electrical chemical', expected: ['energy-types'], subject: 'Physical Science' },
  { id: 40, topic: 120, prompt: 'Push and pull forces on an object showing friction and gravity', expected: ['forces-motion-elementary'], subject: 'Physical Science' },
  { id: 41, topic: 121, prompt: 'Heat transfer: conduction convection radiation', expected: ['energy-types'], subject: 'Physical Science' },
  { id: 42, topic: 122, prompt: 'Simple electrical circuit with battery bulb and wire switch', expected: ['simple-circuits'], subject: 'Physical Science' },
  { id: 43, topic: 123, prompt: 'Gravity pulling objects down and weight of objects', expected: ['forces-motion-elementary'], subject: 'Physical Science' },

  // Social Studies / Geography (Topics 124-130)
  { id: 44, topic: 124, prompt: 'Timeline showing important historical events in order', expected: ['timelines'], subject: 'Social Studies' },
  { id: 45, topic: 125, prompt: 'Compass rose showing north south east west cardinal directions', expected: ['map-elements'], subject: 'Social Studies' },
  { id: 46, topic: 126, prompt: 'Map legend with symbols for roads buildings water parks', expected: ['map-elements'], subject: 'Social Studies' },
  { id: 47, topic: 127, prompt: 'Three branches of government: legislative executive judicial', expected: ['government-structure'], subject: 'Social Studies' },
  { id: 48, topic: 128, prompt: 'Community map showing school library park fire station', expected: ['community-map'], subject: 'Social Studies' },
  { id: 49, topic: 129, prompt: 'Family tree diagram showing grandparents parents and children', expected: ['family-tree'], subject: 'Social Studies' },
  { id: 50, topic: 130, prompt: 'Map with latitude and longitude grid lines', expected: ['map-elements'], subject: 'Social Studies' },

  // Language Arts / Graphic Organizers (Topics 131-140)
  { id: 51, topic: 131, prompt: 'Venn diagram comparing and contrasting two things', expected: ['venn-diagram'], subject: 'Language Arts' },
  { id: 52, topic: 132, prompt: 'Story plot diagram with exposition rising action climax falling action resolution', expected: ['plot-diagram'], subject: 'Language Arts' },
  { id: 53, topic: 133, prompt: 'Concept web mind map with central idea and connected subtopics', expected: ['concept-web'], subject: 'Language Arts' },
  { id: 54, topic: 134, prompt: 'Sequence chain showing first then next finally story events', expected: ['sequence-chain'], subject: 'Language Arts' },
  { id: 55, topic: 135, prompt: 'T-chart with two columns comparing pros and cons', expected: ['t-chart'], subject: 'Language Arts' },
  { id: 56, topic: 136, prompt: 'KWL chart with know want to know and learned columns', expected: ['kwl-chart'], subject: 'Language Arts' },
  { id: 57, topic: 137, prompt: 'Cause and effect diagram showing events and consequences', expected: ['cause-effect'], subject: 'Language Arts' },
  { id: 58, topic: 138, prompt: 'Main idea and supporting details graphic organizer', expected: ['concept-web'], subject: 'Language Arts' },
  { id: 59, topic: 139, prompt: 'Character map showing traits motivations actions', expected: ['concept-web'], subject: 'Language Arts' },
  { id: 60, topic: 140, prompt: 'Story mountain showing beginning middle climax end of story', expected: ['plot-diagram'], subject: 'Language Arts' },

  // Health / Nutrition (Topics 141-145)
  { id: 61, topic: 141, prompt: 'MyPlate diagram showing food groups fruits vegetables grains protein dairy', expected: ['nutrition-plate'], subject: 'Health' },
  { id: 62, topic: 142, prompt: 'Food pyramid showing different food groups and servings', expected: ['nutrition-plate'], subject: 'Health' },
  { id: 63, topic: 143, prompt: 'Types of teeth: incisor canine premolar molar dental diagram', expected: ['dental-health'], subject: 'Health' },
  { id: 64, topic: 144, prompt: 'Five senses diagram eye ear nose tongue hand with labels', expected: ['five-senses'], subject: 'Health' },
  { id: 65, topic: 145, prompt: 'Healthy foods vs unhealthy foods comparison chart', expected: ['nutrition-plate'], subject: 'Health' },

  // Art / Music (Topics 146-150)
  { id: 66, topic: 146, prompt: 'Color wheel showing primary secondary and tertiary colors', expected: ['color-wheel'], subject: 'Art / Music' },
  { id: 67, topic: 147, prompt: 'Musical staff with treble clef and notes on lines and spaces', expected: ['musical-staff'], subject: 'Art / Music' },
  { id: 68, topic: 148, prompt: 'Rhythm patterns with quarter notes eighth notes whole notes', expected: ['musical-staff'], subject: 'Art / Music' },
  { id: 69, topic: 149, prompt: 'Warm and cool colors on a color wheel', expected: ['color-wheel'], subject: 'Art / Music' },
  { id: 70, topic: 150, prompt: 'Musical instrument families strings woodwinds brass percussion', expected: ['musical-staff'], subject: 'Art / Music' },

  // STEM / Engineering (Topics 151-155)
  { id: 71, topic: 151, prompt: 'Scientific method flowchart: question hypothesis experiment analyze conclude', expected: ['scientific-method'], subject: 'STEM' },
  { id: 72, topic: 152, prompt: 'Engineering design process: ask imagine plan create improve', expected: ['engineering-design'], subject: 'STEM' },
  { id: 73, topic: 153, prompt: 'Science experiment setup diagram with variables and controls', expected: ['scientific-method'], subject: 'STEM' },
  { id: 74, topic: 154, prompt: 'Data table template for recording experiment results', expected: ['data-table'], subject: 'STEM' },
  { id: 75, topic: 155, prompt: 'Dichotomous key for classifying animals or plants', expected: ['classification-key'], subject: 'STEM' },
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
  console.log('  TIKZ NON-MATH TOPIC DETECTOR AUDIT -- 75 PROMPTS (Topics 81-155)')
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
