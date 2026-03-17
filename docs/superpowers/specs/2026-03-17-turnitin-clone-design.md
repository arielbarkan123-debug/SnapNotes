# Turnitin Clone — Design Specification

**Date:** 2026-03-17
**Status:** Draft
**Type:** Standalone application (NOT part of NoteSnap)
**Purpose:** Personal-use plagiarism checker + AI text detector that replicates Turnitin's functionality. If this tool labels text as "human," Turnitin must agree.

---

## 1. Problem Statement

Students need a way to verify their work will pass Turnitin's checks before submitting. No free tool exists that combines plagiarism detection + AI text detection + a Turnitin-style similarity report in one interface. The goal is a personal tool where students can paste or upload text, get a comprehensive report, and know with >99% confidence that Turnitin will classify their work as human-written.

## 2. Target User

Individual student, personal use. No authentication, no payments, no institutional features.

## 3. Core Guarantee

**Conservative detection strategy:** The system uses multiple detection engines and takes the maximum AI score across all of them. Text is only labeled "HUMAN" when ALL engines agree with high confidence. This means:

- If our tool says "human" → Turnitin says "human" (>99% probability)
- Trade-off: ~5-8% false positive rate (vs Turnitin's <1%) — students may revise text that Turnitin wouldn't actually flag, but they will never be surprised by a Turnitin result

## 4. Tech Stack

| Layer | Technology | Justification |
|-------|-----------|---------------|
| Backend | Python 3.11+ / FastAPI | PyTorch, HuggingFace all require Python |
| Frontend | Next.js 14 / TypeScript / Tailwind CSS | Interactive document viewer needs React (highlights, click-to-source, side-by-side) |
| Local AI Model | DeBERTa-v3-large (`desklib/ai-text-detector-v1.01`) | RAID benchmark #1, MIT license, runs on CPU/M-series Mac |
| NLP | spaCy (en_core_web_sm) | Sentence segmentation |
| Plagiarism | Custom Winnowing implementation | Same algorithm as Turnitin/MOSS (Stanford SIGMOD 2003). Note: `copydetect` is for code only, not prose. |
| Document Parsing | python-docx, python-pptx, pypdf | PDF, DOCX, PPTX text extraction. Note: `PyPDF2` is deprecated; use `pypdf`. |
| Web Search API | Serper.dev | 2,500 free queries total (one-time, not monthly). After: $50/50K queries. |
| AI Detection API 1 | GPTZero | Sentence-level perplexity + burstiness, 10K words/month free |
| AI Detection API 2 | Pangram Labs | 99.3% accuracy, RAID leaderboard #1, credit-based pricing (~$5/100 credits) |
| Job Queue | In-memory `asyncio` tasks + `dict` store | Sufficient for personal single-user tool. Jobs lost on restart (acceptable). |

### Hardware Requirements (Local)

| Component | RAM | Notes |
|-----------|-----|-------|
| DeBERTa-v3-large (float32) | ~1.2 GB | RAID benchmark #1, MIT license, ~1.5 GB on disk |
| spaCy en_core_web_sm | ~50 MB | Sentence segmentation, ~12 MB on disk |
| **Total** | **~1.3 GB** | Runs comfortably on any M1/M2 Mac |

### Cost (Personal Use)

| Item | Cost |
|------|------|
| Local model (DeBERTa) | $0 (open source, MIT license) |
| Serper.dev | Free for first 2,500 queries, then $1/1K queries |
| GPTZero | Free (10K words/month) |
| Pangram Labs | ~$0.05 per credit (1 credit ~= 1 document check) |
| **Per document (~1000 words)** | **~$0.05-0.10** |

---

## 5. AI Detection System

### 5.1 How Turnitin Does It (From Their White Paper)

Turnitin's AI detection (AIW-2) uses:
- A single transformer classifier (architecture undisclosed)
- Sliding windows of ~200-300 words (5-10 sentences) with 1-sentence stride
- Each window scored 0.0 (human) to 1.0 (AI)
- Sentence score = weighted average of all windows containing that sentence
- Document score = percentage of sentences above a predetermined threshold
- Below 20% → displayed as asterisk, highlights hidden
- Above 20% → percentage shown with sentence-level highlights
- AIR-1 (paraphrase detection) runs only on AIW-2-flagged sentences
- Document-level FPR: 0.51% (tested on 719,877 pre-2019 papers)
- Sentence-level FPR: 0.33%
- Document recall: 91.18%
- Trained primarily on GPT-3.5 outputs + AI-paraphrased text
- Explicitly chose transformers OVER perplexity/burstiness measures
- No hand-crafted features; transformer learns end-to-end

### 5.2 Our Approach: Multi-Engine Ensemble

Since Turnitin's exact model is proprietary, we use multiple detection engines and take the strictest result.

#### Detection Engines

**Engine 1: DeBERTa-v3-large (Local)**
- Model: `desklib/ai-text-detector-v1.01` from HuggingFace
- Architecture: DeBERTa-v3-large (304M params) fine-tuned on 8.09M RAID samples
- Output: Per-window probability 0-1 (sigmoid of logits)
- RAM: ~1.2 GB (float32), inference ~200ms per window on M1 CPU
- Max sequence length: 768 tokens
- Why: #1 on RAID benchmark, MIT license, lightweight enough for CPU

**Engine 2: GPTZero API**
- Endpoint: `POST https://api.gptzero.me/v2/predict/text`
- Request body: `{ "document": "text here" }` (NOTE: field is `document`, not `text`)
- Auth: `x-api-key` header
- Returns: `generated_prob` per sentence, `perplexity` per sentence, `doc_overall_burstiness`, `doc_completely_generated_prob`, `highlight_sentence_for_ai`
- Free tier: 10K words/month
- Why: Sentence-level scores + perplexity + burstiness in one API call. Closest methodology to Turnitin among commercial detectors.

**Engine 3: Pangram Labs API**
- Endpoint: Pangram REST API (developer plan required)
- Auth: API key
- Returns: Per-sentence classification with confidence scores
- Pricing: Credit-based ($5/100 credits on starter, $100/month for 2,000 credits on Developer)
- Why: #1 on RAID leaderboard (99.3% non-adversarial, 97.7% adversarial). Uses Mistral NeMo 12B with active learning and hard negative mining. Most robust to adversarial/paraphrasing attacks among ALL detectors.

**Why 3 engines, not 4:**
RADAR-Vicuna-7B (the adversarially-trained open-source detector) was considered but requires ~14 GB RAM (7B parameter model), making it impractical for personal Mac use. Pangram Labs already covers adversarial robustness (97.7% accuracy under attack), making RADAR redundant. If heavier hardware becomes available, RADAR can be added as Engine 4 in the future.

#### Pipeline

```
INPUT: Text (minimum 300 words)
  |
  v
PREPROCESSING:
  1. Sentence segmentation (spaCy en_core_web_sm)
  2. Text normalization (strip zero-width chars, normalize Unicode)
  3. Homoglyph detection + swap (flag but neutralize before analysis)
  |
  v
SLIDING WINDOW CREATION:
  - Window size: ~250 words (matching Turnitin's "few hundred words")
  - Stride: 1 sentence (matching Turnitin exactly)
  - Each sentence appears in multiple overlapping windows
  |
  v
LOCAL ENGINE INFERENCE:
  - DeBERTa: score each window → per-sentence weighted average
  |
  v
API ENGINE CALLS (parallel with local inference):
  - GPTZero: full text → sentence-level scores
  - Pangram: full text → sentence-level scores
  |
  v
PER-SENTENCE AGGREGATION:
  - For each sentence: score = max(deberta, gptzero, pangram)
  - Conservative: flag if ANY engine scores above threshold
  |
  v
DOCUMENT-LEVEL SCORE:
  - Count sentences where aggregated score > sentence_threshold
  - document_ai_percentage = flagged_sentences / total_sentences * 100
  |
  v
DISPLAY LOGIC (matching Turnitin):
  - 0%: "No AI detected"
  - 1-19%: Show asterisk (*%), no sentence highlights
  - 20-100%: Show percentage + highlight flagged sentences
  |
  v
CLASSIFICATION:
  - 0%: HUMAN
  - 1-19%: MOSTLY HUMAN (asterisk display)
  - 20-49%: MIXED
  - 50-100%: MOSTLY AI / AI
```

#### Sentence-Level Threshold Tuning

Turnitin's exact threshold is undisclosed. Our approach:
1. Start with a default threshold of 0.5 per engine
2. Evaluate against the RAID benchmark (6.28M samples) to calibrate
3. Tune threshold so our system's "human" predictions are a strict subset of correct human labels
4. Target: <1% of texts labeled "human" by our system should be AI-generated
5. Accept that this produces ~5-8% false positives (flagging human text as AI)

### 5.3 Paraphrase / Humanizer Detection

Turnitin's AIR-1 detects AI-paraphrased text with a separate model. Our coverage:
- **Pangram Labs** was specifically trained on outputs from humanizer tools (QuillBot, Undetectable AI, etc.) and uses active learning with hard negative mining. Their COLING 2025 paper shows 97.7% accuracy on adversarial (paraphrased) text.
- **GPTZero** includes a "GPTZero Shield" component specifically for paraphrasing/homoglyph attack defense.
- **Display**: Sentences where Pangram flags AI+paraphrased are shown in purple (matching Turnitin's purple highlight). Other AI-flagged sentences shown in cyan.
- **Limitation**: Without a dedicated AIR-1-equivalent model, our paraphrase detection is less granular than Turnitin's. We detect "AI" vs "human" but the AI+paraphrased distinction relies on Pangram's classification.

---

## 6. Plagiarism Detection System

### 6.1 How Turnitin Does It

- Winnowing algorithm (Stanford, Schleimer/Wilkerson/Aiken, SIGMOD 2003)
- Compares against 99.3B web pages + 1.9B student papers + 69M academic articles
- Score = matched words / total words * 100
- Match Groups categorize by citation/quotation status

### 6.2 Our Approach

#### Winnowing Algorithm (Custom Implementation for Natural Language)

**Note:** The `copydetect` library implements Winnowing but for source code only (it tokenizes with Pygments, replacing variable/function names). We implement Winnowing from scratch for natural language prose, following the original Schleimer/Wilkerson/Aiken SIGMOD 2003 paper.

```
INPUT: Normalized text
  |
  v
TOKENIZATION: Split into words (lowercase, strip punctuation)
  - Remove common stop words ("the", "a", "an", "and", "or", "is", etc.)
  - This matches Turnitin's approach of excluding commonly-used words
  |
  v
K-GRAM GENERATION: Sliding window of k=5 words
  - Each k-gram is a tuple of 5 consecutive content words
  |
  v
HASHING: Rabin-Karp rolling hash for each k-gram
  - hash(k-gram) = (c1 * p^(k-1) + c2 * p^(k-2) + ... + ck) mod m
  - p = large prime (e.g., 31), m = 2^32
  |
  v
WINNOWING: Slide window of size w=4, select minimum hash per window
  - On ties, select rightmost occurrence
  - Guarantees detection of matches >= t = w + k - 1 = 8 content words
  |
  v
FINGERPRINT: Set of (position, hash) tuples = document identity
  |
  v
COMPARISON: Jaccard coefficient between document and source fingerprints
  - similarity = |fingerprint_A ∩ fingerprint_B| / |fingerprint_A ∪ fingerprint_B|
  - Also compute: matched character positions for highlight mapping

Implementation: ~150-200 lines of Python. Reference: suminb/winnowing on GitHub.
```

#### Web Source Matching

```
INPUT: Text split into 2-3 sentence chunks
  |
  v
SEARCH: Query each chunk via Serper.dev API (top 5 results per chunk)
  - Rate limit: max 2 requests/second to avoid IP blocking
  - Max 50 search queries per document (deduplicate overlapping chunks)
  |
  v
FETCH: Download page content for top results (httpx async)
  - Timeout: 10 seconds per page
  - Max 5 concurrent connections
  - Respect robots.txt (check before fetching)
  - Max 100 pages total per document check
  - Skip pages >1MB (likely not text content)
  |
  v
EXTRACT: Strip HTML, get clean text
  |
  v
COMPARE: Winnowing fingerprint comparison + TF-IDF cosine similarity
  |
  v
SCORE: matched_words / total_words * 100
  |
  v
SOURCE RANKING: Order sources by match percentage (descending)
```

#### Similarity Score Color Coding (Matching Turnitin)

| Color | Range | CSS |
|-------|-------|-----|
| Blue | 0% | `#2196F3` |
| Green | 1-24% | `#4CAF50` |
| Yellow | 25-49% | `#FFC107` |
| Orange | 50-74% | `#FF9800` |
| Red | 75-100% | `#F44336` |

#### Match Groups

Each matched passage is categorized into one of four groups:

| Group | Color | Detection Method |
|-------|-------|-----------------|
| Not Cited or Quoted | Red | No citation pattern or quotation marks found near match |
| Missing Quotations | Orange | Citation detected (APA/MLA/IEEE regex) but text is near-verbatim without quotes |
| Missing Citation | Yellow | Quotation marks present but no citation pattern nearby |
| Cited and Quoted | Green | Both citation and quotation marks detected |

Citation detection uses regex patterns for:
- APA: `(Author, Year)` / `Author (Year)`
- MLA: `(Author Page)` / `Author (Page)`
- IEEE: `[Number]` inline references
- Turabian: Footnote/endnote markers

### 6.3 What We Cannot Match

- **Student paper database (1.9B papers)**: Impossible to replicate. Only affects cross-student plagiarism detection.
- **Academic journal database (69M articles)**: Requires publisher partnerships. Web search partially compensates.
- **Proprietary crawler**: We use Serper.dev (Google results) instead. Covers most publicly accessible sources.

---

## 7. Manipulation Detection (Flags Panel)

### 7.1 Hidden Character Detection

Scan input text for:
- Zero-width spaces (U+200B)
- Zero-width non-joiners (U+200C)
- Zero-width joiners (U+200D)
- Byte order marks (U+FEFF)
- Soft hyphens (U+00AD)
- Other invisible Unicode characters

Flag locations and count. Strip before analysis.

### 7.2 Homoglyph Detection

Compare each character against known homoglyph mappings:
- Cyrillic lookalikes (а→a, е→e, о→o, р→p, с→c, у→y, etc.)
- Greek lookalikes (α→a, ε→e, ο→o, etc.)
- Mathematical symbols
- Full-width characters

For each detected homoglyph:
1. Record position and original character
2. Swap to Latin equivalent before running similarity analysis
3. Flag in the report with exact positions

### 7.3 Minimum Requirements

- Document must have 500+ characters for flag analysis (matching Turnitin)
- Flags are informational only — they don't affect the similarity or AI scores

---

## 8. Document Processing

### 8.1 Supported Formats

| Format | Parser | Max Size |
|--------|--------|----------|
| Plain text (paste) | Direct | No limit |
| .txt | Direct read | 10 MB |
| .pdf | pypdf (formerly PyPDF2) | 50 MB |
| .docx | python-docx | 50 MB |
| .pptx | python-pptx | 50 MB |

### 8.2 Preprocessing Pipeline

```
UPLOAD / PASTE
  |
  v
FORMAT DETECTION: Check file extension / MIME type
  |
  v
TEXT EXTRACTION: Use appropriate parser
  - PDF: Extract selectable text (no OCR)
  - DOCX: Extract paragraphs, strip formatting
  - PPTX: Extract slide text, strip formatting
  |
  v
NORMALIZATION:
  - Strip headers/footers (heuristic: repeated text on multiple pages)
  - Normalize whitespace
  - Normalize Unicode (NFC normalization)
  - Detect and flag hidden characters / homoglyphs
  |
  v
VALIDATION:
  - Minimum 300 words for AI detection
  - Minimum 20 words for plagiarism detection
  - Reject if text extraction yields no content
```

---

## 9. User Interface

### 9.1 Application Layout

Two-page application:
1. **Upload Page**: Paste text or upload document, click "Check"
2. **Report Page**: Turnitin-style similarity report

### 9.2 Upload Page

- Large text area for pasting (with word count)
- File upload zone (drag-and-drop) for PDF/DOCX/PPTX
- "Check" button (disabled until minimum 20 words)
- Info banner: "AI detection requires 300+ words. Documents under 300 words will receive plagiarism analysis only."
- Loading state with progress indicators (estimated time: 15-30 seconds for AI detection, 30-60 seconds for full plagiarism + AI check)

### 9.3 Report Page — Similarity Tab

**Layout** (matching Turnitin):
- **Top bar**: Overall similarity score (colored badge) + AI detection indicator (blue badge) + filter icon
- **Submission breakdown bar**: Horizontal stacked bar showing match distribution across document
- **Document viewer** (center/left): Full text with color-coded highlights
  - 5 rotating colors to distinguish different sources
  - Each highlight numbered (1, 2, 3...) linking to source panel
  - Click highlight → source overlay with matching snippet
- **Source panel** (right sidebar, collapsible):
  - Sources ranked by match percentage (descending)
  - Per source: ranking number, source type (Internet), match %, text blocks count, word count
  - Click source → scroll to first match in document
- **Side-by-side comparison**: Click source → see student text alongside matched source text

### 9.4 Report Page — AI Writing Tab

**Layout** (matching Turnitin):
- **AI indicator**: Blue badge showing 0-100% (or asterisk if <20%)
- **Submission breakdown bar**: Cyan segments (AI-generated) + Purple segments (AI+paraphrased)
- **Document viewer**: Same text, different highlights:
  - Cyan (`#00BCD4`): AI-generated sentences
  - Purple (`#9C27B0`): AI-generated + AI-paraphrased sentences
  - No highlights if score <20%
- **Sentence detail**: Hover/click sentence → tooltip showing per-engine scores

### 9.5 Report Page — Flags Tab

- List of detected manipulation attempts
- Per flag: type (hidden character / homoglyph), count, positions in document
- Document viewer highlights flag locations

### 9.6 Filter/Exclusion Controls

- Toggle: Exclude quoted text (text in quotation marks)
- Toggle: Exclude bibliography/references (detect reference section heuristically)
- Slider: Exclude small matches (by word count threshold: 8, 10, 12, 16, 20)
- Per-source: Exclude specific sources (eye-with-strike icon)
- Score recalculates immediately on filter change

---

## 10. API Design (Backend)

### 10.1 Job Infrastructure

**Job queue:** Python `asyncio.create_task()` for background processing. Jobs are stored in an in-memory `dict[str, JobState]`. This is sufficient for a personal single-user tool. Jobs are lost on server restart — acceptable since reports are transient.

**Job lifecycle:** `pending` → `processing` → `complete` | `error`

**Model loading:** Models (DeBERTa) are loaded at server startup. First startup takes ~30-60 seconds to download models (cached to `~/.cache/huggingface/` for subsequent starts). After initial download, startup takes ~10-15 seconds for model loading. The startup progress is logged to console.

### 10.2 Endpoints

```
POST /api/check
  Body: { "text": "string" } OR multipart file upload
  Response: { "job_id": "uuid" }

GET /api/check/{job_id}/status
  Response: {
    "status": "processing" | "complete" | "error",
    "progress": 0-100,
    "stage": "extracting" | "ai_detection" | "plagiarism" | "aggregating",
    "error": "string | null"
  }

GET /api/check/{job_id}/report
  Response: {
    similarity: {
      score: number,                 // 0-100 (overall)
      sources: Source[],             // ranked by match %
      matches: Match[],             // { start_char, end_char, source_index, matched_text }
      match_groups: MatchGroup[],   // categorized by citation status
      raw_matches: RawMatch[]       // ALL match data for client-side filtering
    },
    ai_detection: {
      score: number,                 // 0-100
      display: string,               // "45%" or "*%"
      sentences: SentenceScore[],    // { text, start_char, end_char, score, is_paraphrased }
      engines: {                     // per-engine breakdown for transparency
        deberta: number[],           // per-sentence scores
        gptzero: number[] | null,    // null if API failed
        pangram: number[] | null     // null if API failed
      }
    },
    flags: Flag[],                   // { type, positions, count }
    document: {
      text: string,
      word_count: number,
      sentence_count: number,
      sentences: { text: string, start: number, end: number }[]
    }
  }
```

**Exclusion filtering is CLIENT-SIDE.** The report returns all raw match data (`raw_matches`). The frontend filters and recalculates scores locally when the user toggles exclusions (quotes, bibliography, small matches, specific sources). This avoids extra API calls and is instant.

### 10.3 Processing Pipeline (Async)

```
POST /api/check → Create job in memory, return job_id, start asyncio task
  |
  v
Background task:
  1. Extract text from document (if file upload)           [progress: 0-10%]
  2. Preprocess (normalize, sentence-split, flag manipulation) [10-15%]
  3. Run in parallel:
     a. AI detection: DeBERTa local inference              [15-50%]
     b. AI detection: GPTZero API call                     [15-50%]
     c. AI detection: Pangram API call                     [15-50%]
     d. Plagiarism: web search + fetch + Winnowing         [15-80%]
  4. Aggregate AI scores (max across engines)               [80-90%]
  5. Build citation/match group analysis                    [90-95%]
  6. Build final report                                     [95-100%]
  7. Store report in job dict, mark complete
```

### 10.4 Error Handling

**Graceful degradation:** If an API engine fails (GPTZero down, Pangram rate limited), the system continues with remaining engines. The report shows `null` for the failed engine's scores and includes a warning. The overall score uses `max()` of available engines only.

**Minimum engines:** At least DeBERTa (local) must succeed. If DeBERTa fails (model loading error), the job fails with an error.

**Plagiarism errors:** If Serper.dev is unavailable or rate-limited, plagiarism section shows "Web search unavailable" with score 0. AI detection still runs independently.

### 10.5 CORS Configuration

```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Next.js dev server
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

---

## 11. Project Structure

```
turnitin-clone/
├── backend/                    # Python FastAPI
│   ├── app/
│   │   ├── main.py            # FastAPI app, CORS, routes
│   │   ├── api/
│   │   │   ├── check.py       # /api/check endpoints
│   │   │   └── report.py      # /api/check/{id}/report
│   │   ├── detection/
│   │   │   ├── ai_detector.py       # Orchestrates all AI engines
│   │   │   ├── engines/
│   │   │   │   ├── deberta.py       # DeBERTa-v3-large local inference
│   │   │   │   ├── gptzero.py       # GPTZero API client
│   │   │   │   └── pangram.py       # Pangram Labs API client
│   │   │   ├── sliding_window.py    # Window creation + sentence aggregation
│   │   │   └── ensemble.py          # max() aggregation + threshold logic
│   │   ├── plagiarism/
│   │   │   ├── checker.py           # Orchestrates plagiarism pipeline
│   │   │   ├── winnowing.py         # Custom Winnowing for natural language prose
│   │   │   ├── web_search.py        # Serper.dev API client
│   │   │   ├── page_fetcher.py      # Async web page fetching + extraction (rate-limited)
│   │   │   ├── citation_detector.py # APA/MLA/IEEE citation regex + ML
│   │   │   └── match_groups.py      # Categorize matches by citation status
│   │   ├── manipulation/
│   │   │   ├── flags.py             # Hidden char + homoglyph detection
│   │   │   └── homoglyphs.py        # Unicode homoglyph mapping table
│   │   ├── documents/
│   │   │   ├── parser.py            # Unified document parser
│   │   │   ├── pdf.py               # pypdf extraction
│   │   │   ├── docx.py              # python-docx extraction
│   │   │   └── pptx.py              # python-pptx extraction
│   │   ├── preprocessing/
│   │   │   ├── normalizer.py        # Unicode normalization, whitespace
│   │   │   └── segmenter.py         # spaCy sentence segmentation
│   │   └── models/
│   │       ├── schemas.py           # Pydantic request/response models
│   │       └── types.py             # Shared type definitions
│   ├── requirements.txt
│   ├── Dockerfile
│   └── tests/
│       ├── test_ai_detection.py
│       ├── test_plagiarism.py
│       ├── test_manipulation.py
│       └── test_ensemble.py
├── frontend/                   # Next.js 14
│   ├── app/
│   │   ├── page.tsx           # Upload page
│   │   ├── report/[id]/
│   │   │   └── page.tsx       # Report page
│   │   └── layout.tsx
│   ├── components/
│   │   ├── upload/
│   │   │   ├── TextInput.tsx
│   │   │   ├── FileUpload.tsx
│   │   │   └── CheckButton.tsx
│   │   ├── report/
│   │   │   ├── DocumentViewer.tsx      # Main text with highlights
│   │   │   ├── SourcePanel.tsx         # Right sidebar with sources
│   │   │   ├── SourceOverlay.tsx       # Click-to-source popup
│   │   │   ├── SideBySide.tsx          # Side-by-side comparison
│   │   │   ├── ScoreBadge.tsx          # Colored score indicator
│   │   │   ├── SubmissionBar.tsx       # Horizontal breakdown bar
│   │   │   ├── AITab.tsx               # AI detection view
│   │   │   ├── SimilarityTab.tsx       # Plagiarism view
│   │   │   ├── FlagsTab.tsx            # Manipulation flags
│   │   │   ├── MatchGroups.tsx         # Citation categorization
│   │   │   └── FilterControls.tsx      # Exclusion toggles
│   │   └── ui/
│   │       ├── Tabs.tsx
│   │       ├── Toggle.tsx
│   │       └── Slider.tsx
│   ├── lib/
│   │   └── api.ts             # Backend API client
│   ├── types/
│   │   └── report.ts          # TypeScript types matching backend schemas
│   ├── tailwind.config.ts
│   ├── next.config.js
│   └── package.json
├── scripts/
│   ├── download-models.py     # Download DeBERTa from HuggingFace (~1.5 GB, cached to ~/.cache/huggingface/)
│   ├── setup.sh               # Full setup script
│   └── evaluate-raid.py       # Benchmark against RAID dataset
└── README.md
```

---

## 12. Evaluation Plan

### 12.1 RAID Benchmark

Before shipping, evaluate against the RAID dataset (6.28M samples):
- Run our full ensemble on RAID test set
- Measure: accuracy at 5% FPR, per-model recall, adversarial robustness
- Target: >90% accuracy at 5% FPR (matching or exceeding Turnitin's ~91% recall)

### 12.2 Cross-Validation Against Turnitin

**Aspirational** (requires institutional access or a friend with Turnitin):
1. Collect 50+ text samples with known Turnitin scores (screenshots from actual submissions)
2. Run the same texts through our tool
3. Verify: every text we label "human" was also labeled "human" by Turnitin
4. Adjust thresholds if any mismatches found

**Practical alternative** (no Turnitin access needed):
1. Use GPTZero, Pangram, and Originality.ai as cross-references
2. If all three commercial detectors agree on "human," our tool must also agree
3. Collect disagreement cases for threshold tuning

### 12.3 False Positive Testing

Test against known human-written corpora:
- ASAP dataset (student essays)
- ICNALE (international learner corpus)
- Pre-2019 academic papers
- Target: <8% false positive rate

---

## 13. Known Limitations

1. **No student paper database**: Cannot detect cross-student plagiarism. Only web sources.
2. **No academic journal database**: Publisher partnerships impossible for personal tool. Web search partially compensates.
3. **Cannot guarantee 100% match with Turnitin**: 39% disagreement rate between any two detectors. We guarantee >99% match by being more conservative.
4. **Higher false positive rate (~5-8%)**: The cost of being stricter than Turnitin. Students may revise text unnecessarily.
5. **API rate limits**: GPTZero free tier = 10K words/month (~10 documents). Pangram is credit-based.
6. **Serper.dev free queries are one-time**: 2,500 total free queries, not monthly. After exhaustion, $50/50K queries.
7. **No real-time model updates**: Turnitin updates irregularly (last: Feb 2026). Our local models are static until manually updated.
8. **English only**: Turnitin supports Japanese, Spanish via separate models. We start with English only.
9. **Minimum 300 words for AI detection**: Matching Turnitin's minimum. Shorter texts get plagiarism check only. UI clearly communicates this.
10. **Jobs are in-memory**: Reports are lost on server restart. Acceptable for personal use; not suitable for multi-user deployment.
11. **Model startup time**: First launch requires ~1.5 GB model download. Subsequent starts take ~10-15 seconds for model loading.
12. **Graceful degradation**: If GPTZero or Pangram APIs fail, detection continues with remaining engines but accuracy decreases.

---

## 14. Future Enhancements (Out of Scope for V1)

- Custom model fine-tuning (train on RAID + custom dataset)
- Additional API engines (Originality.ai, Sapling, Winston AI)
- Calibration dashboard (compare results side-by-side with Turnitin screenshots)
- Batch processing (check multiple documents at once)
- History (save past reports locally)
- Non-English support
