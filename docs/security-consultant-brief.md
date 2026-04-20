# X+1 Security Audit Brief — Third-Party Consultant

**Date:** April 8, 2026
**Classification:** Confidential — For Authorized Consultant Only
**Product:** X+1 (xplus1.ai) — AI-powered study platform for students
**Live URL:** https://snap-notes-j68u-three.vercel.app/

---

## 1. Product Context

X+1 is an AI-powered study platform that serves **minors** (middle school, high school, university students) in the **United States and Israel**. The product allows students to:

- Upload notebook photos, PDFs, and documents for AI-powered course generation
- Use a Socratic AI tutor (chat-based, powered by Claude)
- Generate practice exams and homework checks
- Track learning progress via spaced repetition

**The fact that we serve minors elevates every security requirement from best practice to legal obligation with criminal and civil penalties.**

---

## 2. Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 14 (App Router, TypeScript strict mode), Tailwind CSS |
| Backend | Next.js API Routes (serverless on Vercel) |
| Database | Supabase PostgreSQL with Row-Level Security (RLS) |
| Auth | Supabase Auth (JWT cookies, email/password) |
| File Storage | Supabase Storage (images, PDFs, documents) |
| AI Provider | Anthropic Claude SDK (claude-sonnet-4-6) |
| Caching/Rate Limiting | Upstash Redis |
| Email | Resend (custom SMTP) |
| Analytics | PostHog |
| Hosting | Vercel (serverless, Edge Network) |
| Error Tracking | Sentry |
| DNS/CDN | Vercel Edge Network |

---

## 3. Scope of Security Audit

We need a comprehensive security review covering the following areas, drawn directly from our Market Requirements Document.

### 3.1 Authentication and Session Security

**Requirements to verify/implement:**

- Passwords stored only as strong, salted, one-way hashes (bcrypt or equivalent, never reversible encryption)
- Password policy aligned with NIST SP 800-63B: 8-character minimum, breach-list checking, no forced rotation, no composition rules that encourage predictable patterns
- Sessions stored only in HTTP-only, Secure, SameSite cookies unreachable from client-side scripts
- Automatic session refresh on protected-route access, with graceful re-authentication if refresh fails
- Brute-force protection on login: 10 attempts per 15 minutes per identifier
- Rate limiting on password reset: 5 per hour per email, with generic success message to prevent account enumeration
- Architecture ready for multi-factor authentication (post-launch enhancement)
- Future-ready support for OAuth sign-in (Google, Apple) — not required at launch

### 3.2 Transport and Storage Encryption

**Requirements to verify/implement:**

- All network traffic over TLS 1.2+, with HSTS enforced for minimum 2 years
- All persistent data encrypted at rest using current industry standards
- Sensitive fields (email addresses, student content, parent emails) stored with additional column-level protection where supported
- Encryption key rotation on a defined schedule

### 3.3 Access Control and Data Isolation

**Requirements to verify/implement:**

- Row-level security (RLS) on **every** database table containing user data — users can access only their own records
- Admin access gated by an explicit admin flag and logged for audit
- Service-role access (batch jobs, cron tasks, support tooling) scoped narrowly and logged
- No data mingling across users — even in aggregate analytics, student-level data must not be exposed across accounts

### 3.4 Content Safety and Input Validation

**Requirements to verify/implement:**

- All user inputs sanitized against injection, cross-site scripting (XSS), and unsafe character sequences
- All AI-generated content passed through a content filter before being persisted or shown to the student
- All uploaded images/documents validated against expected file types via **magic-byte inspection** (not just file extension)
- HEIC uploads converted server-side; malformed files rejected with clear message
- File-size and per-minute upload limits enforced per user
- Prompt injection and jailbreak attempts logged and rejected

### 3.5 Rate Limiting and Abuse Prevention

**Required rate limits (verify enforcement):**

| Operation | Default Limit | Reason |
|-----------|---------------|--------|
| Course generation | 5/min/user | Heavy AI cost; abuse risk |
| Exam generation | 10/min/user | Heavy AI cost |
| Homework check | Unlimited but cooled | High-frequency legitimate use |
| Chat messages | 30/min/user | Protect tutor service |
| Login attempts | 10/15 min/identifier | Brute-force protection |
| Password reset | 5/hour/email | Enumeration and abuse protection |
| File uploads | 20/min/user | Storage abuse |

When rate limits are exceeded, student must receive a clear, human message telling them when they can try again.

### 3.6 Secure Development and Deployment

**Requirements to verify/implement:**

- All source code in versioned repository with code review required on every change
- Automated static analysis and dependency vulnerability scanning on every pull request
- No production credentials in source code or build artifacts
- Separation of environments (development, staging, production) with separate credentials and separate data
- Breaking-glass access to production logged and reviewed

### 3.7 Logging, Monitoring, and Incident Response

**Requirements to verify/implement:**

- Structured logging of all authentication events, admin actions, and data-modification events
- Sensitive data (passwords, full email addresses) **masked** in logs
- Centralized error tracking with alerts for elevated error rates
- Documented incident response plan with notification timelines, regulator communication, and user communication
- Documented breach notification procedure consistent with the EU's 72-hour window under GDPR (strictest applicable timeline)

### 3.8 Third-Party and Vendor Security

**Requirements to verify/implement:**

- Every processor and subprocessor has a signed Data Processing Agreement (DPA) limiting them to processor-only role
- Subprocessors meet security standards equivalent to the primary controller
- Published subprocessor list, updated when subprocessors change
- Model providers (Anthropic) contractually agree not to train models on student data
- Standard Contractual Clauses for every international transfer of personal data originating in the EU

**Current vendors requiring DPAs:**

| Vendor | Role |
|--------|------|
| Supabase | Database, auth, file storage |
| Vercel | Hosting, CDN, serverless compute |
| Anthropic | AI model provider |
| Upstash | Caching, rate limiting |
| Resend | Email delivery |
| PostHog | Analytics |
| Sentry | Error tracking |
| Unsplash | Image API |

### 3.9 Security Targets

| Target | SLA |
|--------|-----|
| Critical vulnerabilities | Remediated within 72 hours |
| High-severity vulnerabilities | Remediated within 7 days |
| Successful account takeovers | Zero tolerance |
| Breach notification to regulators | Within 72 hours where required by law |
| Third-party security audit | Annual minimum (penetration test) |
| Responsible disclosure / bug bounty | Published by end of Year One |

---

## 4. Privacy and Children's Safeguarding Requirements

Because X+1 serves minors, the following regulatory frameworks apply **simultaneously** and the security posture must satisfy all of them:

### 4.1 Applicable Regulations

| Framework | Jurisdiction | Launch Blocker? |
|-----------|-------------|-----------------|
| COPPA (2025 amendments) | US Federal | Yes — up to $53K/violation/child |
| CCPA / CPRA | California | Yes — $7,500/violation for minors |
| SOPIPA | California | Yes — ban on targeted ads to students |
| Maryland MODPA | Maryland | Yes |
| Colorado Privacy Act (minors) | Colorado | Yes |
| Connecticut DPA amendment | Connecticut | Yes (July 2026) |
| Israel Privacy Protection Law (Amendment 13) | Israel | Yes — in force since Aug 2025 |
| Israel 2017 Data Security Regulations | Israel | Yes — "high" security level required |
| GDPR + Article 8 | EU | Yes if EU traffic accepted (currently geo-blocked) |
| UK Children's Code | UK | Yes if UK traffic accepted |
| EU AI Act | EU | Yes — prohibited practices already in force |

### 4.2 Must-Have Compliance Items (Launch Blockers)

1. Verifiable parental consent flow for under-13 users (or hard block under-13 signup)
2. Separate verifiable parental consent for disclosures to foundation model providers, analytics vendors, and ad-tech
3. Published data retention policy
4. No targeted advertising to minors; no sale of student data
5. Two-step opt-in for 13-15 users for any data sharing (California)
6. Privacy policy with full disclosures in English and Hebrew
7. Israel Privacy Protection Officer appointment and database registration
8. WCAG 2.1 AA conformance and Israeli Standard 5568 compliance
9. No emotion recognition or affect analysis in the tutor (EU AI Act Article 5)
10. Breach notification procedures aligned to 72-hour EU window
11. Parental consent for under-16 EU users (or geo-block EU)
12. Default high-privacy settings for all minor accounts
13. Data Processing Agreement with every processor (model provider, hosting, email, analytics, CDN)
14. Age gate at signup with neutral date-of-birth collection
15. Parental review and deletion portal (or equivalent email-based process)
16. **Self-service account deletion** — currently missing, must ship before paid launch
17. **Self-service data export** — currently missing, must ship before paid launch

### 4.3 Highest-Risk Data Categories

The following data must be treated with the **highest level of care**:

| Data Category | Risk | Required Handling |
|---------------|------|-------------------|
| Notebook photo uploads | May contain faces (biometric under COPPA 2025), names of third parties, handwritten sensitive info | Extract/store only minimum necessary; consider face-detection and redaction at ingest |
| AI tutor chat logs | May contain mental-health disclosures, family situation, location | Highest access control, never used for model training without explicit consent, must be deletable |
| Parent weekly email reports | Implicate onward disclosure / "sharing" under state laws | Parental consent required before sending |
| Behavioral analytics | Implicate profiling rules under UK Children's Code and GDPR | Profiling off by default for minors, must be resettable |
| Foundation model training data | Student content must never train foundation models | Absolute boundary — explicit, granular, informed, revocable consent required |

---

## 5. Deliverables Expected from Consultant

1. **Security Assessment Report** — Full vulnerability assessment of the production application, covering all items in Section 3
2. **Penetration Test Report** — Authenticated and unauthenticated testing of all API endpoints (55+), auth flows, file upload flows, and AI interaction endpoints
3. **Compliance Gap Analysis** — Mapping of current implementation against Section 4 requirements, with specific gaps identified and prioritized
4. **Remediation Plan** — Prioritized list of fixes with severity ratings, aligned to our regulatory deadlines
5. **Rate Limiting Verification** — Confirm all rate limits in Section 3.5 are properly enforced
6. **RLS Audit** — Verify Row-Level Security policies on every Supabase table prevent cross-user data access
7. **DPA/Vendor Review** — Review existing vendor agreements against Section 3.8 requirements
8. **Incident Response Plan Template** — If one doesn't exist, provide a template aligned to our multi-jurisdictional requirements (72-hour breach notification)

---

## 6. Key Deadlines

| Deadline | Requirement |
|----------|-------------|
| April 22, 2026 | Full COPPA 2025 compliance |
| May 6, 2026 | Utah App Store Accountability Act (if mobile app ships) |
| July 1, 2026 | Connecticut minors amendment |
| August 2, 2026 | EU AI Act high-risk compliance (if classified) |
| August 2, 2026 | EU AI Act Article 50 generative AI transparency |

---

## 7. Access & Coordination

The consultant will be provided with:

- Read access to the source code repository
- Read access to the Supabase dashboard (database schema, RLS policies, auth config)
- A staging environment with test accounts
- Direct communication channel with the engineering team
- List of all 55+ API routes and their authentication requirements

**Point of contact:** [To be filled]
**Preferred communication:** [To be filled]
**Engagement timeline:** [To be filled]
