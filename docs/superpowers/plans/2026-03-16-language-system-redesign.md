# Language System Redesign — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize AI content language resolution with 4-tier priority: explicit toggle > source material > UI locale > settings > default.

**Architecture:** Rewrite `lib/ai/language.ts` to read cookie before DB, add `resolveOutputLanguage()` for source material detection, add `LANG_EXPLICIT` cookie for distinguishing user toggles from auto-detection, sync Sidebar/Header toggles to DB via fire-and-forget API call, and fix all routes that bypass the centralized system.

**Tech Stack:** Next.js 14 (App Router), Supabase, TypeScript, next-intl cookies, Anthropic Claude SDK.

**Spec:** `docs/superpowers/specs/2026-03-16-language-system-redesign-design.md`

---

## Chunk 1: Core Language Module + Toggle Sync

### Task 1: Rewrite `lib/ai/language.ts` — new resolution order + new functions

**Files:**
- Modify: `lib/ai/language.ts`
- Create: `__tests__/lib/ai/language.test.ts`

- [ ] **Step 1: Write failing tests for new resolution order and new functions**

Create `__tests__/lib/ai/language.test.ts` with tests for:
- `getContentLanguage()`: cookie `'he'` → returns `'he'` (cookie wins over DB)
- `getContentLanguage()`: no cookie, DB profile `'he'` → returns `'he'`
- `getContentLanguage()`: no cookie, no profile → returns `'en'`
- `getContentLanguage()`: cookie throws, DB profile `'he'` → returns `'he'`
- `resolveOutputLanguage()`: no source → returns user language
- `resolveOutputLanguage()`: source matches user → returns user language
- `resolveOutputLanguage()`: source `'he'`, user `'en'`, explicit=true → returns `'en'` (explicit wins)
- `resolveOutputLanguage()`: source `'he'`, user `'en'`, explicit=false → returns `'he'` (source wins)
- `detectSourceLanguage()`: Hebrew-only text → returns `'he'`
- `detectSourceLanguage()`: English-only text → returns `'en'`
- `detectSourceLanguage()`: 10% Hebrew → returns `undefined`
- `detectSourceLanguage()`: pure math (no alphabetic chars) → returns `undefined`
- `detectSourceLanguage()`: empty string → returns `undefined`

Mock `cookies()` from `next/headers` and Supabase client.

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx jest __tests__/lib/ai/language.test.ts -v`
Expected: FAIL — `resolveOutputLanguage` and `detectSourceLanguage` not exported, resolution order wrong.

- [ ] **Step 3: Implement the changes in `lib/ai/language.ts`**

Changes to make:
1. In `getContentLanguage()`: swap order — read `NEXT_LOCALE` cookie FIRST (lines 46-54), then DB profile (lines 31-44). Keep error handling identical.
2. Add `resolveOutputLanguage(userLanguage, sourceLanguage?, wasExplicitlySet?)` — logic per spec.
3. Add `detectSourceLanguage(text: string)` — count Hebrew `[\u0590-\u05FF]` and Latin `[a-zA-Z]` characters, apply thresholds (>20% → `'he'`, <5% → `'en'`, else `undefined`, <10 total alphabetic → `undefined`).
4. Export all three functions + the `ContentLanguage` type.

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx jest __tests__/lib/ai/language.test.ts -v`
Expected: ALL PASS

- [ ] **Step 5: Commit**

```bash
git add lib/ai/language.ts __tests__/lib/ai/language.test.ts
git commit -m "feat: rewrite language resolution — cookie-first + source detection"
```

---

### Task 2: Create shared toggle utility + language PATCH API route

**Files:**
- Create: `lib/i18n/toggle-language.ts`
- Create: `app/api/user/language/route.ts`
- Create: `__tests__/api/user-language.test.ts`

- [ ] **Step 1: Write failing test for the API route**

Test that `PATCH /api/user/language` with `{ language: 'he' }` updates `user_learning_profile.language`. Mock Supabase auth + update.

- [ ] **Step 2: Run test to verify it fails**

Run: `npx jest __tests__/api/user-language.test.ts -v`
Expected: FAIL — route doesn't exist.

- [ ] **Step 3: Create `app/api/user/language/route.ts`**

Simple PATCH handler:
- `await createClient()` → `getUser()` → auth check
- `supabase.from('user_learning_profile').update({ language }).eq('user_id', user.id)`
- Return 200 OK or 401 Unauthorized

- [ ] **Step 4: Create `lib/i18n/toggle-language.ts`**

Export `toggleLanguage(newLocale: 'en' | 'he')`:
1. Set `NEXT_LOCALE` cookie (same as current Sidebar code)
2. Set `LANG_EXPLICIT=1` cookie (path=/, max-age=31536000, samesite=lax)
3. Fire-and-forget `fetch('/api/user/language', { method: 'PATCH', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({ language: newLocale }) })` — no await, `.catch(() => {})` to suppress errors

- [ ] **Step 5: Run test to verify it passes**

Run: `npx jest __tests__/api/user-language.test.ts -v`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add lib/i18n/toggle-language.ts app/api/user/language/route.ts __tests__/api/user-language.test.ts
git commit -m "feat: add language PATCH API + shared toggle utility"
```

---

### Task 3: Wire Sidebar + Header to shared toggle

**Files:**
- Modify: `components/ui/Sidebar.tsx` (lines 107-111)
- Modify: `components/ui/Header.tsx` (lines 79-84)

- [ ] **Step 1: Update `Sidebar.tsx`**

Replace the `toggleLanguage` function (lines 107-111) with:
```typescript
import { toggleLanguage as doToggle } from '@/lib/i18n/toggle-language'

const toggleLanguage = () => {
  const newLocale = currentLocale === 'en' ? 'he' : 'en'
  doToggle(newLocale)
  router.refresh()
}
```

- [ ] **Step 2: Update `Header.tsx`**

Replace the `toggleLanguage` function (lines 79-84) with the same pattern as Sidebar.

- [ ] **Step 3: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 4: Commit**

```bash
git add components/ui/Sidebar.tsx components/ui/Header.tsx
git commit -m "feat: sync language toggle to DB via shared utility"
```

---

## Chunk 2: Instruction Placement Fixes + Hardcoded Models

### Task 4: Fix language instruction placement in 3 routes

**Files:**
- Modify: `app/api/exams/route.ts`
- Modify: `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts`
- Modify: `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts`

- [ ] **Step 1: Fix `exams/route.ts`**

At the `messages.create()` call (~line 498), add a `system` parameter:
```typescript
const message = await anthropic.messages.create({
  model: AI_MODEL,
  max_tokens: 8000,
  system: langInstruction,
  messages: [{ role: 'user', content: prompt }],
})
```
Remove `${langInstruction}` from the `prompt` string (~line 299).

- [ ] **Step 2: Fix `expand/route.ts`**

At the `messages.create()` call (~line 121):
1. Replace hard-coded `'claude-sonnet-4-20250514'` with `AI_MODEL` (add import if needed)
2. Add `system: langInstruction` parameter
3. Remove `${langInstruction}` from the user message content string (~line 127)

- [ ] **Step 3: Fix `worked-example/route.ts`**

At the `messages.create()` call (~line 93):
1. Replace hard-coded `'claude-sonnet-4-20250514'` with `AI_MODEL` (add import if needed)
2. Move `${langInstruction}` from end of `system` string to beginning:
```typescript
system: `${langInstruction}
You are a math tutor generating worked examples...`,
```

- [ ] **Step 4: Verify build compiles**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Commit**

```bash
git add app/api/exams/route.ts app/api/courses/\[id\]/lessons/\[lessonIndex\]/expand/route.ts app/api/courses/\[id\]/lessons/\[lessonIndex\]/worked-example/route.ts
git commit -m "fix: move language instruction to system prompt + use AI_MODEL constant"
```

---

## Chunk 3: Add Language Handling to Missed Routes

### Task 5: Add language to `lib/past-exams/analyzer.ts`

**Files:**
- Modify: `lib/past-exams/analyzer.ts`
- Modify: the API route that calls `analyzeExamImage` / `analyzeExamText` (find the caller)

- [ ] **Step 1: Add `language` parameter to both functions**

In `analyzeExamImage()` (~line 155) and `analyzeExamText()` (~line 195): add `language: ContentLanguage = 'en'` parameter. Import `buildLanguageInstruction` and `ContentLanguage` from `@/lib/ai/language`.

- [ ] **Step 2: Inject language instruction into the prompt**

For both functions, add `system: buildLanguageInstruction(language)` to the `messages.create()` call.

- [ ] **Step 3: Update the API route caller to pass language**

Find the route that calls these functions (likely `app/api/past-exams/analyze/route.ts` or similar). Add `getContentLanguage(supabase, user.id)` and pass result to the function.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: add language handling to past-exams analyzer"
```

---

### Task 6: Add language to `lib/youtube/course-from-video.ts`

**Files:**
- Modify: `lib/youtube/course-from-video.ts`
- Modify: the API route caller

- [ ] **Step 1: Add `language` parameter to `generateCourseFromVideo()`**

Add `language: ContentLanguage = 'en'` parameter. Prepend `buildLanguageInstruction(language)` to the `system` value (~line 101), BEFORE the existing `COURSE_GENERATION_PROMPT`.

- [ ] **Step 2: Update the API route caller to pass language**

- [ ] **Step 3: Verify build + commit**

```bash
git commit -m "feat: add language handling to YouTube course generator"
```

---

### Task 7: Add language to `lib/concepts/extractor.ts`

**Files:**
- Modify: `lib/concepts/extractor.ts`
- Modify: the API route caller

- [ ] **Step 1: Add `language` parameter to `extractConceptsFromCourse()`**

Add `language: ContentLanguage = 'en'` parameter. Add `system: buildLanguageInstruction(language)` to the `messages.create()` call (~line 241).

- [ ] **Step 2: Update the API route caller to pass language**

- [ ] **Step 3: Verify build + commit**

```bash
git commit -m "feat: add language handling to concept extractor"
```

---

### Task 8: Add language to `lib/exam-prediction/predictor.ts`

**Files:**
- Modify: `lib/exam-prediction/predictor.ts`
- Modify: the API route caller

- [ ] **Step 1: Add `language` parameter to `predictExamTopics()`**

Add `language: ContentLanguage = 'en'` parameter. Prepend `buildLanguageInstruction(language)` to the `system` value (~line 130), BEFORE the existing `PREDICTION_PROMPT`.

- [ ] **Step 2: Update the API route caller to pass language**

- [ ] **Step 3: Verify build + commit**

```bash
git commit -m "feat: add language handling to exam prediction"
```

---

## Chunk 4: Inline Extraction Cleanup

### Task 9: Replace inline language extraction in 5 routes

**Files:**
- Modify: `app/api/evaluate-answer/route.ts` (lines 69-80)
- Modify: `app/api/practice/questions/route.ts` (lines 119-120)
- Modify: `app/api/exams/[id]/submit/route.ts` (lines 171-180)
- Modify: `app/api/srs/cards/generate/route.ts` (lines 80-86)
- Modify: `app/api/srs/cards/generate-all/route.ts` (lines 44-50)

- [ ] **Step 1: Fix `evaluate-answer/route.ts`**

Replace lines 69-80 (inline `userLanguage` fetch) with:
```typescript
import { getContentLanguage } from '@/lib/ai/language'
// ... later in the handler:
const userLanguage = await getContentLanguage(supabase, user.id)
```
Keep the `userProfile` fetch for other fields (study_system, grade, etc.) but remove `language` from its select and the `userLanguage = userProfile?.language || 'en'` line.

- [ ] **Step 2: Fix `practice/questions/route.ts`**

Replace lines 119-120 with:
```typescript
const userLanguage = await getContentLanguage(supabase, user.id)
```
Add import for `getContentLanguage` from `@/lib/ai/language`.

- [ ] **Step 3: Fix `exams/[id]/submit/route.ts`**

Replace lines 171-180 (entire try/catch block for language) with:
```typescript
const userLanguage = await getContentLanguage(supabase, user.id)
```
Add import. Remove the separate `user_learning_profile` query for language only.

- [ ] **Step 4: Fix `srs/cards/generate/route.ts`**

Replace lines 80-86 with:
```typescript
const language = await getContentLanguage(supabase, user.id)
```
Add import.

- [ ] **Step 5: Fix `srs/cards/generate-all/route.ts`**

Replace lines 44-50 with:
```typescript
const language = await getContentLanguage(supabase, user.id)
```
Add import.

- [ ] **Step 6: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 7: Commit**

```bash
git add app/api/evaluate-answer/route.ts app/api/practice/questions/route.ts app/api/exams/\[id\]/submit/route.ts app/api/srs/cards/generate/route.ts app/api/srs/cards/generate-all/route.ts
git commit -m "fix: replace inline language extraction with centralized getContentLanguage()"
```

---

## Chunk 5: Source Material Detection

### Task 10: Add source material detection to content-receiving routes

**Files:**
- Modify: `app/api/homework/check/route.ts`
- Modify: `app/api/generate-course/route.ts`
- Modify: `app/api/homework/sessions/[sessionId]/walkthrough/route.ts`
- Modify: `lib/ai/language.ts` (already has `resolveOutputLanguage` and `detectSourceLanguage` from Task 1)

- [ ] **Step 1: Add to `homework/check/route.ts`**

After the extracted text/content is available and before calling `analyzeHomework()`:
1. Read `LANG_EXPLICIT` cookie: `const langExplicit = cookieStore.get('LANG_EXPLICIT')?.value === '1'`
2. Detect source: `const sourceLanguage = detectSourceLanguage(extractedText || taskText || '')`
3. Resolve: `const outputLanguage = resolveOutputLanguage(userLanguage, sourceLanguage, langExplicit)`
4. Pass `outputLanguage` as the `language` field in the `analyzeHomework()` input
5. Clear `LANG_EXPLICIT` cookie after reading: set it with `max-age=0`

Import `detectSourceLanguage`, `resolveOutputLanguage` from `@/lib/ai/language`.

- [ ] **Step 2: Add to `generate-course/route.ts`**

After `extractedContent` is available:
1. Detect source: `const sourceLanguage = detectSourceLanguage(extractedContent || '')`
2. Read `LANG_EXPLICIT` cookie
3. Resolve output language
4. Use resolved language for course generation prompt and store in `content_language` column

- [ ] **Step 3: Add to `walkthrough/route.ts`**

After `session.question_text` is available:
1. Detect source from question text
2. Resolve output language
3. Pass to `generateWalkthroughSolution()`

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 5: Commit**

```bash
git commit -m "feat: detect source material language and resolve output language"
```

---

## Chunk 6: Course Language Memory

### Task 11: Read `content_language` in course-scoped routes

**Files:**
- Modify: `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts`
- Modify: `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts`
- Modify: `app/api/help/route.ts`
- Modify: `app/api/exams/route.ts`
- Modify: `app/api/srs/cards/generate/route.ts`
- Modify: `app/api/srs/cards/generate-all/route.ts`

- [ ] **Step 1: Add `content_language` to course SELECT queries**

In each route that fetches a course, add `content_language` to the `.select()` string.

- [ ] **Step 2: Use course language when available**

For each route, after fetching the course:
```typescript
const language = (course.content_language === 'en' || course.content_language === 'he')
  ? course.content_language
  : await getContentLanguage(supabase, user.id)
```
This means: if the course has a stored language, use it. Otherwise fall back to user preference.

- [ ] **Step 3: Verify build**

Run: `npx tsc --noEmit`

- [ ] **Step 4: Commit**

```bash
git commit -m "feat: use course content_language for course-scoped AI operations"
```

---

## Chunk 7: Code Cleanup

### Task 12: Remove wrapper functions + fix unsafe cast

**Files:**
- Modify: `lib/ai/prompts.ts` (lines 205-212)
- Modify: `lib/homework/tutor-engine.ts` (lines 97-102, line 28)
- Modify: `lib/srs/card-generator.ts` (line 236)

- [ ] **Step 1: Fix `lib/ai/prompts.ts`**

1. Delete the private `buildLanguageInstruction` wrapper (lines 205-212)
2. Move the `import { buildLanguageInstruction as _buildLangInstruction, type ContentLanguage } from '@/lib/ai/language'` to the top of the file with other imports
3. Rename to just `buildLanguageInstruction` (remove alias)
4. At the call site (~line 227 in `buildPersonalizationSection`), call directly: `buildLanguageInstruction((language || 'en') as ContentLanguage)`

- [ ] **Step 2: Fix `lib/homework/tutor-engine.ts`**

1. Delete the private `buildLanguageInstruction` wrapper (lines 97-102)
2. Update import at line 28: change `buildLanguageInstruction as buildCentralizedLangInstruction` to just `buildLanguageInstruction`
3. At the call site (~line 497), call directly: `buildLanguageInstruction((language || 'en') as ContentLanguage)`

- [ ] **Step 3: Fix `lib/srs/card-generator.ts`**

At line 236, remove unnecessary `as ContentLanguage` cast. The types are already identical.

- [ ] **Step 4: Verify build**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Run all existing tests**

Run: `npm test`
Expected: ALL PASS (no regressions)

- [ ] **Step 6: Commit**

```bash
git add lib/ai/prompts.ts lib/homework/tutor-engine.ts lib/srs/card-generator.ts
git commit -m "fix: remove redundant language wrappers + unsafe cast"
```

---

## Chunk 8: Final Verification

### Task 13: Full build + test verification

- [ ] **Step 1: TypeScript check**

Run: `npx tsc --noEmit`
Expected: 0 errors

- [ ] **Step 2: Run all tests**

Run: `npm test`
Expected: ALL PASS

- [ ] **Step 3: Verify no remaining inline language patterns**

Search for any remaining `userProfile?.language || 'en'` or `profile?.language || 'en'` patterns in API routes:
```bash
grep -r "\.language.*||.*'en'" app/api/ --include="*.ts" -l
```
Expected: 0 results (all converted to `getContentLanguage()`)

- [ ] **Step 4: Verify all AI callers have language handling**

Search for `messages.create` calls that don't have `buildLanguageInstruction` or `langInstruction` nearby. Cross-reference with the "Files Deliberately Excluded" list in the spec.

- [ ] **Step 5: Final commit if any fixes needed**

---

## Task Dependency Graph

```
Task 1 (core module) ──┬── Task 2 (API route + toggle util) ── Task 3 (wire Sidebar/Header)
                       │
                       ├── Task 4 (instruction placement)
                       │
                       ├── Tasks 5-8 (missed routes) ── can run in parallel
                       │
                       ├── Task 9 (inline cleanup)
                       │
                       ├── Task 10 (source detection) ── depends on Task 1
                       │
                       ├── Task 11 (course memory)
                       │
                       └── Task 12 (cleanup) ── Task 13 (final verification)
```

Tasks 4, 5-8, 9, 10, 11, 12 all depend on Task 1 but are independent of each other and can run in parallel.
Task 3 depends on Task 2.
Task 13 depends on all other tasks.
