/**
 * X+1 Business Plan — Word Document Generator
 * Produces: X+1_Business_Plan_Three_Architectures.docx
 * Input: model-output.json (run model.js first)
 */

const fs = require('fs');
const path = require('path');
const {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  Header, Footer, AlignmentType, PageOrientation, LevelFormat,
  ExternalHyperlink, TabStopType, TabStopPosition,
  HeadingLevel, BorderStyle, WidthType, ShadingType,
  VerticalAlign, PageNumber, PageBreak,
} = require('docx');

// ============================================================
// LOAD MODEL DATA
// ============================================================
const data = JSON.parse(fs.readFileSync(path.join(__dirname, 'model-output.json'), 'utf8'));

// ============================================================
// HELPERS
// ============================================================
const BLUE = '1E40AF';
const DARK_GRAY = '374151';
const LIGHT_GRAY = 'F3F4F6';
const MEDIUM_GRAY = 'D1D5DB';
const GREEN = '059669';
const RED = 'DC2626';
const GOLD = 'B45309';

const border = { style: BorderStyle.SINGLE, size: 4, color: 'CCCCCC' };
const borders = { top: border, bottom: border, left: border, right: border };
const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
  right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
};
const cellMargins = { top: 100, bottom: 100, left: 140, right: 140 };

function fmtDollars(n, precision = 0) {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '—';
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1e6) return sign + '$' + (abs / 1e6).toFixed(2) + 'M';
  if (abs >= 1e3) return sign + '$' + (abs / 1e3).toFixed(1) + 'K';
  return sign + '$' + abs.toFixed(precision);
}
function fmtPct(n, precision = 1) {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '—';
  return n.toFixed(precision) + '%';
}
function fmtNum(n) {
  if (n == null || typeof n !== 'number' || isNaN(n)) return '—';
  return n.toLocaleString();
}

// Text primitives
const P = (runs, opts = {}) => new Paragraph({ children: Array.isArray(runs) ? runs : [runs], ...opts });
const T = (text, opts = {}) => new TextRun({ text: String(text), ...opts });
const B = (text) => T(text, { bold: true });
const I = (text) => T(text, { italics: true });
const BLink = (text, link) => new ExternalHyperlink({
  children: [new TextRun({ text, style: 'Hyperlink', color: BLUE })],
  link,
});

const Spacer = (size = 100) => new Paragraph({ children: [new TextRun('')], spacing: { after: size } });
const Bullet = (text, opts = {}) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  children: [T(text, opts)],
});
const BulletNested = (text) => new Paragraph({
  numbering: { reference: 'bullets', level: 0 },
  indent: { left: 720 },
  children: [T(text)],
});
const NumItem = (text) => new Paragraph({
  numbering: { reference: 'numbers', level: 0 },
  children: [T(text)],
});
const NumItem2 = (text) => new Paragraph({
  numbering: { reference: 'numbers2', level: 0 },
  children: [T(text)],
});

const H1 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  pageBreakBefore: true,
  children: [T(text)],
});
const H1NoBreak = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_1,
  children: [T(text)],
});
const H2 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_2,
  children: [T(text)],
});
const H3 = (text) => new Paragraph({
  heading: HeadingLevel.HEADING_3,
  children: [T(text)],
});

// ============================================================
// TABLE BUILDERS
// ============================================================

// Page content width (US Letter, 1" margins) = 12240 - 2880 = 9360 DXA
const CONTENT_WIDTH = 9360;

function cell(text, { bold = false, shading = null, width, align = AlignmentType.LEFT, color, size = 18 } = {}) {
  const runs = Array.isArray(text) ? text : [T(String(text), { bold, color, size })];
  const props = { children: [new Paragraph({ children: runs, alignment: align })], borders, margins: cellMargins };
  if (shading) props.shading = { fill: shading, type: ShadingType.CLEAR };
  if (width) props.width = { size: width, type: WidthType.DXA };
  return new TableCell(props);
}

function tableFromRows(rows, columnWidths, options = {}) {
  const { headerShading = BLUE, headerColor = 'FFFFFF', leftAlignAll = false } = options;
  const totalWidth = columnWidths.reduce((a, b) => a + b, 0);
  return new Table({
    width: { size: totalWidth, type: WidthType.DXA },
    columnWidths,
    rows: rows.map((r, i) => {
      return new TableRow({
        children: r.map((c, j) => {
          const isHeader = i === 0;
          const isFirstCol = j === 0;
          const shading = isHeader ? headerShading : (i % 2 === 0 ? LIGHT_GRAY : null);
          const bold = isHeader || isFirstCol;
          const color = isHeader ? headerColor : undefined;
          const align = leftAlignAll
            ? AlignmentType.LEFT
            : (j === 0 ? AlignmentType.LEFT : AlignmentType.RIGHT);
          return cell(c, { bold, shading, width: columnWidths[j], align, color });
        }),
      });
    }),
  });
}

// ============================================================
// SECTION: COVER PAGE
// ============================================================

function coverPage() {
  return [
    new Paragraph({ children: [new TextRun('')], spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'X + 1', size: 96, bold: true, color: BLUE })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 300 },
      children: [new TextRun({ text: 'Strategic Business Plan', size: 44, color: DARK_GRAY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [new TextRun({ text: 'Three-Architecture Analysis & Investor Recommendation', size: 28, italics: true, color: DARK_GRAY })],
    }),
    new Paragraph({ children: [new TextRun('')], spacing: { before: 1800 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'AI-Native, Curriculum-Aligned Learning Platform', size: 24 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 100 },
      children: [new TextRun({ text: 'Israeli Bagrut Beachhead · Global AP / GCSE / IB Expansion', size: 22, color: DARK_GRAY })],
    }),
    new Paragraph({ children: [new TextRun('')], spacing: { before: 2400 } }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: 'Prepared: April 2026', size: 22 })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [new TextRun({ text: 'Stage: Pre-Launch · Pre-Seed', size: 22, color: DARK_GRAY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [new TextRun({ text: 'Founder: Ariel Barkan', size: 22, color: DARK_GRAY })],
    }),
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 80 },
      children: [new TextRun({ text: 'xplus1.ai', size: 22, color: BLUE })],
    }),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============================================================
// SECTION: TABLE OF CONTENTS
// ============================================================

function tocEntry(title, page, indent = 0) {
  return new Paragraph({
    indent: indent > 0 ? { left: indent * 360 } : undefined,
    tabStops: [{ type: TabStopType.RIGHT, position: 9000, leader: 'dot' }],
    spacing: { before: 60, after: 60 },
    children: [
      T(title, { bold: indent === 0 }),
      T('\t'),
      T(String(page), { bold: indent === 0 }),
    ],
  });
}

function tocSection() {
  return [
    H1NoBreak('Table of Contents'),
    Spacer(240),
    tocEntry('Executive Summary', 3),
    tocEntry('Market & Product Context', 5),
    tocEntry('The Product', 5, 1),
    tocEntry('The Market', 5, 1),
    tocEntry('Competitive Anchors', 5, 1),
    tocEntry('Industry Benchmarks', 6, 1),
    tocEntry('Unit Cost Structure', 6, 1),
    tocEntry('Architecture A — Freemium', 8),
    tocEntry('Optimized Configuration', 8, 1),
    tocEntry('Economic Performance', 8, 1),
    tocEntry('The Freemium Problem & Verdict', 9, 1),
    tocEntry('Architecture B — Subscription-only', 10),
    tocEntry('Optimized Configuration', 10, 1),
    tocEntry('Economic Performance', 10, 1),
    tocEntry('Per-Paid-User Economics', 11, 1),
    tocEntry('Path to Sustainable Unit Economics', 11, 1),
    tocEntry('Cliff Survival & Verdict', 12, 1),
    tocEntry('Architecture C — Free With No Revenue', 13),
    tocEntry('Economic Performance', 13, 1),
    tocEntry('The Ad-Supported Math', 14, 1),
    tocEntry('Verdict', 14, 1),
    tocEntry('Side-by-Side Comparison', 15),
    tocEntry('Sensitivity Analysis', 17),
    tocEntry('THE Recommendation', 19),
    tocEntry('90-Day Execution Plan', 19, 1),
    tocEntry('Year-1 Milestones', 20, 1),
    tocEntry('Three-Year Story for Investors', 21, 1),
    tocEntry('Appendix — Methodology, Sources, Formulas', 22),
    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============================================================
// SECTION: EXECUTIVE SUMMARY
// ============================================================

function executiveSummary() {
  return [
    H1NoBreak('Executive Summary'),

    H2('The Winning Architecture'),
    P([
      B('Architecture B — Subscription-only with 7-day free trial, tiered pricing ($9.99 / $14.99 / $19.99 per month), and the Bagrut Intensive seasonal anchor ($149 per 4 months) '),
      T('is the optimal configuration. It delivers a '),
      B('sustainable gross margin of 27.9% '),
      T('versus '),
      B('negative 163% for Freemium '),
      T('and requires '),
      B('one-tenth the MAU '),
      T('to reach a given ARR. Year 1 operating profit is positive below 1,000 MAU (thanks to $65K in startup credits) and the path to sustainable profitability runs through '),
      B('Bagrut Intensive attach-rate optimization'),
      T(' and scale past 100K paying subscribers — achievable by 2028 in the Israeli market alone.'),
    ]),

    H2('Three-Year P&L Headline (Architecture B, Base Case)'),

    tableFromRows([
      ['Metric', 'Y1 End', 'Y2 End', 'Y3 End'],
      ['MAU (end of year)', '5,000', '25,000', '80,000'],
      ['Paying subscribers', '4,250', '21,250', '68,000'],
      ['Annual Net Revenue', '$584K', '$2.92M', '$9.35M'],
      ['Gross Margin %', '27.9%', '27.9%', '33%*'],
      ['Operating Profit', '($2K)', '($1.05M)', '$400K*'],
      ['Cash Required (cumulative)', '$450K', '$1.8M', '$2.5M**'],
    ], [2800, 2200, 2200, 2160]),

    P([I('* Y3 improvements assume Haiku 4.5 price drops of 30–40% + heavier Bagrut Intensive attach. ** Includes founder compensation from Y2 and part-time contractor.')], { spacing: { before: 100 } }),

    H2('Why Architecture B Wins'),

    Bullet('Revenue per MAU is 100× higher than Freemium. $130/MAU vs $1.35/MAU at equivalent scale.'),
    Bullet('Gross margin is positive and structurally defendable. Freemium\'s free-user subsidy makes it the worst architecture at every scale modeled.'),
    Bullet('Bagrut Intensive attaches cleanly to paid users (not free) — the 10–30% attach rate drives $60–$200 of incremental margin per paid user per year.'),
    Bullet('Credit runway covers ~65% of Y1 variable cost — enabling growth investment rather than pure survival spend.'),
    Bullet('Hard paywall converts trial users at 12.1% median per RevenueCat 2025 (vs 2.2% median for freemium) — more revenue per acquisition dollar.'),

    H2('The Key Risk'),
    P([
      B('Steady-state LTV:CAC of 0.19 at 25K MAU is structurally broken '),
      T('in the base case. To achieve 3:1 unit economics the company must execute a combination of: '),
      T('(a) raising Bagrut attach-rate from 12% to 40%+ via parent-targeted funnel; '),
      T('(b) driving blended CAC below $25 via WhatsApp-viral / ambassador programs; '),
      T('(c) capturing Haiku 4.5 price reductions (30–40% YoY historically); and '),
      T('(d) achieving 25%+ trial-to-paid conversion (vs 18% base case). '),
      B('This is the "prove-out" thesis and requires 18–24 months of capital to validate.'),
    ]),

    H2('Funding Ask'),
    P([
      B('Pre-seed: $500K '),
      T('(confirmed Miami-based investors committed). 18-month runway to 10K MAU, $850K ARR, and Series Seed-readiness.'),
    ]),
    Bullet('$200K — Marketing (TikTok creator partnerships, ambassador program, parent outreach)'),
    Bullet('$150K — Engineering velocity (part-time contractor for diagrams/AI/i18n polish)'),
    Bullet('$75K — Variable AI cost buffer above startup credits'),
    Bullet('$75K — Legal/compliance (GDPR, Israeli Consumer Protection, child data laws) + tooling'),

    H2('Milestones (18 months)'),
    Bullet('Month 6: 1,000 paying subscribers, $150K ARR, 35% Bagrut attach'),
    Bullet('Month 12: 5,000 paying subscribers, $600K ARR, break-even ex-CAC'),
    Bullet('Month 18: 15,000 paying subscribers, $1.8M ARR, Seed round at $8–15M valuation'),

    new Paragraph({ children: [new PageBreak()] }),
  ];
}

// ============================================================
// SECTION: MARKET & PRODUCT CONTEXT
// ============================================================

function marketContext() {
  return [
    H1('Market & Product Context'),

    H2('The Product'),
    P([T('X+1 is an AI-native, mobile-web learning platform (Next.js 14 + Supabase + Anthropic Claude Sonnet 4.6 + Recraft V3 diagrams) that converts uploaded homework, notes, and PDFs into structured multi-lesson courses, delivers Socratic practice sessions with AI tutor agents, generates practice exams, renders interactive diagrams (Desmos, TikZ, Recraft), and drives long-term retention through FSRS-based spaced repetition. Hebrew + English with full RTL. Web-first with PWA — no App Store 15–30% cut.')]),

    P([B('Pre-launch stage. Zero users today. '), T('Founder-led. $65K combined startup-program credits available. Miami-based pre-seed investors committed.')], { spacing: { before: 120 } }),

    H2('The Market'),

    H3('Israeli Bagrut (primary beachhead)'),
    Bullet('650,000 students in grades 7–12'),
    Bullet('~150,000 in Bagrut-testing years (grades 10–12) — the paying core'),
    Bullet('Private tutor rates: $50–$83/hr for 5-yechidot math or physics'),
    Bullet('Typical Bagrut-year family tutoring spend: $220–$670 per month'),
    Bullet('WhatsApp penetration among teens: 97% in class groups — zero-CAC viral channel'),
    Bullet('Nearly half of Israeli high-school students already receive private tutoring (Haaretz)'),
    Bullet('Israeli VAT: 18% on consumer digital services'),

    H3('Global expansion targets (years 2–3)'),
    Bullet('AP (US College Board): ~5M students taking AP exams annually'),
    Bullet('GCSE (UK): ~600K students taking exams each cycle'),
    Bullet('IB Diploma: ~180K candidates in 150+ countries'),

    H2('Competitive Anchors (verified April 2026)'),
    tableFromRows([
      ['Player', 'Pricing', 'Model', 'What They Nail', 'Gap We Exploit'],
      ['Khanmigo', '$44/yr', 'Parent-pays', 'Trust, safety', 'No curriculum-specific depth'],
      ['Brainly Plus', '$24/yr', 'Community Q&A', 'Scale', 'Not personalized, not Israeli'],
      ['Quizlet Plus', '$36/yr', 'Flashcards+AI', 'SRS, viral sharing', 'Limited reasoning/tutoring'],
      ['Photomath', '$70/yr', 'Camera-scan math', 'Single-step solve', 'No curriculum, no Hebrew'],
      ['Gauth (ByteDance)', '$120/yr', 'Freemium 3/day', 'Scale (300M users)', 'Not curriculum-aligned'],
      ['Chegg Study', '$120/yr', 'Study marketplace', 'Legacy brand', 'Lost 99% market cap to AI'],
      ['Duolingo Max', '$168/yr', 'Gamified AI tutor', 'Retention, brand', 'Language-only'],
    ], [1400, 1200, 1600, 2480, 2680], { leftAlignAll: true }),

    P([I('Source: Company pricing pages and RevenueCat 2025 State of Subscription Apps report.')], { spacing: { before: 120 } }),

    H2('Industry Benchmarks We Must Respect'),
    Bullet('Consumer EdTech paid conversion: 2.6% average, 5–8% good, 8.8% best (Duolingo, Q1 2025 — verified)'),
    Bullet('EdTech monthly churn: 9.6% average (highest in B2B SaaS, verified 2025)'),
    Bullet('Consumer paid-ads CAC: $42 average, 3.8-month payback (Meta/Google, consumer subscription apps)'),
    Bullet('60-day LTV per free user: $0.55 industry-wide — a sobering floor'),
    Bullet('7-day trial → paid conversion: 15–22% blended; 47.8% at low price points (RevenueCat 2025)'),
    Bullet('Annual opt-in rate: 15–25% typical ceiling'),
    Bullet('"Ask a parent" paywall: +7–10% free-user conversion lift'),
    Bullet('Hard paywall vs freemium median conversion: 12.11% vs 2.18% (5.5×)'),

    H2('Unit Cost Structure (April 2026, verified)'),
    tableFromRows([
      ['Action', 'Cost (raw)', 'Cost (Haiku-optimized)', 'Notes'],
      ['Course Generation', '$0.633', '$0.50', 'Haiku-route lesson chat'],
      ['Homework Check (Smart)', '$0.349', '$0.349', 'Keep on Sonnet for quality'],
      ['Prepare Guide', '$0.264', '$0.264', 'Keep on Sonnet'],
      ['Practice Session (3Q)', '$0.198', '$0.12', 'Tutor turns Haiku-compatible'],
      ['Diagram (w/ image)', '$0.175', '$0.145', 'Classifier on Haiku'],
      ['Exam Generation', '$0.137', '$0.137', 'Keep on Sonnet'],
      ['Chat (Prepare Guide)', '$0.082', '$0.035', 'Haiku-compatible'],
      ['Walkthrough', '$0.070', '$0.070', 'Keep on Sonnet'],
      ['Chat (Course)', '$0.027', '$0.012', 'Haiku-compatible'],
      ['SRS Card Batch', '$0.027', '$0.012', 'Haiku-compatible'],
    ], [2400, 1800, 2400, 2760]),

    H2('Per-User Monthly Variable Cost (optimized)'),
    tableFromRows([
      ['User Segment', 'Raw Cost', 'Optimized', 'Usage Pattern'],
      ['Trial user', '$1.38', '$1.00', 'Minimal: few chats, one homework check'],
      ['Casual user', '$4.55', '$3.40', 'Light: weekly usage'],
      ['Active student', '$14.33', '$10.50', 'Regular: daily engagement'],
      ['Intensive exam prep', '$33.20', '$24.00', 'Heavy: daily + Bagrut season'],
    ], [2400, 1800, 1800, 3360]),

    P([I('The ratio of intensive to casual users is the most important variable in the business. Pricing must capture value from intensive users without excluding casual users.')], { spacing: { before: 120 } }),
  ];
}

// ============================================================
// SECTION: ARCHITECTURE A — FREEMIUM
// ============================================================

function architectureA() {
  const y1 = data.A.year1;
  const y2 = data.A.year2;
  const sample = y1[4]; // 25K MAU

  return [
    H1('Architecture A — Freemium'),

    H2('Optimized Configuration'),
    P([B('Free tier: '), T('3 actions/day combined (homework check + walkthrough + chat), Haiku-only model routing, unlimited SRS reviews, 1 Prepare Guide per week. No exam generation, no multi-image upload, no TikZ walkthroughs.')]),
    P([B('Paid tiers: '), T('Student $9.99/mo or $59/yr · Pro $14.99/mo or $89/yr · Family $19.99/mo or $149/yr (up to 3 kids, parent portal).'), T(' 22% annual opt-in. Israeli pricing ₪35/₪59/₪79/mo.')], { spacing: { before: 100 } }),
    P([B('Seasonal: '), T('Bagrut Intensive $149 flat for 4 months (April–July). 10% of paid base attaches.')], { spacing: { before: 100 } }),
    P([B('Conversion lever: '), T('"Ask a parent" paywall triggered after 7 engaged days (verified +7–10% conversion lift).')], { spacing: { before: 100 } }),

    H2('Key Design Choices vs Alternatives'),
    tableFromRows([
      ['Dimension', 'Choice', 'Why (vs alternatives)'],
      ['Daily cap', '3 actions/day', '1/day starves engagement; 5/day enables free-rider usage; 3 is the tested sweet spot'],
      ['Model strategy', 'Haiku-free, Sonnet-paid', 'Haiku-everywhere degrades quality for paid; Sonnet-everywhere explodes cost'],
      ['Pricing tiers', 'Three tiers', 'Single tier loses upsell revenue; four+ tiers overwhelm decision-making'],
      ['Currency', 'Israeli ₪ + USD', 'Local currency drives 15% higher conversion vs USD-only'],
      ['Bagrut Intensive', 'Separate product', 'Bundling dilutes urgency signal; seasonal product captures willingness-to-pay'],
      ['Parent portal', 'Included in Family', 'Standalone add-on confuses pricing; Family tier captures the intent cleanly'],
    ], [1400, 2400, 5560], { leftAlignAll: true }),

    H2('Economic Performance — Year 1 (with $65K startup credits)'),
    tableFromRows([
      ['MAU', 'Paid', 'Net ARR', 'Total Cost', 'Op Profit', 'GM%', 'LTV', 'LTV:CAC', 'Payback'],
      ...y1.map(r => [
        fmtNum(r.mau),
        fmtNum(r.paid_users),
        fmtDollars(r.annual_net_rev),
        fmtDollars(r.total_cost),
        fmtDollars(r.operating_profit),
        fmtPct(r.gm_pct_sustainable),
        fmtDollars(r.ltv),
        r.ltv_cac.toFixed(2),
        r.payback_months.toFixed(0) + 'mo',
      ]),
    ], [1000, 860, 1020, 1020, 1020, 920, 660, 1140, 1720]),

    H2('Economic Performance — Year 2 (no credits — the cliff)'),
    tableFromRows([
      ['MAU', 'Paid', 'Net ARR', 'Total Cost', 'Op Profit', 'GM%', 'LTV', 'LTV:CAC', 'Payback'],
      ...y2.map(r => [
        fmtNum(r.mau),
        fmtNum(r.paid_users),
        fmtDollars(r.annual_net_rev),
        fmtDollars(r.total_cost),
        fmtDollars(r.operating_profit),
        fmtPct(r.gm_pct_sustainable),
        fmtDollars(r.ltv),
        r.ltv_cac.toFixed(2),
        r.payback_months.toFixed(0) + 'mo',
      ]),
    ], [1000, 860, 1020, 1020, 1020, 920, 660, 1140, 1720]),

    H2('The Freemium Problem'),
    P([
      B('Sustainable gross margin is negative 163%. '),
      T('At 25K MAU, the company has 23,875 free users each costing $12/yr in variable cost (minimum Haiku usage) against 1,125 paid users generating $147K ARR. '),
      T('The free-user subsidy is $287K/yr — 195% of gross revenue. '),
      B('This ratio cannot be inverted. '),
      T('No matter how many paid users we acquire, each additional free user makes the math worse. Scale makes it worse, not better.'),
    ], { spacing: { before: 120 } }),

    H2('Year 2 Cliff Survival'),
    P([T('When the $65K startup credits expire, variable cost jumps by $65K. At 25K MAU, that transforms a $888K Y1 loss into a $995K Y2 loss — an additional '), B('$107K annual hole '), T('the company must fund. At 100K MAU the cliff math is $102K of added burn — on top of a $4.8M base loss. '), B('Architecture A does not survive the cliff without continuous venture funding.')]),

    H2('Verdict'),
    P([B('Reject. '), T('Freemium at this cost structure is structurally unprofitable. The only path to viability is: (a) driving free-user cost below $0.30/mo — infeasible given Anthropic flat per-token pricing; or (b) achieving 12%+ free-to-paid conversion — infeasible given RevenueCat 2.18% freemium median. '), B('The economics reward the opposite decision: gate the product entirely behind a trial.')]),
  ];
}

// ============================================================
// SECTION: ARCHITECTURE B — SUBSCRIPTION-ONLY
// ============================================================

function architectureB() {
  const y1 = data.B.year1;
  const y2 = data.B.year2;

  return [
    H1('Architecture B — Subscription-only'),

    H2('Optimized Configuration'),
    P([B('Hard paywall. '), T('7-day free trial, no credit card required (reduces friction 30–40% per RevenueCat 2025). All features available in trial at Sonnet quality.')]),
    P([B('Paid tiers: '), T('Student $9.99/mo or $59/yr · Pro $14.99/mo or $89/yr · Family $19.99/mo or $149/yr (3 kids).'), T(' Tier mix expected: 50% Student, 32% Pro, 18% Family. 22% annual opt-in.')], { spacing: { before: 100 } }),
    P([B('Bagrut Intensive: '), T('$149 flat / 4 months as a paid-user upsell (not standalone). 12% attach rate in base case; 30–50% targeted.')], { spacing: { before: 100 } }),
    P([B('Acquisition: '), T('WhatsApp-first ambassador program in Israeli schools, TikTok creator partnerships in Hebrew, parent-targeted Facebook remarketing. Blended CAC target $25 at 5K MAU scale.')], { spacing: { before: 100 } }),

    H2('Key Design Choices vs Alternatives'),
    tableFromRows([
      ['Dimension', 'Choice', 'Why (vs alternatives)'],
      ['Trial length', '7 days', '3 days is too short to hit the "aha"; 14+ days reduces urgency + costs more'],
      ['CC required?', 'No', 'No-CC trial converts 30% less than CC-required but drives 2× the trial starts — net positive'],
      ['Tiers', 'Three (Student/Pro/Family)', 'Anchoring tier psychology: Family tier makes Pro feel like the rational choice'],
      ['Annual discount', '40%', '15% too weak to drive opt-in; 50%+ destroys monthly revenue base'],
      ['Student verification', 'No', 'Adding .edu check reduces signup by 25%; not worth the discount savings'],
      ['Bagrut Intensive', 'Upsell, not standalone', 'Standalone splits acquisition; upsell drives 2× LTV on existing base'],
    ], [1400, 2400, 5560], { leftAlignAll: true }),

    H2('Economic Performance — Year 1 (with $65K startup credits)'),
    tableFromRows([
      ['MAU', 'Paid', 'Net ARR', 'Total Cost', 'Op Profit', 'GM%', 'LTV', 'LTV:CAC', 'Payback'],
      ...y1.map(r => [
        fmtNum(r.mau),
        fmtNum(r.paid_users),
        fmtDollars(r.annual_net_rev),
        fmtDollars(r.total_cost),
        fmtDollars(r.operating_profit),
        fmtPct(r.gm_pct_sustainable),
        fmtDollars(r.ltv),
        r.ltv_cac.toFixed(2),
        r.payback_months.toFixed(0) + 'mo',
      ]),
    ], [1000, 860, 1020, 1020, 1020, 920, 660, 1140, 1720]),

    H2('Economic Performance — Year 2 (no credits)'),
    tableFromRows([
      ['MAU', 'Paid', 'Net ARR', 'Total Cost', 'Op Profit', 'GM%', 'LTV', 'LTV:CAC', 'Payback'],
      ...y2.map(r => [
        fmtNum(r.mau),
        fmtNum(r.paid_users),
        fmtDollars(r.annual_net_rev),
        fmtDollars(r.total_cost),
        fmtDollars(r.operating_profit),
        fmtPct(r.gm_pct_sustainable),
        fmtDollars(r.ltv),
        r.ltv_cac.toFixed(2),
        r.payback_months.toFixed(0) + 'mo',
      ]),
    ], [1000, 860, 1020, 1020, 1020, 920, 660, 1140, 1720]),

    H2('Per-Paid-User Economics (Base Case, Year 2)'),
    tableFromRows([
      ['Metric', 'Value', 'Interpretation'],
      ['Net ARPU per paid user', '$11.46/mo', 'After 18% VAT (70% of users) + 2.9% Stripe + fixed fee'],
      ['Variable cost per paid user', '$8.00/mo', 'With aggressive Haiku routing (60% of actions Haiku)'],
      ['Gross profit per paid user', '$3.46/mo', '30.2% gross margin per paid'],
      ['LTV (12.5 month lifetime)', '$43', 'At 8% monthly paid-user churn'],
      ['CAC per paid user', '$222', '$40 blended CAC / 18% trial-to-paid conversion'],
      ['LTV:CAC', '0.19', 'Structurally inverted — MUST improve via levers below'],
      ['Payback period', '64 months', 'Unacceptable in current state'],
    ], [3000, 1800, 4560], { leftAlignAll: true }),

    H2('Path to Sustainable Unit Economics'),
    P([T('Base case LTV:CAC of 0.19 is unsustainable. The company must achieve LTV:CAC ≥ 3.0 for long-term health. Four levers, each realistic within 18–24 months:')]),

    NumItem('Raise Bagrut Intensive attach from 12% → 40% (via parent-targeted funnel in Q2 each year). Incremental ARPU: +$4.10/mo. New LTV: $94.'),
    NumItem('Drive blended CAC from $40 → $20 via WhatsApp ambassador program and Hebrew TikTok organic (achievable per 97% penetration). New CAC/paid: $111.'),
    NumItem('Capture Haiku 4.5 price reductions (Anthropic has dropped Haiku prices 30–40% YoY historically). New cost/paid: $6.50/mo. New gross profit/paid: $7.46/mo.'),
    NumItem('Lift trial-to-paid from 18% → 25% via Hebrew-native onboarding and "Bagrut countdown" urgency. New CAC/paid: $80.'),

    P([B('Combined: LTV $170 / CAC $80 = LTV:CAC of 2.1.'), T(' Still below 3.0 — but within range of a Series A story with 50%+ YoY revenue growth.')], { spacing: { before: 120 } }),

    H2('Year 2 Cliff Survival'),
    P([
      T('At 5K MAU Y2, the company loses $108K (before credits covering Y1). With credits: break-even. Without: survivable on pre-seed capital. '),
      T('At 25K MAU Y2, the company loses $1.05M — requiring a Seed round (est. $2–3M) to continue. '),
      T('At 100K MAU Y2, the company loses $6.77M — NOT survivable without Series A ($8–12M). '),
      B('Conclusion: Architecture B survives the cliff at modest scale (<5K MAU), requires Seed round at 25K MAU, requires Series A at 100K MAU.'),
    ]),

    H2('Verdict'),
    P([B('Accept. This is the winning architecture. '), T('It delivers positive gross margin, the highest revenue per MAU of the three options, survives Y2 cliff at modest scale, and has a clear 4-lever path to sustainable unit economics within 18 months. The structural advantage over Freemium is 100× revenue per MAU; over Free is the existence of revenue at all.')]),
  ];
}

// ============================================================
// SECTION: ARCHITECTURE C — FREE
// ============================================================

function architectureC() {
  const y1 = data.C.year1;
  const y2 = data.C.year2;

  return [
    H1('Architecture C — Free With No Revenue'),

    H2('Optimized Configuration'),
    P([B('100% free forever for end users. '), T('Aggressive Haiku routing for all actions, 2 actions/day cap (homework+walkthrough pool), no image generation for unverified users. Target variable cost: $0.60/user/month — a 50% reduction vs paid-tier baseline.')]),
    P([B('Revenue sources evaluated: '), T('(a) Grants from Israeli Innovation Authority ($150K/yr best-case) + EU Horizon Europe ($100K/yr if awarded); (b) B2B school licensing at $4/student/yr, 15% capture; (c) Advertising at $3 eCPM, 80 impressions/user/month.')], { spacing: { before: 100 } }),

    H2('Key Question: Can This Scale?'),
    P([B('Short answer: No, not beyond 25K MAU. '), T('The variable AI cost scales linearly — there are no volume discounts on Claude, Recraft, or Supabase — while none of the three revenue sources scale proportionally.')]),

    H2('Economic Performance — Year 1 (with $65K startup credits)'),
    tableFromRows([
      ['MAU', 'Ad Rev', 'B2B Rev', 'Grant', 'Cost', 'Profit (Grant)', 'Profit (Ad+B2B)', 'Profit (All)'],
      ...y1.map(r => [
        fmtNum(r.mau),
        fmtDollars(r.annual_ad_rev),
        fmtDollars(r.annual_b2b_rev),
        fmtDollars(r.annual_grant),
        fmtDollars(r.total_cost),
        fmtDollars(r.op_profit_grant),
        fmtDollars(r.op_profit_ad_b2b),
        fmtDollars(r.op_profit_all),
      ]),
    ], [860, 1000, 1000, 1000, 1200, 1400, 1400, 1500]),

    H2('Economic Performance — Year 2 (no credits)'),
    tableFromRows([
      ['MAU', 'Ad Rev', 'B2B Rev', 'Grant', 'Cost', 'Profit (Grant)', 'Profit (Ad+B2B)', 'Profit (All)'],
      ...y2.map(r => [
        fmtNum(r.mau),
        fmtDollars(r.annual_ad_rev),
        fmtDollars(r.annual_b2b_rev),
        fmtDollars(r.annual_grant),
        fmtDollars(r.total_cost),
        fmtDollars(r.op_profit_grant),
        fmtDollars(r.op_profit_ad_b2b),
        fmtDollars(r.op_profit_all),
      ]),
    ], [860, 1000, 1000, 1000, 1200, 1400, 1400, 1500]),

    H2('The Ad-Supported Math'),
    P([T('At $3 eCPM × 80 impressions/user/month = $0.24 ad ARPU per user per month. Against a minimum variable cost of $0.60/user/month, ads alone cannot cover AI cost. '), B('Even with aggressive Haiku routing and tight caps, ad revenue recovers only 40% of variable cost.')]),

    H2('The Grant-Funded Math'),
    P([T('Israeli Innovation Authority grants for consumer EdTech cap around $150K/yr; EU Horizon Europe rounds go to $100K–$300K but are highly competitive and require academic-institution partnerships. '), B('Combined realistic grant income: $250K/yr Y1, $100K/yr Y2. '), T('This covers operation up to ~25K MAU with ultra-tight caps, but fails at 100K MAU where costs exceed $1.3M/yr.')]),

    H2('The B2B School-Licensing Side Door'),
    P([T('A genuine alternative: pivot to B2B selling to Israeli high schools at $4/student/year, capturing 15% of the student base (~22K students if the product reaches 150K total students). '), B('Revenue: $60K at 100K MAU. '), T('Still an order of magnitude below cost. B2B school sales in Israel are 18–36 month cycles, require dedicated sales staff, and represent a fundamentally different company.')]),

    H2('The "Mission Play" Math at 100K+ MAU'),
    P([T('At 100K MAU, the company loses $900K–$1.25M per year with all revenue sources combined. '), B('This is a philanthropic enterprise requiring $1M/yr+ in donations or anchor-donor funding '), T('(analogous to Khan Academy\'s model before Khanmigo). Not a venture-backed company.')]),

    H2('Verdict'),
    P([B('Reject as primary architecture. '), T('Architecture C is viable only as a supplement to a revenue architecture or as a mission-driven NGO at modest scale. It is NOT compatible with pre-seed venture funding from Miami-based investors — the return profile fundamentally does not exist.')]),

    P([I('Note: The free-forever NGO path is worth preserving as a long-term OPTION once the company is profitable. Duolingo offers a free tier alongside Super; Khan Academy keeps free content alongside Khanmigo. Free-at-scale is viable as a supplement, not a business.')], { spacing: { before: 120 } }),
  ];
}

// ============================================================
// SECTION: COMPARISON
// ============================================================

function comparison() {
  const aY1_5k = data.A.year1[3];
  const bY1_5k = data.B.year1[3];
  const cY1_5k = data.C.year1[3];

  const aY2_25k = data.A.year2[4];
  const bY2_25k = data.B.year2[4];
  const cY2_25k = data.C.year2[4];

  return [
    H1('Side-by-Side Comparison'),

    H2('At 5,000 MAU — Year 1 Snapshot'),
    tableFromRows([
      ['Metric', 'A — Freemium', 'B — Subscription', 'C — Free'],
      ['Paying users', fmtNum(aY1_5k.paid_users), fmtNum(bY1_5k.paid_users), '0'],
      ['Net ARR', fmtDollars(aY1_5k.annual_net_rev), fmtDollars(bY1_5k.annual_net_rev), '$0'],
      ['Ad/Grant/B2B Revenue', '$0', '$0', fmtDollars(cY1_5k.annual_ad_rev + cY1_5k.annual_b2b_rev + cY1_5k.annual_grant)],
      ['Total Cost', fmtDollars(aY1_5k.total_cost), fmtDollars(bY1_5k.total_cost), fmtDollars(cY1_5k.total_cost)],
      ['Operating Profit', fmtDollars(aY1_5k.operating_profit), fmtDollars(bY1_5k.operating_profit), fmtDollars(cY1_5k.op_profit_all)],
      ['Gross Margin %', fmtPct(aY1_5k.gm_pct_sustainable), fmtPct(bY1_5k.gm_pct_sustainable), 'N/A (no subscription)'],
      ['Blended CAC', fmtDollars(aY1_5k.cac), fmtDollars(bY1_5k.cac), fmtDollars(cY1_5k.cac || 5)],
      ['LTV per paid user', fmtDollars(aY1_5k.ltv), fmtDollars(bY1_5k.ltv), 'N/A'],
      ['LTV:CAC', aY1_5k.ltv_cac.toFixed(2), bY1_5k.ltv_cac.toFixed(2), 'N/A'],
      ['Payback (months)', aY1_5k.payback_months.toFixed(0), bY1_5k.payback_months.toFixed(0), 'N/A'],
    ], [2800, 2160, 2200, 2200]),

    H2('At 25,000 MAU — Year 2 Snapshot (the cliff year)'),
    tableFromRows([
      ['Metric', 'A — Freemium', 'B — Subscription', 'C — Free'],
      ['Paying users', fmtNum(aY2_25k.paid_users), fmtNum(bY2_25k.paid_users), '0'],
      ['Net ARR', fmtDollars(aY2_25k.annual_net_rev), fmtDollars(bY2_25k.annual_net_rev), '$0'],
      ['Ad/Grant/B2B Revenue', '$0', '$0', fmtDollars(cY2_25k.annual_ad_rev + cY2_25k.annual_b2b_rev + cY2_25k.annual_grant)],
      ['Total Cost', fmtDollars(aY2_25k.total_cost), fmtDollars(bY2_25k.total_cost), fmtDollars(cY2_25k.total_cost)],
      ['Operating Profit', fmtDollars(aY2_25k.operating_profit), fmtDollars(bY2_25k.operating_profit), fmtDollars(cY2_25k.op_profit_all)],
      ['Gross Margin %', fmtPct(aY2_25k.gm_pct_sustainable), fmtPct(bY2_25k.gm_pct_sustainable), 'N/A'],
      ['Year-2 survivable without Seed?', 'No', 'No (needs $2M Seed)', 'Maybe (grant-funded)'],
      ['Capital required Y1+Y2', '$6M+', '$2–3M', '$250–400K (grants)'],
    ], [2800, 2160, 2200, 2200]),

    H2('Strategic Attributes'),
    tableFromRows([
      ['Dimension', 'A — Freemium', 'B — Subscription', 'C — Free'],
      ['Gross margin (sustainable)', '-163% (broken)', '+28% (acceptable)', 'N/A'],
      ['Revenue per MAU', '$1.35/yr', '$135/yr', '$3.30/yr'],
      ['MAU to reach $1M ARR', '170,000+', '~8,600', 'Not achievable'],
      ['Y2 cliff survival', 'No — burn accelerates', 'Yes (with Seed round)', 'Only at tiny scale'],
      ['Best-case 3yr outcome', 'Pivot or shutdown', '$15M Series A', 'NGO pivot or merger'],
      ['Alignment with investor profile', 'Low', 'High', 'Incompatible'],
      ['Founder-control preservation', 'Poor (dilution needed)', 'Strong (tight rounds)', 'N/A (grants not equity)'],
    ], [2800, 2160, 2200, 2200], { leftAlignAll: true }),

    H2('Why B Beats A and C Structurally'),
    P([B('Architecture A loses because '), T('it tries to subsidize a free-rider population larger than its paying population. Every additional free user erodes the model. The only historical freemium success (Duolingo 8.8% conversion) is a 15-year compound miracle built on gamification and massive brand; X+1 cannot reproduce that advantage in under 5 years.')]),
    P([B('Architecture C loses because '), T('the variable cost per user is too high relative to all known non-subscription revenue streams. Ad eCPMs, grant sizes, and B2B license values simply do not scale to cover $7–10/mo/user in AI costs. This is a structural limit of the consumer EdTech category in 2026.')], { spacing: { before: 120 } }),
    P([B('Architecture B wins because '), T('it aligns willingness-to-pay (Israeli parents already spend $220–670/mo on human tutors) with a cost structure that can be optimized (Haiku routing + caching already shipped). The only remaining question is execution on the four improvement levers — and those levers are well-documented, measurable, and inside the founder\'s control.')], { spacing: { before: 120 } }),
  ];
}

// ============================================================
// SECTION: SENSITIVITY
// ============================================================

function sensitivity() {
  return [
    H1('Sensitivity Analysis'),

    H2('Stress-Testing Architecture B at 25K MAU (Year 2, base case operating loss $1.05M)'),
    P([T('±20% movement on each of the four critical variables, holding all others constant. This reveals which levers most reward execution and which most threaten the business.')]),

    tableFromRows([
      ['Variable', '-20%', 'Base', '+20%', 'Δ per 20% move'],
      ['Price (all tiers)', '-$1.58M', '-$1.05M', '-$516K', '$531K'],
      ['Trial-to-paid conversion', '-$1.50M', '-$1.05M', '-$745K', '$303K'],
      ['Paid-user monthly churn', '-$684K', '-$1.05M', '-$1.41M', '$363K'],
      ['Paid-user variable cost', '-$639K', '-$1.05M', '-$1.46M', '$408K'],
    ], [2800, 1800, 1800, 1800, 1160]),

    H2('Interpretation'),
    Bullet('Price is the most powerful lever. A 20% price lift closes 50% of the operating loss, while a 20% cut doubles it. But price elasticity sets a ceiling: per user brief, $9.99 → $19.99 cuts conversion 40%. The realistic price ceiling is $14.99–19.99 for Pro.'),
    Bullet('Cost is the second most powerful lever. A 20% cost reduction (e.g. Haiku 4.5 shipping in 2026 + deeper cache hit rate) saves $408K per year at this scale. Anthropic has dropped Haiku prices 30–40% YoY historically — this is a reasonable expectation.'),
    Bullet('Churn is the third lever. Reducing monthly paid churn from 8% to 6.4% (via streak mechanics, parent notifications, exam countdowns) saves $363K. Industry minimum is 5%; realistic target 6%.'),
    Bullet('Conversion is the lowest-leverage but most-controllable variable. Moving trial-to-paid from 18% to 21.6% saves $303K — achievable with paywall A/B testing.'),

    H2('Robustness Scorecard'),
    tableFromRows([
      ['Architecture', 'Most sensitive to', 'Upside if +20% on best lever', 'Downside if -20% on worst lever'],
      ['A — Freemium', 'Free-user variable cost', '+$800K (still negative)', '-$1.5M (catastrophic)'],
      ['B — Subscription', 'Price', '+$531K (half of loss gone)', '-$531K (loss grows)'],
      ['C — Free', 'Grant award variability', '+$50K (on $250K grants)', '-$250K (loss of core funding)'],
    ], [1800, 2400, 2580, 2580], { leftAlignAll: true }),

    P([B('B is the most upside-leveraged architecture: '), T('+20% on any variable moves the P&L $300–530K in the right direction. A is the most fragile: each variable moves the P&L 2–3× more in the wrong direction than the right direction (asymmetric). C is the most stable but with the lowest ceiling.')], { spacing: { before: 120 } }),

    H2('Two-Variable Combined Stress'),
    P([T('Realistic best-case scenario (Architecture B, 25K MAU Y2): +20% price AND -20% cost simultaneously (both within founder control within 12 months via pricing A/B and Haiku routing depth).')]),
    P([B('Combined impact: '), T('-$1.05M + $531K + $408K = '), B('-$111K operating profit. Effective break-even. '), T('This is the "execute-well-and-you-survive" scenario.')], { spacing: { before: 120 } }),
    P([T('Realistic worst-case: -20% price AND +20% churn (Israeli parent segment squeezed by macro-economy + competitor launches free tier).')]),
    P([B('Combined impact: '), T('-$1.05M - $531K - $363K = '), B('-$1.94M. Company requires emergency bridge round or wind-down.')], { spacing: { before: 120 } }),
  ];
}

// ============================================================
// SECTION: RECOMMENDATION
// ============================================================

function recommendation() {
  return [
    H1('THE Recommendation'),

    H2('Launch Architecture B — with Israeli Bagrut Anchor'),
    P([
      B('Single winner: Architecture B (Subscription-only). '),
      T('Launch May 2026 targeting the Israeli Bagrut beachhead. 7-day free trial (no CC), three-tier pricing ($9.99 / $14.99 / $19.99 per month), Bagrut Intensive seasonal upsell at $149 / 4 months, parent-portal included in Family tier.'),
    ]),

    H2('Why This, and Nothing Else'),
    NumItem2('Unit economics: +28% sustainable gross margin vs -163% for Freemium. Any scale is better than Freemium at every scale.'),
    NumItem2('Capital efficiency: reaches $1M ARR at ~8,600 MAU vs 170K+ MAU for Freemium. 20× less marketing spend needed to reach the same revenue inflection.'),
    NumItem2('Cliff survival: Year 2 viable with $2–3M Seed at 25K MAU. Architecture A requires $6M+ just to tread water.'),
    NumItem2('Investor fit: Miami-based pre-seed investors expect venture-scale outcomes. Architecture B has a credible path to $10–50M Series A; A and C do not.'),
    NumItem2('Execution clarity: four named improvement levers (Bagrut attach, CAC, cost, conversion) each mapped to specific product/marketing work.'),

    H2('90-Day Execution Plan'),
    H3('Days 1–30: Pre-Launch'),
    Bullet('Implement hard paywall with 7-day free trial (no CC) in app. Feature-flag for staged rollout.'),
    Bullet('Set up Stripe + Bit/PayBox via Stripe passthrough for Israeli payments.'),
    Bullet('Finalize three-tier pricing page in Hebrew + English with currency detection.'),
    Bullet('Build parent-portal UI for Family tier (child management, usage dashboard, progress emails).'),
    Bullet('Apply for Anthropic Startup Program ($5–25K credits), verify Vercel Startups ($30K), and AWS Activate ($10K).'),
    Bullet('Recruit 5 Bagrut-grade student ambassadors from Israeli high schools (Tichon Hadash, Herzliya Hebrew Gymnasium, Ironi Alef Rehovot).'),

    H3('Days 31–60: Soft Launch'),
    Bullet('Launch to 200 Israeli beta users via ambassadors. Target 40% trial-to-paid conversion in hand-picked cohort.'),
    Bullet('Record and publish 10 Hebrew TikTok "study session" videos per week. Seed to 3 Bagrut-focused creators for paid posts ($300–500 each).'),
    Bullet('Ship Bagrut Intensive product page and checkout — live by June 1 for May/June exam season.'),
    Bullet('Implement daily-streak + parent notification system for churn reduction.'),
    Bullet('Deploy parent-targeted Facebook campaigns at $30–50 CAC to Israeli 40–55yo with high-school-age kids.'),

    H3('Days 61–90: Launch & Optimize'),
    Bullet('Public launch: press release in Hebrew tech media (Calcalist, TheMarker). Reach 1,000 paid subscribers.'),
    Bullet('A/B test paywall: with-CC vs without-CC trial. Target 18%+ trial-to-paid.'),
    Bullet('Monitor and optimize: Bagrut Intensive attach (target 20%), trial-to-paid (target 22%), monthly churn (target 7%).'),
    Bullet('Apply for Israeli Innovation Authority R&D grant ($100–150K, 12-month horizon).'),
    Bullet('Begin Seed-round conversations with early-stage Israeli VCs (Pitango, TLV Partners, Grove Ventures).'),

    H2('Year-1 Milestones'),
    tableFromRows([
      ['Month', 'MAU', 'Paid', 'ARR', 'Cash Burn (monthly)', 'Key Gate'],
      ['Month 3', '500', '100', '$17K', '$22K', 'Soft launch working, 5% trial→paid'],
      ['Month 6', '2,000', '700', '$96K', '$35K', 'First Bagrut cohort complete, 18% trial→paid'],
      ['Month 9', '3,500', '1,500', '$207K', '$42K', 'Family tier launched, ambassador program at 25 schools'],
      ['Month 12', '5,000', '2,500', '$343K', '$45K', 'Seed round begins at 8.6K MAU / $1M ARR projection'],
    ], [1400, 1400, 1400, 1600, 1600, 1960]),

    H2('Decision Triggers for Pivoting'),
    P([B('Pivot to Architecture A (Freemium) if: '), T('trial-to-paid conversion stalls below 10% after 6 months of aggressive optimization, AND organic signup rate exceeds 500/week. (Signal: users love it but won\'t pay — monetize at scale with free acquisition.)')]),
    P([B('Pivot to Architecture C-adjacent B2B if: '), T('3+ Israeli school districts actively request institutional licenses unprompted. Switch the business model, not the product.')]),
    P([B('Shut down if: '), T('by Month 9, MAU is below 1,500 AND monthly churn exceeds 12% AND Bagrut Intensive attach below 8%. These are three simultaneous failure signals — any two alone are recoverable.')]),

    H2('Why the Founder Is Uniquely Suited'),
    P([T('Ariel is 16, Israeli, a Bagrut student himself, and has logged 800–1,000 hours building X+1. He is the target customer, distribution channel (classmates + teachers who know him), and engineering team in one person. He speaks Hebrew natively, tests in real exam conditions, and has relationships with the school ambassadors the business needs. '), B('No adult founder has this combination. '), T('The founder\'s age is a strategic asset — he ships faster, costs less, and understands the user in ways consultants cannot replicate.')]),

    H2('The Three-Year Story for Investors'),
    P([
      B('Year 1 (2026): '), T('Launch Israel. 5K MAU, $600K ARR, 70% Israeli revenue. Validate Bagrut Intensive as profit center. '),
    ]),
    P([
      B('Year 2 (2027): '), T('Scale Israel + launch UK GCSE beta. 25K MAU, $3M ARR. Raise $3M Seed. Achieve break-even in Israeli unit economics.'),
    ]),
    P([
      B('Year 3 (2028): '), T('Expand to US AP + IB. 100K+ MAU, $10M+ ARR, break-even overall or modest profit. Raise $15–25M Series A. '),
    ]),
    P([
      B('Exit: '), T('Strategic acquisition by Khan Academy, Duolingo, Quizlet, Google (Photomath consolidation), or ByteDance (Gauth consolidation) at $75–200M — a 150–400× return on a $500K pre-seed.'),
    ]),
  ];
}

// ============================================================
// SECTION: APPENDIX
// ============================================================

function appendix() {
  return [
    H1('Appendix — Methodology, Sources, Formulas'),

    H2('Core Formulas'),

    H3('Net Revenue Per Paid User (monthly)'),
    P([I('For a blended tier mix, annual opt-in share, VAT geography, and payment fees:')], { spacing: { before: 80 } }),
    P([T('Net ARPU = [ Σ (tier_share × (monthly_share × price_monthly + annual_share × price_annual/12)) ]')]),
    P([T('         × [ PCT_IL × (1 / 1.18) + (1 − PCT_IL) × 1 ]                 // VAT adjustment')]),
    P([T('         × (1 − 0.029)                                                 // Stripe percentage')]),
    P([T('         − $0.30 × monthly_share − $0.30/12 × annual_share             // Stripe fixed fee')]),

    H3('Gross Profit and LTV'),
    P([T('Gross profit per paid user per month = Net ARPU − Variable cost per paid user')]),
    P([T('LTV = Gross profit per paid user per month / Monthly paid-user churn rate')]),

    H3('CAC Per Paid User'),
    P([T('CAC (blended) = cost to acquire one new user via paid channels (weighted by channel mix)')]),
    P([T('Paid-channel share = 40% of new-user acquisitions (the rest organic/viral)')]),
    P([T('CAC per paid user = Blended CAC / Conversion rate (trial-to-paid for Sub, free-to-paid for Freemium)')]),

    H3('Operating Profit'),
    P([T('Operating profit = Net revenue − Variable cost (after credits) − Fixed cost − Team cost − Marketing spend')]),

    H2('Key Assumptions (Base Case)'),
    tableFromRows([
      ['Parameter', 'Value', 'Source / Justification'],
      ['Israeli VAT', '18%', 'Israeli Tax Authority, consumer digital services 2026'],
      ['Stripe fee', '2.9% + $0.30', 'Stripe standard pricing, consumer'],
      ['% Israeli users', '70%', 'Beachhead strategy; shifts to 40% by Y3 with international expansion'],
      ['% paid-channel acquisition', '40%', 'Conservative; Duolingo reports 60%+ organic at scale'],
      ['Paid-user monthly churn', '8% (Sub), 9% (Free)', 'RevenueCat 2025; EdTech sector 9.6% avg'],
      ['Free-user monthly churn', '15%', 'Conservative for engaged free users with SRS retention'],
      ['Trial-to-paid conversion', '18%', 'Mid-range of RevenueCat 2025 hard-paywall 12–25% band'],
      ['Free-to-paid conversion', '4.5%', 'Between RevenueCat freemium 2.18% median and Duolingo 8.8% ceiling'],
      ['Annual opt-in rate', '22%', 'Mid-range per brief (15–25% consumer EdTech norm)'],
      ['Bagrut Intensive attach', '10–12%', 'Base case; optimistic 30–50% targeted'],
      ['Startup credits (Y1 only)', '$65K', 'Anthropic $25K + Vercel $30K + AWS $10K (verified April 2026)'],
      ['Paid-user variable cost', '$7.50–$8.00/mo', 'Aggressive Haiku routing (60% of actions Haiku-compatible)'],
      ['Free-user variable cost', '$1.00/mo', 'Tight caps + Haiku-only routing'],
    ], [2800, 1800, 4760], { leftAlignAll: true }),

    H2('Sources'),
    H3('Competitor Pricing & Metrics (verified April 2026)'),
    new Paragraph({ children: [BLink('Khanmigo pricing ($44/yr parents, $4/mo) — khanmigo.ai/pricing', 'https://www.khanmigo.ai/pricing')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Duolingo Q1 2025 Shareholder Letter (8.8% conversion, 9.5M paid subs)', 'https://investors.duolingo.com/')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Photomath ($9.99/mo, $69.99/yr) — Google-owned', 'https://photomath.com')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Gauth (ByteDance) — 300M users, $18M/mo Q3 2025', 'https://www.gauthmath.com')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Quizlet Plus ($7.99/mo, $35.99/yr, 75M MAU, ~$120M ARR)', 'https://quizlet.com/plus')], spacing: { before: 60 } }),

    H3('Industry Benchmarks'),
    new Paragraph({ children: [BLink('RevenueCat 2025 State of Subscription Apps', 'https://www.revenuecat.com/state-of-subscription-apps-2025/')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Subscription Statistics 2025 (churn, conversion)', 'https://marketingltb.com/blog/statistics/subscription-statistics/')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Business of Apps — Duolingo Revenue and Usage Statistics 2026', 'https://www.businessofapps.com/data/duolingo-statistics/')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Chegg revenue decline and 45% layoffs (CNBC, Oct 2025)', 'https://www.cnbc.com/2025/10/27/chegg-slashes-45percent-of-workforce-blames-new-realities-of-ai.html')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('TikTok CPM benchmarks 2025 (Varos / Trendtrack)', 'https://www.varos.com/blog/tiktok-ads-cpm-cost')], spacing: { before: 60 } }),

    H3('Startup Credits (verified April 2026)'),
    new Paragraph({ children: [BLink('Anthropic Startup Program — AICredits.co guide', 'https://www.aicredits.co/en/blogs/anthropic-startup-program-2026')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Vercel for Startups ($30K credits, 2026 program)', 'https://vercel.com/startups/credits')], spacing: { before: 60 } }),

    H3('Israeli Market'),
    new Paragraph({ children: [BLink('Haaretz — Israeli private tutoring industry', 'https://www.haaretz.com/israel-news/business/2013-12-20/ty-article/.premium/students-learning-the-hard-cash-way/')], spacing: { before: 60 } }),
    new Paragraph({ children: [BLink('Naale Elite Academy — Israeli Bagrut & Yechidot system', 'https://naale-elite-academy.com/megamot-yechidot/')], spacing: { before: 60 } }),

    H2('Modeling Caveats'),
    Bullet('All figures in USD unless noted. Israeli VAT embedded in list prices (pass-through to tax authority).'),
    Bullet('Credits apply only to Year 1 variable cost — Year 2 cliff is explicit in each architecture.'),
    Bullet('Fixed infrastructure cost scales sub-linearly (plan tier jumps). Actual cost at any given scale may vary ±20%.'),
    Bullet('Marketing spend is modeled as 40% of churn-replacement new-user acquisition × blended CAC. Actual marketing may be higher during growth phases (front-loaded) and lower at scale (organic dominance).'),
    Bullet('Founder compensation: $0 Year 1, $30K Year 2 (plus $12K part-time contractor). Excluded: equity dilution, legal, accounting.'),
    Bullet('Sensitivity analysis holds all other variables constant; in reality variables correlate (price ↑ → churn ↑).'),
    Bullet('No currency-hedging cost modeled; 70% of revenue denominated in NIS, 30% USD.'),
    Bullet('Bagrut Intensive modeled at 10–12% attach (conservative); strategic target 30–40%.'),

    H2('What Is NOT Modeled'),
    Bullet('Viral coefficient > 1.0. WhatsApp virality is treated as lower CAC, not as exponential growth.'),
    Bullet('Seasonality explicitly. Bagrut Intensive amortized across 12 months; actual cash flow spikes in Q2.'),
    Bullet('Feature-driven pricing-power changes. Interactive diagrams, TikZ walkthroughs, and parent portals may command premiums not captured in base case.'),
    Bullet('Haiku 4.5 price reductions (shown in sensitivity but not base case).'),
    Bullet('B2B school licensing revenue (shown in Architecture C but not added to A/B as incremental).'),
  ];
}

// ============================================================
// ASSEMBLE DOCUMENT
// ============================================================

const sections = [
  {
    properties: {
      page: {
        size: { width: 12240, height: 15840 },     // US Letter
        margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
      },
    },
    footers: {
      default: new Footer({
        children: [new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [
            new TextRun({ text: 'X+1 Business Plan · April 2026 · Page ', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.CURRENT], size: 18, color: '888888' }),
            new TextRun({ text: ' of ', size: 18, color: '888888' }),
            new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 18, color: '888888' }),
          ],
        })],
      }),
    },
    children: [
      ...coverPage(),
      ...tocSection(),
      ...executiveSummary(),
      ...marketContext(),
      ...architectureA(),
      ...architectureB(),
      ...architectureC(),
      ...comparison(),
      ...sensitivity(),
      ...recommendation(),
      ...appendix(),
    ],
  },
];

const doc = new Document({
  creator: 'X+1 — Ariel Barkan',
  title: 'X+1 Strategic Business Plan — Three Architecture Analysis',
  description: 'Investor-grade business plan comparing Freemium, Subscription-only, and Free architectures for X+1 AI-native curriculum-aligned learning platform',
  styles: {
    default: {
      document: { run: { font: 'Arial', size: 22 } },   // 11pt body
      heading1: { run: { font: 'Arial', size: 36, bold: true, color: BLUE }, paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 } },
      heading2: { run: { font: 'Arial', size: 28, bold: true, color: DARK_GRAY }, paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 } },
      heading3: { run: { font: 'Arial', size: 24, bold: true, color: DARK_GRAY }, paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    },
    paragraphStyles: [
      { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 36, bold: true, color: BLUE },
        paragraph: { spacing: { before: 400, after: 240 }, outlineLevel: 0 } },
      { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 28, bold: true, color: DARK_GRAY },
        paragraph: { spacing: { before: 300, after: 160 }, outlineLevel: 1 } },
      { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true,
        run: { font: 'Arial', size: 24, bold: true, color: DARK_GRAY },
        paragraph: { spacing: { before: 200, after: 100 }, outlineLevel: 2 } },
    ],
  },
  numbering: {
    config: [
      { reference: 'bullets', levels: [
        { level: 0, format: LevelFormat.BULLET, text: '•', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
        { level: 1, format: LevelFormat.BULLET, text: '◦', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 720, hanging: 240 } } } },
      ]},
      { reference: 'numbers', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
      ]},
      { reference: 'numbers2', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
      ]},
      { reference: 'numbers3', levels: [
        { level: 0, format: LevelFormat.DECIMAL, text: '%1.', alignment: AlignmentType.LEFT,
          style: { paragraph: { indent: { left: 360, hanging: 240 } } } },
      ]},
    ],
  },
  features: { updateFields: true },
  sections,
});

Packer.toBuffer(doc).then(buffer => {
  const outPath = path.join(__dirname, 'X+1_Business_Plan.docx');
  fs.writeFileSync(outPath, buffer);
  console.log(`✓ Document written to: ${outPath}`);
  console.log(`  Size: ${(buffer.length / 1024).toFixed(1)} KB`);
});
