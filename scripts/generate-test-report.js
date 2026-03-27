#!/usr/bin/env node
/* eslint-disable @typescript-eslint/no-var-requires */
/**
 * generate-test-report.js
 *
 * Aggregates results from Jest, Playwright, Lighthouse CI and coverage into a
 * single test-report.json used by CI for PR comments and dashboards.
 *
 * Reads (all optional):
 *   - jest-results.json
 *   - playwright-report/results.json
 *   - .lighthouseci/*.json
 *   - coverage/coverage-summary.json
 *
 * Writes:
 *   - test-report.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function readJsonSafe(filePath) {
  try {
    const abs = path.resolve(ROOT, filePath);
    if (!fs.existsSync(abs)) {
      console.warn(`[report] WARNING: ${filePath} not found — skipping.`);
      return null;
    }
    return JSON.parse(fs.readFileSync(abs, 'utf8'));
  } catch (err) {
    console.warn(`[report] WARNING: failed to read ${filePath}: ${err.message}`);
    return null;
  }
}

function globJsonFiles(dir) {
  const abs = path.resolve(ROOT, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith('.json'))
    .map((f) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(abs, f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
}

function gitInfo() {
  try {
    const sha = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: ROOT })
      .toString()
      .trim();
    const branch = execFileSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], {
      cwd: ROOT,
    })
      .toString()
      .trim();
    const author = execFileSync('git', ['log', '-1', '--format=%an'], {
      cwd: ROOT,
    })
      .toString()
      .trim();
    return { sha, branch, author };
  } catch {
    return { sha: 'unknown', branch: 'unknown', author: 'unknown' };
  }
}

/** Map a test file path to the most-likely source file it covers. */
function deriveSourceFile(testPath) {
  if (!testPath) return null;
  return testPath
    .replace(/__tests__\//, '')
    .replace(/\.test\.(ts|tsx|js|jsx)$/, '.$1')
    .replace(/\.spec\.(ts|tsx|js|jsx)$/, '.$1')
    .replace(/^e2e\//, 'app/');
}

/** Classify a test-path into a layer. */
function classifyLayer(testPath) {
  if (!testPath) return 'unit_tests';
  if (testPath.includes('e2e') || testPath.includes('playwright')) {
    if (testPath.includes('visual')) return 'visual_regression';
    return 'e2e';
  }
  if (testPath.includes('api') || testPath.includes('integration'))
    return 'api_integration';
  if (testPath.includes('a11y') || testPath.includes('accessibility'))
    return 'accessibility';
  return 'unit_tests';
}

/** Infer severity from test name + layer. */
function classifySeverity(layer, testName) {
  const name = (testName || '').toLowerCase();
  if (
    layer === 'e2e' ||
    name.includes('auth') ||
    name.includes('login') ||
    name.includes('payment')
  )
    return 'critical';
  if (layer === 'api_integration' || name.includes('api')) return 'high';
  if (layer === 'visual_regression') return 'medium';
  return 'low';
}

/** Guess a category from the test name / path. */
function classifyCategory(testPath, testName) {
  const combined = `${testPath || ''} ${testName || ''}`.toLowerCase();
  if (combined.includes('auth') || combined.includes('login'))
    return 'authentication';
  if (combined.includes('course') || combined.includes('lesson'))
    return 'courses';
  if (combined.includes('exam')) return 'exams';
  if (combined.includes('srs') || combined.includes('review'))
    return 'spaced_repetition';
  if (combined.includes('diagram') || combined.includes('math'))
    return 'diagrams';
  if (combined.includes('homework') || combined.includes('tutor'))
    return 'homework';
  if (combined.includes('i18n') || combined.includes('locale'))
    return 'internationalization';
  if (combined.includes('upload') || combined.includes('image'))
    return 'media';
  return 'general';
}

// ---------------------------------------------------------------------------
// Processors
// ---------------------------------------------------------------------------

function processJest(data) {
  if (!data) return { passed: 0, failed: 0, skipped: 0, failures: [] };

  const failures = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const suite of data.testResults || []) {
    for (const t of suite.testResults || []) {
      if (t.status === 'passed') {
        passed++;
      } else if (t.status === 'failed') {
        failed++;
        const testPath = path.relative(ROOT, suite.testFilePath || '');
        const layer = classifyLayer(testPath);
        failures.push({
          name: t.fullName || t.title || 'Unknown test',
          testFile: testPath,
          sourceFile: deriveSourceFile(testPath),
          layer,
          category: classifyCategory(testPath, t.fullName),
          severity: classifySeverity(layer, t.fullName),
          message:
            (t.failureMessages || []).join('\n').slice(0, 500) || 'No message',
          duration: t.duration || 0,
        });
      } else {
        skipped++;
      }
    }
  }

  return { passed, failed, skipped, failures };
}

function processPlaywright(data) {
  if (!data)
    return { passed: 0, failed: 0, flaky: 0, skipped: 0, failures: [] };

  const failures = [];
  const flakyTests = [];
  let passed = 0;
  let failed = 0;
  let flaky = 0;
  let skipped = 0;

  for (const suite of data.suites || []) {
    walkPlaywrightSuite(suite, '', failures, flakyTests, (counts) => {
      passed += counts.passed;
      failed += counts.failed;
      flaky += counts.flaky;
      skipped += counts.skipped;
    });
  }

  return { passed, failed, flaky, skipped, failures, flakyTests };
}

function walkPlaywrightSuite(suite, parentTitle, failures, flakyTests, count) {
  const title = [parentTitle, suite.title].filter(Boolean).join(' > ');

  for (const spec of suite.specs || []) {
    for (const test of spec.tests || []) {
      const status = test.status || test.expectedStatus;
      const testPath = spec.file || '';

      if (status === 'expected') {
        count({ passed: 1, failed: 0, flaky: 0, skipped: 0 });
      } else if (status === 'flaky') {
        count({ passed: 0, failed: 0, flaky: 1, skipped: 0 });
        flakyTests.push({
          name: `${title} > ${spec.title}`,
          testFile: testPath,
          retries: (test.results || []).length,
        });
      } else if (status === 'unexpected') {
        count({ passed: 0, failed: 1, flaky: 0, skipped: 0 });
        const lastResult = (test.results || []).slice(-1)[0] || {};
        const layer = classifyLayer(testPath);
        failures.push({
          name: `${title} > ${spec.title}`,
          testFile: testPath,
          sourceFile: deriveSourceFile(testPath),
          layer,
          category: classifyCategory(testPath, spec.title),
          severity: classifySeverity(layer, spec.title),
          message: (lastResult.error?.message || 'No message').slice(0, 500),
          duration: lastResult.duration || 0,
        });
      } else {
        count({ passed: 0, failed: 0, flaky: 0, skipped: 1 });
      }
    }
  }

  for (const child of suite.suites || []) {
    walkPlaywrightSuite(child, title, failures, flakyTests, count);
  }
}

function processLighthouse(files) {
  if (!files.length)
    return { scores: {}, coreWebVitals: {}, failedAudits: [] };

  // Take the first report (usually there's one aggregated run)
  const lhr = files[0].lhr || files[0];

  const scores = {
    performance: lhr.categories?.performance?.score ?? null,
    accessibility: lhr.categories?.accessibility?.score ?? null,
    bestPractices: lhr.categories?.['best-practices']?.score ?? null,
    seo: lhr.categories?.seo?.score ?? null,
  };

  const audits = lhr.audits || {};
  const coreWebVitals = {
    fcp: audits['first-contentful-paint']?.numericValue ?? null,
    lcp: audits['largest-contentful-paint']?.numericValue ?? null,
    cls: audits['cumulative-layout-shift']?.numericValue ?? null,
    tbt: audits['total-blocking-time']?.numericValue ?? null,
  };

  const failedAudits = Object.entries(audits)
    .filter(([, a]) => a.score !== null && a.score < 0.5)
    .map(([id, a]) => ({
      id,
      title: a.title,
      score: a.score,
      displayValue: a.displayValue || null,
    }))
    .slice(0, 20);

  return { scores, coreWebVitals, failedAudits };
}

function processCoverage(data) {
  if (!data) return { summary: {}, criticalUncovered: [] };

  const total = data.total || {};
  const summary = {
    lines: total.lines?.pct ?? null,
    statements: total.statements?.pct ?? null,
    functions: total.functions?.pct ?? null,
    branches: total.branches?.pct ?? null,
  };

  const criticalUncovered = [];
  for (const [filePath, info] of Object.entries(data)) {
    if (filePath === 'total') continue;
    const linePct = info.lines?.pct ?? 100;
    if (linePct < 50) {
      criticalUncovered.push({
        file: filePath,
        lineCoverage: linePct,
        branchCoverage: info.branches?.pct ?? null,
      });
    }
  }

  criticalUncovered.sort((a, b) => a.lineCoverage - b.lineCoverage);

  return { summary, criticalUncovered: criticalUncovered.slice(0, 30) };
}

// ---------------------------------------------------------------------------
// Group related failures
// ---------------------------------------------------------------------------

function groupFailuresBySource(allFailures) {
  const groups = {};
  for (const f of allFailures) {
    const key = f.sourceFile || f.testFile || 'unknown';
    if (!groups[key]) {
      groups[key] = { sourceFile: key, failures: [] };
    }
    groups[key].failures.push(f);
  }
  return Object.values(groups).filter((g) => g.failures.length > 1);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

try {
  console.log('[report] Generating test report...');

  const jestData = readJsonSafe('jest-results.json');
  const playwrightData = readJsonSafe('playwright-report/results.json');
  const lighthouseFiles = globJsonFiles('.lighthouseci');
  const coverageData = readJsonSafe('coverage/coverage-summary.json');

  const jest = processJest(jestData);
  const playwright = processPlaywright(playwrightData);
  const lighthouse = processLighthouse(lighthouseFiles);
  const coverage = processCoverage(coverageData);

  const allFailures = [...jest.failures, ...playwright.failures];

  const report = {
    generated_at: new Date().toISOString(),
    git: gitInfo(),

    summary: {
      total_passed: jest.passed + playwright.passed,
      total_failed: jest.failed + playwright.failed,
      total_skipped: jest.skipped + playwright.skipped,
      flaky_tests: playwright.flaky,
      pass_rate:
        jest.passed + playwright.passed + jest.failed + playwright.failed > 0
          ? +(
              ((jest.passed + playwright.passed) /
                (jest.passed +
                  playwright.passed +
                  jest.failed +
                  playwright.failed)) *
              100
            ).toFixed(1)
          : 100,
    },

    failures: allFailures,
    failure_groups: groupFailuresBySource(allFailures),

    flaky_tests: playwright.flakyTests || [],

    lighthouse,
    coverage,

    severity_counts: {
      critical: allFailures.filter((f) => f.severity === 'critical').length,
      high: allFailures.filter((f) => f.severity === 'high').length,
      medium: allFailures.filter((f) => f.severity === 'medium').length,
      low: allFailures.filter((f) => f.severity === 'low').length,
    },

    layer_counts: {
      unit_tests: allFailures.filter((f) => f.layer === 'unit_tests').length,
      api_integration: allFailures.filter((f) => f.layer === 'api_integration')
        .length,
      e2e: allFailures.filter((f) => f.layer === 'e2e').length,
      accessibility: allFailures.filter((f) => f.layer === 'accessibility')
        .length,
      visual_regression: allFailures.filter(
        (f) => f.layer === 'visual_regression'
      ).length,
    },
  };

  const outPath = path.join(ROOT, 'test-report.json');
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2));
  console.log(`[report] Written to ${outPath}`);
  console.log(
    `[report] Summary: ${report.summary.total_passed} passed, ${report.summary.total_failed} failed, ${report.summary.flaky_tests} flaky`
  );
  process.exit(0);
} catch (err) {
  console.error('[report] Fatal error:', err);

  // Write a fallback report so CI never breaks
  const fallback = {
    generated_at: new Date().toISOString(),
    git: { sha: 'unknown', branch: 'unknown', author: 'unknown' },
    error: String(err),
    summary: {
      total_passed: 0,
      total_failed: 0,
      total_skipped: 0,
      flaky_tests: 0,
      pass_rate: 0,
    },
    failures: [],
    failure_groups: [],
    flaky_tests: [],
    lighthouse: { scores: {}, coreWebVitals: {}, failedAudits: [] },
    coverage: { summary: {}, criticalUncovered: [] },
    severity_counts: { critical: 0, high: 0, medium: 0, low: 0 },
    layer_counts: {
      unit_tests: 0,
      api_integration: 0,
      e2e: 0,
      accessibility: 0,
      visual_regression: 0,
    },
  };

  fs.writeFileSync(
    path.join(__dirname, '..', 'test-report.json'),
    JSON.stringify(fallback, null, 2)
  );
  console.log('[report] Wrote fallback report due to error.');
  process.exit(0);
}
