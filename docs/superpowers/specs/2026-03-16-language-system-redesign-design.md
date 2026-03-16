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

5. **Four features have zero language handling.** Past exam analysis, YouTube course generation, concept extraction, and exam prediction always output English regardless of user preference.

6. **`content_language` column is write-only.** The `courses.content_language` column is written at course creation but never read. Course-scoped operations (expand step, worked example, help) re-derive language from the user's current preference, causing language mismatches when a user changes languages after creating a course.

## Design

### Language Resolution Priority

The system resolves content language using a 4-tier priority chain:

| Priority | Source | Description |
|----------|--------|-------------|
| 1 (highest) | Source material | Detected from uploaded content (Hebrew characters in text/images). Auto-matches the material language. |
| 2 | Sidebar toggle | The user's most recent explicit language choice in the UI. Overrides material detection because the user deliberately chose a different language. |
| 3 | Settings preference | The persisted `user_learning_profile.language` value from the Settings page or onboarding. |
| 4 (lowest) | Default | English (`'en'`). |

### Distinguishing Explicit Toggle from Auto-Detection

The middleware auto-detects locale from the browser's `Accept-Language` header and sets the `NEXT_LOCALE` cookie on first visit. The Sidebar toggle also sets this same cookie. To distinguish "user explicitly toggled" from "browser auto-detected," a second cookie `LANG_EXPLICIT` is introduced:

- **Set to `'1'`** only when the user clicks the Sidebar language toggle.
- **Never set by middleware.** Middleware only sets `NEXT_LOCALE`.
- **Read by `resolveOutputLanguage()`** to determine whether the user's language choice should override source material detection.

This means:
- New user visits the app → browser auto-detects Hebrew → uploads English worksheet → gets **English** responses (material wins, because toggle was not explicit).
- Same user clicks Hebrew toggle → uploads English worksheet → gets **Hebrew** responses (explicit toggle wins).

### Sidebar → Database Sync

When the user flips the Sidebar toggle:

1. `NEXT_LOCALE` cookie is set immediately (existing behavior).
2. `LANG_EXPLICIT` cookie is set to `'1'` (new).
3. A fire-and-forget `fetch('/api/user/language', { method: 'PATCH', body: { language } })` updates `user_learning_profile.language` in the background.

The fetch is non-blocking. The UI switches instantly. The database catches up within milliseconds. If the background request fails (e.g., network blip), the cookie is still correct and will be used as the primary source on the next API call.

A new lightweight API route `/api/user/language` (PATCH) handles the update:
- Reads auth from cookie
- Updates `user_learning_profile.language` for the authenticated user
- Returns 200 OK (or 401 if unauthenticated)

### `getContentLanguage()` — New Resolution Order

The existing function in `lib/ai/language.ts` changes from:

```
DB profile → NEXT_LOCALE cookie → 'en'
```

To:

```
NEXT_LOCALE cookie → DB profile → 'en'
```

This reflects that the cookie (Sidebar toggle) is priority 2 and the DB profile (Settings) is priority 3. The cookie is always more recent than the DB profile because it's set instantly on toggle, while the DB update is async.

### `resolveOutputLanguage()` — New Function

A new exported function handles source material detection (priority 1):

```
resolveOutputLanguage(userLanguage, sourceLanguage?, wasExplicitlySet?) → ContentLanguage
```

Logic:
- If no source material language detected → return `userLanguage`
- If source matches user preference → return `userLanguage` (no conflict)
- If source ≠ user preference AND user explicitly toggled → return `userLanguage` (respect deliberate choice)
- If source ≠ user preference AND toggle was NOT explicit → return `sourceLanguage` (match the material)

### `detectSourceLanguage()` — New Function

A new exported function in `lib/ai/language.ts` detects language from text content:

```
detectSourceLanguage(text: string) → ContentLanguage | undefined
```

Logic:
- Count Hebrew Unicode characters (`[\u0590-\u05FF]`) in the text
- If Hebrew characters make up > 20% of alphabetic characters → return `'he'`
- If < 5% → return `'en'`
- Between 5-20% (mixed) → return `undefined` (ambiguous, fall through to user preference)

This is called by routes that receive uploaded content: homework check, homework help, course generation, and walkthrough generation.

### `buildLanguageInstruction()` — Unchanged API

The existing function signature stays the same. It already handles both `'en'` and `'he'` correctly with explicit instructions for both languages. No changes needed.

### Course Language Memory

Course-scoped routes (expand step, worked example, help, exams from course) will read `courses.content_language` and use it as the output language for that course's context. This ensures a Hebrew course stays Hebrew even if the user later switches to English.

Routes affected:
- `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts`
- `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts`
- `app/api/help/route.ts` (when `courseId` is provided)

The `content_language` column is already written by `generate-course/route.ts`. The migration and backfill already exist.

### Instruction Placement Fixes

Three routes have the language instruction in the wrong position:

| Route | Current Position | Fix |
|-------|-----------------|-----|
| `app/api/exams/route.ts` | User message (line 298) | Move to system prompt, prepended at the beginning |
| `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` | User message (line 127) | Move to system prompt, prepended at the beginning |
| `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` | End of system prompt (line 97) | Move to beginning of system prompt |

System prompt placement at the beginning is strongest for steering Claude's output language.

### Missed Routes — Add Language Handling

Four lib files that call Claude have no language handling:

| File | Integration Approach |
|------|---------------------|
| `lib/past-exams/analyzer.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/youtube/course-from-video.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/concepts/extractor.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |
| `lib/exam-prediction/predictor.ts` | Accept `language` parameter, call `buildLanguageInstruction()`, prepend to system prompt |

Each file's API route caller will resolve language via `getContentLanguage()` and pass it through.

### Cleanup

**Redundant DB queries:** `app/api/chat/route.ts` and `app/api/generate-questions/route.ts` both fetch `user_learning_profile` for other fields, then manually extract language, then fall back to `getContentLanguage()` which fetches the profile again. Fix: always call `getContentLanguage()` (which now reads the cookie first and may not need the DB at all). Remove the inline language extraction.

**Wrapper functions:** `lib/ai/prompts.ts` and `lib/homework/tutor-engine.ts` both define private `buildLanguageInstruction()` wrappers that just delegate to the centralized one. Remove both wrappers and import the centralized function directly.

**Unsafe cast:** `lib/srs/card-generator.ts:236` casts `language as ContentLanguage` without validation. Add a guard: `(language === 'he' ? 'he' : 'en')`.

### Hardcoded Model Constants

Two routes bypass the `AI_MODEL` constant:
- `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` (line 122) — hardcodes `'claude-sonnet-4-20250514'`
- `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` (line 94) — hardcodes `'claude-sonnet-4-20250514'`

Fix: import and use `AI_MODEL` from `@/lib/ai/claude`.

## Files Changed

### New Files
| File | Purpose |
|------|---------|
| `app/api/user/language/route.ts` | PATCH endpoint for Sidebar → DB sync |

### Modified Files (Core)
| File | Change |
|------|--------|
| `lib/ai/language.ts` | Reorder resolution (cookie → DB), add `resolveOutputLanguage()`, add `detectSourceLanguage()`, add `LANG_EXPLICIT` cookie reading |
| `components/ui/Sidebar.tsx` | Set `LANG_EXPLICIT` cookie + fire-and-forget DB sync on toggle |
| `app/(main)/onboarding/page.tsx` | Already sets language at onboarding (no change needed) |

### Modified Files (Instruction Placement)
| File | Change |
|------|--------|
| `app/api/exams/route.ts` | Move `langInstruction` from user message to system prompt |
| `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` | Move to system prompt + use `AI_MODEL` + read `content_language` |
| `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` | Move to top of system prompt + use `AI_MODEL` + read `content_language` |

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
| `app/api/homework/check/route.ts` | Detect source language from extracted text, call `resolveOutputLanguage()` |
| `app/(main)/homework/check/page.tsx` | No change (upload already handled) |
| `app/(main)/homework/help/page.tsx` | No change (upload already handled) |
| `app/api/generate-course/route.ts` | Detect source language from extracted content |
| `app/api/homework/sessions/[sessionId]/walkthrough/route.ts` | Detect source language from question text |

### Modified Files (Course Language Memory)
| File | Change |
|------|--------|
| `app/api/help/route.ts` | Read `course.content_language`, use for AI prompt when in course context |

### Modified Files (Cleanup)
| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Remove inline language extraction, use `getContentLanguage()` directly |
| `app/api/generate-questions/route.ts` | Same |
| `lib/ai/prompts.ts` | Remove private `buildLanguageInstruction` wrapper, import directly |
| `lib/homework/tutor-engine.ts` | Same |
| `lib/srs/card-generator.ts` | Fix unsafe `as ContentLanguage` cast |

## Testing Strategy

### Unit Tests
- `getContentLanguage()` — mock cookie and DB to verify: cookie-first resolution, fallback chain, error handling
- `resolveOutputLanguage()` — test all combinations: no source, matching, explicit toggle override, auto-detected passthrough
- `detectSourceLanguage()` — Hebrew-only text, English-only, mixed, empty, math-heavy

### Integration Tests
- Sidebar toggle → verify cookie set + DB updated asynchronously
- Upload Hebrew homework → verify AI response in Hebrew
- Upload Hebrew homework with English toggle explicitly set → verify AI response in English
- Generate course in Hebrew → expand step → verify expansion is Hebrew
- Switch to English → expand same Hebrew course → verify expansion stays Hebrew (course memory)

### Manual QA
- Toggle Sidebar rapidly between EN/HE — verify no lag, no race conditions
- Complete onboarding in Hebrew → verify first course is Hebrew
- Existing English user toggles to Hebrew → verify next AI interaction is Hebrew

## Migration

The database migration `supabase/migrations/20260316_course_content_language.sql` already exists and adds the `content_language` column with Hebrew backfill. No additional migration needed.

## Risks and Mitigations

| Risk | Mitigation |
|------|-----------|
| `LANG_EXPLICIT` cookie not sent on first API call | Fallback chain handles it — DB profile or default used |
| Fire-and-forget DB update fails silently | Cookie is the primary source; DB is backup. Silent failure is acceptable. Logged as warning. |
| Source material detection misclassifies mixed-language content | 5-20% Hebrew range returns `undefined` (ambiguous), falling through to user preference rather than guessing |
| `cookies()` throws in non-request context | Already handled by existing try/catch in `getContentLanguage()` |
