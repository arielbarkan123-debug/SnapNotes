# LLM Usage & Optimization Guide

> Last updated: 2026-05-07  
> Goal: map the entire Claude API surface, identify token bottlenecks, and define where RAG can reduce cost.

---

## 1. Model Configuration

### Where the model is set

| What | File | Detail |
|------|------|--------|
| Default model | `lib/ai/claude.ts` | Reads `process.env.ANTHROPIC_MODEL` → falls back to `claude-sonnet-4-6` |
| Fast/cheap model | `lib/ai/claude.ts` | Reads `process.env.ANTHROPIC_MODEL_FAST` → falls back to `claude-sonnet-4-6` |
| Diagram label routing | `lib/diagram-engine/router.ts:291` | Hardcoded `claude-sonnet-4-20250514` — only place not using env var |
| API key | `lib/env.ts` | Validates `ANTHROPIC_API_KEY` at startup; throws if missing |
| Token constants | `lib/ai/claude.ts` | `MAX_TOKENS_EXTRACTION = 4096`, `MAX_TOKENS_GENERATION = 16384` |

### How to change the model

1. Update `.env.local` (local) or Vercel environment variables (production):
   ```
   ANTHROPIC_MODEL=claude-opus-4-7
   ANTHROPIC_MODEL_FAST=claude-haiku-4-5-20251001
   ```
2. To change the diagram label model: edit `lib/diagram-engine/router.ts:291` directly.

### Singleton client

All Claude calls go through one shared client created in `lib/ai/claude.ts` via `getAnthropicClient()`. No other file creates its own Anthropic client.

---

## 2. Full LLM API Surface

### Core library files that call Claude

| File | Lines | Feature | Max Tokens |
|------|-------|---------|-----------|
| `lib/ai/claude.ts` | 2,429 | Course generation (image / document / text / YouTube), image analysis | 4,096 – 16,384 |
| `lib/homework/tutor-engine.ts` | 1,737 | Socratic homework tutoring | 2,048 |
| `lib/homework/checker-engine.ts` | 2,385 | Homework grading (streaming) | 4,096 |
| `lib/homework/walkthrough-generator.ts` | 794 | Step-by-step solution walkthroughs | varies |
| `lib/homework/hint-generator.ts` | 286 | Scaffolded hints | 1,500 |
| `lib/homework/question-analyzer.ts` | 381 | Question intent extraction | 4,096 |
| `lib/homework/reference-analyzer.ts` | 245 | Reference material analysis | 4,096 |
| `lib/homework/student-work-reader.ts` | 208 | Handwriting extraction via Vision | 2,048 |
| `lib/homework/smart-solver/solve.ts` | 147 | Math solver | 4,096 |
| `lib/homework/smart-solver/decompose.ts` | 288 | Problem decomposition | 4,096 |
| `lib/homework/smart-solver/compute-verify.ts` | 213 | Answer verification | 2,048 |
| `lib/homework/smart-solver/retry.ts` | 109 | Solver retry | 4,096 |
| `lib/prepare/guide-generator.ts` | ~200 | Study guide generation | 8,000 |
| `lib/concepts/extractor.ts` | ~100 | Concept extraction / knowledge graph | varies |
| `lib/concepts/gap-detector.ts` | ~100 | Learning gap detection | varies |
| `lib/exam-prediction/predictor.ts` | ~100 | Exam topic prediction | varies |
| `lib/formula-scanner/analyzer.ts` | ~100 | Formula analysis | 3,000 |
| `lib/formula-scanner/solver.ts` | ~100 | Formula solving | 4,000 |
| `lib/insights/mistake-analyzer.ts` | ~100 | Error pattern detection | 3,000 |
| `lib/practice/question-generator.ts` | ~100 | Practice question generation | varies |
| `lib/srs/card-generator.ts` | ~100 | Flashcard generation | 1,024 |
| `lib/youtube/course-from-video.ts` | ~100 | YouTube transcript → course | 8,000 |
| `lib/cheatsheet/generator.ts` | ~100 | Cheatsheet generation | varies |
| `lib/diagram-engine/router.ts` | ~600 | Diagram routing / TikZ / Recraft / Matplotlib | 300 – 4,096 |

### API route handlers that call Claude inline

| Route | Max Tokens | History Accumulation |
|-------|-----------|---------------------|
| `app/api/chat/route.ts` | 1,024 | Last 10 messages (4,000 chars each) |
| `app/api/study-plan/chat/route.ts` | 1,024 | Last **50 messages** + tool-use loop (2-3 calls/turn) |
| `app/api/practice/tutor/route.ts` | 2,048 | Client-provided conversation array |
| `app/api/prepare/[id]/chat/route.ts` | 4,096 | No history — guide content injected (up to 15,000 chars) |
| `app/api/generate-questions/route.ts` | 2,048 | None |
| `app/api/help/route.ts` | 300 | None |
| `app/api/exams/route.ts` | 8,000 | None |
| `app/api/exams/from-content/route.ts` | 8,000 | None |
| `app/api/homework/sessions/[sessionId]/step-chat/route.ts` | 1,024 | Session-scoped recent messages |
| `app/api/search/route.ts` | 500 | None |

---

## 3. Prompt Inventory

### Primary prompt repository

**`lib/ai/prompts.ts`** (2,811 lines) — the single largest prompt file. Every builder here is dynamically constructed with user context (education level, study system, language, subject).

| Export | Feature | Approx Size |
|--------|---------|-------------|
| `getImageAnalysisPrompt()` | Notebook image extraction | ~150 lines |
| `getMultiPageImageAnalysisPrompt()` | Multi-page scan → unified doc | ~100 lines |
| `getCourseGenerationPrompt()` | Standard course from notes | ~350 lines |
| `getDeepPracticeCoursePrompt()` | Mastery / intensive practice | ~300 lines |
| `getDocumentCourseGenerationPrompt()` | PDF / PPTX / DOCX → course | ~250 lines |
| `getTextCourseGenerationPrompt()` | Free-text → course | ~200 lines |
| `getExamCourseGenerationPrompt()` | Exam prep course | ~200 lines |
| `getInitialCourseGenerationPrompt()` | Fast initial structure | ~100 lines |
| `getContinuationCoursePrompt()` | Extend existing course | ~100 lines |
| `getCombinedAnalysisPrompt()` | Image-to-course combined pipeline | ~60 lines |

### Homework engine prompts

| File | Prompt / Function | Approx Size | Notes |
|------|------------------|-------------|-------|
| `lib/homework/tutor-engine.ts:97` | `SOCRATIC_TUTOR_SYSTEM_BASE` | ~380 lines | Largest single system prompt in codebase; includes diagram generation rules, emotional intelligence directives, math accuracy rules |
| `lib/homework/tutor-engine.ts:594` | `FULL_EXPLANATION_SYSTEM_ADDITION` | ~12 lines | Replaces Socratic approach when student requests full solution |
| `lib/homework/tutor-engine.ts:610` | `INITIAL_GREETING_PROMPT` | ~15 lines | Template with placeholders |
| `lib/homework/walkthrough-generator.ts:438` | `buildWalkthroughSystemPrompt()` | ~150 lines | Dynamic; includes question and topic |
| `lib/homework/checker-engine.ts:424` | `analyzeHomework()` system | ~100–200 lines | Two-phase: analyze items then grade |
| `lib/homework/checker-engine.ts:563` | `beforeSubmitCheck()` system | ~100 lines | Pre-submission verification |

### Inline API route prompts

| Route | Where | Notes |
|-------|-------|-------|
| `app/api/chat/route.ts:167–197` | Inline system prompt builder | Injects curriculum context + student intelligence + language instruction |
| `app/api/study-plan/chat/route.ts` | `buildStudyPlanChatPrompt()` in `lib/study-plan/chat-prompt.ts` | ~60 lines + event tools definition |
| `app/api/practice/tutor/route.ts:67–121` | Inline | Socratic tutor + full diagram schema list |

### Prompt helper utilities

| File | What it does |
|------|-------------|
| `lib/ai/language.ts` | `buildLanguageInstruction()` — ~30 lines injected into every prompt |
| `lib/ai/math-methods.ts` | Topic-specific math method instructions (1,136 lines of lookup tables) |
| `lib/ai/visual-guidance.ts` | Diagram generation instructions per topic |
| `lib/ai/content-classifier.ts` | Classifies content as computational / conceptual / mixed to select prompt variant |
| `lib/curriculum/context-builder.ts` | Builds curriculum-aware context block injected into chat and question prompts |
| `lib/student-context.ts` | Generates "student intelligence profile" injected into system prompts |

### Diagram engine prompts (separate system)

All in `lib/diagram-engine/`:

| File | Purpose | Max Tokens |
|------|---------|-----------|
| `system-prompt.ts` | Core diagram system instructions | 2,048 |
| `tikz/core-prompt.ts` | LaTeX / TikZ code generation | 4,096 |
| `tikz/layered-tikz-prompt.ts` | Layered walkthrough diagrams | 4,096 |
| `step-sequence.ts` | Step-by-step visual sequences | 2,048 |
| `label-pipeline.ts` | Label text generation | 2,048 |
| `smart-pipeline/analyze.ts` | Diagram content analysis | 2,048 |

---

## 4. Token Bottlenecks (ranked by severity)

### Tier 1 — Critical (immediate cost / latency risk)

**1. Course generation from large documents**
- File: `lib/ai/claude.ts`, constant `MAX_TOKENS_GENERATION = 16384`
- Triggered by: PDF / PPTX with 31+ slides
- Each generation = one call at up to 16K output tokens
- Input also large: extracted document content can be tens of thousands of characters

**2. Study plan chat — context accumulation**
- File: `app/api/study-plan/chat/route.ts`
- Fetches **50 full chat messages** from DB on every turn, converts to Anthropic format
- Then runs a tool-use loop: first Claude call → tool call → second (or third) Claude call with growing message array
- Each turn can trigger 2–3 Claude API calls with an ever-growing context

**3. Socratic tutor system prompt**
- File: `lib/homework/tutor-engine.ts:97`
- `SOCRATIC_TUTOR_SYSTEM_BASE` alone is ~380 lines before dynamic additions (language, grade, topic instructions)
- Every tutoring message sends this full prompt regardless of the question's complexity

### Tier 2 — High (significant but bounded)

**4. Study guide & exam generation**
- `lib/prepare/guide-generator.ts` → 8,000 max output tokens
- `app/api/exams/route.ts` → 8,000 max output tokens
- Single large calls, but not conversational so no accumulation

**5. Homework checker — streaming analysis**
- `lib/homework/checker-engine.ts` → 4,096 max output tokens
- Two-phase: analyze all items, then grade — can trigger 2 calls per submission
- Input includes student work images + reference material

**6. Chat route context accumulation**
- `app/api/chat/route.ts`
- 10 messages × up to 4,000 chars each = up to 40K input chars, plus system prompt (curriculum context + student intelligence + language instruction)
- Sent on every chat turn

### Tier 3 — Medium (bounded, targeted calls)

**7. Smart solver chain**
- `decompose → solve → compute-verify → (retry)` can chain 3–4 calls per homework problem
- Each at 4,096 max output tokens

**8. Diagram engine**
- TikZ pipeline: analyze (2,048) → generate (4,096) → label (2,048) = 3 calls per diagram
- Not frequent but adds up in tutoring sessions

**9. Practice tutor schema injection**
- `app/api/practice/tutor/route.ts` injects a truncated diagram schema list (~3,000 chars) into every practice message

### Tier 4 — Low (small, one-off calls)

- Help API (300 tokens), search (500 tokens), SRS card generation (1,024 tokens), hint generation (1,500 tokens)

---

## 5. What Does Not Exist Yet

| Capability | Status | Impact |
|-----------|--------|--------|
| RAG / vector search | **Not implemented** | All retrieval is naive context-stuffing from Supabase |
| Embeddings | **Not implemented** | No semantic similarity for content retrieval |
| Token usage monitoring | **Not implemented** | No logging of input/output tokens per call or per user |
| Semantic response caching | **Not implemented** | Identical questions re-call Claude from scratch |
| Prompt caching (Anthropic) | **Partial** — present in `tutor-engine.ts`, `checker-engine.ts`, `walkthrough-generator.ts` via `cache_control: { type: 'ephemeral' }` | Not applied to course generation or study plan |
| Context compression | **Not implemented** | No summarization of old history before injecting |
| Cost attribution per feature | **Not implemented** | Cannot tell which feature costs most |

---

## 6. RAG Opportunities

### Where naive context-stuffing could be replaced by retrieval

**A. Curriculum context injection** (high priority)
- Current: `lib/curriculum/context-builder.ts` fetches full curriculum standards and injects into every chat and question-generation prompt
- RAG approach: embed curriculum standards → retrieve only the 3–5 most relevant sections based on the current topic
- Estimated savings: 500–2,000 tokens per call

**B. Student intelligence profile** (medium priority)
- Current: `lib/student-context.ts` builds a full student profile injected into system prompts
- RAG approach: embed learning history → retrieve only misconceptions and gaps relevant to current topic
- Estimated savings: 300–1,000 tokens per call

**C. Course content in chat** (high priority)
- Current: `app/api/chat/route.ts` injects course context (entire lesson or step content) into every message
- RAG approach: embed course lessons → retrieve only the lesson most relevant to the user's question
- Especially impactful for long courses with many lessons

**D. Study guide in prepare chat** (medium priority)
- Current: `app/api/prepare/[id]/chat/route.ts` slices guide content to 15,000 chars and injects it wholesale
- RAG approach: embed guide sections → retrieve top-3 sections by similarity to the question
- Estimated savings: up to 10,000 tokens per call

**E. Study plan chat history** (high priority)
- Current: 50 messages loaded and sent every turn
- Approach: summarize older messages (keep last 10 verbatim + rolling summary of the rest)
- This is simpler than RAG — just context compression — but would dramatically reduce cost

**F. Homework reference materials** (medium priority)
- Current: `lib/homework/reference-analyzer.ts` sends full reference documents to Claude
- RAG approach: embed reference pages → retrieve only the page(s) relevant to the question

### Recommended implementation order

1. **Token monitoring first** — instrument all Claude calls to log `usage.input_tokens` + `usage.output_tokens` per feature. Without this you're optimizing blind.
2. **Study plan history compression** — no embeddings needed, just summarize messages older than 10 turns server-side before sending.
3. **Course content RAG** — embed lessons at generation time (store in Supabase `pgvector`), retrieve at chat time. Highest ROI.
4. **Curriculum context RAG** — embed standards once, retrieve per-topic at query time.
5. **Student profile compression** — summarize to a fixed budget (e.g. 500 tokens max).

---

## 7. Quick Reference — Files to Edit for Common Changes

| Goal | File to edit |
|------|-------------|
| Switch Claude model globally | `.env.local` → `ANTHROPIC_MODEL` |
| Switch to faster/cheaper model | `.env.local` → `ANTHROPIC_MODEL_FAST` |
| Raise/lower course generation token limit | `lib/ai/claude.ts` → `MAX_TOKENS_GENERATION` |
| Edit Socratic tutor personality | `lib/homework/tutor-engine.ts:97` → `SOCRATIC_TUTOR_SYSTEM_BASE` |
| Edit course generation prompts | `lib/ai/prompts.ts` → relevant `get*Prompt()` function |
| Edit chat system prompt | `app/api/chat/route.ts:167` |
| Reduce study plan history | `app/api/study-plan/chat/route.ts` → change the message slice limit |
| Add prompt caching to new feature | Add `cache_control: { type: 'ephemeral' }` to system message block (see `tutor-engine.ts:863` for example) |
| Add token logging | Wrap any `client.messages.create()` call and log `response.usage` |

---

## 8. Token & Cost Logging — How to Implement

### Should you use a package?

**Short answer: No, not yet.** The data is already in every API response — you just need to read it.

| Option | Verdict | Why |
|--------|---------|-----|
| **Anthropic Console** | ✅ Use now | Free dashboard at console.anthropic.com → Usage tab. Daily token + cost breakdown. Zero code. |
| **Manual Pino logging** | ✅ Recommended | 3 extra lines per call site. Uses `lib/logger.ts` already in place. Zero deps. |
| **`langchain`** | ❌ Overkill | 50 MB+ dep, rewrites SDK interface. Not worth it for a single-provider app. |
| **`helicone`** | ⚠️ Consider if spend > $500/mo | Proxy-based: tokens, cost, latency, prompt replay. Free tier exists. Requires one env-var change. |
| **`langfuse`** | ⚠️ Consider for traces | Open-source, self-hostable. Best if you want per-feature traces. More setup than Helicone. |
| **`posthog` / `mixpanel`** | ⚠️ Consider for per-user dashboards | Good if already used for product analytics. |

---

### Where the data lives (no new API calls needed)

Every Claude response already includes a `usage` object. It is never read today.

```typescript
// Non-streaming — response.usage is available immediately
const response = await client.messages.create({ ... })
// response.usage = { input_tokens: 1234, output_tokens: 456 }

// Streaming — usage is available on the final message
const stream = client.messages.stream({ ... })
const final = await stream.finalMessage()
// final.usage = { input_tokens: 1234, output_tokens: 456 }
```

When prompt caching is active (`cache_control: { type: 'ephemeral' }`), two extra fields appear:

```typescript
// final.usage also contains:
// cache_read_input_tokens — tokens read from cache (billed at $0.30/M, not $3.00/M)
// cache_creation_input_tokens — tokens written to cache (billed at $3.75/M once)
```

---

### Step 1 — Add a shared logging helper

Add this to `lib/ai/claude.ts` near the top (after the logger is created):

```typescript
import { AI_MODEL } from './claude' // already exported

interface LLMUsage {
  input_tokens: number
  output_tokens: number
  cache_read_input_tokens?: number
  cache_creation_input_tokens?: number
}

// Sonnet 4.6 pricing as of May 2026
const PRICE_PER_M = {
  input: 3.00,
  output: 15.00,
  cache_read: 0.30,
  cache_write: 3.75,
}

function logLLMUsage(
  fn: string,
  usage: LLMUsage,
  ctx: { user_id?: string; route?: string } = {}
) {
  const cacheRead = usage.cache_read_input_tokens ?? 0
  const cacheWrite = usage.cache_creation_input_tokens ?? 0
  const billableInput = usage.input_tokens - cacheRead

  const estimatedCostUSD = +(
    (billableInput / 1_000_000) * PRICE_PER_M.input +
    (usage.output_tokens / 1_000_000) * PRICE_PER_M.output +
    (cacheRead / 1_000_000) * PRICE_PER_M.cache_read +
    (cacheWrite / 1_000_000) * PRICE_PER_M.cache_write
  ).toFixed(6)

  log.info({
    event: 'llm_usage',
    fn,
    model: AI_MODEL,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    cache_read_input_tokens: cacheRead,
    cache_creation_input_tokens: cacheWrite,
    total_tokens: usage.input_tokens + usage.output_tokens,
    estimated_cost_usd: estimatedCostUSD,
    ...ctx,
  })
}
```

---

### Step 2 — Instrument streaming call sites

The codebase already calls `stream.finalMessage()` but discards `.usage`. Add one line after each:

```typescript
// BEFORE (lib/ai/claude.ts ~865, analyzeNotebookImage)
const finalMessage = await stream.finalMessage()
if (finalMessage.stop_reason !== 'end_turn') { ... }

// AFTER
const finalMessage = await stream.finalMessage()
logLLMUsage('analyzeNotebookImage', finalMessage.usage, { user_id: userId })
if (finalMessage.stop_reason !== 'end_turn') { ... }
```

---

### Step 3 — Instrument non-streaming call sites

```typescript
// BEFORE (app/api/chat/route.ts ~200)
const response = await client.messages.create({ ... })

// AFTER
const response = await client.messages.create({ ... })
logLLMUsage('chat', response.usage, { user_id: user.id, route: '/api/chat' })
```

---

### Priority call sites

| Function | File | Line | Type |
|----------|------|------|------|
| `analyzeNotebookImage` | `lib/ai/claude.ts` | ~865 | streaming |
| `generateStudyCourse` | `lib/ai/claude.ts` | ~1021 | streaming |
| `generateCourseFromImageSingleCall` | `lib/ai/claude.ts` | ~1196 | streaming |
| `generateInitialCourse` | `lib/ai/claude.ts` | ~2216 | streaming |
| Chat tutor | `app/api/chat/route.ts` | ~200 | non-streaming |
| Help | `app/api/help/route.ts` | ~161 | non-streaming |
| Exams | `app/api/exams/route.ts` | — | streaming |
| Study plan chat | `app/api/study-plan/chat/route.ts` | — | streaming |

---

### Step 4 — Read the logs

**Local development:**
```bash
# Filter llm_usage events from Pino output (requires pino-pretty)
npm run dev 2>&1 | grep '"event":"llm_usage"' | npx pino-pretty
```

**Production (Vercel):**
- Open the Vercel dashboard → Logs tab
- Filter by: `event llm_usage`
- Each log line includes `fn`, `model`, `input_tokens`, `output_tokens`, `estimated_cost_usd`, and `user_id`

**Anthropic Console (no code required):**
- Go to console.anthropic.com → Usage tab
- Shows daily/monthly token and cost breakdown per model
- Limitation: no per-user or per-feature breakdown

---

### When to upgrade to a package

| Signal | Action |
|--------|--------|
| You want a cost/latency dashboard without building one | Add Helicone — one env-var change reroutes all SDK calls through their proxy |
| You want per-request prompt + response replay | Add Langfuse |
| Monthly spend > $500 and you can't explain where it goes | Add Helicone immediately — it has built-in spend alerts |
| You already use PostHog for product analytics | Track `llm_usage` events there for per-user cost breakdown |
