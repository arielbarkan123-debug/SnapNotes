/**
 * Smart Pipeline — Problem Analysis
 *
 * Uses Sonnet to analyze a student question and generate SymPy code
 * that will compute all unknowns deterministically.
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';
import type { AnalysisResult } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

/**
 * Extract the first valid top-level JSON object from a string
 * using balanced-brace counting (not greedy regex).
 *
 * If the first balanced-brace extraction fails to parse as JSON,
 * retries from the next '{' to handle text with stray braces before
 * the actual JSON (e.g., "if x > 0 { ... } then {"domain": ...}").
 */
function extractTopLevelJson(text: string): Record<string, unknown> | null {
  let searchFrom = 0;

  while (searchFrom < text.length) {
    const start = text.indexOf('{', searchFrom);
    if (start === -1) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let endFound = false;

    for (let i = start; i < text.length; i++) {
      const ch = text[i];

      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\' && inString) {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;

      if (ch === '{') depth++;
      else if (ch === '}') {
        depth--;
        if (depth === 0) {
          try {
            return JSON.parse(text.slice(start, i + 1));
          } catch {
            // This balanced-brace pair wasn't valid JSON — try next '{'
            searchFrom = start + 1;
            endFound = true;
            break;
          }
        }
      }
    }

    // If we reached end of string without finding balanced close, give up
    if (!endFound) return null;
  }
  return null;
}

const ANALYSIS_PROMPT = `You are a math/physics problem analyzer. Given a student's question, extract the problem structure and generate SymPy code to compute ALL unknowns.

OUTPUT: Return ONLY valid JSON with this structure (no markdown fences, no explanation):
{
  "domain": "<mechanics|kinematics|energy|circuits|algebra|calculus|trigonometry|statistics|geometry|general_math>",
  "problemType": "<descriptive_snake_case_name>",
  "givenValues": { "<name>": { "value": <number>, "unit": "<unit>" } },
  "unknowns": ["<name1>", "<name2>"],
  "formulas": ["<formula1>", "<formula2>"],
  "sympyCode": "<complete Python code as a single string — use \\n for newlines>",
  "diagramHints": {
    "diagramType": "<fbd|graph|geometry|circuit|etc>",
    "elementsToShow": ["<element1>", "<element2>"]
  }
}

SYMPY CODE RULES:
1. Import ONLY: sympy, math, json, sys. No other packages.
2. Use float() to convert ALL SymPy types to plain Python floats before JSON serialization.
3. Compute ALL unknowns listed. Include step-by-step solution strings.
4. The code MUST print a single JSON object to stdout using: print(json.dumps(result))
5. The "result" dict MUST have keys "values" and "solutionSteps".
6. Each value in "values" must be: {"name": "...", "value": <float>, "unit": "...", "formula": "...", "step": "..."}
7. "solutionSteps" must be a list of strings like ["Step 1: ...", "Step 2: ..."]
8. Round numeric values to 4 significant figures using round(val, 4) or appropriate precision.
9. Code MUST be self-contained and executable without any errors.
10. Do NOT use input() or any interactive functions.
11. Use g = 9.8 m/s^2 for gravity unless the question specifies otherwise.
12. For trigonometry, sympy.sin/cos/tan expect radians. Convert degrees: sympy.rad(degrees).

EXAMPLE for "An 80 kg box on a 30 degree incline with friction coefficient 0.2":
The sympyCode should compute: weight, normal force, friction force, net force, acceleration
and output them as a structured JSON with solution steps.

QUESTION: `;

/**
 * Analyze a question and generate SymPy code for computation.
 *
 * Returns null if analysis fails (triggers fallback to current pipeline).
 */
export async function analyzeQuestion(question: string): Promise<AnalysisResult | null> {
  try {
    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 2048,
      messages: [
        {
          role: 'user',
          content: ANALYSIS_PROMPT + question,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      console.warn('[SmartPipeline] Analysis returned no text');
      return null;
    }

    let jsonStr = textBlock.text.trim();

    // Extract JSON from possible markdown fences (non-greedy)
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();

    // For the analysis response, the entire response should be a single JSON object.
    // Use a balanced-brace approach to find the top-level JSON object.
    const raw = extractTopLevelJson(jsonStr);
    if (!raw) {
      console.warn('[SmartPipeline] Could not parse analysis JSON');
      return null;
    }

    // Validate required fields exist and have correct types
    if (!raw.domain || typeof raw.domain !== 'string') {
      console.warn('[SmartPipeline] Analysis missing or invalid "domain"');
      return null;
    }
    if (!raw.sympyCode || typeof raw.sympyCode !== 'string') {
      console.warn('[SmartPipeline] Analysis missing or invalid "sympyCode"');
      return null;
    }
    if (!Array.isArray(raw.unknowns) || raw.unknowns.length === 0) {
      console.warn('[SmartPipeline] Analysis missing or empty "unknowns"');
      return null;
    }
    // Default optional fields
    if (!raw.problemType || typeof raw.problemType !== 'string') {
      console.warn('[SmartPipeline] Analysis missing "problemType", defaulting');
      raw.problemType = 'unknown';
    }
    if (!raw.givenValues || typeof raw.givenValues !== 'object') {
      console.warn('[SmartPipeline] Analysis missing "givenValues", defaulting to empty');
      raw.givenValues = {};
    }
    if (!Array.isArray(raw.formulas)) {
      raw.formulas = [];
    }
    if (!raw.diagramHints || typeof raw.diagramHints !== 'object') {
      raw.diagramHints = {
        diagramType: '',
        elementsToShow: [],
      };
    }

    return raw as unknown as AnalysisResult;
  } catch (err) {
    console.warn('[SmartPipeline] Analysis failed:', err instanceof Error ? err.message : err);
    return null;
  }
}
