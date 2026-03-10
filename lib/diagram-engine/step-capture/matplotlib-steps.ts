/**
 * Matplotlib Step Capture
 *
 * Parses Python/Matplotlib code with STEP markers, injects plt.savefig()
 * calls between steps, executes in E2B sandbox, and reads back step PNGs.
 *
 * Marker format: # === STEP N: Description ===
 */

import { Sandbox } from '@e2b/code-interpreter'
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:matplotlib-steps')

const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined

/** Parsed step marker info */
export interface StepMarker {
  step: number
  description: string
  /** 0-indexed line number in source code */
  line: number
}

interface MatplotlibStepResult {
  /** PNG buffers for each step (null = capture failed) */
  buffers: (Buffer | null)[]
}

// Regex: # === STEP 1: Description ===
const STEP_MARKER_RE = /^#\s*===\s*STEP\s+(\d+):\s*(.+?)\s*===\s*$/

/**
 * Parse all STEP markers from Python/Matplotlib code.
 * Returns markers in order with 0-indexed line numbers.
 */
export function parseStepMarkers(code: string): StepMarker[] {
  const lines = code.split('\n')
  const markers: StepMarker[] = []

  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(STEP_MARKER_RE)
    if (match) {
      markers.push({
        step: parseInt(match[1], 10),
        description: match[2],
        line: i,
      })
    }
  }

  return markers
}

/**
 * Inject plt.savefig('/tmp/step_N.png', ...) calls into Python code.
 *
 * For each STEP marker, a savefig call is inserted just BEFORE the next
 * STEP marker (capturing everything up to that point). For the last step,
 * the savefig is inserted before the final plt.savefig/plt.show call,
 * or at the end of the code.
 */
export function injectSaveFigCalls(code: string): string {
  const markers = parseStepMarkers(code)
  if (markers.length === 0) return code

  const lines = code.split('\n')
  const result: string[] = []

  for (let i = 0; i < lines.length; i++) {
    // Check if we need to inject a savefig BEFORE this line
    // (i.e., this line is a STEP marker and it's not the first step)
    const isStepMarker = markers.find(m => m.line === i)
    if (isStepMarker && isStepMarker.step > 1) {
      // Inject savefig for the PREVIOUS step before this marker
      const prevStep = isStepMarker.step - 1
      result.push(`plt.savefig('/tmp/step_${prevStep}.png', dpi=150, bbox_inches='tight')`)
    }

    result.push(lines[i])
  }

  // Inject savefig for the LAST step at the end
  const lastMarker = markers[markers.length - 1]
  result.push(`plt.savefig('/tmp/step_${lastMarker.step}.png', dpi=150, bbox_inches='tight')`)

  return result.join('\n')
}

/**
 * Execute matplotlib code with injected savefig calls in E2B sandbox,
 * then read back step PNG files.
 */
export async function captureMatplotlibSteps(
  code: string,
): Promise<MatplotlibStepResult> {
  const markers = parseStepMarkers(code)
  if (markers.length === 0) {
    return { buffers: [] }
  }

  const injectedCode = injectSaveFigCalls(code)

  const sandbox = LATEX_TEMPLATE_ID
    ? await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 120000 })
    : await Sandbox.create()

  try {
    // Write the injected script
    await sandbox.files.write('/tmp/step_diagram.py', injectedCode)

    // Execute the script via subprocess
    const execution = await sandbox.runCode(
      `import subprocess
result = subprocess.run(['python3', '/tmp/step_diagram.py'], capture_output=True, text=True, timeout=60)
if result.returncode != 0:
    print(f"SCRIPT_ERROR: {result.stderr}")
else:
    print("SCRIPT_OK")`,
      { timeoutMs: 60000 },
    )

    if (execution.error) {
      log.warn({ detail: execution.error.value }, 'Execution error')
      return { buffers: markers.map(() => null) }
    }

    const stdout = execution.logs.stdout.join('')
    if (stdout.includes('SCRIPT_ERROR:')) {
      log.warn({ detail: [stdout.split('SCRIPT_ERROR:')[1]?.trim().slice(0, 200)] }, 'Script error')
      return { buffers: markers.map(() => null) }
    }

    // Read each step PNG from the sandbox filesystem
    const buffers: (Buffer | null)[] = []
    for (const marker of markers) {
      try {
        const fileContent = await sandbox.files.read(`/tmp/step_${marker.step}.png`)
        if (fileContent) {
          const buffer = typeof fileContent === 'string'
            ? Buffer.from(fileContent, 'binary')
            : Buffer.from(fileContent)
          buffers.push(buffer)
        } else {
          log.warn(`Step ${marker.step} PNG empty`)
          buffers.push(null)
        }
      } catch {
        log.warn(`Step ${marker.step} PNG not found`)
        buffers.push(null)
      }
    }

    log.info(`Captured ${buffers.filter(Boolean).length}/${markers.length} steps`)
    return { buffers }
  } catch (err) {
    log.error({ detail: err }, 'Fatal error')
    return { buffers: markers.map(() => null) }
  } finally {
    await sandbox.kill()
  }
}
