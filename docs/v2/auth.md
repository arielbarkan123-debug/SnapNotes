# Auth & User Data

> Last updated: 2026-05-07

## Overview

Auth is handled entirely by **Supabase Auth** (JWT stored in HTTP-only cookies via `@supabase/ssr`). There is no custom auth table — Supabase manages `auth.users`. Application user data lives in separate `public.*` tables linked by `user_id`.

---

## Sign-In Flow

```
User submits login form
  → supabase.auth.signInWithPassword({ email, password })
  → Supabase returns { user, session }
  → @supabase/ssr sets session cookies in browser
  → redirect to /dashboard
  → middleware.ts runs on every subsequent request:
      updateSession() → supabase.auth.getUser() → validates + refreshes cookies
```

**File**: `app/(auth)/login/page.tsx`

---

## Sign-Up Flow

```
User submits signup form (name, email, password)
  → supabase.auth.signUp({ email, password, options: { data: { name }, emailRedirectTo: '/auth/callback' } })
  → auth.users record created with user_metadata.name
  → Verification email sent
  → User clicks link → /auth/callback?code=... or ?token_hash=...&type=signup
      - Same device:   exchangeCodeForSession(code)  [PKCE]
      - Cross-device:  verifyOtp({ token_hash, type }) [token hash]
  → Session cookies set → redirect to /dashboard
  → Welcome email sent (fire-and-forget)
```

**Files**: `app/(auth)/signup/page.tsx`, `app/auth/callback/route.ts`

---

## Session Management

| Layer | File | Responsibility |
|-------|------|---------------|
| Browser client | `lib/supabase/client.ts` | `createBrowserClient` with anon key |
| Server client | `lib/supabase/server.ts` | `createServerClient` with cookie adapter; 30s fetch timeout |
| Service role | `lib/supabase/server.ts` | `createServiceClient()` — bypasses RLS, server-only |
| Middleware | `lib/supabase/middleware.ts` | `updateSession()` — refreshes cookies on every request |
| Route guard | `middleware.ts` | Redirects unauthenticated users to `/login?redirectTo=` |

**Cookie names** (managed by Supabase SSR):
- `sb-{project-ref}-auth-token` — access token
- `sb-{project-ref}-auth-token-code-verifier` — PKCE verifier

---

## Where User Data Lives

### `auth.users` (Supabase-managed)

| Field | Notes |
|-------|-------|
| `id` | UUID — the primary user identifier used everywhere |
| `email` | Login email |
| `email_confirmed_at` | NULL until verification |
| `raw_user_meta_data` | JSONB — contains `{ name, study_system }` |

Access via `supabase.auth.getUser()` — never query `auth.users` directly.

#### Display name

The display name is stored as `user_metadata.name`. It is set at signup and updated via:

```ts
// app/(main)/settings/page.tsx:227
supabase.auth.updateUser({ data: { name: settings.displayName, study_system: settings.studySystem } })
```

There is no separate `display_name` column in any `public.*` table. Read it back as `user.user_metadata.name`.

---

### `public.user_learning_profile` — 1 row per user

Stores curriculum settings, learning preferences, and analytics.

```sql
user_id UUID UNIQUE FK → auth.users

-- Preferences
preferred_session_length  INTEGER   DEFAULT 15        -- minutes
preferred_time_of_day     TEXT
speed_preference          TEXT      DEFAULT 'normal'
hint_usage_rate           DOUBLE    DEFAULT 0

-- Analytics (computed/updated by app)
avg_session_length_ms     INTEGER
avg_cards_per_session     INTEGER
peak_performance_hour     INTEGER
most_active_day           INTEGER
sessions_per_week         DOUBLE

-- Curriculum
education_level           TEXT      DEFAULT 'high_school'
grade                     TEXT
study_system              TEXT      DEFAULT 'general'   -- ib | uk | ap | israeli_bagrut | us | general
subjects                  TEXT[]    DEFAULT []
subject_levels            JSONB     DEFAULT {}          -- { subjectId: level }
exam_format               TEXT      DEFAULT 'match_real'

-- Language
language                  TEXT      DEFAULT 'en'        -- 'en' | 'he'

-- Parent/Reports
parent_email              TEXT
reports_enabled           BOOLEAN   DEFAULT false
last_report_sent          TIMESTAMPTZ
last_nudge_sent_at        TIMESTAMPTZ

-- SRS
fsrs_params               JSONB

updated_at                TIMESTAMPTZ DEFAULT now()
```

**Schema ref**: `supabase/complete-schema.sql` lines 86–111

---

### `public.user_gamification` — 1 row per user

```sql
user_id UUID UNIQUE FK → auth.users

total_xp                  INTEGER   DEFAULT 0
current_level             INTEGER   DEFAULT 1
current_streak            INTEGER   DEFAULT 0
longest_streak            INTEGER   DEFAULT 0
last_activity_date        DATE
lessons_completed         INTEGER   DEFAULT 0
cards_reviewed            INTEGER   DEFAULT 0
perfect_lessons           INTEGER   DEFAULT 0
total_cards_reviewed      INTEGER   DEFAULT 0
total_courses_completed   INTEGER   DEFAULT 0
```

**Schema ref**: `supabase/complete-schema.sql` lines 114–129

---

### `public.user_srs_settings` — 1 row per user

```sql
user_id UUID UNIQUE FK → auth.users

target_retention          DOUBLE    DEFAULT 0.9
max_new_cards_per_day     INTEGER   DEFAULT 20
max_reviews_per_day       INTEGER   DEFAULT 200
```

**Schema ref**: `supabase/complete-schema.sql` lines 132–140

---

### Other user-scoped tables (many rows per user)

| Table | Key fields |
|-------|-----------|
| `public.user_progress` | course_id, current_lesson, current_step, completed_lessons[], questions_answered/correct |
| `public.user_achievements` | FK to achievements, earned_at |
| `public.review_cards` | FSRS card state: stability, difficulty, state, due_date |
| `public.courses` | user's created courses (generated_course JSONB) |
| `public.reflections` | reflection_type, learned, challenges, rating |

---

## RLS

All `public.*` user tables enforce:

```sql
USING (auth.uid() = user_id)
```

Users can only read/write their own rows. The service role client bypasses RLS for admin operations.

---

## Security Notes

- **Email enumeration prevention**: Forgot-password always returns success regardless of whether email exists.
- **Rate limiting**: Forgot-password keyed by `IP:email`; resend cooldown 60s (5min on rate limit).
- **Dual-mode email verification**: PKCE (same device) + token hash (cross-device, e.g. mobile).
- **Service role key**: Never exposed to the client — only used in server-side API routes.

---

## Improvements

### Consolidate user data into a `public.users` table

**Problem**: User identity fields (`name`, `email`, `study_system`) are scattered across `auth.users.raw_user_meta_data` (a JSONB blob we don't control) and multiple `public.*` tables. This makes queries awkward, schema evolution risky, and display name a special-case.

**Proposal**: Introduce a single `public.users` table as the canonical user record, synced from `auth.users` via a trigger.

```sql
CREATE TABLE public.users (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  name          TEXT,                        -- display name (was user_metadata.name)
  avatar_url    TEXT,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

-- Auto-populate on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'name'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

**What moves out of `user_metadata`**:

| Field | Current location | New location |
|-------|-----------------|--------------|
| `name` (display name) | `auth.users.raw_user_meta_data.name` | `public.users.name` |
| `email` | `auth.users.email` | `public.users.email` (synced) |
| `study_system` | `auth.users.raw_user_meta_data.study_system` | `public.user_learning_profile.study_system` (already there — remove from metadata) |

**What stays separate** (no change): `user_learning_profile`, `user_gamification`, `user_srs_settings` — these are domain tables, not identity. They keep their `user_id FK → auth.users` and are joined via `public.users.id` when needed.

**Code changes required**:
- `app/(main)/settings/page.tsx:227` — replace `supabase.auth.updateUser({ data: { name } })` with `supabase.from('users').update({ name }).eq('id', user.id)`
- Any place reading `user.user_metadata.name` or `user.user_metadata.full_name` — read from `public.users.name` instead
- `app/(auth)/signup/page.tsx` — no change needed (trigger handles row creation)
- `app/auth/callback/route.ts` — no change needed

**RLS**:
```sql
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own row" ON public.users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own row" ON public.users FOR UPDATE USING (auth.uid() = id);
```

**Migration risk**: ~943 references to `user_metadata`/`auth.getUser` fields in the codebase. Most read `user.id` or `user.email` directly from the session (no change needed) — only reads of `user_metadata.name` and writes via `auth.updateUser` need updating. Estimate: ~10–15 call sites.
