/**
 * Comprehensive audit of 85 prompts against the TikZ topic detector.
 * 
 * For each prompt, verifies:
 *   1. Which template it matches
 *   2. The confidence score
 *   3. Whether the match is correct (based on expected template)
 *   4. The total prompt size that would be generated
 * 
 * Run with: npx tsx lib/tikz/__tests__/audit-all-85.ts
 */

import { detectTopic } from '../topic-detector'
import { isAdvancedTopic } from '../advanced-fallback'
import { buildTikzPrompt } from '../index'

// --- Test Case Type ---

interface TestCase {
  id: number
  prompt: string
  expected: string[]        // acceptable template IDs (first is primary)
  isAdvanced?: boolean      // if true, expect isAdvancedTopic() === true
  grade: string             // for display grouping
}

// --- All 85 Test Cases ---

const TEST_CASES: TestCase[] = [
  // Grade 1
  { id: 1,  prompt: 'Show 7 on a ten frame', expected: ['ten-frames'], grade: 'Grade 1' },
  { id: 2,  prompt: 'Ten frame showing 13 using two frames', expected: ['ten-frames'], grade: 'Grade 1' },
  { id: 3,  prompt: 'Number bond for 8 = 5 + 3', expected: ['number-bonds'], grade: 'Grade 1' },
  { id: 4,  prompt: 'Show 3 + 4 = 7 on a number line', expected: ['number-lines'], grade: 'Grade 1' },
  { id: 5,  prompt: 'Show 9 - 3 = 6 on a number line', expected: ['number-lines'], grade: 'Grade 1' },
  { id: 6,  prompt: 'Compare 7 and 4 using greater than less than', expected: ['comparing-ordering-numbers'], grade: 'Grade 1' },
  { id: 7,  prompt: 'Place value chart for 45 showing tens and ones', expected: ['place-value'], grade: 'Grade 1' },
  { id: 8,  prompt: 'Number line from 0 to 20 with 12 marked', expected: ['number-lines'], grade: 'Grade 1' },
  { id: 9,  prompt: 'Draw a circle, square, triangle, and rectangle with labels', expected: ['shapes-basic'], grade: 'Grade 1' },
  { id: 10, prompt: 'Tally marks showing 13', expected: ['tally-marks'], grade: 'Grade 1' },
  { id: 11, prompt: 'Bar graph: Red=5, Blue=7, Green=3', expected: ['bar-graphs'], grade: 'Grade 1' },
  { id: 12, prompt: 'Show 2 quarters, 1 dime, 3 pennies', expected: ['coin-money'], grade: 'Grade 1' },
  { id: 13, prompt: 'Measuring a pencil that is 6 paper clips long', expected: ['measurement-ruler'], grade: 'Grade 1' },
  { id: 14, prompt: 'Clock showing 3:00', expected: ['clock-faces'], grade: 'Grade 1' },

  // Grade 2
  { id: 15, prompt: 'Show 47 + 28 on a number line', expected: ['number-lines'], grade: 'Grade 2' },
  { id: 16, prompt: 'Show 63 - 25 on a number line', expected: ['number-lines'], grade: 'Grade 2' },
  { id: 17, prompt: 'Skip counting by 5s from 0 to 50 on a number line', expected: ['skip-counting'], grade: 'Grade 2' },
  { id: 18, prompt: 'Place value chart for 352 showing hundreds tens ones', expected: ['place-value'], grade: 'Grade 2' },
  { id: 19, prompt: 'Number line from 0 to 100 with 67 marked', expected: ['number-lines'], grade: 'Grade 2' },
  { id: 20, prompt: 'Even and odd numbers from 1 to 10 sorted', expected: ['even-odd-numbers'], grade: 'Grade 2' },
  { id: 21, prompt: '3 rows by 4 columns dot array for multiplication', expected: ['arrays-grids'], grade: 'Grade 2' },
  { id: 22, prompt: 'Show 1/2, 1/3, 1/4 on fraction circles', expected: ['fraction-circles'], grade: 'Grade 2' },
  { id: 23, prompt: 'Measuring a line that is 8 centimeters long', expected: ['measurement-ruler'], grade: 'Grade 2' },
  { id: 24, prompt: 'Picture graph showing: Dogs=4, Cats=6, Fish=2', expected: ['bar-graphs'], grade: 'Grade 2' },
  { id: 25, prompt: 'Clock showing 2:30', expected: ['clock-faces'], grade: 'Grade 2' },
  { id: 26, prompt: 'Show $1.35 using dollar bills and coins', expected: ['coin-money'], grade: 'Grade 2' },

  // Grade 3
  { id: 27, prompt: 'Multiplication table for 6 from 1 to 10', expected: ['multiplication-table'], grade: 'Grade 3' },
  { id: 28, prompt: 'Division 12 divided by 3 as equal groups', expected: ['arrays-grids'], grade: 'Grade 3' },
  { id: 29, prompt: 'Area model for 14 times 3', expected: ['area-models'], grade: 'Grade 3' },
  { id: 30, prompt: 'Number line showing fractions 0 to 1 with 1/4, 2/4, 3/4', expected: ['fraction-circles', 'number-lines', 'fraction-bars'], grade: 'Grade 3' },
  { id: 31, prompt: 'Fraction circle showing 2/3 shaded', expected: ['fraction-circles'], grade: 'Grade 3' },
  { id: 32, prompt: 'Equivalent fractions: show 2/4 equals 1/2 with fraction bars', expected: ['fraction-bars'], grade: 'Grade 3' },
  { id: 33, prompt: 'Rectangle with sides 5cm and 3cm showing perimeter', expected: ['shapes-basic'], grade: 'Grade 3' },
  { id: 34, prompt: 'Area of a shape by counting unit squares on a grid', expected: ['arrays-grids'], grade: 'Grade 3' },
  { id: 35, prompt: 'Scaled bar graph: Math=15, Science=25, Reading=20 with scale of 5', expected: ['bar-graphs'], grade: 'Grade 3' },
  { id: 36, prompt: 'Line plot of data: 2, 2, 3, 4, 4, 4, 5, 7', expected: ['line-plots'], grade: 'Grade 3' },
  { id: 37, prompt: 'Properties of a pentagon showing sides and angles', expected: ['shapes-basic'], grade: 'Grade 3' },
  { id: 38, prompt: 'Show a right angle of 90 degrees', expected: ['angles-lines'], grade: 'Grade 3' },
  { id: 39, prompt: 'Rounding 67 on a number line from 60 to 70', expected: ['number-lines'], grade: 'Grade 3' },

  // Grade 4
  { id: 40, prompt: 'Area model for 23 times 15 using expanded form', expected: ['area-models'], grade: 'Grade 4' },
  { id: 41, prompt: 'Long division: 156 divided by 12 step by step', expected: ['long-division'], grade: 'Grade 4' },
  { id: 42, prompt: 'Compare 3/8 and 5/8 on a fraction number line', expected: ['fraction-circles', 'number-lines', 'fraction-bars'], grade: 'Grade 4' },
  { id: 43, prompt: 'Add 2/5 + 1/5 with fraction bars', expected: ['fraction-bars'], grade: 'Grade 4' },
  { id: 44, prompt: 'Mixed number 2 and 3/4 on a number line', expected: ['number-lines'], grade: 'Grade 4' },
  { id: 45, prompt: 'Decimal place value chart for 3.47 showing tenths and hundredths', expected: ['place-value'], grade: 'Grade 4' },
  { id: 46, prompt: 'Decimal number line from 0 to 1 with 0.6 marked', expected: ['number-lines'], grade: 'Grade 4' },
  { id: 47, prompt: 'Measure a 60 degree angle with a protractor', expected: ['angles-lines'], grade: 'Grade 4' },
  { id: 48, prompt: 'Draw a line, ray, and line segment labeled', expected: ['angles-lines'], grade: 'Grade 4' },
  { id: 49, prompt: 'Parallel and perpendicular lines with labels', expected: ['angles-lines'], grade: 'Grade 4' },
  { id: 50, prompt: 'Line of symmetry on a square', expected: ['symmetry'], grade: 'Grade 4' },
  { id: 51, prompt: 'Line plot with fractions: 1/4, 1/4, 1/2, 1/2, 1/2, 3/4', expected: ['line-plots'], grade: 'Grade 4' },
  { id: 52, prompt: 'Double bar graph comparing boys and girls: Math=12,10 Science=8,14', expected: ['bar-graphs'], grade: 'Grade 4' },
  { id: 53, prompt: 'Factor tree for 36', expected: ['factor-trees'], grade: 'Grade 4' },

  // Grade 5
  { id: 54, prompt: 'Add fractions 1/3 + 1/4 with unlike denominators using fraction bars', expected: ['fraction-bars'], grade: 'Grade 5' },
  { id: 55, prompt: 'Multiply fractions 2/3 times 3/4 with area model', expected: ['area-models', 'fraction-bars'], grade: 'Grade 5' },
  { id: 56, prompt: 'Divide 3/4 by 1/2 visual model', expected: ['fraction-bars', 'fraction-circles'], grade: 'Grade 5' },
  { id: 57, prompt: 'Show 0.3 + 0.45 on a decimal number line', expected: ['number-lines'], grade: 'Grade 5' },
  { id: 58, prompt: 'Plot points A(2,3) B(5,1) C(4,6) on coordinate plane first quadrant', expected: ['coordinate-plane'], grade: 'Grade 5' },
  { id: 59, prompt: 'Volume of a rectangular prism 4 by 3 by 2 using unit cubes', expected: ['volume-nets'], grade: 'Grade 5' },
  { id: 60, prompt: 'Order of operations tree for 3 + 4 times 2', expected: ['factor-trees', 'number-lines'], grade: 'Grade 5' },
  { id: 61, prompt: 'Classify an equilateral triangle with all sides 5 cm', expected: ['shapes-classified'], grade: 'Grade 5' },
  { id: 62, prompt: 'Classify quadrilaterals: square, rectangle, rhombus, trapezoid', expected: ['shapes-classified'], grade: 'Grade 5' },
  { id: 63, prompt: 'Line graph showing temperature over 7 days: 68,72,65,70,75,73,69', expected: ['line-plots'], grade: 'Grade 5' },
  { id: 64, prompt: 'Show 2 to the power of 4 as visual squares', expected: ['factor-trees', 'arrays-grids'], grade: 'Grade 5' },
  { id: 65, prompt: 'Pattern sequence: 2, 5, 8, 11, 14 with rule', expected: ['pattern-sequences-elementary'], grade: 'Grade 5' },
  { id: 66, prompt: 'Measurement conversion bar model: 3 feet to inches', expected: ['bar-models'], grade: 'Grade 5' },

  // Grade 6
  { id: 67, prompt: 'Tape diagram showing ratio 3:2 for boys to girls', expected: ['tape-diagrams'], grade: 'Grade 6' },
  { id: 68, prompt: 'Double number line: 3 miles per 10 minutes', expected: ['double-number-lines'], grade: 'Grade 6' },
  { id: 69, prompt: 'Percentage grid showing 45 percent', expected: ['percentage-grids'], grade: 'Grade 6' },
  { id: 70, prompt: 'Number line from -5 to 5 showing integers', expected: ['number-lines'], grade: 'Grade 6' },
  { id: 71, prompt: 'Coordinate plane all four quadrants with points (3,2) (-2,4) (-1,-3) (4,-2)', expected: ['coordinate-plane'], grade: 'Grade 6' },
  { id: 72, prompt: 'Area of a triangle with base 8 and height 5', expected: ['shapes-basic', 'shapes-classified'], grade: 'Grade 6' },
  { id: 73, prompt: 'Area of a trapezoid with parallel sides 6 and 10 and height 4', expected: ['shapes-basic', 'shapes-classified'], grade: 'Grade 6' },
  { id: 74, prompt: 'Net of a rectangular prism 4x3x2', expected: ['volume-nets'], grade: 'Grade 6' },
  { id: 75, prompt: 'Dot plot of test scores: 85,87,87,90,90,90,92,95,95,98', expected: ['dot-plots-histograms'], grade: 'Grade 6' },
  { id: 76, prompt: 'Mean median mode on a number line for data: 3,5,5,7,8,10', expected: ['number-lines', 'dot-plots-histograms'], grade: 'Grade 6' },
  { id: 77, prompt: 'Box plot with min=3, Q1=6, median=10, Q3=14, max=18', expected: ['box-plots'], grade: 'Grade 6' },
  { id: 78, prompt: 'Absolute value of -4 and 4 shown on number line', expected: ['number-lines'], grade: 'Grade 6' },
  { id: 79, prompt: 'Equation balance: x + 3 = 7', expected: ['equation-balance'], grade: 'Grade 6' },
  { id: 80, prompt: 'Inequality x > 3 on a number line', expected: ['number-lines'], grade: 'Grade 6' },

  // Regression: Advanced topics (81-85)
  { id: 81, prompt: 'Free body diagram of a 10kg box on a 30 degree inclined plane', expected: ['ADVANCED'], isAdvanced: true, grade: 'Advanced' },
  { id: 82, prompt: 'Graph of y = x^2 from -3 to 3', expected: ['ADVANCED'], isAdvanced: true, grade: 'Advanced' },
  { id: 83, prompt: 'Sine and cosine waves plotted on the same axes from 0 to 2pi', expected: ['ADVANCED'], isAdvanced: true, grade: 'Advanced' },
  { id: 84, prompt: 'Electric circuit with resistor, capacitor, and inductor in series', expected: ['ADVANCED'], isAdvanced: true, grade: 'Advanced' },
  { id: 85, prompt: 'DNA double helix structure with base pairs labeled', expected: ['ADVANCED'], isAdvanced: true, grade: 'Advanced' },
]

// --- Result Type ---

interface TestResult {
  id: number
  prompt: string
  grade: string
  detectedTemplate: string
  confidence: number
  promptSize: number
  expectedTemplates: string[]
  isAdvancedExpected: boolean
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

    if (tc.isAdvanced) {
      // For advanced prompts: check that isAdvancedTopic returns true
      if (advanced) {
        passed = true
      } else {
        passed = false
        reason = 'Expected isAdvancedTopic=true, got false'
      }
    } else {
      // For elementary prompts: check template match
      if (tc.expected.includes(match.template.id)) {
        passed = true
      } else {
        passed = false
        reason = 'Expected one of [' + tc.expected.join(', ') + '], got "' + match.template.id + '"'
      }
    }

    results.push({
      id: tc.id,
      prompt: tc.prompt,
      grade: tc.grade,
      detectedTemplate: match.template.id,
      confidence: match.confidence,
      promptSize,
      expectedTemplates: tc.expected,
      isAdvancedExpected: tc.isAdvanced ?? false,
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
  console.log('='.repeat(130))
  console.log('  TIKZ TOPIC DETECTOR AUDIT -- 85 PROMPTS')
  console.log('='.repeat(130))
  console.log()

  const results = runAudit()

  // Column headers
  const header = [
    '#'.padStart(3),
    'Grade'.padEnd(9),
    'Prompt'.padEnd(53),
    'Detected'.padEnd(22),
    'Conf'.padStart(5),
    'Size'.padStart(7),
    'Result'.padEnd(6),
  ].join(' | ')

  console.log(header)
  console.log('-'.repeat(130))

  let currentGrade = ''
  for (const r of results) {
    if (r.grade !== currentGrade) {
      if (currentGrade) console.log()  // blank line between grade groups
      currentGrade = r.grade
    }

    const status = r.passed ? 'PASS' : 'FAIL'
    const statusColor = r.passed ? '\x1b[32m' : '\x1b[31m'
    const reset = '\x1b[0m'

    const row = [
      String(r.id).padStart(3),
      r.grade.padEnd(9),
      truncate(r.prompt, 53),
      r.detectedTemplate.padEnd(22),
      r.confidence.toFixed(2).padStart(5),
      String(r.promptSize).padStart(7),
      statusColor + status + reset,
    ].join(' | ')

    console.log(row)
  }

  // --- Summary ---

  console.log()
  console.log('='.repeat(130))
  console.log('  SUMMARY')
  console.log('='.repeat(130))

  const passed = results.filter((r) => r.passed)
  const failed = results.filter((r) => !r.passed)
  const promptSizes = results.map((r) => r.promptSize)
  const avgSize = promptSizes.reduce((a, b) => a + b, 0) / promptSizes.length
  const minSize = Math.min(...promptSizes)
  const maxSize = Math.max(...promptSizes)
  const confidences = results.filter(r => !r.isAdvancedExpected).map((r) => r.confidence)
  const avgConf = confidences.length > 0 ? confidences.reduce((a, b) => a + b, 0) / confidences.length : 0

  console.log()
  console.log('  Total tests:          ' + results.length)
  console.log('  \x1b[32mPassed:               ' + passed.length + '\x1b[0m')
  console.log('  \x1b[31mFailed:               ' + failed.length + '\x1b[0m')
  console.log('  Pass rate:            ' + ((passed.length / results.length) * 100).toFixed(1) + '%')
  console.log()
  console.log('  Avg confidence (elem): ' + avgConf.toFixed(3))
  console.log('  Avg prompt size:       ' + Math.round(avgSize).toLocaleString() + ' chars')
  console.log('  Min prompt size:       ' + minSize.toLocaleString() + ' chars')
  console.log('  Max prompt size:       ' + maxSize.toLocaleString() + ' chars')

  // --- Grade-level breakdown ---

  console.log()
  console.log('  Grade-level breakdown:')
  const grades = [...new Set(results.map((r) => r.grade))]
  for (const g of grades) {
    const gradeResults = results.filter((r) => r.grade === g)
    const gradePassed = gradeResults.filter((r) => r.passed).length
    const gradeTotal = gradeResults.length
    const pct = ((gradePassed / gradeTotal) * 100).toFixed(0)
    const indicator = gradePassed === gradeTotal ? '\x1b[32m' : '\x1b[33m'
    console.log('    ' + indicator + g.padEnd(12) + gradePassed + '/' + gradeTotal + ' (' + pct + '%)' + '\x1b[0m')
  }

  // --- Failed test details ---

  if (failed.length > 0) {
    console.log()
    console.log('  FAILED TEST DETAILS:')
    console.log('  ' + '-'.repeat(100))
    for (const f of failed) {
      console.log('  #' + f.id + ': "' + f.prompt + '"')
      console.log('    ' + f.reason)
      console.log('    Detected: ' + f.detectedTemplate + ' (confidence: ' + f.confidence.toFixed(2) + ')')
      if (f.isAdvancedExpected) {
        console.log('    isAdvancedTopic: ' + f.isAdvancedActual)
      }
      console.log()
    }
  }

  // --- Confidence distribution ---

  console.log()
  console.log('  CONFIDENCE DISTRIBUTION (elementary prompts only):')
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
  console.log('='.repeat(130))

  // Exit with error code if there are failures
  if (failed.length > 0) {
    process.exit(1)
  }
}

main()
