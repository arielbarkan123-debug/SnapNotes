# Turnitin Clone Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a personal-use Turnitin clone with AI text detection (3-engine ensemble) + plagiarism detection (Winnowing + web search) + Turnitin-style interactive report UI.

**Architecture:** Python FastAPI backend runs DeBERTa-v3-large locally + calls GPTZero and Pangram APIs. Custom Winnowing implementation for plagiarism detection via web search. Next.js 14 frontend renders a Turnitin-style interactive report with color-coded highlights, source panel, and filter controls. In-memory job queue for async processing.

**Tech Stack:** Python 3.11+ / FastAPI / PyTorch / HuggingFace Transformers / spaCy / httpx / Next.js 14 / TypeScript / Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-03-17-turnitin-clone-design.md`

**Project location:** `~/turnitin-clone/` (standalone, NOT inside NoteSnap)

---

## Chunk 1: Project Scaffolding + Core Types + Preprocessing

### Task 1: Initialize Backend Project

**Files:**
- Create: `~/turnitin-clone/backend/app/__init__.py`
- Create: `~/turnitin-clone/backend/app/main.py`
- Create: `~/turnitin-clone/backend/requirements.txt`
- Create: `~/turnitin-clone/backend/app/models/__init__.py`
- Create: `~/turnitin-clone/backend/app/models/types.py`
- Create: `~/turnitin-clone/backend/app/models/schemas.py`

- [ ] **Step 1: Create project directory structure**

```bash
mkdir -p ~/turnitin-clone/backend/app/{api,detection/engines,plagiarism,manipulation,documents,preprocessing,models}
mkdir -p ~/turnitin-clone/backend/tests
mkdir -p ~/turnitin-clone/scripts
touch ~/turnitin-clone/backend/app/__init__.py
touch ~/turnitin-clone/backend/app/api/__init__.py
touch ~/turnitin-clone/backend/app/detection/__init__.py
touch ~/turnitin-clone/backend/app/detection/engines/__init__.py
touch ~/turnitin-clone/backend/app/plagiarism/__init__.py
touch ~/turnitin-clone/backend/app/manipulation/__init__.py
touch ~/turnitin-clone/backend/app/documents/__init__.py
touch ~/turnitin-clone/backend/app/preprocessing/__init__.py
touch ~/turnitin-clone/backend/app/models/__init__.py
touch ~/turnitin-clone/backend/tests/__init__.py
```

- [ ] **Step 2: Write requirements.txt**

Write `~/turnitin-clone/backend/requirements.txt`:
```
fastapi==0.115.6
uvicorn[standard]==0.34.0
python-multipart==0.0.18
httpx==0.28.1
torch==2.5.1
transformers==4.47.1
spacy==3.8.4
pypdf==5.1.0
python-docx==1.1.2
python-pptx==1.0.2
beautifulsoup4==4.12.3
scikit-learn==1.6.1
pydantic==2.10.4
pytest==8.3.4
pytest-asyncio==0.25.0
```

- [ ] **Step 3: Write core type definitions**

Write `~/turnitin-clone/backend/app/models/types.py` with all dataclass types: `JobStatus`, `ProcessingStage`, `MatchGroupType`, `FlagType` enums, plus `Sentence`, `SentenceScore`, `SlidingWindow`, `Source`, `Match`, `MatchGroup`, `Flag`, `AIDetectionResult`, `SimilarityResult`, `DocumentInfo`, `CheckReport`, `JobState` dataclasses. See spec Section 10.2 for field definitions.

- [ ] **Step 4: Write Pydantic request/response schemas**

Write `~/turnitin-clone/backend/app/models/schemas.py` with Pydantic models: `CheckTextRequest`, `JobCreatedResponse`, `JobStatusResponse`, `ReportResponse` and nested models matching the types.

- [ ] **Step 5: Write minimal FastAPI app with health check**

Write `~/turnitin-clone/backend/app/main.py`:
- FastAPI app with CORS middleware (allow `http://localhost:3000`)
- GET `/health` endpoint returning `{"status": "ok"}`

- [ ] **Step 6: Verify backend starts**

```bash
cd ~/turnitin-clone/backend
pip install -r requirements.txt
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
# Visit http://localhost:8000/health -> {"status":"ok"}
```

- [ ] **Step 7: Initialize git repo and commit**

```bash
cd ~/turnitin-clone
git init
echo '__pycache__/\n*.pyc\n.venv/\nnode_modules/\n.next/\n.env\n.env.local' > .gitignore
git add -A
git commit -m "feat: initialize backend project with FastAPI, core types, and schemas"
```

---

### Task 2: Text Preprocessing -- Normalizer + Sentence Segmenter

**Files:**
- Create: `backend/app/preprocessing/normalizer.py`
- Create: `backend/app/preprocessing/segmenter.py`
- Create: `backend/tests/test_preprocessing.py`

- [ ] **Step 1: Write failing tests for normalizer and segmenter**

Tests should cover:
- `normalize_text` strips zero-width chars (U+200B, U+200C, U+200D, U+FEFF)
- `normalize_text` applies Unicode NFC normalization
- `normalize_text` collapses whitespace (tabs, newlines, multi-spaces to single space)
- `normalize_text` returns word count
- `segment_sentences` splits text into `Sentence` objects with correct offsets
- Sentence offsets map back to original text correctly

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_preprocessing.py -v
```

- [ ] **Step 3: Implement normalizer**

`normalizer.py`: Define `ZERO_WIDTH_CHARS` set, compile regex pattern, implement `normalize_text(text) -> NormalizedText` dataclass with `text`, `word_count`, `removed_chars` fields.

- [ ] **Step 4: Implement sentence segmenter**

```bash
python -m spacy download en_core_web_sm
```

`segmenter.py`: Lazy-load spaCy `en_core_web_sm`, implement `segment_sentences(text) -> list[Sentence]` using spaCy's sentence boundary detection. Each `Sentence` has `text`, `start` (char offset), `end` (char offset), `index`.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_preprocessing.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/preprocessing/ backend/tests/test_preprocessing.py
git commit -m "feat: add text normalizer and spaCy sentence segmenter"
```

---

### Task 3: Manipulation Detection -- Hidden Characters + Homoglyphs

**Files:**
- Create: `backend/app/manipulation/homoglyphs.py`
- Create: `backend/app/manipulation/flags.py`
- Create: `backend/tests/test_manipulation.py`

- [ ] **Step 1: Write failing tests**

Tests should cover:
- Detect zero-width space between words, report position
- Detect Cyrillic homoglyph (e.g., U+043E replacing Latin 'o'), report position
- `swap_homoglyphs` replaces Cyrillic 'a' (U+0430) with Latin 'a'
- Clean text produces no flags
- Text under 500 characters skips flag analysis (returns empty)

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_manipulation.py -v
```

- [ ] **Step 3: Implement homoglyph mapping table**

`homoglyphs.py`: Dict mapping ~40 Cyrillic and Greek lookalike Unicode characters to their Latin equivalents. Cover: Cyrillic A/a, B/v, C/c, E/e, H/h, K/k, M/m, O/o, P/p, T/t, X/x, y; Greek A/a, B, E/e, H, I/i, K/k, M, N, O/o, P/p, T/t, Y, X, Z.

- [ ] **Step 4: Implement flag detection**

`flags.py`: `detect_flags(text) -> list[Flag]` scans for hidden chars and homoglyphs. Returns empty if text < 500 chars. `swap_homoglyphs(text) -> str` replaces all homoglyphs with Latin equivalents.

- [ ] **Step 5: Run tests to verify they pass**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_manipulation.py -v
```

- [ ] **Step 6: Commit**

```bash
git add backend/app/manipulation/ backend/tests/test_manipulation.py
git commit -m "feat: add hidden character and homoglyph detection"
```

---

### Task 4: Document Parsing -- PDF, DOCX, PPTX

**Files:**
- Create: `backend/app/documents/pdf.py`
- Create: `backend/app/documents/docx.py`
- Create: `backend/app/documents/pptx.py`
- Create: `backend/app/documents/parser.py`
- Create: `backend/tests/test_documents.py`

- [ ] **Step 1: Write failing tests**

Tests: extract from plain string, extract from .txt bytes, reject empty text.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement document parsers**

- `pdf.py`: `extract_pdf_text(file_bytes) -> str` using `pypdf.PdfReader`
- `docx.py`: `extract_docx_text(file_bytes) -> str` using `docx.Document`
- `pptx.py`: `extract_pptx_text(file_bytes) -> str` using `pptx.Presentation`
- `parser.py`: `extract_text(text?, file_bytes?, filename?) -> str` routes to correct parser by extension

- [ ] **Step 4: Run tests**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_documents.py -v
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/documents/ backend/tests/test_documents.py
git commit -m "feat: add PDF, DOCX, PPTX document text extraction"
```

---

## Chunk 2: AI Detection Pipeline

### Task 5: Sliding Window Creation

**Files:**
- Create: `backend/app/detection/sliding_window.py`
- Create: `backend/tests/test_sliding_window.py`

- [ ] **Step 1: Write failing tests**

Tests:
- `create_windows` produces windows from 20 sentences (15 words each)
- Windows stride by 1 sentence (consecutive windows differ by 1 sentence)
- `aggregate_window_scores` computes weighted average per sentence
- Windows skip creation if < 50 words

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement sliding window**

`sliding_window.py`:
- `create_windows(sentences, target_words=250) -> list[SlidingWindow]`: For each start sentence, expand window until target_words reached. Skip windows < 50 words.
- `aggregate_window_scores(sentences, windows, scores) -> list[float]`: For each sentence, average scores of all containing windows.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/app/detection/sliding_window.py backend/tests/test_sliding_window.py
git commit -m "feat: add sliding window creation with 1-sentence stride"
```

---

### Task 6: DeBERTa Local Engine

**Files:**
- Create: `backend/app/detection/engines/deberta.py`
- Create: `backend/tests/test_deberta.py`

- [ ] **Step 1: Write failing test**

Tests: engine loads, `score_text` returns float 0-1 for AI-like text, `score_text` returns float for any text.

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement DeBERTa engine**

`deberta.py`: Load `desklib/ai-text-detector-v1.01` from HuggingFace. Custom `PreTrainedModel` subclass with mean-pooling + linear classifier head. `score_text(text) -> float` tokenizes (max_length=768), runs inference, applies sigmoid. `score_windows(texts) -> list[float]` scores each text.

NOTE: The model uses a custom architecture (not standard AutoModelForSequenceClassification). Must define a `_DesklibModel(PreTrainedModel)` class that:
1. Loads base model via `AutoModel.from_config`
2. Adds `nn.Linear(hidden_size, 1)` classifier
3. Forward: mean-pool last hidden state with attention mask, pass through classifier
4. Output: raw logits (apply sigmoid externally)

- [ ] **Step 4: Run tests (first run downloads ~1.5 GB model)**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_deberta.py -v --timeout=300
```

- [ ] **Step 5: Commit**

```bash
git add backend/app/detection/engines/deberta.py backend/tests/test_deberta.py
git commit -m "feat: add DeBERTa-v3-large AI detection engine"
```

---

### Task 7: GPTZero + Pangram API Clients

**Files:**
- Create: `backend/app/detection/engines/gptzero.py`
- Create: `backend/app/detection/engines/pangram.py`
- Create: `backend/tests/test_api_engines.py`

- [ ] **Step 1: Write tests (mock-based)**

Tests (using `unittest.mock.AsyncMock`):
- GPTZero: parses response with `documents[0].sentences[].generated_prob`
- GPTZero: returns None on API failure
- Pangram: parses response with `sentences[].score` and `sentences[].is_ai_paraphrased`

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement GPTZero client**

`gptzero.py`: `GPTZeroEngine(api_key)` with `analyze(text) -> GPTZeroResult | None`. POST to `https://api.gptzero.me/v2/predict/text` with `{"document": text}` and `x-api-key` header. Parse `documents[0].average_generated_prob`, `sentences[].generated_prob`, `overall_burstiness`. Return None on any error.

- [ ] **Step 4: Implement Pangram client**

`pangram.py`: `PangramEngine(api_key)` with `analyze(text) -> PangramResult | None`. POST to Pangram API with Bearer auth. Parse `score`, `sentences[].score`, `sentences[].is_ai_paraphrased`. Return None on error.

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Commit**

```bash
git add backend/app/detection/engines/ backend/tests/test_api_engines.py
git commit -m "feat: add GPTZero and Pangram Labs API clients"
```

---

### Task 8: Ensemble Aggregation + AI Detector Orchestrator

**Files:**
- Create: `backend/app/detection/ensemble.py`
- Create: `backend/app/detection/ai_detector.py`
- Create: `backend/tests/test_ensemble.py`

- [ ] **Step 1: Write failing tests**

Tests:
- `aggregate_scores` takes max per sentence across engines
- `aggregate_scores` handles None engines (uses only available)
- `compute_document_score` counts sentences above threshold as percentage
- `format_display` returns `*%` for 1-19%, percentage string for 20+

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement ensemble**

`ensemble.py`:
- `aggregate_scores(deberta, gptzero?, pangram?) -> list[float]`: max() per sentence
- `compute_document_score(scores, threshold=0.5) -> int`: percentage of sentences above threshold
- `format_display(score) -> str`: "0%", "*%", or "N%"

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Implement AI detector orchestrator**

`ai_detector.py`: `run_ai_detection(text, sentences, gptzero_key?, pangram_key?) -> AIDetectionResult`. Creates sliding windows, runs DeBERTa (via `asyncio.to_thread`) and API engines in parallel, aggregates with max(), builds `AIDetectionResult`. Singleton `get_deberta()` for model reuse.

- [ ] **Step 6: Commit**

```bash
git add backend/app/detection/ backend/tests/test_ensemble.py
git commit -m "feat: add ensemble aggregation and AI detection orchestrator"
```

---

## Chunk 3: Plagiarism Detection Pipeline

### Task 9: Winnowing Algorithm

**Files:**
- Create: `backend/app/plagiarism/winnowing.py`
- Create: `backend/tests/test_winnowing.py`

- [ ] **Step 1: Write failing tests**

Tests:
- `tokenize_text` removes stop words ("the", "a", "over", etc.)
- `fingerprint` is deterministic (same input = same output)
- `fingerprint` returns non-empty set for text with 10+ content words
- Identical texts produce Jaccard similarity of 1.0
- Unrelated texts produce similarity < 0.3
- Empty fingerprints produce similarity 0.0

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement Winnowing**

`winnowing.py` (custom implementation for natural language):
- `STOP_WORDS` frozenset (~60 common English words)
- `tokenize_text(text) -> list[Token]`: regex match `[a-zA-Z']+`, lowercase, filter stop words and single chars. Each Token has `word`, `original_start`, `original_end`.
- `fingerprint(text) -> set[int]`: tokenize, generate k-grams (k=5), hash with Rabin-Karp (prime=31, mod=2^32), winnow with window w=4 (select minimum, rightmost on tie).
- `compare_fingerprints(fp1, fp2) -> float`: Jaccard coefficient
- `find_matching_positions(text1, text2) -> list[tuple]`: Longest common substring on content words, returns (start1, end1, start2, end2) tuples for matches >= k words.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/app/plagiarism/winnowing.py backend/tests/test_winnowing.py
git commit -m "feat: add Winnowing algorithm for natural language plagiarism detection"
```

---

### Task 10: Web Search + Page Fetcher

**Files:**
- Create: `backend/app/plagiarism/web_search.py`
- Create: `backend/app/plagiarism/page_fetcher.py`
- Create: `backend/tests/test_web_search.py`

- [ ] **Step 1: Write tests (mock-based)**

Tests:
- `search_chunks` parses Serper.dev response format (`organic[].title/link/snippet`)
- `fetch_page_text` extracts text from HTML, strips `<script>` and `<style>` tags

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement web search**

`web_search.py`: POST to `https://google.serper.dev/search` with `X-API-KEY` header. Rate limit: 0.5s between requests. Max 50 queries per document. Deduplicate URLs. Returns `list[SearchResult]`.

- [ ] **Step 4: Implement page fetcher**

`page_fetcher.py`: Async fetcher with `asyncio.Semaphore(5)` concurrency limit, 10s timeout, 1MB max size. Uses BeautifulSoup to strip scripts/styles/nav/header/footer. `fetch_multiple(urls, max_pages=100) -> dict[str, str]`.

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Commit**

```bash
git add backend/app/plagiarism/web_search.py backend/app/plagiarism/page_fetcher.py backend/tests/test_web_search.py
git commit -m "feat: add web search (Serper.dev) and rate-limited page fetcher"
```

---

### Task 11: Citation Detection + Match Groups

**Files:**
- Create: `backend/app/plagiarism/citation_detector.py`
- Create: `backend/app/plagiarism/match_groups.py`
- Create: `backend/tests/test_citations.py`

- [ ] **Step 1: Write failing tests**

Tests:
- APA citation `(Smith, 2023)` detected near matched text
- IEEE citation `[3]` detected
- No citation in plain text
- Quotation marks detected when text is enclosed in quotes
- `classify_match` returns `NOT_CITED_OR_QUOTED` for unmarked text
- `classify_match` returns `CITED_AND_QUOTED` for text with both

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement citation detector**

`citation_detector.py`:
- Regex patterns: APA `(Author, Year)`, MLA `(Author Page)`, IEEE `[Number]`, Turabian superscript
- `has_citation(text, start, end) -> bool`: search 200 chars before/after match
- `has_quotation(text, start, end) -> bool`: check for >= 2 quote marks near match

`match_groups.py`:
- `classify_match(text, start, end, context) -> MatchGroupType`: cited+quoted, missing quotes, missing citation, or not cited/quoted

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/app/plagiarism/citation_detector.py backend/app/plagiarism/match_groups.py backend/tests/test_citations.py
git commit -m "feat: add citation detection (APA/MLA/IEEE) and match group classification"
```

---

### Task 12: Plagiarism Checker Orchestrator

**Files:**
- Create: `backend/app/plagiarism/checker.py`

- [ ] **Step 1: Implement plagiarism orchestrator**

`checker.py`: `run_plagiarism_check(text, serper_key?) -> SimilarityResult`. Pipeline:
1. Split text into 2-sentence search chunks (max 300 chars each)
2. Search web via `search_chunks`
3. Fetch pages via `fetch_multiple`
4. Fingerprint source text + fetched pages
5. Compare with Winnowing, find matching positions
6. Filter matches < 8 words
7. Build sources (sorted by match %), matches, match groups
8. Compute overall score = total matched words / total words * 100
9. Returns empty result if no serper_key

- [ ] **Step 2: Commit**

```bash
git add backend/app/plagiarism/checker.py
git commit -m "feat: add plagiarism detection orchestrator"
```

---

## Chunk 4: Backend API + Job System

### Task 13: API Endpoints + Job Queue

**Files:**
- Create: `backend/app/api/check.py`
- Modify: `backend/app/main.py`
- Create: `backend/tests/test_api.py`

- [ ] **Step 1: Write failing API tests**

Tests (using `httpx.AsyncClient` with `ASGITransport`):
- GET `/health` returns 200
- POST `/api/check` with text creates job, returns `job_id`
- POST `/api/check` with empty text returns 400
- GET `/api/check/{unknown}/status` returns 404

- [ ] **Step 2: Run tests to verify they fail**

- [ ] **Step 3: Implement API routes + job system**

`check.py`:
- In-memory `_jobs: dict[str, JobState]`
- POST `/api/check`: validate text (min 2 words), create JobState, start `asyncio.create_task(_process_job)`, return job_id
- GET `/api/check/{id}/status`: return status/progress/stage/error
- GET `/api/check/{id}/report`: return serialized report (409 if not complete)

`_process_job` async function:
1. Normalize text, detect flags, swap homoglyphs
2. Segment sentences
3. Run AI detection + plagiarism in parallel (`asyncio.gather`)
4. Build CheckReport, mark job complete
5. Read API keys from `os.getenv()`

- [ ] **Step 4: Update main.py**

Add `check_router`, add startup event to pre-load DeBERTa model.

- [ ] **Step 5: Run tests**

- [ ] **Step 6: Commit**

```bash
git add backend/app/api/ backend/app/main.py backend/tests/test_api.py
git commit -m "feat: add API endpoints with async job queue and report generation"
```

---

## Chunk 5: Frontend -- Upload + Report

### Task 14: Initialize Frontend Project

- [ ] **Step 1: Create Next.js project**

```bash
cd ~/turnitin-clone
npx create-next-app@latest frontend --typescript --tailwind --eslint --app --src-dir=false --import-alias="@/*" --no-turbopack
```

- [ ] **Step 2: Create TypeScript types** (`frontend/types/report.ts`) matching backend schemas

- [ ] **Step 3: Create API client** (`frontend/lib/api.ts`) with `submitCheck`, `getJobStatus`, `getReport` functions

- [ ] **Step 4: Commit**

```bash
git add frontend/types/ frontend/lib/
git commit -m "feat: initialize Next.js frontend with types and API client"
```

---

### Task 15: Upload Page

**Files:**
- Create: `frontend/components/upload/TextInput.tsx`
- Create: `frontend/components/upload/CheckButton.tsx`
- Modify: `frontend/app/page.tsx`

- [ ] **Step 1: Create TextInput** -- textarea with word count, 300-word warning

- [ ] **Step 2: Create CheckButton** -- disabled until 20 words, shows progress/stage when loading

- [ ] **Step 3: Create upload page** -- combines TextInput + CheckButton, submits to API, polls status, redirects to `/report/{id}` on completion

- [ ] **Step 4: Verify frontend starts and renders upload page**

```bash
cd ~/turnitin-clone/frontend && npm run dev
```

- [ ] **Step 5: Commit**

```bash
git add frontend/app/page.tsx frontend/components/upload/
git commit -m "feat: add upload page with text input and check button"
```

---

### Task 16: Report Page

**Files:**
- Create: `frontend/components/report/ScoreBadge.tsx`
- Create: `frontend/components/report/DocumentViewer.tsx`
- Create: `frontend/app/report/[id]/page.tsx`

- [ ] **Step 1: Create ScoreBadge** -- colored badge (blue/green/yellow/orange/red for similarity, blue for AI). Shows `*%` for AI scores 1-19%.

- [ ] **Step 2: Create DocumentViewer** -- renders text with colored highlight spans. Takes `highlights: {start, end, color, label?, onClick?}[]`. Splits text into highlighted/unhighlighted segments.

- [ ] **Step 3: Create report page** -- fetches report by job ID, renders:
- Top bar: similarity score badge + AI score badge + flag count
- Tab bar: Similarity | AI Writing | Flags
- Similarity tab: DocumentViewer with 5-color source highlights + source panel sidebar
- AI tab: DocumentViewer with cyan (AI) / purple (paraphrased) highlights
- Source panel: ranked sources with color dots, percentage, URL link, block/word counts

- [ ] **Step 4: Verify report page renders**

- [ ] **Step 5: Commit**

```bash
git add frontend/components/report/ frontend/app/report/
git commit -m "feat: add report page with score badges, document viewer, and source panel"
```

---

## Chunk 6: Frontend Polish -- Missing Components

### Task 17: File Upload Component + Backend Support

**Files:**
- Create: `frontend/components/upload/FileUpload.tsx`
- Modify: `backend/app/api/check.py` (add file upload endpoint)

- [ ] **Step 1: Add file upload endpoint to backend**

Add `POST /api/check/upload` accepting multipart file (PDF/DOCX/PPTX/TXT). Use `extract_text(file_bytes, filename)` from documents module. Create job same as text endpoint.

- [ ] **Step 2: Create FileUpload component**

Drag-and-drop zone accepting .pdf, .docx, .pptx, .txt. Shows file name + size after drop. Calls `/api/check/upload` on submit.

- [ ] **Step 3: Integrate into upload page**

Add FileUpload below TextInput with "OR" divider. Upload page supports both paste and file upload.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/upload/FileUpload.tsx backend/app/api/check.py frontend/app/page.tsx
git commit -m "feat: add file upload support (PDF/DOCX/PPTX)"
```

---

### Task 18: Source Panel + Source Overlay + Side-by-Side

**Files:**
- Create: `frontend/components/report/SourcePanel.tsx`
- Create: `frontend/components/report/SourceOverlay.tsx`
- Create: `frontend/components/report/SideBySide.tsx`

- [ ] **Step 1: Create SourcePanel** -- standalone right sidebar component. Receives `sources[]`, renders ranked list with color dots, percentage, URL, block/word counts. Click source scrolls document to first match.

- [ ] **Step 2: Create SourceOverlay** -- popup that appears when clicking a highlighted match. Shows source title, URL, matching snippet from source text. Left/right arrows to navigate between sources for that match.

- [ ] **Step 3: Create SideBySide** -- split view showing student text (left) and source text (right) with matching passages highlighted in both. Triggered from SourceOverlay "View Full Source" button.

- [ ] **Step 4: Wire into report page** -- replace inline source panel with `SourcePanel` component, add click handlers on highlights to show `SourceOverlay`.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/report/SourcePanel.tsx frontend/components/report/SourceOverlay.tsx frontend/components/report/SideBySide.tsx
git commit -m "feat: add source panel, click-to-source overlay, and side-by-side comparison"
```

---

### Task 19: Filter Controls (Client-Side Exclusions)

**Files:**
- Create: `frontend/components/report/FilterControls.tsx`
- Create: `frontend/lib/filters.ts`

- [ ] **Step 1: Implement client-side filter logic**

`filters.ts`: Functions to filter `raw_matches` based on:
- `excludeQuotes(matches, text)`: Remove matches inside quotation marks
- `excludeBibliography(matches, text)`: Remove matches in reference section (detect by heading heuristic: "References", "Bibliography", "Works Cited")
- `excludeSmallMatches(matches, threshold)`: Remove matches below word count
- `excludeSources(matches, sourceIndices)`: Remove matches from specific sources
- `recalculateScore(filteredMatches, totalWords)`: Recompute similarity percentage

- [ ] **Step 2: Create FilterControls component**

Toggles for: exclude quotes, exclude bibliography. Slider for small match threshold (8/10/12/16/20 words). Per-source exclude via eye-with-strike icon in SourcePanel. Score recalculates instantly on change.

- [ ] **Step 3: Wire into report page** -- FilterControls in top bar, state manages active filters, filtered highlights passed to DocumentViewer.

- [ ] **Step 4: Commit**

```bash
git add frontend/components/report/FilterControls.tsx frontend/lib/filters.ts
git commit -m "feat: add client-side filter controls for exclusions"
```

---

### Task 20: Submission Breakdown Bar + AI Tab + Flags Tab

**Files:**
- Create: `frontend/components/report/SubmissionBar.tsx`
- Create: `frontend/components/report/AITab.tsx`
- Create: `frontend/components/report/FlagsTab.tsx`

- [ ] **Step 1: Create SubmissionBar** -- horizontal stacked bar. For similarity: colored segments per source. For AI: cyan (AI) + purple (paraphrased) segments. Clickable segments scroll to corresponding text.

- [ ] **Step 2: Create AITab** -- dedicated AI writing tab. AI score badge (blue), SubmissionBar with AI segments, DocumentViewer with cyan/purple highlights. Sentence detail tooltip on hover showing per-engine scores (DeBERTa, GPTZero, Pangram).

- [ ] **Step 3: Create FlagsTab** -- list of detected manipulation flags. Per flag: type icon, count, detail text. Document viewer highlights flag positions in amber.

- [ ] **Step 4: Refactor report page** -- replace inline tab content with `AITab`, `FlagsTab` components. Add `SubmissionBar` to both similarity and AI tabs.

- [ ] **Step 5: Commit**

```bash
git add frontend/components/report/SubmissionBar.tsx frontend/components/report/AITab.tsx frontend/components/report/FlagsTab.tsx
git commit -m "feat: add submission bar, AI writing tab, and flags tab"
```

---

## Chunk 7: Integration + Final Polish

### Task 21: Backend Fixes -- 300-Word Threshold + TF-IDF

**Files:**
- Modify: `backend/app/api/check.py`
- Modify: `backend/app/plagiarism/checker.py`
- Create: `backend/tests/test_threshold.py`

- [ ] **Step 1: Write test for 300-word threshold**

Test: submit 100-word text. Verify report has `ai_detection.score == 0` and `ai_detection.display == "0%"` (AI detection skipped, plagiarism still runs).

- [ ] **Step 2: Enforce 300-word minimum in job processor**

In `_process_job`: only call `run_ai_detection` if `word_count >= 300`. Otherwise set `ai_detection` to empty result.

- [ ] **Step 3: Add TF-IDF cosine similarity to plagiarism comparison**

In `checker.py`: after Winnowing comparison, also compute TF-IDF cosine similarity between source text and fetched page text using `sklearn.feature_extraction.text.TfidfVectorizer` + `sklearn.metrics.pairwise.cosine_similarity`. Use as supplementary signal: if TF-IDF similarity > 0.3 but Winnowing found no matches, flag for review.

- [ ] **Step 4: Run tests**

- [ ] **Step 5: Commit**

```bash
git add backend/app/api/check.py backend/app/plagiarism/checker.py backend/tests/test_threshold.py
git commit -m "fix: enforce 300-word AI detection minimum, add TF-IDF similarity"
```

---

### Task 22: End-to-End Integration Test

**Files:**
- Create: `backend/tests/test_integration.py`
- Create: `scripts/setup.sh`

- [ ] **Step 1: Write integration test**

Submit ~300-word AI-like text via POST `/api/check`. Poll until complete (max 60s). Verify report has `ai_detection`, `similarity`, `flags`, `document` fields. Verify `ai_detection.score` is 0-100 and `sentences` is non-empty.

- [ ] **Step 2: Create setup script**

`scripts/setup.sh`: Install backend deps, download spaCy model, pre-download DeBERTa, install frontend deps. Print start commands.

- [ ] **Step 3: Run integration test**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_integration.py -v --timeout=120
```

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_integration.py scripts/setup.sh
git commit -m "feat: add end-to-end integration test and setup script"
```

---

### Task 23: Environment Configuration + Final Polish

**Files:**
- Create: `backend/tests/test_integration.py`
- Create: `scripts/setup.sh`

- [ ] **Step 1: Write integration test**

Submit ~150-word AI-like text via POST `/api/check`. Poll until complete (max 60s). Verify report has `ai_detection`, `similarity`, `flags`, `document` fields. Verify `ai_detection.score` is 0-100 and `sentences` is non-empty.

- [ ] **Step 2: Create setup script**

`scripts/setup.sh`: Install backend deps, download spaCy model, pre-download DeBERTa, install frontend deps. Print start commands.

- [ ] **Step 3: Run integration test**

```bash
cd ~/turnitin-clone/backend && python -m pytest tests/test_integration.py -v --timeout=120
```

- [ ] **Step 4: Commit**

```bash
git add backend/tests/test_integration.py scripts/setup.sh
git commit -m "feat: add end-to-end integration test and setup script"
```

---

### Task 23: Environment Configuration + Final Polish

- [ ] **Step 1: Create .env.example files**

`backend/.env.example`: GPTZERO_API_KEY, PANGRAM_API_KEY, SERPER_API_KEY (all optional)
`frontend/.env.local.example`: NEXT_PUBLIC_API_URL=http://localhost:8000

- [ ] **Step 2: Update .gitignore**

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: add environment configuration and finalize project setup"
```

---

## Summary

| Chunk | Tasks | What It Builds |
|-------|-------|---------------|
| 1 | 1-4 | Project scaffold, types, preprocessing, document parsing, manipulation detection |
| 2 | 5-8 | Sliding window, DeBERTa engine, GPTZero/Pangram clients, ensemble aggregation |
| 3 | 9-12 | Winnowing algorithm, web search, page fetcher, citation detection, plagiarism orchestrator |
| 4 | 13 | API endpoints, async job queue, report generation |
| 5 | 14-16 | Frontend project, upload page, report page core (highlights + source panel) |
| 6 | 17-20 | File upload, source overlay, side-by-side, filter controls, AI tab, flags tab, submission bar |
| 7 | 21-23 | 300-word threshold, TF-IDF, integration test, setup script, env config |

**Total: 23 tasks, ~110 steps.**

Each task produces a working, testable increment. The system works with DeBERTa-only (no API keys needed) for basic AI detection, and progressively adds capabilities as API keys are configured.
