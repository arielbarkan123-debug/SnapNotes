# X+1 Business Model Explorer — Usage Guide

> Built for Ariel to compare freemium, subscription, ads, credits, hybrid, family, and B2B models side-by-side with verified 2026 pricing.

## How to open

Double-click `business-model-explorer.html` — it opens in your default browser. No build step, no server needed. Works offline.

## What you get

A fully interactive dashboard with:

1. **10 business models** — freemium, subscription (budget/standard/premium/luxury), ads-only, credits, hybrid, family, B2B school licensing. Click any model card to switch the main model, or use the Compare chart to overlay 2–5 models at once.
2. **9 KPI tiles** — revenue, total cost, profit, gross margin, paying users, ARPU, ARPPU, LTV:CAC, payback period. Color-coded (green / amber / red).
3. **4 chart modes** — Overview (rev vs cost vs profit), Stacked (every cost category), Profit-only curve, Compare (overlay models).
4. **Full breakdown table** — every number traceable at 10 user scales (50 → 50,000).
5. **Unit economics** — per-user monthly AI cost across tryer / light / medium / heavy types.
6. **Break-even analysis** — exact user count where you turn profitable at current assumptions.
7. **LTV / CAC / payback** — the metrics VCs actually ask about.
8. **"Things you might have missed"** — 20 strategic gaps with impact estimates (COPPA, Apple-tax, VAT, seasonality, etc.).
9. **Paste-back prompt** — current scenario as natural language → copy → paste to Claude for further conversation.

## 5 built-in presets

| Preset | Fits | Conversion | Churn | CAC | Notes |
|---|---|---|---|---|---|
| **Conservative** | Worst-case planning | 3 % | 12 % | $60 | No optimizations, high churn |
| **Realistic** | Default planning | 5 % | 8 % | $42 | Prompt caching on, consumer CAC |
| **Optimistic** | Duolingo-level | 8.8 % | 4 % | $30 | All optimizations + startup credits |
| **Replace-the-Tutor** | Premium play | 4 % | 5 % | $150 | Luxury $79.99/mo, founder salary, high marketing |
| **Viral Growth** | TikTok/referral | 6 % | 6 % | $15 | Freemium + high marketing, low CAC |

## Key verified 2026 prices used

| Service | Price |
|---|---|
| Claude Sonnet 4.6 | $3/MTok in, $15/MTok out |
| Claude Haiku 4.5 | $1/$5 per MTok (80 % cheaper for chat/QA) |
| Recraft V3 (images) | $0.04 raster |
| Supabase Pro | $25/mo (auto-scales to Team $599 at 50K users) |
| Vercel Pro | $20/user/mo (1TB bandwidth, $0.15/GB after) |
| Stripe | 2.9 % + $0.30 domestic, +1.5 % intl, +1 % FX |
| Resend | Free < 3K emails, $20/mo to 50K, $90/mo to 100K |

## Per-feature cost (verified from X+1 codebase)

| Feature | Cost/action |
|---|---|
| Homework check | **$0.236** (4 API calls — solve → read → grade → QA) |
| Course generation | **$0.633** (5 calls — OCR → structure → 2 lesson batches) |
| Prepare guide | $0.264 |
| Practice session | $0.198 |
| Diagram (incl. Recraft) | $0.175 |
| Lesson expansion | $0.135 |
| Exam generation | $0.137 |
| Chat (prepare guide) | $0.082 |
| Walkthrough | $0.070 |
| Chat (course) | $0.027 |
| SRS batch | $0.027 |

## Per-user AI cost per month (raw → with all optimizations)

| Type | Raw | Optimized |
|---|---|---|
| 💤 Tryer (1-2 uses) | $1.38 | $0.68 |
| 🟢 Light (casual) | $4.55 | $2.24 |
| 🟡 Medium (regular student) | $14.33 | $7.05 |
| 🔴 Heavy (power user / exam week) | $33.20 | $16.33 |

**Key insight:** A heavy user costs $33/mo at raw prices. A $19.99 sub **cannot cover them**. Either (a) cut costs 50 %+ (you can) or (b) price ≥ $29.99 for power users.

## Top 5 insights the explorer reveals

### 1. Ads-only never works for EdTech AI
Even at $5 eCPM and 80 impressions/user/month, you make $0.40 per user/mo — and an active user costs $4–14 in AI. **Ads-only loses money at every scale.**

### 2. The "subscription budget" tier is the trap
$9.99/mo after Stripe is $9.34 net. A medium user costs $7–14 in AI raw. **Margins are razor-thin or negative without optimization.**

### 3. Premium ($39.99) + optimizations = 80 %+ margins
At $39.99/mo with prompt caching + Haiku + batch, you keep $30+ per user. **This is the economically sound path for X+1 today.**

### 4. Freemium only works with aggressive free-tier limits
Without daily limits, free users cost $4–6/mo each. Every free user burns $5/mo you never recover. **You must cap: e.g., 3 homework checks/day, 5 chats/day.**

### 5. Replace-the-tutor at $79.99 is not crazy
Parents pay $50–80/hour for tutors. $79.99/mo is still 90 %+ cheaper. **At 5 % conversion this model generates $30K+/mo profit at 5K users** — and competes with the right alternative (tutors), not other apps.

## 20 strategic gaps — the "might have missed" list

The tool includes an expandable list of 20 items, tagged by impact. Highlights:

### HIGH IMPACT (act before launch)
- **Who pays?** — your users are minors; parents must be the economic buyer. You have `parent_email` in the DB but no parent UI.
- **Apple/Google App Store fees** — 15–30 % of revenue gone if you ship native apps.
- **Israel VAT (17 %)** — registration required above ~₪107K/year. US sales tax and EU MOSS apply too.
- **COPPA / GDPR / Israeli Privacy Law** — under-13 users require verified parental consent. COPPA fines: up to $43K per child.
- **Refunds & chargebacks** — budget 1–3 % of revenue; Stripe charges $15 per chargeback win or lose.

### MEDIUM
- Seasonality (summer & winter dead months → 25–35 % lower average monthly revenue)
- Anthropic Startup Program ($25K–$100K free credits) — **apply now**
- Insurance (E&O, cyber, D&O) — required once investors wire
- Bagrut as a moat — Israeli-specific curriculum + parent willingness to pay for tutoring
- Annual vs monthly pricing (cashflow lever)
- Referral / viral loops (can halve effective CAC)
- NRR (Net Revenue Retention) — the metric VCs care about most

### CONSIDER
- Regional pricing (PPP for India/LATAM)
- Founder agreement + incorporation (required before Miami investors wire)
- Content moderation / K-12 safety
- Customer support scaling curve
- Analytics tooling at scale (PostHog, Mixpanel)
- CDN / image egress at 5K+ users
- Anchor pricing ($79.99 tier raises $19.99 conversion)
- Cashflow ≠ profit — Stripe payout lag, deferred revenue, failed payments

## How to use for a decision

1. Click **Realistic** preset (your baseline).
2. Try each model card — see which ones are green at 1,000 users.
3. Switch to the **Compare** chart and pick 3–4 models to overlay — see which curves diverge positively at scale.
4. Flip the **Optimizations** toggles — see how cost drops.
5. Move the **User count slider** and watch your break-even chart.
6. Scroll to **"Things you might have missed"** and open the HIGH IMPACT items first.
7. Copy the **paste-back prompt** at the bottom and send it to Claude when you want to continue the strategic conversation with full context.

## Where this lives

```
docs/budget/
  ├── business-model-explorer.html     ← the tool
  ├── BUSINESS_MODEL_EXPLORER_README.md ← this file
  ├── build_accurate_budget.py          ← source of AI cost numbers
  ├── build_profitability.py            ← source of business model numbers
  └── NoteSnap_*.xlsx                    ← prior budget spreadsheets
```

Nothing in the X+1 app is touched. This is pure analysis / strategy tooling.
