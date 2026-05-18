# Streaming vs Non-Streaming API Responses

Reference implementation: `app/api/generate-course/generate/route.ts`

---

## What is Streaming?

A streaming response sends data to the client **incrementally** as it becomes available, rather than waiting for the entire result before responding. In Next.js this is done with a `ReadableStream` and the `text/event-stream` content type.

Each chunk is a newline-delimited JSON object (NDJSON):

```
{"type":"progress","stage":"Starting","percent":5}
{"type":"progress","stage":"Authenticated","percent":10}
{"type":"progress","stage":"Generating course","percent":30}
{"type":"success","generatedCourse":{...},"sourceType":"text",...}
```

The client reads these chunks one at a time as they arrive.

---

## What is Non-Streaming (Normal HTTP)?

A normal HTTP response waits for all work to complete on the server, then sends a single JSON body with a standard HTTP status code.

```
HTTP/1.1 200 OK
Content-Type: application/json

{"generatedCourse":{...},"sourceType":"text",...}
```

---

## Benefits of Streaming

### 1. Progressive UI Feedback
The client receives `progress` events in real time and can render a live progress bar or stage label. Users see the request is alive immediately rather than staring at a blank screen for 30–120 seconds.

### 2. Heartbeat Keeps Mobile Connections Alive
Safari and iOS aggressively close idle HTTP connections after ~30 seconds. The streaming route sends a heartbeat every 3 seconds on those clients:

```ts
// app/api/generate-course/generate/route.ts
const heartbeatFrequency = needsAggressiveHeartbeat ? 3000 : 10000

heartbeatInterval = setInterval(() => {
  sendMessage({ type: 'heartbeat', timestamp: Date.now() })
}, heartbeatFrequency)
```

Without heartbeats, a 90-second AI call would silently drop on iPhone before returning a result.

### 3. Timeout Resilience
Vercel serverless functions have a maximum execution time (`maxDuration = 240`). The clock on the *client* side starts from the first byte received. Since the streaming route sends a `progress` chunk within the first second, the client never times out waiting for the initial response — even if AI generation takes 3+ minutes.

### 4. Graceful Partial Failure
The server can send an `error` chunk at any point in the pipeline (auth failed, rate limited, AI failed) and cleanly close the stream. Each error has a `retryable` flag the client can act on.

---

## Benefits of Non-Streaming (Normal HTTP)

### 1. Simpler Client Code
No stream reader, no chunk parsing, no state machine. Just:

```ts
const res = await fetch('/api/generate-course/generate', {
  method: 'POST',
  body: JSON.stringify(params),
})
const data = await res.json()
```

### 2. Standard HTTP Error Handling
HTTP status codes work as expected. A 401 is a 401. Middleware, proxies, and API gateways all understand status codes natively — no need to inspect a `type: 'error'` field inside a 200 body.

### 3. Works Everywhere
Any HTTP client works out of the box: `curl`, Postman, server-to-server calls, mobile SDKs. Streaming requires the client to support chunked transfer encoding and NDJSON parsing.

### 4. Caching
GET-based non-streaming responses can be cached at the CDN or browser level. Streaming responses cannot.

### 5. Easier to Test
`res.json()` in a test assertion is straightforward. Streaming responses require consuming the `ReadableStream` and assembling chunks, which adds boilerplate to every test.

---

## When to Choose Which

| Situation | Use |
|-----------|-----|
| AI operation takes > 5 seconds | Streaming |
| Mobile clients (Safari / iOS) | Streaming |
| Need a progress UI | Streaming |
| Server-to-server call | Non-streaming |
| Operation completes in < 5 seconds | Non-streaming |
| You want simple client code | Non-streaming |
| Response needs to be cached | Non-streaming |
| Writing automated tests | Non-streaming |

---

## Code Comparison

### Current: Streaming (`app/api/generate-course/generate/route.ts`)

```ts
export async function POST(request: NextRequest): Promise<Response> {
  const encoder = new TextEncoder()
  let streamController: ReadableStreamDefaultController<Uint8Array> | null = null

  const sendMessage = (msg: StreamMessage) => {
    streamController?.enqueue(encoder.encode(JSON.stringify(msg) + '\n'))
  }

  const stream = new ReadableStream<Uint8Array>({
    start(controller) { streamController = controller },
    cancel() { stopHeartbeat() },
  })

  ;(async () => {
    startHeartbeat()
    sendMessage({ type: 'progress', stage: 'Starting', percent: 5 })

    // ... auth, rate limit, user context ...

    const result = await generateCourseService(serviceParams, userContext)

    sendMessage({
      type: 'success',
      generatedCourse: result.generatedCourse,
      extractedContent: result.extractedContent,
      sourceType: result.sourceType,
      courseImageUrls: result.courseImageUrls,
      progressiveMetadata: result.progressiveMetadata,
    })
    stopHeartbeat()
    streamController?.close()
  })()

  return new Response(stream, {
    headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache' },
  })
}
```

**Client consumption:**

```ts
const res = await fetch('/api/generate-course/generate', { method: 'POST', body: JSON.stringify(params) })
const reader = res.body!.getReader()
const decoder = new TextDecoder()

while (true) {
  const { done, value } = await reader.read()
  if (done) break
  for (const line of decoder.decode(value).split('\n').filter(Boolean)) {
    const msg = JSON.parse(line)
    if (msg.type === 'progress') updateProgressBar(msg.percent)
    if (msg.type === 'success') handleSuccess(msg.generatedCourse)
    if (msg.type === 'error') handleError(msg.error)
  }
}
```

---

### Alternative: Non-Streaming (normal HTTP)

If the same endpoint were rewritten without streaming, it would look like this:

```ts
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ErrorCodes } from '@/lib/api/errors'
import { checkRateLimit, RATE_LIMITS, getIdentifier } from '@/lib/rate-limit'
import { generateCourseService } from '../generate-course.service'

export const maxDuration = 240

export async function POST(request: NextRequest) {
  // Auth
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Rate limit
  const rateLimit = await checkRateLimit(getIdentifier(user.id, request), RATE_LIMITS.generateCourse)
  if (!rateLimit.allowed) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  // Parse body
  let body
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  // Generate course (blocking — client waits the full duration)
  try {
    const result = await generateCourseService(body, userContext)
    return NextResponse.json(result)
  } catch (error) {
    return NextResponse.json({ error: 'Failed to generate course' }, { status: 500 })
  }
}
```

**Client consumption:**

```ts
const res = await fetch('/api/generate-course/generate', {
  method: 'POST',
  body: JSON.stringify(params),
})
if (!res.ok) throw new Error(await res.text())
const result = await res.json()
handleSuccess(result.generatedCourse)
```

**What you lose:** no progress updates, no heartbeats — the connection is silent for up to 120 seconds on mobile, and Safari will likely drop it before the response arrives.

---

## Summary

The streaming approach exists specifically because course generation is slow (30–120 seconds) and must work on mobile. If this endpoint were used only for server-to-server calls or the generation time dropped below ~5 seconds, the non-streaming version would be preferable for its simplicity.
