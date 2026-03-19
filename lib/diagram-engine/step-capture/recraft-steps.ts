/**
 * Recraft Step Capture — Progressive Label Overlays
 *
 * Creates step-by-step images for Recraft diagrams by progressively
 * revealing labels on the base image. Each step shows cumulative labels
 * composited via TikZ overlay in a single E2B sandbox session.
 *
 * Example: "Human Eye" with 8 labels across 4 steps:
 *   Step 1: base image + labels[0..1] (Cornea, Sclera)
 *   Step 2: base image + labels[0..3] (+ Iris, Pupil)
 *   Step 3: base image + labels[0..5] (+ Lens, Vitreous Humor)
 *   Step 4: base image + labels[0..7] (+ Retina, Optic Nerve)
 */

import { Sandbox } from '@e2b/code-interpreter'
import type { OverlayLabel, RecraftStepMeta } from '@/types'
import type { StepImage } from '@/components/homework/diagram/types'
import { uploadStepImages, generateDiagramHash } from './upload-steps'
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:recraft-steps')

const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined

export interface RecraftStepCaptureResult {
  stepImages: StepImage[]
  captureTimeMs: number
}

/**
 * Escape special LaTeX characters in label text.
 */
function escapeLatex(text: string): string {
  return text
    .replace(/\\/g, '\\textbackslash{}')
    .replace(/&/g, '\\&')
    .replace(/%/g, '\\%')
    .replace(/\$/g, '\\$')
    .replace(/#/g, '\\#')
    .replace(/_/g, '\\_')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .replace(/~/g, '\\textasciitilde{}')
    .replace(/\^/g, '\\textasciicircum{}')
}

/**
 * Build TikZ overlay code for a subset of labels on the base image.
 */
function buildOverlayTikz(labels: OverlayLabel[]): string {
  const labelNodes = labels.map((label, i) => {
    const labelX = (label.x / 100) * 10
    const labelY = 10 - (label.y / 100) * 10
    const targetX = (label.targetX / 100) * 10
    const targetY = 10 - (label.targetY / 100) * 10
    const escapedText = escapeLatex(label.text)

    return `    % Label ${i + 1}: ${label.text}
    \\draw[line width=0.4pt, color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) -- (${labelX.toFixed(2)}, ${labelY.toFixed(2)});
    \\fill[color=gray!70] (${targetX.toFixed(2)}, ${targetY.toFixed(2)}) circle (0.06);
    \\node[fill=white, fill opacity=0.85, text opacity=1, inner sep=1.5pt, font=\\scriptsize\\sffamily] at (${labelX.toFixed(2)}, ${labelY.toFixed(2)}) {${escapedText}};`
  }).join('\n')

  return `\\documentclass[border=0pt]{standalone}
\\usepackage{tikz}
\\usepackage{graphicx}
\\begin{document}
\\begin{tikzpicture}
    \\node[anchor=south west, inner sep=0] at (0,0) {\\includegraphics[width=10cm, height=10cm]{/tmp/recraft_base.png}};
${labelNodes}
\\end{tikzpicture}
\\end{document}`
}

/**
 * Capture progressive label overlay step images for a Recraft diagram.
 *
 * Opens ONE E2B sandbox, downloads the base image once, then compiles
 * N TikZ overlays sequentially (each ~2-3s). Labels are distributed
 * evenly across steps.
 */
export async function captureRecraftSteps(
  baseImageUrl: string,
  labels: OverlayLabel[],
  stepMetadata: RecraftStepMeta[],
  userId: string,
  question: string,
): Promise<RecraftStepCaptureResult> {
  const startTime = Date.now()

  if (!LATEX_TEMPLATE_ID) {
    log.warn('E2B_LATEX_TEMPLATE_ID not set — skipping Recraft step capture')
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  }

  if (labels.length === 0) {
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  }

  // Determine number of steps: use stepMetadata count, or divide labels into 3-5 groups
  const numSteps = stepMetadata.length > 0
    ? Math.min(stepMetadata.length, labels.length)
    : Math.min(Math.max(3, Math.ceil(labels.length / 2)), 5)

  log.info({ numSteps, numLabels: labels.length }, 'Starting Recraft progressive step capture')

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 60000 })

  try {
    // Wait for sandbox
    await sandbox.runCode('print("ready")', { timeoutMs: 15000 })

    // Download base image once (URL is JSON-escaped to prevent injection)
    const safeUrl = JSON.stringify(baseImageUrl)
    const downloadResult = await sandbox.runCode(
      `import urllib.request, os
try:
    urllib.request.urlretrieve(${safeUrl}, "/tmp/recraft_base.png")
    print(f"OK:{os.path.getsize('/tmp/recraft_base.png')}")
except Exception as e:
    print(f"ERR:{e}")`,
      { timeoutMs: 20000 }
    )

    const dlOutput = downloadResult.logs.stdout.join('')
    if (!dlOutput.startsWith('OK:')) {
      log.error({ output: dlOutput }, 'Failed to download base image')
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    // Compile progressive overlays
    const buffers: (Buffer | null)[] = []

    for (let step = 0; step < numSteps; step++) {
      // Labels for this step: cumulative, evenly distributed
      const labelCount = Math.ceil(((step + 1) / numSteps) * labels.length)
      const stepLabels = labels.slice(0, labelCount)
      const tikzCode = buildOverlayTikz(stepLabels)

      // Write TikZ, compile, convert to PNG (clean up stale files first)
      const compileResult = await sandbox.runCode(
        `import subprocess, os, base64

# Remove stale files from previous iteration to prevent reading old data
for f in ["/tmp/step.pdf", "/tmp/step.png", "/tmp/step.aux", "/tmp/step.log"]:
    if os.path.exists(f):
        os.remove(f)

tex = ${JSON.stringify(tikzCode)}
with open("/tmp/step.tex", "w") as f:
    f.write(tex)

r = subprocess.run(
    ["pdflatex", "-interaction=nonstopmode", "-output-directory=/tmp", "/tmp/step.tex"],
    capture_output=True, text=True, timeout=15
)

if r.returncode != 0 or not os.path.exists("/tmp/step.pdf"):
    print(f"COMPILE_ERR:{r.stderr[-500:] if r.stderr else 'unknown'}")
else:
    subprocess.run(
        ["convert", "-density", "200", "/tmp/step.pdf", "-quality", "95", "/tmp/step.png"],
        capture_output=True, timeout=10
    )
    if os.path.exists("/tmp/step.png"):
        with open("/tmp/step.png", "rb") as f:
            data = f.read()
        print(f"OK:{base64.b64encode(data).decode()}")
    else:
        print("CONVERT_ERR")`,
        { timeoutMs: 25000 }
      )

      const output = compileResult.logs.stdout.join('')
      if (output.startsWith('OK:')) {
        const b64 = output.slice(3)
        buffers.push(Buffer.from(b64, 'base64'))
      } else {
        log.warn({ step: step + 1, output: output.slice(0, 200) }, 'Step compilation failed')
        buffers.push(null)
      }
    }

    // Upload to Supabase Storage
    const validBuffers = buffers.filter((b): b is Buffer => b !== null)
    if (validBuffers.length === 0) {
      return { stepImages: [], captureTimeMs: Date.now() - startTime }
    }

    const diagramHash = generateDiagramHash(question, 'recraft-steps')
    const urls = await uploadStepImages(validBuffers, userId, diagramHash)

    // Build StepImage array with metadata
    const stepImages: StepImage[] = []
    let bufferIdx = 0

    for (let i = 0; i < buffers.length; i++) {
      if (buffers[i] !== null) {
        const url = urls[bufferIdx]
        bufferIdx++

        if (url) {
          const meta = stepMetadata[i]
          stepImages.push({
            url,
            label: meta?.label || `Step ${i + 1}`,
            labelHe: meta?.labelHe || meta?.label || `שלב ${i + 1}`,
            explanation: meta?.explanation || '',
            explanationHe: meta?.explanationHe || meta?.explanation || '',
          })
        }
      }
    }

    const captureTimeMs = Date.now() - startTime
    log.info({ steps: stepImages.length, captureTimeMs }, 'Recraft step capture complete')

    return { stepImages, captureTimeMs }
  } catch (err) {
    log.error({ err }, 'Recraft step capture error')
    return { stepImages: [], captureTimeMs: Date.now() - startTime }
  } finally {
    await sandbox.kill().catch((err) => { log.warn({ err }, 'Failed to kill E2B sandbox — may leak resources') })
  }
}
