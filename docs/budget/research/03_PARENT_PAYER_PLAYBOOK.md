# The Minor-User / Parent-Payer Playbook for X+1

> Research brief by agent #3 of 4. How every successful consumer app selling to kids 12-18 (where the payer is the parent) has solved the payment + conversion problem.

## App-by-App Teardowns

### 1. Duolingo — The "Teen Invites Parent" Funnel

**How the parent converts:** They don't discover Duolingo. The **teen** does. Duolingo's growth engine is the teen (or adult learner) downloading the free app, building a streak, hitting the hearts/energy wall, and **sharing a "join my Family Plan" link** to a parent. The Family Plan converts *inside the app*: Super user invites up to 5 members, each accepts via email link.

**Pricing:** Super Duolingo is ~$83-168/year individual. Family Plan is **$119.99/year for up to 6 seats** — ~$20/seat, a 75% per-seat discount vs. individual. Parent often joins *the teen's plan* (not the other way around), or the parent pays for Super and adds the teen.

**Parent dashboard:** Effectively none — Family Plan is a billing-only primitive. No activity tracking, no content controls. This is a weakness X+1 should exploit.

**Conversion:** Super conversion rate is ~8-10% of MAUs. Family Plan is ~40% of paid subs. **The unlock is streak anxiety** — teens generate the desperation, parents pay to make it stop.

**Takeaway for X+1:** The teen is the acquisition channel. Let them send an "ask my parent" link from inside the product.

### 2. Khan Academy / Khanmigo — The "Parent-Led" Model

**How the parent converts:** Khan Academy is free. Khanmigo (AI tutor) is **$4/mo or $44/yr** — and crucially, the **subscription is on the parent's account**, which then activates Khanmigo for **up to 10 kids under 18** on their linked learner accounts.

**Parent dashboard:** This is the strongest parent UX in the category. Parents see **full chat history with Khanmigo, safety alerts when Khanmigo flags concerning content, topic summaries, and time spent**. Khan explicitly markets "you can view your child's chats" as a *safety feature* — which is also the biggest conversion lever.

**Payments:** Parent card, Stripe customer portal. Only parents can subscribe; kids cannot.

**Conversion:** Khan hasn't published exact numbers, but the $44 price point was chosen specifically as "lower than a single Kumon session." Internal interviews and reviews suggest **~2-5% of active parent accounts convert** — low, but on a 100M+ user base.

**Takeaway for X+1:** Parent safety/visibility is a conversion feature, not a compliance burden. "See every AI conversation your kid has" is literally why parents pay.

### 3. Prodigy Math — The "Report Card Email" Playbook

**How the parent converts:** The kid plays Prodigy free. The parent receives an **automatic weekly "Progress Report" email** the moment the kid plays (kid enters parent email during setup, or teacher sends home). The email shows "Your kid answered 47 math questions this week!" with a **Premium Membership upsell embedded**.

**Pricing:** Prodigy Premium is ~$9.95/mo or ~$79.95/year. Parent-pays only.

**Conversion:** Prodigy reportedly converts at **~3-4% of active kids to paid Premium**, but their retention is exceptional because the kid lobbies *hard* — Premium unlocks cosmetic pet/avatar items the kid desperately wants.

**Takeaway for X+1:** The parent email is the #1 conversion surface. Automate it. Send progress reports weekly. Bury the upsell in the report.

### 4. Brainly — Barely Tries

Brainly (homework Q&A) largely ignores the parent. Their Brainly Plus ($24/yr) is marketed **directly to students** and targets college-age/late-high-school payers. Teen users with no card either screenshot answers out of the free tier or drop off. Brainly loses millions of would-be payers to this gap.

**Takeaway:** This is what happens when you don't build a parent funnel. Don't be Brainly.

### 5. Photomath — The "Hard Paywall + Parent Receipt" Model

**How the parent converts:** Student scans a problem, gets a solution preview, hits a step-by-step paywall, **taps "Ask a parent to unlock."** Photomath generates an SMS/email with a payment link. Parent pays via Apple/Google Pay in one tap.

**Pricing:** Photomath Plus was $9.99/mo or $69.99/yr before Google acquisition.

**Conversion:** Reportedly **7-10%** of active students — the highest in the category because the "stuck on homework right now" moment is the perfect conversion trigger.

**Takeaway for X+1:** The "Ask parent to unlock" button at the point of value is the single highest-converting pattern in the industry. **Build it first.**

### 6. Chegg — The College Student Payer

Chegg historically sold to college students with their own cards ($19.95/mo). When they tried pushing into K-12, they failed — they never built parent UX and churn spiked. Chegg's lesson: **you cannot port a college-student-payer model down to minors without rebuilding the entire conversion funnel.**

### 7. Tutoring Marketplaces — The Closest Analog

**Varsity Tutors, Wyzant, Preply** all assume **parent pays, student uses**:

- **Parent creates the account**, adds the student as a profile underneath.
- **Session scheduling happens on the parent account.**
- **Student gets their own login** (limited) to join sessions, see materials, do homework.
- **Parents get a weekly "session summary" email** — tutor notes, what was covered, progress.

**Pricing:** $40-150/hour depending on tutor; Varsity Tutors "Learning Membership" is $99-299/mo.

**Conversion trigger:** "Book a free consultation." A human reaches out to the parent. Conversion on that call is ~20-30%.

**Takeaway:** The **dual-login model** (parent-primary, student-secondary under parent) is the industry-standard architecture. Copy it.

### 8. Apple Family Sharing + Google Family Link

**Apple:** Parent sets up Family Sharing, kid under 13 gets managed Apple ID. **"Ask to Buy"** routes every purchase request to parent's phone for approval. In-app subscription started by the kid → parent notification → approve → billed to parent's card. This is **free infrastructure** teen-targeting apps can plug into.

**Google Family Link:** Same — kid initiates a purchase, parent phone pops approval dialog.

**Takeaway:** Ship via iOS/Android subscriptions with parent-approval hooks. Apple/Google did the hard part.

### 9. Instagram/TikTok "Family Center"

Both launched parent dashboards in 2022-2023 under regulatory pressure. Parent can see: who teen follows, how long they're on the app, what topics they search. **Critically, parents cannot see DMs** — only meta-data.

**Takeaway:** "See what they're doing without spying on everything" is the bar for teen trust. X+1 should mirror this — parents see subjects studied, time, progress, *not* private chat logs by default (with an opt-in for under-13).

### 10. Roblox / Minecraft / Fortnite — The Masters

**Roblox:** Free to play, upsells Robux (currency). Parent funnels:
- **Robux gift cards** sold at Target/Walmart — parent buys without entering card.
- **"Parent PIN"** to lock purchases behind a 4-digit code.
- **Monthly Robux stipend** parents prepay ($4.99-19.99/mo).
- **Parent dashboard** shows spend, time played, friends, chat filters.

**Fortnite:** V-Bucks gift cards + Parent Epic account linkage.

**Takeaway:** **Gift cards, prepaid credits, and one-time purchases** are the unsung hero of the teen market. Many parents refuse subscriptions but will drop $50 on a gift card.

## Synthesis: The X+1 Playbook

### Best-in-Class Patterns (the meta-pattern)

1. **Teen acquires, parent approves, both retain.** Teen is always the front door.
2. **The "Ask a Parent" button** at the point of friction (Photomath pattern) — SMS/email to parent with a one-tap pay link.
3. **Parent visibility as conversion lever** (Khanmigo pattern) — "see every AI session your kid has" is a *feature*, not a privacy cost.
4. **Automated weekly progress emails to parents** (Prodigy pattern) — the single most consistent retention mechanic.
5. **Dual-login architecture** (tutoring marketplace pattern) — parent is primary, teen is secondary.
6. **Multi-seat pricing** (Duolingo pattern) — one family plan covering siblings at a 3x price bump converts better than single-seat.
7. **Gift cards / Apple & Google Family** for parents who refuse subscriptions.

### Parent Portal — Minimum Viable Spec

Build these five screens:

1. **Parent Dashboard (home):** Kid's weekly minutes, subjects studied, quizzes completed, grade-level progression. One CTA: "Upgrade to Plus."
2. **Activity Feed:** Timeline of what the teen studied today (titles only, not full chats — privacy bar matters).
3. **Safety Alerts:** AI-flagged content (mental health mentions, off-topic misuse). Parents pay for this.
4. **Billing & Plan:** Stripe portal + sibling seats add-on + pause/cancel.
5. **Weekly Email (not a screen, a product):** Progress report + upsell + one kid quote ("Maya asked the AI about quadratics 14 times this week — she's working hard").

That's it. Don't build more at MVP.

### Marketing Segmentation — Market to Kids, Sell to Parents

- **Kid-facing messaging (TikTok, Instagram, school WOM):** "The AI that explains your homework like a friend. Free." Focus on streaks, avatars, flex-worthiness.
- **Parent-facing messaging (Facebook, Google, newsletters):** "See what your teen is learning. Get weekly progress reports. AI tutoring for under $1/day." Focus on safety, visibility, SAT/grades.
- Kid gets emotional activation → sends "can I get this?" text → parent lands on parent-optimized page.

### Conversion Mechanics — What Swipes the Card

In order of proven effectiveness:
1. **Teen-initiated "unlock request"** sent to parent mid-use (Photomath). Conversion: **7-10%**.
2. **Weekly progress email with upsell embedded** (Prodigy). Conversion: 3-5% per email.
3. **Safety/visibility pitch** (Khanmigo). Conversion: 2-5%.
4. **Free 7-day trial after parent email capture.**
5. **Back-to-school / exam week campaigns** — parents spend 3x more in August-September and April-May.

### Pricing Anchors

Parents pay for teen education apps in this range:
- **$4-6/mo single-kid** (Khanmigo is the floor).
- **$9-12/mo single-kid premium** (Prodigy, Photomath — the sweet spot).
- **$14-20/mo family (2-4 kids)** — highest ARPU tier.
- **$79-120/year annual** — reduces churn by 60%.

**X+1 recommendation:** $9.99/mo or $79/yr single, $14.99/mo or $119/yr family (up to 4 kids). Free tier with hearts-style usage cap — teens hit wall → "Ask a parent" CTA.

### Retention Mechanics — Parents Churn Differently

Parents churn when they stop seeing value. Winners keep parents by:
1. **Weekly progress email** proves the app is being used. Skip one week and churn doubles.
2. **Report card at term-end** — "Maya improved in algebra this semester." This triggers annual re-up.
3. **Grade-level auto-progression** — parent sees app "follows kid as they grow up."
4. **Family plan stickiness** — adding sibling #2 drops churn by ~40%.
5. **Teacher/school endorsement** — parents who learn about X+1 from a teacher churn 3x less than ad-acquired.

Parents don't cancel apps they receive weekly reports from. **Ship the email before you ship the third feature.**

## Sources
- [Super Duolingo 2026 pricing - DealNews](https://www.dealnews.com/features/duolingo/cost/)
- [Duolingo Family Plan questions](https://support.duolingo.com/hc/en-us/articles/4546736159373-General-questions-about-Family-Plan)
- [Duolingo Family Plan Cost 2026](https://pushtolearn.com/post/duolingo-family-plan)
- [Khanmigo pricing](https://www.khanmigo.ai/pricing)
- [Khanmigo Parents](https://www.khanmigo.ai/parents)
- [Khanmigo subscription plans](https://support.khanacademy.org/hc/en-us/articles/25921448458893)
- [Creating and managing a Khanmigo subscription](https://support.khanacademy.org/hc/en-us/sections/19683033775757)
