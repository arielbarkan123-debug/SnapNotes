# NoteSnap App Documentation — User-Facing Audit

> Generated from live testing on production (snap-notes-j68u.vercel.app)
> Date: 2026-02-02
> User account: arielbarkan11
> Language tested: English + Hebrew (RTL)

---

## 1. NAVIGATION & HEADER

### Desktop Header (Top Bar)
- **Logo**: "NoteSnap" text in violet, links to /dashboard
- **Nav links** (L→R in English, R→L in Hebrew): Courses, Review, Practice Mix, Homework, Exams, Study Plan, Progress
- **Search button**: Magnifying glass icon, opens search modal
- **Language toggle**: Shows flag + language name (switches EN↔HE)
- **User profile**: Shows avatar + username "arielbarkan11", links to /profile
- **Log out button**: Text button at far edge
- **Style**: Frosted glass effect (semi-transparent white bg + backdrop-blur)
- **Active tab**: "Courses" is highlighted with violet background + white text (pill shape)

### Mobile Bottom Nav
- (Not tested yet — need mobile viewport)

---

## 2. DASHBOARD (/dashboard)

### Page Layout
- **Background**: Aurora gradient (soft violet/rose/sky radial gradients) — CONFIRMED WORKING
- **Title**: "Your Study Courses" with subtitle "8 courses"
- **Upload CTA**: "Upload Notebook Page" button — violet gradient, pill-shaped — top right

### Dashboard Widgets (above course grid)

#### 2a. Daily Review Widget
- Shows book emoji + "Daily Review" heading
- Stats: "2 cards due" (orange badge), "99+ new cards" (blue badge)
- "Start Review →" button — violet pill, links to /review
- Card style: rounded corners, white bg, subtle shadow

#### 2b. Study Plan Widget
- Shows clipboard icon + "Study Plan" heading
- Right side: "13 days until exam"
- Lists 3 tasks:
  - Learn: The Two Stages of Photosynthesis (15 min)
  - Learn: Environmental Factors Affecting Photosynthesis (15 min)
  - Review: Understanding Photosynthesis (10 min)
- "+1 more" indicator
- "View Full Plan >" link to /study-plan

#### 2c. Knowledge Gaps Alert
- Warning icon + "Knowledge Gaps" + "2 gaps" red badge
- Refresh and Dismiss buttons (top right)
- Message: "2 critical gaps may be blocking your progress"
- Gap 1: "תחום הצבה" (Domain of function) — red dot — with explanation
- Gap 2: "משוואות רציונליות" (Rational equations) — red dot — with explanation
- Actions: "Fix Gaps" button (links to /practice?gaps=true), "View All" link (/gaps)

#### 2d. Areas to Review (Weak Areas)
- Shows stats: 0% Avg Mastery, 2 High Priority, 2 Due Review
- Lists weak topics with links directly to specific lessons:
  - Introduction to Newton's Second Law (0% mastery, 22d ago)
  - Understanding Division in Real-World Contexts (0% mastery, 21d ago)
- Each links to the specific lesson page

#### 2e. Quick Action Buttons (3 buttons)
- "Continue Learning" — shows course name (Physics of Inclined Planes)
- "Quick Practice" — "10 questions, all courses"
- "Review Cards" — "22 cards due"

#### 2f. Review Reminder Banner
- "You have 22 cards due — a quick review helps memory!"
- "Review Now" button + "Dismiss" X button

### Course Grid
- **Search bar**: "Search courses..." with search icon
- **Sort**: "Newest" dropdown + Refresh button
- **8 courses displayed** as cards with:
  - Course cover image (AI-generated abstract gradient)
  - Lesson count badge (e.g. "6 lessons")
  - Course title (truncated if long)
  - Date created
  - Difficulty badge (🔥 Advanced or ⚡ Intermediate)
  - Delete button (trash icon, top-left corner)

### Courses listed:
1. Physics of Inclined Planes (6 lessons, Advanced, Jan 18 2026)
2. Division Word Problems (4 lessons, Intermediate, Jan 12 2026)
3. Newton's Second Law (5 lessons, Intermediate, Jan 11 2026)
4. Weather Measurement Tools (4 lessons, Intermediate, Jan 8 2026)
5. מבלן (6 lessons, Intermediate, Jan 4 2026) — Hebrew name
6. מבלן (6 lessons, Intermediate, Jan 4 2026) — duplicate?
7. אחוזים (Percentages) (5 lessons, Intermediate, Jan 2 2026)
8. Biology: Photosynthesis (5 lessons, Intermediate, Dec 28 2025)

---

## 3. COURSE VIEW (/course/[id])
(Testing next...)

## 4. REVIEW (/review)
(Testing next...)

## 5. PRACTICE (/practice)
(Testing next...)

## 6. HOMEWORK (/homework)
(Testing next...)

## 7. EXAMS (/exams)
(Testing next...)

## 8. STUDY PLAN (/study-plan)
(Testing next...)

## 9. PROGRESS (/progress)
(Testing next...)

## 10. SETTINGS (/settings)
(Testing next...)

## 11. PROFILE (/profile)
(Testing next...)

---

## DESIGN SYSTEM OBSERVATIONS

### Aurora Design (Soft Aurora — Option D)
- **Background**: Pastel gradient mesh with violet/rose/sky — WORKING
- **Font**: Plus Jakarta Sans (English), Rubik (Hebrew) — WORKING
- **Buttons**: Pill-shaped (rounded-full), primary uses violet gradient — WORKING
- **Cards**: 22px border radius, layered soft shadows — WORKING
- **Header**: Frosted glass (backdrop-blur + semi-transparent) — WORKING
- **Color palette**: Violet primary, replacing old indigo — WORKING
- **Active nav**: Violet bg with white text pill — WORKING

### Issues Found
(Will document as testing progresses...)

---

## BUGS & ISSUES FOUND
(Will document as testing progresses...)

---

## FEATURE INVENTORY
(Complete feature list for future reference...)
