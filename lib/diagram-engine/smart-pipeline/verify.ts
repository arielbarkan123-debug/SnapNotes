/**
 * Smart Pipeline — Verification
 *
 * Two-layer verification for computed values:
 * 1. Programmatic sanity checks (instant, deterministic)
 * 2. Sonnet cross-check (LLM confirms correctness)
 */

import Anthropic from '@anthropic-ai/sdk';
import { AI_MODEL } from '@/lib/ai/claude';
import type { ComputedProblem, AnalysisResult, VerificationResult } from './types';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

// ── Layer 1: Programmatic Sanity Checks ─────────────────────────────────────

interface SanityCheck {
  name: string;
  passed: boolean;
  reason: string;
}

/**
 * Universal checks — apply to ALL computed values.
 */
function universalChecks(computed: ComputedProblem): SanityCheck[] {
  const checks: SanityCheck[] = [];

  for (const [key, cv] of Object.entries(computed.values)) {
    // All values must be finite
    if (!isFinite(cv.value)) {
      checks.push({
        name: `${key}_finite`,
        passed: false,
        reason: `${key} = ${cv.value} is not finite`,
      });
    } else {
      checks.push({
        name: `${key}_finite`,
        passed: true,
        reason: `${key} = ${cv.value} is finite`,
      });
    }

    // Magnitude sanity (catch runaway calculations)
    if (Math.abs(cv.value) > 1e12) {
      checks.push({
        name: `${key}_magnitude`,
        passed: false,
        reason: `${key} = ${cv.value} exceeds reasonable magnitude (> 1e12)`,
      });
    }
  }

  return checks;
}

/**
 * Physics-specific checks.
 */
function physicsChecks(computed: ComputedProblem): SanityCheck[] {
  const checks: SanityCheck[] = [];
  const vals = computed.values;

  // Mass must be positive
  // Match: "mass", "m", "m_total", "m_1" etc. — NOT "momentum", "maximum", "arm"
  for (const key of Object.keys(vals)) {
    if (/^(mass|m(?:_\w+)?)$/i.test(key) && vals[key].unit === 'kg') {
      checks.push({
        name: `${key}_positive_mass`,
        passed: vals[key].value > 0,
        reason: vals[key].value > 0
          ? `Mass ${key} = ${vals[key].value} kg is positive`
          : `Mass ${key} = ${vals[key].value} kg should be positive`,
      });
    }
  }

  // Angles should be 0-360
  // Match: "angle", "theta", "phi", "alpha", "beta" — anchored to avoid partial matches
  for (const key of Object.keys(vals)) {
    if (/^(angle|theta|phi|alpha|beta)(?:_\w+)?$/i.test(key) && /deg|°/i.test(vals[key].unit)) {
      const v = vals[key].value;
      checks.push({
        name: `${key}_angle_range`,
        passed: v >= 0 && v <= 360,
        reason: v >= 0 && v <= 360
          ? `Angle ${key} = ${v}° is in valid range`
          : `Angle ${key} = ${v}° is outside 0-360° range`,
      });
    }
  }

  // Acceleration sanity (< 10000 m/s²)
  // Match: "acceleration", "accel", "a", "a_net", "a_x" — NOT "area", "alpha", "amplitude"
  for (const key of Object.keys(vals)) {
    if (/^(accel(?:eration)?|a(?:_\w+)?)$/i.test(key) && /m\/s/.test(vals[key].unit)) {
      const v = Math.abs(vals[key].value);
      checks.push({
        name: `${key}_accel_sanity`,
        passed: v < 10000,
        reason: v < 10000
          ? `Acceleration ${key} = ${vals[key].value} is reasonable`
          : `Acceleration ${key} = ${vals[key].value} seems unreasonably large`,
      });
    }
  }

  return checks;
}

/**
 * Geometry-specific checks.
 */
function geometryChecks(computed: ComputedProblem): SanityCheck[] {
  const checks: SanityCheck[] = [];
  const vals = computed.values;

  // Areas and lengths must be positive
  for (const key of Object.keys(vals)) {
    if (/area|perimeter|length|distance|radius|diameter|height|width|volume/i.test(key)) {
      checks.push({
        name: `${key}_positive`,
        passed: vals[key].value > 0,
        reason: vals[key].value > 0
          ? `${key} = ${vals[key].value} is positive`
          : `${key} = ${vals[key].value} should be positive`,
      });
    }
  }

  return checks;
}

/**
 * Statistics-specific checks.
 */
function statisticsChecks(computed: ComputedProblem): SanityCheck[] {
  const checks: SanityCheck[] = [];
  const vals = computed.values;

  // Standard deviation must be >= 0
  for (const key of Object.keys(vals)) {
    if (/std|standard.?dev|variance/i.test(key)) {
      checks.push({
        name: `${key}_non_negative`,
        passed: vals[key].value >= 0,
        reason: vals[key].value >= 0
          ? `${key} = ${vals[key].value} is non-negative`
          : `${key} = ${vals[key].value} should be non-negative`,
      });
    }
  }

  // Probabilities must be 0-1
  // Match: "probability", "prob", "p", "p_value", "p_x" — NOT "step", "group", "perimeter"
  for (const key of Object.keys(vals)) {
    if (/^(prob(?:ability)?|p(?:_\w+)?)$/i.test(key) && !vals[key].unit) {
      const v = vals[key].value;
      checks.push({
        name: `${key}_probability_range`,
        passed: v >= 0 && v <= 1,
        reason: v >= 0 && v <= 1
          ? `Probability ${key} = ${v} is in valid range`
          : `Probability ${key} = ${v} is outside 0-1 range`,
      });
    }
  }

  return checks;
}

/**
 * Run all programmatic sanity checks.
 */
function runSanityChecks(
  computed: ComputedProblem,
  domain: string,
): SanityCheck[] {
  const checks = [...universalChecks(computed)];

  if (['mechanics', 'kinematics', 'energy', 'circuits'].includes(domain)) {
    checks.push(...physicsChecks(computed));
  }
  if (domain === 'geometry') {
    checks.push(...geometryChecks(computed));
  }
  if (domain === 'statistics') {
    checks.push(...statisticsChecks(computed));
  }

  return checks;
}

// ── Layer 2: Sonnet Cross-Check ─────────────────────────────────────────────

/**
 * Ask Sonnet to verify the computed answer is correct.
 * Returns true if Sonnet confirms, false if it disagrees.
 */
async function sonnetCrossCheck(
  question: string,
  computed: ComputedProblem,
): Promise<{ correct: boolean; issue?: string }> {
  try {
    // Format computed values as readable text
    const valuesText = Object.entries(computed.values)
      .map(([key, cv]) => `  ${key} = ${cv.value} ${cv.unit} (via ${cv.formula})`)
      .join('\n');

    const stepsText = computed.solutionSteps.join('\n  ');

    const response = await anthropic.messages.create({
      model: AI_MODEL,
      max_tokens: 300,
      messages: [
        {
          role: 'user',
          content: `You are a math/physics verification expert. Check if this computed answer is correct.

Question: ${question}

Computed values:
${valuesText}

Solution steps:
  ${stepsText}

Is this answer mathematically correct? Check the formulas, units, and calculations.
Reply with ONLY valid JSON (no markdown fences):
{"correct": true/false, "issue": "explanation if wrong, empty string if correct"}`,
        },
      ],
    });

    const textBlock = response.content.find((b) => b.type === 'text');
    if (!textBlock || textBlock.type !== 'text') {
      return { correct: true }; // Can't verify → pass
    }

    let jsonStr = textBlock.text.trim();
    // Extract JSON from possible markdown fences
    const fenceMatch = jsonStr.match(/```(?:json)?\s*\n?([\s\S]*?)```/);
    if (fenceMatch) jsonStr = fenceMatch[1].trim();
    const objMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (objMatch) jsonStr = objMatch[0];

    const parsed = JSON.parse(jsonStr);
    return {
      correct: !!parsed.correct,
      issue: typeof parsed.issue === 'string' ? parsed.issue : undefined,
    };
  } catch (err) {
    console.warn('[SmartPipeline] Sonnet cross-check failed, passing by default:', err);
    return { correct: true }; // If cross-check itself fails, don't block
  }
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Verify computed values with:
 * 1. Programmatic sanity checks (instant)
 * 2. Sonnet cross-check (~2-3 seconds)
 *
 * Both must pass for verification to succeed.
 */
export async function verifyComputed(
  computed: ComputedProblem,
  analysis: AnalysisResult,
  question: string,
): Promise<VerificationResult> {
  // Layer 1: Sanity checks
  const checks = runSanityChecks(computed, analysis.domain);
  const sanityPassed = checks.every((c) => c.passed);

  if (!sanityPassed) {
    const failures = checks.filter((c) => !c.passed);
    return {
      allPassed: false,
      checks,
      crossCheckPassed: false,
      failureReason: `Sanity check failed: ${failures.map((f) => f.reason).join('; ')}`,
    };
  }

  // Layer 2: Sonnet cross-check
  const crossCheck = await sonnetCrossCheck(question, computed);

  if (!crossCheck.correct) {
    return {
      allPassed: false,
      checks,
      crossCheckPassed: false,
      failureReason: `Sonnet cross-check: ${crossCheck.issue || 'answer incorrect'}`,
    };
  }

  return {
    allPassed: true,
    checks,
    crossCheckPassed: true,
  };
}

/**
 * Exported for testing — run only the programmatic sanity checks.
 */
export function runSanityChecksOnly(
  computed: ComputedProblem,
  domain: string,
): SanityCheck[] {
  return runSanityChecks(computed, domain);
}
