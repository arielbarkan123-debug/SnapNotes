# X+1 — Design Context for Redesign

Complete page-by-page map of X+1 (xplus1.ai), an AI study app for teenagers. Use this file as context when redesigning the product.

---

## 1. Product Summary

**X+1** (formerly NoteSnap) is an AI-powered study companion. A student snaps a photo of their notebook, homework, textbook page, or uploads a PDF/PPTX/DOCX — and X+1 turns it into interactive lessons, quizzes, worked examples, spaced-repetition flashcards, and a personalized tutor.

- **Audience:** 14–18 year-old high school students. Primary market: Israel (Bagrut exams). Also launching internationally.
- **Languages:** English (LTR) + Hebrew (RTL) — full localization on every page.
- **Founder:** Ariel Barkan (16, Israel).
- **Live URL:** https://snap-notes-j68u-three.vercel.app/ | https://xplus1.ai
- **Tech:** Next.js 14 App Router + React Server Components, Tailwind CSS 3.4, Supabase (auth + Postgres + storage), Claude Sonnet 4.6 for AI, next-intl for i18n.

### Current Brand / Design Language
- **Primary color:** `violet-600` → `purple-600` gradients
- **Typography:** system sans (no custom font — this is a weak spot)
- **Component style:** `rounded-2xl` cards, soft shadows, light/dark mode, blur-heavy backgrounds
- **Feel:** Clean SaaS, safe, professional — but generic and not youth-forward enough.
- **Logo:** Violet squircle with a stylized open-book/notebook SVG

### Redesign Goals
- Bold, youth-forward identity — distinctive typography, confident color palette
- Dramatize the "snap → instant lesson" magic moment
- Trust signals + student voices
- Fast, fun, a little rebellious — not like a textbook
- Must work in both LTR (English) and RTL (Hebrew)
- Mobile-first (most users are on phones)

---

## 2. Page-by-Page Map

### Public Pages (no auth)

#### 2.1 `/` — Landing Page
**Purpose:** Convert visitors to sign up.
**Layout (top-to-bottom):**
1. **Sticky header** — logo (violet squircle + "X+1" wordmark), Log In link, Sign Up button (violet pill)
2. **Hero** — h1 with gradient highlight ("Turn Your Notes Into [Study Courses]"), subtitle, dual CTA (Get Started Free + Log In), mock UI card showing notebook → generated course with violet/purple/blue concept pills
3. **How It Works** — 3 numbered steps with gradient icons: (1) Upload Notes, (2) AI Analyzes, (3) Get Your Course
4. **Features grid** — 6 cards: Handwriting Recognition, Instant Processing, Clear Explanations, Organized Structure, Mobile Friendly, Private & Secure
5. **CTA banner** — Big violet-to-purple gradient card with headline + white pill button
6. **Footer** — logo, links (Log In, Sign Up, Privacy, Terms), copyright

#### 2.2 `/login` — Login
Email + password form, social login (Google), "Forgot password?" link, redirect to signup. Card-centered on aurora background.

#### 2.3 `/signup` — Sign Up
Email + password + name form, Google sign-up, Terms/Privacy checkbox, redirect to login. Same visual style as login.

#### 2.4 `/forgot-password` — Password Reset Request
Email field → sends magic link. Minimal centered card.

#### 2.5 `/reset-password` — Password Reset
New password + confirm. Token from URL.

#### 2.6 `/privacy` — Privacy Policy
Long-form legal text, typography-focused.

#### 2.7 `/terms` — Terms of Service
Long-form legal text, same template as privacy.

#### 2.8 `/offline` — Offline Fallback
Shown by service worker when network fails. Illustration + "You're offline" + cached content link.

---

### Authenticated Main App

All authed pages share a **sticky top nav** (logo, search, notifications, profile dropdown) and a **side nav** on desktop (or bottom tab bar on mobile) with: Dashboard, Courses, Homework, Practice, Prepare, Review, Exams, Progress.

#### 2.9 `/onboarding` — First-Run Setup
Multi-step wizard: pick grade level, pick subjects, pick goals (Bagrut / SAT / general study), pick study intensity. Progress bar at top, big cards with icons, Back/Next buttons.

#### 2.10 `/dashboard` — Home After Login
**Purpose:** Entry point after signup. Shows progress + quick actions.
**Layout:**
- Welcome header with user name + streak badge
- **Quick Actions** grid (4 cards): Upload Notes, Check Homework, Practice, Take Exam
- **Practice Widget** — "cards due today" + Start Review button
- **Study Plan Widget** — today's plan, upcoming tasks
- **Recent Courses** — horizontal scroll of course cards (cover image + title + progress bar)
- **Weak Areas** — AI-identified topics to focus on, with Practice buttons
- **Onboarding Insights** — shown until user completes first 3 actions
- **Welcome Modal** — first-time user popup

#### 2.11 `/courses` — All Courses
Grid of CourseCards (cover image, title, subject, # lessons, progress bar, last studied). Filters: subject, status (in-progress / done). Search. Bulk delete. "Create Course" FAB that opens upload modal.

#### 2.12 `/course/[id]` — Course Overview
**Layout:**
- Hero with cover image + title + subject tag
- **Lesson list** — numbered, with completion checkmarks, duration estimate
- Each lesson links to `/course/[id]/lesson/[lessonIndex]`
- **Original Image** button — opens modal with source photos
- **Edit / Delete** in overflow menu
- **Study Plan** button — add to schedule

#### 2.13 `/course/[id]/lesson/[lessonIndex]` — Lesson Player
**THE CORE LEARNING EXPERIENCE.**
- Top bar: back to course, lesson title, progress (step X of Y)
- **Main content area** — renders Step objects: explanation, key_point, question (MCQ), formula (LaTeX via KaTeX), diagram (100+ interactive SVG types — coordinate planes, force diagrams, geometry, etc.), example, worked_example, practice_problem, summary
- **Navigation** — Prev / Next at bottom, progress bar
- **Lesson Notes** sidebar (collapsible) — student's own notes
- **Annotate** — highlight/pen on source image
- Completion celebration at end

#### 2.14 `/processing` — Upload Progress
Shown while AI generates course. Progress bar, step-by-step status ("Extracting text...", "Identifying concepts...", "Generating lessons..."), polling animation. Falls through to `/course/[id]` when done.

#### 2.15 `/homework` — Homework Hub
**Purpose:** Pick between "Check my answer" vs "Help me solve".
Two large FeatureCards side-by-side:
- **Check** (blue gradient) — snap your finished work, get rubric-based feedback
- **Help** (violet gradient, marked "Popular") — real-time tutor chat
- **Recent Activity** list below

#### 2.16 `/homework/check` — Homework Checker
Upload photo of completed homework + rubric/answer key → AI grades it. Shows:
- Original photo with annotations (red circles, notes)
- Rubric table (criteria × score)
- Feedback sections (what went well, what to improve)
- Grade estimate
- "Retry this question" button

#### 2.17 `/homework/help` — Homework Helper (Tutor)
**THE STAR FEATURE.**
- Upload question + (optional) reference materials
- **Tutoring Chat** — conversation with AI tutor that uses Socratic method
- **Visual Solving Panel** — AI generates step-by-step diagrams, embeds Desmos (graphing), GeoGebra (geometry), Mermaid (flowcharts), Recharts (data)
- **Escalation Button** — "I'm really stuck" → tutor gives more direct help
- **Explanation Style Selector** — visual / step-by-step / concise
- **Before Submit** — final check before student hands in

#### 2.18 `/homework/history` — Past Sessions
Table/list of previous check + help sessions. Filters, search.

#### 2.19 `/homework/[sessionId]` — Single Session View
Replay of a past homework session.

#### 2.20 `/practice` — Practice Hub
Pick practice mode: flashcards (SRS), quiz, mixed. Shows cards due, streak.

#### 2.21 `/practice/math` — Math Practice
Dedicated math practice with LaTeX input, step-by-step hints, similar-problem generator.

#### 2.22 `/practice/[sessionId]` — Practice Session
Card-by-card review flow (FSRS algorithm). Again / Hard / Good / Easy buttons. Progress bar, stats at end.

#### 2.23 `/prepare` — Prepare Guides (Exam Prep)
List of prep guides generated from past exam papers. Subject filter, difficulty.

#### 2.24 `/prepare/[id]` — Single Prepare Guide
**Rich study guide viewer.**
- Table of contents sidebar
- Sections: definitions, formulas, worked examples, tables, diagrams, embedded YouTube videos
- Chat sidebar — ask questions about the guide
- Markdown + math rendering

#### 2.25 `/cheatsheets` — Cheatsheets List
AI-generated one-page study summaries. Grid view.

#### 2.26 `/cheatsheets/[id]` — Single Cheatsheet
Printable one-pager, export to PDF.

#### 2.27 `/exams` — Exams List
User-taken + available exams. Status pills (not-started, in-progress, done + score).

#### 2.28 `/exams/[id]` — Exam Taking
Timed exam UI. Question navigator sidebar, flag for review, submit modal. Shows result breakdown after.

#### 2.29 `/review` — Spaced Repetition Review
Today's due cards. Card flip animation, 4-button rating. Daily goal progress.

#### 2.30 `/progress` — Progress Stats
Charts: study time, accuracy, streak calendar, subjects mastered, weekly goals.

#### 2.31 `/knowledge-map` — Knowledge Map
Visual graph of topics mastered vs weak, with clickable nodes.

#### 2.32 `/formula-scanner` — Formula Scanner
Snap a formula photo → get instant explanation, variables defined, examples.

#### 2.33 `/study-plan` — Study Plan
Calendar view of scheduled study tasks. Drag to reschedule.

#### 2.34 `/study-plan/create` — Create Plan
Wizard: pick exam date, subjects, daily time budget → AI generates plan.

#### 2.35 `/profile` — Profile
Avatar, name, email, grade, subjects, stats summary.

#### 2.36 `/settings` — Settings
Account, language (EN/HE), theme (light/dark/auto), notifications, email preferences, parent email, data export, delete account.

#### 2.37 `/settings/past-exams` — Past Exams Library
Manage uploaded past exam PDFs used for prep guide generation.

---

### Admin (hidden)

#### 2.38 `/admin/monitoring` — System Monitoring
Queue status, error rates, recent failures. Internal.

#### 2.39 `/admin/walkthrough-quality` — Walkthrough QA
Review AI-generated diagrams, flag bad ones.

#### 2.40 `/analytics/*` — Analytics Dashboards
Engagement, sessions, journeys, funnels, events, pages, errors, heatmap, export. Internal team only.

---

## 3. Shared Component Inventory

### UI primitives (`components/ui/`)
Button, Input, Card, Modal, Toast, Spinner, Tabs, Dropdown, Select, Avatar, Badge, ProgressBar, Skeleton.

### Feature component groups
- **course/** — CourseCard, CreateCourseModal, LessonNotes, OriginalImageModal, AnnotationButton
- **lesson/** — Step renderers (Explanation, Question, Formula, Diagram, Example, WorkedExample, PracticeProblem, Summary)
- **homework/** — TutoringChat, VisualSolvingPanel, RubricTable, AnnotatedImageViewer, DesmosEmbed, GeoGebraEmbed, ExplanationStyleSelector, EscalationButton
- **prepare/** — GuideRenderer, GuideSectionRenderer, GuideTableOfContents, PrepareChatSidebar, YouTubeEmbed, MarkdownWithMath
- **diagrams/** — 100+ interactive SVG components (math, physics, chem, bio)
- **dashboard/** — QuickActions, PracticeWidget, StudyPlanWidget, WeakAreas, OnboardingInsights, WelcomeModal
- **srs/** — FlashcardFlip, RatingButtons, SessionStats
- **exam/** — QuestionNavigator, Timer, SubmitModal, ResultBreakdown
- **shared/** — Header, SideNav, BottomTabBar, SearchBar, NotificationBell, ProfileDropdown
- **upload/** — FileDropzone, CameraCapture, UploadProgress

---

## 4. Design System Tokens (current)

### Colors
```
Primary:   violet-500 → violet-600 → violet-700 (gradients to purple-600)
Accent:    purple, pink, amber (for category variety)
Success:   green-400 / green-500
Warning:   yellow-400 / amber
Danger:    red-400 / red-500
Neutral:   gray-50 → gray-900 (full scale)
Dark mode: gray-800, gray-900 backgrounds
Bg:        aurora-bg (custom class, subtle gradient)
```

### Typography
- **Current:** system sans (needs upgrade — this is a known weak point)
- **Sizes:** text-sm (14), text-base (16), text-lg (18), text-xl (20), text-2xl (24), text-3xl (30), text-4xl (36), text-5xl (48), text-6xl (60)
- **Weights:** 400, 500, 600 (semibold), 700 (bold)

### Spacing
Tailwind default scale. Heavy use of `gap-4`, `gap-6`, `gap-8` in flex/grid.

### Radius
`rounded-lg`, `rounded-xl`, `rounded-2xl`, `rounded-3xl`, `rounded-full` (pill buttons, avatars).

### Shadow
`shadow-sm`, `shadow-md`, `shadow-lg`, `shadow-xl`, `shadow-2xl`, `shadow-card` (custom), `shadow-violet-600/25` (colored glow on primary buttons).

### Motion
Framer Motion for page transitions, card hover, step-by-step diagram reveals.

---

## 5. Technical Constraints for Redesign

- **Must support RTL** — every flex/grid layout uses `ltr:` / `rtl:` prefixes for asymmetric spacing. Icons with direction (arrows) need `rtl:rotate-180`.
- **Mobile-first** — most students use phones. Bottom tab bar on mobile, side nav on desktop ≥ `md:`.
- **Dark mode** — every component has `dark:` variants.
- **Server Components by default** — only add `'use client'` for interactivity (forms, hooks, motion).
- **i18n via next-intl** — all user-facing strings come from `messages/en/*.json` and `messages/he/*.json` (37 namespaces).

---

## 6. What's Not Working / Pain Points in Current Design

1. **Landing page feels generic SaaS** — violet-on-white isn't distinctive for a youth brand
2. **Typography has no personality** — system font, no display face
3. **Hero doesn't show the magic** — the mock UI is too abstract, doesn't convey instant results
4. **No social proof** — missing student testimonials, numbers, logos
5. **Dashboard is information-dense** — needs clearer hierarchy, fewer widgets on small screens
6. **Homework Helper visual identity is buried** — this is the hero feature but doesn't feel special
7. **Course cards look like Udemy** — need more personality, maybe subject-themed colors
8. **Empty states are plain** — could be delightful illustrations
9. **Loading states are generic spinners** — could be branded animations
10. **Color coding is weak** — hard to differentiate subjects/topics at a glance

---

## 7. Direction for the Redesign

Ariel wants something that feels:
- **Bold, confident, youth-forward** (think Duolingo energy, Notion polish, Linear precision)
- **Distinctive typography** — a custom display face with personality
- **Strong color identity** — not just violet; maybe a signature secondary color + rich accent palette per subject
- **Dramatizes the snap-to-lesson magic** — hero should make you feel the product
- **Trust signals prominent** — student count, schools, testimonials, press
- **Mobile-native feel** — not a desktop site scaled down
- **Hebrew-ready** — RTL-first thinking, not bolt-on

---

*End of design context. Drag this file (or the whole `/docs` folder) into Claude Design → Import.*
