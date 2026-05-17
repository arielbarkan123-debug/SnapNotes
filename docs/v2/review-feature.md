# Review Feature (Spaced Repetition System)

SnapNotes implements a full Free Spaced Repetition Scheduler (FSRS) for long-term retention. Cards are generated from course content, scheduled using a forgetting-curve algorithm, and reviewed in daily sessions.

---

## Database Schema

### `review_cards`

The primary table. One row per flashcard, per user.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Card identifier |
| `user_id` | UUID FK → `auth.users` | Owner |
| `course_id` | UUID FK → `courses` | Source course |
| `lesson_index` | INTEGER | Position in course |
| `step_index` | INTEGER | Position in lesson |
| `card_type` | TEXT | One of: `flashcard`, `multiple_choice`, `true_false`, `fill_blank`, `short_answer`, `matching`, `sequence`, `key_point`, `explanation`, `formula`, `question` |
| `front` | TEXT | Question / prompt |
| `back` | TEXT | Answer — plain text, or JSON string for interactive types |
| `concept_ids` | UUID[] | Linked concept UUIDs (knowledge graph) |
| `stability` | DOUBLE PRECISION | FSRS: memory half-life in days (default `0`) |
| `difficulty` | DOUBLE PRECISION | FSRS: relative hardness 0.1–1.0 (default `0.3`) |
| `elapsed_days` | INTEGER | Days since last review (default `0`) |
| `scheduled_days` | INTEGER | Interval used for last scheduling (default `0`) |
| `reps` | INTEGER | Total review count (default `0`) |
| `lapses` | INTEGER | Times forgotten / rated Again (default `0`) |
| `state` | TEXT | `new` → `learning` → `review` ↔ `relearning` |
| `due_date` | TIMESTAMPTZ | Next review date (default `now()`) |
| `last_review` | TIMESTAMPTZ | Timestamp of last review (nullable) |
| `created_at` | TIMESTAMPTZ | Card creation time |
| `updated_at` | TIMESTAMPTZ | Last modified time |

**Unique constraint:** `(user_id, course_id, lesson_index, step_index)` — prevents duplicate cards per content item.

**Key indexes:**
- `idx_review_cards_user_due` on `(user_id, due_date)` — fetching due cards
- `idx_review_cards_user_state_due` on `(user_id, state, due_date)` — filtering by state
- `idx_review_cards_concept_ids` GIN — searching by concept ID

---

### `review_logs`

One row per review event. Immutable history.

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Log entry identifier |
| `card_id` | UUID FK → `review_cards` | Card reviewed |
| `user_id` | UUID FK → `auth.users` | Reviewer |
| `course_id` | UUID FK → `courses` | Context course |
| `lesson_index` | INTEGER | Context lesson |
| `rating` | INTEGER | 1 = Again, 2 = Hard, 3 = Good, 4 = Easy |
| `review_duration_ms` | INTEGER | Time spent on card (nullable) |
| `difficulty_feedback` | TEXT | User-submitted feedback: `too_easy` or `too_hard` (nullable) |
| `reviewed_at` | TIMESTAMPTZ | When the review occurred (default `now()`) |

**Constraint:** `rating` must be 1–4.

**Key index:** `idx_review_logs_user_reviewed` on `(user_id, reviewed_at DESC)`.

---

### `review_sessions`

One row per review session (daily or targeted).

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | Session identifier |
| `user_id` | UUID FK → `auth.users` | Owner |
| `session_type` | TEXT | `daily`, `targeted`, `gap_fix`, `custom` |
| `total_cards` | INTEGER | Total cards in session |
| `review_cards` | INTEGER | Existing (non-new) cards |
| `new_cards` | INTEGER | First-time cards |
| `gap_cards` | INTEGER | Cards targeting knowledge gaps |
| `reinforcement_cards` | INTEGER | Cards for decaying concepts |
| `target_concept_ids` | UUID[] | Concepts to focus on (nullable) |
| `cards_completed` | INTEGER | Cards the user finished |
| `cards_correct` | INTEGER | Cards answered correctly |
| `average_rating` | DECIMAL(3,2) | Mean rating across completed cards |
| `gaps_addressed` | UUID[] | Gap concept IDs resolved this session |
| `started_at` | TIMESTAMPTZ | Session start time |
| `completed_at` | TIMESTAMPTZ | Session end time (nullable) |
| `total_time_seconds` | INTEGER | Duration in seconds |
| `status` | TEXT | `active`, `completed`, `abandoned` |

---

### `user_srs_settings`

One row per user. Controls scheduling limits.

| Column | Type | Default | Description |
|--------|------|---------|-------------|
| `target_retention` | DOUBLE PRECISION | `0.9` | Target recall probability (0.7–0.97) |
| `max_new_cards_per_day` | INTEGER | `20` | Daily new card limit |
| `max_reviews_per_day` | INTEGER | `200` | Daily review card limit |

---

### Knowledge Graph Tables

These support gap detection and concept mastery tracking.

**`concepts`** — shared concept definitions (subject / topic / subtopic / name).

**`concept_prerequisites`** — directed edges in the concept graph (prerequisite → concept).

**`content_concepts`** — links course content (lesson + step) to concepts with a `relevance_score` and `relationship_type` (`teaches`, `requires`, `reinforces`).

**`user_concept_mastery`** — per-user mastery level (0–1) for each concept, with `peak_mastery` for decay detection and `next_review_date` for scheduling.

**`user_knowledge_gaps`** — identified gaps with `gap_type` (`missing_prerequisite`, `weak_foundation`, `decay`, `never_learned`), `severity` (`critical`, `moderate`, `minor`), and `resolved` flag.

---

## Card Generation

### Triggers

Cards are generated in two ways:

1. **Automatic** — during course generation (`app/api/generate-course/route.ts`). After AI produces course content, `generateCardsFromCourse()` is called as a fire-and-forget background operation. It does not block the course completion response.

2. **Manual** — via API:
   - `POST /api/srs/cards/generate` — single course (skips if cards already exist)
   - `POST /api/srs/cards/generate-all` — all user courses in bulk

### `generateCardsFromCourse()` — `lib/srs/card-generator.ts`

Accepts a `Course` object and returns `ReviewCardInsert[]`.

**Card types by source:**

| Source content | Card type | AI needed |
|---------------|-----------|-----------|
| `question` step with options | `multiple_choice` or `true_false` | No |
| `formula` step | `formula` | No (template) |
| `key_point` step | `flashcard` | Yes |
| `explanation` / `summary` step | `short_answer` | Yes |
| `keyConcepts` array (course-level) | `flashcard` | No (template) |

**AI batch generation** (`generateQuestionsFromContentBatch`):
- Groups content items into batches of 15
- Sends to Claude (claude-sonnet-4-6) with topic-aware prompting:
  - `computational` → notation-only math questions ("3/4 + 1/2 = ?")
  - `conceptual` → understanding questions ("Explain why warm fronts...")
  - `mixed` → at least 50% computation
- Language-aware: respects course `content_language` (Hebrew/English)

**Quality filter** (`isQuestionQualityAcceptable`):
- Rejects questions under 5 words (3 for Hebrew)
- Rejects questions over 120 characters
- Rejects garbage patterns ("What does when", "What is when")
- Rejects missing question marks (unless imperative: "Solve:", "Calculate:")
- Falls back to safe defaults if AI output is rejected

**All new cards are inserted with:**
```
state: 'new', stability: 0, difficulty: 0, reps: 0, lapses: 0,
elapsed_days: 0, scheduled_days: 0, due_date: now()
```

---

## FSRS Algorithm — `lib/srs/fsrs.ts`

FSRS models memory as a decaying function and schedules reviews to keep recall probability above the target retention (default 90%).

### Key variables

| Variable | Meaning |
|----------|---------|
| **Stability (S)** | Memory duration in days — higher = retained longer |
| **Difficulty (D)** | Card hardness 0.1–1.0 — higher = harder to stabilize |
| **Retention (R)** | Target recall probability (default `0.9`) |
| **State** | `new` → `learning` → `review` ↔ `relearning` |

### Initial values on first review

| Rating | Difficulty | Stability | Next interval |
|--------|-----------|-----------|---------------|
| 1 (Again) | 0.7 | 0.5d (~12h) | ~12 hours |
| 2 (Hard) | 0.6 | 1d | 1 day |
| 3 (Good) | 0.3 | 3d | 3 days |
| 4 (Easy) | 0.1 | 7d | 7 days |

### On subsequent reviews

**Difficulty update** (`calculateNextDifficulty`):
- Again → +0.15, Hard → +0.08, Good → −0.05, Easy → −0.10
- Clamped to [0.1, 1.0]

**Stability update** (`calculateNextStability`):
- Base multiplier: Hard 1.2×, Good 2.5×, Easy 3.5×, Again 0.2×
- Difficulty penalty: `× (1 − difficulty × 0.5)`
- Timing bonus: optimal when reviewed just before forgetting
- Capped at `maximumInterval` (36,500 days)

**Interval calculation** (`calculateNextInterval`):
```
interval = stability × ln(targetRetention) / ln(0.9)
```

**State machine:**
- `new` → first review → `learning` (short intervals) or `review` if rated Easy
- `learning` → repeated correct → graduates to `review`
- `review` → rated Again → drops to `relearning`
- `relearning` → correct again → returns to `review`

---

## Review Session Flow

### Session Composition — `lib/srs/daily-session.ts`

`generateDailySession()` assembles cards in priority order:

1. **Due cards** — `due_date ≤ now`, state ≠ `new` (ordered by `due_date` ascending)
2. **Gap-targeted cards** — linked to concepts with unresolved critical/moderate knowledge gaps (max 10)
3. **Reinforcement cards** — concepts where `mastery_level < 42%` of `peak_mastery` (30% decay threshold, max 5)
4. **New cards** — `state = 'new'`, ordered by `created_at` (limited by `max_new_cards_per_day`, default 10)

Cards are **interleaved** round-robin across sources to improve retention via mixed practice.

**Limits:** default 50 cards total, 10 new cards max.

---

### API Routes

All routes require authentication via `supabase.auth.getUser()`.

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `GET /api/srs/due` | GET | Fetch today's session cards |
| `POST /api/srs/review` | POST | Submit rating for a card |
| `GET /api/srs/stats` | GET | SRS dashboard statistics |
| `GET /api/srs/settings` | GET | Fetch user SRS settings |
| `PATCH /api/srs/settings` | PATCH | Update user SRS settings |
| `POST /api/srs/cards/generate` | POST | Generate cards for one course |
| `POST /api/srs/cards/generate-all` | POST | Generate cards for all courses |
| `POST /api/srs/optimize` | POST | Optimize per-user FSRS parameters |

**`POST /api/srs/review` — what happens on submission:**

1. Calculate `elapsed_days` from `last_review`
2. Load per-user FSRS parameters (falls back to global defaults)
3. Call `processReview(card, rating)` → new `stability`, `difficulty`, `state`, `due_date`
4. Update `review_cards` row
5. Insert `review_logs` entry
6. Update `user_concept_mastery`:
   - Rating ≥ 3 (correct): `mastery_level += 0.05` (capped at 1.0)
   - Rating < 3 (incorrect): `mastery_level -= 0.10` (floored at 0.0)
   - Update `peak_mastery` if new peak reached
   - If `mastery_level ≥ 0.5`, mark linked knowledge gaps as `resolved`

---

## End-to-End Data Flow

```
User uploads course material
        │
        ▼
AI generates GeneratedCourse (lessons + steps + formulas)
        │
        ▼
generateCardsFromCourse()
    ├─ question steps      → direct multiple_choice / true_false cards
    ├─ key_point steps     → AI batch → flashcard
    ├─ explanation steps   → AI batch → short_answer
    ├─ formula steps       → template → formula card
    └─ keyConcepts         → template → flashcard
        │
        ▼
INSERT review_cards (state='new', all FSRS fields = 0, due_date = now)
        │
        ▼
User visits /review
        │
        ▼
GET /api/srs/due
    Priority: due cards → gap cards → reinforcement → new cards
    Interleaved round-robin by source
        │
        ▼
User sees card (front / question)
        │
        ▼
User shows answer → rates 1–4
        │
        ▼
POST /api/srs/review
    1. FSRS calculates new stability, difficulty, due_date
    2. UPDATE review_cards
    3. INSERT review_logs
    4. UPDATE user_concept_mastery
    5. Resolve knowledge gaps if mastery ≥ 0.5
        │
        ▼
Next due_date stored → card surfaces again when due
```

---

## Key Source Files

| Area | File |
|------|------|
| TypeScript types | `types/srs.ts` |
| Card generation | `lib/srs/card-generator.ts` |
| FSRS algorithm | `lib/srs/fsrs.ts` |
| Session composition | `lib/srs/daily-session.ts` |
| FSRS optimizer | `lib/srs/fsrs-optimizer.ts` |
| Due cards API | `app/api/srs/due/route.ts` |
| Submit review API | `app/api/srs/review/route.ts` |
| Generate cards API | `app/api/srs/cards/generate/route.ts` |
| Review UI page | `app/(main)/review/page.tsx` |
| Database schema | `supabase/complete-schema.sql`, `supabase/schema.sql` |
