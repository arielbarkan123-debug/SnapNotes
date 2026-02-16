/**
 * Quick verification script for the TikZ template system.
 * Run with: npx tsx lib/tikz/__tests__/verify-tikz-system.ts
 */

import { buildTikzPrompt, detectTopic, ALL_TEMPLATES } from '../index'
import { isAdvancedTopic } from '../advanced-fallback'

let passed = 0
let failed = 0

function assert(condition: boolean, message: string) {
  if (condition) {
    passed++
    console.log(`  PASS: ${message}`)
  } else {
    failed++
    console.error(`  FAIL: ${message}`)
  }
}

// --- Test 1: All 122 templates loaded ---
console.log('\n1. Template count')
assert(ALL_TEMPLATES.length === 122, `Expected 122 templates, got ${ALL_TEMPLATES.length}`)

// --- Test 2: Each template has required fields ---
console.log('\n2. Template structure')
for (const t of ALL_TEMPLATES) {
  assert(t.id.length > 0, `Template "${t.name}" has id`)
  assert(t.keywords.length > 0, `Template "${t.name}" has keywords`)
  assert(t.referenceCode.includes('tikzpicture'), `Template "${t.name}" has TikZ code`)
}

// --- Test 3: Topic detection for elementary prompts ---
console.log('\n3. Topic detection — elementary')
const elementaryTests: Array<[string, string]> = [
  ['show 3/4 on a fraction circle', 'fraction-circles'],
  ['show 7 on a ten frame', 'ten-frames'],
  ['number bond for 8', 'number-bonds'],
  ['addition on a number line', 'number-lines'],
  ['3 x 5 array', 'arrays-grids'],
  ['bar graph of favorite colors', 'bar-graphs'],
  ['tally marks for 13', 'tally-marks'],
  ['draw a clock face showing 3 o clock', 'clock-faces'],
  ['counting coins penny nickel', 'coin-money'],
  ['place value chart for 352', 'place-value'],
  ['area model 13 times 4', 'area-models'],
  ['factor tree for 60', 'factor-trees'],
  ['long division 156 divided by 12', 'long-division'],
  ['line of symmetry', 'symmetry'],
  ['draw a rectangle with sides', 'shapes-basic'],
  ['classify this triangle isosceles', 'shapes-classified'],
  ['measure a 60 degree angle', 'angles-lines'],
  ['line plot with x marks', 'line-plots'],
  ['plot points on coordinate plane', 'coordinate-plane'],
  ['fraction bar 2/3', 'fraction-bars'],
  ['volume of rectangular prism unit cubes', 'volume-nets'],
  ['bar model showing 3 parts of 12', 'bar-models'],
  ['measuring a pencil with a ruler in centimeters', 'measurement-ruler'],
  ['tape diagram ratio 3:2', 'tape-diagrams'],
  ['double number line proportion', 'double-number-lines'],
  ['percentage grid 35%', 'percentage-grids'],
  ['box plot quartile', 'box-plots'],
  ['histogram frequency', 'dot-plots-histograms'],
  ['equation balance scale', 'equation-balance'],
  // Non-math elementary templates
  ['butterfly life cycle metamorphosis', 'life-cycles'],
  ['food chain predator prey', 'food-chains-webs'],
  ['parts of a flower', 'plant-anatomy'],
  ['vertebrate invertebrate classification', 'animal-classification'],
  ['human digestive system', 'human-body-systems'],
  ['plant cell animal cell', 'basic-cells'],
  ['desert habitat ecosystem', 'habitats-ecosystems'],
  ['water cycle evaporation', 'water-cycle'],
  ['rock cycle igneous sedimentary metamorphic', 'rock-cycle'],
  ['types of clouds cumulus stratus', 'weather-clouds'],
  ['solar system planets order', 'solar-system'],
  ['phases of the moon', 'moon-phases'],
  ['layers of the earth crust mantle core', 'earth-layers'],
  ['seasons earth tilt axis', 'seasons-earth-tilt'],
  ['types of landforms mountain valley', 'landforms'],
  ['erosion and weathering', 'erosion-weathering'],
  ['five senses sight hearing smell', 'five-senses'],
  ['states of matter solid liquid gas', 'states-of-matter'],
  ['simple machines lever pulley', 'simple-machines'],
  ['magnets north pole south pole', 'magnets'],
  ['light through a prism color spectrum', 'light-optics'],
  ['sound waves pitch amplitude', 'sound-waves'],
  ['types of energy kinetic potential', 'energy-types'],
  ['push and pull forces', 'forces-motion-elementary'],
  ['simple circuit battery bulb wire', 'simple-circuits'],
  ['historical timeline events', 'timelines'],
  ['compass rose cardinal directions', 'map-elements'],
  ['three branches of government', 'government-structure'],
  ['community map neighborhood', 'community-map'],
  ['family tree grandparents', 'family-tree'],
  ['venn diagram compare contrast', 'venn-diagram'],
  ['plot diagram story mountain', 'plot-diagram'],
  ['concept web mind map', 'concept-web'],
  ['sequence chain first then next', 'sequence-chain'],
  ['t-chart two column', 't-chart'],
  ['kwl chart know want learn', 'kwl-chart'],
  ['cause and effect diagram', 'cause-effect'],
  ['myplate food groups nutrition', 'nutrition-plate'],
  ['tooth types dental health', 'dental-health'],
  ['color wheel primary secondary', 'color-wheel'],
  ['musical staff notes treble', 'musical-staff'],
  ['scientific method hypothesis experiment', 'scientific-method'],
  ['engineering design process', 'engineering-design'],
  ['data table experiment results', 'data-table'],
  ['dichotomous key classification', 'classification-key'],
  // New math templates (14)
  ['how much time passed between 2:00 and 4:30', 'elapsed-time'],
  ['spinner probability red blue green', 'probability-elementary'],
  ['what comes next in this shape pattern', 'pattern-sequences-elementary'],
  ['convert inches to feet measurement', 'measurement-conversion'],
  ['fill in the input output table for the rule', 'input-output-table'],
  ['rounding 37 to the nearest ten estimate by rounding', 'rounding-number-line'],
  ['put these numbers in order least to greatest', 'comparing-ordering-numbers'],
  ['skip count by fives on a hundreds chart', 'skip-counting'],
  ['name the 3d shapes cube sphere cylinder cone', '3d-shapes'],
  ['find the perimeter and area of this rectangle', 'perimeter-area-elementary'],
  ['money math penny nickel dime quarter coin values', 'coin-money'],
  ['is 15 even or odd sort the numbers', 'even-odd-numbers'],
  ['multiplication chart multiplication facts for 1 through 12', 'multiplication-table'],
  ['show 452 in expanded form decompose number', 'expanded-form'],
  // New life science templates (4)
  ['how do animals adapt to survive in the arctic camouflage', 'animal-adaptations'],
  ['bears hibernate and birds migrate in winter', 'hibernation-migration'],
  ['how does pollination work with bees and pollen', 'pollination-photosynthesis'],
  ['are these inherited traits from parents or learned behaviors', 'inherited-learned-traits'],
  // New earth science templates (8)
  ['layers of soil topsoil subsoil bedrock', 'soil-layers'],
  ['how do fossils form over millions of years', 'fossil-formation'],
  ['compare renewable and nonrenewable energy sources', 'renewable-nonrenewable'],
  ['reduce reuse recycle conservation poster', 'recycling-conservation'],
  ['how do volcanoes erupt natural disaster', 'natural-disasters'],
  ['why do we have day and night earth rotation', 'day-night-rotation'],
  ['describe the physical properties of matter mass volume density', 'properties-of-matter'],
  ['what happens when you dissolve salt in water mixture solution', 'mixtures-solutions'],
  ['rub a balloon on your hair static electricity charge', 'static-electricity'],
  ['how do shadows form from a light source', 'shadow-light'],
  ['what do plants need sunlight water and soil for plant growth', 'plant-needs'],
  ['decomposers break down dead matter fungi bacteria', 'decomposition-cycle'],
  // New social studies templates (5)
  ['label the seven continents and five oceans on a world map', 'world-continents'],
  ['goods and services needs and wants economics', 'economics-elementary'],
  ['use grid coordinates to find locations on a map', 'map-grid-coordinates'],
  ['types of natural resources land water air', 'natural-resources'],
  ['who are the community helpers firefighter police teacher', 'community-helpers'],
  // New language arts templates (11)
  ['label the parts of speech noun verb adjective in this sentence', 'parts-of-speech'],
  ['diagram this sentence showing subject and predicate', 'sentence-diagram'],
  ['identify the story elements character setting plot problem solution', 'story-elements'],
  ['what are nonfiction text features like heading caption glossary', 'text-features'],
  ['show the writing process steps prewrite draft revise edit publish', 'writing-process'],
  ['fact or opinion is dogs are the best pets a fact or opinion', 'fact-opinion'],
  ['parts of a friendly letter greeting body closing', 'letter-format'],
  ['what text structure does this paragraph use signal words chronological order', 'text-structure'],
  ['break the word apart into prefix root word suffix', 'word-parts'],
  ['why did the author write this persuade inform entertain purpose', 'authors-purpose'],
  ['what genre is this book fiction nonfiction fantasy mystery', 'genre-chart'],
  // New health/wellness templates (3)
  ['physical activity pyramid exercise levels fitness', 'activity-pyramid'],
  ['feelings and emotions chart happy sad angry scared', 'feelings-emotions'],
  ['hand washing steps soap and water hygiene germs', 'hand-washing-steps'],
]

for (const [prompt, expectedId] of elementaryTests) {
  const match = detectTopic(prompt)
  assert(match.template.id === expectedId, `"${prompt}" → ${match.template.id} (expected ${expectedId})`)
}

// --- Test 4: Advanced topic detection ---
console.log('\n4. Advanced topic detection')
const advancedTests = [
  'free body diagram of a box on an inclined plane',
  'draw a circuit with resistors',
  'projectile motion at 30 degrees',
  'simple pendulum oscillation',
  'standing wave harmonics',
  'graph of y = sin(x)',
  'derivative tangent line',
  'cell organelle diagram',
  'lewis structure of water molecule',
]

for (const prompt of advancedTests) {
  assert(isAdvancedTopic(prompt), `Advanced: "${prompt.slice(0, 40)}..."`)
}

// --- Test 5: buildTikzPrompt produces valid output ---
console.log('\n5. Prompt assembly')

// Elementary prompt
const elemPrompt = buildTikzPrompt('show 3/4 on a fraction circle')
assert(elemPrompt.includes('LATEX COMPATIBILITY'), 'Elementary prompt has core rules')
assert(elemPrompt.includes('FRACTION CIRCLES'), 'Elementary prompt has category guidance')
assert(elemPrompt.includes('tikzpicture'), 'Elementary prompt has reference code')
assert(!elemPrompt.includes('FREE BODY'), 'Elementary prompt does NOT have physics')

// Physics prompt
const physicsPrompt = buildTikzPrompt('free body diagram of a box on an inclined plane')
assert(physicsPrompt.includes('LATEX COMPATIBILITY'), 'Physics prompt has core rules')
assert(physicsPrompt.includes('FREE BODY'), 'Physics prompt has FBD guidance')
assert(physicsPrompt.includes('INCLINED PLANE'), 'Physics prompt has FBD reference code')

// Waves prompt
const wavesPrompt = buildTikzPrompt('draw standing wave harmonics in a tube')
assert(wavesPrompt.includes('WAVES'), 'Waves prompt has waves guidance')

// Unknown prompt
const unknownPrompt = buildTikzPrompt('something completely random')
assert(unknownPrompt.includes('LATEX COMPATIBILITY'), 'Unknown prompt has core rules')
assert(unknownPrompt.length > 2000, 'Unknown prompt has substantial guidance')

// --- Test 6: Prompt sizes are reasonable ---
console.log('\n6. Prompt size checks')
const sizes = ALL_TEMPLATES.map(t => {
  const prompt = buildTikzPrompt(t.keywords[0])
  return { name: t.name, size: prompt.length }
})
for (const s of sizes) {
  assert(s.size > 2000 && s.size < 15000, `"${s.name}" prompt: ${s.size} chars`)
}

// --- Summary ---
console.log(`\n${'='.repeat(50)}`)
console.log(`Results: ${passed} passed, ${failed} failed, ${passed + failed} total`)
if (failed > 0) {
  process.exit(1)
}
