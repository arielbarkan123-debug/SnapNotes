# NoteSnap Project Instructions

## Important URLs

- **Production App**: https://snap-notes-j68u-three.vercel.app/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

## Tech Stack

- Next.js 14 (App Router, TypeScript strict mode)
- Supabase (Auth via JWT cookies, PostgreSQL with RLS, Storage)
- Tailwind CSS 3.4 with RTL support (`tailwindcss-rtl`)
- next-intl 4.7 (English + Hebrew, route-based locales)
- Anthropic Claude SDK (claude-sonnet-4-6 default)
- SWR for client-side data fetching
- Framer Motion for animations
- Jest 30 + @testing-library/react for tests

## Anti-Hallucination Rules

**CRITICAL: Before creating ANY new interface/type or referencing an existing type, ALWAYS read the relevant file in `types/`. Never guess type fields from memory. If a type doesn't seem to exist, read ALL type files before creating a new one.**

**CRITICAL: Before creating ANY new utility function, search `lib/` for existing implementations. This codebase has 47 lib directories with extensive utilities — do not reinvent what already exists.**

### Type File Index

| File | Contains |
|------|----------|
| `types/index.ts` | Course, Lesson, Step, StepType, GeneratedCourse, CourseInsert, UserProgress, MathStep, MathSolution, StructuredWorkedSolution, LearningObjective, ExtractionConfidenceMetadata, CourseImage, Formula, Diagram, CourseSection, LessonOutline, IntensityConfig, PracticeProblem |
| `types/srs.ts` | ReviewCard, CardType, CardState, Rating, FSRSOutput, FSRSParameters, ReviewSession, ReviewSessionStats, SubmitReviewRequest/Response, DueCardsSummary, QuestionData (+ type guards: isMultipleChoice, isTrueFalse, isFillBlank, isMatching, isSequence, isMultiSelect) |
| `types/exam.ts` | Exam, ExamQuestion, ExamQuestionType, ExamStatus, ExamWithQuestions, ExamAnswer, ExamResult, CreateExamRequest, SubmitExamRequest, ImageLabelData, ImageLabel, SubQuestion |
| `types/prepare.ts` | PrepareGuide, PrepareGuideInsert, GeneratedGuide, GuideTopic, GuideSection, GuideSectionType, GuideTable, GuideDiagram, GuideYouTubeVideo, PrepareChatMessage |
| `types/past-exam.ts` | PastExamTemplate, ExamAnalysis, QuestionTypeAnalysis, DifficultyDistribution, ImageAnalysis, SampleQuestion, BloomLevels |
| `types/help.ts` | HelpRequest, HelpContext, HelpAPIRequest, HelpAPIResponse, HelpRequestType |

### Core Types Quick Reference

```typescript
// --- Enums ---
type GenerationStatus = 'processing' | 'partial' | 'generating' | 'complete' | 'failed'
type LessonIntensityMode = 'quick' | 'standard' | 'deep_practice'
type StepType = 'explanation' | 'key_point' | 'question' | 'formula' | 'diagram' | 'example' | 'summary' | 'worked_example' | 'practice_problem'

// --- Course (database record, maps to `courses` table) ---
interface Course {
  id: string                                    // UUID PK
  user_id: string                               // FK to auth.users
  title: string
  original_image_url: string | null             // legacy single image
  image_urls?: string[] | null                  // multi-page support
  document_url?: string | null                  // PDF/PPTX/DOCX
  source_type?: 'image' | 'pdf' | 'pptx' | 'docx' | 'text'
  extracted_content: string | null              // raw OCR/parse output
  generated_course: GeneratedCourse             // JSONB
  cover_image_url?: string | null
  learning_objectives?: LearningObjective[] | null
  curriculum_alignment?: Record<string, unknown> | null
  extraction_confidence?: number | null         // 0-1
  extraction_metadata?: ExtractionConfidenceMetadata | null
  generation_status?: GenerationStatus
  lessons_ready?: number
  total_lessons?: number
  document_summary?: string | null
  lesson_outline?: LessonOutline[] | null
  intensity_mode?: LessonIntensityMode
  created_at: string
  updated_at: string
}

// --- GeneratedCourse (stored as JSONB in courses.generated_course) ---
interface GeneratedCourse {
  title: string
  overview: string
  lessons: Lesson[]
  images?: CourseImage[]
  learningObjectives?: LearningObjective[]
}

// --- Lesson ---
interface Lesson {
  title: string
  steps: Step[]
}

// --- Step ---
interface Step {
  type: StepType
  content: string
  title?: string
  options?: string[]                            // for questions
  correct_answer?: number                       // index 0-3
  explanation?: string
  imageUrl?: string
  imageAlt?: string
  imageSource?: 'extracted' | 'web' | 'uploaded'
  imageCaption?: string
  imageCredit?: string
  imageCreditUrl?: string
  diagramData?: {
    type: string
    data: Record<string, unknown>
    visibleStep?: number
    totalSteps?: number
    stepConfig?: Array<{ step: number; stepLabel?: string; showCalculation?: string }>
    stepByStepSource?: { tikzCode: string; steps: Array<{ layer: number; label: string; labelHe: string; explanation: string; explanationHe: string }> }
  }
}

// --- UserProgress ---
interface UserProgress {
  id: string
  user_id: string
  course_id: string
  current_lesson: number
  current_step: number
  completed_lessons: number[]
  questions_answered: number
  questions_correct: number
  created_at: string
  updated_at: string
}
```

## Key Code Patterns

### Supabase Clients

```typescript
// Server components & API routes (respects RLS, uses cookies for auth):
import { createClient } from '@/lib/supabase/server'
const supabase = await createClient()

// Service role (bypasses RLS, for admin operations):
import { createServiceClient } from '@/lib/supabase/server'
const supabase = createServiceClient()  // NOT async

// Browser/client components:
import { createClient } from '@/lib/supabase/client'
const supabase = createClient()  // NOT async
```

### Auth Check in API Routes

```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

### Streaming API Route Pattern

```typescript
export const maxDuration = 240  // seconds (for long operations)

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + '\n'))
      }
      // Heartbeat to prevent iOS timeout
      const heartbeat = setInterval(() => {
        send({ type: 'heartbeat', timestamp: Date.now() })
      }, 2000)
      try {
        // ... do work, send({ type: 'progress', ... })
        send({ type: 'success', ... })
      } catch (error) {
        send({ type: 'error', error: String(error) })
      } finally {
        clearInterval(heartbeat)
        controller.close()
      }
    }
  })
  return new Response(stream, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } })
}
```

### Context + Custom Hook Pattern

```typescript
const MyContext = createContext<MyContextValue | undefined>(undefined)

export function MyProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState(...)
  return <MyContext.Provider value={{ state, setState }}>{children}</MyContext.Provider>
}

export function useMyContext() {
  const context = useContext(MyContext)
  if (!context) throw new Error('useMyContext must be used within MyProvider')
  return context
}
```

### Import Paths

```typescript
import { Course, Lesson, Step } from '@/types'           // types/index.ts (re-exports all)
import { ReviewCard, CardType } from '@/types'            // types/srs.ts (via re-export)
import { Exam, ExamQuestion } from '@/types'              // types/exam.ts (via re-export)
import { createClient } from '@/lib/supabase/server'      // server-side Supabase
import { createClient } from '@/lib/supabase/client'      // client-side Supabase
```

### i18n Pattern

```typescript
// Server component:
import { getLocale, getMessages } from 'next-intl/server'
const locale = await getLocale()
const messages = await getMessages()

// Client component:
import { useTranslations } from 'next-intl'
const t = useTranslations('namespace')  // namespace = filename in messages/en/

// RTL detection:
import { isRTL } from '@/i18n/config'
const dir = isRTL(locale) ? 'rtl' : 'ltr'
```

### Component Conventions

- **Server components by default** (async, no 'use client')
- Only add `'use client'` when component uses hooks, context, or interactivity
- UI primitives in `components/ui/` (Button, Input, Toast, etc.)
- Feature components in `components/<feature>/`
- Business logic in `lib/<feature>/`
- 102 diagram schemas in `lib/diagram-schemas.ts`
- Diagram components in `components/math/` (flat structure)
- SVG primitives in `components/math/shared/`

### Key Directories

```
app/api/              55+ API routes
app/(main)/           Protected routes (require auth)
app/(auth)/           Auth pages
components/           35 component directories
lib/                  47 library directories
  lib/ai/             Course generation from various sources
  lib/homework/       Checker engine (88KB), tutor engine (59KB)
  lib/diagram-engine/ 22 files, routes to Recraft/TikZ/Desmos/GeoGebra/Recharts/Mermaid
  lib/srs/            Spaced repetition (FSRS algorithm)
  lib/supabase/       client.ts, server.ts, middleware.ts
types/                6 type definition files
messages/en/          37 i18n JSON files (English)
messages/he/          37 i18n JSON files (Hebrew)
__tests__/            Jest tests (179 tests)
```

## Work Standards

- **Always finish to the end.** Never stop after implementing a skeleton or partial solution. Every feature must be fully complete, wired up, tested, and deployed before considering it done. If a plan has 6 phases, do all 6. If there are known gaps, fix them in the same session — don't list them as "future work."
- **No shortcuts, no loose ends.** Upload flows must actually upload. Chat history must actually load. PDF export must actually produce a PDF. Heartbeats must actually keep connections alive. If something is listed in the plan, it ships working.
- **Ask specific questions early.** If requirements are ambiguous or a decision is needed, ask immediately with concrete options — don't guess and don't defer. Questions should be specific (e.g., "Should PDF export use @react-pdf/renderer or html-to-pdf?") not vague (e.g., "How should I proceed?").
- **Own the verification.** After implementing, build it, type-check it, and test it in the browser. Deploy if asked. Don't declare done until it actually works end-to-end.
- **Self-review before declaring done.** Before finishing any task, stop and ask: "How did I finish so quickly? What did I miss, skip, or not do well enough?" Run a code review subagent on your own work. Check edge cases: does it work in both EN and HE? Does it work on mobile? Did the AI prompt actually produce correct output? Does the data flow end-to-end (API → DB → UI → render)? If you can't answer "yes" to all of these with evidence, you're not done.

## Email Configuration

Custom SMTP configured with Resend for better email deliverability (especially iOS).

## Visual Learning Diagram System — Post-Plan Concerns

The diagram system (100+ components) was built in Feb 2026. Below are known concerns that need attention.

### MUST FIX — Visual QA & Rendering

1. **Components were verified and working as of Feb 2026.** A regression in the language system changes (March 16) may have broken TikZ walkthrough compilation. Investigate diffs against commit 69a67dc (pre-language-system).
2. **RTL layout testing.** Hebrew mode flips layout direction. Step controls, labels, and diagram text positions may break in RTL.
3. **Mobile responsiveness.** Diagrams use fixed viewBox sizes (350-500px). Verify they scale on small screens.
4. **Animation performance.** Framer Motion animations on 100+ SVG elements could cause jank on low-end devices.

### MUST FIX — AI Integration Quality

5. **AI diagram generation quality.** The AI now has schema awareness, but it has never been tested generating real diagrams for real student questions.
6. **Schema token budget.** The practice tutor prompt includes a truncated schema list (~3000 chars). May hurt response quality.
7. **Diagram generator fallback.** `lib/homework/diagram-generator.ts` only programmatically generates ~10 types. For AI-generated diagrams (the other 90+), malformed JSON is caught silently. Add logging.
8. **Edge case: AI generates unknown diagram type.** Renderer shows "Shape type not supported" — could be more helpful.

### SHOULD FIX — Code Quality

9. **Component unit tests.** Zero component-level tests for 80+ new components.
10. **Data validation.** Components don't validate their `data` prop at runtime.
11. **Unused type definitions.** `types/math.ts` defines types with NO corresponding components.
12. **Duplicate type systems.** `types/index.ts` has `CoordinatePlaneData` with required `type` on lines, while `types/math.ts` has it optional. Consolidate.

### NICE TO HAVE — Polish

13. **Accessibility.** Diagrams have basic `role="img"` but no detailed screen reader descriptions.
14. **Print support.** SVG diagrams need print-friendly styles.
15. **Diagram caching.** Each diagram re-renders on every chat message update. Consider memoization.
16. **Teacher/parent view.** Consider a "teacher mode" showing underlying math/data.

## Visual Learning — Plan Execution Gaps (ALL RESOLVED)

All plan execution gaps have been fixed as of Feb 2026.

- **GAP 1 (SVG Primitives Library):** RESOLVED — 13 shared primitives in `components/math/shared/`
- **GAP 2 (Component Tests):** RESOLVED — 15 render tests in `__tests__/components/diagrams/`
- **GAP 3 (Directory Structure):** ACCEPTED — flat `components/math/` structure kept intentionally
- **GAP 4 (Hardcoded Colors):** RESOLVED — all fixed to use Tailwind dark mode classes
- **GAP 5 (Hebrew Translations):** RESOLVED — i18n files committed
- **GAP 6 (Batch 8 Polish):** RESOLVED — refactored to use shared SVG primitives
- **GAP 7 (Missing Schemas):** RESOLVED — 102 total schemas
- **GAP 8 (i18n Files):** RESOLVED — diagram i18n files committed
