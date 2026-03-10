/**
 * Smart Pipeline — SymPy Computation with Self-Debugging Loop
 *
 * Executes SymPy code in an E2B sandbox. If the code fails, feeds the error
 * back to Sonnet for correction (SymCode-style self-debugging loop).
 *
 * Max 3 attempts before giving up (fallback to current pipeline).
 */

import { Sandbox } from '@e2b/code-interpreter';
import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';
import type { AnalysisResult, ComputedProblem, ComputedValue } from './types';
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:smart-pipeline:compute')

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// Custom E2B template ID with texlive-full (also has Python)
const TEMPLATE_ID = process.env.E2B_LATEX_TEMPLATE_ID || undefined;

const MAX_COMPUTE_ATTEMPTS = 3;

/**
 * Execute SymPy code in E2B and return parsed results.
 * Reuses the same sandbox across retries for efficiency.
 */
async function executeSympyCode(
  sandbox: Sandbox,
  code: string,
): Promise<{ success: true; output: string } | { success: false; error: string }> {
  try {
    // Write and execute the Python script
    await sandbox.files.write('/tmp/compute.py', code);

    const execution = await sandbox.runCode(
      `import subprocess
result = subprocess.run(
    ['python3', '/tmp/compute.py'],
    capture_output=True, text=True, timeout=30
)
if result.returncode != 0:
    print(f"EXEC_ERROR: {result.stderr}")
else:
    print(result.stdout)`,
      { timeoutMs: 45000 },
    );

    if (execution.error) {
      return {
        success: false,
        error: `${execution.error.name}: ${execution.error.value}`,
      };
    }

    const stdout = execution.logs.stdout.join('');

    if (stdout.includes('EXEC_ERROR:')) {
      const errorMsg = stdout.split('EXEC_ERROR:')[1].trim();
      return { success: false, error: errorMsg };
    }

    return { success: true, output: stdout.trim() };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown execution error',
    };
  }
}

/**
 * Ask Sonnet to fix broken SymPy code given the error.
 */
async function selfDebug(
  originalQuestion: string,
  failedCode: string,
  error: string,
  attemptNumber: number,
): Promise<string | null> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: `This Python/SymPy code was generated to solve a math/physics problem but failed with an error.

ORIGINAL QUESTION: ${originalQuestion}

FAILED CODE:
\`\`\`python
${failedCode}
\`\`\`

ERROR (attempt ${attemptNumber}/${MAX_COMPUTE_ATTEMPTS}):
\`\`\`
${error.slice(0, 1500)}
\`\`\`

Fix the code. Common issues:
- Missing imports (sympy, math, json)
- SymPy objects not converted to float() before json.dumps
- Division by zero or invalid operations
- Wrong function names (e.g., sympy.sin vs math.sin)
- Forgetting to convert degrees to radians with sympy.rad()

Return ONLY the corrected Python code. No markdown fences. No explanation. Just code.`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') return null;

    let code = textBlock.text.trim();

    // Robust code extraction: handle LLM adding explanatory text around the code
    // Look for fenced code block first (most reliable)
    const fenceMatch = code.match(/```(?:python)?\s*\n([\s\S]*?)```/);
    if (fenceMatch) {
      return fenceMatch[1].trim();
    }

    // Strip leading fence without closing
    if (code.startsWith('```python\n')) code = code.slice('```python\n'.length);
    else if (code.startsWith('```python')) code = code.slice('```python'.length);
    else if (code.startsWith('```\n')) code = code.slice('```\n'.length);
    else if (code.startsWith('```')) code = code.slice('```'.length);
    if (code.endsWith('```')) code = code.slice(0, -'```'.length);

    // If the code has leading explanation text (before any import/from/def/print),
    // strip everything before the first Python statement
    const firstPythonLine = code.match(/^(import |from |def |class |print\(|[a-zA-Z_]\w*\s*=)/m);
    if (firstPythonLine && firstPythonLine.index && firstPythonLine.index > 0) {
      code = code.slice(firstPythonLine.index);
    }

    return code.trim();
  } catch (err) {
    log.warn({ detail: err }, 'Self-debug LLM call failed');
    return null;
  }
}

/**
 * Parse the JSON output from SymPy execution into a ComputedProblem.
 */
function parseComputeOutput(output: string, computeTimeMs: number): ComputedProblem | null {
  try {
    // Find JSON by looking for the LAST complete JSON object on its own line.
    // SymPy may print debug output with braces (FiniteSet, dict repr, etc.)
    // before the final print(json.dumps(result)).
    // Strategy: try parsing from last line backwards until we find valid JSON.
    const lines = output.trim().split('\n');
    let parsed: Record<string, unknown> | null = null;

    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          const candidate = JSON.parse(line);
          if (candidate && typeof candidate === 'object' && 'values' in candidate) {
            parsed = candidate;
            break;
          }
        } catch {
          // Not valid JSON on this line, try next
        }
      }
    }

    // Fallback: try multi-line JSON starting from last '{' at line start
    if (!parsed) {
      const lastBraceIdx = output.lastIndexOf('\n{');
      if (lastBraceIdx !== -1) {
        const jsonCandidate = output.slice(lastBraceIdx + 1);
        try {
          const candidate = JSON.parse(jsonCandidate);
          if (candidate && typeof candidate === 'object' && 'values' in candidate) {
            parsed = candidate;
          }
        } catch {
          // Not valid JSON
        }
      }
    }

    if (!parsed) {
      log.warn('No valid JSON with "values" found in compute output');
      return null;
    }

    if (!parsed.values || typeof parsed.values !== 'object') {
      log.warn('Compute output missing "values" object');
      return null;
    }

    // Normalize values into ComputedValue format
    const values: Record<string, ComputedValue> = {};
    for (const [key, val] of Object.entries(parsed.values)) {
      const v = val as Record<string, unknown>;
      values[key] = {
        name: (v.name as string) || key,
        value: Number(v.value),
        unit: (v.unit as string) || '',
        formula: (v.formula as string) || '',
        step: (v.step as string) || '',
      };

      // Validate the value is actually a number
      if (isNaN(values[key].value)) {
        log.warn(`Value "${key}" is NaN, skipping`);
        delete values[key];
      }
    }

    if (Object.keys(values).length === 0) {
      log.warn('No valid values in compute output');
      return null;
    }

    return {
      values,
      solutionSteps: Array.isArray(parsed.solutionSteps) ? parsed.solutionSteps : [],
      rawOutput: output,
      computeTimeMs,
    };
  } catch (err) {
    log.warn({ detail: err }, 'Failed to parse compute output');
    return null;
  }
}

/**
 * Compute with self-debugging loop (SymCode-style).
 *
 * 1. Execute SymPy code
 * 2. If fails → feed error to Sonnet → get fixed code → retry
 * 3. Max 3 attempts
 *
 * Reuses the same sandbox across all attempts (efficient).
 */
export async function computeWithRetry(
  analysis: AnalysisResult,
  question: string,
): Promise<{ computed: ComputedProblem | null; attempts: number }> {
  const startTime = performance.now();

  // Create sandbox (reuse template that has Python)
  const sandbox = TEMPLATE_ID
    ? await Sandbox.create(TEMPLATE_ID, { timeoutMs: 120000 })
    : await Sandbox.create({ timeoutMs: 120000 });

  try {
    // Ensure SymPy is available (quick check + install if needed)
    await sandbox.runCode(
      `import subprocess
try:
    import sympy
    print("SYMPY_OK")
except ImportError:
    subprocess.run(['pip', 'install', '-q', 'sympy'], capture_output=True, timeout=30)
    print("SYMPY_INSTALLED")`,
      { timeoutMs: 30000 },
    );

    let currentCode = analysis.sympyCode;
    let lastError = '';
    let lastAttempt = 0;

    for (let attempt = 1; attempt <= MAX_COMPUTE_ATTEMPTS; attempt++) {
      lastAttempt = attempt;
      log.info(`Compute attempt ${attempt}/${MAX_COMPUTE_ATTEMPTS}`);

      const result = await executeSympyCode(sandbox, currentCode);

      if (result.success) {
        const computeTimeMs = performance.now() - startTime;
        const computed = parseComputeOutput(result.output, computeTimeMs);

        if (computed) {
          log.info(
            `[SmartPipeline] Compute succeeded on attempt ${attempt} (${Math.round(computeTimeMs)}ms, ${Object.keys(computed.values).length} values)`,
          );
          return { computed, attempts: attempt };
        }

        // Output parsed but no valid values — treat as error
        lastError = `Code executed but output was not valid JSON with values: ${result.output.slice(0, 500)}`;
      } else {
        lastError = result.error;
      }

      log.info(`Attempt ${attempt} failed: ${lastError.slice(0, 200)}`);

      // Self-debug: ask Sonnet to fix the code (except on last attempt)
      if (attempt < MAX_COMPUTE_ATTEMPTS) {
        const fixedCode = await selfDebug(question, currentCode, lastError, attempt);
        if (fixedCode) {
          currentCode = fixedCode;
          log.info(`Self-debug produced new code (${fixedCode.length} chars)`);
        } else {
          log.info('Self-debug failed to produce fix');
          break; // No point retrying with the same code
        }
      }
    }

    return { computed: null, attempts: lastAttempt };
  } finally {
    await sandbox.kill();
  }
}
