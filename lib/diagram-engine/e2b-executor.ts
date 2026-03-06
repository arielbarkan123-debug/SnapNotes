import { Sandbox } from '@e2b/code-interpreter';

export type RenderMode = 'latex' | 'matplotlib';

// Custom E2B template ID with texlive-full pre-installed
// Set via env var, falls back to default code-interpreter (no LaTeX support)
const LATEX_TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined;

export interface ExecutionResult {
  png?: string; // base64 encoded
  error?: string;
}

/**
 * Execute LaTeX code in E2B sandbox.
 * Writes .tex file, compiles with pdflatex, converts PDF→PNG with ImageMagick.
 * Requires custom sandbox template with texlive-full installed.
 */
async function executeLatex(code: string): Promise<ExecutionResult> {
  if (!LATEX_TEMPLATE_ID) {
    return { error: 'E2B_LATEX_TEMPLATE_ID not set. Build the custom template first.' };
  }

  const sandbox = await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 30000 });
  try {
    // Wait for sandbox kernel to be ready
    await sandbox.runCode('print("ready")', { timeoutMs: 15000 });

    // Write the LaTeX file
    await sandbox.files.write('/tmp/diagram.tex', code);

    // Compile with pdflatex
    const compileResult = await sandbox.runCode(
      `import subprocess
import os

os.chdir('/tmp')
result = subprocess.run(
    ['pdflatex', '-interaction=nonstopmode', '-halt-on-error', 'diagram.tex'],
    capture_output=True, text=True, timeout=30
)

if result.returncode != 0:
    # Extract the most useful error lines
    lines = result.stdout.split('\\n')
    error_lines = [l for l in lines if l.startswith('!') or 'Error' in l or 'Undefined' in l or l.startswith('l.')]
    error_msg = '\\n'.join(error_lines[:15]) if error_lines else result.stdout[-2000:]
    print(f"LATEX_ERROR: {error_msg}")
else:
    print("COMPILE_OK")
    print(f"PDF exists: {os.path.exists('/tmp/diagram.pdf')}")`,
      { timeoutMs: 30000 }
    );

    if (compileResult.error) {
      return { error: `LaTeX execution error: ${compileResult.error.value}` };
    }

    const compileOutput = compileResult.logs.stdout.join('');
    if (compileOutput.includes('LATEX_ERROR:')) {
      const errorMsg = compileOutput.split('LATEX_ERROR:')[1].trim();
      return { error: `LaTeX compilation failed:\n${errorMsg}` };
    }

    // Convert PDF to high-resolution PNG with ImageMagick
    const convertResult = await sandbox.runCode(
      `import subprocess
from IPython.display import Image, display

result = subprocess.run([
    'convert', '-density', '300', '-quality', '100',
    '-background', 'white', '-alpha', 'remove',
    '-trim', '+repage',
    '/tmp/diagram.pdf', '/tmp/diagram.png'
], capture_output=True, text=True, timeout=30)

if result.returncode != 0:
    print(f"CONVERT_ERROR: {result.stderr}")
else:
    display(Image(filename='/tmp/diagram.png'))`,
      { timeoutMs: 30000 }
    );

    if (convertResult.error) {
      return { error: `ImageMagick conversion error: ${convertResult.error.value}` };
    }

    const convertOutput = convertResult.logs.stdout.join('');
    if (convertOutput.includes('CONVERT_ERROR:')) {
      const errorMsg = convertOutput.split('CONVERT_ERROR:')[1].trim();
      return { error: `PDF to PNG conversion failed:\n${errorMsg}` };
    }

    for (const result of convertResult.results) {
      if (result.png) {
        return { png: result.png };
      }
    }

    return { error: 'LaTeX compiled and converted but no image was captured.' };
  } finally {
    await sandbox.kill();
  }
}

/**
 * Execute matplotlib Python code in E2B sandbox.
 * The code saves to diagram.png, which we read back.
 */
async function executeMatplotlib(code: string): Promise<ExecutionResult> {
  // Use custom template if available (has better fonts), otherwise default
  // 30s sandbox creation timeout — if it doesn't start in 30s, it won't start at all
  console.log(`[E2B] Creating matplotlib sandbox (template: ${LATEX_TEMPLATE_ID || 'default'}, E2B_API_KEY set: ${!!process.env.E2B_API_KEY})`);
  const sandboxStart = Date.now();
  const sandbox = LATEX_TEMPLATE_ID
    ? await Sandbox.create(LATEX_TEMPLATE_ID, { timeoutMs: 30000 })
    : await Sandbox.create({ timeoutMs: 30000 });
  console.log(`[E2B] Sandbox created in ${Date.now() - sandboxStart}ms`);
  try {
    // Write the script
    await sandbox.files.write('/tmp/diagram.py', code);

    // Execute the script
    const execution = await sandbox.runCode(
      `import subprocess
result = subprocess.run(['python3', '/tmp/diagram.py'], capture_output=True, text=True, timeout=60)
if result.returncode != 0:
    print(f"SCRIPT_ERROR: {result.stderr}")
else:
    print("SCRIPT_OK")

# Display the resulting image
import os
if os.path.exists('/tmp/diagram.png'):
    from IPython.display import Image, display
    display(Image(filename='/tmp/diagram.png'))
elif os.path.exists('diagram.png'):
    from IPython.display import Image, display
    display(Image(filename='diagram.png'))
else:
    print("NO_IMAGE: diagram.png not found")`,
      { timeoutMs: 60000 }
    );

    if (execution.error) {
      return {
        error: `${execution.error.name}: ${execution.error.value}\n${execution.error.traceback}`,
      };
    }

    const stdout = execution.logs.stdout.join('');
    if (stdout.includes('SCRIPT_ERROR:')) {
      const errorMsg = stdout.split('SCRIPT_ERROR:')[1].trim();
      return { error: `Python script error:\n${errorMsg}` };
    }

    if (stdout.includes('NO_IMAGE:')) {
      return { error: 'Script ran but diagram.png was not created. Ensure plt.savefig("diagram.png", ...) is called.' };
    }

    for (const result of execution.results) {
      if (result.png) {
        return { png: result.png };
      }
    }

    // Fallback: try to read the file directly
    try {
      const fileContent = await sandbox.files.read('/tmp/diagram.png');
      if (fileContent) {
        // fileContent is a string or Uint8Array; convert to base64
        const buffer = typeof fileContent === 'string'
          ? Buffer.from(fileContent, 'binary')
          : Buffer.from(fileContent);
        return { png: buffer.toString('base64') };
      }
    } catch {
      // File doesn't exist or can't be read
    }

    return { error: 'Script executed but no image was captured.' };
  } finally {
    await sandbox.kill();
  }
}

/**
 * Detect the rendering mode from the first line of generated code.
 */
export function detectMode(code: string): RenderMode {
  const firstLine = code.trim().split('\n')[0].trim();
  if (firstLine.includes('MODE: latex') || firstLine.startsWith('\\documentclass')) {
    return 'latex';
  }
  // LaTeX comments start with % followed by space or non-alpha (e.g., "% preamble").
  // Python magic commands start with % followed by alpha (e.g., "%matplotlib inline").
  // Only treat % as LaTeX if it's NOT followed by an alphanumeric character.
  if (firstLine.startsWith('%') && !/^%[a-zA-Z]/.test(firstLine)) {
    return 'latex';
  }
  return 'matplotlib'; // default
}

/**
 * Execute code in E2B sandbox based on the detected mode.
 */
export async function executeCode(code: string, mode: RenderMode): Promise<ExecutionResult> {
  if (mode === 'latex') {
    return executeLatex(code);
  }
  return executeMatplotlib(code);
}
