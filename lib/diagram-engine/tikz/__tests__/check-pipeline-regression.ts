/**
 * Pipeline routing & advanced fallback regression test.
 *
 * Verifies three invariants:
 *   1. Elementary science prompts match a TikZ template with confidence >= 0.6
 *      (so the pipeline sends them to TikZ, NOT Recraft).
 *   2. Advanced physics/chem/bio prompts are detected by isAdvancedTopic().
 *   3. New elementary template keywords do NOT accidentally trigger isAdvancedTopic().
 *
 * Run with: npx tsx lib/tikz/__tests__/check-pipeline-regression.ts
 */

import { detectTopic } from '../index'
import { isAdvancedTopic } from '../advanced-fallback'

// ─── Helpers ────────────────────────────────────────────────────────────────

let totalTests = 0
let passed = 0
let failed = 0
const failures: string[] = []

function assert(condition: boolean, label: string, detail: string) {
  totalTests++
  if (condition) {
    passed++
    console.log(`  PASS  ${label}`)
  } else {
    failed++
    failures.push(`${label}: ${detail}`)
    console.log(`  FAIL  ${label}  —  ${detail}`)
  }
}

// ─── Suite 1: Elementary science MUST route to TikZ (confidence >= 0.6) ─────

console.log('\n' + '='.repeat(70))
console.log('SUITE 1: Elementary science must match TikZ template (confidence >= 0.6)')
console.log('='.repeat(70) + '\n')

const elementarySciencePrompts = [
  'water cycle evaporation condensation precipitation',
  'food chain showing predator and prey',
  'solar system planets in order',
  'parts of a plant flower stem roots',
  'human digestive system organs',
  'animal cell plant cell comparison',
  'life cycle of a butterfly metamorphosis',
  'rock cycle igneous sedimentary metamorphic',
  'simple circuit battery bulb wire',
  'states of matter solid liquid gas',
  'volcano eruption cross section',
  'fossils formation layers',
  'renewable nonrenewable energy sources',
  'photosynthesis sunlight water carbon dioxide',
  'soil layers topsoil subsoil bedrock',
  'static electricity charges attract repel',
  'shadow and light opaque object',
  'what plants need to grow',
  'decomposition decomposers nutrient cycle',
  'hibernation migration winter animals',
]

for (const prompt of elementarySciencePrompts) {
  const match = detectTopic(prompt)
  const conf = match.confidence
  const templateId = match.template.id
  assert(
    conf >= 0.6,
    `"${prompt}"`,
    `confidence=${conf.toFixed(2)} (matched: ${templateId}) — need >= 0.6`
  )
}

// ─── Suite 2: Advanced topics MUST be detected by isAdvancedTopic() ─────────

console.log('\n' + '='.repeat(70))
console.log('SUITE 2: Advanced physics/chem/bio must trigger isAdvancedTopic()')
console.log('='.repeat(70) + '\n')

const advancedPrompts = [
  'free body diagram of a box on an inclined plane',
  'draw a circuit with resistors in parallel',
  'projectile motion at 30 degrees',
  'standing wave harmonics in a tube',
  'graph of y = sin(x) from 0 to 2pi',
  'derivative tangent line at x=2',
  'cell organelle diagram mitochondria',
  'lewis structure of water molecule',
  'simple pendulum oscillation period',
  'electric field lines between two charges',
]

for (const prompt of advancedPrompts) {
  const adv = isAdvancedTopic(prompt)
  assert(adv, `"${prompt}"`, `isAdvancedTopic returned false — expected true`)
}

// ─── Suite 3: New elementary keywords must NOT trigger isAdvancedTopic() ─────

console.log('\n' + '='.repeat(70))
console.log('SUITE 3: Elementary keywords must NOT trigger isAdvancedTopic()')
console.log('='.repeat(70) + '\n')

const elementaryOnlyPrompts = [
  'probability spinner red blue green yellow',
  'skip counting by fives',
  '3d shapes cube cylinder cone',
  'perimeter and area of rectangle',
  'multiplication table times table',
  'parts of speech noun verb adjective',
  'story elements character setting plot',
  'feelings emotions happy sad angry',
  'goods and services economics',
  'continents and oceans world map',
]

for (const prompt of elementaryOnlyPrompts) {
  const adv = isAdvancedTopic(prompt)
  assert(!adv, `"${prompt}"`, `isAdvancedTopic returned true — expected false`)
}

// ─── Summary ────────────────────────────────────────────────────────────────

console.log('\n' + '='.repeat(70))
console.log(`RESULTS: ${passed}/${totalTests} passed, ${failed} failed`)
console.log('='.repeat(70))

if (failures.length > 0) {
  console.log('\nFAILURES:')
  for (const f of failures) {
    console.log(`  - ${f}`)
  }
  process.exit(1)
} else {
  console.log('\nAll regression checks passed.')
  process.exit(0)
}
