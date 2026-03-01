# Sprint Verification & Deployment Plan

**Date:** 2026-03-01
**Context:** 9 features were coded across Days 0-6 but never tested in a browser, never had the database migration applied, and were never deployed. This plan covers everything needed to go from "code exists" to "verified and deployed."

## Current State

### What Exists (Code Written)
- Day 1: Step-by-step animated diagram breakdowns
- Day 2: 5 explanation styles (ELI5, Socratic, Visual Builder, Worked Example, Step-by-Step)
- Day 3: Formula scanner with LaTeX + image input
- Day 4: Mistake pattern detector + gap auto-router
- Day 5: Parent email reports + exam prediction
- Day 6: YouTube → Course + AI cheatsheets

### What's Missing
- **Database:** `mistake_patterns`, `cheatsheets` tables don't exist; `parent_email` column missing
- **Env vars:** `RESEND_API_KEY` and `CRON_SECRET` not configured
- **Testing:** Zero browser testing, zero new tests, zero visual verification
- **Deployment:** All code uncommitted, nothing deployed

---

## Phase 1: Infrastructure (User Action Required)

### 1.1 Apply Supabase Migration
Run the SQL from `supabase/migrations/20260301_feature_sprint_tables.sql` in the Supabase SQL Editor:
- Creates `mistake_patterns` table with RLS
- Creates `cheatsheets` table with RLS
- Adds `parent_email`, `reports_enabled`, `last_report_sent` to `user_learning_profile`

### 1.2 Set Environment Variables
In `.env.local`:
```
RESEND_API_KEY=re_xxxxx  (from resend.com dashboard)
CRON_SECRET=some-random-secret-string
```

In Vercel project settings (for production):
- Same two env vars

### 1.3 Start Dev Server
```bash
npm run dev
```

### 1.4 User Logs In
User opens Chrome and logs into the app at localhost:3000. Then I can use Chrome browser tools to test.

---

## Phase 2: Feature-by-Feature Browser Testing

For EACH feature, test:
1. **Happy path** — does the core flow work?
2. **Error path** — what happens with bad input?
3. **Dark mode** — toggle and verify
4. **Hebrew RTL** — switch language and verify
5. **Mobile** — resize to 375px width
6. **Fix bugs immediately** — don't accumulate

### Test 1: Step-by-Step Diagrams (Day 1)
- Navigate to homework tutoring chat
- Ask a multi-step math question
- Verify step sequence player appears
- Test: forward/back arrows, step dots, keyboard navigation
- Ask a concept question → verify single diagram (not step sequence)

### Test 2: Explanation Styles (Day 2)
- Find style selector in tutoring chat
- Select each of 5 styles → verify different response format
- Refresh page → verify style persists (localStorage)

### Test 3: Formula Scanner (Day 3)
- Navigate to /formula-scanner from sidebar
- Type LaTeX → verify KaTeX preview
- Click Analyze → verify symbol breakdown
- Test image upload mode
- Test empty submit → error

### Test 4: Mistake Patterns (Day 4A)
- Navigate to /dashboard
- Check if MistakeInsightsCard renders (may need practice data)
- If no data → verify "insufficient data" message
- If data → click "Fix This" → remediation modal

### Test 5: Gap Auto-Router (Day 4B)
- Start practice session
- Intentionally get answers wrong
- Check if gap detection banner appears

### Test 6: Parent Reports (Day 5A)
- Navigate to /settings
- Find Parent Reports section
- Enter email, toggle on
- Click "Send Test Report"
- Verify email arrives (if RESEND_API_KEY set)

### Test 7: Exam Prediction (Day 5B)
- Navigate to past exams page
- Check if prediction panel renders
- If <3 papers → verify "upload more" message

### Test 8: YouTube → Course (Day 6A)
- Open upload modal → YouTube tab visible
- Paste a YouTube URL
- Click generate → streaming progress
- Course generates with lessons

### Test 9: Cheatsheets (Day 6B)
- Navigate to /cheatsheets from sidebar
- Open a course → click "Generate Cheatsheet"
- Verify blocks render (formulas, definitions, key facts)
- Toggle exam mode
- Test print button
- Test delete

---

## Phase 3: Cross-Cutting Quality Checks

### 3.1 Dark Mode Sweep
Toggle dark mode → navigate through every new page:
- /formula-scanner
- /cheatsheets
- /cheatsheets/[id]
- /dashboard (insights card)
- /settings (parent reports section)
- Tutoring chat (style selector, step sequence)

### 3.2 Hebrew RTL Sweep
Switch to Hebrew → same pages:
- Verify all labels translated
- Verify layout doesn't break
- Verify step sequence arrows flip

### 3.3 Mobile Responsive Sweep (375px)
Resize viewport → same pages:
- No horizontal overflow
- Buttons reachable
- Text readable

---

## Phase 4: Write Critical Path Tests

New test files for sprint API routes:
- `__tests__/api/formula-scanner.test.ts`
- `__tests__/api/cheatsheets.test.ts`
- `__tests__/api/insights-mistakes.test.ts`
- `__tests__/api/reports-weekly.test.ts`
- `__tests__/api/exam-prediction.test.ts`
- `__tests__/api/youtube-course.test.ts`

Each test covers:
- Auth required (401 without user)
- Happy path returns correct shape
- Validation errors return 400
- Mocked AI/DB calls

---

## Phase 5: Commit, Deploy, Smoke Test

### 5.1 Final Quality Gate
```bash
npx tsc --noEmit  # zero errors
npm test          # all pass (existing + new)
npm run build     # clean (ignore pre-existing env var issue)
npx next lint     # zero errors
```

### 5.2 Commit
Stage all sprint files. Commit with descriptive message.

### 5.3 Deploy
```bash
vercel --prod
```
Or push to trigger auto-deploy.

### 5.4 Production Smoke Test
On production URL, verify:
1. /formula-scanner loads
2. /cheatsheets loads
3. Upload modal has YouTube tab
4. Dashboard shows insights card area
5. Settings shows parent reports
6. Dark mode works
7. Hebrew works

---

## Bug Fix Protocol

When a bug is found:
1. Screenshot it
2. Fix immediately
3. Re-verify the fix
4. Run TS check + tests
5. Continue testing

---

## Success Criteria

The sprint is DONE when:
- [ ] All 9 features work in a real browser (not just compile)
- [ ] Dark mode verified on every new page
- [ ] Hebrew verified on every new page
- [ ] Mobile verified on every new page
- [ ] At least 6 new API test files written
- [ ] Zero TS errors, zero ESLint errors, all tests pass
- [ ] Deployed to production
- [ ] Production smoke test passed
