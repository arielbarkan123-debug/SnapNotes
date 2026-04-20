# X+1 Product Launch Plan

**Date:** March 2026
**Owner:** Product Line Manager
**Target:** Global launch (English + Hebrew)
**Timeline:** 4-8 weeks to launch

---

## Executive Summary

X+1 is a production-ready AI learning platform (v3.1.0) with 90+ API routes, full course generation from photos/documents, homework tutoring, exam prep, SRS flashcards, and 100+ interactive diagram types. The product is technically mature — this plan covers the go-to-market launch.

**Key Decision Required:** Pricing model selection (see Revenue Models section)

---

## Phase 1: Pre-Launch (Weeks 1-2)

### Legal & Compliance
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Privacy Policy (GDPR, CCPA, Israeli Privacy Law) | Lawyer | $1,000 | P0 |
| Terms of Service | Lawyer | $500 | P0 |
| Cookie consent implementation | Developer | $200 | P0 |
| Age verification / COPPA if targeting minors | Lawyer | $300 | P1 |

### Landing Page & Conversion
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Landing page: hero section, feature showcase, pricing, CTA | Designer + Dev | $1,500 | P0 |
| SEO audit: meta tags, sitemap.xml, structured data, robots.txt | SEO Specialist | $800 | P0 |
| Pricing page with toggle (monthly/annual), FAQ | Developer | included | P0 |
| Social proof section (testimonials, stats, logos) | Designer | included | P1 |

### Payment & Monetization
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Stripe integration: checkout, webhooks, customer portal | Developer | $500 | P0 |
| Subscription tiers in database | Developer | included | P0 |
| Usage metering & rate limiting per tier | Developer | included | P0 |
| Invoice / receipt emails | Developer | included | P1 |

### Technical Hardening
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Security audit: OWASP Top 10, pen test | Security Consultant | $1,000 | P0 |
| Rate limiting on all AI endpoints | Developer | included | P0 |
| Performance optimization: Lighthouse 90+, Core Web Vitals | Developer | $300 | P1 |
| Error monitoring: Sentry or LogRocket setup | Developer | $0 (free tier) | P1 |
| Load testing: simulate 100 concurrent users | QA Tester | $300 | P1 |

### Brand & Design
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Logo & brand assets polish | Designer | $500 | P1 |
| Favicon, Open Graph images, social banners | Designer | included | P1 |
| App icon (if PWA) | Designer | included | P2 |

### QA & Testing
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Cross-browser testing (Chrome, Safari, Firefox, Edge) | QA | $300 | P0 |
| Mobile responsive testing (iOS Safari, Android Chrome) | QA | included | P0 |
| RTL (Hebrew) layout verification | QA | included | P0 |
| Accessibility audit (WCAG 2.1 AA) | QA | included | P1 |

**Phase 1 Total: ~$7,400**

---

## Phase 2: Soft Launch (Weeks 3-4)

### Beta Program
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Invite 50 beta users from waitlist / personal network | Founder | $0 | P0 |
| In-app feedback widget (Hotjar or custom) | Developer | $0 | P0 |
| 5 user interviews (video calls, 30 min each) | Founder | $0 | P0 |
| Daily bug triage based on feedback | Developer | $0 | P0 |

### Content & Marketing Prep
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| 3 SEO blog posts (e.g., "How AI is changing studying") | Copywriter | $600 | P1 |
| Product Hunt listing: screenshots, GIF demos, tagline | Marketing | $200 | P1 |
| Email welcome sequence (5 emails over 14 days) | Copywriter | $400 | P0 |
| Social media accounts: Twitter/X, LinkedIn, Instagram, TikTok | Marketing | $0 | P1 |

### Product Refinement
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Onboarding flow: first-use wizard with sample content | UX + Dev | $800 | P0 |
| Referral system: invite friends → earn premium credits | Developer | $300 | P1 |
| Collect testimonials from satisfied beta users | Founder | $0 | P1 |

**Phase 2 Total: ~$2,300**

---

## Phase 3: Public Launch (Weeks 5-8)

### Launch Events
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Product Hunt launch day | Founder + Team | $0 | P0 |
| Hacker News "Show HN" post | Founder | $0 | P1 |
| Press outreach: EdTech blogs, TechCrunch, Geektime | PR Contractor | $1,200 | P1 |

### Paid Marketing
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Google Ads: "AI study tool", "homework helper", "note converter" | Marketing | $1,000/mo | P1 |
| Social ads: Instagram Reels, TikTok (student demographic) | Marketing | $500/mo | P1 |
| YouTube tutorial video: "How X+1 works" (2-3 min) | Video Production | $800 | P1 |
| Retargeting: visitors who didn't convert | Marketing | $200/mo | P2 |

### Partnerships
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Influencer partnerships: EdTech YouTubers/TikTokers | Marketing | $1,000-3,000 | P1 |
| University pilot: 1-2 schools for classroom use | BD | $0 | P2 |
| Student discount program (50% off with .edu email) | Developer | $0 | P1 |

### Community
| Task | Owner | Est. Cost | Priority |
|------|-------|-----------|----------|
| Discord or Telegram community for users | Community Manager | $200 | P2 |
| Weekly "study tips" newsletter | Copywriter | $100/mo | P2 |

**Phase 3 Total: ~$5,000-8,000 (first month)**

---

## Phase 4: Growth & Optimization (Months 3-12)

### Product
- Retention optimization: push notifications, streak system (already built), re-engagement emails
- Localization: expand to 3-5 more languages (Spanish, Arabic, French, Russian)
- Teacher/parent dashboard: class management, progress tracking
- Mobile app (React Native or native) — $5K-15K
- API/SDK for school integrations

### Business
- Enterprise plan: school/university licensing ($99-499/mo per institution)
- Annual pricing with 20% discount to reduce churn
- Affiliate program for education bloggers
- Series A preparation: metrics deck, financial model, investor outreach

### Operations
- Hire part-time support person for user issues
- Automate reporting: weekly metrics email to stakeholders
- Set up proper CI/CD with staging environment
- Implement A/B testing framework for pricing/features

---

## Pricing Model Analysis

### Model A: Freemium
- **Free tier:** 3 courses/mo, 10 homework checks, no exams
- **Basic ($9.99/mo):** 15 courses, unlimited homework, 5 exams
- **Pro ($19.99/mo):** Unlimited everything, priority support
- **Projected mix:** 60% free / 25% Basic / 15% Pro
- **Revenue at 500 users:** ~$4,998/mo
- **Pros:** Low barrier to entry, viral potential
- **Cons:** High cost to serve free users, slow to profitability

### Model B: Subscription (Recommended)
- **14-day free trial**, then $9.99/mo Basic or $19.99/mo Pro
- **Projected conversion:** 50% of trial users convert
- **Revenue at 500 users:** ~$6,996/mo
- **Pros:** Highest ARPU, clear revenue from day 1, predictable
- **Cons:** Higher acquisition friction, need strong onboarding

### Model C: Pay-per-Use (Credits)
- **Credit packs:** $4.99/50 credits, $9.99/120 credits, $24.99/350 credits
- **1 credit ≈ 1 AI action** (course gen = 5 credits, homework check = 1 credit)
- **Revenue at 500 users:** ~$5,100/mo
- **Pros:** Fair pricing, aligns cost with usage
- **Cons:** Unpredictable revenue, complex UX

### Model D: Free (Growth Phase)
- **No revenue** — focus on user acquisition and engagement metrics
- **Fundraising strategy:** EdTech seed valuations = $50-150 per MAU
- **500 MAU × $100/MAU = $50K-75K potential valuation**
- **Pros:** Maximum growth, no conversion friction
- **Cons:** Requires runway, defers monetization

---

## Key Metrics to Track

| Metric | Target (Month 1) | Target (Month 6) | Target (Month 12) |
|--------|-------------------|-------------------|---------------------|
| Monthly Active Users | 50 | 200 | 500 |
| Courses Created | 100 | 1,000 | 5,000 |
| Paying Subscribers (if Sub model) | 10 | 100 | 250 |
| Monthly Revenue | $140 | $1,400 | $3,500 |
| Churn Rate | - | <8% | <5% |
| NPS Score | - | 40+ | 50+ |
| AI Cost per User | - | <$15 | <$12 |
| Conversion Rate (trial→paid) | - | 40% | 50% |

---

## Budget Summary

| Category | One-Time | Monthly (@ 100 users) | Monthly (@ 500 users) |
|----------|----------|------------------------|------------------------|
| One-Time Setup | $9,200 | - | - |
| Claude AI API | - | $1,330 | $6,650 |
| Infrastructure | - | $55 | $272 |
| Marketing | - | $1,000 | $3,000 |
| Contractors | - | $2,000 | $3,000 |
| **Total** | **$9,200** | **$4,385/mo** | **$12,922/mo** |

**Year 1 total budget request: ~$62,000** (setup + 12 months operating)

---

## Decision Required

1. **Approve total Year 1 budget of $62,000**
2. **Select pricing model** (Recommendation: Model B — Subscription)
3. **Authorize Phase 1 kickoff** (immediate, this week)

---

*Prepared by Product Line Manager | March 2026 | Confidential*
