# Day 7: Integration Testing, Polish & Deploy

## Goal
Full user journey test of ALL 9 features. Fix any bugs found. Polish all UI (dark mode, mobile, RTL Hebrew). Deploy to production. This is the quality gate — nothing ships broken.

## Prerequisites
- Days 0-6 ALL completed
- `npm run build` passes
- ALL features implemented and individually tested

---

## Project Context

**NoteSnap** is a Next.js 14 (App Router) app deployed on Vercel.
- **Production**: https://snap-notes-j68u-three.vercel.app/
- **Supabase**: https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

---

## Phase 1: Codebase Health Check (30 min)

### 1.1 TypeScript
```bash
npx tsc --noEmit
```
Must be **zero errors**. If any errors, fix them before proceeding. Common issues:
- Missing type imports
- Mismatched function signatures
- Unused imports (strict mode)
- Missing i18n namespace registrations

### 1.2 Tests
```bash
npm test
```
ALL tests must pass. If new tests were added for sprint features, run them:
```bash
npm test -- --testPathPattern="insights|cheatsheet|formula|youtube|step-sequence"
```

### 1.3 Build
```bash
npm run build
```
Must be clean. Watch for:
- Dynamic import issues
- Missing page exports
- SSR/CSR conflicts
- Image optimization warnings

### 1.4 Lint (if configured)
```bash
npm run lint
```

---

## Phase 2: Full User Journey Test (2 hours)

Start the dev server and test EVERY feature in the browser.

```bash
npm run dev
```

### Journey 1: Step-by-Step Diagrams (Day 1)
1. Go to homework help / tutoring chat
2. Ask: **"solve 2x² + 5x - 3 = 0 step by step"**
3. Verify: Step sequence appears with 3+ steps
4. Test: Forward/back arrows work
5. Test: Click step dots to jump
6. Test: Keyboard arrows (Left/Right) navigate
7. Test: Auto-play button starts/stops
8. Test: Swipe on mobile (resize browser to 375px)
9. Ask a concept question: **"what is gravity?"** → Should get single diagram, NOT step sequence

**If broken**: Check `lib/diagram-engine/step-sequence.ts`, `DiagramRenderer.tsx`, tutor-engine integration

### Journey 2: Explanation Styles (Day 2)
1. In tutoring chat, find the style selector
2. Select **"ELI5"** → ask "explain derivatives" → response uses simple analogies
3. Select **"Visual Builder"** → ask "solve 3x + 5 = 20" → step sequence with diagrams
4. Select **"Socratic"** → ask "what is 15% of 200?" → response ONLY asks questions
5. Select **"Worked Example"** → ask "solve x² = 16" → shows similar examples first
6. Refresh page → style should persist (localStorage)
7. Check in practice mode → same selector appears

**If broken**: Check `explanation-styles.ts`, `ExplanationStyleSelector.tsx`, tutor-engine style integration

### Journey 3: Formula Scanner (Day 3)
1. Navigate to **/formula-scanner** from sidebar
2. **Text mode**: Type `E = mc^2` → live KaTeX preview
3. Click "Analyze" → loading → breakdown appears
4. Verify: 3 symbols (E, m, c), each with name/meaning/units
5. Expand "Derivation" → text shows
6. Expand "Practice Question" → question shows, "Show Answer" works
7. **Image mode**: Upload image of a formula → extracts and analyzes
8. Test: Empty submit → error toast

**If broken**: Check `lib/formula-scanner/analyzer.ts`, `FormulaScannerContent.tsx`, API route

### Journey 4: Mistake Patterns (Day 4 - Part A)
1. Navigate to **/dashboard**
2. **With practice data (20+ attempts)**: Mistake Insights card should show
3. Click "Fix this" on a pattern → Remediation modal opens
4. Answer questions → correct/incorrect feedback → completion score
5. Click refresh icon → regenerates analysis
6. **Without data**: Should show "Complete 20+ questions" message

**If broken**: Check `lib/insights/mistake-analyzer.ts`, `MistakeInsightsCard.tsx`, `RemediationModal.tsx`

### Journey 5: Gap Auto-Router (Day 4 - Part B)
1. Start a practice session on a topic
2. Get 3+ answers wrong intentionally on the same topic
3. Gap detection banner should slide down
4. Click "Review [topic]" → should navigate to relevant content
5. Click "Continue anyway" → banner dismisses
6. Banner should only show ONCE per session

**If broken**: Check `lib/insights/gap-router.ts`, `GapDetectedBanner.tsx`, practice session integration

### Journey 6: Parent Reports (Day 5 - Part A)
1. Navigate to **/settings**
2. Find "Parent Reports" section
3. Enter an email address
4. Toggle "Send weekly reports" ON
5. Click "Send Test Report" → should send email
6. Check inbox → email arrived, layout correct
7. Email links work (dashboard link, manage preferences)

**If broken**: Check `lib/email/resend-client.ts`, `WeeklyProgressReport.tsx`, `/api/reports/weekly` route, RESEND_API_KEY env var

### Journey 7: Exam Prediction (Day 5 - Part B)
1. Navigate to past exams page
2. If 3+ analyzed papers exist → Prediction panel shows
3. Click "Generate Prediction" → loading → topics with likelihood bars
4. Each topic shows: name, likelihood %, difficulty, trend arrow
5. If <3 papers → "Upload X more" message

**If broken**: Check `lib/exam-prediction/predictor.ts`, `ExamPredictionPanel.tsx`, exam page integration

### Journey 8: YouTube → Course (Day 6 - Part A)
1. Open upload modal → YouTube tab should exist
2. Paste a Khan Academy URL: e.g., `https://www.youtube.com/watch?v=HvMSRWTE2mI`
3. Thumbnail preview appears
4. Click "Generate Course" → streaming progress shows
5. Course generates with lessons + questions
6. Course appears in course list with video thumbnail
7. Test: Invalid URL → error
8. Test: Video without captions → "No captions available" error

**If broken**: Check `lib/youtube/transcript.ts`, `course-from-video.ts`, `/api/courses/from-youtube`, upload modal YouTube tab

### Journey 9: Cheatsheets (Day 6 - Part B)
1. Navigate to **/cheatsheets** from sidebar
2. Open a course → click "Generate Cheatsheet"
3. Wait for generation → blocks render
4. Verify block types: formulas (KaTeX renders), definitions (left border), key facts (badges), examples (collapsible), warnings (amber)
5. Toggle "Exam mode" → solutions hidden
6. Click "Print" → browser print dialog opens
7. Delete cheatsheet → confirms → removed

**If broken**: Check `lib/cheatsheet/generator.ts`, `CheatsheetBlock.tsx`, cheatsheet pages, API routes

---

## Phase 3: Cross-Cutting Quality (1 hour)

### 3.1 Dark Mode Testing
For EVERY new feature, toggle dark mode and verify:
- [ ] All backgrounds use `dark:bg-gray-800` or `dark:bg-gray-900` (not white)
- [ ] All text uses `dark:text-gray-100/200/300` (not black)
- [ ] All borders use `dark:border-gray-700` (not gray-200)
- [ ] Badges/pills have dark variants
- [ ] Buttons have dark hover states
- [ ] KaTeX formulas readable in dark mode
- [ ] Loading skeletons have dark variants

### 3.2 Mobile Responsive Testing (375px)
Resize browser to 375px width OR use Chrome DevTools mobile view:
- [ ] **Step Sequence**: Full width, swipe works, controls visible
- [ ] **Style Selector**: Horizontal scroll, cards not cut off
- [ ] **Formula Scanner**: Single column, input full width
- [ ] **Mistake Cards**: Cards stack vertically
- [ ] **Remediation Modal**: Full screen on mobile
- [ ] **Gap Banner**: Text wraps, buttons stack if needed
- [ ] **Settings Section**: Full width inputs
- [ ] **Exam Prediction**: Bars scale down
- [ ] **YouTube Input**: Thumbnail fits
- [ ] **Cheatsheet**: Blocks full width, no horizontal scroll
- [ ] **All pages**: No horizontal overflow (check `overflow-x-hidden`)

### 3.3 Hebrew RTL Testing
Switch language to Hebrew:
- [ ] **Step Sequence**: Arrows flip direction, Hebrew text shows, dots order correct
- [ ] **Style Selector**: RTL scroll, Hebrew labels
- [ ] **Formula Scanner**: Hebrew placeholders, RTL layout, symbol cards RTL
- [ ] **Mistake Cards**: Hebrew names, severity badges
- [ ] **Gap Banner**: Hebrew text, RTL buttons
- [ ] **Settings**: Hebrew labels, RTL inputs
- [ ] **Exam Prediction**: Hebrew topic names
- [ ] **Cheatsheet**: Hebrew content, RTL block layout
- [ ] **All pages**: `dir="rtl"` applied, no layout breaking

### 3.4 Loading States
- [ ] Every API call shows a loading spinner or skeleton
- [ ] No flash of empty content
- [ ] No infinite spinners (timeouts work)

### 3.5 Error States
- [ ] API errors show user-friendly toast messages (not stack traces)
- [ ] Network failure → graceful handling
- [ ] Invalid input → validation messages
- [ ] Empty data → friendly empty states with guidance

### 3.6 Accessibility
- [ ] All interactive elements have proper `aria-label`
- [ ] Step sequence has `role="region"`
- [ ] Modals trap focus
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Color contrast passes (especially in dark mode)

---

## Phase 4: Error Resilience Testing (30 min)

Test these edge cases:
1. **Malformed YouTube URL** → Error message, no crash
2. **Non-formula image in scanner** → Graceful "couldn't extract formula" error
3. **User with 0 data** → All empty states work (dashboard, insights, predictions)
4. **API timeout** → Error shown, not infinite spinner
5. **Rate limited** → Shows rate limit message
6. **Double-click submit** → No duplicate requests (disable button during loading)
7. **Concurrent requests** → No race conditions in step sequence generation
8. **Invalid i18n key** → Falls back gracefully (no `missing translation` in UI)
9. **Missing env vars** → Resend: graceful error, not crash. Engine: fallback to single diagrams
10. **Supabase offline** → Error toast, not white screen of death

---

## Phase 5: Performance Check (15 min)

1. Open Chrome DevTools → Performance tab
2. Navigate through features → check:
   - [ ] No memory leaks (memory tab stable)
   - [ ] No excessive re-renders (React profiler)
   - [ ] Step sequence animations smooth (60fps)
   - [ ] KaTeX rendering doesn't block UI
   - [ ] Image loading lazy (diagram images)

3. Check bundle size:
```bash
npm run build
```
Note the page sizes. Flag any page over 500KB.

---

## Phase 6: Deploy (30 min)

### 6.1 Pre-Deploy Checklist
- [ ] `npx tsc --noEmit` zero errors
- [ ] `npm test` all pass
- [ ] `npm run build` clean
- [ ] All Supabase migrations applied on production
- [ ] `RESEND_API_KEY` set in Vercel env vars
- [ ] `CRON_SECRET` set in Vercel env vars (for weekly report cron)
- [ ] No `.env.local` secrets committed to git

### 6.2 Deploy
```bash
vercel --prod
```
Or push to main branch if auto-deploy is configured.

### 6.3 Production Smoke Tests
After deploy, test on the production URL:

1. **Login** → Dashboard loads
2. **`/formula-scanner`** → Page loads, "Type Formula" tab works
3. **`/cheatsheets`** → Page loads
4. **YouTube tab** in upload modal → visible
5. **Dashboard** → Mistake Insights card (for users with data)
6. **Settings** → Parent Reports section visible
7. **Past exams page** → Prediction panel (for users with 3+ papers)
8. **Tutoring chat** → Style selector visible
9. **Step sequence** → Ask a multi-step question, steps appear
10. **Dark mode** → Toggle works on all new pages
11. **Hebrew** → All new features have Hebrew labels

---

## Bug Fix Protocol

If a bug is found during testing:

1. **Document it**: What page, what action, what happened vs expected
2. **Fix it immediately**: Don't accumulate bugs
3. **Re-test the fix**: Verify it works
4. **Check for regressions**: Run `npx tsc --noEmit` + `npm test` + `npm run build`
5. **Re-deploy if needed**

---

## Final Verification Checklist

### Feature Completeness
- [ ] Day 1: Step-by-step diagram breakdowns — working end-to-end
- [ ] Day 2: 5 explanation styles — all produce different output
- [ ] Day 3: Formula scanner — text + image input → full breakdown
- [ ] Day 4A: Mistake patterns — dashboard widget + remediation modal
- [ ] Day 4B: Gap auto-router — banner appears during practice
- [ ] Day 5A: Parent reports — email sent + arrives in inbox
- [ ] Day 5B: Exam prediction — topics + likelihood bars
- [ ] Day 6A: YouTube → course — transcript → full course with lessons
- [ ] Day 6B: Cheatsheets — generate, display, exam mode, print

### Code Quality
- [ ] Zero TypeScript errors
- [ ] Zero build errors
- [ ] All existing tests pass
- [ ] No console errors in browser
- [ ] No unhandled promise rejections

### UI Quality
- [ ] Dark mode on every new component
- [ ] Mobile responsive (375px)
- [ ] Hebrew RTL on every new component
- [ ] Loading states on every async operation
- [ ] Error states on every failure path
- [ ] Empty states for zero-data scenarios
- [ ] Animations smooth (Framer Motion)
- [ ] Consistent typography and colors

### Production
- [ ] Deployed to Vercel
- [ ] Supabase migrations applied
- [ ] Environment variables set
- [ ] Vercel cron configured
- [ ] Smoke test passed on production URL

---

## DONE Criteria

The sprint is COMPLETE when:
1. All 9 features work in the browser (not just compile)
2. All tests pass
3. Dark mode, mobile, Hebrew all tested
4. Deployed to production
5. Smoke test passed on production URL
6. No known bugs remaining

**If any feature can't be completed to quality, reduce scope per the plan's rules rather than shipping broken code.**
