# Day 0: Pre-Implementation Setup

## Goal
Prepare the codebase for the 9-feature sprint. Install dependencies, create database migration, verify baseline health. This MUST complete before any feature work begins.

---

## Project Context

**NoteSnap** is an AI-powered homework checker and learning assistant built with:
- **Framework**: Next.js 14 (App Router) at `/Users/curvalux/NoteSnap`
- **Database**: Supabase (Auth + PostgreSQL)
- **Styling**: Tailwind CSS with dark mode (`dark:` classes)
- **i18n**: next-intl with EN + HE (Hebrew RTL)
- **AI**: Anthropic Claude via `@anthropic-ai/sdk`
- **Diagrams**: 4-pipeline engine (E2B, TikZ, Matplotlib, Recraft)
- **Production URL**: https://snap-notes-j68u-three.vercel.app/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

---

## Step 1: Verify Baseline Health

Run these commands and ensure ALL pass before proceeding:

```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit          # Zero TypeScript errors
npm test                   # All tests pass
npm run build              # Clean build
```

If any fail, fix them FIRST. Do not proceed with broken baseline.

---

## Step 2: Install New Dependencies

```bash
npm install resend @react-email/components
```

**Why these packages:**
- `resend` — Email delivery service for parent weekly reports (Day 5)
- `@react-email/components` — React components for building email templates (Day 5)

**Verify installation:**
```bash
grep '"resend"' package.json
grep '"@react-email/components"' package.json
```

Both should show version numbers.

---

## Step 3: Create Combined Supabase Migration

Create file: `supabase/migrations/20260301_feature_sprint_tables.sql`

First check if the migrations directory exists:
```bash
ls /Users/curvalux/NoteSnap/supabase/migrations/
```

**Migration content:**

```sql
-- ============================================================================
-- NoteSnap Feature Sprint: Combined Migration
-- Created: 2026-03-01
-- Features: Mistake Patterns (Day 4), Cheatsheets (Day 6), Parent Reports (Day 5)
-- ============================================================================

-- ─── Mistake Patterns Table (Day 4) ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mistake_patterns (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  patterns JSONB NOT NULL,
  insufficient_data BOOLEAN DEFAULT false,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  stale_after TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mistake_patterns_user ON mistake_patterns(user_id);
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_stale ON mistake_patterns(stale_after);

ALTER TABLE mistake_patterns ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'mistake_patterns' AND policyname = 'Users manage own patterns'
  ) THEN
    CREATE POLICY "Users manage own patterns" ON mistake_patterns
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- ─── Cheatsheets Table (Day 6) ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS cheatsheets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  course_id UUID REFERENCES courses(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  title_he TEXT,
  blocks JSONB NOT NULL DEFAULT '[]',
  is_public BOOLEAN DEFAULT false,
  share_token TEXT UNIQUE,
  exam_mode BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cheatsheets_user ON cheatsheets(user_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_course ON cheatsheets(course_id);
CREATE INDEX IF NOT EXISTS idx_cheatsheets_share ON cheatsheets(share_token) WHERE share_token IS NOT NULL;

ALTER TABLE cheatsheets ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Users manage own cheatsheets'
  ) THEN
    CREATE POLICY "Users manage own cheatsheets" ON cheatsheets
      FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'cheatsheets' AND policyname = 'Public cheatsheets readable'
  ) THEN
    CREATE POLICY "Public cheatsheets readable" ON cheatsheets
      FOR SELECT USING (is_public = true);
  END IF;
END $$;

-- ─── Parent Reports Columns (Day 5) ─────────────────────────────────────────

ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS parent_email TEXT;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS reports_enabled BOOLEAN DEFAULT false;
ALTER TABLE user_learning_profile ADD COLUMN IF NOT EXISTS last_report_sent TIMESTAMPTZ;
```

---

## Step 4: Apply Migration to Supabase

Go to the Supabase Dashboard SQL editor:
1. Open https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox/sql
2. Paste the migration SQL
3. Run it
4. Verify tables exist:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('mistake_patterns', 'cheatsheets');
```

Should return both table names.

Verify columns added:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'user_learning_profile'
AND column_name IN ('parent_email', 'reports_enabled', 'last_report_sent');
```

Should return all 3 column names.

---

## Step 5: Verify Everything Still Works

```bash
cd /Users/curvalux/NoteSnap
npx tsc --noEmit          # Still zero TS errors
npm test                   # Still all tests pass
npm run build              # Still clean build
```

---

## Step 6: Confirm Existing Dependencies

These packages are already installed and will be used by the sprint features. Verify they exist:

```bash
# TipTap (for cheatsheet rich text - Day 6)
grep '"@tiptap/react"' package.json

# Framer Motion (for animations - Day 1, 2, 3, 4)
grep '"framer-motion"' package.json

# KaTeX (for math rendering - Day 3, 6)
grep '"katex"' package.json

# SWR (for data fetching - Day 4, 5)
grep '"swr"' package.json

# Sharp (for image processing)
grep '"sharp"' package.json
```

All should return version numbers.

---

## Completion Checklist

- [ ] `npx tsc --noEmit` — zero errors
- [ ] `npm test` — all pass
- [ ] `npm run build` — clean
- [ ] `resend` installed in package.json
- [ ] `@react-email/components` installed in package.json
- [ ] Migration file created at `supabase/migrations/20260301_feature_sprint_tables.sql`
- [ ] Migration applied in Supabase dashboard
- [ ] `mistake_patterns` table exists
- [ ] `cheatsheets` table exists
- [ ] `user_learning_profile` has `parent_email`, `reports_enabled`, `last_report_sent` columns
- [ ] TipTap, Framer Motion, KaTeX, SWR all confirmed in package.json

---

## What's Next

Once all checks pass, proceed to **Day 1: Step-by-Step Animated Diagram Breakdowns** (`day1-step-sequence.md`).
