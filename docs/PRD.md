# X+1 — Product Requirements Document

| | |
|---|---|
| **Product** | X+1 (formerly NoteSnap) |
| **Domain** | https://xplus1.ai |
| **Production URL** | https://snap-notes-j68u-three.vercel.app |
| **Document Version** | 1.0 |
| **Document Date** | 2026-04-05 |
| **Document Status** | Baseline (reverse-engineered from production codebase) |
| **Source Repository** | `/Users/curvalux/NoteSnap` (branch `main`) |
| **Supabase Project ID** | `ybgkzqrpfdhyftnbvgox` |
| **App Version** | 3.1.0 (`package.json`) |
| **Document Owner** | Product Engineering |

> This PRD is a reverse-engineered, evidence-based specification of the X+1 platform as it exists in production today. Every claim is anchored to a source file path so that the document can be audited, maintained, and extended without drift. It is organized to serve four audiences simultaneously: product (sections 1–5), engineering (sections 6–10), operations (sections 11–13), and stakeholders (sections 1, 2, 14).

---

## Table of Contents

1. Executive Summary
2. Product Vision, Positioning & Audience
3. Goals, Non-Goals & Success Metrics
4. User Personas & Primary Journeys
5. Feature Inventory (Domain Map)
6. Detailed Feature Specifications
   - 6.1 Authentication & Onboarding
   - 6.2 Course Ingestion & Generation
   - 6.3 Learning Experience (Lessons & Steps)
   - 6.4 Spaced Repetition (SRS)
   - 6.5 Exam System
   - 6.6 Homework Helper (Checker + Tutor)
   - 6.7 Prepare (Exam Prep Guides)
   - 6.8 Visual Diagram Engine
   - 6.9 Progress, Analytics & Gamification
   - 6.10 Study Plan & Personalization
   - 6.11 Settings, Reports & Account Management
7. System Architecture
8. Data Model (Supabase / PostgreSQL)
9. API Surface (147 routes)
10. AI Stack, Prompts & Model Governance
11. Non-Functional Requirements
    - 11.1 Performance & Latency Budgets
    - 11.2 Security & Privacy
    - 11.3 Internationalization & RTL
    - 11.4 Accessibility
    - 11.5 Mobile & PWA
12. Infrastructure, Deployment & Operations
13. Measurement, Analytics & Experimentation
14. Known Issues, Gaps & Roadmap Candidates
15. Appendices
    - A. Environment Variables
    - B. Repository Map
    - C. Glossary
    - D. Evidence Index

---

## 1. Executive Summary

**X+1** is an AI-powered, mobile-first learning platform that converts any study artifact — a photographed notebook page, a PDF, a PowerPoint lecture, a Word document, or plain text — into a structured, interactive, multi-lesson course within seconds. Around that core extraction pipeline, X+1 layers a complete study stack:

- **Course Viewer** with 9 step types (explanation, key point, formula, diagram, example, summary, question, worked example, practice problem) and three intensity modes (`quick`, `standard`, `deep_practice`).
- **Spaced Repetition System** using a full FSRS implementation with per-user parameter optimization.
- **Exam System** that generates 8 question types (including image-label and passage-based) and integrates an uploaded Past Exam Template analyzer for style matching.
- **Homework Helper** with two complementary engines: a Socratic **Tutor** (5 hint levels, escalation ladder, evolving diagrams) and a **Checker** with four grading modes (Standard, Batch Worksheet, Before-Submit, Rubric).
- **Prepare** — long-form AI-generated study guides with YouTube enrichment and per-guide chat.
- **Visual Diagram Engine** — a six-pipeline system (Recraft, TikZ/QuickLaTeX, E2B Matplotlib, E2B LaTeX, Desmos, GeoGebra, plus Mermaid/Recharts hybrids) with 102 schemas, pre-rendered step-by-step walkthroughs, caching, and QA loops.
- **Gamification, Analytics, Study Plans, Parent Reports, and Profile Refinement** for retention and personalization.

**Stack.** Next.js 14 (App Router, TypeScript strict), Supabase (Auth + Postgres with RLS + Storage), Anthropic Claude (`claude-sonnet-4-6` default), Tailwind CSS 3.4 with `tailwindcss-rtl`, next-intl (English + Hebrew), SWR, Framer Motion, Jest 30, Playwright, Upstash Redis, Resend, PostHog. Deployed on Vercel (Hobby plan).

**Scale.** 147 API routes, 47 library subsystems under `lib/`, 37 i18n namespaces per locale (EN + HE), 100+ diagram components, 50+ database migrations, ~99 test files, ~3,220 translation lines per locale.

**Current stage.** The product has completed a launch-readiness pass (commits `71bda4d`, `3261873`, `26eedfc`). It is **free** — there is no billing, subscription, or plan gating in the codebase today. Monetization strategy is undefined.

---

## 2. Product Vision, Positioning & Audience

### 2.1 Vision

> *Learn anything. Master everything.*

X+1 aims to collapse the distance between a student's raw study material and a structured, adaptive, mastery-oriented learning experience. The product thesis is that a student's notes, textbook, homework, and past exams already contain everything needed to master a subject — what they lack is structure, practice, feedback, and memory. X+1 provides all four, powered by Claude.

*Source:* `app/layout.tsx` (metadata), `public/manifest.json`, `messages/en/landing.json`.

### 2.2 Positioning Statement

> For students preparing for exams in curriculum-driven systems (IB, AP, A-Levels, Israeli Bagrut, US, UK) who feel that their notes are disorganized and their practice is unfocused, **X+1** is an AI study companion that turns any study artifact into an interactive course, a spaced-repetition deck, a predictive exam, and a Socratic tutor — all personalized to the student's grade, goal, and learning style. Unlike generic AI chatbots, X+1 is *curriculum-aware*, *mastery-tracked*, *bilingual (English/Hebrew with full RTL)*, and *homework-safe* (Socratic, never gives answers).

### 2.3 Target Audience

**Primary persona: the exam-driven student.**
- Ages: ~12 to ~22 (middle school through early university).
- Study systems explicitly supported: IB, UK (including IGCSE / A-Levels), AP, Israeli Bagrut, US, General.
- Subjects: Sciences, Mathematics, Humanities, Languages, Arts, Technology (curriculum data shipped for multiple subjects; `lib/curriculum/*`).
- Devices: primarily mobile (camera capture is a first-class input), with desktop for longer study sessions.
- Languages: English and Hebrew, with RTL UI and locale-aware date/number formatting.

**Secondary persona: the parent/guardian.**
- Receives optional **weekly progress reports** by email via Resend (`lib/email/report-generator.ts`, cron `0 8 * * 0`).
- No parent login / parent dashboard exists today (reports-only touchpoint).

**Tertiary persona: the teacher.**
- Implicit consumer via *Rubric Mode* in the Homework Checker: a teacher's rubric can be uploaded as an image and used to grade the student's work against the exact criteria. No teacher authoring, sharing, or classroom features exist.

### 2.4 Brand System

| Property | Value | Source |
|---|---|---|
| Name | X+1 | `package.json`, `app/layout.tsx` |
| Tagline | "Learn anything. Master everything." | `app/layout.tsx`, `public/manifest.json` |
| Primary color | Aurora Violet `#8B5CF6` (light `#A78BFA`, dark `#7C3AED`) | `app/globals.css` |
| Accent colors | Rose `#EC4899`, Sky `#0EA5E9`, Amber `#F59E0B`, Green `#10B981` | `app/globals.css` |
| Typography — English | Plus Jakarta Sans (weights 400–800) | `app/layout.tsx` |
| Typography — Hebrew | Rubik (`subsets: ['hebrew','latin']`, `display: swap`) | `app/layout.tsx` |
| Design language | "Aurora Design" — pill buttons, 22px card radius, frosted-glass surfaces, soft gradient shadows | `tailwind.config.ts`, `components/ui/*` |
| Dark mode | Full support via `next-themes`, adjusted shadows and text tiers | `app/globals.css`, `components/providers/*` |
| PWA theme color | `#4F46E5` | `public/manifest.json` |

### 2.5 Monetization

As of this document, X+1 ships **no billing, subscriptions, or plan gating**. All features are free to all authenticated users. No pricing pages, Stripe integration, entitlement checks, or feature flags tied to plans were found in `app/`, `lib/`, `components/`, or the Supabase migrations. **Monetization is an open product question** (see §14).

---

## 3. Goals, Non-Goals & Success Metrics

### 3.1 Product Goals

1. **Frictionless content ingestion.** A student can turn a photo or document into a usable, lesson-structured course in under ~45s (single image) and under ~90s (multi-page document) with progressive delivery.
2. **Curriculum-aligned personalization.** Every generated artifact is shaped by the student's `study_system`, `grade`, `subjects`, `learning_styles`, `study_goal`, and `language`.
3. **Mastery-over-speed.** Surface knowledge gaps through SRS decay detection, exam prediction, and gap-targeted review sessions — not just lesson completion.
4. **Pedagogically safe help.** The Homework Tutor never gives direct answers unless escalated to Hint Level 5, and only after progressive hints (Levels 1–4) have been exhausted.
5. **Bilingual parity.** English and Hebrew experiences are keyed-equivalent (3,220 translated lines per locale, zero missing keys at the time of audit).

### 3.2 Non-Goals (Explicitly Out of Scope Today)

- Teacher authoring tools, classroom management, student rosters.
- Parent accounts or parent-facing dashboards (parents receive emails only).
- Social features: feeds, sharing of courses, public leaderboards, friends.
- Live tutoring or human-in-the-loop teaching.
- Native mobile apps (the product is a PWA; no React Native or Swift/Kotlin code exists).
- Offline-first study (service worker is cache-cleanup-only; no offline content caching).
- Monetization: billing, subscriptions, in-app purchases.

### 3.3 Success Metrics (Instrumented Today)

All metrics below are emitted to the custom analytics pipeline (`lib/analytics/client.ts` → `analytics_events`, `analytics_page_views`) and also to PostHog when configured.

| Category | Metric | Source |
|---|---|---|
| **Acquisition** | `onboarding_funnel_completed` (and per-step drop-off) | `hooks/useFunnelTracking`, onboarding page |
| **Activation** | Course generation started / succeeded / failed; time-to-first-course | `/api/generate-course` streaming events |
| **Engagement** | Daily active reviews, lesson completion rate, SRS retention rate (last 30 days) | `/api/srs/stats`, `lesson_progress`, `study_sessions` |
| **Retention** | Current streak, longest streak, 7-day activity array | `user_gamification`, `StreakWidget.tsx` |
| **Mastery** | Per-concept mastery level, peak mastery, decay detection | `user_concept_mastery` |
| **Quality** | Homework check grade consistency, diagram QA pass rate, extraction confidence | `lib/extraction/confidence-scorer.ts`, `diagram_cache.qa_verdict` |
| **Reliability** | Stuck course cleanup count, error logs, health endpoint uptime | `/api/cron/cleanup-stuck-courses`, `/api/monitoring/errors`, `/api/health` |

---

## 4. User Personas & Primary Journeys

### 4.1 Persona: "Noa" — Israeli Bagrut student, grade 11, Hebrew-first

- **Device:** iPhone (primary), family laptop (secondary).
- **Languages:** Hebrew (UI), mixed Hebrew/English content.
- **Goal:** Pass Bagrut Biology and Math 5 units.
- **Pain:** Notebook is chaotic; past Bagrut papers vary in style year over year; review feels random.
- **Primary journeys:**
  1. Snap biology lesson → generate course → study walkthrough → SRS next day.
  2. Upload past Bagrut PDF → past-exam analyzer extracts style → generate practice exam in the same style.
  3. Stuck on a homework problem → Tutor chat in Hebrew with evolving FBD diagram.

### 4.2 Persona: "Alex" — IB Year 2, English, university-bound

- **Device:** iPad + MacBook.
- **Goal:** IB HL Physics, HL Math.
- **Pain:** Needs a cheatsheet and a prediction of the final exam grade.
- **Primary journeys:**
  1. Upload PPTX lecture → generate course with **deep_practice** intensity (15 graduated problems, 3 hints each, 85% mastery threshold).
  2. Prepare guide → reads the comparison tables → jumps into the embedded YouTube clip.
  3. Runs **Exam Prediction** to see predicted score with curriculum-weighted weaknesses.

### 4.3 Persona: "Ms. Levi" — Parent of a Grade 8 student

- **Interaction:** email only.
- **Goal:** Know whether her child actually studied this week and what they struggled with.
- **Journey:** Receives the Sunday `0 8 * * 0` weekly report; unsubscribes via footer link or toggles `reports_enabled=false` in child's settings.

### 4.4 Canonical Journey: Notebook → Course → Mastery

```
1. Sign up (email + password) → verify email (OTP / token_hash, cross-device safe) → welcome email.
2. Onboarding: name → study_system → grade → subjects → study_goal → time → preferred time → learning_styles.
3. Dashboard → Upload → camera / drag-drop / document / text.
4. /api/generate-course (streaming, 240s max): heartbeats → progress events → 2-lesson "initial" course → background continuation.
5. Course Library → open course → CourseView (lesson list with status + mastery).
6. Lesson Viewer → step-by-step progression → wrong answer → worked example + hint → retry mode for failed questions.
7. Lesson complete → XP award (10 + 5 bonus for 100%) → streak popup → next lesson unlocks.
8. Next day: SRS due-cards session (interleaved, gap-aware) → FSRS updates per rating.
9. Before exam: Prepare guide + Exam Prediction + generated practice exam styled after past papers.
```

*Sources:* §6.1–§6.6, `app/(main)/*`, `app/api/*`, `components/lesson/*`.

---

## 5. Feature Inventory (Domain Map)

The product decomposes into **12 functional domains**. Each is detailed in §6.

| # | Domain | Core Tables | Primary Routes | Key Components |
|---|---|---|---|---|
| 1 | Auth & Onboarding | `auth.users`, `user_learning_profile`, `profile_refinement_state` | `app/(auth)/*`, `/api/auth/*` | `signup/page.tsx`, `login/page.tsx`, `onboarding/page.tsx` |
| 2 | Course Ingestion & Generation | `courses`, Storage bucket `course-images` | `/api/generate-course`, `/api/generate-course/continue`, `/api/courses/*`, `/api/courses/from-youtube` | `UploadModal.tsx`, `lib/ai/claude.ts`, `lib/ai/prompts.ts` |
| 3 | Learning Experience | `user_progress`, `lesson_progress`, `study_sessions` | `/api/courses/[id]/progress/*`, `/api/lesson-progress` | `LessonView.tsx`, `StepContent.tsx`, `QuestionStep.tsx`, `DeepPracticeLessonView.tsx` |
| 4 | Spaced Repetition | `review_cards`, `review_logs`, `user_srs_settings`, `review_sessions`, `user_concept_mastery`, `user_knowledge_gaps` | `/api/srs/*` | `ReviewCard.tsx`, `RatingButtons.tsx`, `DashboardWidget.tsx`, `lib/srs/fsrs.ts` |
| 5 | Exams & Past Exams | `exams`, `exam_questions`, `past_exam_templates` | `/api/exams/*`, `/api/past-exams/*`, `/api/exam-prediction` | Exam renderers in `components/exam/question-renderers/*` |
| 6 | Homework (Checker + Tutor) | `homework_checks`, `homework_sessions`, `homework_turns` | `/api/homework/*` | `TutoringChat.tsx`, `VisualSolvingPanel.tsx`, `AnnotatedImageViewer.tsx`, `BeforeSubmitResult.tsx`, `RubricTable.tsx` |
| 7 | Prepare (Study Guides) | `prepare_guides`, `prepare_chat_messages` | `/api/prepare/*` | `GuideRenderer.tsx`, `PrepareChatSidebar.tsx`, `YouTubeEmbed.tsx` |
| 8 | Visual Diagram Engine | `diagram_cache`, `homework_diagrams` (JSONB) | `/api/diagram-engine/generate`, `/api/diagrams/render-steps` | 22 engine files in `lib/diagram-engine/`, 100+ components in `components/math/`, `components/diagrams/`, `components/homework/diagram/` |
| 9 | Progress, Analytics & Gamification | `analytics_events`, `analytics_page_views`, `analytics_page_metrics`, `analytics_feature_usage`, `error_logs`, `user_gamification` | `/api/analytics/*`, `/api/admin/analytics/*`, `/api/gamification/*` | `StreakWidget.tsx`, `XPPopup.tsx`, `PostHogProvider.tsx` |
| 10 | Study Plan & Personalization | `study_plans`, `profile_refinement_state`, `profile_history` | `/api/study-plan/*`, `/api/profile/refinement`, `/api/recommendations` | `lib/adaptive/*`, `lib/student-context/*`, `lib/curriculum/*` |
| 11 | Settings, Reports & Account | `user_learning_profile`, `admin_users` | `/api/user/*`, `/api/reports/*` | `app/(main)/settings/page.tsx`, `lib/email/*` |
| 12 | Admin / Ops | `admin_users`, `analytics_*`, `error_logs` | `/api/admin/*`, `/api/cron/*`, `/api/health`, `/api/monitoring/errors` | `app/(admin)/*`, `lib/admin/utils.ts` |

---

## 6. Detailed Feature Specifications

### 6.1 Authentication & Onboarding

**Auth provider.** Supabase Auth, email + password only. OAuth, magic links, and 2FA are not wired (Supabase infrastructure is present but not configured). Sessions are stored as httpOnly cookies (`sb-access-token`); access tokens last ~1 hour and refresh tokens last ~30 days (Supabase defaults). The `middleware.ts` at repo root refreshes the session on every request via `lib/supabase/middleware.ts::updateSession`.

**Password policy.** Minimum 8 characters, client-side validated, bcrypt-hashed by Supabase. Confirmation field required on signup.

**Sign-up flow** (`app/(auth)/signup/page.tsx`).
1. User enters name, email, password, confirm, must tick ToS + Privacy.
2. Client validates format.
3. `supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: ${NEXT_PUBLIC_APP_URL}/auth/callback } })`.
4. Success UI shows email-search tips (Gmail, iCloud, spam). A **Resend** button has a 60s cooldown and 300s backoff on 429.
5. On email click → `app/auth/callback/route.ts` handles two flows:
   - **PKCE code flow** via `exchangeCodeForSession(code)` when the same device initiated signup.
   - **Token hash flow** via `verifyOtp({ token_hash, type })` for cross-device clicks (e.g., sign up on desktop, click on phone).
6. Welcome email sent via Resend (`lib/email/send-welcome.ts`, fire-and-forget).
7. Redirect → `/dashboard` or `/onboarding` depending on presence of `user_learning_profile`.

**Sign-in flow** (`app/(auth)/login/page.tsx`).
- `supabase.auth.signInWithPassword`. Generic error messages ("Invalid login credentials") prevent email enumeration. URL message params are **allowlisted** to prevent XSS (only whitelisted `messageKey`s like `emailVerified`, `passwordUpdated` render translated strings).

**Forgot password** (`app/(auth)/forgot-password/page.tsx` + `/api/auth/forgot-password/route.ts`).
- Rate-limited via Upstash Redis by `ip:${ip}:${email}` key (`RATE_LIMITS.forgotPassword` = 5/hour).
- Always returns success message (email enumeration protection).
- Supabase sends reset email; link → `/reset-password`.
- On successful update, user is signed out and redirected to login with `messageKey=passwordUpdated`.

**Middleware** (`middleware.ts`).
- Refreshes session cookies.
- Protects all `/dashboard`, `/courses`, `/practice`, `/study`, `/exam`, `/prepare`, `/homework` paths.
- Redirects authenticated users away from `/login`, `/signup` to `/dashboard`.
- Locale detection: reads `NEXT_LOCALE` cookie; falls back to parsing `Accept-Language`; `he` if Hebrew detected, else `en`; stored in cookie for 1 year.

**Onboarding** (`app/(main)/onboarding/page.tsx`).
- 8 steps: Name → Study System → Grade → Subjects (only if curriculum supported) → Study Goal → Time Availability → Preferred Study Time → Learning Styles.
- **Quick mode** shortcut after system selection: Name → System → Grade → Goal (skip the last four).
- State persisted in `localStorage` key `xplus1_onboarding_state` (7-day TTL) so refresh does not lose progress.
- Funnel events fired per step via `useFunnelTracking('onboarding')`.
- Completion → write row to `user_learning_profile` (study_system, grade, subjects, subject_levels, exam_format, language, learning_styles) → redirect `/dashboard`.

**Account management** (`app/(main)/settings/page.tsx`).
- Editable: display name, learning preferences, language, exam format, parent email, reports toggle, visual learning prefs (diagrams on/off, complexity level, animation speed), theme, onboarding reset.
- Read-only: email, account creation date.
- Account deletion: **manual only** — opens a `mailto:support@xplus1.ai` after typing "DELETE" in a confirmation box. No API endpoint for self-serve deletion; no data export endpoint. This is a **GDPR gap** (see §14).

**Email touchpoints** (`lib/email/*`).

| Event | Template | File |
|---|---|---|
| Email verification | (Supabase default) | Supabase dashboard |
| Welcome | `WelcomeEmail.ts` | `lib/email/send-welcome.ts` |
| Course completion | `CourseCompletionEmail.ts` | `lib/email/send-course-completion.ts` |
| Weekly parent report | `WeeklyProgressReport.tsx` | `lib/email/report-generator.ts`, cron `0 8 * * 0` |
| Re-engagement nudge | `NudgeEmail.ts` | `lib/email/send-nudge.ts`, cron `0 9 * * *` |

### 6.2 Course Ingestion & Generation

This is the **core pipeline** of the product and the most engineering-dense subsystem.

#### 6.2.1 Supported Inputs

| Source | MIME / extension | Max size | Entry point |
|---|---|---|---|
| Single image | JPEG, PNG, WebP, GIF, HEIC | 10 MB each | `UploadModal.tsx` → `/api/generate-course` |
| Multi-image (multi-page) | Same as single | 10 MB each, max 10 files, 50 MB total | Same |
| PDF | `.pdf` | 20 MB | Parsed via `lib/documents/pdf.ts` (`pdfjs-dist`) |
| PowerPoint | `.pptx`, `.ppt` | 20 MB | Parsed via `lib/documents/pptx.ts` (`jszip`) |
| Word | `.docx`, `.doc` | 20 MB | Parsed via `lib/documents/docx.ts` (`mammoth`) |
| Plain text | - | no limit | `/api/courses/manual` or text tab in modal |
| YouTube URL | URL | - | `/api/courses/from-youtube` (streaming, 180s) |

**HEIC handling:** server-side conversion via `sharp` (fallback `heic-convert`); client fallback via `heic2any` web worker. Magic-byte validation of every fetched image to reject malformed uploads.

**Upload UI:** `components/upload/upload-modal/*` — drag-and-drop, multi-file, camera capture (iOS native picker), text input, intensity mode selector.

#### 6.2.2 Intensity Modes

Configured in `lib/learning/intensity-config.ts`:

| Mode | Duration | Steps/Lesson | Practice % | Worked Examples | Practice Problems | Mastery Target | Retry Until Mastery |
|---|---|---|---|---|---|---|---|
| `quick` | 10–15 min | 5–8 | 20% | 1 | 2 | 50% | No |
| `standard` *(default)* | 20–30 min | 8–12 | 40% | 2 | 4 | 70% | No |
| `deep_practice` | 45–60 min | 15–25 | 70% | 1 | 15 (graduated easy→med→hard, 3 progressive hints each) | 85% | **Yes** |

Each mode injects a distinct instruction block into the Claude prompt (`lib/ai/prompts.ts`).

#### 6.2.3 Streaming Pipeline (`/api/generate-course`)

- **Timeout:** `maxDuration = 240`.
- **Transport:** `ReadableStream` of newline-delimited JSON with message types `heartbeat | progress | success | error`.
- **Heartbeat:** every 3s for Safari/iOS, 10s for others (prevents iOS Safari connection reset on long AI operations).
- **Progress stages:** 5% start → 10% auth → 15% validate → 25% generate → 30–45% analyze (source-dependent) → 75% process → 85% flashcards → 95% finish → 100% success.
- **Rate limit:** 5/min per user (Upstash Redis).

#### 6.2.4 Progressive Generation (Fast Initial + Background Continuation)

For multi-page sources, X+1 uses a two-phase pattern:

**Phase 1 — Initial (~30 s)** — `generateInitialCourse()` in `lib/ai/claude.ts`.
- Returns immediately with 2 full lessons + complete `lesson_outline` + `document_summary` + `total_lessons`.
- DB state: `generation_status = 'partial'`, `lessons_ready = 2`, `total_lessons = N`.

**Phase 2 — Continuation** — `/api/generate-course/continue` + `generateContinuationLessons()`.
- Generates 2 lessons at a time in the background.
- Uses `document_summary` and prior `lesson_outline` as context.
- Client polls; `useGenerationStatus` hook auto-triggers continuations.
- DB state progresses `partial → generating → complete` (or `failed`).

Single images, single-page docs, and text inputs skip Phase 2 (single-shot generation).

#### 6.2.5 AI Configuration

- **Primary model:** `claude-sonnet-4-6` (override `ANTHROPIC_MODEL`).
- **Token budgets:** 4,096 (text extraction), 8,192 (continuation lessons), 16,384 (course generation + initial course).
- **Retry policy:** 3 attempts, exponential backoff 1s/2s/4s, retryable on 429, 500, 502, 503, 504, 529 + network errors.
- **JSON recovery:** `repairTruncatedJson()` closes open braces/brackets on `max_tokens` truncation.
- **Content filter:** `lib/ai/course-validator.ts::filterForbiddenContent()`.
- **Input sanitization:** `sanitizeUserInput()` caps length at 200 chars, strips `<>{}[]` and backticks.

#### 6.2.6 Output Schema

Stored in `courses.generated_course` as JSONB; typed by `GeneratedCourse` in `types/index.ts`:

```ts
GeneratedCourse {
  title: string
  overview: string
  lessons: Lesson[]                 // Lesson { title, steps: Step[] }
  images?: CourseImage[]
  learningObjectives?: LearningObjective[]
}
Step {
  type: StepType                    // 9 types
  content: string
  title?, options?, correct_answer?, explanation?
  imageUrl?, imageAlt?, imageSource?, imageCaption?, imageCredit?, imageCreditUrl?
  diagramData?: { type, data, visibleStep?, totalSteps?, stepConfig?, stepByStepSource? }
}
```

#### 6.2.7 Ancillary Generation

All fire-and-forget after the main course is written (failures logged, do not block the user):

- **Cover image** — `lib/ai/image-generation.ts` calls Google `gemini-2.5-flash-image`, uploads PNG to `course-images/covers/{userId}/{courseId}-cover.png`, writes `cover_image_url`.
- **Web image enrichment** — `fetchWebImagesParallel()` calls `searchEducationalImages()` (Unsplash) in batches of 20 for steps with empty `imageUrl`.
- **Diagrams** — `lib/diagram-engine/integration.ts::generateDiagramsForSteps()` (see §6.8).
- **SRS flashcards** — `lib/srs/card-generator.ts::generateCardsFromCourse()` inserts into `review_cards`.
- **Concept extraction** — `lib/concepts/extractAndStoreConcepts()` builds knowledge graph nodes with curriculum alignment.
- **Extraction confidence** — `lib/extraction/confidence-scorer.ts::scoreExtraction()` computes a 0–1 score weighted 40% text / 20% structure / 20% formula / 20% diagram and writes `extraction_confidence` + `extraction_metadata`.

#### 6.2.8 Error Recovery

- **Stuck courses:** `/api/cron/cleanup-stuck-courses` resets any course in `generating` state older than 10 minutes to `failed`. Runs daily at 3 AM UTC (Hobby plan limit; was hourly before commit `34f6e60`).
- **Retryable errors:** 429, 500, 502, 503, 504, 529, network.
- **Non-retryable:** 401, 403, 400 (image-specific), out-of-credits, region-restricted.

#### 6.2.9 Typical Generation Times (Empirical, from code comments)

| Source | Time |
|---|---|
| Single image | 30–45 s |
| 3–10 multi-image | 50–90 s total (initial 25–35 s + background) |
| PDF (5 pages) | 25–35 s initial + background |
| PPTX (20 slides) | 30–40 s initial + background |
| Large PPTX (31+ slides) | 40–50 s initial + background |
| Text-only | 20–30 s (no progressive) |

### 6.3 Learning Experience (Lessons & Steps)

**Primary surfaces.**
1. **Course Library** — `app/(main)/courses/page.tsx`. Responsive grid (1/2/3/4 cols), search, sort (newest/oldest), bulk-select deletion, skeleton loading.
2. **Course Overview** — `app/(main)/course/[id]/CourseView.tsx`. Progress bar (`completed_lessons.length / total_lessons * 100`), per-lesson badges (Completed ✓ / Current / Locked 🔒), mastery level per lesson from `lesson_progress`, buttons: Generate Cheatsheet, Add Material, Export Course.
3. **Lesson Viewer (standard/quick)** — `LessonView.tsx`. Sticky header with progress bar (clickable to jump), step-by-step vertical flow, footer Back/Continue buttons, "X steps remaining" hint.
4. **Deep Practice Viewer** — `DeepPracticeLessonView.tsx`. Four phases: intro → worked_example → practice → mastery_complete. Adaptive difficulty 1–3, three-level hints, mastery threshold enforced.
5. **Retry Mode** — triggered when final step has failed questions; amber header "Let's Try Again!", review page before retry, questions cycled until all correct.
6. **Lesson Complete** — `LessonComplete.tsx`. Staggered animations, XP popup, perfect-accuracy bonus (+5 XP), streak popup, key-point recap, next-lesson CTA.

**Step types & rendering** (`components/lesson/StepContent.tsx`, lines 78–136).

| Type | Visual | Interactions |
|---|---|---|
| `explanation` | Large prose (lg/xl), optional image, fade-in | Image credit/caption |
| `key_point` | Amber gradient box, lightbulb icon, uppercase label | F4 annotation, "Go Deeper" expansion |
| `formula` | Blue/violet gradient, mono formula box, explanation with left border | Annotation, Go Deeper |
| `diagram` | Purple/pink gradient, interactive or static | Step ← → controls, fallback to static image |
| `example` | Green/emerald gradient, lightning icon | Annotation, Go Deeper |
| `summary` | Violet/purple gradient, checkmark icon | Numbered bullets, annotation |
| `question` | Multi-choice UI with hints, worked examples, retry | Select → Check → Feedback → Continue/Retry |
| `worked_example` | Appears on second wrong answer | Method steps, error diagnosis, "Try Another" |
| `practice_problem` | Deep-practice only | Progressive difficulty, 3 hints |

**Math rendering.** KaTeX via `components/ui/MathText.tsx`. `formatMathInText()` converts `x^2 → x²`, `a_1 → a₁`, `sqrt(x) → √x`, `>= → ≥`. Multi-method solutions via `MathSolutionRenderer.tsx`.

**Progress model** (`types/index.ts::UserProgress`).
```ts
{ user_id, course_id, current_lesson, current_step,
  completed_lessons: number[], questions_answered, questions_correct }
```
Completion writes to `user_progress` and triggers mastery calc via `/api/lesson-progress`; course completion triggers `send-course-completion` email.

**Gamification.**
- **XP:** 10 per lesson + 5 bonus for 100% question accuracy. Stored in `user_gamification.total_xp`. Awarded via `/api/gamification/xp`.
- **Streak:** daily activity boolean array (7 days), `current_streak`, `longest_streak`, at-risk indicator, countdown, **streak freezes**, milestone badges at 7/14/30/100 days. See `StreakWidget.tsx`.
- **Level up** notifications via `XPPopup.tsx` and level titles.

**Audio/TTS:** not implemented in the course viewer.

**Social sharing:** not implemented. `ExportCourseButton.tsx` exports PDF/HTML only.

### 6.4 Spaced Repetition System (SRS)

**Algorithm.** Full FSRS (Free Spaced Repetition Scheduler) in `lib/srs/fsrs.ts`.

**Default parameters** (`FSRS_PARAMS`):
```
w = [0.4, 0.6, 2.4, 5.8, 4.93, 0.94, 0.86, 0.01, 1.49,
     0.14, 0.94, 2.18, 0.05, 0.34, 1.26, 0.29, 2.61]
requestRetention = 0.9      maximumInterval = 36500 days
easyBonus = 1.3             hardInterval = 1.2
```

**Rating scale:** 1 = Again, 2 = Hard, 3 = Good, 4 = Easy.

**State machine:** `new → learning → review` (or `review → relearning → review` on lapse).

**Core formulas** (from `lib/srs/fsrs.ts`):
```
retrievability = e^(-elapsedDays / stability)
newDifficulty  = clamp(oldDifficulty + delta[rating], 0.1, 1.0)
newStability   = oldStability * growth[rating] * (1 - difficulty*0.5)
                                * (1 + (1 - retrievability) * 0.5)
interval       = stability * ln(retention) / ln(0.9)
```

**Per-user optimization.** After 50 reviews, `lib/srs/fsrs-optimizer.ts` blends the user's actual retention rate with the current target, clamps to `[0.80, 0.95]`, and tunes the initial stability weights. Results are persisted to `user_learning_profile.fsrs_params`.

**Card types** (`types/srs.ts`): flashcard, multiple_choice, true_false, fill_blank, short_answer, matching, sequence, multi_select (plus legacy key_point, formula, question, explanation).

**Card generation.** `lib/srs/card-generator.ts`:
1. Extract lesson content → classify `TopicType`.
2. Batch 15 items per Claude call.
3. Validate: no RTL question-mark corruption, min length (5 chars math, 5+ words non-math), ≤120 chars, must be interrogative or imperative (`Solve:`, `פתור`, etc.).
4. Format to card type, link concepts.
5. Insert into `review_cards`.

**Due session** — `/api/srs/due`:
1. Load user SRS settings (`max_new_cards_per_day`, `max_reviews_per_day`, `interleave_reviews`).
2. Load weak-concept IDs from student context.
3. Fetch new + due cards (prioritize overdue, then weak concepts).
4. **Interleave**: group by course, round-robin, max 3 consecutive from same lesson.
5. Fire-and-forget regenerate top-10 "bad" questions in background.
6. Return `ReviewSession` with `cards_due`, `new_cards`, `review_cards`, `cards[]`, and optional `fsrs_params` preview.

**Review submission** — `/api/srs/review`:
1. Verify ownership.
2. `processReview(card, rating, retention, userParams)` → new stability, difficulty, due_date.
3. Insert into `review_logs`.
4. Update concept mastery with optimistic locking:
   - rating ≥ 3 → `+0.05` capped at 1.0, track `peak_mastery`.
   - rating < 3 → `-0.1` floored at 0.
   - If mastery ≥ 0.5 → resolve any matching `user_knowledge_gaps`.
5. Return next due date, scheduled days, new state.

**Session types** — `lib/srs/daily-session.ts`:
- `daily` (mixed priority 1→4): due → gap-targeted → reinforcement (decay-detected) → new.
- `targeted` (specific concept IDs).
- `gap_fix` (all unresolved gaps).
- `custom`.

**Difficulty feedback** (`too_easy` / `too_hard`) adjusts `user_performance_state.target_difficulty` and `difficulty_floor` by ±0.5 / ±0.25.

**Dashboard stats** — `/api/srs/stats`:
`total_cards`, `cards_due_today`, `cards_reviewed_today`, `streak` (consecutive days with reviews, up to 365), `retention_rate` (% rating ≥ 3 in 30 days), `cards_by_state`, `unresolved_gaps`, `gap_targeted_cards`.

### 6.5 Exam System

**Generation endpoint:** `/api/exams` (POST).

**Input:**
```ts
{ courseId, questionCount: 5-50, timeLimitMinutes: 5-180,
  examFormat?: 'match_real' | 'adaptive' | 'standard',
  subjectId?: string }
```

**Pipeline:**
1. Load course content, build curriculum context (study system, subjects, grade, assessment objectives from `lib/curriculum/*`).
2. Load matching past-exam templates (filtered by `subjectId`) → extract style, difficulty distribution, diagram types.
3. Load student intelligence (weak concepts, target difficulty, focus question types).
4. Compute question distribution (default: ~35% MC, 15% T/F, 15% fill-blank, 10% short, 10% matching, 10% ordering, ~5% passage, 10% image_label when appropriate).
5. Claude generates JSON with all fields; image_label placeholders resolved via `searchEducationalImages()`.
6. Validate: drop vague/"explain"/"summarize" questions, require ≥50% quality questions.
7. Compute points (1 per Q, 2 for matching/ordering, 2+ for image_label, sum of sub-questions for passage).
8. Insert into `exams` + `exam_questions`.

**Question types** (`types/exam.ts`): `multiple_choice`, `true_false`, `fill_blank`, `short_answer`, `matching`, `ordering`, `passage_based`, `image_label`. Passage-based contains an array of `SubQuestion`s; image_label contains `ImageLabelData` with labels positioned as percentages and `interaction_mode: 'drag' | 'type' | 'both'`.

**Taking experience** (`app/(main)/exams/[id]/page.tsx`):
- Question palette with answer status, "mark for review" flag, timer countdown, auto-save to `localStorage` (`xplus1_exam_answers_${examId}`, `xplus1_exam_marked_${examId}`), submit confirmation.
- Per-type renderers in `components/exam/question-renderers/`: `MultipleChoiceRenderer`, `TrueFalseRenderer`, `FillBlankRenderer`, `ShortAnswerRenderer`, `MatchingRenderer` (drag-and-drop, 75%+ = full credit), `OrderingRenderer` (must be exact), `PassageBasedRenderer`, `ImageLabelRenderer`.

**Grading** (`/api/exams/[id]/submit`):
- Text answers normalized (lowercase, trim, strip punctuation), checked against `correct_answer` + `acceptable_answers[]`.
- Matching: 75%+ correct → full points; else `floor(max * pct_correct)`.
- Ordering: 100% or 0.
- Passage: sum of graded sub-question points.
- Image label: 75%+ labels correct → full points.
- Response: `{score, total_points, percentage, grade (A-F), correctCount, incorrectCount, weakLessons[]}`.

**Past Exam Templates** (`lib/past-exams/analyzer.ts`, `types/past-exam.ts`).
- Upload image/PDF/PPTX/DOCX → stored in `past_exam_templates` with `analysis_status`.
- Claude Vision extracts: `question_types` distribution, `difficulty_distribution`, `point_distribution`, `structure_patterns` (sections, instructions), `grading_patterns` (partial credit, rubric style, bonus questions), `question_style` (length, scenarios, command terms, Bloom levels), `sample_questions[]`, and `image_analysis` (diagram types, labeling style, label count, suggested image queries).
- Used by the exam generator to match style of real past papers.

**Exam Prediction** — `/api/exam-prediction` predicts score for a course based on mastery + concept gaps + historical performance (60s timeout).

### 6.6 Homework Helper (Checker + Tutor)

The homework subsystem is the largest domain by LOC: `lib/homework/checker-engine.ts` (88 KB), `lib/homework/tutor-engine.ts` (73 KB), `lib/homework/walkthrough-generator.ts` (36 KB), plus 10+ supporting modules.

#### 6.6.1 Homework Checker (`lib/homework/checker-engine.ts`)

**Four modes:**

1. **Standard** — single problem. Analyze task+answer against references → generate `HomeworkFeedback` with `correctPoints[]`, `improvementPoints[]` (with `severity`), `suggestions[]`, `encouragement`, letter grade, and **annotations** (bounding-box regions on the answer image for visual marking).

2. **Batch Worksheet** — 1–4 worksheet images analyzed in a single Claude Vision call. Extracts ALL problems, solves each independently, classifies `errorType: factual | conceptual | calculation | formatting | incomplete`, returns `topicBreakdown` and a percent score.

3. **Before-Submit** — non-revealing mode. For each problem returns `status: correct | check_again | needs_rework | unclear` and **3 escalating hints** that never give the answer. Practice sessions unlock after hints used.

4. **Rubric** — two phases: (A) parse rubric image to extract criteria + max points, (B) grade homework against the rubric with per-criterion `earnedPoints`, `reasoning`, `suggestions`, then compute letter grade.

**Grade consistency.** A critical accuracy mechanism: the final grade is *not* the one Claude suggests but is **recomputed from the feedback items** (`correctCount / totalItems * 100` with penalties: −5 per major error, −2 per moderate). If Claude's estimate differs by more than 15 points, the calculated value wins. All-correct with no major errors bumps to ≥ 80; 100% correct sets to 95.

**Streaming** — `/api/homework/check` returns `ReadableStream` with `heartbeat | status | result | error` events (3s/5s heartbeat for Safari/other).

**Storage:** `homework_checks` table with feedback JSONB + mode-specific result JSONB.

**Supporting modules:**
- `lib/homework/math-verifier.ts` — `mathjs`-based verification (`verified | unverifiable | disagreement`).
- `lib/homework/feedback-quality.ts` — validates structure, re-prompts on weak feedback.
- `lib/homework/student-work-reader.ts` — handwriting extraction with confidence levels.
- `lib/homework/reference-analyzer.ts` — extracts content and ranks relevance of reference images.

#### 6.6.2 Homework Tutor (`lib/homework/tutor-engine.ts`)

**Philosophy: GUIDE, DON'T TELL.**
- Never give direct answers until Hint Level 5.
- Ask questions that lead to insight.
- Validate struggle, celebrate small wins, normalize difficulty.

**Session creation** — `/api/homework/sessions`:
- Inputs: `inputMode`, question image/text, references, `initialAttempt`, `comfortLevel: new | some_idea | just_stuck`, `enableDiagrams`, `diagramMode: off | quick | accurate`.
- Runs `analyzeQuestion()` + `analyzeReferences()` → persists in `homework_sessions`.

**Chat** — `/api/homework/sessions/[sessionId]/chat` (streaming, 120s max):
- Builds system prompt from `SOCRATIC_TUTOR_SYSTEM_BASE` + grade/system context + language complexity + pedagogical approach + language instruction.
- Response type:
```ts
TutorResponse {
  message, pedagogicalIntent, detectedUnderstanding,
  detectedMisconception?, suggestedNextAction, estimatedProgress,
  shouldEndSession, celebrationMessage?,
  diagram?: TutorDiagramState, visualUpdate?: VisualUpdate,
  diagramStatus?
}
```
- Conversations stored as JSONB in `homework_sessions.conversation` and normalized to `homework_turns` (source of truth for text).

**Five hint levels** (`lib/homework/hint-generator.ts`):

| Level | Name | Rule |
|---|---|---|
| 1 | Conceptual Nudge | Point at the relevant concept/formula, ask what applies |
| 2 | Strategic Guide | Suggest first step without doing it, require student action |
| 3 | Worked Example | Show a *similar but simpler* problem solved, end with "now apply to yours" |
| 4 | Step-by-Step Guide | Walk through 1–2 steps of *their* problem, heavy scaffolding |
| 5 | Show Answer | Full solution with "why" each step; gentle note about learning |

**Escalation ladder** (`app/api/homework/sessions/[sessionId]/chat/route.ts`):
`[ESCALATION:REPHRASE|ANALOGY|CONCRETE|VIDEO|EASIER]` — rephrase with simpler words, use an everyday analogy, walk a numerical concrete example, search YouTube, or generate an easier version of the same problem type.

**Diagram evolution.** Tutor responses can attach a `TutorDiagramState` whose `visibleStep` auto-advances each turn, plus a `VisualUpdate` that persists in a side panel (Desmos / GeoGebra / Recharts / Mermaid / SVG / engine image). The **final step MUST include `showCalculation`** with the numerical answer.

**Misconception tracking** — `misconception-recorder.ts` writes detected misconceptions to conversation messages; used for profile refinement.

**Walkthrough** — `/api/homework/sessions/[sessionId]/walkthrough` (streaming, 240s). Uses `walkthrough-generator.ts` to classify the problem (`projectile | fbd | geometry | graph | circuit | generic | text-only`) and produce an ordered list of `WalkthroughStep`s with layered TikZ code so each step can be revealed progressively (see §6.8).

### 6.7 Prepare (Exam Prep Guides)

**Purpose.** Long-form, densely formatted AI-generated study guides with tables, diagrams, YouTube enrichment, and a per-guide chat assistant.

**Generation** — `/api/prepare/generate` (streaming, 240s).
- Inputs: `content` (≥20 chars), `sourceType`, optional `imageUrls`, `documentUrl`, `language`.
- Streams Server-Sent Events (`status`, `heartbeat`, `complete`, `error`); heartbeat every 3s (Safari) or 10s.
- Fetches user learning context for personalization.
- Claude produces a `GeneratedGuide` (see schema below).
- `repairJSON()` on truncation, validation + normalization (IDs, orders).
- Parallel YouTube search (`searchMultipleQueries()` with 2 results per query, deduped) → embedded videos.
- Updates `prepare_guides.generated_guide`, `youtube_videos`, `generation_status='complete'`.

**Schema** (`types/prepare.ts`):
```ts
GeneratedGuide {
  title, subtitle, subject, estimatedReadingTime, generatedAt,
  topics: GuideTopic[3-4],                // each with 3-5 sections
  quickReference?: GuideSection,
  youtubeSearchQueries?: string[3-4]
}
GuideSection {
  id, type, title, content (markdown),
  tables?: GuideTable[],
  diagrams?: GuideDiagram[],
  videos?: GuideYouTubeVideo[],
  subsections?, order
}
type GuideSectionType =
  | 'overview' | 'definitions' | 'theory' | 'examples'
  | 'model_answer' | 'formula' | 'comparison'
  | 'quick_reference' | 'possible_questions'
```

**YouTube integration** (`lib/prepare/youtube-search.ts`):
- YouTube Data API v3, requires `YOUTUBE_DATA_API_KEY`.
- `part: 'snippet'`, `type: 'video'`, `videoEmbeddable: 'true'`, `relevanceLanguage: 'en'`, `safeSearch: 'strict'`, 10s timeout.
- Graceful degradation if API key missing (empty array, guide still ships).

**Viewing** — `PrepareGuideView.tsx`:
- Left: full guide with markdown + LaTeX math (`MarkdownWithMath.tsx`), tables, diagrams, YouTube embeds, Table of Contents.
- Right: **Chat Sidebar** loading up to 50 messages from `prepare_chat_messages`, supporting actions `quiz | practice | explain | diagram`.
- Share token generation + PDF export (`/api/prepare/[id]/pdf`).

**Chat** — `/api/prepare/[id]/chat`:
- Prompt includes guide content, active `section_ref`, action directive.
- 2–5 sentence responses, may return `diagram` JSON for rendering.

### 6.8 Visual Diagram Engine

The diagram subsystem is the most architecturally ambitious part of the product. It is a **six-pipeline router** with 102 schemas, 123 TikZ templates, a QA loop, a two-tier cache, and pre-rendered step walkthroughs.

#### 6.8.1 Routing

- **Tier 1 — AI router** (`lib/diagram-engine/router.ts::routeQuestionWithAI`) — Claude Sonnet chooses a pipeline.
- **Tier 2 — Sync router** (`routeQuestion`) — 143 regex rules, keyword scoring, TikZ template-confidence detection; default fallback is TikZ.
- Fallback chain: TikZ → Matplotlib → TikZ → LaTeX (`FALLBACKS` map).

#### 6.8.2 Pipelines

| # | Pipeline | Use case | Executor | Output |
|---|---|---|---|---|
| 1 | **Recraft** (AI image + Vision labels) | Organs, cells, anatomy, DNA, organisms, cutaways | `recraft-executor.ts` → Recraft API → Claude Vision labels → TikZ composite | PNG with labeled overlay |
| 2 | **TikZ** (vector geometry) | Geometry, circuits, molecules, Punnett, FBD, food chains, elementary math | `tikz-executor.ts` → QuickLaTeX API (remote `pdflatex`) | PNG |
| 3 | **E2B Matplotlib** | Graphs, plots, histograms, scatter, trajectories, supply/demand | `e2b-executor.ts` → Python 3 → matplotlib (300 DPI, serif) | base64 PNG |
| 4 | **E2B LaTeX** | Long division (`\intlongdivision`), `\opmul`/`\opadd`, factor trees (`forest`), matrices, truth tables | `e2b-executor.ts` → `pdflatex` + ImageMagick (`texlive-full` E2B template) | base64 PNG |
| 5 | **Desmos** (client-side interactive) | `coordinate_plane`, `function_graph`, `linear_equation`, `quadratic_graph`, `inequality_graph`, `system_of_equations`, `scatter_plot_regression`, `trigonometric_graph`, `piecewise_function`, `parametric_curve`, `polar_graph` | `desmos-adapter.ts` → `DesmosRenderer.tsx` | Interactive (no image) |
| 6 | **GeoGebra** (client-side interactive) | `triangle`, `circle_geometry`, `angle_measurement`, `parallel_lines`, `polygon`, `transformation`, `congruence`, `similarity`, `pythagorean_theorem`, `circle_theorems`, `construction` | `geogebra-adapter.ts` → `GeoGebraRenderer.tsx` | Interactive (no image) |
| + | **Mermaid & Recharts** (hybrid) | Flowcharts, trees, bar/pie/line charts | `MermaidRenderer.tsx`, `RechartsRenderer.tsx` | Interactive DOM/SVG |

#### 6.8.3 Schemas (102)

Distributed by domain (approximate): Geometry 15+, Biology/Anatomy 12+, Physics 18+, Chemistry 8+, Ecology 9+, Elementary Math 14+, Graphs & Functions 12+, Data Viz 8+, Earth Science 6+, Astronomy 5+, Genetics 7+, Misc 8+.

Schema definitions live across `types/index.ts`, `types/math.ts`, and `lib/diagram-schemas.ts` (present in feature branches; CLAUDE.md flags these as needing consolidation — duplicate type systems exist).

#### 6.8.4 TikZ Template Library

123 topic-specific templates in `lib/diagram-engine/tikz/templates/*.ts` (e.g., `3d-shapes.ts`, `activity-pyramid.ts`, `bar-graphs.ts`, `factor-trees.ts`, `food-chain.ts`, `free-body-diagram.ts`, `molecules.ts`, `punnett-square.ts`, `solar-system.ts`, `water-cycle.ts`, …). `topic-detector.ts` scores confidence; ≥ 0.6 → template is used and AI fills specifics. `category-guidance.ts` (50 KB) encodes domain-specific constraints.

**TikZ constraints** (to prevent QuickLaTeX failure):
- Max 3500 chars per diagram.
- Forbidden: `\pgfmathsetmacro`, `foreach` > 8, `plot[domain=...]`.
- Coordinates must be precomputed decimals.
- 15s timeout.

#### 6.8.5 Step-by-Step Walkthroughs

- TikZ uses **LAYER markers** (`% === LAYER 1: Setup ===`); each layer compiled cumulatively → PNGs.
- Matplotlib injects `savefig` calls in a single run → extracts N frames.
- LaTeX follows the same cumulative-subset strategy.
- Recraft does progressive label reveal on a shared base image.
- Pre-rendered PNGs uploaded to Supabase Storage → delivered in `DiagramResult.stepImages[]`.
- UI: `StepSequencePlayer` shows current step with bilingual (EN/HE) labels and explanations + prev/next navigation.

#### 6.8.6 Label Pipeline (Recraft V2)

- Claude Vision identifies structures → returns JSON labels with `text`, `x`, `y`, `targetX`, `targetY` as percentages.
- `computeLabelPositions()` spreads labels around four sides with collision avoidance.
- TikZ composites labels onto the base image (text rendered by LaTeX, not burned into the pixel data).
- V2 adds parallel label generation and Supabase upload of base images for long-term reuse.

#### 6.8.7 QA Loop

- `qaCheckDiagram()` with pipeline-specific QA prompts in `qa-prompts.ts`.
- Up to 2 retries with feedback; third attempt ships regardless.
- Only passing diagrams are cached.

#### 6.8.8 Caching

- **Tier 1:** in-memory LRU (50 entries, 1-hour TTL).
- **Tier 2:** Supabase `diagram_cache` table.
- Key: SHA-256 of normalized question (lowercase, strip prefixes like "draw a", "show me").
- Tracks `hit_count`, `last_hit_at` (fire-and-forget).

### 6.9 Progress, Analytics & Gamification

**Custom analytics** (`lib/analytics/client.ts`):
- 30-min session timeout, UUID sessions in `localStorage`.
- Event batching (flush every 5s or 10 events).
- Events: page views (entry/exit, time on page, scroll depth), feature events, errors, funnel steps, clicks with position.
- Tables: `analytics_events`, `analytics_page_views`, `analytics_page_metrics`, `analytics_feature_usage`, `error_logs`.

**Admin dashboards** — `/api/admin/analytics/*` (17 endpoints): overview, page-views, engagement, sessions, journeys, funnels, events, clicks, export. Admin gating via `admin_users.is_admin` flag + `checkAdminAccess()` in `lib/admin/utils.ts`.

**Aggregation cron** — `/api/cron/aggregate-analytics` at `0 2 * * *` UTC: daily metrics → `analytics_page_metrics`, hourly patterns, feature usage aggregates.

**PostHog** — `lib/posthog/server.ts` + `components/providers/PostHogProvider.tsx`:
- `posthog-js` + `posthog-node`.
- Autocapture, session recording with masked inputs, user identification by ID + email, manual `$pageview`.
- **Admin opt-out** automatically applied for users in `admin_users`.
- Disabled in dev.

**Gamification:**
- `user_gamification` table (`current_streak`, `longest_streak`, `total_xp`, `level`).
- `/api/gamification/{check,achievements,stats,streak,xp}`.
- Components: `StreakWidget`, `XPPopup`, `StreakPopup`, `GamificationBar`, `XPContext`.

**Error tracking.**
- `/api/monitoring/errors` (POST to log, GET admin list, DELETE cleanup).
- Captures type, stack, component, page, session, user agent, browser, OS, device type, screen resolution, API endpoint/method/status.
- `lib/monitoring/error-reporter.ts` wraps client-side exceptions.

### 6.10 Study Plan & Personalization

**Study plan** — `/api/study-plan/*`:
- `GET/POST /api/study-plan` — list/create.
- `GET/POST /api/study-plan/[id]` — details.
- `POST /api/study-plan/[id]/complete-task`, `POST /api/study-plan/[id]/recalculate`.
- `POST /api/study-plan/chat` (90s, rate-limited 30/min).
- Dashboard widget shows daily tasks with type (Learn / Review / Practice), time estimates, countdown to exams.

**Profile refinement** — `profile_refinement_state` + `profile_history` (migration `20250105_profile_refinement.sql`):
- EMA-based (α=0.1) updates of `rolling_accuracy`, `estimated_ability`, `inferred_optimal_session_minutes`, `inferred_peak_hour`, `inferred_speed_preference`.
- Per-dimension confidence scores (`accuracy_confidence`, `session_length_confidence`, …).
- `current_difficulty_target`, `confidence_calibration`.
- Used by adaptive content generation, nudge email timing, and SRS session composition.

**Adaptive** — `lib/adaptive/*` + `/api/adaptive/{feedback,record,reset,state}`:
- Records learning signals to refine per-user parameters.
- `hooks/useAdaptiveDifficulty.ts`, `hooks/useConceptMastery.ts`.

**Curriculum** — `lib/curriculum/*`:
- Assessment objectives per study system.
- Subject catalogs with levels (HL/SL, Foundation/Higher, etc.).
- `buildCurriculumContext()` used by course/exam/prepare generators.

**Recommendations** — `/api/recommendations`, `/api/weak-areas`, `/api/insights/mistakes`.

### 6.11 Settings, Reports & Account Management

See §6.1 for account management UI details. Additional surfaces:

- **Parent email + reports toggle** → `/api/reports/weekly` (individual), `/api/reports/weekly/send-all` (cron fan-out, 300s timeout), `/api/reports/unsubscribe` (public).
- **Visual preferences** → diagrams on/off, auto-generate, complexity level (Elementary → Advanced), animation speed, dark mode.
- **Language** → `user_learning_profile.language` + `NEXT_LOCALE` cookie.
- **Reset onboarding** → clears metadata flags and restarts the flow.

---

## 7. System Architecture

### 7.1 Logical View

```
┌─────────────────────────────────────────────────────────────────────┐
│                            Clients                                  │
│  Next.js (App Router) SSR + Client Components · PWA · iOS/Android   │
│                    Safari/Chrome/Firefox · RTL                      │
└─────────────────────┬───────────────────────┬───────────────────────┘
                      │                       │
                      ▼                       ▼
             ┌────────────────┐     ┌──────────────────┐
             │  Middleware.ts │     │  next-intl i18n  │
             │ Auth + Locale  │     │   EN / HE / RTL  │
             └────────┬───────┘     └──────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────────────┐
│                 Next.js Route Handlers (147 routes)                 │
│ app/api/* · 3 route groups ((main),(auth),(admin)) · 7 streaming    │
└──┬──────────┬──────────┬──────────┬──────────┬──────────┬──────────┘
   │          │          │          │          │          │
   ▼          ▼          ▼          ▼          ▼          ▼
┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐
│ Sup- │ │Clau- │ │Upst- │ │Resend│ │ E2B  │ │Recraft│
│ abase│ │ de   │ │ ash  │ │      │ │Sandbx│ │       │
│(Auth │ │ API  │ │Redis │ │ SMTP │ │      │ │  API  │
│ +DB  │ │      │ │(rate │ │      │ │      │ │       │
│+Stor)│ │      │ │limit)│ │      │ │      │ │       │
└──────┘ └──────┘ └──────┘ └──────┘ └──────┘ └──────┘
             │
             ▼
        ┌──────────┐  ┌───────────┐  ┌────────────┐
        │ YouTube  │  │ Unsplash  │  │ QuickLaTeX │
        │ Data API │  │   API     │  │   API      │
        └──────────┘  └───────────┘  └────────────┘

Observability: PostHog (product) · Custom analytics tables · error_logs · /api/health
```

### 7.2 Runtime

- **All API routes run on Node.js** (no Edge Functions in use). No explicit `runtime = 'edge'` exports found.
- **maxDuration** settings are per-route (see §9, §11.1).
- `next.config.mjs` disables `poweredByHeader`, enables React strict mode, and sets `experimentalInstrumentationHook` for startup-time validation.

### 7.3 Route Groups

```
app/
├── (auth)/        public auth pages  (login, signup, forgot, reset)
├── (main)/        protected user pages (dashboard, courses, review, homework, exams, prepare, settings, …)
├── (admin)/       admin-only pages   (analytics dashboards, walkthrough quality)
├── auth/callback/ OAuth / email-verification handler
├── offline/       PWA offline page
└── api/           147 route handlers
```

---

## 8. Data Model (Supabase / PostgreSQL)

Note: the complete migration dump is too large to reproduce here. This section enumerates the most important tables and their purpose. See the `supabase/migrations/` directory for authoritative schemas and RLS policies.

### 8.1 Core Learning Tables

| Table | Purpose | Key Columns |
|---|---|---|
| `courses` | User course library | `id`, `user_id`, `title`, `generated_course` (JSONB), `generation_status`, `lessons_ready`, `total_lessons`, `intensity_mode`, `cover_image_url`, `original_image_url`, `image_urls`, `document_url`, `source_type`, `extracted_content`, `document_summary`, `lesson_outline` (JSONB), `extraction_confidence`, `extraction_metadata`, `learning_objectives`, `curriculum_alignment` |
| `user_progress` | Per-course progression | `user_id`, `course_id`, `current_lesson`, `current_step`, `completed_lessons[]`, `questions_answered`, `questions_correct` |
| `lesson_progress` | Per-lesson mastery | `user_id`, `course_id`, `lesson_index`, `lesson_title`, `mastery_level` (0–1), `completed`, `total_attempts`, `total_correct`, `last_studied_at` |
| `study_sessions` | Session logging | `user_id`, `session_type` (lesson/practice/review/exam), `course_id`, `lesson_index`, `duration_seconds` (generated), `cards_reviewed`, `questions_answered`, `questions_correct`, `is_completed` |

### 8.2 Users & Profile

| Table | Purpose |
|---|---|
| `auth.users` | Supabase-managed; metadata includes `name`, `study_system`, `study_goal`, `onboarding_completed` |
| `user_learning_profile` | `study_system`, `grade`, `education_level`, `subjects[]`, `subject_levels`, `exam_format`, `language`, `parent_email`, `reports_enabled`, `last_report_sent`, `last_nudge_sent_at`, `user_locked_attributes[]`, `attribute_sources` (JSONB), `fsrs_params` |
| `profile_refinement_state` | EMA-smoothed rolling accuracy, ability, session length, peak hour, speed preference + per-dim confidence |
| `profile_history` | Historical snapshots (capped via cleanup function) |
| `admin_users` | `user_id`, `is_admin` |

### 8.3 SRS

`review_cards`, `review_logs`, `user_srs_settings`, `review_sessions`, `user_concept_mastery`, `user_knowledge_gaps`, `user_performance_state`.

### 8.4 Exams

`exams`, `exam_questions`, `past_exam_templates`.

### 8.5 Homework

`homework_checks`, `homework_sessions`, `homework_turns`. Diagram state is embedded in `homework_sessions.conversation` JSONB.

### 8.6 Prepare

`prepare_guides`, `prepare_chat_messages`.

### 8.7 Analytics & Ops

`analytics_events`, `analytics_page_views`, `analytics_page_metrics`, `analytics_feature_usage`, `error_logs`, `diagram_cache`, plus RPCs such as `nudge_candidates_rpc` (migration `20260401_nudge_candidates_rpc.sql`).

### 8.8 Storage Buckets

- `course-images` — extracted document images (`extracted/{userId}/{courseId}/`), covers (`covers/{userId}/{courseId}-cover.png`), temp upload staging.
- Additional buckets for homework uploads and past exam templates (see migrations).

### 8.9 RLS

RLS is enabled on all user-owned tables. Policies gate every read/write by `auth.uid() = user_id`. The service role key (`SUPABASE_SERVICE_ROLE_KEY`) bypasses RLS and is used only server-side for admin/cron operations.

---

## 9. API Surface (147 routes)

### 9.1 Route Counts

| Tier | Count | Notes |
|---|---|---|
| **Total** | 147 files under `app/api/**/route.ts` | |
| **Public** | 3 | `/api/health`, `/api/auth/forgot-password`, `/api/reports/unsubscribe` |
| **Authenticated** | ~124 | Default tier, checks `supabase.auth.getUser()` |
| **Admin-only** | 17 | `/api/admin/analytics/*`, `/api/admin/walkthrough-quality`, via `checkAdminAccess()` |
| **Cron (bearer)** | 3 | `/api/cron/*`, authenticated by `Authorization: Bearer ${CRON_SECRET}` |
| **Streaming** | 7 | `generate-course`, `generate-course/continue`*, `exams/from-content`, `prepare/generate`, `homework/check`, `homework/sessions/[id]/chat`, `homework/sessions/[id]/walkthrough`, `courses/from-youtube` |

### 9.2 Rate-Limited Routes (Upstash Redis)

| Bucket | Limit | Routes |
|---|---|---|
| `generateCourse` | 5 / min | `/api/generate-course`, `/api/generate-course/continue` |
| `generateExam` | 10 / min | `/api/exams/from-content` |
| `generateQuestions` | 20 / min | `/api/generate-questions` |
| `chat` / `studyPlanChat` / `evaluateAnswer` | 30 / min | `/api/chat`, `/api/study-plan/chat`, `/api/evaluate-answer` |
| `search` | 50 / min | `/api/search` |
| `upload` | 20 / min | `/api/upload`, `/api/upload-document` |
| `login` | 10 / 15 min | `/api/auth/*` |
| `forgotPassword` | 5 / hour | `/api/auth/forgot-password` |

Fallback: if Upstash unavailable, requests pass with a warning log (fail-open).

### 9.3 Route Families (Abridged)

| Family | Count | Examples |
|---|---|---|
| Course management | 15 | `/api/courses`, `/api/courses/[id]/progress/*`, `/api/courses/from-youtube` |
| Content generation | 24 | `/api/generate-course`, `/api/generate-questions`, `/api/cheatsheets*`, `/api/prepare/generate`, `/api/exams*` |
| Practice & Homework | 28 | `/api/practice/*`, `/api/homework/*` |
| SRS | 8 | `/api/srs/*` |
| Exams | 8 | `/api/exams/*`, `/api/past-exams/*`, `/api/exam-prediction*` |
| Analytics | 20 | `/api/analytics/*`, `/api/tracking/*`, `/api/admin/analytics/*` |
| Study plan | 9 | `/api/study-plan/*`, `/api/study-sessions`, `/api/progress*` |
| Diagrams / visual | 5 | `/api/diagram-engine/generate`, `/api/diagrams/render-steps`, `/api/formula-scanner/*` |
| Profile & metrics | 12 | `/api/user/*`, `/api/profile/refinement`, `/api/weak-areas`, `/api/recommendations`, `/api/metrics/*`, `/api/performance/steps`, `/api/insights/mistakes`, `/api/self-assessment`, `/api/reflections` |
| Gamification | 5 | `/api/gamification/*` |
| Adaptive / events | 8 | `/api/adaptive/*`, `/api/academic-events*`, `/api/annotations`, `/api/extraction/feedback` |
| Communications | 3 | `/api/reports/weekly`, `/api/reports/weekly/send-all`, `/api/reports/unsubscribe` |
| Cron | 3 | `/api/cron/aggregate-analytics`, `/api/cron/cleanup-stuck-courses`, `/api/cron/send-nudge-emails` |
| Health & auth | 5 | `/api/health`, `/api/auth/me`, `/api/auth/forgot-password`, `/api/monitoring/errors`, `/api/dashboard/intelligence` |

### 9.4 Streaming Protocol

All streaming routes emit newline-delimited JSON over a `ReadableStream`:

```ts
type StreamMessage =
  | { type: 'heartbeat'; timestamp: number }
  | { type: 'progress'; stage: string; percent?: number; message?: string }
  | { type: 'status'; status: string; ... }
  | { type: 'success'; ... }
  | { type: 'result'; ... }
  | { type: 'error'; error: string; code?: string; retryable?: boolean }
```

Heartbeats use **3s interval for Safari/iOS** and 10s for others to prevent iOS Safari connection resets during long AI operations.

---

## 10. AI Stack, Prompts & Model Governance

### 10.1 Providers

| Provider | Models | Use |
|---|---|---|
| Anthropic | `claude-sonnet-4-6` (default, `ANTHROPIC_MODEL`) | Text extraction, course generation, continuation, tutor, checker, prepare guides, exam generation, SRS card generation, concept extraction, routing |
| Google | `gemini-2.5-flash-image` | Cover image generation |
| Recraft | Proprietary | Diagram image generation (anatomy, cells, organisms) |
| E2B | Python/LaTeX sandbox (template `E2B_LATEX_TEMPLATE_ID = d7ncovbnaaf8q81ix0te`) | Matplotlib and `pdflatex` execution |
| QuickLaTeX | Remote `pdflatex` | TikZ compilation |
| YouTube Data API v3 | — | Video search for prepare guides |
| Unsplash | — | Educational image search for course/exam enrichment |

### 10.2 Prompts

- **File:** `lib/ai/prompts.ts` (1000+ lines).
- **Functions:** `getImageAnalysisPrompt`, `getMultiPageImageAnalysisPrompt`, `getCourseGenerationPrompt`, `getDocumentCoursePrompt`, `getTextCoursePrompt`, `getExamCoursePrompt`, `getInitialCoursePrompt`, `getContinuationPrompt`, plus SRS, homework, prepare, diagram engine prompts.
- **Personalization injection:** every prompt weaves in `education_level`, `study_system`, `grade`, `subjects`, `study_goal`, `learning_styles`, `language`, intensity mode, and diagram guidance.

### 10.3 Resilience

- **Timeouts:** Anthropic SDK default 180s, bumped to 240s for document processing.
- **Retry:** 3 attempts with 1s/2s/4s backoff on 429/500/502/503/504/529/network.
- **JSON repair:** `repairTruncatedJson()` closes open braces/brackets to recover `max_tokens` truncation.
- **Content filter:** `filterForbiddenContent()` scrubs AI output before persistence.
- **Input sanitization:** `sanitizeUserInput()` caps at 200 chars and strips shell/HTML metacharacters.

### 10.4 Quality Gates

| Subsystem | Quality mechanism |
|---|---|
| Course | Extraction confidence scorer (4-dimension weighted score) |
| SRS cards | Regex filters + structural validation (language-aware) + background regen of bad cards |
| Exams | "vague question" rejection, ≥50% quality threshold, deterministic grading from feedback items |
| Homework Checker | Feedback quality validator + weak-feedback regeneration + grade consistency check |
| Diagrams | QA loop with pipeline-specific prompts, 2 retries, cache only passing verdicts |

---

## 11. Non-Functional Requirements

### 11.1 Performance & Latency Budgets

**Frontend:**
- Next.js 14 App Router, server components by default, lazy-loaded client components (`dynamic import` for heavy components such as `ExportCourseButton`, `WorkedExampleCard`).
- Image optimization: AVIF → WebP → JPEG fallback; device sizes `[640,750,828,1080,1200,1920]`; whitelisted remote domains for Supabase, Unsplash, Picsum, Recraft.
- Bundle: `optimizePackageImports` for `@supabase/supabase-js`, `swr`, `mathjs`, `katex`, `dompurify`, `framer-motion`, `lucide-react`, `react-markdown`. `removeConsole` in production (keeps `console.error`/`warn`).
- Lighthouse CI runs on every build (non-blocking but tracked).

**Server:**

| Operation | `maxDuration` |
|---|---|
| Search | 30 s |
| Generate cover, expand step, deep practice, formula scanner, walkthrough hint | 60 s |
| Chat (course), evaluate answer, generate questions, help, practice answer, study-plan chat | 90 s |
| Cheatsheets, concepts extract, exam submit, diagram engine generate, homework chat, past-exam analyze, practice tutor, prepare chat, SRS cards | 120 s |
| YouTube course, exam, continue generation, homework check, process document | 180 s |
| Course details, exam-from-content, generate course, walkthrough, prepare generate | **240 s** |
| Generate all covers, weekly report send-all, nudge emails | 300 s (Vercel Pro max) |

**Caching:**
- Per-step expand caching in `step.expandedContent[]`.
- Diagram cache (LRU + Supabase table).
- SWR for client data fetching.

### 11.2 Security & Privacy

**Headers** (`next.config.mjs::headers()`):
```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
X-DNS-Prefetch-Control: on
```

**CSP:**
```
default-src 'self'
script-src 'self' 'unsafe-inline' [dev: 'unsafe-eval']
style-src 'self' 'unsafe-inline'
img-src 'self' data: blob: https://*.supabase.co https://*.supabase.in
        https://images.unsplash.com https://picsum.photos https://img.recraft.ai
        https://quicklatex.com
connect-src 'self' https://*.supabase.co https://api.anthropic.com
             https://generativelanguage.googleapis.com
worker-src 'self' blob:
frame-ancestors 'none'
base-uri 'self'
form-action 'self'
upgrade-insecure-requests
```

**Auth hardening:**
- Email enumeration protection on signup + forgot-password.
- Generic login errors.
- URL message-key allowlist (prevents XSS via `?messageKey=...`).
- Rate limiting on login (10/15min) and forgot-password (5/hour).
- httpOnly + Secure + SameSite=Lax cookies for sessions.

**RLS:** enabled on all user data tables with `auth.uid() = user_id` policies.

**Admin gating:** `admin_users.is_admin` checked via `checkAdminAccess()`; 17 admin-only endpoints.

**Cron gating:** Bearer token (`CRON_SECRET`).

**PII exposure:**
- Email addresses logged in server logs are masked (`***@***`).
- User content (courses, homework, chats) is private (RLS).
- No PII leaked to analytics (device/browser/OS only).

**GDPR gaps (see §14):** self-serve account deletion and data export are not implemented.

### 11.3 Internationalization & RTL

- **Locales:** `en` (default), `he`. Unparameterized routing (no `/en/` or `/he/` URL segments); locale in `NEXT_LOCALE` cookie.
- **Detection:** cookie → `Accept-Language` header → default `en`.
- **Fonts:** Plus Jakarta Sans (Latin) + Rubik (Hebrew + Latin, `display: swap`).
- **RTL:** `tailwindcss-rtl` plugin + `<html dir={isRTL(locale) ? 'rtl' : 'ltr'}>`; 70+ components with explicit `isRTL` branching (e.g., chat bubble alignment, diagram controls, arrow keys swap in `FullScreenDiagramView.tsx`).
- **Date/number:** `getDateLocale()` in `lib/utils.ts` returns `he-IL` for Hebrew, `en-US` for English.
- **Namespaces:** 37 JSON files per locale, identical key structure, 3,220 lines each, zero missing keys (audited).
- **Translation strategy:** `useTranslations('ns')` in client components, `getMessages()` in server components. Hebrew UI strings kept separate from LaTeX source (pdflatex cannot render Hebrew in TikZ code; Hebrew goes in JSON metadata only).

### 11.4 Accessibility

- 256+ instances of focus handling, 34+ touch/keyboard handlers.
- `role="dialog"`, `aria-modal`, `aria-labelledby` on modals.
- `role="progressbar"`, `aria-valuenow/min/max` on progress bars.
- `aria-invalid`, `aria-describedby` on form inputs.
- `role="radiogroup"`, `role="radio"`, `aria-checked` on toggles.
- `focus:ring-2` / `focus:outline-none` consistently applied across `components/ui/*`.
- 10+ `sr-only` labels (diagram alt text, chat sender labels, thinking state).
- DOMPurify sanitization on user-entered math (`MathInput.tsx`) permits only safe attributes.

**Gaps:** 80+ diagram components have basic `role="img"` but lack detailed screen-reader descriptions. No formal WCAG 2.1 AA audit. Tab-order for complex diagram layouts is not explicitly managed.

### 11.5 Mobile & PWA

- Responsive breakpoints: custom `xs: 375px` (iPhone SE), then Tailwind `sm/md/lg/xl/2xl/3xl`.
- Camera capture via hidden `<input type="file" accept="image/*">` triggered by ref; native iOS/Android file pickers open camera directly.
- HEIC conversion: server-side via `sharp`, client fallback via `heic2any` web worker (CSP allows `worker-src blob:`).
- iOS timeout workaround: 2s heartbeat on streaming endpoints, 3s heartbeat on homework streaming, localStorage access wrapped in try/catch for private browsing.
- **PWA:**
  - Manifest (`public/manifest.json`): standalone, portrait-primary, `/dashboard` start URL, theme `#4F46E5`, maskable icons, categories `education`, `productivity`.
  - Install prompt (`components/providers/PWAProvider.tsx`): `beforeinstallprompt` listener, 7-day dismissal cooldown.
  - Service worker (`public/sw.js`): cache-cleanup-only (deletes old caches on activation, forwards all requests to network). **No offline content caching** by design.
  - Online/offline tracking: `hooks/useOnlineStatus.ts`, `hooks/useServiceWorker.ts`, `components/ui/OfflineIndicator.tsx`.
  - Offline page: `app/offline/page.tsx` as graceful fallback.

---

## 12. Infrastructure, Deployment & Operations

### 12.1 Hosting

- **Vercel** (Hobby plan). Serverless Functions (Node runtime).
- Build: `next build`. Start: `next start`. Node ≥ 20, npm ≥ 10.
- Hobby plan implication: only **daily** cron granularity (not hourly) — see commit `34f6e60`.

### 12.2 Cron Jobs (`vercel.json`)

| Schedule (UTC) | Endpoint | Purpose |
|---|---|---|
| `0 2 * * *` | `/api/cron/aggregate-analytics` | Daily metric aggregation |
| `0 3 * * *` | `/api/cron/cleanup-stuck-courses` | Reset >10min stuck courses to `failed` |
| `0 8 * * 0` | `/api/reports/weekly/send-all` | Weekly parent reports (Sunday) |
| `0 9 * * *` | `/api/cron/send-nudge-emails` | Re-engagement (inactive ≥3 days, 7-day cooldown) |

All crons require `Authorization: Bearer ${CRON_SECRET}`.

### 12.3 CI/CD (GitHub Actions `.github/workflows/ci.yml`)

Nine stages:
1. Static analysis (`tsc --noEmit`, ESLint, `npm audit`).
2. Jest unit tests with coverage (`jest-results.json`, `coverage/coverage-summary.json`).
3. API integration tests (27 files in `__tests__/api/`).
4. Next.js build.
5. Playwright E2E (Desktop Chrome + Mobile Safari).
6. Playwright visual regression (Chromium).
7. Lighthouse CI (`@lhci/cli`, non-blocking).
8. Report consolidation + PR comment (pass rate, failures, coverage, Lighthouse scores).
9. Post-deploy smoke tests (`@smoke` tag) against the deployed URL.

Concurrency: cancels in-progress runs on new push.

### 12.4 Test Coverage

~99 test files in `__tests__/`:
- `__tests__/api/` — 27 files (e.g., `adaptive.test.ts` 25KB, `courses-id.test.ts` 20KB, `generate-course.test.ts` 30KB, `gamification.test.ts` 21KB, `exams.test.ts` 21KB).
- `__tests__/lib/` — 31 files.
- `__tests__/components/` — 4 files (diagram render tests).
- `__tests__/hooks/` — 4 files.
- `__tests__/utils/` — 4 files.
- E2E suite in `e2e/` with Playwright.

**Gap:** 80+ diagram components lack unit tests (acknowledged in CLAUDE.md).

### 12.5 Observability

- **Health:** `GET /api/health` (public) — checks Supabase connectivity with 5s timeout, returns 200 OK or 503 degraded with `{ status, timestamp, version, checks }`.
- **Errors:** `/api/monitoring/errors` (POST log, GET admin list) → `error_logs` table with full device/context metadata.
- **Analytics:** custom event pipeline (§6.9) + optional PostHog.
- **Logs:** `pino` structured logs (pretty in dev, JSON in prod).

### 12.6 Backup & DR

- **Database:** Supabase automatic backups (managed).
- **Application:** Git + Vercel deploy history provides rollback.
- **Secrets:** rotated through Vercel env vars (not stored in repo).

---

## 13. Measurement, Analytics & Experimentation

### 13.1 Instrumentation

- **Custom pipeline:** `lib/analytics/client.ts` batches events; flushed every 5s or 10 events.
- **PostHog:** autocapture, manual `$pageview`, session recording (masked inputs), user identification. Admin users auto-opt-out.
- **Funnel tracking:** `hooks/useFunnelTracking.ts` (e.g., `onboarding_name`, `onboarding_study_system`, …, `onboarding_completed`).
- **Feature tracking:** `hooks/useEventTracking.ts` with named events like `settings_page_view`, `settings_saved`.

### 13.2 Dashboards

Admin dashboards at `/api/admin/analytics/*`:
- Overview, page views, engagement, sessions, journeys, funnels, events, clicks (heatmap), export.
- Walkthrough-quality dashboard: `/api/admin/walkthrough-quality`.

### 13.3 Experimentation

No A/B framework exists today. Feature flags are limited to environment variables (`SMART_SOLVER_ENABLED`, `RATE_LIMIT_DISABLED`, `RECRAFT_PIPELINE_VERSION=v2`). Experimentation is a future-work item.

---

## 14. Known Issues, Gaps & Roadmap Candidates

These are documented in CLAUDE.md and corroborated by the audit. They are intentionally listed here so the PRD functions as both spec and gap register.

### 14.1 Must Fix

1. **TikZ walkthrough regression** introduced by the March 16 language system changes (diffs against commit `69a67dc` needed).
2. **RTL layout testing** for diagrams: step controls, labels, and coordinates may break in Hebrew mode.
3. **Mobile responsiveness** of diagrams: viewBox sizes (350–500 px) fixed; need verification on <375 px devices.
4. **Animation performance** of 100+ SVG components on low-end devices.
5. **AI diagram quality** for real student questions (only schema-validated today, not validated against real inputs).
6. **Schema token budget** in the practice tutor prompt (truncated to ~3000 chars) may degrade quality.
7. **Diagram error handling:** unknown diagram types show "Shape type not supported" — could be more helpful with fallback suggestions.
8. **Silent failures** in `lib/homework/diagram-generator.ts` — malformed JSON from AI is caught silently with no logging.

### 14.2 Should Fix

9. **Component tests** — zero tests for 80+ diagram components.
10. **Runtime data validation** — components don't validate `data` prop at runtime (assumed well-formed).
11. **Duplicate type systems** — `types/index.ts::CoordinatePlaneData` has `type` required on `lines`, while `types/math.ts` has it optional.
12. **Unused types** — `types/math.ts` defines shapes with no corresponding components.
13. **Parent report generation** — partially implemented (field + cron exist; end-to-end flow not documented).
14. **Self-serve account deletion and data export (GDPR).**
15. **Email change flow** — must currently contact support.

### 14.3 Nice to Have

16. Detailed ARIA descriptions on 100+ diagram components.
17. Print CSS for SVG diagrams.
18. Diagram memoization to prevent re-render on chat updates.
19. Teacher/parent mode (showing underlying math/data).
20. OAuth (Google, GitHub), magic links, 2FA.
21. Session device tracking + remote sign-out.
22. A/B experimentation framework.
23. Native mobile apps.
24. Offline-first study support (currently online-only).
25. Monetization strategy (no plans exist).

---

## 15. Appendices

### Appendix A — Environment Variables

**Required for production:**
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ybgkzqrpfdhyftnbvgox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...

# Anthropic
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-sonnet-4-6

# Cron
CRON_SECRET=...

# Email
RESEND_API_KEY=...
RESEND_FROM_EMAIL="X+1 <reports@xplus1.ai>"

# App URLs
NEXT_PUBLIC_APP_URL=https://xplus1.ai
NEXT_PUBLIC_ADMIN_EMAIL=support@xplus1.ai
```

**Optional / feature-gated:**
```bash
# Analytics
NEXT_PUBLIC_POSTHOG_KEY=phc_...
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# Rate limiting
UPSTASH_REDIS_REST_URL=https://your-db.upstash.io
UPSTASH_REDIS_REST_TOKEN=...
RATE_LIMIT_DISABLED=false

# Image & diagram services
UNSPLASH_ACCESS_KEY=...
GOOGLE_AI_API_KEY=...
RECRAFT_API_KEY=...
RECRAFT_PIPELINE_VERSION=v2
E2B_API_KEY=...
E2B_LATEX_TEMPLATE_ID=d7ncovbnaaf8q81ix0te
YOUTUBE_DATA_API_KEY=...

# Feature flags
SMART_SOLVER_ENABLED=true
```

### Appendix B — Repository Map (Key Directories)

```
app/
  (auth)/            public auth pages
  (main)/            protected app pages (dashboard, courses, review, exams, prepare, homework, settings)
  (admin)/           admin pages
  api/               147 route handlers
  auth/callback/     email verification handler
  offline/           PWA offline page
  sitemap.ts, layout.tsx, manifest

components/
  course/, lesson/, exam/, homework/, prepare/
  diagrams/, math/ (shared/ primitives)
  srs/, gamification/, analytics/
  providers/, ui/ (Aurora Design primitives)
  upload/upload-modal/

lib/
  ai/                claude.ts (2430 lines), prompts.ts (1000+), image-generation, course-validator
  adaptive/          difficulty, mastery, nudges
  admin/             access checks
  analytics/         client, device, types
  concepts/          extraction + storage
  curriculum/        study systems, subjects, objectives, assessment
  diagram-engine/    22 files — router, executors, QA, label-pipeline, cache, step capture
    tikz/templates/  123 templates
    tikz/            core-prompt, topic-detector, category-guidance (50KB)
  documents/         pdf.ts, pptx.ts, docx.ts, types
  email/             resend-client, templates/, send-*, report-generator, unsubscribe
  extraction/        confidence-scorer
  homework/          checker-engine (88KB), tutor-engine (73KB), walkthrough (36KB), types (19KB), hint, math, feedback, reader
  images/            educational image search
  learning/          intensity-config
  monitoring/        error reporter
  past-exams/        analyzer
  posthog/           server integration
  prepare/           guide generator, youtube search
  rate-limit.ts
  srs/               fsrs.ts, fsrs-optimizer.ts, card-generator, daily-session
  student-context/   directives generator
  supabase/          client.ts, server.ts, middleware.ts

messages/
  en/ (37 namespaces) + en/index.ts
  he/ (37 namespaces) + he/index.ts

types/
  index.ts, srs.ts, exam.ts, prepare.ts, past-exam.ts, help.ts, math.ts

supabase/
  migrations/   50+ SQL files

__tests__/
  api/, lib/, components/, hooks/, utils/, fixtures/

e2e/
  Playwright suites incl. smoke tests

middleware.ts
next.config.mjs
tailwind.config.ts
vercel.json
.github/workflows/ci.yml
```

### Appendix C — Glossary

| Term | Definition |
|---|---|
| **FSRS** | Free Spaced Repetition Scheduler — memory-science-based algorithm used for SRS card scheduling. |
| **Intensity mode** | One of `quick`, `standard`, `deep_practice` — controls lesson depth and practice volume. |
| **Generation status** | One of `processing`, `partial`, `generating`, `complete`, `failed` — tracks course lifecycle. |
| **Partial course** | A course where the first 2 lessons are delivered but continuation is still running. |
| **Step** | A single unit inside a lesson (one of 9 `StepType`s). |
| **Mastery** | Per-concept score (0–1) updated by SRS reviews and lesson questions, with peak tracking for decay detection. |
| **Gap** | A `user_knowledge_gaps` entry created when mastery drops below threshold; resolved when it recovers. |
| **Walkthrough** | Pre-rendered, multi-step image sequence (TikZ, Matplotlib, LaTeX, or Recraft) with bilingual labels. |
| **Checker mode** | One of `standard | batch_worksheet | before_submit | rubric` for homework checking. |
| **Hint level** | 1–5 progressive tutor hint ladder from conceptual nudge to full solution. |
| **Escalation** | Tutor fallback strategy: `REPHRASE | ANALOGY | CONCRETE | VIDEO | EASIER`. |
| **Extraction confidence** | 0–1 score combining text, structure, formula, diagram confidence from extracted content. |
| **Curriculum context** | Bundled study system + grade + subjects + assessment objectives used to shape AI prompts. |

### Appendix D — Evidence Index (File Paths Cited)

| Topic | Primary files |
|---|---|
| Branding & SEO | `app/layout.tsx`, `public/manifest.json`, `app/sitemap.ts`, `public/robots.txt` |
| Auth | `app/(auth)/*/page.tsx`, `app/auth/callback/route.ts`, `middleware.ts`, `lib/supabase/{client,server,middleware}.ts` |
| Onboarding | `app/(main)/onboarding/page.tsx`, `hooks/useFunnelTracking.ts` |
| Course generation | `lib/ai/claude.ts`, `lib/ai/prompts.ts`, `app/api/generate-course/route.ts`, `app/api/generate-course/continue/route.ts`, `lib/documents/{pdf,pptx,docx}.ts`, `lib/extraction/confidence-scorer.ts`, `lib/learning/intensity-config.ts`, `components/upload/upload-modal/*` |
| Lesson viewer | `app/(main)/course/[id]/CourseView.tsx`, `app/(main)/course/[id]/lesson/[lessonIndex]/LessonView.tsx`, `components/lesson/*`, `components/ui/MathText.tsx` |
| Gamification | `components/gamification/*`, `contexts/XPContext.tsx`, `app/api/gamification/*/route.ts` |
| SRS | `lib/srs/fsrs.ts`, `lib/srs/fsrs-optimizer.ts`, `lib/srs/card-generator.ts`, `lib/srs/daily-session.ts`, `app/api/srs/*/route.ts`, `types/srs.ts` |
| Exams | `types/exam.ts`, `types/past-exam.ts`, `app/api/exams/*/route.ts`, `app/api/past-exams/*/route.ts`, `lib/past-exams/analyzer.ts`, `app/(main)/exams/[id]/page.tsx`, `components/exam/question-renderers/*` |
| Homework | `lib/homework/checker-engine.ts`, `lib/homework/tutor-engine.ts`, `lib/homework/walkthrough-generator.ts`, `lib/homework/hint-generator.ts`, `lib/homework/session-manager.ts`, `lib/homework/math-verifier.ts`, `app/api/homework/**` |
| Prepare | `lib/prepare/guide-generator.ts`, `lib/prepare/youtube-search.ts`, `app/api/prepare/**`, `types/prepare.ts`, `components/prepare/*`, `app/(main)/prepare/[id]/PrepareGuideView.tsx` |
| Diagram engine | `lib/diagram-engine/{index,router,system-prompt,tikz-executor,e2b-executor,recraft-executor,label-pipeline,cache,post-process,step-renderer,qa-prompts,telemetry,tikz-layer-parser,tikz-validator,desmos-adapter,geogebra-adapter}.ts`, `lib/diagram-engine/tikz/**`, `lib/diagram-engine/step-capture/*`, `components/{diagrams,math,homework/diagram}/*` |
| Database | `supabase/migrations/*.sql`, `types/index.ts` |
| Analytics | `lib/analytics/*`, `app/api/analytics/**`, `app/api/admin/analytics/**`, `lib/posthog/*`, `components/providers/PostHogProvider.tsx` |
| Infrastructure | `vercel.json`, `next.config.mjs`, `package.json`, `jest.config.js`, `.github/workflows/ci.yml`, `lib/rate-limit.ts`, `lib/email/*`, `app/api/cron/**`, `app/api/health/route.ts`, `app/api/monitoring/errors/route.ts` |
| i18n / RTL | `i18n/config.ts`, `i18n/request.ts`, `messages/{en,he}/**`, `tailwind.config.ts`, `lib/utils.ts` |
| PWA | `public/manifest.json`, `public/sw.js`, `components/providers/PWAProvider.tsx`, `hooks/useServiceWorker.ts`, `hooks/useOnlineStatus.ts`, `app/offline/page.tsx` |

---

*End of document. This PRD is maintained alongside the codebase — update it in the same PR when shipping features that materially change the surfaces described above.*
