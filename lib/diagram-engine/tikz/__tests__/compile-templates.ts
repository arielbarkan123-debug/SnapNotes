/**
 * Compile every TikZ reference template on QuickLaTeX.
 * Run with: npx tsx lib/tikz/__tests__/compile-templates.ts
 */

import { ALL_TEMPLATES } from '../templates'

async function compileTikZ(
  tikzCode: string
): Promise<{ success: boolean; url?: string; error?: string }> {
  // Extract usetikzlibrary commands from the code
  const libraryMatches = tikzCode.match(/\\usetikzlibrary\{[^}]+\}/g)
  const libraries = libraryMatches ? libraryMatches.join('\n') : ''

  // Remove library commands from the formula (they go in preamble)
  const formula = tikzCode
    .replace(/\\usetikzlibrary\{[^}]+\}\s*/g, '')
    .trim()

  const preamble = `\\usepackage{tikz}\n\\usepackage{amsmath}\n\\usepackage{xcolor}\n${libraries}`

  const parts = [
    `formula=${encodeURIComponent(formula)}`,
    `fsize=28px`,
    `fcolor=000000`,
    `mode=0`,
    `out=1`,
    `preamble=${encodeURIComponent(preamble)}`,
  ]

  const bodyStr = parts.join('&')

  const response = await fetch('https://quicklatex.com/latex3.f', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: bodyStr,
  })

  const text = await response.text()
  const lines = text.trim().split(/\r?\n/)

  if (lines[0].trim() !== '0') {
    // Extract error message (lines after the first two)
    const errorMsg = lines.slice(2).join('\n').trim().slice(0, 300)
    return { success: false, error: errorMsg }
  }

  const urlParts = lines[1].trim().split(' ')
  const imageUrl = urlParts[0]

  if (!imageUrl || imageUrl.includes('error.png')) {
    return { success: false, error: 'Error image returned' }
  }

  return { success: true, url: imageUrl }
}

async function main() {
  console.log(`Compiling ${ALL_TEMPLATES.length} templates on QuickLaTeX...\n`)

  const results: Array<{
    id: string
    name: string
    success: boolean
    url?: string
    error?: string
  }> = []

  // Run sequentially to avoid rate-limiting
  for (const template of ALL_TEMPLATES) {
    process.stdout.write(`  ${template.id.padEnd(25)}`)
    try {
      const result = await compileTikZ(template.referenceCode)
      results.push({ id: template.id, name: template.name, ...result })
      if (result.success) {
        console.log(`PASS  ${result.url}`)
      } else {
        console.log(`FAIL  ${result.error?.slice(0, 120)}`)
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      results.push({ id: template.id, name: template.name, success: false, error: msg })
      console.log(`ERROR ${msg.slice(0, 120)}`)
    }
  }

  // Summary
  const passed = results.filter((r) => r.success).length
  const failed = results.filter((r) => !r.success)

  console.log(`\n${'='.repeat(60)}`)
  console.log(`Results: ${passed}/${results.length} compiled successfully`)

  if (failed.length > 0) {
    console.log(`\nFailed templates:`)
    for (const f of failed) {
      console.log(`  - ${f.id}: ${f.error?.slice(0, 200)}`)
    }
    process.exit(1)
  }
}

main()
