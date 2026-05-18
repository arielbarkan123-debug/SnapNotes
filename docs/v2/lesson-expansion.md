# Lesson Expansion

Two separate systems handle "expansion" in course generation. This doc covers both.

---

## 1. Step Expansion ("Go Deeper")

### What it is

On-demand deepening of a single step. When a student reads an explanation, key_point, formula, example, or summary step, a **"Go Deeper"** button appears. Clicking it generates 2–3 sub-steps that explain the underlying reasoning, a worked example, and optionally a quick-check question.

### Trigger

User-triggered only. No background expansion happens automatically.

**Client:** `components/lesson/StepContent.tsx` — GoDeeper component  
**API:** `POST /api/courses/{id}/lessons/{lessonIndex}/expand`  
**Request body:** `{ stepIndex: number, currentDepth: 0 | 1 }`

### Prompt

Inline in `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` (lines ~127–149):

```
Model: AI_MODEL (claude-sonnet-4-6)
Max tokens: 1500
System: buildLanguageInstruction (language-specific)

User:
"The student wants deeper explanation of this lesson step.
Step content: [original content]
Subject: [subject]
Grade level: [grade level]
Current depth: [0 or 1]

Generate 2-3 sub-steps that:
1. Explain the underlying reasoning
2. Include ONE worked example
3. Optionally include a quick-check question

Return ONLY valid JSON, no markdown fences:
{ "subSteps": [{ "title": "string", "content": "string", "hasExample": boolean,
  "quickCheck": { "question": "string", "answer": "string" } | null }] }"
```

No streaming — uses `messages.create()` and waits for the full response.

### Data flow

1. Client POSTs `{ stepIndex, currentDepth }`
2. Server fetches course, extracts `generated_course.lessons[lessonIndex].steps[stepIndex]`
3. If `step.expandedContent[currentDepth]` exists → return cached immediately
4. Otherwise → call Claude, parse JSON
5. Fire-and-forget cache write: stores sub-steps into `courses.generated_course` JSONB at `expandedContent[currentDepth]`
6. Return sub-steps to client

### Caching

Sub-steps are cached in the course JSONB. First request takes ~2–5 s; repeat requests are instant.

```
courses.generated_course.lessons[n].steps[m].expandedContent[depth]
```

### Depth limit

Hard-coded max of 2 levels (`currentDepth >= 2` returns an error). The client renders `DepthExpansion` recursively up to that limit.

### Rate limiting

Reuses `RATE_LIMITS.generateCourse` (same as full course generation).

---

## 2. Course Continuation (Background Lesson Generation)

### What it is

After initial course generation returns the first 2 lessons + outline (status `partial`), the client automatically fires continuation requests to generate the remaining lessons in batches of 2.

### Trigger

Automatic. The client polls/detects `generation_status === 'partial'` and calls the continuation endpoint until `generation_status === 'complete'`.

**API:** `POST /api/generate-course/continue`  
**Files:**
- `app/api/generate-course/continue/route.ts`
- `lib/ai/claude.ts` → `generateContinuationLessons()`
- `lib/ai/prompts.ts` → `getContinuationPrompt()`

### Prompt

Defined in `lib/ai/prompts.ts` → `getContinuationPrompt()` (lines ~2529–2650):

- **System:** instructs Claude to match the style and format of previous lessons
- **User:** provides document summary + full lesson outline + all previously generated lessons + target lesson indices
- Targets 8–12 steps per lesson, 2–3 questions per lesson

Uses **streaming** (`messages.stream()`), max tokens 8192 per batch.

### Data flow

1. Initial generation returns lessons 0–1 + outline, sets `generation_status: 'partial'`
2. Client detects partial → POST `/api/generate-course/continue` with `{ courseId, nextLessonIndices }`
3. Server streams generated lessons back, merging them into the course JSONB
4. Repeat until all lessons are generated, then set `generation_status: 'complete'`

---

## Comparison

| | Step Expansion | Course Continuation |
|---|---|---|
| Trigger | User ("Go Deeper" click) | Automatic (partial status) |
| Endpoint | `/api/courses/.../expand` | `/api/generate-course/continue` |
| Streaming | No | Yes |
| Max tokens | 1 500 | 8 192 per batch |
| Caching | Yes (expandedContent array) | No (merged into course) |
| Typical duration | 2–5 s | 30–60 s per batch |
| Depth limit | 2 levels | N/A |
