# Document Upload & Storage

> How SnapNotes ingests, extracts, stores, and uses uploaded documents.

---

## Supported File Types

| Surface | Accepted types |
|---------|---------------|
| Upload modal (`helpers.validateFile`) | JPEG, PNG, WebP, HEIC, PDF, PPTX/PPT, DOCX/DOC |
| `/api/upload` | JPEG, PNG, PDF |
| `/api/upload-document` | PDF, PPTX, DOCX |
| `/api/upload-images` | JPEG, PNG, WebP, HEIC/HEIF, GIF, PDF, DOCX/DOC |
| `uploadFileToStorage` (client direct-upload) | PPTX, DOCX, images only — **PDF intentionally excluded** |

> **Known gap:** `processPDF` in `lib/documents/pdf.ts` is a stub that throws "PDF text extraction is not yet supported." The PDF flow is inconsistent across layers until this is implemented.

---

## Upload Flow (End-to-End)

### Images
```
User selects image(s)
  → lib/upload/direct-upload.ts :: uploadImagesToStorage()
  → Supabase Storage bucket: notebook-images
    path: {userId}/{courseId}/page-{i}.{ext}
  → Signed URLs returned to UI
  → POST /api/generate-course  (imageUrls in body)
```

### PPTX / DOCX
```
User selects document
  → lib/upload/direct-upload.ts :: uploadFileToStorage()
  → Supabase Storage bucket: documents
    path: {userId}/{timestamp}-{random}-{safeName}
  → POST /api/process-document
      → lib/documents/index.ts :: processDocument()
          PPTX → lib/documents/pptx.ts
          DOCX → lib/documents/docx.ts
      → lib/images/upload.ts :: uploadExtractedImages()   (embedded images → notebook-images)
      → Returns ExtractedDocument { sections, content, metadata, images? }
  → Client stashes JSON in sessionStorage (key: doc_*)
  → Navigate to /processing?documentId=...&documentUrl=...&sourceType=...
  → POST /api/generate-course
      ├─ sends documentContent directly (if under ~4.5 MB Vercel limit)
      └─ or sends documentStoragePath + documentFileName for server-side re-download
```

---

## What Gets Persisted (Database)

All written to the `courses` table:

| Column | What it holds |
|--------|--------------|
| `extracted_content` | Raw text snapshot from OCR / document parse / vision |
| `generated_course` | JSONB lesson structure (titles, steps, questions, etc.) |
| `document_url` | Supabase Storage path for the original PPTX/DOCX/PDF |
| `original_image_url` / `image_urls` | Single or multi-page image paths |
| `source_type` | `'image' \| 'pdf' \| 'pptx' \| 'docx' \| 'text'` |
| `generation_status` | `'processing' \| 'partial' \| 'generating' \| 'complete' \| 'failed'` |
| `extraction_confidence` | 0–1 score from `lib/extraction/confidence-scorer.ts` |
| `lesson_outline` | Streamed partial structure written before full generation |

---

## Storage Buckets Summary

| Bucket | Contents |
|--------|----------|
| `notebook-images` | Page photos, multi-image courses, images extracted from documents |
| `documents` | Original PPTX / DOCX / PDF binary files |

---

## Does SnapNotes Use RAG?

**No.** There is no Retrieval-Augmented Generation pipeline.

The app does **not** use:
- Vector embeddings
- `pgvector` or any similarity-search SQL
- Chunking / indexing of document text

Instead, the **full extracted text** is passed directly into the Claude prompt at course-generation time. This works well for typical student documents (a few pages of notes or slides) but would not scale to large corpora.

---

## Should SnapNotes Add RAG?

### Verdict: Not yet — but the foundation is already there

Because `courses.extracted_content` is already stored in Supabase after every upload, the hardest part of a RAG pipeline (getting text into a database) is done. Adding RAG would mean enabling the `pgvector` extension in the existing Supabase project and embedding that already-stored text — no new infrastructure required.

Whether it's worth doing depends on how documents grow.

---

### Current approach ("full-context stuffing")

Every time a user asks a question or generates a lesson, the entire `extracted_content` string is injected into the Claude prompt.

**This is fine when:**
- Documents are short (< ~50 pages / ~80 k tokens)
- The user only has a handful of courses
- Generation is one-shot (upload → generate course → done)

**This breaks when:**
- A document is a 300-page textbook — it won't fit in one prompt
- A user wants to *chat* about a document across many sessions without regenerating
- You want to search *across multiple uploaded documents* at once

---

### Pros of adding RAG

| Benefit | Detail |
|---------|--------|
| **Handles large documents** | Chunk a 300-page PDF; only the relevant chunks are sent to Claude per query |
| **Cheaper per query** | Smaller context window = fewer tokens = lower Anthropic bill |
| **Cross-document search** | "Find all my notes about derivatives" works across every uploaded course |
| **Faster responses** | Less text to process means lower latency |
| **Stays in Supabase** | `pgvector` is a Postgres extension — no new service, no extra cost tier |
| **Reuses existing content** | `extracted_content` is already stored; just embed it once on upload |

---

### Cons / trade-offs

| Trade-off | Detail |
|-----------|--------|
| **Retrieval can miss context** | Chunking splits text; a chunk boundary can cut a concept in half, causing Claude to give incomplete answers |
| **Added complexity** | Need a chunking strategy, an embedding model call on upload, and a similarity-search query on every generation |
| **Embedding cost** | Each document upload calls an embedding API (e.g. OpenAI `text-embedding-3-small` ≈ $0.00002/1k tokens — negligible but non-zero) |
| **Index maintenance** | If `extracted_content` is ever re-extracted (e.g. after a re-upload), embeddings must be regenerated |
| **Overkill for current use case** | Most student uploads are short notes/slides; RAG adds complexity for a problem that doesn't exist yet |

---

### Recommended implementation path (if needed)

1. **Enable `pgvector`** on the existing Supabase project (one SQL command, no cost change).
2. **Add a `document_chunks` table** with `(course_id, chunk_index, content, embedding vector(1536))`.
3. **On upload**, after `processDocument()` succeeds, chunk `extracted_content` (e.g. 512-token sliding window) and call `text-embedding-3-small` → store rows.
4. **On generation/chat**, embed the user's query → `SELECT ... ORDER BY embedding <=> query_embedding LIMIT 5` → inject top chunks into Claude prompt instead of full text.
5. **Keep the current full-context path as a fallback** for short documents where stuffing is fine.

This stays entirely inside Supabase — no Pinecone, no Weaviate, no new vendor.

---

## Is There a Vector Database?

**No — only Supabase (PostgreSQL) is used for data storage.**

Checked and confirmed absent:

- No `pgvector` extension usage
- No Pinecone, Weaviate, Qdrant, or Chroma clients in `package.json`
- No embedding API calls (`text-embedding-*`, etc.)
- No vector-DB environment variables in `.env.example`

Rate limiting uses Redis (Upstash), which is the only non-Supabase data store.

---

## Extraction Confidence Scoring

After extraction, `lib/extraction/confidence-scorer.ts :: scoreExtraction()` assigns a 0–1 score and writes it to `courses.extraction_confidence`. The method label depends on source:

| Source | Method label |
|--------|-------------|
| Image upload | `'vision'` (Claude vision API) |
| PPTX / DOCX | `'pdf_parse'` |
| Plain text input | `'ocr'` |

---

## Key Files

```
lib/
  upload/direct-upload.ts        — uploadImagesToStorage, uploadFileToStorage
  documents/index.ts             — processDocument dispatcher
  documents/pptx.ts              — PPTX text/image extraction
  documents/docx.ts              — DOCX text/image extraction
  documents/pdf.ts               — stub (not yet implemented)
  images/upload.ts               — uploadExtractedImages
  extraction/confidence-scorer.ts — scoreExtraction
  ai/claude.ts                   — generateCourseFromImage, generateCourseFromMultipleImagesProgressive

app/api/
  upload/route.ts                — single image/PDF → notebook-images
  upload-document/route.ts       — document → extract + store → documents bucket
  upload-images/route.ts         — multi-image → notebook-images
  process-document/route.ts      — server-side extraction (called after direct upload)
  generate-course/route.ts       — main course generation (writes courses row)
```
