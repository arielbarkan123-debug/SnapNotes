# `generateInitialCourse` — Function Shred & Optimization Guide

> **File:** `lib/ai/claude.ts:2215`
> **Purpose:** Fast-path course generation — returns 2 full lessons + complete outline + document summary in ~30 s, enabling the rest to stream in the background.

---

## Call Graph

```
generateInitialCourse (claude.ts:2215)
├── getAnthropicClient()              claude.ts:116   — singleton Anthropic client
├── sanitizeUserInput()               claude.ts:416   — strip injection chars from title
├── getInitialCoursePrompt()          prompts.ts:2666 — thin wrapper, returns { systemPrompt, userPrompt }
│   ├── INITIAL_COURSE_GENERATION_SYSTEM_PROMPT       prompts.ts:2535   — static string constant
│   └── buildInitialCourseGenerationUserPrompt()      prompts.ts:2568   — 94-line prompt builder
│       ├── buildPersonalizationSection()             prompts.ts:207    — user profile → prompt fragment
│       ├── isExamContent()                           (prompts.ts)      — heuristic: is source an exam?
│       ├── buildExamContentInstructions()            (prompts.ts)      — conditional exam-mode instructions
│       └── buildIntensityInstructions()              (prompts.ts)      — quick / standard / deep_practice
├── withStreamRetry()                 claude.ts:207   — exponential backoff wrapper
│   └── isAnthropicErrorRetryable()  claude.ts:181   — classifies 429/5xx/network errors
├── logLLMUsage()                     claude.ts:76    — token count + cost → pino + aiLogger
├── extractJsonFromResponse()         claude.ts:258   — strip thinking tags + markdown fence
├── repairTruncatedJson()             claude.ts:286   — close unclosed brackets after max_tokens cut
└── filterForbiddenContent()          lib/ai/course-validator.ts:224  — regex-strip exam logistics
```

---

## Helper Shred Table

| Helper | File:Line | Size | What it does | Keep / Inline? |
|--------|-----------|------|--------------|----------------|
| `getAnthropicClient` | `claude.ts:116` | 15 ln | Lazy-init singleton; throws `CONFIG_ERROR` if no API key | **Keep** — shared by 10+ callers |
| `sanitizeUserInput` | `claude.ts:416` | 9 ln | `.slice(200)` → strip `<>{}[]\\` → strip ` ``` ` → collapse newlines | **Inline candidate** — called once here, once in each of 4 sibling functions; consider a shared import instead |
| `getInitialCoursePrompt` | `prompts.ts:2666` | 12 ln | Returns `{ systemPrompt: CONSTANT, userPrompt: builder(...) }` | **Collapse candidate** — 3-line wrapper with no logic; caller could destructure directly from `buildInitialCourseGenerationUserPrompt` |
| `buildInitialCourseGenerationUserPrompt` | `prompts.ts:2568` | 94 ln | Assembles the full user prompt from document sections, personalization, exam mode, intensity | **Keep** — complex composition, well-named |
| `INITIAL_COURSE_GENERATION_SYSTEM_PROMPT` | `prompts.ts:2535` | 29 ln | Static string — instructs Claude to emit outline + 2 lessons + documentSummary | **Keep as constant** — good candidate for prompt caching (see §3) |
| `buildPersonalizationSection` | `prompts.ts:207` | 90 ln | Maps `UserLearningContext` (age, education level, goals, language) → prompt fragment | **Keep** — reused in 4 prompt builders |
| `withStreamRetry` | `claude.ts:207` | 38 ln | Runs `createStream()` → `processStream()`, retries on 429/5xx/network with 1 s / 2 s / 4 s backoff | **Keep** — critical for Safari; shared by every streaming function |
| `isAnthropicErrorRetryable` | `claude.ts:181` | 15 ln | Returns `true` for status 429/500–504/529 and network error messages | **Keep** — logic belongs alongside `withStreamRetry` |
| `logLLMUsage` | `claude.ts:76` | 31 ln | Computes billable tokens (subtracts cache reads), estimates cost, logs to pino + `aiLogger` | **Keep** — used by 8+ callers; wrong to inline |
| `extractJsonFromResponse` | `claude.ts:258` | 22 ln | Strips `<thinking>` / `<antThinking>` tags, removes ` ```json ` fences, finds `{…}` with regex | **Inline candidate** — called only once in this function; but also used in sibling functions → consider moving to a shared parse util |
| `repairTruncatedJson` | `claude.ts:286` | 51 ln | Character-level bracket counter; closes unclosed `[` and `{`, strips trailing comma, closes open strings | **Keep** — non-trivial logic; reused on max_tokens truncation across all generators |
| `filterForbiddenContent` | `lib/ai/course-validator.ts:224` | 53 ln | Regex-scans every step for exam-logistics phrases (duration, materials, rules); replaces matching steps with a generic fallback | **Keep** — security/quality gate; reused across all course generators |

---

## Optimization Proposals

### 1. Replace inline `16384` with `MAX_TOKENS_GENERATION` (Low risk)

**Current (`claude.ts:2241`):**
```ts
max_tokens: 16384, // Enough for 2 lessons + full outline + summary
```

**Why it's a problem:** The constant `MAX_TOKENS_GENERATION = 16384` is already defined at `claude.ts:44`. Every other generator uses it. This one call site duplicates the magic number with a comment that drifts.

**Fix:**
```ts
max_tokens: MAX_TOKENS_GENERATION,
```

**Risk:** None. Pure constant substitution.

---

### 2. Add prompt caching on the system message (Low risk, high impact)

**Why:** `INITIAL_COURSE_GENERATION_SYSTEM_PROMPT` is a static 29-line string. It's identical across retries and across users. Anthropic charges ~10× less for cache-read tokens vs. fresh input tokens.

**Fix — add `cache_control` to the system block:**
```ts
() => client.messages.stream({
  model: AI_MODEL,
  max_tokens: MAX_TOKENS_GENERATION,
  system: [
    {
      type: 'text',
      text: systemPrompt,
      cache_control: { type: 'ephemeral' },
    }
  ],
  messages: [{ role: 'user', content: userPrompt }],
}),
```

**Impact:** On a cache hit the ~800 system prompt tokens cost $0.30/Mtok instead of $3.00/Mtok — a 10× reduction on the static portion. Cache TTL is 5 minutes; warms up on the first call per worker.

**Risk:** Low. Requires SDK ≥ 0.20. Already used elsewhere in the codebase (`lib/homework/`). The `messages.stream` API accepts the array form for `system`.

---

### 3. Use Anthropic JSON mode to eliminate `extractJsonFromResponse` + `repairTruncatedJson` (Medium risk)

**Why:** Two fragile string-manipulation functions exist solely because the model sometimes wraps its response in markdown or truncates mid-JSON. The Anthropic API now supports `"response_format": { "type": "json_object" }` which:
- Guarantees the response is valid JSON (no fences, no thinking tags)
- Prevents truncation from yielding unparseable output

**Fix:**
```ts
() => client.messages.stream({
  model: AI_MODEL,
  max_tokens: MAX_TOKENS_GENERATION,
  system: [...],
  messages: [{ role: 'user', content: userPrompt }],
  // response_format: { type: 'json_object' },  // when GA on streaming
}),
```

**Current blocker:** As of mid-2025, `response_format` is only available on non-streaming calls. For streaming you would need to switch from `messages.stream` to a non-streaming `messages.create` and handle chunked JSON yourself, or wait for the streaming variant to GA.

**Risk:** Medium. Removing `repairTruncatedJson` removes the safety net for legitimate truncation; must verify `max_tokens` is high enough that truncation never occurs in practice.

---

### 4. Collapse `getInitialCoursePrompt` wrapper (Low risk, cosmetic)

**Current (`prompts.ts:2666`):**
```ts
export function getInitialCoursePrompt(...): { systemPrompt: string; userPrompt: string } {
  return {
    systemPrompt: INITIAL_COURSE_GENERATION_SYSTEM_PROMPT,
    userPrompt: buildInitialCourseGenerationUserPrompt(document, userTitle, imageCount, userContext, undefined, intensityMode)
  }
}
```

This 12-line wrapper adds no logic — it exists to hide `curriculumContext` (passed as `undefined`). You could either:
- **Option A:** Delete the wrapper, call `buildInitialCourseGenerationUserPrompt` directly from `generateInitialCourse`, and export `INITIAL_COURSE_GENERATION_SYSTEM_PROMPT`.
- **Option B:** Keep it as the stable public API surface for `prompts.ts` (preferred if you ever want to swap the system prompt at runtime).

**Risk:** None for Option A if `getInitialCoursePrompt` has only one caller. **Check before deleting.**

---

### 5. Hoist regex in `repairTruncatedJson` to module level (Low risk)

**Current (`claude.ts:286`):** No regex, but the function is called conditionally on every invocation. The concern is the trailing-comma regex:

```ts
repaired = repaired.replace(/,\s*$/, '')
```

This compiles a new `RegExp` object on every call. For a function that runs on every course generation (and on every retry), hoist it:

```ts
// module level
const TRAILING_COMMA_RE = /,\s*$/
```

**Risk:** None. Micro-optimization; also makes the intent clearer.

---

### 6. Replace manual field validation with Zod (Medium risk)

**Current (`claude.ts:2309`):**
```ts
if (!parsed.title || !parsed.overview || !parsed.lessons || !parsed.lessonOutline || !parsed.documentSummary) {
  throw new ClaudeAPIError('Initial course response missing required fields ...', 'PARSE_ERROR')
}
```

This check silently passes if `lessons` is an empty array `[]` (falsy check fails for non-empty arrays but succeeds here). It also gives no field-level error message.

**Fix:**
```ts
import { z } from 'zod'

const InitialCourseResponseSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  documentSummary: z.string().min(1),
  lessonOutline: z.array(z.object({
    index: z.number(),
    title: z.string(),
    description: z.string(),
    estimatedSteps: z.number(),
    topics: z.array(z.string()),
  })).min(1),
  lessons: z.array(z.object({
    title: z.string(),
    steps: z.array(z.unknown()),
  })).min(1),
  learningObjectives: z.array(z.unknown()).optional(),
})

const result = InitialCourseResponseSchema.safeParse(parsed)
if (!result.success) {
  log.error({ issues: result.error.issues }, 'generateInitialCourse schema validation failed')
  throw new ClaudeAPIError(`Schema validation failed: ${result.error.issues[0]?.message}`, 'PARSE_ERROR')
}
```

**Risk:** Medium. Requires `zod` (already a dependency in this project). The schema must match exactly what the prompt instructs Claude to emit — drift between prompt and schema will cause false failures.

---

### 7. Buffer stream deltas into an array, join once (Low risk)

**Current (`claude.ts:2247`):**
```ts
let rawText = ''
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    rawText += event.delta.text   // string concatenation on every delta
  }
}
```

String concatenation in a hot loop is O(n²) in some JS engines because each `+=` may allocate a new string. For a 16 K-token response (≈64 KB), this fires ~2 000–4 000 times.

**Fix:**
```ts
const chunks: string[] = []
for await (const event of stream) {
  if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
    chunks.push(event.delta.text)
  }
}
const rawText = chunks.join('')
```

**Risk:** None. V8 optimizes `Array.join` for string concatenation; this is the standard pattern for streaming text accumulation.

---

## Risk Matrix

| # | Optimization | Risk | Breaking change | Effort |
|---|-------------|------|-----------------|--------|
| 1 | Use `MAX_TOKENS_GENERATION` constant | Low | No | 1 min |
| 2 | Prompt caching on system message | Low | No | 10 min |
| 3 | JSON mode (eliminate extract + repair) | Medium | No (additive) | 30 min + wait for GA |
| 4 | Collapse `getInitialCoursePrompt` wrapper | Low | No (check callers) | 5 min |
| 5 | Hoist regex to module level | Low | No | 1 min |
| 6 | Zod schema validation | Medium | No | 20 min |
| 7 | Array buffer for stream chunks | Low | No | 2 min |

**Recommended order:** 1 → 7 → 5 → 2 → 4 → 6 → 3 (wait for streaming JSON mode GA).

---

## Quick Wins (do now, no review needed)

```ts
// claude.ts:2241 — fix #1
- max_tokens: 16384, // Enough for 2 lessons + full outline + summary
+ max_tokens: MAX_TOKENS_GENERATION,

// claude.ts:2247 — fix #7
- let rawText = ''
- for await (const event of stream) {
-   if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
-     rawText += event.delta.text
-   }
- }
+ const chunks: string[] = []
+ for await (const event of stream) {
+   if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
+     chunks.push(event.delta.text)
+   }
+ }
+ const rawText = chunks.join('')
```

---

## curl Examples

Route: `POST /api/generate-course` (`app/api/generate-course/route.ts:131`)
Response: newline-delimited JSON (NDJSON) stream, 240 s max duration.

### Auth

The route requires a Supabase session. Grab the `sb-*` cookies from a browser session (DevTools → Application → Cookies) and pass them with `-H "Cookie: ..."`. Alternatively use a Bearer token if you have a service-role key, but that bypasses RLS — use cookies for user-scoped testing.

### Path A — plain text input

Reaches `generateCourseFromText` (`lib/ai/claude.ts:1903`). Simplest curl — no document structure needed.

```bash
curl -X POST https://snap-notes-j68u-three.vercel.app/api/generate-course \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste sb-* cookies here>" \
  --no-buffer \
  -d '{
    "textContent": "Photosynthesis is the process by which plants convert sunlight into glucose. It occurs in the chloroplast and requires CO2, water, and light energy. The light-dependent reactions occur in the thylakoid membrane, producing ATP and NADPH. The Calvin cycle occurs in the stroma and uses these to fix CO2 into G3P.",
    "title": "Photosynthesis",
    "intensityMode": "standard"
  }'
```

**`intensityMode` values:** `"quick"` | `"standard"` | `"deep_practice"`

### Path B — inline ExtractedDocument (calls `generateInitialCourse` directly)

Reaches `generateInitialCourse` (`lib/ai/claude.ts:2215`). Pass `documentContent` as an inline `ExtractedDocument` object. This is the exact shape the function expects.

```bash
curl -X POST https://snap-notes-j68u-three.vercel.app/api/generate-course \
  -H "Content-Type: application/json" \
  -H "Cookie: <paste sb-* cookies here>" \
  --no-buffer \
  -d '{
    "documentContent": {
      "type": "pdf",
      "title": "Photosynthesis Notes",
      "content": "Photosynthesis converts light energy to chemical energy stored in glucose.",
      "sections": [
        {
          "title": "Overview",
          "content": "Photosynthesis is the process by which plants use sunlight, water, and CO2 to produce glucose and oxygen.",
          "pageNumber": 1
        },
        {
          "title": "Light-Dependent Reactions",
          "content": "Occur in the thylakoid membrane. Use light energy to split water, releasing O2 and generating ATP and NADPH.",
          "pageNumber": 2
        },
        {
          "title": "Calvin Cycle",
          "content": "Occurs in the stroma. Uses ATP and NADPH to fix CO2 into G3P, which is used to build glucose.",
          "pageNumber": 3
        }
      ],
      "metadata": {
        "pageCount": 3
      }
    },
    "title": "Photosynthesis",
    "intensityMode": "standard"
  }'
```

**`documentContent.type` values:** `"pdf"` | `"pptx"` | `"docx"`

### Response shape

Each line is a self-contained JSON object. Pipe through `| while IFS= read -r line; do echo "$line" | jq .; done` for pretty-printing.

```jsonc
// Keepalive — sent every 2 s to prevent iOS/Safari timeout
{"type":"heartbeat","timestamp":1747480000000}

// Progress — intermediate stage updates
{"type":"progress","stage":"generating_initial_lessons","percent":40}

// Success — final line, course is saved to DB
{
  "type": "success",
  "courseId": "uuid-here",
  "cardsGenerated": 0,
  "imagesProcessed": 0,
  "sourceType": "pdf",
  "generationStatus": "partial",
  "lessonsReady": 2,
  "totalLessons": 6
}

// Error
{"type":"error","error":"Failed to parse initial course as JSON","code":"PARSE_ERROR","retryable":false}
```

`generationStatus: "partial"` means background continuation is still running. Poll the course record or listen for a separate webhook to know when all lessons are ready (`generationStatus: "complete"`).

---

## Optimization 8: Replace JSON-in-prompt with Tool Use (High impact)

### The problem

`generateInitialCourse` instructs Claude to return a large JSON blob as plain text. The caller then runs a fragile pipeline to recover it:

```
rawText
  → extractJsonFromResponse()   strip <thinking> tags + markdown fences
  → repairTruncatedJson()       close unclosed brackets if max_tokens hit
  → JSON.parse()                throws if repair failed
  → manual if (!parsed.title…)  brittle field presence check
```

Four steps, each a failure point. The root cause is that text generation doesn't enforce structure — Claude can and occasionally does wrap output in prose, add a preamble, or get cut off mid-field.

### The fix: force a tool call

Anthropic's tool_use (function calling) lets you declare an exact schema and set `tool_choice: { type: "tool", name: "..." }` to force Claude to always call it. The SDK validates the response against the schema before returning — no regex, no repair, no `JSON.parse`.

This is the same pattern already used in `lib/study-plan/chat-tools.ts` and `app/api/study-plan/chat/route.ts`, but used here as a **structured output mechanism** rather than an agentic tool: Claude never "runs" the tool, it just fills it with data.

### Tool definition

```typescript
// lib/ai/tools/initial-course-tool.ts
import Anthropic from '@anthropic-ai/sdk'

export const INITIAL_COURSE_TOOL: Anthropic.Tool = {
  name: 'emit_course_structure',
  description: 'Emit the complete initial course structure with outline and first 2 lessons.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      overview: { type: 'string' },
      documentSummary: {
        type: 'string',
        description: '400-600 word summary of the entire document for continuation generation',
      },
      learningObjectives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            objective: { type: 'string' },
            bloomLevel: {
              type: 'string',
              enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
            },
            actionVerb: { type: 'string' },
          },
          required: ['id', 'objective', 'bloomLevel', 'actionVerb'],
        },
      },
      lessonOutline: {
        type: 'array',
        description: 'ALL planned lessons — not just the first 2',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            estimatedSteps: { type: 'number' },
            topics: { type: 'array', items: { type: 'string' } },
          },
          required: ['index', 'title', 'description', 'estimatedSteps', 'topics'],
        },
        minItems: 1,
      },
      lessons: {
        type: 'array',
        description: 'ONLY the first 2 lessons with full step content',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'explanation', 'key_point', 'question', 'formula',
                      'example', 'summary', 'worked_example', 'practice_problem',
                    ],
                  },
                  content: { type: 'string' },
                  title: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctIndex: { type: 'number' },
                  explanation: { type: 'string' },
                },
                required: ['type', 'content'],
              },
            },
          },
          required: ['title', 'steps'],
        },
        maxItems: 2,
      },
    },
    required: ['title', 'overview', 'documentSummary', 'lessonOutline', 'lessons'],
  },
}
```

### Before vs. after

**Before** (`claude.ts:2238–2314`):
```ts
// Stream → collect text → parse → repair → validate
const { rawText, stopReason } = await withStreamRetry(
  () => client.messages.stream({
    model: AI_MODEL,
    max_tokens: 16384,
    system: systemPrompt,   // embeds full JSON schema in prose
    messages: [{ role: 'user', content: userPrompt }],
  }),
  async (stream) => {
    let rawText = ''
    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        rawText += event.delta.text
      }
    }
    const finalMessage = await stream.finalMessage()
    logLLMUsage('generateInitialCourse', finalMessage.usage)
    return { rawText, stopReason: finalMessage.stop_reason }
  },
  'generateInitialCourse'
)

let jsonText = extractJsonFromResponse(rawText)           // strip fences
if (stopReason === 'max_tokens' || !jsonText.trim().endsWith('}')) {
  jsonText = repairTruncatedJson(jsonText)                // fix truncation
}
const parsed = JSON.parse(jsonText)                       // may throw
if (!parsed.title || !parsed.overview || ...) {           // brittle check
  throw new ClaudeAPIError('missing required fields', 'PARSE_ERROR')
}
```

**After** (tool_use):
```ts
// Force tool call → extract input → done
const response = await withStreamRetry(
  () => client.messages.create({
    model: AI_MODEL,
    max_tokens: MAX_TOKENS_GENERATION,
    system: systemPrompt,   // no JSON schema description needed here
    tools: [INITIAL_COURSE_TOOL],
    tool_choice: { type: 'tool', name: 'emit_course_structure' },
    messages: [{ role: 'user', content: userPrompt }],
  }) as unknown as ReturnType<Anthropic['messages']['stream']>,
  async (r) => r,
  'generateInitialCourse'
)

logLLMUsage('generateInitialCourse', response.usage)

const toolUse = response.content.find(
  (b): b is Anthropic.ToolUseBlock =>
    b.type === 'tool_use' && b.name === 'emit_course_structure'
)
if (!toolUse) throw new ClaudeAPIError('No tool_use block in response', 'PARSE_ERROR')

const parsed = toolUse.input as InitialCourseToolInput   // already schema-validated
```

### What is eliminated

| Removed | File:Line | Why safe to remove |
|---------|-----------|-------------------|
| `extractJsonFromResponse` call | `claude.ts:2282` | Tool_use output is never wrapped in markdown |
| `repairTruncatedJson` call | `claude.ts:2287` | Tool_use doesn't truncate mid-field; SDK rejects incomplete responses |
| `if (!parsed.title \|\| ...)` check | `claude.ts:2309` | Schema `required` array enforces presence |
| JSON schema prose in system prompt | `prompts.ts:2535–2563` | Schema now lives in `INITIAL_COURSE_TOOL.input_schema` |

### Trade-offs

| Dimension | Current (stream + parse) | Tool_use |
|-----------|--------------------------|----------|
| Output reliability | Fragile — regex + repair | Guaranteed — SDK validates schema |
| Streaming support | Yes | No — `messages.create` only (non-streaming) |
| iOS keepalive | Built-in (heartbeat in stream loop) | Needs separate `setInterval` on outer SSE controller |
| Truncation risk | Yes (heuristic repair) | None |
| System prompt size | Large (embeds full JSON schema) | Smaller (schema moves to tool def) |
| Parse code | ~80 lines across 3 functions | ~5 lines |
| Latency | First token arrives fast | Waits for full response before returning |

### Mitigation: iOS heartbeat with non-streaming

The outer route (`app/api/generate-course/route.ts`) owns the SSE stream and already sends heartbeats independently of the AI call. Switching `generateInitialCourse` from `messages.stream` to `messages.create` does **not** affect the outer heartbeat — it only means the AI call itself blocks internally. The outer heartbeat timer in the route controller keeps the iOS connection alive during that wait.

No additional work needed for heartbeats; the switch is transparent to the route layer.

### Recommended rollout

1. Create `lib/ai/tools/initial-course-tool.ts` with the tool definition above.
2. Update `generateInitialCourse` in `claude.ts:2215` to use `messages.create` + tool extraction.
3. Simplify `INITIAL_COURSE_GENERATION_SYSTEM_PROMPT` in `prompts.ts:2535` — remove the `## Output Structure` and JSON example sections (now redundant).
4. Delete the `extractJsonFromResponse` and `repairTruncatedJson` call sites (keep the functions — other generators still use them).
5. Test: fire Path B curl above and confirm `generationStatus: "partial"` + `lessonsReady: 2` in the success line.

---

## Why Streaming? (SSE / NDJSON)

### The problem with a normal JSON response

Course generation takes 30–120 seconds. A regular `POST` → `200 JSON` response would mean:

- The HTTP connection sits open **silently** the entire time
- The client has no idea whether the server is still working or has hung
- **iOS Safari kills connections that receive no bytes for > ~60 s** — the request dies before the response arrives
- The user sees a blank spinner with zero feedback for up to 2 minutes

Streaming solves all three: the server writes JSON lines to the open HTTP response as work progresses, and the client reads them in real time.

### Why `Content-Type: text/event-stream`?

SSE (Server-Sent Events) is a browser-native protocol for server → client push over plain HTTP. No WebSocket handshake, no special library — a `fetch` with `response.body.getReader()` is all the client needs. The route uses raw **NDJSON** (newline-delimited JSON) rather than the full SSE `data:` framing, which is simpler to produce and parse.

The route sets these headers to prevent any proxy or CDN from buffering the response:

```
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, must-revalidate
X-Accel-Buffering: no        ← tells nginx/Vercel not to buffer
```

### What `sendMessage` does

Every `sendMessage(payload)` call in `route.ts`:

1. Serialises `payload` to JSON
2. Appends `\n` (the NDJSON line delimiter)
3. Enqueues the bytes into the `ReadableStream` controller
4. Those bytes are flushed to the client **immediately** — no batching, no buffering

The client reads each `\n`-terminated line, parses it, and reacts.

### Heartbeat messages — keeping the connection alive

```ts
// Fired every 2 s via setInterval, runs for the entire duration of the call
sendMessage({ type: 'heartbeat', timestamp: Date.now() })
```

| Purpose | Detail |
|---------|--------|
| Keep TCP alive | Routers and reverse proxies drop idle connections after ~60 s |
| Prevent iOS Safari timeout | Safari kills fetch streams that receive no bytes for > ~60 s; each heartbeat resets that timer |
| Signal liveness to the client | The client can distinguish "still working" from a hung or dropped connection |

Without heartbeats, a 90-second generation on iOS drops at ~60 s with a network error — even though the server finishes successfully a few seconds later.

### Progress messages — driving the UI

```ts
sendMessage({ type: 'progress', stage: 'Authenticated', percent: 10 })
sendMessage({ type: 'progress', stage: 'generating_initial_lessons', percent: 40 })
```

`stage` is a human-readable label shown in the UI; `percent` drives the progress bar (0–100). These are not required for correctness — the generation would complete without them — but without them the client shows 0% for the entire duration and jumps straight to 100% on `success`, which feels broken.

### Full lifecycle of one request

```
Client  →  POST /api/generate-course
           ↓
Server  →  HTTP 200 + headers (returned immediately, before any work)
           ↓
           [async handler begins]
           sendMessage({ type: 'progress', stage: 'Starting', percent: 5 })
           [auth check — supabase.auth.getUser()]
           sendMessage({ type: 'progress', stage: 'Authenticated', percent: 10 })
           [build prompts, fetch/parse document if needed]
           sendMessage({ type: 'progress', stage: 'generating_initial_lessons', percent: 30 })
           [AI call — 30–120 s]
              heartbeat every 2 s  ←──────────────────────────┐
              (setInterval running in parallel)                │
           [save course record to Supabase DB]                │
           sendMessage({ type: 'success', courseId: '...', lessonsReady: 2, totalLessons: 6 })
           clearInterval(heartbeat)
           controller.close()
```

### Why not WebSockets?

WebSockets are bidirectional — the client can send messages *back*. Course generation is strictly one-way (server → client), so SSE is the right primitive. WebSockets also require a protocol upgrade handshake and stateful server-side connection management — more complexity for no benefit here.

### Why not polling?

The alternative: client POSTs → receives `202 Accepted` + a job ID → polls `GET /api/jobs/:id` every N seconds.

| | SSE streaming | Polling |
|--|---------------|---------|
| Latency to first update | Instant | Up to N seconds |
| Infrastructure needed | None beyond the route | Jobs table + separate endpoint |
| Client complexity | One `fetch` + line reader | Repeated requests + state machine |
| iOS reliability | Heartbeat keeps connection open | Each poll is a fresh connection |

SSE streaming is simpler end-to-end for a single long-running operation.

---

## Postman Setup

The route uses **Supabase session cookies** for auth. Without a valid cookie, the route sends an error JSON into the stream and closes it immediately — which Postman shows as "Connected → Connection closed" with HTTP 200 and no visible body.

### Why it looks like a WebSocket issue (but isn't)

The route returns `Content-Type: text/event-stream` (SSE / NDJSON). Postman's default HTTP mode reads the response headers, sees the connection close, and stops — it never surfaces the error JSON that arrived in the stream body. It's not a WebSocket; it's a long-lived HTTP response you need to stream-read.

### Root cause at a glance

| Layer | What happens |
|-------|-------------|
| Middleware (`middleware.ts:49`) | Skips auth for all `/api/*` — route is always reached |
| Route (`route.ts:207`) | Returns HTTP 200 and starts the stream **before** the auth check runs |
| Auth check (`route.ts:209–221`) | Calls `supabase.auth.getUser()` using the `sb-*` session cookie |
| No cookie present | Sends `{"type":"error","error":"Please log in..."}` into the stream → closes |
| Postman (default mode) | Sees HTTP 200, "Connection closed" — never shows the error JSON body |

---

### Step 1 — Get your Supabase session cookie

**Option A — Browser DevTools (easiest)**

1. Open the app at `http://localhost:3000`, sign in
2. DevTools → Application → Cookies → `localhost:3000`
3. Copy the value of `sb-ybgkzqrpfdhyftnbvgox-auth-token`
   - If it's split, you'll also see `sb-ybgkzqrpfdhyftnbvgox-auth-token.0` and `.1` — copy all of them

**Option B — Browser console**

Paste this in the DevTools console on any page of the app:

```js
const key = Object.keys(localStorage).find(k => k.includes('auth-token'))
console.log(localStorage.getItem(key))
```

This prints the full token JSON. You only need the raw string value, not the parsed object.

---

### Step 2 — Pass the cookie in Postman

**Option A — Postman Cookie Manager (recommended)**

1. Open the request, click **Cookies** (top-right of the request tab)
2. Add domain: `localhost`
3. Add cookie:
   - Name: `sb-ybgkzqrpfdhyftnbvgox-auth-token`
   - Value: `<paste value here>`
   - Path: `/`
4. If the token is split (`.0`, `.1`), add each as a separate cookie entry

**Option B — Manual Cookie header**

In the Headers tab, add:

```
Cookie: sb-ybgkzqrpfdhyftnbvgox-auth-token=<value>
```

> Project ref is `ybgkzqrpfdhyftnbvgox` (matches the Supabase dashboard URL).

---

### Step 3 — Enable streaming in Postman

The route sends NDJSON over a long-lived connection. Postman's default mode buffers and closes — you need to switch to stream mode:

1. Go to the **Settings** tab of the request
2. Enable **"Stream response"** (Postman ≥ v10)
   - If you don't see it: click the **Response** area dropdown → select **Stream**
3. Send the request — the Messages panel will show each JSON line as it arrives

---

### Step 4 — Verify auth before sending real content

Send a minimal body first to confirm auth is working:

```json
{
  "textContent": "test",
  "title": "Test"
}
```

**Auth failed** — you'll see this as the first stream message:
```json
{"type":"error","error":"Please log in to generate a course","code":"UNAUTHORIZED","retryable":false}
```

**Auth OK** — first message will be:
```json
{"type":"progress","stage":"Starting","percent":5}
```

---

### Step 5 — Full working Postman config

```
Method:   POST
URL:      http://localhost:3000/api/generate-course
Settings: Stream response = ON

Headers:
  Content-Type: application/json
  Cookie: sb-ybgkzqrpfdhyftnbvgox-auth-token=<your-token-value>

Body (raw JSON):
{
  "textContent": "Photosynthesis converts sunlight into glucose using CO2 and water. Light-dependent reactions occur in the thylakoid membrane producing ATP and NADPH. The Calvin cycle in the stroma fixes CO2 into G3P which builds glucose.",
  "title": "Photosynthesis",
  "intensityMode": "standard"
}
```

**Expected stream output (one JSON line per message):**

```
{"type":"progress","stage":"Starting","percent":5}
{"type":"heartbeat","timestamp":1747480000000}
{"type":"progress","stage":"generating_course","percent":30}
{"type":"heartbeat","timestamp":1747480002000}
...
{"type":"success","courseId":"<uuid>","lessonsReady":1,"totalLessons":1,"sourceType":"text","generationStatus":"complete"}
```

A course record with that `courseId` will appear in your Supabase `courses` table.
