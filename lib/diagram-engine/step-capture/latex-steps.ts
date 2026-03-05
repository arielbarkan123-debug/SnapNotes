/**
 * LaTeX Step Capture
 *
 * Parses LaTeX documents with `% === STEP N: Description ===` markers,
 * builds cumulative subsets (preamble + steps 1..N), and compiles each
 * in E2B sandbox to produce step PNG images.
 */

import { Sandbox } from '@e2b/code-interpreter'

const STEP_REGEX = /^%\s*===\s*STEP\s+(\d+)\s*:\s*(.+?)\s*===\s*$/
const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined

export interface LatexStepMarker {
  step: number
  description: string
  line: number
}

/**
 * Find all STEP markers in LaTeX code.
 */
export function parseLatexStepMarkers(code: string): LatexStepMarker[] {
  const lines = code.split('\n')
  const markers: LatexStepMarker[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STEP_REGEX)
    if (match) {
      markers.push({
        step: parseInt(match[1], 10),
        description: match[2].trim(),
        line: i,
      })
    }
  }

  return markers
}

/**
 * Build a cumulative LaTeX document containing steps 1 through stepNumber.
 *
 * Strategy:
 * - Everything before the first STEP marker = preamble (always included)
 * - Content between STEP N and STEP N+1 = step N's content
 * - Content after last STEP marker up to \end{document} = last step's content
 * - Reconstructs: preamble + steps 1..stepNumber + \end{document}
 *
 * NOTE: LaTeX steps are inherently cumulative in the design — each step
 * repeats the previous equations. So we use only the LAST included step's
 * content block (which already contains all prior work).
 */
export function buildCumulativeLatexStep(
  fullCode: string,
  markers: LatexStepMarker[],
  stepNumber: number,
): string {
  const lines = fullCode.split('\n')

  // Find preamble (everything before first STEP marker)
  const firstMarkerLine = markers[0].line
  const preamble = lines.slice(0, firstMarkerLine).join('\n')

  // Find step content blocks
  const stepBlocks: string[] = []
  for (let i = 0; i < markers.length; i++) {
    const startLine = markers[i].line + 1 // Skip the marker line itself
    const endLine = i < markers.length - 1
      ? markers[i + 1].line
      : lines.findIndex((l, idx) => idx > startLine && l.trim() === '\\end{document}')

    const blockEnd = endLine !== -1 ? endLine : lines.length
    const block = lines.slice(startLine, blockEnd).join('\n').trim()
    stepBlocks.push(block)
  }

  // Build cumulative: preamble + the target step's content
  // Since LaTeX steps are inherently cumulative (step N repeats steps 1..N-1),
  // we use only the Nth block's content
  const targetBlock = stepBlocks[stepNumber - 1]

  return `${preamble}\n\n${targetBlock}\n\n\\end{document}`
}

/**
 * Compile each cumulative LaTeX step in E2B sandbox and return PNG buffers.
 */
export async function captureLatexSteps(
  code: string,
): Promise<{ buffers: (Buffer | null)[]; markers: LatexStepMarker[] }> {
  const markers = parseLatexStepMarkers(code)
  if (markers.length === 0) {
    return { buffers: [], markers: [] }
  }

  if (!LATEX_TEMPLATE_ID) {
    console.warn('[LatexSteps] E2B_LATEX_TEMPLATE_ID not set')
    return { buffers: markers.map(() => null), markers }
  }

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 120000 })
  try {
    // Wait for sandbox
    await sandbox.runCode('print("ready")', { timeoutMs: 30000 })

    const buffers: (Buffer | null)[] = []

    for (let i = 0; i < markers.length; i++) {
      const stepCode = buildCumulativeLatexStep(code, markers, markers[i].step)
      const filename = `step_${markers[i].step}`

      try {
        // Write LaTeX file
        await sandbox.files.write(`/tmp/${filename}.tex`, stepCode)

        // Compile
        const compileResult = await sandbox.runCode(
          `import subprocess, os
os.chdir('/tmp')
result = subprocess.run(
    ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', '${filename}.tex'],
    capture_output=True, text=True, timeout=30
)
if result.returncode != 0:
    lines = result.stdout.split('\\n')
    error_lines = [l for l in lines if l.startswith('!') or 'Error' in l]
    print(f"LATEX_ERROR: {'\\n'.join(error_lines[:10])}")
else:
    print("COMPILE_OK")`,
          { timeoutMs: 30000 },
        )

        const compileOutput = compileResult.logs.stdout.join('')
        if (compileOutput.includes('LATEX_ERROR:')) {
          console.warn(`[LatexSteps] Step ${markers[i].step} compile failed`)
          buffers.push(null)
          continue
        }

        // Convert to PNG
        const convertResult = await sandbox.runCode(
          `import subprocess
from IPython.display import Image, display
result = subprocess.run([
    'convert', '-density', '300', '-quality', '100',
    '-background', 'white', '-alpha', 'remove',
    '-trim', '+repage',
    '/tmp/${filename}.pdf', '/tmp/${filename}.png'
], capture_output=True, text=True, timeout=30)
if result.returncode != 0:
    print(f"CONVERT_ERROR: {result.stderr}")
else:
    display(Image(filename='/tmp/${filename}.png'))`,
          { timeoutMs: 30000 },
        )

        // Extract PNG from IPython display
        let captured = false
        for (const res of convertResult.results) {
          if (res.png) {
            buffers.push(Buffer.from(res.png, 'base64'))
            captured = true
            break
          }
        }

        if (!captured) {
          console.warn(`[LatexSteps] Step ${markers[i].step} no PNG captured`)
          buffers.push(null)
        }
      } catch (err) {
        console.error(`[LatexSteps] Step ${markers[i].step} error:`, err)
        buffers.push(null)
      }
    }

    console.log(`[LatexSteps] Captured ${buffers.filter(Boolean).length}/${markers.length} steps`)
    return { buffers, markers }
  } finally {
    await sandbox.kill()
  }
}
