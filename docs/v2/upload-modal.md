# Upload Modal

> How the `UploadModal` component works — its input modes, state, component composition, submission flows, and where the LLM is called.
>
> For the server-side extraction and storage layer, see [`document-upload-and-storage.md`](./document-upload-and-storage.md).

---

## What It Does

`UploadModal` is the single entry point for all content ingestion. It lets a user:

- **Create a new course** from images, a document (PDF / PPTX / DOCX), pasted text, or a YouTube URL.
- **Add material to an existing course** (`mode="addToCourse"`) — same sources except YouTube.

It is a controlled, full-screen modal (mobile: slides up from bottom; desktop: centered dialog). All state lives inside the component; nothing is shared via context.

---

## Props

```typescript
interface UploadModalProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'create' | 'addToCourse'   // default: 'create'
  courseId?: string                  // required when mode === 'addToCourse'
  courseTitle?: string               // shown in the modal header
  onMaterialAdded?: (result: {
    newLessonsCount: number
    totalLessons: number
    cardsGenerated: number
  }) => void
}
```

---

## Component Tree

```
UploadModal  (orchestrator — UploadModal.tsx)
├── IntensityModeSelector   quick / standard / deep_practice
│                           hidden when mode === 'addToCourse'
├── [inputMode === 'files', no files selected]
│   └── DropZone            drag-and-drop landing zone
├── [inputMode === 'files', files selected]
│   └── FilePreviewGrid     thumbnail grid; supports remove, reorder, add more
├── [inputMode === 'text']
│   └── TextInputArea       textarea + optional title field
├── [inputMode === 'youtube']
│   └── (inline JSX)        URL input + SSE progress indicator
├── ErrorDisplay            error banner with optional Retry button
└── UploadProgressOverlay   full-overlay spinner shown while isUploading
```

Sub-components all live in `components/upload/upload-modal/`.

---

## Input Modes (tabs)

| Tab | `inputMode` value | Available in | What gets submitted |
|-----|------------------|-------------|---------------------|
| Upload Files | `'files'` | both modes | image signed-URLs or extracted document content |
| Enter Text | `'text'` | both modes | raw text string |
| YouTube | `'youtube'` | `create` only | YouTube URL (SSE stream) |

Switching tabs clears the current error. The YouTube tab is conditionally rendered:

```tsx
{!isAddMode && (
  <button onClick={() => setInputMode('youtube')} ...>
    YouTube
  </button>
)}
```

---

## Key State Variables

| Variable | Type | Purpose |
|----------|------|---------|
| `inputMode` | `'files' \| 'text' \| 'youtube'` | Active tab |
| `selectedFiles` | `SelectedFile[]` | Validated files with Object URL previews |
| `textContent` | `string` | Free-text input |
| `supplementaryText` | `string` | Optional study notes (files mode only) |
| `title` | `string` | Optional course title override |
| `intensityMode` | `LessonIntensityMode` | Lesson depth preference |
| `isUploading` | `boolean` | Locks the entire UI during submission |
| `uploadProgress` | `UploadProgress \| null` | Drives the progress overlay |
| `error` | `UploadError \| null` | Surfaced to `<ErrorDisplay>` |
| `failedFiles` | `UploadFileError[]` | Per-file upload errors |
| `youtubeUrl` | `string` | YouTube input value |
| `youtubeProgress` | `string \| null` | Human-readable SSE progress label |

All state is reset when `isOpen` transitions to `false` (modal close effect), including revoking Object URLs to prevent memory leaks.

---

## File Validation (Client-Side)

`helpers.validateFile(file)` runs synchronously before any file is added to `selectedFiles`:

1. Detect category via MIME type (`ACCEPTED_TYPES` map), falling back to file extension.
2. Reject unknown types → `INVALID_FILE_TYPE` error.
3. Check size against `MAX_FILE_SIZES`:
   - Images: **10 MB**
   - PDF / PPTX / DOCX: **20 MB**
4. Enforce **max 10 files** total (`MAX_FILES`).

Image files get an Object URL (`URL.createObjectURL`) for thumbnail previews. HEIC images may skip the preview on iOS Safari (caught and swallowed).

---

## Submission Flows

`handleSubmit()` dispatches to one of five sub-flows based on `inputMode` and file category.

### 1. Images → New Course

```
handleSubmit()
  → fetch /api/auth/me                       — get userId
  → uploadImagesToStorage(files, userId, courseId)
      lib/upload/direct-upload.ts
      → Supabase Storage: notebook-images/{userId}/{courseId}/page-{i}.{ext}
  → POST /api/sign-image-urls                — exchange storage paths for signed URLs
  → window.location.href = /processing
      ?imageUrls=[...]
      &courseId=...
      &title=...
      &intensityMode=...
  ── /processing page triggers POST /api/generate-course ──▶ LLM (see below)
```

### 2. Documents (PDF / PPTX / DOCX) → New Course

```
handleSubmit()
  → validateDirectUpload(file)               — local sanity check
  → fetch /api/auth/me                       — get userId
  → uploadFileToStorage(file, userId)
      lib/upload/direct-upload.ts
      → Supabase Storage: documents/{userId}/{timestamp}-{random}-{name}
  → POST /api/process-document               — server extracts text/images (no LLM here)
      → returns { extractedContent, storagePath, documentType }
  → sessionStorage.setItem('doc_*', JSON.stringify(content))
  → window.location.href = /processing
      ?documentId=doc_*
      &documentUrl=...
      &sourceType=pdf|pptx|docx
      &title=...
      &intensityMode=...
  ── /processing page triggers POST /api/generate-course ──▶ LLM (see below)
```

> `window.location.href` (full-page navigation) is intentional — it forces a fresh bundle fetch, avoiding stale cached JS that could re-introduce the inline-content 413 bug.

### 3. Text → New Course

```
handleSubmit()
  → validate: textContent.length >= 20
  → window.location.href = /processing
      ?textContent=...
      &sourceType=text
      &title=...
      &intensityMode=...
  ── /processing page triggers POST /api/generate-course ──▶ LLM (see below)
```

### 4. YouTube → New Course

```
handleYouTubeSubmit()
  → regex-validate URL (youtube.com/watch, /embed/, /shorts/, youtu.be)
  → POST /api/courses/from-youtube           — starts SSE stream
      → extractYouTubeTranscript()           — pulls transcript
      → generateCourseFromVideo()  ──────────▶ LLM (see below)
  → read SSE lines:
      event: progress → update youtubeProgress label
      event: complete → capture courseId
      event: error    → surface UploadError
  → window.location.href = /processing?courseId=...
```

Bot-detection errors from YouTube get a special two-line translated message (`botDetection` + `botDetectionTip`).

### 5. Add Material to Existing Course (all non-YouTube sources)

All file-type flows and the text flow call `submitAddMaterial()` instead of navigating:

```
submitAddMaterial({ imageUrls | documentContent | textContent, title?, supplementaryText? })
  → PATCH /api/courses/{courseId}
  → onMaterialAdded({ newLessonsCount, totalLessons, cardsGenerated })
  → onClose()
```

---

## API Routes Called by the Modal

| Call | Method | When |
|------|--------|------|
| `/api/auth/me` | GET | Before image or document upload, to get `userId` |
| `/api/sign-image-urls` | POST | After images are uploaded, to exchange storage paths for signed URLs |
| `/api/process-document` | POST | After document upload, to extract text and embedded images server-side |
| `/api/courses/from-youtube` | POST | YouTube mode — opens an SSE stream |
| `/api/courses/{courseId}` | PATCH | `addToCourse` mode — adds material to existing course |
| `/processing` (navigation) | — | `create` mode — full-page redirect; the processing page calls `/api/generate-course` |

`/api/process-document` does **not** call the LLM — it only parses the file and returns extracted text. The LLM call happens later, in `/api/generate-course`.

---

## Where the LLM Is Called

> **All Anthropic SDK calls live in `lib/ai/claude.ts`.**
> Model: `claude-sonnet-4-6` (env: `ANTHROPIC_MODEL`, default set at `claude.ts:41`).
> All calls use `client.messages.stream()` except YouTube, which uses `client.messages.create()`.

### Full call chain per source type

#### Images (single)

```
/api/generate-course/route.ts
  → generateCourseFromImage()            claude.ts:1145
      → analyzeNotebookImage()           claude.ts:868
          client.messages.stream()  ◀──── LLM CALL #1  claude.ts:871
          max_tokens: 4096
          purpose: extract text/structure from the image
      → generateStudyCourse()            claude.ts:1031 (approx)
          client.messages.stream()  ◀──── LLM CALL #2  claude.ts:1031
          max_tokens: 16384
          purpose: generate full course JSON from extracted content
```

#### Images (2 or more)

```
/api/generate-course/route.ts
  → generateCourseFromMultipleImagesProgressive()   claude.ts:1691
      → analyzeMultipleNotebookImages()             (batches of 5)
          client.messages.stream()  ◀──── LLM CALL #1  claude.ts:1404
          max_tokens: 8192 (per batch)
          purpose: extract content from each image batch
      → generateInitialCourse()                     claude.ts:2215
          client.messages.stream()  ◀──── LLM CALL #2  claude.ts:2239
          max_tokens: 16384
          purpose: generate first 2 lessons + full outline (fast, ~30s)
      → /api/generate-course/continue (background)
          → generateContinuationLessons()           claude.ts:2368
              client.messages.stream()  ◀─ LLM CALL #3  claude.ts:2390
              max_tokens: 8192
              purpose: generate remaining lessons in background
```

#### Documents (PDF / PPTX / DOCX)

```
/api/process-document/route.ts
  → processDocument()     ← lib/documents/index.ts  (NO LLM — pure parsing)

/api/generate-course/route.ts  (called by /processing page)
  → generateInitialCourse()                         claude.ts:2215
      client.messages.stream()  ◀──── LLM CALL #1  claude.ts:2239
      max_tokens: 16384
      input: extracted document sections
      purpose: generate first 2 lessons + outline
  → /api/generate-course/continue (background)
      → generateContinuationLessons()               claude.ts:2368
          client.messages.stream()  ◀─ LLM CALL #2  claude.ts:2390
          max_tokens: 8192
          purpose: remaining lessons
```

#### Text

```
/api/generate-course/route.ts
  → generateCourseFromText()                        claude.ts:1903
      client.messages.stream()  ◀──── LLM CALL     claude.ts:1945
      max_tokens: 16384
      input: raw text from user
      purpose: generate full course JSON
```

#### YouTube

```
/api/courses/from-youtube/route.ts
  → extractYouTubeTranscript()   lib/youtube/transcript.ts
  → generateCourseFromVideo()    lib/youtube/course-from-video.ts
      client.messages.create()  ◀──── LLM CALL     course-from-video.ts:103
      max_tokens: 8000
      purpose: generate course JSON from transcript
      note: non-streaming (.create, not .stream)
```

### Retry and streaming

All `.stream()` calls are wrapped by `withStreamRetry()` (`claude.ts:207`) — 3 attempts with exponential backoff. This guards against transient iOS/Safari connection drops mid-stream.

### Prompt personalisation

Prompts are built in `lib/ai/prompts.ts` and vary per:
- Age group and education level (vocabulary, abstraction depth)
- Curriculum system (US, UK, IB, Israeli Bagrut, AP)
- Study goal (exam prep, general learning, skill improvement)
- Intensity mode (quick: 10–15 min, standard: 20–30 min, deep_practice: 45–60 min)
- Language (English or Hebrew)

Key prompt builders: `getImageAnalysisPrompt`, `getCourseGenerationPrompt`, `getDocumentCoursePrompt`, `getTextCoursePrompt`, `getInitialCoursePrompt`, `getContinuationPrompt`.

### Token budget summary

| Stage | `max_tokens` |
|-------|-------------|
| Image extraction (per batch) | 4096 – 8192 |
| Initial course / full course generation | 16384 |
| Continuation lessons | 8192 |
| YouTube course | 8000 |

---

## Analytics Funnel

`useFunnelTracking('course_creation')` tracks four steps:

| Step | Event | Trigger |
|------|-------|---------|
| 1 | `upload_click` | Modal opens |
| 2 | `file_selected` | Files pass validation |
| 3 | `upload_started` | Submit pressed |
| 4 | `processing` | Files/text handed off to /processing |

The funnel is reset (`resetFunnel()`) when the modal closes.

---

## UX Details

- **Escape key** closes the modal unless `isUploading` is true.
- **Click-outside** on the backdrop also closes (same guard).
- `document.body.style.overflow = 'hidden'` is set while open to prevent background scroll.
- The submit button is disabled if: no files selected / text < 20 chars / YouTube URL empty / `isUploading`.
- Loading text on the submit button changes dynamically based on `uploadProgress.status` and `inputMode`.

---

## Key Files

```
components/upload/upload-modal/
  UploadModal.tsx           — orchestrator (this document)
  IntensityModeSelector.tsx — quick / standard / deep_practice picker
  DropZone.tsx              — empty-state drag-and-drop target
  FilePreviewGrid.tsx       — file thumbnail grid with reorder/remove
  TextInputArea.tsx         — textarea + title field
  UploadProgressOverlay.tsx — full-panel uploading/processing/complete overlay
  ErrorDisplay.tsx          — error banner with optional retry
  types.ts                  — all types and constants (ACCEPTED_TYPES, MAX_FILES, etc.)
  helpers.ts                — validateFile, getErrorMessage, formatFileSize, generateFileId
  index.ts                  — re-exports UploadModal

lib/upload/
  direct-upload.ts          — uploadImagesToStorage, uploadFileToStorage, generateCourseId

lib/ai/
  claude.ts                 — ALL Anthropic SDK calls (see line refs above)
  prompts.ts                — all prompt builders
  index.ts                  — AI module exports

lib/youtube/
  course-from-video.ts      — generateCourseFromVideo() — YouTube LLM call

app/api/
  auth/me/route.ts                — returns { userId }
  sign-image-urls/route.ts        — exchanges storage paths for signed URLs
  process-document/route.ts       — document extraction (no LLM)
  generate-course/route.ts        — main course generation → LLM
  generate-course/continue/       — background continuation lessons → LLM
  courses/from-youtube/route.ts   — YouTube SSE pipeline → LLM
  courses/[id]/route.ts           — PATCH for addToCourse mode
```
