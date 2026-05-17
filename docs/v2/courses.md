# Courses — Data Model & Progress

## Where a Course Lives

When a course is created it lands in the `courses` table in Supabase (PostgreSQL). One row per course.

```
courses
├── id                   UUID PK
├── user_id              FK → auth.users (CASCADE DELETE)
├── title                TEXT
├── generated_course     JSONB   ← entire lesson tree lives here
├── generation_status    TEXT    'processing' | 'partial' | 'generating' | 'complete' | 'failed'
├── lessons_ready        INTEGER (progressive generation counter)
├── total_lessons        INTEGER
├── intensity_mode       TEXT    'quick' | 'standard' | 'deep_practice'
├── source_type          TEXT    'image' | 'pdf' | 'pptx' | 'docx' | 'text'
├── original_image_url   TEXT    (legacy single image)
├── image_urls           TEXT[]  (multi-page)
├── document_url         TEXT    (PDF / PPTX / DOCX)
├── extracted_content    TEXT    raw OCR / parse output
├── cover_image_url      TEXT
├── lesson_outline       JSONB   outline used during progressive generation
├── document_summary     TEXT
├── content_language     TEXT    'en' | 'he'
└── created_at / updated_at
```

There is **no separate `lessons` table**. Lessons are stored entirely inside `generated_course` as JSONB.

---

## Course Content Structure (JSONB)

`generated_course` holds the full `GeneratedCourse` object defined in `types/index.ts`.

```
GeneratedCourse
├── title           string
├── overview        string
├── lessons         Lesson[]
│   └── title       string
│   └── steps       Step[]
│       ├── type    StepType
│       ├── content string
│       ├── title?  string
│       ├── options?         string[]   (multiple-choice answers)
│       ├── correct_answer?  number     (0-based index)
│       ├── explanation?     string
│       ├── imageUrl?        string
│       └── diagramData?     { type, data, visibleStep, totalSteps, stepConfig }
├── images?         CourseImage[]
└── learningObjectives? LearningObjective[]
```

**StepType values:** `explanation` | `key_point` | `question` | `formula` | `diagram` | `example` | `summary` | `worked_example` | `practice_problem`

Lessons and steps are accessed by **0-based integer index** — there are no separate IDs for them.

---

## How Progress Relates to Courses

Progress is tracked across two tables. They complement each other.

### `user_progress` — navigation state

One row per (user, course) pair. Tracks where the user currently is.

```
user_progress
├── user_id              FK → auth.users
├── course_id            FK → courses
├── current_lesson       INTEGER   index into generated_course.lessons[]
├── current_step         INTEGER   index into lessons[current_lesson].steps[]
├── completed_lessons    INTEGER[] sorted array of completed lesson indices
├── questions_answered   INTEGER
├── questions_correct    INTEGER
└── updated_at
```

When a lesson is marked complete (`POST /api/courses/[id]/progress/complete-lesson`):
- `completed_lessons[]` gains the lesson index (deduped, sorted)
- `current_lesson` advances to the next uncompleted lesson
- `current_step` resets to `0`

### `lesson_progress` — mastery tracking

One row per (user, course, lesson_index). Tracks how well the user knows each lesson.

```
lesson_progress
├── user_id, course_id, lesson_index   (unique together)
├── lesson_title         TEXT
├── completed            BOOLEAN
├── completed_at         TIMESTAMPTZ
├── mastery_level        DECIMAL(4,3)  0.000 – 1.000
├── total_attempts       INTEGER
├── total_correct        INTEGER
├── total_time_seconds   INTEGER
└── last_studied_at
```

**Mastery formula:** `base_accuracy × recency_weight`, sourced from `step_performance` rows.

| Time since last studied | Weight |
|-------------------------|--------|
| < 1 day                 | 1.00   |
| 1 – 3 days              | 0.95   |
| 3 – 7 days              | 0.85   |
| 7 – 14 days             | 0.70   |
| > 14 days               | 0.60   |

### `step_performance` — raw attempt log

Each answered question writes a row here. `lesson_progress.mastery_level` is recalculated from these rows whenever `POST /api/lesson-progress` is called.

---

## Relationships at a Glance

```
auth.users (1)
  └─► courses (N)                         one course per upload
        └─► user_progress (N)             one row per (user, course)
        └─► lesson_progress (N)           one row per (user, course, lesson_index)
              └─◄ step_performance (N)    source for mastery calculation
        └─► review_cards (N)              SRS flashcards generated from course
        └─► help_requests (N)             in-lesson help sessions
```

---

## Key API Routes

| Method | Route | Purpose |
|--------|-------|---------|
| POST | `/api/generate-course` | Create course from image/PDF/text (streaming) |
| POST | `/api/courses/manual` | Create empty course by title |
| GET | `/api/courses/[id]/progress` | Read current navigation state |
| PATCH | `/api/courses/[id]/progress` | Update `current_lesson`, `current_step` |
| POST | `/api/courses/[id]/progress/complete-lesson` | Mark lesson done, advance pointer |
| POST | `/api/lesson-progress` | Upsert lesson mastery metrics |

---

## Relevant Files

| What | Path |
|------|------|
| Table definitions | `supabase/complete-schema.sql` |
| Progress migration | `supabase/migrations/20241129_progress_tracking.sql` |
| TypeScript types | `types/index.ts` |
| Course generation logic | `app/api/generate-course/route.ts` |
| Progress CRUD | `app/api/courses/[id]/progress/route.ts` |
| Complete-lesson logic | `app/api/courses/[id]/progress/complete-lesson/route.ts` |
| Mastery upsert | `app/api/lesson-progress/route.ts` |
