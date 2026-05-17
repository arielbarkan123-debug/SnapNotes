# Why the Walkthrough Gets Stuck on "Generating solution..."

**Symptom:** Clicking the "Get step-by-step walkthrough" CTA opens the walkthrough skeleton and displays "Generating solution..." indefinitely. The UI never transitions to the ready state.

**Affected route:** `POST /api/homework/sessions/[sessionId]/walkthrough`
**Affected hook:** `components/homework/walkthrough/useWalkthrough.ts`

---

## Root Cause 1 — Text-only walkthroughs never sent a `complete` event (PRIMARY)

### What happened

The walkthrough stream sends three main events in sequence:

1. `session_created` — DB record inserted
2. `solution_ready` — AI response parsed, solution text available
3. `complete` — all images compiled (or text-only: nothing left to do)

Step 4 in the route (TikZ compilation + `complete` send) was gated behind `if (!isTextOnly)`. For any question classified as text-only — algebra, combinatorics, proofs — the server sent `solution_ready` and then **closed the stream without sending `complete`**.

```
// BEFORE (broken for text-only):
send({ type: 'solution_ready', ... })
if (!isTextOnly) {
  // ... compile TikZ ...
  send({ type: 'complete', ... })   ← NEVER REACHED for text-only
}
// stream closes here silently
```

### Why the client got stuck

The client hook (`useWalkthrough.ts`) transitions state like this on `solution_ready`:

```typescript
if (event.solution.mode === 'text-only') {
  setState('ready')   // ✓ correct path — would clear the skeleton
} else {
  setState('compiling')  // ← waits for step images + complete event
}
```

For a pure combinatorics question, the AI correctly sets `mode: 'text-only'`, so the hook *should* reach `ready`. But there is a second path to text-only:

```typescript
// route.ts line 158
const isTextOnly = solution.mode === 'text-only'
               || !solution.tikzCode
               || !solution.tikzCode.includes('\\begin{tikzpicture}')
```

The route treats empty/invalid tikzCode as text-only even if the AI set `mode: 'diagram'`. In that case the client sees `mode: 'diagram'` in `solution_ready`, transitions to `'compiling'`, and waits forever for images and a `complete` event that never arrive.

### Fix applied

After `solution_ready`, send `complete` immediately for text-only walkthroughs and return:

```typescript
if (isTextOnly) {
  send({ type: 'complete', stepsRendered: solution.steps.length, totalSteps: solution.steps.length })
  return
}
```

---

## Root Cause 2 — Stale `generating` records blocked clean retries

### What happened

When a generation request fails mid-stream (Claude API timeout, Vercel function timeout, server crash), the DB record remains at `generation_status = 'generating'`. The cache check at the top of the route only handled `'complete'` and `'partial'`:

```typescript
// BEFORE (missed 'generating' and 'failed'):
if (existing && (existing.generation_status === 'complete' || existing.generation_status === 'partial')) {
  // return cached or delete stale
}
// Anything else (including 'generating') fell through silently
```

The fallthrough created a **second** `generation_status = 'generating'` record. Repeated retries accumulated orphaned records. Each request started a fresh Claude call that might fail the same way, leaving more stale records.

### Fix applied

Extended the check to also delete `'generating'` and `'failed'` records before attempting a new generation:

```typescript
} else if (status === 'generating' || status === 'failed') {
  // Delete stale record — fall through to generate fresh
  await serviceClient.from('walkthrough_sessions').delete().eq('id', existing.id)
}
```

---

## Root Cause 3 — No terminal event guarantee (latent / defence-in-depth)

The stream contract for a streaming API should always end with either `complete` or `error`. The text-only path broke this contract. Fix 1 above restores the guarantee. The existing 120-second client-side timeout in `useWalkthrough.ts` acts as a backstop for any future case where a terminal event is missed.

---

## Files Changed

| File | Change |
|------|--------|
| `app/api/homework/sessions/[sessionId]/walkthrough/route.ts` | Send `complete` after text-only `solution_ready`; delete stale `generating`/`failed` records |

## What to Watch For

- If adding a new walkthrough mode (not `text-only`, not `diagram`), ensure it always sends a terminal event (`complete` or `error`) before returning from the `start()` function.
- The `isTextOnly` check in the route has two sources of truth: the AI-returned `mode` field and an empty `tikzCode`. Keep these in sync — ideally let the AI's `mode` field be the single source of truth.
- Never add early `return` inside the `start(controller)` async function without first sending a terminal event. The `finally` block closes the controller but does not send any event.
