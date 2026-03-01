# Sprint Verification & Deployment — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Take 9 features from "code exists" to "verified in browser, tested, deployed to production."

**Architecture:** The sprint code is already written but uncommitted. We need to: (1) apply the Supabase migration so database-dependent features don't crash, (2) browser-test every feature via Chrome MCP tools on localhost:3000, (3) fix bugs found during testing, (4) write API route tests, (5) commit + deploy.

**Tech Stack:** Next.js 14 (App Router), Supabase, Jest, Chrome MCP tools for browser testing, Vercel for deploy.

---

## Task 1: Apply Supabase Migration

**Files:**
- Reference: `supabase/migrations/20260301_feature_sprint_tables.sql`

**Step 1: Open Supabase SQL Editor**

Navigate Chrome to: `https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox/sql/new`
(User must be logged into Supabase)

**Step 2: Run the migration SQL**

Paste the contents of `supabase/migrations/20260301_feature_sprint_tables.sql` into the SQL editor and execute. This creates:
- `mistake_patterns` table with RLS policy
- `cheatsheets` table with RLS policies
- `parent_email`, `reports_enabled`, `last_report_sent` columns on `user_learning_profile`

**Step 3: Verify tables exist**

Run verification queries:
```sql
SELECT COUNT(*) FROM information_schema.tables WHERE table_name IN ('mistake_patterns', 'cheatsheets');
-- Expected: 2

SELECT column_name FROM information_schema.columns WHERE table_name = 'user_learning_profile' AND column_name = 'parent_email';
-- Expected: 1 row
```

Also verify via REST API:
```bash
ANON_KEY=$(grep NEXT_PUBLIC_SUPABASE_ANON_KEY .env.local | cut -d= -f2)
curl -s "https://ybgkzqrpfdhyftnbvgox.supabase.co/rest/v1/mistake_patterns?select=id&limit=1" -H "apikey: $ANON_KEY" -H "Authorization: Bearer $ANON_KEY"
# Expected: [] (empty array, not error)
```

---

## Task 2: Set Environment Variables

**Files:**
- Modify: `.env.local`

**Step 1: Ask user for RESEND_API_KEY**

Ask the user: "Do you have a Resend API key? If yes, paste it. If not, I'll add a placeholder and we'll skip email testing."

**Step 2: Add env vars to .env.local**

```
RESEND_API_KEY=re_xxxxx
CRON_SECRET=notesnap-cron-secret-2026
```

**Step 3: Verify**

```bash
grep -E "^(RESEND|CRON)" .env.local | sed 's/=.*/=***/'
# Expected: RESEND_API_KEY=*** and CRON_SECRET=***
```

---

## Task 3: Start Dev Server + User Login

**Step 1: Start the dev server**

Use `preview_start` with name `next-dev` (from `.claude/launch.json`).

**Step 2: Verify server is running**

Check `preview_logs` for "Ready" message on port 3000.

**Step 3: User logs in**

Ask the user to log into the app at `http://localhost:3000` in Chrome.
Wait for confirmation before proceeding.

---

## Task 4: Browser Test — Formula Scanner (Day 3)

This is the simplest standalone page to test first.

**Step 1: Navigate to /formula-scanner**

Use Chrome browser tools to navigate to `http://localhost:3000/formula-scanner`.

**Step 2: Verify page loads**

Take screenshot. Verify:
- Page title "Formula Scanner" visible
- Two tabs: "Type Formula" and "Upload Image"
- Input area visible
- Dark mode compatible (if dark mode is on)

**Step 3: Test LaTeX input**

Type `E = mc^2` into the LaTeX input field.
Verify KaTeX live preview renders.

**Step 4: Test analyze button**

Click "Analyze" button. Wait for response (this calls the AI API).
Verify: Symbol breakdown appears with at least E, m, c.
Take screenshot of result.

**Step 5: Test empty submit**

Clear the input. Click Analyze. Verify error message shows.

**Step 6: Test dark mode**

Toggle dark mode. Take screenshot. Verify backgrounds are dark, text is light.

**Step 7: Test Hebrew**

Switch to Hebrew. Verify labels change. Verify RTL layout.

**Step 8: Test mobile (375px)**

Resize viewport to 375px width. Verify no horizontal overflow. Take screenshot.

**Step 9: Fix any bugs found**

If bugs are found, fix them in the source code, save, and re-verify.

**Step 10: Run quality gate**

```bash
npx tsc --noEmit && npm test
```

---

## Task 5: Browser Test — Cheatsheets (Day 6B)

**Step 1: Navigate to /cheatsheets**

Verify page loads with empty state ("No cheatsheets yet").
Verify sidebar shows "Cheatsheets" nav item.

**Step 2: Navigate to a course**

Go to /dashboard, click on an existing course.
Find the "Generate Cheatsheet" button.

**Step 3: Test cheatsheet generation**

Click "Generate Cheatsheet". Wait for AI generation (may take 30-60s).
Verify redirect to /cheatsheets/[id].
Verify blocks render: section headers, definitions, key facts with severity badges.

**Step 4: Test KaTeX formula rendering**

If any formula blocks exist, verify KaTeX renders properly (not raw LaTeX text).

**Step 5: Test exam mode toggle**

Toggle "Exam Mode" on. Verify content changes.

**Step 6: Test dark mode, Hebrew, mobile**

Same as Task 4 steps 6-8.

**Step 7: Fix bugs, run quality gate**

---

## Task 6: Browser Test — Upload Modal YouTube Tab (Day 6A)

**Step 1: Open upload modal**

From dashboard, click the create/upload button to open the upload modal.

**Step 2: Verify YouTube tab exists**

Third tab should show YouTube icon and label.
Click YouTube tab.

**Step 3: Verify YouTube UI**

URL input field visible. Placeholder text shows.
Submit button says correct label.

**Step 4: Test invalid URL**

Type "not a url" and click generate. Verify error message.

**Step 5: Test valid YouTube URL**

Paste: `https://www.youtube.com/watch?v=HvMSRWTE2mI`
Click generate. Verify streaming progress shows.
Wait for course generation (may take 1-3 minutes).
Verify redirect to processing page.

*Note: YouTube transcript extraction may fail if YouTube blocks scraping. If so, document the failure and we'll handle it as a known limitation.*

**Step 6: Fix bugs, run quality gate**

---

## Task 7: Browser Test — Dashboard Insights Card (Day 4A)

**Step 1: Navigate to /dashboard**

Verify MistakeInsightsCard renders somewhere on the dashboard.

**Step 2: Check data state**

If the user has 20+ practice answers: Card should show patterns with severity badges.
If not enough data: Card should show "Complete 20+ questions" message.
Either way, the card should NOT crash.

**Step 3: Test "Fix This" button (if data exists)**

Click "Fix This" on a pattern. Verify RemediationModal opens.
Answer a question. Verify correct/incorrect feedback.

**Step 4: Fix bugs, run quality gate**

---

## Task 8: Browser Test — Settings Parent Reports (Day 5A)

**Step 1: Navigate to /settings**

Scroll to "Parent Reports" section.

**Step 2: Verify UI**

- Email input field visible
- "Send weekly reports" toggle visible
- "Send Test Report" button visible

**Step 3: Test email input**

Enter an email address. Toggle reports on.
Click "Send Test Report".

If RESEND_API_KEY is configured: Verify email sends (check response).
If not: Verify graceful error, not crash.

**Step 4: Fix bugs, run quality gate**

---

## Task 9: Browser Test — Explanation Styles (Day 2)

**Step 1: Start a homework help session**

Navigate to /homework/check, upload an image or create a session.
Open the tutoring chat.

**Step 2: Find style selector**

Verify ExplanationStyleSelector component renders.
If no style selector visible, check where it's integrated.

**Step 3: Test style switching**

Select "ELI5" → ask a question → verify response uses simple language.
Select "Socratic" → ask a question → verify response asks questions back.

**Step 4: Test persistence**

Refresh the page. Verify selected style persists (localStorage).

**Step 5: Fix bugs, run quality gate**

---

## Task 10: Browser Test — Step Sequence (Day 1)

**Step 1: In tutoring chat, ask a multi-step question**

Type: "solve 2x + 5 = 15 step by step"
Wait for AI response.

**Step 2: Verify step sequence player**

If Visual Builder style is selected, verify StepSequencePlayer renders.
Check: Step dots, forward/back arrows, autoplay button.

**Step 3: Test navigation**

Click forward arrow → next step shows.
Click back arrow → previous step shows.
Click a step dot → jumps to that step.

**Step 4: Fix bugs, run quality gate**

---

## Task 11: Browser Test — Exam Prediction (Day 5B)

**Step 1: Navigate to /exams**

Look for ExamPredictionPanel on the page.

**Step 2: Check state**

If user has 3+ analyzed papers: Panel shows with prediction button.
If not: "Upload X more papers" message.

**Step 3: Test prediction (if data available)**

Click generate prediction. Verify topics with likelihood bars render.

**Step 4: Fix bugs, run quality gate**

---

## Task 12: Cross-Cutting Dark Mode Sweep

**Step 1: Ensure dark mode is ON**

Toggle to dark mode.

**Step 2: Visit each new page and screenshot**

1. `/formula-scanner` — screenshot
2. `/cheatsheets` — screenshot
3. `/dashboard` — look at insights card area
4. `/settings` — look at parent reports section
5. Tutoring chat — look at style selector

**Step 3: Identify any white backgrounds, unreadable text, wrong borders**

List all issues found. Fix them.

**Step 4: Run quality gate**

---

## Task 13: Cross-Cutting Hebrew RTL Sweep

**Step 1: Switch to Hebrew**

Toggle language to Hebrew.

**Step 2: Visit each new page**

Same pages as Task 12. Verify:
- All labels are in Hebrew (no English fallback visible)
- Layout flows right-to-left
- No overlapping text
- Step sequence arrows point correct direction for RTL

**Step 3: Fix any i18n issues found**

**Step 4: Run quality gate**

---

## Task 14: Cross-Cutting Mobile Sweep (375px)

**Step 1: Resize viewport to 375px width**

**Step 2: Visit each new page**

Same pages as Task 12. Verify:
- No horizontal scrollbar
- All buttons reachable and tappable (44px+ touch targets)
- Text doesn't overflow containers
- Modals fit on screen

**Step 3: Fix any responsive issues found**

**Step 4: Run quality gate**

---

## Task 15: Write API Tests — Formula Scanner

**Files:**
- Create: `__tests__/api/formula-scanner.test.ts`

**Step 1: Write test file**

Tests:
1. Returns 401 when not authenticated
2. Returns 400 when no formula provided (POST with empty body)
3. Returns 200 with correct shape when formula provided (mock Anthropic)

Mock pattern (same as existing tests):
```typescript
jest.mock('@/lib/supabase/server', () => ({
  createClient: jest.fn().mockResolvedValue({
    auth: {
      getUser: jest.fn().mockResolvedValue({
        data: { user: { id: 'test-user-id' } },
        error: null,
      }),
    },
  }),
}))

const mockCreate = jest.fn()
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: mockCreate },
  }))
})
```

**Step 2: Run test**

```bash
npx jest __tests__/api/formula-scanner.test.ts --verbose
```
Expected: PASS

---

## Task 16: Write API Tests — Cheatsheets

**Files:**
- Create: `__tests__/api/cheatsheets.test.ts`

**Tests:**
1. GET returns 401 when not authenticated
2. GET returns empty array for user with no cheatsheets (mock DB)
3. POST returns 400 when no courseId provided
4. POST returns 401 when not authenticated

---

## Task 17: Write API Tests — Insights/Mistakes

**Files:**
- Create: `__tests__/api/insights-mistakes.test.ts`

**Tests:**
1. GET returns 401 when not authenticated
2. GET returns data shape with patterns array (mock DB + AI)
3. POST forces regeneration (mock DB + AI)

---

## Task 18: Write API Tests — Reports Weekly

**Files:**
- Create: `__tests__/api/reports-weekly.test.ts`

**Tests:**
1. GET returns 401 when not authenticated
2. POST returns error when no parent email configured (mock DB)
3. send-all POST returns 401 without CRON_SECRET header

---

## Task 19: Write API Tests — Exam Prediction

**Files:**
- Create: `__tests__/api/exam-prediction.test.ts`

**Tests:**
1. POST returns 401 when not authenticated
2. POST returns 400 with empty examTemplateIds array
3. POST returns prediction shape (mock DB + AI)

---

## Task 20: Write API Tests — YouTube Course

**Files:**
- Create: `__tests__/api/youtube-course.test.ts`

**Tests:**
1. POST returns 401 when not authenticated
2. POST returns 400 with invalid/missing URL
3. POST starts SSE stream with valid URL (mock transcript extraction + AI)

---

## Task 21: Final Quality Gate

**Step 1: TypeScript check**

```bash
npx tsc --noEmit
```
Expected: zero errors

**Step 2: All tests pass**

```bash
npm test
```
Expected: All pass (571 existing + ~18 new = ~589)

**Step 3: ESLint check**

```bash
npx next lint 2>&1 | grep "Error:"
```
Expected: zero errors

**Step 4: Build check**

```bash
npm run build
```
Expected: Clean compile (the pre-existing env var page data collection issue is acceptable)

---

## Task 22: Commit All Sprint Code

**Step 1: Review what's being committed**

```bash
git status --short | grep -v ".playwright-mcp" | grep -v ".claude/" | grep -v ".devdata"
```

**Step 2: Stage sprint files**

Stage all new files (app/, components/, lib/, messages/, supabase/, __tests__/) and modified files.
Do NOT stage: `.playwright-mcp/`, `.claude/worktrees/`, `.devdata.db`, screenshot PNGs in root.

**Step 3: Commit**

```bash
git commit -m "feat: 9-feature sprint — formula scanner, cheatsheets, YouTube courses, mistake patterns, gap router, parent reports, exam prediction, explanation styles, step sequence

- Day 1: Step-by-step animated diagram breakdowns with StepSequencePlayer
- Day 2: 5 explanation styles (ELI5, Socratic, Visual Builder, Worked Example, Step-by-Step)
- Day 3: Formula scanner with LaTeX input + image upload
- Day 4: Mistake pattern detector + prerequisite gap auto-router
- Day 5: Parent email reports (Resend) + exam prediction engine
- Day 6: YouTube transcript → course pipeline + AI cheatsheet generator
- Day 7: Browser-tested all features, API tests, dark mode, Hebrew, mobile

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>"
```

---

## Task 23: Set Vercel Environment Variables

**Step 1: Ask user to set env vars in Vercel**

Navigate to: Vercel dashboard → project settings → Environment Variables
Add:
- `RESEND_API_KEY` = (same as .env.local)
- `CRON_SECRET` = `notesnap-cron-secret-2026`

---

## Task 24: Deploy to Production

**Step 1: Deploy**

```bash
git push origin main
```
(or `vercel --prod` if not auto-deploy)

**Step 2: Wait for deployment**

Check Vercel dashboard for deployment status.

---

## Task 25: Production Smoke Test

**Step 1: Navigate to production URL**

`https://snap-notes-j68u-three.vercel.app/`

**Step 2: Verify each feature loads**

1. Login works
2. `/formula-scanner` — page loads, tabs visible
3. `/cheatsheets` — page loads, empty state
4. Upload modal → YouTube tab visible
5. Dashboard → insights card area renders (empty state OK)
6. Settings → parent reports section visible
7. Toggle dark mode → new pages have dark backgrounds
8. Switch to Hebrew → new pages have Hebrew labels

**Step 3: Screenshot production state**

Take screenshots of key pages for evidence.

---

## Summary of All Tasks

| # | Task | Type | Est. Time |
|---|------|------|-----------|
| 1 | Apply Supabase migration | Infra | 5 min |
| 2 | Set environment variables | Infra | 3 min |
| 3 | Start dev server + user login | Infra | 3 min |
| 4 | Browser test: Formula Scanner | Test+Fix | 15 min |
| 5 | Browser test: Cheatsheets | Test+Fix | 20 min |
| 6 | Browser test: YouTube tab | Test+Fix | 15 min |
| 7 | Browser test: Dashboard insights | Test+Fix | 10 min |
| 8 | Browser test: Settings reports | Test+Fix | 10 min |
| 9 | Browser test: Explanation styles | Test+Fix | 15 min |
| 10 | Browser test: Step sequence | Test+Fix | 15 min |
| 11 | Browser test: Exam prediction | Test+Fix | 10 min |
| 12 | Dark mode sweep | Test+Fix | 15 min |
| 13 | Hebrew RTL sweep | Test+Fix | 15 min |
| 14 | Mobile sweep (375px) | Test+Fix | 15 min |
| 15 | API test: Formula scanner | Code | 10 min |
| 16 | API test: Cheatsheets | Code | 10 min |
| 17 | API test: Insights/mistakes | Code | 10 min |
| 18 | API test: Reports weekly | Code | 10 min |
| 19 | API test: Exam prediction | Code | 10 min |
| 20 | API test: YouTube course | Code | 10 min |
| 21 | Final quality gate | Verify | 5 min |
| 22 | Commit all sprint code | Git | 5 min |
| 23 | Set Vercel env vars | Infra | 3 min |
| 24 | Deploy to production | Deploy | 5 min |
| 25 | Production smoke test | Test | 10 min |

**Total estimated: ~4-5 hours** (including bug fix time)
