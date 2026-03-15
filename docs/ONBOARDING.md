# NoteSnap — Developer Onboarding Guide

> **Last updated:** March 15, 2026
> **Production:** https://snap-notes-j68u-three.vercel.app/
> **Supabase:** https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

---

## Table of Contents

1. [What Is NoteSnap](#1-what-is-notesnap)
2. [Quick Start](#2-quick-start)
3. [Tech Stack](#3-tech-stack)
4. [Project Structure](#4-project-structure)
5. [Architecture & Patterns](#5-architecture--patterns)
6. [Database Schema](#6-database-schema)
7. [Feature Flows](#7-feature-flows)
8. [API Reference](#8-api-reference)
9. [Testing](#9-testing)
10. [Deployment & CI/CD](#10-deployment--cicd)
11. [i18n (English + Hebrew)](#11-i18n-english--hebrew)
12. [Common Tasks & Recipes](#12-common-tasks--recipes)
13. [Gotchas & Rules](#13-gotchas--rules)

---

## 1. What Is NoteSnap

NoteSnap is an AI-powered adaptive learning platform for students. Users photograph their notebooks, upload PDFs/PPTX/DOCX, or paste text — and the AI generates interactive courses with lessons, flashcards, practice problems, homework tutoring, exam preparation, and spaced repetition.

**Core features:**
- **Course Generation** — Upload images/documents → AI extracts content → generates structured lessons with explanations, formulas, diagrams, questions
- **Spaced Repetition (SRS)** — FSRS algorithm with per-user optimization, 8+ card types (flashcard, MCQ, true/false, fill-blank, matching, sequence, multi-select)
- **Homework Help** — Upload a problem → AI tutor guides step-by-step with diagrams, hints, walkthroughs
- **Practice & Exams** — AI-generated practice questions, timed exams from past exam templates, adaptive difficulty
- **Visual Diagrams** — 100+ diagram types rendered via Recraft (SVG), TikZ (LaTeX), Desmos, GeoGebra, Mermaid, Recharts
- **Study Plans** — AI-generated daily study plans with task tracking
- **Full bilingual** — English + Hebrew with RTL layout support

---

## 2. Quick Start

### Prerequisites
- Node.js 20+
- npm
- Git

### Setup

```bash
# Clone the repo
git clone <repo-url>
cd NoteSnap

# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local
# Fill in your values (see Environment Variables below)

# Run development server
npm run dev
# → http://localhost:3000
```

### Environment Variables

Create `.env.local` with these values (get them from the team lead):

```env
# Required — Supabase
NEXT_PUBLIC_SUPABASE_URL=https://ybgkzqrpfdhyftnbvgox.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<get from Supabase dashboard>
SUPABASE_SERVICE_ROLE_KEY=<get from Supabase dashboard>

# Required — AI
ANTHROPIC_API_KEY=sk-ant-<your-key>

# Optional — Diagram engines
RECRAFT_API_KEY=<for SVG diagram generation>
E2B_API_KEY=<for code execution sandbox>
E2B_LATEX_TEMPLATE_ID=<custom E2B template with texlive-full for LaTeX diagrams>

# Optional — Email
RESEND_API_KEY=<for transactional emails>

# Optional — Admin/Support
NEXT_PUBLIC_ADMIN_EMAIL=support@yourdomain.com
ADMIN_SUPPORT_EMAIL=support@yourdomain.com

# Optional — App config
NEXT_PUBLIC_APP_URL=http://localhost:3000
ANTHROPIC_MODEL=claude-sonnet-4-6
```

### Verify your setup

```bash
# TypeScript check (should exit with 0 errors)
npx tsc --noEmit

# Run tests (all should pass)
npm test

# Production build (should complete without errors)
npm run build
```

---

## 3. Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| **Framework** | Next.js 14 (App Router) | 14.2.35 |
| **Language** | TypeScript (strict mode) | 5.x |
| **Database** | Supabase (PostgreSQL + RLS) | — |
| **Auth** | Supabase Auth (JWT cookies) | — |
| **Storage** | Supabase Storage | — |
| **AI** | Anthropic Claude SDK | 0.71.0 |
| **CSS** | Tailwind CSS 3.4 + RTL | 3.4.1 |
| **i18n** | next-intl | 4.7.0 |
| **Data fetching** | SWR | 2.3.7 |
| **Animations** | Framer Motion | 12.26.2 |
| **Testing** | Jest 30 + React Testing Library | 30.2.0 |
| **Deployment** | Vercel | — |

---

## 4. Project Structure

```
NoteSnap/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Public auth pages (login, signup, forgot-password, reset-password)
│   ├── (main)/                   # Protected pages (require auth)
│   │   ├── dashboard/            # Main dashboard
│   │   ├── courses/              # Course list
│   │   ├── course/[id]/          # Course view + lesson/[lessonIndex]
│   │   ├── homework/             # Homework help (check, sessions, history)
│   │   ├── practice/             # Practice hub + sessions
│   │   ├── review/               # SRS flashcard review
│   │   ├── exams/                # Exam list + take exam
│   │   ├── prepare/              # Study guides
│   │   ├── study-plan/           # Study planning
│   │   ├── settings/             # User settings + past exams
│   │   ├── profile/              # User profile
│   │   ├── progress/             # Progress tracking
│   │   └── ...                   # More feature pages
│   └── api/                      # 130+ API routes
│       ├── auth/                 # Auth endpoints
│       ├── courses/              # Course CRUD + generation
│       ├── generate-course/      # AI course generation (streaming)
│       ├── homework/             # Homework help sessions + chat
│       ├── practice/             # Practice questions + sessions
│       ├── srs/                  # Spaced repetition system
│       ├── exams/                # Exam generation + grading
│       ├── prepare/              # Study guide generation
│       ├── diagram-engine/       # Multi-backend diagram rendering
│       └── ...                   # Analytics, tracking, admin, etc.
│
├── components/                   # React components
│   ├── ui/                       # Primitives (Button, Input, Toast, Modal, etc.)
│   ├── lesson/                   # Lesson player & step rendering
│   ├── course/                   # Course management UI
│   ├── homework/                 # Homework tutor UI
│   ├── practice/                 # Practice question UI
│   ├── srs/                      # Flashcard review UI
│   ├── diagrams/                 # Diagram renderers (Desmos, GeoGebra, Mermaid, Recharts, etc.)
│   ├── math/                     # 100+ math/science SVG diagram components (flat structure)
│   ├── dashboard/                # Dashboard widgets
│   └── ...                       # 35 total component directories
│
├── lib/                          # Business logic & utilities (47 directories)
│   ├── ai/                       # Claude API integration (2400+ lines)
│   │   └── claude.ts             # Singleton client, course generation, image analysis
│   ├── supabase/                 # Database clients
│   │   ├── server.ts             # Server-side (async, respects RLS)
│   │   ├── client.ts             # Browser-side (sync)
│   │   └── middleware.ts         # Auth session refresh
│   ├── srs/                      # FSRS algorithm, card generation, optimization
│   ├── homework/                 # Tutor engine (59KB), checker engine (88KB)
│   ├── diagram-engine/           # Routes to Recraft/TikZ/Desmos/GeoGebra/Mermaid/Recharts
│   ├── diagram-schemas.ts        # 102 diagram type definitions
│   ├── curriculum/               # Curriculum context builder (IB, AP, GCSE, etc.)
│   ├── documents/                # PDF/PPTX/DOCX extraction
│   ├── errors/                   # Error codes + mappers
│   ├── api/                      # Legacy error shim + client-side fetch helpers (fetchJSON, safe-fetch)
│   ├── rate-limit.ts             # In-memory rate limiter
│   ├── logger.ts                 # Structured JSON logger
│   └── ...                       # analytics, gamification, email, etc.
│
├── types/                        # TypeScript type definitions
│   ├── index.ts                  # Course, Lesson, Step, UserProgress (re-exports all)
│   ├── srs.ts                    # ReviewCard, CardType, Rating, FSRS types
│   ├── exam.ts                   # Exam, ExamQuestion, ExamResult
│   ├── prepare.ts                # PrepareGuide, GuideTopic, GuideSection
│   ├── past-exam.ts              # PastExamTemplate, ExamAnalysis
│   ├── help.ts                   # HelpRequest, HelpContext
│   └── walkthrough.ts            # WalkthroughSolution, WalkthroughStep
│
├── messages/                     # i18n translation files
│   ├── en/                       # 37 English JSON files
│   └── he/                       # 37 Hebrew JSON files
│
├── hooks/                        # 20+ custom React hooks
├── contexts/                     # React context providers
├── __tests__/                    # Jest tests (49 suites, 1013 tests)
├── middleware.ts                 # Auth guard + locale detection
├── i18n/config.ts                # Locale config (en, he)
└── supabase/                     # Database migrations
```

---

## 5. Architecture & Patterns

### Supabase Clients — The #1 Thing To Get Right

```typescript
// ✅ Server components & API routes (reads auth cookie, respects RLS):
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()  // ASYNC — must await

// ✅ Service role (bypasses RLS — for admin operations only):
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient()  // NOT async — no await

// ✅ Browser / client components:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // NOT async — no await
```

### Auth Check in API Routes

Every API route starts the same way:

```typescript
export async function POST(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return createErrorResponse(ErrorCodes.UNAUTHORIZED)
  }

  // ... your logic
}
```

### Streaming API Pattern (for long AI operations)

```typescript
export const maxDuration = 240  // seconds

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }

      // Heartbeat prevents iOS Safari timeout
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() })
      }, 2000)

      try {
        send({ type: 'progress', message: 'Working...' })
        // ... do work
        send({ type: 'success', data: result })
      } catch (error) {
        send({ type: 'error', error: String(error) })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' }
  })
}
```

### Component Conventions

- **Server components by default** — no `'use client'` unless you need hooks/interactivity
- **UI primitives** in `components/ui/` (Button, Input, Toast, etc.)
- **Feature components** in `components/<feature>/`
- **Business logic** in `lib/<feature>/`
- **Type definitions** in `types/`

### Import Paths

```typescript
// Types (all re-exported from types/index.ts)
import { Course, Lesson, Step } from '@/types'
import { ReviewCard, CardType } from '@/types'
import { Exam, ExamQuestion } from '@/types'

// Supabase
import { createClient } from '@/lib/supabase/server'      // server
import { createClient } from '@/lib/supabase/client'      // client

// AI
import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'

// Errors (preferred — new error system)
import { ErrorCodes } from '@/lib/errors'
import { createErrorResponse } from '@/lib/errors'
// Legacy shim (still works but deprecated — ~55 routes still use it):
// import { createErrorResponse, ErrorCodes } from '@/lib/api/errors'

// i18n
import { useTranslations } from 'next-intl'               // client
import { getLocale, getMessages } from 'next-intl/server'  // server
```

### Error Handling

All API errors use standardized error codes from `lib/errors/codes.ts`:

```typescript
// Pattern: NS-{AREA}-{NUMBER}
ErrorCodes.UNAUTHORIZED     // NS-AUTH-090 → 401
ErrorCodes.RATE_LIMITED      // NS-AI-002 → 429
ErrorCodes.INVALID_INPUT     // NS-VAL-014 → 400
ErrorCodes.NOT_FOUND         // NS-DB-021 → 404
ErrorCodes.DATABASE_ERROR    // NS-DB-001 → 500
```

> **Note:** `lib/errors/codes.ts` is the source of truth with 100+ granular codes.
> `lib/api/errors.ts` is a **legacy compatibility shim** that maps the old simple names
> to the new system. Both work, but **new code should import from `@/lib/errors`**.

### AI Client (Singleton)

```typescript
import { getAnthropicClient, AI_MODEL } from '@/lib/ai/claude'

// getAnthropicClient() returns a singleton with 180s timeout
const response = await getAnthropicClient().messages.create({
  model: AI_MODEL,  // claude-sonnet-4-6
  max_tokens: 4096,
  system: 'You are a tutor...',
  messages: [{ role: 'user', content: '...' }],
})
```

---

## 6. Database Schema

### Core Tables

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `courses` | User courses with AI-generated content | `id`, `user_id`, `title`, `generated_course` (JSONB), `source_type`, `generation_status`, `intensity_mode` |
| `user_progress` | Per-user per-course progress | `user_id`, `course_id`, `current_lesson`, `current_step`, `completed_lessons[]` |
| `lesson_progress` | Per-lesson mastery metrics | `user_id`, `course_id`, `lesson_index`, `mastery_level`, `time_spent` |

### Spaced Repetition

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `review_cards` | Flashcards with FSRS state | `id`, `user_id`, `course_id`, `card_type`, `front`, `back`, `due_date`, `stability`, `difficulty`, `state` |
| `review_logs` | Every review event | `card_id`, `user_id`, `rating`, `duration_ms` |
| `user_srs_settings` | Per-user SRS config | `user_id`, `target_retention`, `max_new_cards_per_day` |
| `fsrs_user_parameters` | Optimized FSRS weights | `user_id`, `w[]` (17 parameters) |

### Homework Help

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `homework_sessions` | Tutor sessions | `id`, `user_id`, `question_image_url`, `question_text`, `status`, `conversation[]` |
| `homework_turns` | Individual messages | `session_id`, `role`, `content`, `diagram_data` |
| `homework_walkthroughs` | Step-by-step solutions | `session_id`, `steps[]`, `quality_score` |
| `homework_checks` | Problem analysis results | `id`, `user_id`, `analysis` (JSONB) |

### Practice & Exams

| Table | Purpose |
|-------|---------|
| `practice_sessions` | Practice session records |
| `practice_questions` | Generated questions |
| `exam_templates` / `past_exam_templates` | Past exam templates for generation |
| `exams` | Generated exams with student answers |

### User & Profile

| Table | Purpose |
|-------|---------|
| `user_learning_profile` | Education level, study system, goals, language |
| `concepts` | Knowledge graph nodes |
| `user_concept_mastery` | Per-concept mastery tracking |
| `user_performance_state` | Adaptive difficulty state |

### All Data Is RLS-Protected

Every table has Row-Level Security policies filtering by `auth.uid()`. Users can only see their own data. Service role key bypasses RLS for admin operations.

---

## 7. Feature Flows

### Course Creation Flow

```
User uploads image/PDF/PPTX/DOCX/text
    ↓
/api/upload or /api/upload-document
    ↓ (store file in Supabase Storage)
/api/generate-course (240s, streaming)
    ↓
Claude extracts content (OCR/parse)
    ↓
Claude generates course structure:
  - Title & overview
  - Lessons with steps (explanation, key_point, question, formula, diagram, example, summary)
  - Learning objectives
    ↓
Store in courses.generated_course (JSONB)
    ↓
/api/generate-course/continue (progressive, background)
    ↓
/api/srs/cards/generate (auto-create flashcards)
    ↓
User views at /course/[id]/lesson/[lessonIndex]
```

### Homework Help Flow

```
User uploads problem photo or types question
    ↓
/api/homework/sessions (POST) → analyzes question
    ↓
User opens /homework/[sessionId]
    ↓
/api/homework/sessions/[id]/chat (POST, 120s)
    ↓ AI tutor responds with guidance + optional diagrams
User asks follow-up → chat continues
    ↓
User requests hint → /api/.../hint (progressive, level 1-3)
    ↓
User requests walkthrough → /api/.../walkthrough (240s)
    ↓ AI generates step-by-step worked solution
Practice completion tracked
```

### SRS Review Flow

```
Cards generated from course content
    ↓
/api/srs/due (GET) → cards due today
    ↓
User reviews at /review
    ↓
User rates: 1=Again, 2=Hard, 3=Good, 4=Easy
    ↓
/api/srs/review (POST)
    ↓ FSRS algorithm calculates next review date
Update card: new stability, difficulty, due_date
    ↓
/api/srs/optimize → calibrate per-user FSRS weights
```

---

## 8. API Reference

### Major Endpoints

| Method | Endpoint | Timeout | Purpose |
|--------|----------|---------|---------|
| POST | `/api/generate-course` | 240s | Generate course from uploaded content (streaming) |
| POST | `/api/generate-course/continue` | 180s | Continue progressive generation |
| POST | `/api/chat` | 90s | Lesson chat with AI tutor |
| POST | `/api/homework/sessions` | 60s | Create homework session |
| POST | `/api/homework/sessions/[id]/chat` | 120s | Homework tutor chat |
| POST | `/api/homework/sessions/[id]/walkthrough` | 240s | Generate step-by-step solution |
| POST | `/api/srs/review` | — | Submit card review (FSRS) |
| GET | `/api/srs/due` | — | Get cards due today |
| POST | `/api/practice/session` | — | Create practice session |
| POST | `/api/exams` | 180s | Generate exam from templates |
| POST | `/api/exams/[id]/submit` | 120s | Submit & grade exam |
| POST | `/api/diagram-engine/generate` | 120s | Generate visual diagram |
| POST | `/api/prepare` | 240s | Generate study guide |
| GET | `/api/courses` | — | List courses (cursor pagination) |
| PATCH | `/api/courses/[id]` | 240s | Add material to course |

### Rate Limiting

All AI-powered endpoints are rate-limited per user. The rate limiter returns headers:
- `X-RateLimit-Limit` — max requests in window
- `X-RateLimit-Remaining` — requests remaining
- `X-RateLimit-Reset` — seconds until window resets (NOT an epoch timestamp)

When exceeded, returns `429` with error code `NS-AI-002`.

---

## 9. Testing

### Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npx jest __tests__/api/chat.test.ts

# Run with verbose output
npx jest --verbose

# Run with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

### Test Structure

```
__tests__/
├── api/              # API route tests (mock Supabase + Claude)
│   ├── chat.test.ts
│   ├── courses.test.ts
│   ├── courses-id.test.ts
│   ├── srs-review.test.ts
│   ├── homework-sessions.test.ts
│   └── ...
├── components/       # Component render tests
│   └── diagrams/     # Diagram component tests
├── lib/              # Library unit tests
│   ├── srs/          # FSRS algorithm tests
│   └── ...
├── fixtures/         # Test data
└── utils/            # Test utilities (mock-supabase, etc.)
```

### Current Status: 49 suites, all passing (run `npm test` to see current count)

### Test Patterns

API tests mock Supabase and external services:

```typescript
// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

// Mock Claude
jest.mock('@/lib/ai/claude', () => ({
  AI_MODEL: 'claude-3-haiku-20240307',
  getAnthropicClient: () => ({
    messages: { create: mockCreate },
  }),
}))

// Important: reset rate limiter in beforeEach
// jest.clearAllMocks() does NOT reset mockReturnValue
beforeEach(() => {
  jest.clearAllMocks()
  const { checkRateLimit } = require('@/lib/rate-limit')
  checkRateLimit.mockReturnValue({ allowed: true, remaining: 10, resetAt: Date.now() + 60000 })
})
```

---

## 10. Deployment & CI/CD

### CI Pipeline (GitHub Actions)

On every push/PR to `main`:
1. `npm ci` — install dependencies
2. `npx tsc --noEmit` — TypeScript check
3. `npm run lint` — ESLint
4. `npm test -- --ci` — all tests
5. `npm run build` — production build

### Deployment (Vercel)

- **Auto-deploy** on push to `main`
- **Preview deployments** on PRs
- **Environment variables** set in Vercel dashboard
- **Serverless function timeout:** up to 240s (configured per route via `maxDuration`)
- **Cron jobs** (via `vercel.json`):
  - `/api/cron/aggregate-analytics` — daily at 02:00 UTC
  - `/api/reports/weekly/send-all` — Sundays at 08:00 UTC

### Security Headers (in `next.config.mjs`)

- HSTS, X-Frame-Options: DENY, CSP, X-Content-Type-Options: nosniff
- `console.log` stripped in production (only `console.error` and `console.warn` kept)

---

## 11. i18n (English + Hebrew)

### How It Works

- **Route-based locales** via `next-intl`
- **37 translation files** per language in `messages/en/` and `messages/he/`
- **RTL support** via `tailwindcss-rtl` plugin

### Server Component

```typescript
import { getLocale, getMessages } from 'next-intl/server'
const locale = await getLocale()
const messages = await getMessages()
```

### Client Component

```typescript
import { useTranslations } from 'next-intl'
const t = useTranslations('dashboard')  // namespace = filename in messages/en/

return <h1>{t('welcome')}</h1>
```

### RTL Detection

```typescript
import { isRTL } from '@/i18n/config'
const dir = isRTL(locale) ? 'rtl' : 'ltr'
```

### Adding a New Translation Key

1. Add key to `messages/en/<namespace>.json`
2. Add Hebrew translation to `messages/he/<namespace>.json`
3. Use in component: `t('your_new_key')`

---

## 12. Common Tasks & Recipes

### Add a New API Route

```bash
# Create the file
mkdir -p app/api/my-feature
touch app/api/my-feature/route.ts
```

```typescript
import { type NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'

export async function GET(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return createErrorResponse(ErrorCodes.UNAUTHORIZED)
  }

  // Your logic here

  return NextResponse.json({ success: true, data: result })
}
```

### Add a New Page

```bash
# Protected page (requires auth)
mkdir -p app/(main)/my-page
touch app/(main)/my-page/page.tsx
```

```typescript
// Server component by default
export default async function MyPage() {
  return <div>My page content</div>
}
```

### Add a New Type

1. **First check** if a similar type already exists in `types/` — read ALL type files
2. Add to the appropriate file in `types/`
3. If new file, re-export from `types/index.ts`

### Add a New Test

```bash
touch __tests__/api/my-feature.test.ts
```

```typescript
import { GET } from '@/app/api/my-feature/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn(),
}))

describe('My Feature API', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    // Set up mocks...
  })

  it('works', async () => {
    const request = new NextRequest('http://localhost/api/my-feature')
    const response = await GET(request)
    expect(response.status).toBe(200)
  })
})
```

---

## 13. Gotchas & Rules

### Critical Rules

1. **NEVER guess types.** Before creating ANY new interface/type, read the relevant file in `types/`. Never assume fields from memory.

2. **NEVER reinvent utilities.** Before writing a utility function, search `lib/` — there are 47 lib directories. The function you need probably exists.

3. **`createClient()` is async on server, sync on client.** Getting this wrong will break things silently.

4. **`createServiceClient()` is NOT async.** Don't `await` it.

5. **`jest.clearAllMocks()` does NOT reset `mockReturnValue`.** If a test overrides a mock's return value, you must explicitly re-set it in `beforeEach`. This was the cause of 14 test failures we just fixed.

6. **Supabase mock chains must match the actual route's call order.** If a route does `.limit().lt()`, the mock must have `.limit()` return `this` (builder) and `.lt()` return the resolved value. If `.limit()` returns a Promise, `.lt()` will fail on the Promise object.

7. **Rate limiting is in-memory.** It resets on server restart. All AI endpoints have rate limits.

8. **Streaming responses need heartbeats.** iOS Safari closes connections after ~30s of silence. Always add a 2-second heartbeat interval.

9. **All user data is RLS-protected.** Never use `createServiceClient()` for user-facing queries — only for admin/cleanup operations.

10. **Hebrew RTL affects layout.** Test every UI change in both English and Hebrew mode.

### Environment & Security

- **NEVER commit `.env.local`** — it's gitignored
- **NEVER hardcode API keys** — always use `process.env`
- **NEVER commit screenshots** — `gpai-*.png` and `production-*.png` are gitignored
- All API routes validate `ANTHROPIC_API_KEY` at runtime before calling Claude

### Code Quality

- TypeScript strict mode is ON — no `any` types unless absolutely necessary
- All imports use `@/` path aliases
- Server components by default — only add `'use client'` when needed
- Production builds strip `console.log` (keep `console.error` and `console.warn`)

---

## Quick Reference Card

| Task | Command |
|------|---------|
| Dev server | `npm run dev` |
| Build | `npm run build` |
| Type check | `npx tsc --noEmit` |
| Run all tests | `npm test` |
| Run one test | `npx jest __tests__/api/chat.test.ts` |
| Watch tests | `npm run test:watch` |
| Lint | `npm run lint` |

| Question | Answer |
|----------|--------|
| Where are types? | `types/` (6 files, all re-exported from `types/index.ts`) |
| Where are API routes? | `app/api/` (130+ routes) |
| Where is AI logic? | `lib/ai/claude.ts` (2400+ lines) |
| Where are errors? | `lib/errors/codes.ts` (source of truth) — `lib/api/errors.ts` is legacy shim |
| Where are translations? | `messages/en/` and `messages/he/` (37 files each) |
| Where are tests? | `__tests__/` (49 suites, 1000+ tests) |
| Where is the DB schema? | `supabase/migrations/` |
| Where is auth middleware? | `middleware.ts` + `lib/supabase/middleware.ts` |

---

*Welcome to the team! If this doc doesn't answer your question, check `CLAUDE.md` in the project root for additional context.*
