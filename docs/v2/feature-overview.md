# Feature Overview

> A high-level map of all current features for new developers. Use this as a starting point before diving into the codebase.

---

## Routes & Features

### `/dashboard`
- Create course via file upload, plain text, or YouTube URL
- View mistake patterns
- Generate cover image for a course
- Set course difficulty level

### `/courses`
- List all courses
- Create a new course
- Search and filter courses

### `/course/{courseId}`
- Course progress indicator
- Course overview
- List all lessons
- Generate cheatsheet for the course
- Export course as PDF
- Add new material to an existing course

### `/course/{courseId}/lesson/{lessonId}`
- View lesson notes
- Generate a deeper explanation of a concept
- Ask AI chat within the lesson
- Request help (need help flow)
- Answer one question inline during the lesson
- Mark lesson as complete

### `/review`
- Daily review session
- Card-based review (up to 20 cards per session)
  - Multiple choice
  - Input field
  - Think-process output
- XP reward after finishing a session
- Quick reflection at the end

### `/practice`
- Set number of questions
- Select topics
- Practice with diagrams
- Upload past exams for practice
- Infinite practice mode
- Upload content as practice source

### `/homework`
- Create an AI-powered homework checker

### `/exams`
- Create an exam
- Take an exam
- View exam results

### `/prepare`
- Generate a study guide
- Use the study tutor (AI-guided prep chat)

### `/study-plan`
- Generate a study plan for a specific course

### `/progress`
- Full progress overview
- Summary statistics
- Graphs and charts
- Mastery map
- Focus areas
- Mastered topics list
- Personalized insights

### `/formula-scanner`
- Analyze and explain formulas from uploaded images

### `/cheatsheets`
- List all generated cheatsheets

### `/cheatsheets/{cheatsheetId}`
- View a specific cheatsheet with course guidelines

### `/settings`
- Manage profile
- Learning preferences
- App settings
- Visual learning configuration
- Parent reports
- Delete account

---

## Known Improvements (Backlog)

| # | Area | Description |
|---|------|-------------|
| 1 | **Sidebar / Dashboard** | Sidebar navigation needs a structural and UX overhaul |
| 2 | **RAG Integration** | Use retrieval-augmented generation to reduce token usage and speed up AI context loading |
| 3 | **UI Redesign** *(client priority)* | Remove vibe-coded gradient-heavy UI; standardize to a 2–3 tone color palette |

---

## Notes for New Developers

- Start with `CLAUDE.md` at the root — it contains the full tech stack, type index, key code patterns, and directory structure.
- All API routes live under `app/api/` (55+ routes).
- Shared UI primitives are in `components/ui/`.
- Business logic belongs in `lib/<feature>/`, not in components or API routes.
- The app supports English and Hebrew with RTL layout — always verify changes in both locales.
