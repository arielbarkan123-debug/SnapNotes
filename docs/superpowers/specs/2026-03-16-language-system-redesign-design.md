# Language System Redesign

**Date:** 2026-03-16
**Status:** Approved
**Scope:** All AI-generated content language resolution across NoteSnap

## Problem Statement

NoteSnap's AI content generation (homework checking, tutoring, course generation, practice questions, exams, etc.) uses a fragmented language resolution system. The main issues:

1. **Sidebar toggle doesn't affect AI content.** Toggling the Sidebar between Hebrew and English only changes the UI. AI responses stay in the old language because the Sidebar only sets a cookie — it does not update the `user_learning_profile.language` database field that AI routes read.

2. **No source material detection.** If a user uploads a Hebrew worksheet, the AI should respond in Hebrew. Currently it ignores the material language and uses the user's stored preference.

3. **Duplicated logic.** ~12 files define their own Hebrew instruction blocks. Some are subtly different. Some are missing entirely.

4. **Instruction placement bugs.** Two routes inject the language instruction into the wrong part of the AI prompt (user message instead of system prompt), weakening its effect. One route places it at the end of the system prompt where it's weakest.

5. **Many features have zero language handling.** Past exam analysis, YouTube course generation, concept extraction, exam prediction, and several other AI callers always output English regardless of user preference.

6. **`content_language` column is write-only.** The `courses.content_language` column is written at course creation but never read. Course-scoped operations (expand step, worked example, help, exams, SRS cards) re-derive language from the user's current preference, causing language mismatches when a user changes languages after creating a course.

## Design

### Language Resolution Inputs

The system uses four inputs to determine content language. These are NOT a strict precedence chain — the interaction between them depends on context:

| Input | Source | Role |
|-------|--------|------|
| **Explicit toggle** | `LANG_EXPLICIT` cookie (set when user clicks Sidebar/Header toggle) | Strongest user intent signal. When present, always wins — even over source material. |
| **Source material** | Detected from uploaded content (Hebrew characters in text) | Wins over auto-detected locale when user hasn't explicitly toggled. |
| **UI locale** | `NEXT_LOCALE` cookie (set by middleware from browser or by toggle) | Used when no source material is detected and no explicit toggle. |
| **Settings preference** | `user_learning_profile.language` in DB | Durable backup. Used when cookies are unavailable. |
| **Default** | `'en'` | Final fallback. |

**How the inputs interact:**

```
Has user explicitly toggled? (LANG_EXPLICIT cookie = '1')
  YES → Use the toggle language (NEXT_LOCALE cookie). Done.
  NO  → Is there detected source material language?
          YES → Use the source material language. Done.
          NO  → Read NEXT_LOCALE cookie.
                  Found? → Use it. Done.
                  Not found? → Read DB profile.
                                Found? → Use it. Done.
                                Not found? → 'en'. Done.
```

**Key scenario examples:**

| User state | Uploads | Result | Why |
|------------|---------|--------|-----|
| Browser auto-detected Hebrew, never toggled | English worksheet | **English** | Source material wins over auto-detected locale |
| Explicitly toggled to Hebrew | English worksheet | **Hebrew** | Explicit toggle wins over everything |
| Explicitly toggled to English | Hebrew worksheet | **English** | Explicit toggle wins over everything |
| No toggle, browser English | Hebrew worksheet | **Hebrew** | Source material wins over auto-detected locale |
| No toggle, no source material | — | **Auto-detected locale** | Falls through to cookie/DB/default |

### Distinguishing Explicit Toggle from Auto-Detection

The middleware auto-detects locale from the browser's `Accept-Language` header and sets the `NEXT_LOCALE` cookie on first visit. The Sidebar/Header toggle also sets this same cookie. To distinguish "user explicitly toggled" from "browser auto-detected," a second cookie `LANG_EXPLICIT` is introduced:

- **Set to `'1'`** only when the user clicks the Sidebar or Header language toggle.
- **Never set by middleware.** Middleware only sets `NEXT_LOCALE`.
- **Cleared after each AI content generation request** that reads it. This prevents a toggle from months ago permanently overriding source material detection. The explicit flag is "consumed" by the first AI operation, after which source material detection resumes.
- **Read by `resolveOutputLanguage()`** to determine whether the user's language choice should override source material detection.

**Stale state handling:** Because the cookie is cleared after use, a user who toggled to Hebrew months ago and then uploads an English worksheet will get English responses (material wins). If they want Hebrew, they toggle again — and that toggle applies to the immediate next operation.

### Sidebar and Header → Database Sync

Both `components/ui/Sidebar.tsx` and `components/ui/Header.tsx` have language toggle functions. Both must be updated identically:

When the user flips the toggle:

1. `NEXT_LOCALE` cookie is set immediately (existing behavior).
2. `LANG_EXPLICIT` cookie is set to `'1'` (new).
3. A fire-and-forget `fetch('/api/user/language', { method: 'PATCH', body: { language } })` updates `user_learning_profile.language` in the background.

The fetch is non-blocking. The UI switches instantly. The database catches up within milliseconds. If the background request fails (e.g., network blip), the cookie is still correct and will be used as the primary source on the next API call.

To avoid code duplication, extract the toggle logic into a shared utility (e.g., `lib/i18n/toggle-language.ts`) used by both Sidebar and Header.

A new lightweight API route `/api/user/language` (PATCH) handles the DB update:
- Reads auth from cookie
- Updates `user_learning_profile.language` for the authenticated user
- Returns 200 OK (or 401 if unauthenticated)

**Race condition:** If the user toggles rapidly, multiple fire-and-forget requests fire. This is harmless — the last one wins, and the cookie already reflects the final state. The DB will be eventually consistent.

**Dependency:** This design requires that ALL inline DB language extraction in API routes is cleaned up (see Cleanup section). Otherwise, routes reading the DB directly would get stale values during the async window.

### `getContentLanguage()` — New Resolution Order

The existing function in `lib/ai/language.ts` changes from:

```
DB profile → NEXT_LOCALE cookie → 'en'
```

To:

```
NEXT_LOCALE cookie → DB profile → 'en'
```

This reflects that the cookie is more recent than the DB profile because it's set instantly on toggle, while the DB update is async.

### `resolveOutputLanguage()` — New Function

A new exported function handles the full resolution including source material:

```
resolveOutputLanguage(userLanguage, sourceLanguage?, wasExplicitlySet?) → ContentLanguage
```

Logic:
- If user explicitly toggled → return `userLanguage` (explicit toggle always wins)
- If source material language detected AND no explicit toggle → return `sourceLanguage`
- Otherwise → return `userLanguage`

### `detectSourceLanguage()` — New Function

A new exported function in `lib/ai/language.ts` detects language from text content:

```
detectSourceLanguage(text: string) → ContentLanguage | undefined
```

Logic:
- Count Hebrew Unicode characters (`[\u0590-\u05FF]`) and Latin characters (`[a-zA-Z]`) in the text. Only these two script families are counted as "alphabetic" — numbers, symbols, punctuation, and other scripts are ignored.
- If Hebrew characters make up > 20% of (Hebrew + Latin) characters → return `'he'`
- If < 5% → return `'en'`
- Between 5-20% (mixed) → return `undefined` (ambiguous, fall through to user preference)
- If text has fewer than 10 alphabetic characters total (e.g., pure math) → return `undefined`

This is called by routes that receive uploaded content: homework check, homework help, course generation, and walkthrough generation.

### `buildLanguageInstruction()` — Unchanged API

The existing function signature stays the same. It already handles both `'en'` and `'he'` correctly with explicit instructions for both languages. No changes needed.

### Course Language Memory

Course-scoped routes will read `courses.content_language` and use it as the output language for that course's context. This ensures a Hebrew course stays Hebrew even if the user later switches to English.

When `content_language` is NULL (pre-migration courses), fall back to `getContentLanguage()` (user preference).

Routes affected:
- `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts`
- `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts`
- `app/api/help/route.ts` (when `courseId` is provided)
- `app/api/exams/route.ts` (when generating from a specific course)
- SRS card generation pipeline (`app/api/srs/cards/generate/route.ts` and `app/api/srs/cards/generate-all/route.ts`)

The `content_language` column is already written by `generate-course/route.ts`. The migration and backfill already exist.

### Instruction Placement Fixes

Three routes have the language instruction in the wrong position:

| Route | Current Problem | Fix |
|-------|----------------|-----|
| `app/api/exams/route.ts` | `langInstruction` is in the user message. The `messages.create()` call has **no `system` parameter**. | Add a `system` parameter with the language instruction as the first content. |
| `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` | `langInstruction` is in the user message content string. | Move to the `system` parameter, prepended at the beginning. |
| `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` | `langInstruction` is at the end of the system prompt string. | Move to the beginning of the system prompt string. |

System prompt placement at the beginning is strongest for steering Claude's output language.

### Missed Routes — Add Language Handling

These lib files call Claude and produce single-language user-facing text but have no language handling:

| File | Integration Approach |
|------|---------------------|
| `lib/past-exams/analyzer.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/youtube/course-from-video.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/concepts/extractor.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/exam-prediction/predictor.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |

Each file's API route caller will resolve language via `getContentLanguage()` and pass it through.

### Files Deliberately Excluded (Bilingual by Design)

These files call Claude but intentionally produce **dual-language output** (both English and Hebrew fields in the same JSON response). Adding single-language steering would break their design:

| File | Why Excluded |
|------|-------------|
| `lib/cheatsheet/generator.ts` | Returns `title` + `titleHe`, `content` + `contentHe` pairs |
| `lib/insights/mistake-analyzer.ts` | Returns `patternName` + `patternNameHe`, `description` + `descriptionHe` |
| `lib/insights/gap-router.ts` | Returns bilingual mini-lesson titles |
| `lib/concepts/gap-detector.ts` | Returns bilingual gap descriptions |
| `lib/formula-scanner/solver.ts` | Math-focused output with bilingual type fields |
| `lib/formula-scanner/analyzer.ts` | Math-focused output with bilingual type fields |
| `lib/diagram-engine/*` | Generates visual content (SVG/TikZ/etc.), language-agnostic |

**Special cases:**
- `lib/homework/student-work-reader.ts` — reads student handwriting and auto-detects language from the image. This is correct behavior (the reader should match the writing language, not the user's preference). No change needed.
- `lib/homework/question-analyzer.ts` — analyzes homework question structure. Internal pipeline step, not user-facing text. No change needed.
- `lib/homework/reference-analyzer.ts` — extracts reference material content. Should preserve source language. No change needed.

### Cleanup

**Inline language extraction (must be removed):** These routes bypass `getContentLanguage()` and extract language directly from the DB profile. They must be converted to use `getContentLanguage()` so the cookie-first resolution works correctly:

| Route | Current Pattern |
|-------|----------------|
| `app/api/chat/route.ts` | `userProfile?.language \|\| 'en'` then falls back to `getContentLanguage()` |
| `app/api/generate-questions/route.ts` | Same pattern |
| `app/api/evaluate-answer/route.ts` | `userProfile?.language \|\| 'en'` — no fallback at all |
| `app/api/practice/questions/route.ts` | `userProfile?.language === 'he' ? 'he' : 'en'` |
| `app/api/exams/[id]/submit/route.ts` | `profile?.language \|\| 'en'` |

All must be replaced with a single `getContentLanguage(supabase, user.id)` call.

**Wrapper functions:** `lib/ai/prompts.ts` and `lib/homework/tutor-engine.ts` both define private `buildLanguageInstruction()` wrappers that just delegate to the centralized one. Remove both wrappers and import the centralized function directly.

**Unsafe cast:** `lib/srs/card-generator.ts` casts `language as ContentLanguage` without validation. Add a guard: `(language === 'he' ? 'he' : 'en')`.

### Hardcoded Model Constants

Two routes bypass the `AI_MODEL` constant:
- `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` — hardcodes `'claude-sonnet-4-20250514'`
- `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` — hardcodes `'claude-sonnet-4-20250514'`

Fix: import and use `AI_MODEL` from `@/lib/ai/claude`.

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `app/api/user/language/route.ts` | PATCH endpoint for Sidebar/Header → DB sync |
| `lib/i18n/toggle-language.ts` | Shared toggle logic (cookies + fire-and-forget DB sync) used by Sidebar and Header |

### Modified Files (Core)
| File | Change |
|------|--------|
| `lib/ai/language.ts` | Reorder resolution (cookie → DB), add `resolveOutputLanguage()`, add `detectSourceLanguage()`, read + clear `LANG_EXPLICIT` cookie |
| `components/ui/Sidebar.tsx` | Use shared `toggleLanguage()` from `lib/i18n/toggle-language.ts` |
| `components/ui/Header.tsx` | Use shared `toggleLanguage()` from `lib/i18n/toggle-language.ts` |

### Modified Files (Instruction Placement)
| File | Change |
|------|--------|
| `app/api/exams/route.ts` | Add `system` parameter to `messages.create()` with language instruction |
| `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` | Move `langInstruction` to system prompt + use `AI_MODEL` + read `content_language` |
| `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` | Move `langInstruction` to top of system prompt + use `AI_MODEL` + read `content_language` |

### Modified Files (Add Language Handling)
| File | Change |
|------|--------|
| `lib/past-exams/analyzer.ts` | Add `language` parameter + `buildLanguageInstruction()` |
| `lib/youtube/course-from-video.ts` | Add `language` parameter + `buildLanguageInstruction()` |
| `lib/concepts/extractor.ts` | Add `language` parameter + `buildLanguageInstruction()` |
| `lib/exam-prediction/predictor.ts` | Add `language` parameter + `buildLanguageInstruction()` |
| Route callers for above 4 files | Pass `language` from `getContentLanguage()` |

### Modified Files (Source Material Detection)
| File | Change |
|------|--------|
| `app/api/homework/check/route.ts` | Detect source language, call `resolveOutputLanguage()` |
| `app/api/generate-course/route.ts` | Detect source language from extracted content |
| `app/api/homework/sessions/[sessionId]/walkthrough/route.ts` | Detect source language from question text |

### Modified Files (Course Language Memory)
| File | Change |
|------|--------|
| `app/api/help/route.ts` | Read `course.content_language`, use for AI prompt when in course context |
| `app/api/exams/route.ts` | Read `course.content_language` when generating from a course |
| `app/api/srs/cards/generate/route.ts` | Read `course.content_language` for card question language |
| `app/api/srs/cards/generate-all/route.ts` | Same |

### Modified Files (Cleanup)
| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Remove inline language extraction, use `getContentLanguage()` directly |
| `app/api/generate-questions/route.ts` | Same |
| `app/api/evaluate-answer/route.ts` | Replace inline extraction with `getContentLanguage()` |
| `app/api/practice/questions/route.ts` | Same |
| `app/api/exams/[id]/submit/route.ts` | Same |
| `lib/ai/prompts.ts` | Remove private `buildLanguageInstruction` wrapper, import directly |
| `lib/homework/tutor-engine.ts` | Same |
| `lib/srs/card-generator.ts` | Fix unsafe `as ContentLanguage` cast |

## Testing Strategy

### Unit Tests
- `getContentLanguage()` — mock cookie and DB to verify: cookie-first resolution, fallback chain, error handling, `cookies()` throwing
- `resolveOutputLanguage()` — test all combinations: no source, matching, explicit toggle override, auto-detected passthrough, explicit flag cleared after use
- `detectSourceLanguage()` — Hebrew-only text, English-only, mixed (10% Hebrew), mixed (25% Hebrew), empty, math-heavy (few alphabetic chars), very short text

### Integration Tests
- Sidebar toggle → verify `NEXT_LOCALE` + `LANG_EXPLICIT` cookies set + DB updated asynchronously
- Header toggle → verify same cookies set as Sidebar (shared logic)
- Upload Hebrew homework → verify AI response in Hebrew (source material wins)
- Upload Hebrew homework with English toggle explicitly set → verify AI response in English (explicit toggle wins)
- Generate course in Hebrew → expand step → verify expansion is Hebrew (course memory)
- Switch to English → expand same Hebrew course → verify expansion stays Hebrew (course memory)
- Pre-migration course (`content_language` is NULL) → expand step → verify falls back to user preference
- API call without cookies (programmatic client) → verify graceful fallback to DB then default

### Manual QA
- Toggle Sidebar rapidly between EN/HE — verify no lag, no race conditions
- Complete onboarding in Hebrew → verify first course is Hebrew
- Existing English user toggles to Hebrew → verify next AI interaction is Hebrew
- Toggle to Hebrew, wait a day, upload English worksheet → verify English response (LANG_EXPLICIT was consumed by previous operation)

## Migration

The database migration `supabase/migrations/20260316_course_content_language.sql` already exists and adds the `content_language` column with Hebrew backfill via title regex. Known limitation: courses with English titles but Hebrew content will remain labeled 'en'. This is acceptable — the column is a best-effort signal, and the user's active preference still works as fallback.

No additional migration needed.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `LANG_EXPLICIT` cookie not sent on first API call | Fallback chain handles it — DB profile or default used |
| Fire-and-forget DB update fails silently | Cookie is the primary source; DB is backup. Silent failure is acceptable. Logged as warning. |
| Source material detection misclassifies mixed-language content | 5-20% Hebrew range returns `undefined` (ambiguous), falling through to user preference rather than guessing. Math-heavy content (< 10 alphabetic chars) also returns `undefined`. |
| `cookies()` throws in non-request context | Already handled by existing try/catch in `getContentLanguage()` |
| User toggles rapidly, multiple DB updates fire | Last write wins; cookie already reflects final state. Harmless. |
| Non-browser API clients (no cookies) | Falls through to DB profile → default. Correct behavior for programmatic clients. |
| `LANG_EXPLICIT` consumed too early | Only cleared by routes that actually use `resolveOutputLanguage()`. Standard content routes (chat, practice) don't consume it — they just read `getContentLanguage()`. |
