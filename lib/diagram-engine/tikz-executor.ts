import Anthropic from '@anthropic-ai/sdk';
import { buildTikzPrompt } from './tikz';
import { AI_MODEL } from '@/lib/ai/claude';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});
import { createLogger } from '@/lib/logger'

const log = createLogger('diagram:tikz-executor')

export interface TikzResult {
  imageUrl: string;
  tikzCode: string;
  attempts: number;
}

export interface TikzError {
  error: string;
  tikzCode?: string;
}

/**
 * Sanitize Unicode characters that break LaTeX compilation.
 */
export function sanitizeUnicode(code: string): string {
  return code
    .replace(/°/g, '^{\\circ}')
    .replace(/→/g, '\\rightarrow ')
    .replace(/²/g, '^{2}')
    .replace(/³/g, '^{3}')
    .replace(/±/g, '\\pm ')
    .replace(/×/g, '\\times ')
    .replace(/÷/g, '\\div ')
    .replace(/≤/g, '\\leq ')
    .replace(/≥/g, '\\geq ')
    .replace(/≠/g, '\\neq ')
    .replace(/∞/g, '\\infty ')
    .replace(/α/g, '\\alpha ')
    .replace(/β/g, '\\beta ')
    .replace(/γ/g, '\\gamma ')
    .replace(/δ/g, '\\delta ')
    .replace(/θ/g, '\\theta ')
    .replace(/λ/g, '\\lambda ')
    .replace(/μ/g, '\\mu ')
    .replace(/π/g, '\\pi ')
    .replace(/σ/g, '\\sigma ')
    .replace(/ω/g, '\\omega ')
    .replace(/Ω/g, '\\Omega ')
    .replace(/Δ/g, '\\Delta ')
    .replace(/∑/g, '\\sum ')
    .replace(/√/g, '\\sqrt')
    .replace(/·/g, '\\cdot ')
    .replace(/…/g, '\\ldots ')
    .replace(/′/g, "'")
    .replace(/″/g, "''");
}

export interface CompileSuccess { url: string }
export interface CompileFailure { error: string }

/**
 * Compile TikZ code to PNG via QuickLaTeX API.
 * Returns the image URL on success, or the actual error text on failure
 * (so it can be fed back to Claude for targeted fixes).
 */
export async function compileTikZ(tikzCode: string): Promise<CompileSuccess | CompileFailure> {
  try {
    // Guard: reject oversized code that will timeout on QuickLaTeX
    if (tikzCode.length > 3500) {
      log.warn({ charCount: tikzCode.length }, 'Code too large, will timeout on QuickLaTeX. Rejecting.');
      return { error: `TikZ code too large (${tikzCode.length} chars, max 3500). Simplify the diagram: remove decorative elements, reduce plot points, pre-compute coordinates.` };
    }

    // Guard: reject known-problematic features
    if (/\\pgfmathsetmacro|\\pgfmathparse/.test(tikzCode)) {
      log.warn('Code uses \\pgfmathsetmacro — known to cause QuickLaTeX timeouts');
      return { error: 'Do not use \\pgfmathsetmacro or \\pgfmathparse. Pre-compute all values as decimal numbers and write them directly.' };
    }
    if (/plot\s*\[.*domain\s*=.*variable\s*=/.test(tikzCode)) {
      log.warn('Code uses parametric plot[domain=...] — known to cause QuickLaTeX 500 errors');
      return { error: 'Do not use plot[domain=..., variable=\\t]. Use \\draw[smooth] plot coordinates {(x1,y1) (x2,y2) ...} with pre-computed points instead.' };
    }

    const libraryMatches = tikzCode.match(/\\usetikzlibrary\{[^}]+\}/g);
    const libraries = libraryMatches ? libraryMatches.join('\n') : '';

    const formula = tikzCode
      .replace(/\\usetikzlibrary\{[^}]+\}\s*/g, '')
      .trim();

    const preamble = `\\usepackage{tikz}\n\\usepackage{amsmath}\n\\usepackage{xcolor}\n${libraries}`;

    const parts = [
      `formula=${encodeURIComponent(formula)}`,
      `fsize=64px`,
      `fcolor=000000`,
      `mode=0`,
      `out=1`,
      `preamble=${encodeURIComponent(preamble)}`,
    ];

    // 15s timeout — if QuickLaTeX takes longer, the code is too complex
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    const response = await fetch('https://quicklatex.com/latex3.f', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: parts.join('&'),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const text = await response.text();

    // Check for HTTP error responses (HTML instead of plain text)
    if (text.includes('<!DOCTYPE') || text.includes('<html') || response.status >= 500) {
      log.error('QuickLaTeX returned HTTP error (likely 500). Code too complex.');
      return { error: 'QuickLaTeX server error (500). The TikZ code is too complex. Simplify: use plot coordinates with pre-computed points, remove \\pgfmathsetmacro, remove decorative elements, keep under 2000 chars.' };
    }

    const lines = text.trim().split(/\r?\n/);

    if (lines[0].trim() !== '0') {
      const errorText = text.substring(0, 500);
      log.error({ err: errorText }, 'QuickLaTeX compilation failed:');
      return { error: errorText };
    }

    const urlParts = lines[1].trim().split(' ');
    const imageUrl = urlParts[0];

    if (!imageUrl || imageUrl.includes('error.png')) {
      return { error: 'QuickLaTeX returned error.png — likely a rendering failure' };
    }

    return { url: imageUrl };
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      log.error('QuickLaTeX timed out after 15s — code too complex');
      return { error: 'QuickLaTeX compilation timed out (>15s). The TikZ code is too complex. Simplify: remove decorative elements, use fewer plot points, pre-compute all coordinates as numbers.' };
    }
    const errMsg = error instanceof Error ? error.message : 'Unknown QuickLaTeX error';
    log.error({ err: error }, 'QuickLaTeX error:');
    return { error: errMsg };
  }
}

/**
 * Generate a TikZ diagram: Claude generates TikZ code → QuickLaTeX compiles → PNG.
 */
export async function generateTikzDiagram(
  question: string
): Promise<TikzResult | TikzError> {
  const tikzSystemPrompt = buildTikzPrompt(question);

  const message = await anthropic.messages.create({
    model: AI_MODEL,
    max_tokens: 4096,
    system: tikzSystemPrompt,
    messages: [
      {
        role: 'user',
        content: `Generate TikZ code for the following diagram:\n\n${question}`,
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === 'text');
  if (!textBlock || textBlock.type !== 'text') {
    return { error: 'No TikZ code generated' };
  }

  let tikzCode = textBlock.text;

  // Strip markdown code fences
  const codeBlockMatch = tikzCode.match(
    /```(?:latex|tex|tikz|plaintext)?\s*\n([\s\S]*?)```/
  );
  if (codeBlockMatch) {
    tikzCode = codeBlockMatch[1].trim();
  }

  tikzCode = sanitizeUnicode(tikzCode);

  if (
    !tikzCode.includes('\\begin{tikzpicture}') &&
    !tikzCode.includes('\\usetikzlibrary')
  ) {
    return { error: 'Claude did not produce valid TikZ code.', tikzCode };
  }

  // Compile with retries
  let compileResult = await compileTikZ(tikzCode);
  let lastCompileError = 'error' in compileResult ? compileResult.error : '';

  if ('error' in compileResult) {
    for (let retry = 0; retry < 2; retry++) {
      log.info(`Compilation retry ${retry + 1}...`);
      const fixMessage = await anthropic.messages.create({
        model: AI_MODEL,
        max_tokens: 4096,
        system: tikzSystemPrompt,
        messages: [
          {
            role: 'user',
            content: `Generate TikZ code for the following diagram:\n\n${question}`,
          },
          { role: 'assistant', content: tikzCode },
          {
            role: 'user',
            content: `The TikZ code failed to compile via QuickLaTeX (pdflatex).

ACTUAL COMPILATION ERROR:
${lastCompileError}

Common causes of failure:
1. Unicode characters (°, →, ², α, etc.) — MUST use LaTeX equivalents (^{\\circ}, \\rightarrow, ^{2}, \\alpha)
2. Mismatched braces { } or environments \\begin/\\end
3. Invalid pgfmath expressions — pre-compute all coordinates as numbers
4. Using packages not available on QuickLaTeX (stick to tikz, amsmath, xcolor, pgfplots)
5. Missing \\usetikzlibrary declarations for used features (arrows.meta, calc, patterns, etc.)
6. Arrow syntax: use {Stealth}..{Stealth} not <-> for arrowheads (requires arrows.meta library)

Fix the code. Output ONLY the corrected TikZ code, starting with \\usetikzlibrary or \\begin{tikzpicture}.`,
          },
        ],
      });

      const fixBlock = fixMessage.content.find((b) => b.type === 'text');
      if (fixBlock && fixBlock.type === 'text') {
        let fixedCode = fixBlock.text;
        const codeMatch = fixedCode.match(
          /```(?:latex|tex|tikz|plaintext)?\s*\n([\s\S]*?)```/
        );
        if (codeMatch) fixedCode = codeMatch[1].trim();

        fixedCode = sanitizeUnicode(fixedCode);

        if (fixedCode.includes('\\begin{tikzpicture}')) {
          tikzCode = fixedCode;
          compileResult = await compileTikZ(tikzCode);
          if ('url' in compileResult) break; // Success!
          lastCompileError = compileResult.error;
        }
      }
    }
  }

  if ('error' in compileResult) {
    return { error: `TikZ compilation failed after 3 attempts. Last error: ${lastCompileError.slice(0, 200)}`, tikzCode };
  }

  return { imageUrl: compileResult.url, tikzCode, attempts: 1 };
}
