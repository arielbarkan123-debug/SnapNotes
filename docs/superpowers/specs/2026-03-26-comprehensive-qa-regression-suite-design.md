# NoteSnap Comprehensive QA & Regression Test Suite — Design Spec

**Date:** 2026-03-26
**Status:** Draft (Rev 2 — post-review fixes)
**Author:** QA Architecture Session

## 1. Goal

Build an automated test suite that catches **every possible regression** — from algorithm bugs to visual breakage to auth bypass — before any code reaches production. Every test run produces a machine-readable report with exact file:line references that can be handed to Claude to fix.

## 1.1 Prerequisites — New Dependencies

| Package | Purpose | Why |
|---------|---------|-----|
| `zod` | API response schema validation | Contract testing between frontend/backend |
| `@playwright/test` | E2E browser tests | User journey testing |
| `@axe-core/playwright` | Accessibility auditing in E2E | WCAG 2.2 AA compliance |
| `jest-axe` | Accessibility auditing in unit tests | Component-level a11y |
| `@lhci/cli` | Lighthouse CI | Performance regression budgets |
| `wait-on` | Wait for server in CI | Lighthouse needs running server |

## 1.2 Existing Test Baseline

**Current state (as of 2026-03-26):** 53 test files, **1,064 passing tests**, 3 second runtime. All tests are Jest unit/integration tests — no E2E, no accessibility, no visual regression, no performance budgets, no post-deploy smoke tests.

The spec below defines **net-new tests** to add on top of the existing 1,064. Where existing tests already cover a module, the spec notes "existing" and defines only the gaps.

## 2. System Under Test — Scope

| Dimension | Count |
|-----------|-------|
| API routes | 131 endpoints |
| User-facing pages | 49 pages |
| Library modules | 337 files across 47 directories |
| Custom hooks | 25 hooks in `/hooks/` |
| Diagram components | 100+ SVG/React components |
| i18n languages | 2 (English + Hebrew with RTL) |
| Diagram schemas | 102 |
| TikZ templates | 50+ |
| Curriculum systems | 5 (IB, AP, A-Levels, Bagrut, US) |

## 3. Test Architecture — 8-Layer Pyramid

```
Layer 8: Post-Deploy Smoke Tests (Playwright vs production)     ~10 tests
Layer 7: Visual Regression (Playwright screenshot diffs)        ~25 comparisons (incl. dark mode)
Layer 6: Performance Budgets (Lighthouse CI on key pages)       ~8 pages
Layer 5: Accessibility (axe-core in Jest + Playwright)          ~60 checks
Layer 4: E2E Tests (Playwright browser journeys)                ~70 tests
Layer 3: API Integration Tests (Jest, mocked Supabase)          ~550 tests (131 routes x ~4 avg)
Layer 2: Unit Tests (Jest, pure logic)                          ~450 tests
Layer 1: Static Analysis (TypeScript + ESLint + npm audit)      continuous
```

**Existing tests:** 1,064
**Net-new tests:** ~750-850
**Total target: ~1,800+ automated checks**
**CI target: ~14 minutes** (with proper caching — see Section 12)

## 4. Layer 1 — Static Analysis

### 4.1 TypeScript Strict Mode
- Already exists: `tsc --noEmit`
- **Change needed:** Remove `--passWithNoTests` from GitHub Actions CI

### 4.2 ESLint
- Already exists: `next lint`
- **Add:** `eslint-plugin-testing-library` for test file linting
- **Add:** `eslint-plugin-jest` for test best practices

### 4.3 Security Audit
- **Add:** `npm audit --audit-level=high` as CI step
- Fails CI if high/critical vulnerabilities found in dependencies
- **Add:** GitHub Dependabot alerts (async, not in CI path)

## 5. Layer 2 — Unit Tests (Jest)

Pure logic tests. No network, no DB, all dependencies mocked. Tests are organized to mirror `lib/` directory structure.

### 5.1 Core Algorithms (P0 — Critical)

These are the mathematical/algorithmic foundations. A regression here silently corrupts student learning.

#### 5.1.1 FSRS Spaced Repetition (`lib/srs/`)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/srs/fsrs.test.ts` | `fsrs.ts` | ~20 | Difficulty calculation for all ratings (Again/Hard/Good/Easy), stability decay over time, interval scheduling accuracy, retrievability curve, first-review behavior, lapse handling, parameter bounds |
| `__tests__/lib/srs/fsrs-optimizer.test.ts` | `fsrs-optimizer.ts` | ~10 | Parameter optimization convergence, edge cases (no review history, single review), per-user personalization accuracy |
| `__tests__/lib/srs/card-generator.test.ts` | `card-generator.ts` | ~15 | Card generation from every StepType (explanation, question, formula, diagram, worked_example, practice_problem, etc.), deduplication, question type distribution (MCQ, true/false, fill-blank, matching, sequence, multi-select) |
| `__tests__/lib/srs/daily-session.test.ts` | `daily-session.ts` | ~10 | Due card selection respects daily limits, gap-aware scheduling, overdue card prioritization, new vs review card ratio |

#### 5.1.2 Answer Evaluation (`lib/evaluation/`, `lib/homework/`)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/evaluation/answer-checker.test.ts` | `answer-checker.ts` | ~25 | Exact string match, case insensitivity, numeric tolerance (±0.01), LaTeX expression equivalence (`\frac{1}{2}` = `0.5`), partial credit scoring, multi-part answers, Hebrew text matching, whitespace handling, special characters |
| `__tests__/lib/homework/math-verifier.test.ts` | `math-verifier.ts` | ~20 | Symbolic algebra verification, floating point comparison, fraction simplification, expression equivalence (`2x + 3` = `3 + 2x`), inequality handling, unit conversion, edge cases (division by zero, infinity) |
| `__tests__/lib/homework/hint-generator.test.ts` | `hint-generator.ts` | ~15 | All 5 hint levels (nudge → full solution), progressive disclosure (level N+1 reveals more than level N), math-specific hints, context-appropriate hints per subject |
| `__tests__/lib/homework/checker-engine.test.ts` | `checker-engine.ts` | ~15 | Full homework checking pipeline, image-based problem detection, answer extraction, grading accuracy |

#### 5.1.3 Adaptive Learning (`lib/adaptive/`)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/adaptive/question-selector.test.ts` | `question-selector.ts` | ~15 | IRT ability estimation accuracy, 75% success rate targeting, streak-based bonus calculation, difficulty bounds enforcement, cold-start behavior (new student) |
| `__tests__/lib/adaptive/realtime-adjuster.test.ts` | `realtime-adjuster.ts` | ~10 | Real-time performance tracking, difficulty adjustment speed, oscillation prevention |
| `__tests__/lib/adaptive/mastery.test.ts` | `mastery.ts` | ~8 | Mastery detection thresholds, mastery regression on incorrect answers |

### 5.2 AI Pipeline (P0 — Prompt Integrity)

These don't call real AI — they verify prompt construction and output parsing.

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/ai/prompts.test.ts` | `prompts.ts` | ~12 | All prompt templates render correctly, variable injection works, no template syntax leaks, token budget enforcement, language-specific prompts (EN/HE) |
| `__tests__/lib/ai/content-classifier.test.ts` | `content-classifier.ts` | ~10 | Classifies course content vs reference material, language detection accuracy, subject detection for all 5 curriculum systems |
| `__tests__/lib/ai/course-validator.test.ts` | `course-validator.ts` | ~12 | Validates GeneratedCourse structure, catches missing lessons, invalid StepTypes, empty content, malformed JSON from AI |
| `__tests__/lib/ai/language.test.ts` | `language.ts` | ~8 | Language detection for EN, HE, mixed content, edge cases |
| `__tests__/lib/ai/output-parser.test.ts` | (new) | ~20 | **AI Output Parsing Tests** — Mock Claude responses (valid, malformed, truncated, unexpected schema, empty, timeout), verify parsers handle every edge case. Test with real failure examples: missing `lessons` array, invalid `StepType`, truncated JSON, extra fields, null values where objects expected |

### 5.3 Diagram Engine (P1)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/diagram-engine/router.test.ts` | `router.ts` | ~15 | Routes to correct pipeline for each diagram type (TikZ for geometry, Recraft for illustrations, Desmos for graphs, GeoGebra for interactive), fallback chain when primary pipeline fails |
| `__tests__/lib/diagram-engine/step-renderer.test.ts` | `step-renderer.ts` | ~10 | Step-by-step walkthrough rendering, step ordering, label positioning |
| `__tests__/lib/diagram-engine/smart-pipeline/*.test.ts` | smart-pipeline | ~20 | Pre-computation with SymPy (correct values injected), needs-computation detection, injection into TikZ/Recraft, verification of computed values |
| `__tests__/lib/diagram-engine/tikz-validator.test.ts` | `tikz-validator.ts` | ~10 | Valid TikZ syntax passes, common errors caught (unclosed braces, undefined commands, missing packages) |
| `__tests__/lib/diagram-engine/label-pipeline.test.ts` | `label-pipeline.ts` | ~10 | Label detection accuracy, overlay positioning, collision avoidance |
| `__tests__/lib/diagram-schemas.test.ts` | `diagram-schemas/` | ~15 | All 102 schemas validate against their TypeScript types, required fields present, enum values valid |
| `__tests__/lib/diagram-engine/step-capture/*.test.ts` | step-capture | ~20 | TikZ layer capture, Recraft progressive reveal, matplotlib step capture, LaTeX step capture, upload step handling, metadata parsing |

### 5.4 Content Processing (P1)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/documents/pdf.test.ts` | `pdf.ts` | ~10 | Text extraction, image extraction, multi-page handling, encrypted PDF handling, empty PDF, corrupted file |
| `__tests__/lib/documents/pptx.test.ts` | `pptx.ts` | ~10 | Slide extraction, text from shapes, image extraction, slide ordering |
| `__tests__/lib/documents/docx.test.ts` | `docx.ts` | ~10 | Paragraph extraction, formatting preservation, table extraction, image extraction |
| `__tests__/lib/extraction/confidence-scorer.test.ts` | `confidence-scorer.ts` | ~10 | Scoring accuracy for clean text, OCR text with artifacts, mixed language, math-heavy content |
| `__tests__/lib/normalize-latex.test.ts` | `normalize-latex.ts` | ~15 | LaTeX normalization: `\frac` variations, superscripts, subscripts, Greek letters, matrix notation, edge cases |

### 5.5 Gamification & Personalization (P2)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/gamification/xp.test.ts` | `xp.ts` | ~10 | XP calculation for every action type, age-adaptive XP multipliers, XP cap enforcement |
| `__tests__/lib/gamification/achievements.test.ts` | `achievements.ts` | ~15 | Every achievement unlock condition, edge cases (simultaneous unlocks, re-trigger prevention), badge metadata |
| `__tests__/lib/gamification/streak.test.ts` | `streak.ts` | ~12 | Streak increment, streak break detection, timezone-aware day boundaries, streak freeze mechanic, longest streak tracking |
| `__tests__/lib/student-context/fatigue-detector.test.ts` | `fatigue-detector.ts` | ~8 | Fatigue signal detection (declining accuracy, long response times), session length thresholds, cooldown recommendations |
| `__tests__/lib/profile/recommendations.test.ts` | `recommendations.ts` | ~10 | Recommendation ranking, topic diversity, cold-start recommendations (new user), recommendation refresh |
| `__tests__/lib/curriculum/context-builder.test.ts` | `context-builder.ts` | ~12 | Context built correctly for IB, AP, A-Levels, Bagrut, US curriculum systems. Grade-appropriate content, exam format alignment |

### 5.6 Utilities & Data (P2)

| Test File | Module | Tests | Coverage |
|-----------|--------|-------|----------|
| `__tests__/lib/utils/math-format.test.ts` | `math-format.ts` | ~15 | Number formatting, LaTeX display, fraction rendering, scientific notation, edge cases (NaN, Infinity, very large numbers) |
| `__tests__/lib/utils/error-sanitizer.test.ts` | `error-sanitizer.ts` | ~10 | PII removal from error messages, stack trace sanitization, API key redaction |
| `__tests__/lib/rich-text-utils.test.ts` | `rich-text-utils.ts` | ~10 | Rich text parsing, markdown-to-HTML, LaTeX embedding, Hebrew text handling |
| `__tests__/lib/past-exams/style-guide.test.ts` | `style-guide.ts` | ~8 | Exam style extraction, difficulty distribution analysis |
| `__tests__/lib/feedback/age-adaptive-feedback.test.ts` | `age-adaptive-feedback.ts` | ~8 | Age-appropriate messaging for different grade levels |
| `__tests__/lib/study-plan/scheduler.test.ts` | `scheduler.ts` | ~10 | Session scheduling, workload distribution, deadline respect |

### 5.7 Custom Hooks (`hooks/`) — P2

The 25 custom hooks contain significant client-side logic. Key hooks to test:

| Test File | Hook | Tests | Coverage |
|-----------|------|-------|----------|
| `__tests__/hooks/useAdaptiveDifficulty.test.ts` | `useAdaptiveDifficulty` | ~8 | Difficulty adjustment, streak detection, performance state |
| `__tests__/hooks/usePracticeSession.test.ts` | `usePracticeSession` | ~10 | Session lifecycle, answer submission, batch loading |
| `__tests__/hooks/useGlobalSearch.test.ts` | `useGlobalSearch` | ~6 | Debounced search, result merging, empty query |
| `__tests__/hooks/useLessonProgress.test.ts` | `useLessonProgress` | ~6 | Step navigation, completion tracking |
| `__tests__/hooks/useStreakTracker.test.ts` | `useStreakTracker` | ~5 | Streak display, animation trigger |
| `__tests__/hooks/useServiceWorker.test.ts` | `useServiceWorker` | ~4 | Registration, offline detection |

### 5.8 Missing Lib Directories — P2/P3

Directories not covered in sections 5.1-5.6 that need tests:

| Directory | Files | Priority | Key Tests |
|-----------|-------|----------|-----------|
| `lib/practice/` | 7 | P2 | Question generation, session manager, interleaving, math problem generation |
| `lib/errors/` | 10 | P2 | Error code mapping, user-friendly messages, HTTP status mapping |
| `lib/formula-scanner/` | 2 | P2 | Formula detection, solving pipeline |
| `lib/analytics/` | 6 | P3 | Client analytics, funnel analysis, device detection |
| `lib/concepts/` | 5 | P3 | Concept extraction, gap detection, prerequisite graph |
| `lib/email/` | 3 | P3 | Email template rendering, report generation |
| `lib/images/` | 4 | P3 | Image search, smart search, upload |
| `lib/metrics/` | 3 | P3 | Engagement scoring, self-efficacy tracking |
| `lib/prepare/` | 2 | P3 | Guide generation, YouTube search |
| `lib/monitoring/` | 2 | P3 | Error reporting |
| `lib/learning/` | 2 | P3 | Age config, intensity config |
| `lib/insights/` | 2 | P3 | Mistake analysis, gap routing |
| `lib/visual-learning/` | 3 | P3 | Validation, type checking |
| `lib/youtube/` | 2 | P3 | Transcript extraction, course generation |

**Unit test total: ~450 tests (net-new ~250, existing ~200 expanded)**

## 6. Layer 3 — API Integration Tests (Jest)

Every API route tested for: auth enforcement, input validation, happy path, error handling, and edge cases.

### 6.1 Test Pattern

Every route follows this standard test structure:

```typescript
describe('METHOD /api/route-name', () => {
  // Auth
  it('returns 401 when no auth token provided')
  it('returns 401 when token is expired')
  it('returns 403 when user lacks permission (RLS)')

  // Validation
  it('returns 400 when required fields missing')
  it('returns 400 when field types are wrong')
  it('returns 400 when values out of range')

  // Happy path
  it('returns 200 with correct response shape on valid input')
  it('response matches Zod schema')

  // Error handling
  it('returns 500 with sanitized error on internal failure')
  it('does not leak stack traces or API keys in error response')

  // Edge cases (route-specific)
  it('handles concurrent requests correctly')
  it('handles empty/null inputs gracefully')
})
```

### 6.2 Zod Response Schema Validation

For every API route, define a Zod schema for the response. Integration tests validate:
- Response body matches the Zod schema
- Frontend can safely consume the response without runtime errors
- Schema changes are caught immediately

```typescript
// __tests__/schemas/courses.schema.ts
import { z } from 'zod'

export const CourseResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  generated_course: z.object({
    title: z.string(),
    overview: z.string(),
    lessons: z.array(z.object({
      title: z.string(),
      steps: z.array(z.object({
        type: z.enum(['explanation', 'key_point', 'question', 'formula', 'diagram', 'example', 'summary', 'worked_example', 'practice_problem']),
        content: z.string(),
      }))
    }))
  }),
  generation_status: z.enum(['processing', 'partial', 'generating', 'complete', 'failed']).optional(),
})
```

### 6.3 Route Coverage by Priority

#### P0 — Core Learning Loop (blocks all learning if broken)

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/courses` | GET | 5 | Returns user's courses only (RLS), pagination works, empty state handled |
| `/api/courses` | POST | 8 | File upload (image/PDF/PPTX/DOCX), size limit enforcement, type validation, course creation |
| `/api/courses/[id]` | GET | 4 | Returns course for owner only, 404 for non-existent, includes generated_course |
| `/api/courses/[id]` | DELETE | 4 | Cascade deletes progress/cards/exams, only owner can delete |
| `/api/generate-course` | POST | 10 | Streaming response format, heartbeat every 2s, multi-image support, PDF extraction, error mid-stream, timeout handling |
| `/api/generate-course/continue` | POST | 5 | Generates continuation lessons, maintains course consistency |
| `/api/courses/[id]/progress` | GET | 4 | Returns progress for authenticated user only |
| `/api/courses/[id]/progress/complete-lesson` | POST | 5 | Updates progress, tracks completed lessons, prevents duplicate completion |
| `/api/evaluate-answer` | POST | 8 | AI evaluation response shape, partial credit, timeout fallback, Hebrew answer evaluation |
| `/api/srs/due` | GET | 6 | Due card calculation accuracy, daily limit enforcement, question regeneration, empty state |
| `/api/srs/review` | POST | 6 | FSRS state update correctness, interval calculation, card state transitions |
| `/api/srs/cards/generate` | POST | 5 | Card generation from course content, all question types |
| `/api/practice/session` | POST | 6 | Session creation, question loading, adaptive difficulty initial state |
| `/api/practice/session/[id]/answer` | POST | 6 | Answer recording, difficulty adjustment, performance tracking |
| `/api/practice/session/[id]/next-batch` | POST | 5 | Adaptive question selection, difficulty ramping, topic diversity |

#### P1 — Homework & Tutoring

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/homework/check` | POST | 8 | Image upload, AI grading, annotation positions, multiple problems per image |
| `/api/homework/sessions` | GET, POST | 6 | Session lifecycle, listing, creation |
| `/api/homework/sessions/[id]/chat` | POST | 6 | Socratic dialogue, context inclusion, conversation history |
| `/api/homework/sessions/[id]/walkthrough` | POST | 8 | Streaming walkthrough, step-by-step generation, diagram inclusion, error handling |
| `/api/homework/sessions/[id]/hint` | POST | 5 | Hint level progression (1-5), context-appropriate hints |
| `/api/help` | POST | 5 | AI help with curriculum context, student profile inclusion |
| `/api/chat` | POST | 5 | AI chat, student profile, conversation context |
| `/api/diagram-engine/generate` | POST | 8 | Pipeline routing, QA loop, fallback chain, step-by-step output |

#### P2 — Exam & Study Preparation

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/exams` | GET, POST | 6 | Exam creation, question generation, listing |
| `/api/exams/[id]` | GET | 3 | Exam fetch with questions, authorization |
| `/api/exams/[id]/submit` | POST | 6 | Grading accuracy, result calculation, answer recording |
| `/api/exam-prediction` | POST | 5 | Prediction from past exam templates, output format |
| `/api/past-exams` | GET, POST | 5 | Template upload, listing, analysis trigger |
| `/api/prepare/generate` | POST | 6 | Study guide streaming, section generation, completeness |
| `/api/prepare/[id]` | GET | 4 | Guide fetch, public access via share link |
| `/api/prepare/[id]/chat` | POST | 4 | Guide-specific AI tutor |
| `/api/cheatsheets` | GET, POST | 5 | Generation, listing |
| `/api/formula-scanner/analyze` | POST | 5 | Formula detection from text and image |
| `/api/formula-scanner/solve` | POST | 5 | Step-by-step solution generation |

#### P3 — Gamification, Analytics, User Profile

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/gamification/achievements` | GET | 3 | Achievement list, progress tracking |
| `/api/gamification/check` | POST | 4 | Newly earned detection, idempotency |
| `/api/gamification/stats` | GET | 3 | Level, XP, streak, achievement counts |
| `/api/gamification/streak` | POST | 4 | Streak update, timezone awareness, break detection |
| `/api/gamification/xp` | POST | 3 | XP award, cap enforcement |
| `/api/analytics/*` | Various | 10 | Event recording, session tracking, export |
| `/api/admin/*` | Various | 8 | Admin-only auth gate, data queries, export |
| `/api/user/*` | Various | 8 | Profile updates, language switch, knowledge gaps |
| `/api/recommendations` | GET | 4 | Personalized recommendations, tracking |
| `/api/search` | POST | 5 | Cross-entity search, relevance ranking, empty queries |

#### P1 — Auth & Infrastructure (CRITICAL — auth bypass = security vulnerability)

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/auth/forgot-password` | POST | 5 | Email sent, rate limiting (5/hour), invalid email handling, consecutive requests throttled |
| `/api/auth/me` | GET | 3 | Returns user info, 401 for unauthenticated |
| `/api/upload` | POST | 5 | File type validation, size limit, URL returned |
| `/api/upload-images` | POST | 5 | Batch upload, type validation, all URLs returned |
| `/api/upload-document` | POST | 5 | PDF/PPTX/DOCX, size limit, processing trigger |
| `/api/health` | GET | 2 | Returns 200, version info |
| `/api/monitoring/errors` | POST | 3 | Error recording, sanitization |
| `/api/reports/weekly` | GET, POST | 5 | Report generation, email sending |

#### P0 — Adaptive Learning (controls real-time difficulty — MISSING FROM ORIGINAL SPEC)

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/adaptive/feedback` | POST | 4 | Records too_easy/too_hard feedback, updates state |
| `/api/adaptive/record` | POST | 5 | Records answer, updates performance, auth required |
| `/api/adaptive/reset` | POST | 4 | Resets session, saves snapshot, auth required |
| `/api/adaptive/state` | GET | 4 | Returns performance state, user-isolated |

#### P1 — Missing Course Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/courses/from-youtube` | POST | 5 | YouTube URL validation, transcript extraction, course generation |
| `/api/courses/manual` | POST | 4 | Manual lesson data, validation |
| `/api/courses/recent` | GET | 3 | Returns most recent course, Safari/iOS fallback |
| `/api/courses/[id]/lessons/[lessonIndex]` | GET, DELETE | 5 | Lesson fetch, delete with cascade |
| `/api/courses/[id]/lessons/[lessonIndex]/expand` | POST | 4 | Sub-step generation, lesson integrity |
| `/api/courses/[id]/lessons/[lessonIndex]/worked-example` | POST | 4 | Worked example generation |
| `/api/courses/[id]/mastery` | GET | 3 | Mastery analysis per lesson |
| `/api/courses/[id]/title` | PUT | 3 | Title update, validation, auth |

#### P1 — Missing Practice & SRS Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/practice/diagram` | POST | 4 | Single diagram generation, pipeline routing |
| `/api/practice/generate` | POST | 5 | Mixed/interleaved question generation |
| `/api/practice/log` | POST | 3 | Card review logging |
| `/api/practice/questions` | GET | 4 | Question filtering, availability |
| `/api/practice/tutor` | POST | 5 | Pedagogical diagram + AI tutoring |
| `/api/practice/widget` | GET | 3 | Dashboard widget data |
| `/api/srs/cards/generate-all` | POST | 4 | Batch generation for all courses |
| `/api/srs/course/[id]` | GET | 3 | Per-course card stats |
| `/api/srs/optimize` | POST | 4 | FSRS parameter optimization trigger |
| `/api/srs/settings` | GET, PUT | 5 | SRS settings CRUD |
| `/api/srs/stats` | GET | 3 | Comprehensive SRS statistics |
| `/api/deep-practice` | POST | 4 | Mastery tracking for deep practice mode |

#### P1 — Missing Homework Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/homework/check/[checkId]` | GET | 3 | Specific check result retrieval |
| `/api/homework/check/[checkId]/practice-complete` | POST | 3 | Practice completion recording |
| `/api/homework/walkthrough/[walkthroughId]/retry-step` | POST | 4 | Single step retry compilation |
| `/api/homework/walkthrough/[walkthroughId]/step-chat` | GET, POST | 5 | Step-specific chat |

#### P2 — Missing Study & Preparation Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/study-plan` | GET, POST | 5 | Study plan CRUD |
| `/api/study-plan/[id]/complete-task` | PATCH | 3 | Task completion |
| `/api/study-plan/[id]/recalculate` | POST | 3 | Task recalculation |
| `/api/study-sessions` | POST, PATCH | 5 | Start/end session, fatigue detection |
| `/api/generate-questions` | POST | 5 | Practice question generation |
| `/api/generate-cover` | POST | 3 | Single cover image generation |
| `/api/generate-all-covers` | POST | 3 | Batch cover generation |
| `/api/prepare/[id]/pdf` | GET | 3 | PDF export works |
| `/api/prepare/[id]/share` | POST | 3 | Share link generation |

#### P2 — Missing User & Profile Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/user/gaps` | GET, POST, PATCH | 6 | Knowledge gap detection, AI enrichment, resolution |
| `/api/user/language` | PATCH | 3 | Language preference update |
| `/api/user/mastery` | GET | 3 | Concept mastery levels |
| `/api/profile/refinement` | GET, POST, PUT | 5 | Dynamic profile refinement (RLPA) |
| `/api/self-assessment` | POST | 3 | Self-assessment recording |
| `/api/reflections` | POST | 3 | Reflection saving |
| `/api/weak-areas` | GET | 3 | Low mastery detection |
| `/api/concepts/extract` | POST | 4 | Concept extraction from course |

#### P3 — Missing Analytics & Tracking Routes

| Route | Method | Tests | Key Assertions |
|-------|--------|-------|----------------|
| `/api/annotations` | GET | 3 | Annotation fetch for course/lesson |
| `/api/dashboard/intelligence` | GET | 3 | Dashboard directives from LIE |
| `/api/diagrams/render-steps` | POST | 4 | On-demand step rendering |
| `/api/cron/aggregate-analytics` | POST | 3 | Daily aggregation trigger |
| `/api/sign-image-urls` | POST | 3 | Signed URL generation |
| `/api/insights/mistakes` | GET | 3 | Mistake pattern analysis |
| `/api/metrics/engagement` | GET, POST | 4 | Engagement event recording/analysis |
| `/api/metrics/self-efficacy` | GET, POST | 4 | Self-efficacy tracking |
| `/api/tracking/explanation-engagement` | POST | 3 | Explanation time tracking |
| `/api/tracking/feature-affinity` | POST | 3 | Feature usage tracking |
| `/api/tracking/recommendation` | POST | 3 | Recommendation tracking |
| `/api/extraction/feedback` | GET, POST, PATCH | 4 | Extraction feedback CRUD |
| `/api/progress` | GET | 3 | Comprehensive progress analytics |
| `/api/progress/lesson-map` | GET | 3 | Lesson completion map |
| `/api/lesson-progress` | POST | 3 | Lesson progress update |
| `/api/performance/steps` | POST | 3 | Step performance calculation |
| `/api/process-document` | POST | 4 | Document processing pipeline |

**API integration test total: ~550 tests (covering all 131 routes)**

### 6.4 AI Mocking Strategy for Tests

AI-dependent routes (`/api/generate-course`, `/api/chat`, `/api/homework/check`, `/api/evaluate-answer`, `/api/practice/tutor`, etc.) must NOT call real Claude API in CI. Strategy:

```typescript
// __tests__/helpers/mock-anthropic.ts
jest.mock('@anthropic-ai/sdk', () => ({
  default: jest.fn().mockImplementation(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({
        content: [{ type: 'text', text: '{"title":"Mock Course","overview":"...","lessons":[...]}' }],
        usage: { input_tokens: 100, output_tokens: 200 }
      })
    }
  }))
}))
```

- **Unit tests:** Mock the Anthropic SDK directly
- **API integration tests:** Mock at the SDK level, test parsing/validation/error handling
- **E2E tests:** Intercept API routes at the network level with Playwright `page.route()`, return fixture data
- **Fixture directory:** `__tests__/fixtures/mock-ai-responses/` with real-world examples of valid, malformed, truncated, and edge-case AI outputs
- **Cost:** $0 — no real API calls in CI

### 6.5 Middleware Tests

`middleware.ts` handles auth redirects, locale detection, and route protection for the entire app. A bug here breaks everything.

```typescript
// __tests__/middleware.test.ts
describe('Root Middleware', () => {
  it('redirects unauthenticated users from protected routes to /login')
  it('allows unauthenticated access to public routes (/, /login, /signup, /privacy, /terms)')
  it('detects locale from Accept-Language header and sets cookie')
  it('preserves locale cookie on subsequent requests')
  it('redirects authenticated users from /login to /dashboard')
  it('handles missing cookies gracefully')
  it('passes through API routes without redirect')
  it('handles malformed auth tokens without crashing')
})
```

## 7. Layer 4 — E2E Tests (Playwright)

Real browser tests against a running dev server. These catch rendering bugs, client-side state issues, navigation problems, and full user journey regressions.

### 7.1 Test Infrastructure

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: 1,
  workers: 4,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run dev',
    port: 3000,
    reuseExistingServer: true,
  },
  projects: [
    { name: 'desktop-chrome', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-safari', use: { ...devices['iPhone 14'] } },
  ],
})
```

### 7.2 Auth Helper

```typescript
// e2e/helpers/auth.ts
// Pre-authenticate a test user to avoid login on every test
async function loginAsTestUser(page: Page) {
  // Uses Supabase auth directly to set session cookie
  // Avoids flaky UI-based login
}
```

### 7.3 E2E Test Suites

#### Suite 1: Authentication Flow (`e2e/auth.spec.ts`) — 8 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Sign up | Fill form → submit → redirect | Onboarding page loads |
| Login | Fill form → submit → redirect | Dashboard loads with user's data |
| Logout | Click logout → confirm | Redirected to landing page |
| Forgot password | Enter email → submit | Success message displayed |
| Protected route redirect | Visit /dashboard without auth | Redirected to /login |
| Session persistence | Login → refresh page | Still logged in, dashboard loads |
| Invalid credentials | Wrong password → submit | Error message shown |
| Auth error messages (HE) | Switch to Hebrew → login error | Hebrew error message |

#### Suite 2: Course Creation & Learning (`e2e/courses.spec.ts`) — 12 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Upload image → course | Upload PNG → wait for processing | Course page loads with lessons |
| Upload PDF → course | Upload PDF → wait | Multi-lesson course generated |
| Upload PPTX → course | Upload PPTX → wait | Slides extracted as lessons |
| Course page layout | Navigate to course | Lessons listed, progress bar visible |
| Lesson step navigation | Click lesson → step 1 → next → next | Steps render, content visible |
| Quiz interaction (correct) | Answer correctly | Green feedback, "Correct!" message |
| Quiz interaction (wrong) | Answer incorrectly | Red feedback, explanation shown |
| Complete lesson | Navigate all steps → last | Lesson marked complete in sidebar |
| Complete all lessons | Complete every lesson | Course marked complete, celebration |
| Delete course | Click delete → confirm | Course removed from list |
| Course list pagination | Create 15+ courses → scroll | All courses accessible |
| Manual course creation | Use manual form → add lessons | Course created without upload |

#### Suite 3: Homework Help (`e2e/homework.spec.ts`) — 8 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Upload & check | Upload problem image → wait | Results with annotations shown |
| Start help session | Upload → click "Get Help" | Chat interface loads |
| Chat with tutor | Send question → wait | AI response appears |
| Request hint | Click hint button | Hint displayed, progressive |
| Generate walkthrough | Click walkthrough → wait | Step-by-step solution renders |
| Walkthrough step chat | Click step → ask question | Step-specific AI response |
| Session history | Navigate to history | Previous sessions listed |
| Multiple problems | Upload multi-problem image | Each problem annotated separately |

#### Suite 4: Practice & SRS (`e2e/practice.spec.ts`) — 10 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Start practice session | Select course → start | Questions load |
| Answer question | Select answer → submit | Feedback shown, next question |
| Adaptive difficulty | Answer 5 correct → check | Difficulty increases |
| Complete session | Answer all → finish | Results summary with stats |
| SRS due cards | Navigate to review | Due cards displayed |
| Review card | Flip card → rate | Card scheduled, next card shown |
| Rate difficulty | Rate "Again" | Card shown again sooner |
| SRS stats | Navigate to stats | Accuracy, streak, cards reviewed |
| Practice widget | Check dashboard | Widget shows due count |
| Math practice mode | Navigate to /practice/math | Problems generate and solve |

#### Suite 5: Exams (`e2e/exams.spec.ts`) — 6 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Create exam | Select course → create | Exam with questions generated |
| Take exam | Start → answer all | All question types render |
| Submit exam | Complete → submit | Score and results displayed |
| Past exam upload | Upload past exam PDF | Template saved, analysis starts |
| Exam prediction | Run prediction | Predicted questions generated |
| Exam result review | View completed exam | Answers and explanations shown |

#### Suite 6: Study Preparation (`e2e/prepare.spec.ts`) — 5 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Generate study guide | Select course → generate | Guide with sections streams in |
| View guide | Navigate to guide | All sections render, navigation works |
| Guide AI chat | Ask question about guide | AI response with guide context |
| Share guide | Click share → copy link | Public link works in incognito |
| Study plan | Create plan → view tasks | Tasks listed with schedule |

#### Suite 7: Dashboard & Navigation (`e2e/navigation.spec.ts`) — 8 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Dashboard loads | Login → dashboard | Recent courses, widgets, recommendations visible |
| Global search | Type query → submit | Results from courses, cards, homework |
| Settings page | Navigate → change setting | Setting persists on reload |
| Profile page | Navigate to profile | Achievements, stats, progress displayed |
| Knowledge map | Navigate to map | Concept nodes render |
| Mobile navigation | Switch to mobile viewport | Hamburger menu, responsive layout |
| Progress page | Navigate to progress | Charts and insights render |
| Onboarding flow | New user → grade/subject selection | Onboarding completes, redirects to dashboard |

#### Suite 8: i18n & RTL (`e2e/i18n.spec.ts`) — 5 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Switch to Hebrew | Settings → Hebrew | All UI text in Hebrew, layout RTL |
| Hebrew course content | View course in HE | Content, quiz, feedback in Hebrew |
| RTL quiz interaction | Answer quiz in RTL | Buttons, layout, feedback correct |
| Switch back to English | Settings → English | Layout returns to LTR |
| Mixed content | Hebrew UI + English math | Both render correctly |

#### Suite 9: Additional Features (`e2e/features.spec.ts`) — 8 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Formula scanner | Navigate → scan formula | Formula detected and displayed |
| Cheatsheet generation | Select course → generate | Cheatsheet renders with content |
| Course list page | Navigate to /courses | Filtering, search, course cards visible |
| Processing page | Upload file → visit processing | Progress indicator shown, updates |
| Past exam settings | Settings → past exams | Upload and manage templates |
| Study plan creation | Navigate → create plan | Tasks generated with schedule |
| Formula solver | Scan formula → solve | Step-by-step solution shown |
| Dark mode toggle | Settings → toggle dark mode | UI switches without flash |

#### Suite 10: Rate Limiting & Edge Cases (`e2e/edge-cases.spec.ts`) — 5 tests

| Test | Steps | Assertion |
|------|-------|-----------|
| Rate limit on forgot password | Submit 6 rapid requests | 429 response after 5th |
| Large file upload rejection | Upload >10MB file | Error message, no crash |
| Empty course state | New user, no courses | Empty state UI shown correctly |
| Session timeout | Wait for token expiry | Graceful redirect to login |
| Concurrent tab behavior | Open same course in 2 tabs | No data corruption |

**E2E test total: ~70 tests**

## 8. Layer 5 — Accessibility Tests (axe-core)

### 8.1 Component-Level (Jest + jest-axe)

Run axe-core on rendered components to catch WCAG 2.2 AA violations.

```typescript
import { render } from '@testing-library/react'
import { axe, toHaveNoViolations } from 'jest-axe'
expect.extend(toHaveNoViolations)

it('QuizStep has no a11y violations', async () => {
  const { container } = render(<QuizStep ... />)
  const results = await axe(container)
  expect(results).toHaveNoViolations()
})
```

#### Components to Test:

| Component Group | Count | Priority |
|----------------|-------|----------|
| Quiz/question components | 8 | P0 — students interact constantly |
| Navigation components | 5 | P0 — core navigation |
| Form components (login, upload, settings) | 6 | P0 — data entry |
| Lesson step viewer | 4 | P1 — content consumption |
| Homework check/chat | 4 | P1 — tutoring interface |
| Dashboard widgets | 5 | P2 — informational |
| Diagram components (sample of 10) | 10 | P2 — visual content |
| Admin pages | 3 | P3 — internal only |

**Accessibility test total: ~50 component checks**

### 8.2 E2E Accessibility (Playwright + @axe-core/playwright)

Run full-page accessibility audits on 10 critical pages as part of E2E:

```typescript
import AxeBuilder from '@axe-core/playwright'

test('dashboard page is accessible', async ({ page }) => {
  await page.goto('/dashboard')
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa'])
    .analyze()
  expect(results.violations).toEqual([])
})
```

Pages: landing, login, dashboard, course view, lesson view, homework check, practice session, SRS review, settings, profile.

## 9. Layer 6 — Performance Budgets (Lighthouse CI)

Run Lighthouse CI on 8 representative pages with hard performance budgets.

### 9.1 Configuration

```json
// lighthouserc.json
{
  "ci": {
    "collect": {
      "url": [
        "http://localhost:3000/",
        "http://localhost:3000/dashboard",
        "http://localhost:3000/course/test-id",
        "http://localhost:3000/course/test-id/lesson/0",
        "http://localhost:3000/homework",
        "http://localhost:3000/practice",
        "http://localhost:3000/review",
        "http://localhost:3000/settings"
      ],
      "numberOfRuns": 1
    },
    "assert": {
      "assertions": {
        "categories:performance": ["error", { "minScore": 0.7 }],
        "categories:accessibility": ["error", { "minScore": 0.9 }],
        "first-contentful-paint": ["error", { "maxNumericValue": 3000 }],
        "largest-contentful-paint": ["error", { "maxNumericValue": 4000 }],
        "cumulative-layout-shift": ["error", { "maxNumericValue": 0.15 }],
        "total-blocking-time": ["error", { "maxNumericValue": 500 }]
      }
    }
  }
}
```

### 9.2 Budgets

| Metric | Budget | Fails CI? |
|--------|--------|-----------|
| Performance score | >= 70 | Yes |
| Accessibility score | >= 90 | Yes |
| FCP (First Contentful Paint) | < 3s | Yes |
| LCP (Largest Contentful Paint) | < 4s | Yes |
| CLS (Cumulative Layout Shift) | < 0.15 | Yes |
| TBT (Total Blocking Time) | < 500ms | Yes |

## 10. Layer 7 — Visual Regression (Playwright Screenshots)

Capture screenshots and compare against committed baselines. Detects CSS/layout regressions.

### 10.1 Screenshot Matrix

| Page | Desktop (1280x800) | Mobile (375x812) | Hebrew RTL | Dark Mode |
|------|--------------------|-------------------|------------|-----------|
| Landing page | Yes | Yes | — | — |
| Login page | Yes | Yes | — | Yes |
| Dashboard | Yes | Yes | Yes | Yes |
| Course page | Yes | Yes | — | — |
| Lesson step (explanation) | Yes | — | — | Yes |
| Lesson step (quiz) | Yes | — | Yes | — |
| Homework check results | Yes | — | — | — |
| Practice session | Yes | Yes | — | Yes |
| SRS review card | Yes | — | — | — |
| Settings page | Yes | — | — | Yes |
| Diagram walkthrough | Yes | — | — | — |
| Onboarding | Yes | Yes | — | — |

**~25 screenshot comparisons** (including dark mode variants — known dark mode flash bug in commit eb5a98b)

### 10.2 Threshold

- Pixel diff threshold: **0.5%** — anything above triggers a failure
- On failure: diff image saved to artifacts for visual inspection
- Baseline update: `npx playwright test --update-snapshots` (manual, on merge to main)

## 11. Layer 8 — Post-Deploy Smoke Tests

Run after Vercel deployment succeeds. Hit PRODUCTION to verify the deploy is healthy.

### 11.1 Smoke Test Suite

```typescript
// e2e/smoke.spec.ts — runs against PRODUCTION_URL
const PROD_URL = process.env.PRODUCTION_URL || 'https://snap-notes-j68u-three.vercel.app'

test('health check', async ({ request }) => {
  const res = await request.get(`${PROD_URL}/api/health`)
  expect(res.ok()).toBeTruthy()
})

test('landing page loads', async ({ page }) => {
  await page.goto(PROD_URL)
  await expect(page).toHaveTitle(/NoteSnap/)
})

test('login page loads', async ({ page }) => {
  await page.goto(`${PROD_URL}/login`)
  await expect(page.locator('form')).toBeVisible()
})

test('API auth gate works', async ({ request }) => {
  const res = await request.get(`${PROD_URL}/api/courses`)
  expect(res.status()).toBe(401)
})

test('static assets load', async ({ page }) => {
  await page.goto(PROD_URL)
  const failedRequests: string[] = []
  page.on('requestfailed', req => failedRequests.push(req.url()))
  await page.waitForLoadState('networkidle')
  expect(failedRequests).toHaveLength(0)
})
```

**~10 smoke tests**, triggered by Vercel deployment webhook or GitHub Actions `deployment_status` event.

## 12. CI Pipeline Configuration

### 12.1 GitHub Actions Workflow

```yaml
name: CI — Full Regression Suite

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

env:
  NEXT_PUBLIC_SUPABASE_URL: ${{ secrets.NEXT_PUBLIC_SUPABASE_URL }}
  NEXT_PUBLIC_SUPABASE_ANON_KEY: ${{ secrets.NEXT_PUBLIC_SUPABASE_ANON_KEY }}
  ANTHROPIC_API_KEY: sk-placeholder-for-build
  YOUTUBE_DATA_API_KEY: placeholder-for-build

jobs:
  static-analysis:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx tsc --noEmit
      - run: npm run lint
      - run: npm audit --audit-level=high

  unit-tests:
    runs-on: ubuntu-latest
    needs: static-analysis
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm test -- --ci --coverage --forceExit
      - uses: actions/upload-artifact@v4
        with:
          name: coverage-report
          path: coverage/

  api-integration-tests:
    runs-on: ubuntu-latest
    needs: static-analysis
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm test -- --ci --testPathPattern='__tests__/api/' --forceExit

  build:
    runs-on: ubuntu-latest
    needs: [unit-tests, api-integration-tests]
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build

  e2e-tests:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium webkit
      - run: npx playwright test
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/

  visual-regression:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npx playwright test --project=visual-regression
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: visual-diff
          path: e2e/screenshots/diff/

  lighthouse:
    runs-on: ubuntu-latest
    needs: build
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npm run build && npm start &
      - run: npx wait-on http://localhost:3000
      - run: npx @lhci/cli autorun

  generate-report:
    runs-on: ubuntu-latest
    needs: [unit-tests, api-integration-tests, e2e-tests, visual-regression, lighthouse]
    if: always()
    steps:
      - uses: actions/checkout@v4
      - uses: actions/download-artifact@v4
        with:
          merge-multiple: true
      - run: node scripts/generate-test-report.js
      - uses: actions/upload-artifact@v4
        with:
          name: test-report
          path: test-report.json

      # Post failure report as PR comment (so you can paste it to Claude)
      - name: Post failure report to PR
        if: github.event_name == 'pull_request' && failure()
        uses: actions/github-script@v7
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('test-report.json', 'utf8'));
            const failures = report.failures || [];
            if (failures.length === 0) return;

            let body = `## 🔴 Test Failures (${failures.length})\n\n`;
            body += `**Commit:** \`${report.meta.commit}\` | **Branch:** \`${report.meta.branch}\`\n\n`;
            body += `| Layer | Test | File:Line | Error | Severity |\n`;
            body += `|-------|------|-----------|-------|----------|\n`;
            for (const f of failures) {
              body += `| ${f.layer} | ${f.test_name} | \`${f.source_file}:${f.source_line || '?'}\` | ${f.error_message.slice(0, 80)} | ${f.severity} |\n`;
            }
            body += `\n<details><summary>📋 Full JSON report (paste to Claude to fix)</summary>\n\n\`\`\`json\n${JSON.stringify(report, null, 2).slice(0, 60000)}\n\`\`\`\n</details>`;

            await github.rest.issues.createComment({
              owner: context.repo.owner,
              repo: context.repo.repo,
              issue_number: context.issue.number,
              body
            });

      # Email notification on failure
      - name: Notify on failure
        if: failure()
        uses: actions/github-script@v7
        with:
          script: |
            // GitHub automatically sends email notifications for failed CI checks
            // to the commit author and PR participants.
            // No additional config needed — GitHub handles this via:
            // Settings → Notifications → "Actions" → "Send notifications for failed workflows only"
            console.log('CI failed — GitHub will email the commit author automatically.');

  # Triggered by Vercel deployment, not by push
  smoke-tests:
    runs-on: ubuntu-latest
    if: github.event_name == 'deployment_status' && github.event.deployment_status.state == 'success'
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: 'npm' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: PRODUCTION_URL=${{ github.event.deployment_status.target_url }} npx playwright test e2e/smoke.spec.ts
```

### 12.2 Pipeline Visualization

```
Push/PR
  │
  ├─→ Static Analysis (tsc + lint + npm audit)     ~45s
  │       │
  │       ├─→ Unit Tests (Jest, parallel)           ~90s
  │       │       │
  │       ├─→ API Integration Tests (Jest)          ~120s
  │       │       │
  │       └───────┴─→ Build (next build)            ~60s
  │                       │
  │                       ├─→ E2E Tests             ~180s
  │                       ├─→ Visual Regression      ~60s
  │                       └─→ Lighthouse CI          ~150s
  │                               │
  │                               └─→ Generate Report ~5s
  │
  └─→ [After Vercel Deploy] Smoke Tests             ~45s
```

**Total wall-clock time: ~12-14 minutes** (jobs run in parallel where possible)

**Critical CI optimizations (without these, time balloons to 20+ minutes):**
- Cache `~/.cache/ms-playwright` between runs (`actions/cache`)
- Cache `node_modules/` between runs (`actions/cache` with `package-lock.json` hash)
- Share build artifact between build → e2e/visual/lighthouse jobs (`actions/upload-artifact`)
- Lighthouse runs against production build (`next start`), not dev server
- Single Playwright install shared across e2e + visual regression jobs

## 13. Report Format — Claude-Compatible

Every CI run produces `test-report.json`:

```json
{
  "meta": {
    "timestamp": "2026-03-26T14:30:00Z",
    "commit": "abc1234",
    "branch": "feature/new-quiz-type",
    "pr": "#142",
    "ci_run_url": "https://github.com/.../actions/runs/12345"
  },
  "summary": {
    "total_checks": 850,
    "passed": 845,
    "failed": 5,
    "skipped": 0,
    "duration_ms": 720000,
    "layers": {
      "static_analysis": { "passed": true },
      "unit_tests": { "total": 300, "passed": 298, "failed": 2 },
      "api_integration": { "total": 400, "passed": 399, "failed": 1 },
      "e2e": { "total": 60, "passed": 60, "failed": 0 },
      "accessibility": { "total": 50, "passed": 48, "failed": 2 },
      "performance": { "total": 8, "passed": 8, "failed": 0 },
      "visual_regression": { "total": 20, "passed": 20, "failed": 0 },
      "smoke": { "total": 10, "passed": 10, "failed": 0 }
    }
  },
  "failures": [
    {
      "layer": "unit_tests",
      "suite": "lib/srs/fsrs",
      "test_name": "calculates interval after lapse correctly",
      "source_file": "lib/srs/fsrs.ts",
      "source_line": 142,
      "test_file": "__tests__/lib/srs/fsrs.test.ts",
      "test_line": 87,
      "error_message": "Expected 3 but received 4",
      "expected": 3,
      "actual": 4,
      "stack_trace": "at Object.<anonymous> (__tests__/lib/srs/fsrs.test.ts:87:5)",
      "category": "algorithm_regression",
      "severity": "critical",
      "fix_context": "The lapse interval calculation changed behavior. The stability decay formula at fsrs.ts:142 likely has an off-by-one in the decay exponent. Compare with FSRS-4.5 reference implementation."
    },
    {
      "layer": "api_integration",
      "suite": "api/courses",
      "test_name": "returns 401 when no auth token provided",
      "source_file": "app/api/courses/route.ts",
      "source_line": 15,
      "test_file": "__tests__/api/courses.test.ts",
      "test_line": 23,
      "error_message": "Expected status 401 but received 200",
      "expected": 401,
      "actual": 200,
      "stack_trace": "...",
      "category": "auth_bypass",
      "severity": "critical",
      "fix_context": "The auth check in courses/route.ts was likely removed or bypassed. Verify that createClient() and getUser() are called before any data access."
    },
    {
      "layer": "accessibility",
      "suite": "components/QuizStep",
      "test_name": "QuizStep has no a11y violations",
      "source_file": "components/lesson/QuizStep.tsx",
      "source_line": null,
      "test_file": "__tests__/components/lesson/QuizStep.a11y.test.tsx",
      "test_line": 12,
      "error_message": "2 violations found: (1) button-name: Button does not have discernible text, (2) color-contrast: Element has insufficient contrast ratio 2.1:1 (minimum 4.5:1)",
      "violations": [
        { "id": "button-name", "impact": "critical", "nodes": 1 },
        { "id": "color-contrast", "impact": "serious", "nodes": 3 }
      ],
      "category": "accessibility",
      "severity": "high",
      "fix_context": "Add aria-label to icon-only buttons. Increase text color contrast in quiz option buttons — current dark mode colors are too faint."
    }
  ],
  "coverage": {
    "statements": 78.5,
    "branches": 72.1,
    "functions": 81.3,
    "lines": 79.2,
    "uncovered_critical_files": [
      { "file": "lib/homework/walkthrough-generator.ts", "lines_uncovered": 234 },
      { "file": "lib/diagram-engine/e2b-executor.ts", "lines_uncovered": 189 }
    ]
  },
  "visual_regressions": [],
  "performance": {
    "pages": [
      { "url": "/dashboard", "lcp_ms": 2100, "cls": 0.02, "fcp_ms": 1200, "tbt_ms": 150, "score": 89 },
      { "url": "/course/test", "lcp_ms": 2800, "cls": 0.05, "fcp_ms": 1500, "tbt_ms": 200, "score": 82 }
    ]
  }
}
```

### 13.1 Related Failures Grouping

When a single source file change breaks multiple tests, the report groups them:

```json
"related_failure_groups": [
  {
    "root_source_file": "lib/srs/fsrs.ts",
    "failure_count": 8,
    "failures": ["fsrs-lapse-interval", "fsrs-stability-decay", "srs-review-api-200", ...],
    "suggestion": "Fix the root cause in lib/srs/fsrs.ts — all 8 failures trace back to this file."
  }
]
```

This prevents Claude from fixing symptoms instead of root causes.

### 13.2 Flaky Test Detection

Tests that fail then pass on retry are marked as flaky (not counted as failures):

```json
"flaky_tests": [
  {
    "test_name": "walkthrough generation streams correctly",
    "file": "__tests__/api/homework-walkthrough.test.ts",
    "retry_count": 1,
    "note": "Flaky — passed on retry. Likely timing-dependent. Investigate but don't fix urgently."
  }
]
```

### 13.3 Report Generator Script

A Node.js script (`scripts/generate-test-report.js`) that:
1. Reads Jest JSON output (`--json --outputFile=jest-results.json`)
2. Reads Playwright JSON reporter output
3. Reads Lighthouse CI results
4. Reads coverage output
5. Merges into the unified `test-report.json` format above
6. Classifies each failure with `category` and `severity` using heuristics:
   - Test file path → category (e.g., `__tests__/api/` → "api_regression")
   - Error message patterns → severity (e.g., "401" in auth test → "critical")
7. Populates `fix_context` from **test file JSDoc comments** (not auto-generated):

```typescript
/**
 * @fix_context The lapse interval uses stability decay from FSRS-4.5.
 *   If this fails, check the decay exponent in fsrs.ts around line 140.
 */
it('calculates interval after lapse correctly', () => { ... })
```

8. Groups related failures by `source_file` into `related_failure_groups`
9. Flags flaky tests (passed on retry via `--retries=1`)

### 13.2 Usage with Claude

```
User: "Here's my test report, fix all failures"
[paste test-report.json]

Claude reads:
- 5 failures across 3 layers
- Each has exact file:line, expected vs actual, category, severity, and fix context
- Claude can immediately navigate to the source and fix each issue
```

## 14. File Structure

```
NoteSnap/
├── __tests__/                          # Existing + expanded
│   ├── api/                            # API integration tests (129 route files)
│   │   ├── courses.test.ts
│   │   ├── srs-review.test.ts
│   │   └── ... (one per route)
│   ├── lib/                            # Unit tests (mirror lib/ structure)
│   │   ├── srs/
│   │   │   ├── fsrs.test.ts
│   │   │   ├── card-generator.test.ts
│   │   │   └── daily-session.test.ts
│   │   ├── adaptive/
│   │   ├── ai/
│   │   ├── diagram-engine/
│   │   ├── homework/
│   │   ├── gamification/
│   │   └── ...
│   ├── components/                     # Component tests + a11y
│   │   ├── lesson/
│   │   ├── practice/
│   │   └── diagrams/
│   ├── schemas/                        # Zod response schemas
│   │   ├── courses.schema.ts
│   │   ├── srs.schema.ts
│   │   └── ...
│   └── fixtures/                       # Test data
│       ├── mock-course.json
│       ├── mock-ai-responses/
│       └── ...
├── e2e/                                # Playwright E2E tests
│   ├── auth.spec.ts
│   ├── courses.spec.ts
│   ├── homework.spec.ts
│   ├── practice.spec.ts
│   ├── exams.spec.ts
│   ├── prepare.spec.ts
│   ├── navigation.spec.ts
│   ├── i18n.spec.ts
│   ├── smoke.spec.ts                   # Post-deploy smoke tests
│   ├── visual/                         # Visual regression specs
│   │   └── screenshots.spec.ts
│   ├── screenshots/                    # Baseline screenshots
│   │   ├── baseline/
│   │   └── diff/
│   └── helpers/
│       ├── auth.ts
│       └── fixtures.ts
├── scripts/
│   └── generate-test-report.js         # Report generator
├── playwright.config.ts                # Playwright config
├── lighthouserc.json                   # Lighthouse CI config
├── jest.config.js                      # Updated Jest config
└── .github/
    └── workflows/
        └── ci.yml                      # Updated CI pipeline
```

## 15. Implementation Priority

Phase ordering accounts for dependencies: report generator early (so all phases produce usable output), AI parsing early (most common production bugs), E2E after unit/integration (needs stable foundation).

| Phase | What | Net-New Tests | Effort |
|-------|------|---------------|--------|
| **Phase 1** | CI hardening (remove `--passWithNoTests`, add `npm audit`, add caching) + report generator script + AI output parsing tests | ~70 | 2-3 sessions |
| **Phase 2** | P0 unit tests (FSRS, answer checker, adaptive, AI prompts) + Zod response schemas | ~120 | 3-4 sessions |
| **Phase 3** | API integration tests for all P0 routes (courses, SRS, practice, adaptive) + middleware tests | ~100 | 3-4 sessions |
| **Phase 4** | Playwright E2E setup + auth + course + homework + practice suites | ~35 | 3-4 sessions |
| **Phase 5** | API integration tests for P1 routes (homework, exams, auth, study) | ~120 | 3-4 sessions |
| **Phase 6** | Remaining E2E suites + accessibility tests (jest-axe + Playwright axe-core) | ~60 | 3-4 sessions |
| **Phase 7** | Visual regression + dark mode + Lighthouse CI + post-deploy smoke tests | ~45 | 2-3 sessions |
| **Phase 8** | P2/P3 unit tests (gamification, personalization, curriculum, utilities) + hooks tests | ~80 | 2-3 sessions |
| **Phase 9** | Remaining API integration tests for P2/P3/P4 routes + edge case hardening | ~120 | 3-4 sessions |

**Total: ~750-850 net-new tests + 1,064 existing = ~1,800+ total across 24-33 implementation sessions**

## 16. Maintenance Plan

### 16.1 New Route Coverage Gate

Add a CI check that fails if a new `route.ts` file exists without a corresponding test file:

```bash
# scripts/check-test-coverage-gate.sh
for route in $(find app/api -name 'route.ts'); do
  test_path="__tests__/api/$(echo $route | sed 's|app/api/||;s|/route.ts||;s|/|-|g').test.ts"
  if [ ! -f "$test_path" ]; then
    echo "MISSING TEST: $route → expected $test_path"
    exit 1
  fi
done
```

### 16.2 Visual Regression Baseline Updates

- Baselines are committed to git and updated manually: `npx playwright test --update-snapshots`
- When a visual change is intentional, the PR must include updated baselines
- Add a GitHub Actions label `update-snapshots` that triggers baseline regeneration

### 16.3 Flaky Test Protocol

- Tests that fail > 2 times in 10 runs are flagged as flaky
- Flaky tests get a `@flaky` tag and are retried once (`--retries=1`)
- A monthly flaky test audit identifies and fixes or removes chronic offenders

### 16.4 Test Ownership

- When adding/modifying a feature, the developer is responsible for adding/updating tests in the same PR
- The PR template includes a checkbox: "Tests added/updated for this change?"

## 17. Success Criteria

- [ ] Every push to `main` triggers the full 8-layer pipeline
- [ ] No code merges without all layers passing
- [ ] Every failure produces a report with file:line, expected/actual, category, severity, and fix context
- [ ] Related failures are grouped by root source file
- [ ] Coverage > 75% for `app/api/`, `lib/`, and `hooks/`
- [ ] Zero WCAG 2.2 AA violations on critical pages
- [ ] LCP < 4s on all measured pages
- [ ] Post-deploy smoke tests run against production after every Vercel deployment
- [ ] Visual regression catches CSS changes > 0.5% pixel diff (including dark mode)
- [ ] New API routes without tests fail CI
- [ ] All 131 API routes have at least auth + validation + happy path + error tests
- [ ] AI-dependent tests use mocked responses ($0 API cost in CI)
- [ ] Flaky tests are tagged and retried, not silently ignored
