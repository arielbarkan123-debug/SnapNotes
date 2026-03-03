# NoteSnap — 13 Game-Changing Feature Improvements

**Date:** 2026-03-02
**Status:** Design Approved
**Quality Bar:** Production-grade. Every feature must be visually polished, bug-free, smooth UX, tested end-to-end. Real users are on this app.

---

## Table of Contents

1. [Feature #2: Depth on Demand](#feature-2-depth-on-demand)
2. [Feature #3: Worked Examples From YOUR Mistakes](#feature-3-worked-examples-from-your-mistakes)
3. [Feature #4: Infinite Practice Mode](#feature-4-infinite-practice-mode)
4. [Feature #5: "Why Was I Wrong?" Deep Dive](#feature-5-why-was-i-wrong-deep-dive)
5. [Feature #6: Practice From Homework Mistakes](#feature-6-practice-from-homework-mistakes)
6. [Feature #7: Batch Worksheet Mode](#feature-7-batch-worksheet-mode)
7. [Feature #8: "Before You Submit" Mode](#feature-8-before-you-submit-mode)
8. [Feature #9: Rubric Mode](#feature-9-rubric-mode)
9. [Feature #10: Visual Solving Alongside Chat](#feature-10-visual-solving-alongside-chat)
10. [Feature #11: "I'm Still Confused" Escalation Ladder](#feature-11-im-still-confused-escalation-ladder)
11. [Feature #12: Diagram Engine Overhaul](#feature-12-diagram-engine-overhaul)
12. [Feature #13: Scan → Solve → Explain](#feature-13-scan-solve-explain)

---

## Feature #2: Depth on Demand

### What
Each lesson step gets a "Go Deeper" button. Clicking it generates sub-steps that explain the underlying reasoning. Steps the student never clicks stay concise. The student controls their own learning depth.

### User Flow
1. Student reads a lesson step (e.g., "The derivative of x² is 2x")
2. Sees a subtle "Go Deeper 🔍" button at the bottom of the step
3. Clicks it → loading shimmer for 2-3 seconds
4. An accordion expands below the step with 2-3 sub-steps:
   - Sub-step 1: "WHY is the derivative 2x? Let's derive it from first principles..."
   - Sub-step 2: A worked example applying the concept
   - Sub-step 3: A quick check question to verify understanding
5. Sub-steps can ALSO have "Go Deeper" (recursive, max depth 2)
6. "Go Deeper" button changes to "Collapse ↑" after expansion
7. A depth indicator pill shows "Depth 1" or "Depth 2" when nested

### Technical Design

**New API endpoint:**
```
POST /api/courses/[id]/lessons/[lessonIndex]/expand
Body: { stepIndex: number, depth: number }
Response: { subSteps: Array<{ title, content, hasExample, quickCheck? }> }
```

**Backend logic:**
- Takes the step's content + student's context (grade level, subject)
- Sends to Claude: "The student wants deeper explanation. Generate 2-3 sub-steps that explain the underlying reasoning. Include one worked example. Optionally include a quick-check question. Match the student's grade level: {gradeLevel}. Subject: {subject}."
- Returns structured sub-steps

**Caching:**
- Generated sub-steps are cached in the lesson's `generated_course` JSON under `steps[i].expandedContent`
- Subsequent visits show cached content instantly (no re-generation)
- Cache key: `courseId:lessonIndex:stepIndex:depth`
- Cache is per-course (same depth for all students), NOT per-student (would be too expensive)

**Frontend changes:**
- `components/lesson/StepContent.tsx`: Add "Go Deeper" button, accordion expansion
- New component: `components/lesson/DepthExpansion.tsx` — renders sub-steps with animation
- Framer Motion `AnimatePresence` for smooth accordion open/close
- Loading state: skeleton shimmer matching sub-step layout

**Intelligence tracking:**
- Track which steps get expanded → `POST /api/tracking/feature-affinity` with `{ feature: 'depth_on_demand', stepId, depth }`
- Pattern: "Student expands 80% of algebra steps but 0% of geometry steps" → feeds into student context

**Edge cases:**
- What if the step is already very detailed? Claude prompt includes: "If the step is already thorough, say so and offer a related extension instead of repeating."
- What if Claude generates too much? Cap sub-steps at 3, each max 200 words.
- Depth limit: max 2 levels deep. After depth 2, the "Go Deeper" button is not shown.

**Quality requirements:**
- Accordion animation must be smooth (300ms ease-out)
- Sub-steps must match the visual style of regular lesson steps (same fonts, spacing, colors)
- Loading skeleton must be realistic (not a generic spinner)
- "Go Deeper" button must be subtle enough to not clutter the step, but discoverable
- Works in both EN and HE (RTL) — button placement flips

### Files to Create/Modify
- `components/lesson/DepthExpansion.tsx` — NEW
- `components/lesson/StepContent.tsx` — ADD button + expansion logic
- `app/api/courses/[id]/lessons/[lessonIndex]/expand/route.ts` — NEW API
- `messages/en/lesson.json` — ADD i18n keys
- `messages/he/lesson.json` — ADD i18n keys

---

## Feature #3: Worked Examples From YOUR Mistakes

### What
When a student gets a practice problem wrong inside a lesson, the next view becomes a personalized worked example that uses THEIR specific wrong answer as the teaching moment. Not a generic example — one built from their exact error.

### User Flow
1. Student encounters a practice problem in a lesson step: "Solve: 3x + 5 = 20"
2. Student answers: "x = 25/3" (wrong — forgot to subtract 5 first)
3. Instead of just showing "✗ Correct answer: x = 5", a worked example card appears:
   - Header: "Let's work through this together"
   - Step 1: "You wrote 3x = 25. It looks like you divided 20 by 3 directly. But we need to isolate x first."
   - Step 2: "Start by subtracting 5 from both sides: 3x + 5 - 5 = 20 - 5 → 3x = 15"
   - Step 3: "Now divide both sides by 3: x = 15/3 = 5"
   - Step 4: "Check: 3(5) + 5 = 15 + 5 = 20 ✓"
   - "Try a similar one" mini-problem: "Solve: 4x + 7 = 31"
4. If student nails the similar problem → lesson continues
5. If student misses it → second worked example with different framing

### Technical Design

**Trigger point:**
- In `components/lesson/StepContent.tsx`, when the practice problem evaluation returns `was_correct === false`
- Current behavior: shows correct answer inline
- New behavior: shows correct answer AND generates a worked example card

**New API endpoint:**
```
POST /api/courses/[id]/lessons/[lessonIndex]/worked-example
Body: {
  stepIndex: number,
  question: string,
  studentAnswer: string,
  correctAnswer: string,
  concept: string,
  subject: string
}
Response: {
  steps: Array<{ text: string, math?: string }>,
  tryAnother: { question: string, correctAnswer: string },
  errorDiagnosis: string
}
```

**Claude prompt design (critical for quality):**
```
The student attempted this problem and got it wrong.

Problem: {question}
Student's answer: {studentAnswer}
Correct answer: {correctAnswer}

Generate a worked example that:
1. STARTS by acknowledging what the student wrote (use their exact numbers)
2. Identifies the specific mistake (not a generic category — THE mistake they made)
3. Walks through the correct solution using the SAME numbers as the original problem
4. Ends with a verification step (plug the answer back in)
5. Provides ONE similar problem for the student to try

Keep each step to 1-2 sentences. Use the student's grade level: {gradeLevel}.
```

**Key quality requirement:** The worked example MUST reference the student's actual answer. "You wrote x = 25/3" not "A common mistake is..." This personalization is what makes it effective.

**Frontend: WorkedExampleCard component**
- Card with subtle yellow/amber left border (indicating "teaching moment")
- Steps displayed sequentially with step numbers
- Math rendered via existing LaTeX/KaTeX system
- "Try a Similar One" is an inline mini-practice widget (input + check button)
- If correct: green flash + "Got it!" + continue lesson button
- If wrong: second worked example appears (different angle, simpler framing)
- Max 2 worked examples per missed problem (then just show the answer and move on)

**Ephemeral data:**
- Worked examples are NOT persisted to the lesson JSON (they're per-student, per-attempt)
- They're generated on-the-fly and exist only in the session state
- The error diagnosis IS recorded to `mistake_patterns` via the existing misconception recorder

### Files to Create/Modify
- `components/lesson/WorkedExampleCard.tsx` — NEW
- `components/lesson/StepContent.tsx` — MODIFY to trigger worked example on wrong answer
- `app/api/courses/[id]/lessons/[lessonIndex]/worked-example/route.ts` — NEW API
- `messages/en/lesson.json` — ADD i18n keys
- `messages/he/lesson.json` — ADD i18n keys

---

## Feature #4: Infinite Practice Mode

### What
A never-ending practice mode with real-time difficulty calibration. Questions keep coming until the student stops. Accessible both as a session type AND mid-session after completing any regular practice.

### User Flow

**Entry point A — Before session:**
1. Practice page shows session type buttons: Targeted / Mixed / Quick / Exam Prep / **∞ Infinite**
2. Student selects "∞ Infinite" → picks a course (or "All subjects")
3. Session starts immediately — first question appears

**Entry point B — Mid-session:**
1. Student finishes any regular practice session (e.g., 10-question targeted)
2. Completion screen shows: "Nice! 8/10 correct" + **"Keep Going → Infinite Mode"** button
3. Clicking it converts the current session to infinite — next question appears seamlessly

**During session:**
1. Questions appear one at a time, no end in sight
2. Top bar shows: 🔥 Streak (current consecutive correct) | 📊 Rolling accuracy (last 20) | ⏱ Time | #️⃣ Total questions
3. Difficulty adjusts every 5 questions based on rolling accuracy
4. Every 10 questions, topic rotates to a different weak area (prevents grinding one thing)
5. "Stop" button always visible in top-right
6. On stop: full session summary with per-concept accuracy breakdown, time stats, improvement suggestions

### Technical Design

**Session creation:**
```
POST /api/practice/session
Body: {
  sessionType: 'infinite',
  courseId: string | null,
  initialDifficulty?: number
}
Response: { sessionId, firstBatch: Question[] }
```

**Batch generation:**
- Questions generated in micro-batches of 3 (buffer while next batch generates)
- New endpoint for fetching next batch:
```
POST /api/practice/session/[sessionId]/next-batch
Body: {
  rollingAccuracy: number,     // last 20 questions
  currentStreak: number,
  questionsAnswered: number,
  currentDifficulty: number
}
Response: { questions: Question[], adjustedDifficulty: number }
```

**Difficulty calibration algorithm:**
```
Every 5 questions:
  if rollingAccuracy > 0.85 → difficulty += 0.1 (cap at 1.0)
  if rollingAccuracy < 0.50 → difficulty -= 0.1 (floor at 0.1)
  if rollingAccuracy 0.50-0.85 → no change (sweet spot)
```

**Concept rotation:**
```
Every 10 questions:
  Fetch user's weakest concepts from user_knowledge_gaps
  Pick the next concept they haven't practiced in this session
  Next batch targets this concept
  After 10 more → rotate again
```

**Auto-save:**
- Session progress saved to DB every 5 answers
- If browser closes mid-session, progress isn't lost
- Resumable: user can return to `/practice/[sessionId]` and continue

**Frontend components:**
- `components/practice/InfiniteHeader.tsx` — NEW: streak, accuracy, time, total counter
- Existing `PracticeSession` component modified to handle unbounded question count
- "Keep Going" button on `SessionComplete` screen
- Smooth transition animation when converting from regular → infinite

**UI polish requirements:**
- Streak counter animates (scale bounce) on each consecutive correct
- Rolling accuracy shown as a mini sparkline (last 20 data points)
- Difficulty indicator: subtle colored bar (green=easy → red=hard) that smoothly transitions
- "Stop" button uses a calm color (not red/alarming — we want students to feel good about stopping)
- Session summary uses chart.js or recharts for per-concept accuracy visualization

### Files to Create/Modify
- `components/practice/InfiniteHeader.tsx` — NEW
- `components/practice/SessionComplete.tsx` — ADD "Keep Going" button
- `app/(main)/practice/[sessionId]/page.tsx` — MODIFY for infinite flow
- `app/api/practice/session/route.ts` — MODIFY to handle infinite type
- `app/api/practice/session/[sessionId]/next-batch/route.ts` — NEW API
- `lib/practice/session-manager.ts` — ADD infinite session logic, batch generation, difficulty calibration
- `messages/en/practice.json` — ADD i18n keys
- `messages/he/practice.json` — ADD i18n keys

---

## Feature #5: "Why Was I Wrong?" Deep Dive

### What
When a student gets a practice answer wrong, show a 3-panel breakdown: (1) what they probably thought, (2) why that's wrong, (3) the correct mental model + a verification question.

### User Flow
1. Student answers a practice question wrong
2. Below the red "✗ Incorrect" indicator, a card expands with 3 tabs:
   - **"What you thought"** — "You likely reasoned that dividing 6 by 1/3 means dividing by 3, which gives 2..."
   - **"The mistake"** — "Division by a fraction isn't dividing by the numerator. When you divide by 1/3, you're asking: how many groups of 1/3 fit into 6?"
   - **"How to think about it"** — "Division by a fraction = multiplication by reciprocal. 6 ÷ (1/3) = 6 × 3 = 18. Visualize: cutting 6 pizzas into thirds gives you 18 slices."
3. Below the tabs, a quick-check question: "What is 10 ÷ (1/5)?"
4. Student answers → immediate feedback
5. Data feeds into misconception recorder

### Technical Design

**Integration point:**
- In the existing practice answer evaluation (`/api/practice/session/[sessionId]/answer`), when `isCorrect === false`
- Currently returns: `{ isCorrect, correctAnswer, explanation }`
- New response adds: `{ deepDive: { likelyReasoning, whyWrong, correctModel, quickCheck } }`

**Claude prompt (quality-critical):**
```
A student got this wrong:
Question: {question}
Student's answer: "{studentAnswer}"
Correct answer: "{correctAnswer}"

Generate a 3-part analysis:
1. likelyReasoning: What the student probably thought when they wrote "{studentAnswer}". Be SPECIFIC to their answer — don't give a generic mistake. Start with "You probably..."
2. whyWrong: Why that reasoning fails. Use a concrete counter-example or visualization. 2-3 sentences max.
3. correctModel: The right way to think about it. Include a memorable analogy or visualization. End with the solution restated.
4. quickCheck: A similar but different problem for verification. Include question and answer.

IMPORTANT: The likelyReasoning MUST be specific to the student's actual answer "{studentAnswer}". If they answered "2", the reasoning should be different than if they answered "6".
```

**Frontend: DeepDiveCard component**
- Expandable card with 3 panels (not tabs — sequential reveal)
- Panels appear one at a time with 300ms stagger animation
- Panel 1 has a 🤔 icon, Panel 2 has a ⚠️ icon, Panel 3 has a 💡 icon
- Quick-check question is a simple inline input with instant feedback
- Card has a subtle gradient background to distinguish it from regular feedback
- "Got it" button at the bottom dismisses the card and moves to next question

**Performance consideration:**
- The deep dive generation adds ~2-3 seconds to the wrong-answer response
- Show the "✗ Incorrect" immediately, then stream the deep dive content in
- If student rapidly moves to next question before deep dive loads, cancel the request

### Files to Create/Modify
- `components/practice/DeepDiveCard.tsx` — NEW
- `components/practice/QuestionFeedback.tsx` or equivalent — MODIFY to show deep dive
- `app/api/practice/session/[sessionId]/answer/route.ts` — MODIFY to generate deep dive on wrong answers
- `messages/en/practice.json` — ADD i18n keys
- `messages/he/practice.json` — ADD i18n keys

---

## Feature #6: Practice From Homework Mistakes

### What
When the homework checker flags an error, a "Practice This" button appears next to that feedback item. Tapping it launches a micro practice session targeting that exact error type.

### User Flow
1. Student views homework check results
2. Each incorrect item has the existing feedback (explanation, correct answer, etc.)
3. Next to each ✗ item, a pill button: **"Practice This 🎯"**
4. Student taps it → navigates to `/practice/[sessionId]` with a back-link header
5. 5 questions targeting the exact error type load (e.g., if error was "sign error in inequality" → 5 inequality sign-flip problems)
6. After completing the mini-session → returns to homework results
7. The feedback item updates to show a "Practiced ✓" badge with accuracy

### Technical Design

**Button placement:**
- In `components/homework/FeedbackRenderer.tsx` (or equivalent component that renders individual feedback items)
- Only shows on items where `isCorrect === false`
- Button: small pill with target emoji, themed to match the app

**Session creation:**
```
POST /api/practice/session
Body: {
  sessionType: 'targeted',
  sourceType: 'homework_error',
  homeworkCheckId: string,
  errorContext: {
    subject: string,
    topic: string,
    errorType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionText: string
  },
  questionCount: 5
}
```

**Question generation prompt:**
```
A student made this specific error on homework:
Subject: {subject}, Topic: {topic}
Their error: {errorType}
Question they got wrong: {questionText}

Generate 5 practice questions that specifically target this error type.
Do NOT repeat the exact same question — create variations that require the same skill.
Start with an easier version and gradually increase difficulty.
```

**Tracking the "Practiced" state:**
- After completing the mini-session, call:
```
POST /api/homework/check/[checkId]/practice-complete
Body: { feedbackItemIndex: number, sessionId: string, accuracy: number }
```
- Store in `homework_checks.feedback` JSON: `items[i].practiced = { sessionId, accuracy, completedAt }`
- UI reads this to show the "Practiced ✓" badge

**Navigation:**
- Practice page shows a top banner: "Practicing: [error type] from your homework" with "← Back to Homework" link
- On completion, "Back to Homework Results" primary button (alongside "Practice More")

### Files to Create/Modify
- Homework feedback component — ADD "Practice This" button per incorrect item
- `app/api/practice/session/route.ts` — MODIFY to handle `sourceType: 'homework_error'`
- `app/api/homework/check/[checkId]/practice-complete/route.ts` — NEW API for tracking
- `lib/practice/session-manager.ts` — ADD homework-error-targeted question generation
- `messages/en/homework.json` — ADD i18n keys
- `messages/he/homework.json` — ADD i18n keys

---

## Feature #7: Batch Worksheet Mode

### What
Upload a photo of an entire homework worksheet. AI identifies and grades every problem individually. Returns a grid overview with click-to-expand per-problem feedback.

### User Flow
1. In homework checker, new tab: **"Full Worksheet"** (alongside "Photo" and "Text")
2. Student uploads 1-4 photos of their worksheet
3. Loading state: "Analyzing your worksheet..." with progress indicator
4. Results page:
   - **Summary bar:** "17/22 correct (77%)" with a colored progress bar
   - **Grid view:** Numbered tiles in a responsive grid
     - Green tiles: ✓ (correct)
     - Red tiles: ✗ (with error category label, e.g., "Sign error")
     - Gray tiles: ❓ (couldn't determine)
   - Click any tile → expands to show:
     - The problem text (as identified by AI)
     - Student's answer
     - Correct answer (if wrong)
     - One-line explanation
     - "Practice This 🎯" button (from Feature #6)
5. **Per-topic summary:** "Algebra: 8/10 | Geometry: 5/7 | Word Problems: 4/5"

### Technical Design

**API:**
```
POST /api/homework/check
Body: {
  mode: 'batch_worksheet',
  imageUrls: string[] (1-4 images),
  subject?: string
}
Response: {
  totalProblems: number,
  correct: number,
  items: Array<{
    problemNumber: number | string,
    problemText: string,
    studentAnswer: string,
    correctAnswer: string,
    isCorrect: boolean,
    explanation: string,
    topic: string,
    errorType?: string
  }>,
  topicBreakdown: Record<string, { correct: number, total: number }>
}
```

**Claude prompt:**
```
These images show a complete homework worksheet. Analyze EVERY problem on the page.

For each problem found, provide:
1. problemNumber: The problem number as shown on the page
2. problemText: The question text
3. studentAnswer: What the student wrote as their answer
4. correctAnswer: The actual correct answer
5. isCorrect: boolean
6. explanation: If wrong, a one-line explanation of the error (max 30 words)
7. topic: The math/science topic (e.g., "linear equations", "area calculation")
8. errorType: If wrong, categorize the error (e.g., "calculation error", "conceptual error", "sign error")

Return as a JSON array, ordered by problem number.
IMPORTANT: Find ALL problems, even partially visible ones. If you can't determine correctness, mark as isCorrect: null.
```

**Single API call:** The entire worksheet is analyzed in one Claude Vision call with all images. No per-problem API calls.

**Frontend components:**
- `components/homework/BatchWorksheetResult.tsx` — NEW: grid view + summary
- `components/homework/WorksheetTile.tsx` — NEW: individual tile (green/red/gray)
- `components/homework/WorksheetDetail.tsx` — NEW: expanded view for a single problem
- Tab system in upload flow for "Full Worksheet" mode

**UI polish:**
- Grid tiles use CSS Grid with `auto-fill, minmax(80px, 1fr)` for responsive sizing
- Tile click → slide-down expansion (not navigation)
- Summary bar is sticky at top during scroll
- Topic breakdown shown as horizontal stacked bar chart
- Smooth scroll to expanded tile on click

### Files to Create/Modify
- `components/homework/BatchWorksheetResult.tsx` — NEW
- `components/homework/WorksheetTile.tsx` — NEW
- `components/homework/WorksheetDetail.tsx` — NEW
- Homework upload flow component — ADD "Full Worksheet" tab
- `app/api/homework/check/route.ts` — MODIFY to handle `mode: 'batch_worksheet'`
- `lib/homework/checker-engine.ts` — ADD batch worksheet analysis prompt
- `messages/en/homework.json` — ADD i18n keys
- `messages/he/homework.json` — ADD i18n keys

---

## Feature #8: "Before You Submit" Mode

### What
Toggle in the homework checker that changes AI behavior — tells you IF you're on track without revealing any answers. Integrated as a checkbox in the existing upload flow.

### User Flow
1. In homework checker upload form, new checkbox: **"☐ Check before submitting — don't reveal answers"**
2. Student uploads their homework with this checked
3. Results show traffic lights instead of full feedback:
   - 🟢 "Looks correct"
   - 🟡 "Check this again" + vague hint (e.g., "Look at your arithmetic in the last step")
   - 🔴 "This needs rework" + slightly more specific hint
   - ⚪ "Can't determine"
4. Yellow/red items have a "Get Hint" button with 3 escalation levels:
   - Hint 1: Very vague ("Check your signs")
   - Hint 2: Medium ("The error is in step 2 of your calculation")
   - Hint 3: Specific direction ("You need to subtract before dividing")
5. NO correct answers are EVER shown in this mode
6. After fixing, student can uncheck the toggle and run a full check

### Technical Design

**Request:**
```
POST /api/homework/check
Body: {
  mode: 'before_submit',   // NEW mode
  imageUrls: string[],
  taskText?: string
}
```

**Claude prompt modification:**
```
IMPORTANT: The student has NOT submitted their homework yet. They want to check if they're on the right track.

Rules:
- NEVER reveal the correct answer
- NEVER show the full solution
- For each answer:
  - If correct: say "✓ This looks correct"
  - If incorrect: say "⚠ Check this again" and give a VAGUE hint about the TYPE of error
    - Good hint: "Review your arithmetic in the last step"
    - Bad hint: "The answer should be 42" (NEVER do this)
  - If unclear: say "? Unable to determine"

Hint levels (the student may ask for more detail):
- Level 1: Name the general area of error ("check your signs")
- Level 2: Point to the specific step ("the error is in step 2")
- Level 3: Give a direction without the answer ("you need to multiply, not divide")
```

**Response:**
```
{
  mode: 'before_submit',
  items: Array<{
    status: 'correct' | 'check_again' | 'needs_rework' | 'unclear',
    hint: string,
    hints: [string, string, string],  // 3 escalation levels
    feedbackItemIndex: number
  }>,
  summary: { correct: number, needsReview: number, total: number }
}
```

**Frontend:**
- Traffic light indicators (colored circles) instead of detailed feedback cards
- "Get Hint" button on yellow/red items → cycles through hint levels
- Hint reveals one level at a time with smooth height animation
- Top summary: "6 ✓ | 3 ⚠ | 1 🔴" with encouraging tone

**UI quality:**
- Toggle has a tooltip: "Perfect for checking your work before turning it in"
- Results page has a banner: "Before-Submit Mode — answers are hidden"
- Clear "Run Full Check" button at bottom for when student is ready to see everything

### Files to Create/Modify
- Homework upload form component — ADD checkbox toggle
- `app/api/homework/check/route.ts` — MODIFY to handle `mode: 'before_submit'`
- `lib/homework/checker-engine.ts` — ADD before-submit prompt variant
- `components/homework/BeforeSubmitResult.tsx` — NEW: traffic light display
- `messages/en/homework.json` — ADD i18n keys
- `messages/he/homework.json` — ADD i18n keys

---

## Feature #9: Rubric Mode

### What
Student provides their teacher's rubric alongside their homework. AI grades against the specific rubric criteria instead of general correctness.

### User Flow
1. In homework checker upload form, new optional section: **"Add Rubric (optional)"**
2. Student uploads rubric image OR pastes rubric text
3. Student uploads their homework as usual
4. Results page shows:
   - **Rubric score table** at top:
     ```
     | Criterion           | Points | Earned | Notes                    |
     |---------------------|--------|--------|--------------------------|
     | Problem Setup       | 10     | 8      | Missing units in step 1  |
     | Mathematical Process| 20     | 18     | One sign error           |
     | Final Answer        | 10     | 10     | All correct              |
     | Work Shown          | 10     | 7      | Steps 3-4 not shown      |
     | TOTAL               | 50     | 43     | Grade: 86% (B+)         |
     ```
   - Below the table: item-by-item feedback tagged to rubric criteria
5. Estimated grade computed from rubric total, not AI's general impression

### Technical Design

**Request:**
```
POST /api/homework/check
Body: {
  mode: 'rubric',
  imageUrls: string[],
  rubricImageUrl?: string,
  rubricText?: string
}
```

**Two-phase process:**

Phase 1 — Parse rubric:
```
Prompt: "Extract the grading rubric from this text/image. For each criterion, identify:
- criterion name
- maximum points
- description of what earns full/partial/no points
Return as JSON array."
```

Phase 2 — Grade against rubric:
```
Prompt: "Grade this homework against the following rubric:
{parsedRubric}

For each criterion:
- earnedPoints: how many points this work earns
- reasoning: one-line explanation of the score
- suggestions: what the student should change to earn full points

Also provide item-by-item feedback as usual, but tag each item to its relevant rubric criterion."
```

**Response:**
```
{
  mode: 'rubric',
  rubricBreakdown: Array<{
    criterion: string,
    maxPoints: number,
    earnedPoints: number,
    reasoning: string,
    suggestions: string
  }>,
  totalEarned: number,
  totalPossible: number,
  estimatedGrade: string,
  items: Array<FeedbackItem & { rubricCriterion: string }>
}
```

**Frontend:**
- `components/homework/RubricTable.tsx` — NEW: renders rubric score table
- Table uses color coding: green (>80%), yellow (60-80%), red (<60%) per criterion
- Each criterion row is expandable to show suggestions
- Below table: regular feedback items, each tagged with a rubric criterion pill

### Files to Create/Modify
- `components/homework/RubricTable.tsx` — NEW
- Homework upload flow — ADD rubric upload section
- `app/api/homework/check/route.ts` — MODIFY to handle `mode: 'rubric'`
- `lib/homework/checker-engine.ts` — ADD rubric parsing + grading prompts
- `messages/en/homework.json` — ADD i18n keys
- `messages/he/homework.json` — ADD i18n keys

---

## Feature #10: Visual Solving Alongside Chat

### What
As the homework tutor explains each step, a persistent diagram panel updates in sync — building up progressively. Uses EXTERNAL tools (Desmos, GeoGebra) for interactive, high-quality visuals.

### Why Previous Attempts Failed
Template-based SVG diagrams were:
- Static and non-interactive
- Fragile (100+ components to maintain)
- Couldn't evolve step-by-step with chat
- Quality was inconsistent

### New Approach: External Rendering Engines

The AI tutor outputs structured commands for external tools. The frontend embeds these tools and programmatically controls them.

**Tool selection by subject:**

| Subject | Tool | How it works |
|---------|------|-------------|
| Algebra/Functions/Calculus | **Desmos API** (free, embeddable) | AI outputs Desmos expressions. Each chat step adds expressions to the same graph. Student can interact (zoom, trace, click points). |
| Geometry/Constructions | **GeoGebra Applet** (free, embeddable) | AI outputs GeoGebra commands (points, segments, circles). Each step adds construction elements. |
| Statistics/Data | **Recharts** (React library, client-side) | AI outputs data arrays. Rendered as interactive charts. |
| Physics/General | **Existing TikZ engine** | Generates PNG step-sequences. Show latest in panel. |

**Desmos integration (primary — covers most math):**
```javascript
// Embed Desmos calculator
const calculator = Desmos.GraphingCalculator(element, { expressions: false });

// AI tutor response includes Desmos expressions:
// Step 1: "Let's graph y = 2x + 3"
calculator.setExpression({ id: 'step1', latex: 'y=2x+3', color: '#2d70b3' });

// Step 2: "Now let's add y = -x + 1"
calculator.setExpression({ id: 'step2', latex: 'y=-x+1', color: '#c74440' });

// Step 3: "The intersection is the solution"
calculator.setExpression({ id: 'step3', latex: '(0.67, 4.33)', color: '#388c46', pointStyle: 'POINT' });
```

**GeoGebra integration (geometry):**
```javascript
// Embed GeoGebra applet
const app = new GeoGebra.inject('geogebra-container');

// AI tutor outputs GeoGebra commands:
// Step 1: "Let's draw triangle ABC"
app.evalCommand('A = (0, 0)');
app.evalCommand('B = (4, 0)');
app.evalCommand('C = (2, 3)');
app.evalCommand('Polygon(A, B, C)');

// Step 2: "Now the height from C"
app.evalCommand('h = PerpendicularLine(C, Segment(A, B))');
```

### Layout

**Desktop (>768px):**
```
┌─────────────────────────────────────────────────┐
│  Chat (60%)           │  Diagram Panel (40%)    │
│                       │                         │
│  [Tutor message]      │  ┌───────────────────┐  │
│  [Student message]    │  │                   │  │
│  [Tutor message]      │  │   Desmos /        │  │
│  [Student message]    │  │   GeoGebra /      │  │
│  [Tutor message]      │  │   Chart embed     │  │
│                       │  │                   │  │
│  ┌──────────────────┐ │  └───────────────────┘  │
│  │ Type message...  │ │  ◀ Step 1  Step 3 ▶    │
│  └──────────────────┘ │  [Full Screen]          │
└─────────────────────────────────────────────────┘
```

**Mobile (<768px):**
```
┌─────────────────────┐
│  Diagram Panel      │ ← Collapsible, starts open
│  ┌─────────────────┐│
│  │  Desmos embed   ││
│  └─────────────────┘│
│  ◀ Step 1  Step 3 ▶ │
│  [Collapse ▼]       │
├─────────────────────┤
│  Chat               │
│  [Messages...]      │
│  ┌─────────────────┐│
│  │ Type message... ││
│  └─────────────────┘│
└─────────────────────┘
```

### Data flow

1. Tutor API response includes a new field: `visualUpdate`
```json
{
  "message": "Let's graph y = 2x + 3...",
  "visualUpdate": {
    "tool": "desmos",
    "action": "addExpression",
    "expressions": [
      { "id": "step1", "latex": "y=2x+3", "color": "#2d70b3", "label": "Line 1" }
    ]
  }
}
```

2. Frontend accumulates all `visualUpdate` entries from the conversation
3. Side panel renders the current state (all accumulated expressions/commands)
4. Step controls let user scrub through the visual history

### When does the panel appear?
- Only when the subject is visual (math graphing, geometry, physics, statistics)
- The AI tutor decides: first response includes `visualUpdate` → panel appears
- If the conversation is pure text/algebra → no panel, chat uses full width
- Student can manually toggle the panel on/off

### Note: DO NOT implement yet — plan only. Will be built after all other features.

### Files to Create/Modify
- `components/homework/VisualSolvingPanel.tsx` — NEW: panel with Desmos/GeoGebra embed
- `components/homework/DesmosEmbed.tsx` — NEW: Desmos API wrapper
- `components/homework/GeoGebraEmbed.tsx` — NEW: GeoGebra API wrapper
- `components/homework/TutoringChat.tsx` — MODIFY: split layout when visual is active
- `app/api/homework/sessions/[sessionId]/chat/route.ts` — MODIFY: add visualUpdate to responses
- `lib/homework/tutor-engine.ts` — MODIFY: generate Desmos/GeoGebra commands per step
- npm packages: `desmos` (CDN script), `geogebra-api` (CDN script)

---

## Feature #11: "I'm Still Confused" Escalation Ladder

### What
A button below tutor messages that cycles through increasingly different pedagogical approaches when the student doesn't understand.

### User Flow
1. Tutor explains something. Student doesn't get it.
2. Button below the message: **"I'm still confused 😕"**
3. Press 1 → Tutor rephrases in simpler words. Button changes to: **"Try an analogy →"**
4. Press 2 → Tutor uses a real-world analogy. Button changes to: **"Show me with numbers →"**
5. Press 3 → Tutor works through a concrete example with actual numbers. Button changes to: **"Watch a video →"**
6. Press 4 → YouTube video suggestion appears (already built). Button changes to: **"Start easier →"**
7. Press 5 → Tutor simplifies the problem: "Let's try a simpler version first, then work up." Button changes to: **"Ask your teacher"**
8. Press 6 → Message: "This is a tricky one! Your teacher can explain it in person. Show them this conversation for context." + copy/share button

### Technical Design

**State tracking:**
- Each message in the chat has an `escalationLevel` (0-5) tracked in frontend state
- Pressing the button sends a message to the tutor with a hidden system prefix

**System prefix per level:**
```
Level 1: [ESCALATION:REPHRASE] Rephrase the previous explanation using simpler words. Avoid jargon. Target a student 2 years younger.

Level 2: [ESCALATION:ANALOGY] Explain using a real-world analogy. "Think of it like..." Use something from everyday life the student would know.

Level 3: [ESCALATION:CONCRETE] Work through a concrete example with REAL numbers. Show every single step. Use small, easy numbers.

Level 4: [ESCALATION:VIDEO] (Handled by frontend — trigger YouTube search for the topic)

Level 5: [ESCALATION:EASIER] Give a MUCH simpler version of this problem. Solve it together step by step. Then say "Now let's try the harder version."

IMPORTANT: Do NOT repeat any explanation you've already given. The student has seen {N} explanations and is still confused. Try a fundamentally different approach.
```

**Frontend:**
- Button text changes at each level (showing what's next)
- Each escalation creates a new chat message (visible in history)
- Visual indicator next to escalated messages showing the approach type (icon + label)
- After Level 6 ("Ask teacher"), the button disappears for this topic

**YouTube integration (Level 4):**
- Already built: `searchYouTubeVideos()` in the tutor chat route
- Trigger it specifically for the current topic
- Show YouTube embed inline in the chat

### Files to Create/Modify
- `components/homework/TutoringChat.tsx` — MODIFY: add escalation button, state tracking
- `components/homework/EscalationButton.tsx` — NEW: the evolving button component
- `app/api/homework/sessions/[sessionId]/chat/route.ts` — MODIFY: handle escalation prefixes
- `lib/homework/tutor-engine.ts` — ADD escalation-aware prompt templates
- `messages/en/homework.json` — ADD i18n keys for button labels
- `messages/he/homework.json` — ADD i18n keys

---

## Feature #12: Diagram Engine Overhaul

### Current State
- The old 100+ React SVG components in `components/math/` are DELETED ✓
- The current system uses `lib/diagram-engine/` with TikZ/E2B + Recraft for PNG generation
- `lib/diagram-schemas.ts` (102 schemas, 80KB) is actively used for AI decision-making
- Some remnants from the old system may be dead code

### Phase A: Dead Code Cleanup

**Audit and remove if dead:**
1. `lib/visual-learning/` (types.ts, validator.ts, index.ts) — Check if anything imports from here
2. `messages/en/diagram.json` + `messages/he/diagram.json` — Were for SVG component labels. Check if still referenced.
3. `__tests__/components/diagrams/` — Tests for components that may no longer exist
4. `components/diagrams/DiagramExplanationPanel.tsx` — Check if rendered anywhere
5. `components/diagrams/FullScreenDiagramView.tsx` — Check if rendered anywhere
6. Old diagram type definitions in `types/index.ts` (MathVisual, TreeDiagramData, etc.) — Check usage

**Keep:**
- `lib/diagram-engine/` — The current working engine
- `lib/diagram-schemas.ts` — Actively used for AI schema selection
- `components/homework/diagram/` — Current renderers for engine-generated images
- `contexts/VisualsContext.tsx` + `hooks/useVisualPreference.ts` — Settings integration

### Phase B: Hybrid Rendering Engine

**Problem with current engine:** Everything generates static PNGs via TikZ/LaTeX compilation or Recraft AI. This is:
- Slow (2-5 seconds per diagram)
- Non-interactive (static images)
- Resource-heavy (E2B sandbox per render)
- Fragile (LaTeX compilation errors)

**New approach: Route to the best rendering tool per diagram type.**

```
DiagramRouter (upgraded lib/diagram-engine/router.ts)
├── Desmos API     → math graphs, functions, coordinate planes, inequalities
│                    (interactive, instant, free)
├── GeoGebra API   → geometry constructions, triangles, circles, angles
│                    (interactive, instant, free)
├── Recharts       → statistics: box plots, histograms, scatter plots, bar charts
│                    (interactive, client-side, React-native)
├── Mermaid.js     → flowcharts, tree diagrams, sequence diagrams
│                    (client-side, fast)
├── TikZ Engine    → specialized: circuit diagrams, molecular structures, physics diagrams
│                    (keep for niche cases where no interactive tool exists)
└── Recraft AI     → keep as fallback for complex custom visuals
```

**Routing decision:**
```typescript
function routeDiagram(type: string): RenderEngine {
  const desmosTypes = ['coordinate_plane', 'function_graph', 'linear_equation',
    'quadratic_graph', 'inequality_graph', 'system_of_equations', 'scatter_plot_regression',
    'trigonometric_graph', 'piecewise_function', 'parametric_curve', 'polar_graph'];

  const geogebraTypes = ['triangle', 'circle_geometry', 'angle_measurement',
    'parallel_lines', 'polygon', 'transformation', 'congruence', 'similarity',
    'pythagorean_theorem', 'circle_theorems', 'construction'];

  const rechartsTypes = ['box_plot', 'histogram', 'dot_plot', 'bar_chart',
    'pie_chart', 'line_chart', 'stem_leaf_plot', 'frequency_table'];

  const mermaidTypes = ['tree_diagram', 'flowchart', 'sequence_diagram',
    'factor_tree', 'probability_tree'];

  if (desmosTypes.includes(type)) return 'desmos';
  if (geogebraTypes.includes(type)) return 'geogebra';
  if (rechartsTypes.includes(type)) return 'recharts';
  if (mermaidTypes.includes(type)) return 'mermaid';
  return 'tikz'; // fallback
}
```

**Benefits:**
- Most common diagrams render INSTANTLY (client-side, no API call)
- Students can INTERACT with graphs (zoom, trace, click points)
- No E2B/LaTeX compilation for 80% of cases
- Recharts integrates natively with React (already in the Next.js ecosystem)
- Desmos and GeoGebra are battle-tested, beautiful, and free

**AI output format changes:**
Instead of asking Claude to output raw TikZ code, the AI outputs tool-specific structured data:

For Desmos:
```json
{
  "engine": "desmos",
  "expressions": [
    { "latex": "y=2x+3", "color": "#2d70b3", "label": "f(x)" },
    { "latex": "(1, 5)", "color": "#c74440", "pointStyle": "POINT" }
  ],
  "viewport": { "xmin": -5, "xmax": 5, "ymin": -5, "ymax": 10 }
}
```

For Recharts:
```json
{
  "engine": "recharts",
  "chartType": "box_plot",
  "data": { "min": 12, "q1": 18, "median": 22, "q3": 28, "max": 35, "outliers": [8, 42] },
  "labels": { "title": "Test Scores", "xAxis": "Score", "yAxis": "Frequency" }
}
```

### Files to Create/Modify
- `lib/diagram-engine/router.ts` — OVERHAUL: add Desmos/GeoGebra/Recharts/Mermaid routing
- `components/diagrams/DesmosRenderer.tsx` — NEW
- `components/diagrams/GeoGebraRenderer.tsx` — NEW
- `components/diagrams/RechartsRenderer.tsx` — NEW
- `components/diagrams/MermaidRenderer.tsx` — NEW
- `components/diagrams/DiagramContainer.tsx` — NEW: unified container that delegates to correct renderer
- `lib/diagram-engine/desmos-adapter.ts` — NEW: converts AI output to Desmos expressions
- `lib/diagram-engine/geogebra-adapter.ts` — NEW: converts AI output to GeoGebra commands
- `lib/diagram-schemas.ts` — MODIFY: add engine routing metadata per schema
- Dead code files — DELETE after audit

---

## Feature #13: Scan → Solve → Explain

### What
After scanning a formula with the formula scanner, a "Solve This" button appears below the recognized formula. Pressing it solves the formula step-by-step, graphs it (if applicable), and explains what it represents.

### User Flow
1. Student scans a formula: `3x + 5 = 20`
2. LaTeX rendering shows the recognized formula
3. Below the formula, a button: **"Solve This 🧮"**
4. Student presses it → loading shimmer
5. Three expandable sections appear below:
   - **"Step-by-Step Solution"** (always shown):
     ```
     Step 1: 3x + 5 = 20  (start)
     Step 2: 3x = 20 - 5 = 15  (subtract 5 from both sides)
     Step 3: x = 15/3 = 5  (divide both sides by 3)
     Step 4: Check: 3(5) + 5 = 20 ✓
     ```
   - **"Graph"** (only if formula has variables): Interactive Desmos embed showing the equation
   - **"What This Means"**: "This is a linear equation in one variable. It asks: what number, when tripled and increased by 5, equals 20? The answer is 5."
6. Each section is collapsible/expandable
7. NO "connect to relevant lessons" feature

### Technical Design

**New API endpoint:**
```
POST /api/formula-scanner/solve
Body: {
  latex: string,        // The LaTeX expression
  originalText?: string // Raw OCR text
}
Response: {
  steps: Array<{
    stepNumber: number,
    expression: string,      // LaTeX
    explanation: string      // Plain text
  }>,
  graph: {
    engine: 'desmos',
    expressions: Array<{ latex: string, color: string }>
  } | null,
  explanation: string        // 2-3 sentence plain-English description
}
```

**Claude prompt:**
```
The student scanned this formula: {latex}

1. SOLVE it step by step. Show every algebraic step with explanation.
   - If it's an equation: solve for the unknown
   - If it's an expression: simplify
   - If it's a formula (like A=πr²): show how to use it with an example
2. Should this be GRAPHED? If it has variables that can be plotted on a coordinate plane, output Desmos expressions. If it's a simple arithmetic equation (like 2+3=5), no graph.
3. EXPLAIN in 2-3 simple sentences what this formula represents. No jargon.

Return as JSON.
```

**Graph integration:**
- If `graph !== null`, render an embedded Desmos calculator (same component from Feature #10)
- Desmos is ideal because it handles any mathematical expression natively
- Graph viewport auto-calculated from the expressions

**Frontend:**
- `components/formula-scanner/SolveResult.tsx` — NEW: renders the 3 sections
- Steps rendered with LaTeX (KaTeX) for math, plain text for explanations
- Graph section only appears if formula is graphable
- All sections start collapsed except "Step-by-Step" (most useful)
- "Solve This" button has a subtle bounce animation to draw attention

### Files to Create/Modify
- `components/formula-scanner/SolveResult.tsx` — NEW
- `app/api/formula-scanner/solve/route.ts` — NEW API
- `app/(main)/formula-scanner/page.tsx` — MODIFY: add "Solve This" button + result display
- `messages/en/formula.json` — ADD i18n keys
- `messages/he/formula.json` — ADD i18n keys

---

## Implementation Order (Recommended)

Features are ordered by: dependency chain, shared components, and risk.

### Batch 1 — Foundation (no dependencies)
- **#12 Phase A**: Dead code cleanup (reduces codebase noise before building new features)
- **#5**: "Why Was I Wrong" deep dive (standalone practice improvement)
- **#11**: Escalation ladder (standalone chat improvement)

### Batch 2 — Homework enhancements (share checker infrastructure)
- **#7**: Batch worksheet mode
- **#8**: Before-you-submit mode
- **#9**: Rubric mode
- **#6**: Practice from homework mistakes (depends on feedback renderer changes from #7)

### Batch 3 — Lesson & practice improvements
- **#2**: Depth on demand (lesson system)
- **#3**: Worked examples from mistakes (lesson system)
- **#4**: Infinite practice mode (practice system)

### Batch 4 — Diagram engine overhaul
- **#12 Phase B**: Hybrid rendering engine (Desmos/GeoGebra/Recharts/Mermaid)

### Batch 5 — Formula scanner
- **#13**: Scan → Solve → Explain (depends on Desmos renderer from #12B)

### Batch 6 — Visual solving (LAST — most complex, depends on #12B)
- **#10**: Visual solving alongside chat (depends on Desmos/GeoGebra from #12B)

---

## Shared Components Across Features

| Component | Used By |
|-----------|---------|
| DesmosEmbed / DesmosRenderer | #10, #12B, #13 |
| GeoGebraEmbed / GeoGebraRenderer | #10, #12B |
| RechartsRenderer | #12B |
| MermaidRenderer | #12B |
| Homework checker mode handling | #7, #8, #9 |
| "Practice This" button | #6, #7 |
| Escalation state tracking | #11 |
| WorkedExampleCard | #3 |
| DeepDiveCard | #5 |

---

## Quality Checklist (Apply to Every Feature)

- [ ] Works in both EN and HE (RTL layout, translated strings)
- [ ] Works on mobile (375px width — iPhone SE)
- [ ] Works in dark mode and light mode
- [ ] Loading states use skeleton shimmers, not spinners
- [ ] Error states are user-friendly (not raw error messages)
- [ ] Animations are smooth (60fps, no jank)
- [ ] AI responses are validated before rendering
- [ ] No console errors in browser
- [ ] TypeScript: 0 errors
- [ ] ESLint: 0 new warnings
- [ ] All existing tests still pass
- [ ] New features have at minimum smoke tests
