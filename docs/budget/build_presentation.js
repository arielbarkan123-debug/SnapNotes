const pptxgen = require("pptxgenjs");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.author = "X+1";
pres.title = "X+1 Product Launch — Executive Budget Approval";

// ============================================================================
// Color Palette: Ocean Gradient + Dark Executive
// ============================================================================
const C = {
  navy: "0F1B2D",
  darkBlue: "1B2A4A",
  midBlue: "2C4A7C",
  accent: "00B4D8",
  accentLight: "90E0EF",
  white: "FFFFFF",
  offWhite: "F0F4F8",
  lightGray: "E2E8F0",
  gray: "64748B",
  darkText: "1E293B",
  green: "10B981",
  red: "EF4444",
  orange: "F59E0B",
  gold: "FBBF24",
};

const makeShadow = () => ({
  type: "outer", blur: 6, offset: 2, angle: 135, color: "000000", opacity: 0.12,
});

// ============================================================================
// SLIDE 1: Title Slide
// ============================================================================
let s1 = pres.addSlide();
s1.background = { color: C.navy };

// Top accent bar
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent },
});

s1.addText("X+1", {
  x: 0.8, y: 1.2, w: 8, h: 0.8,
  fontSize: 48, fontFace: "Georgia", bold: true, color: C.white, margin: 0,
});

s1.addText("Product Launch — Budget & Cash Flow Proposal", {
  x: 0.8, y: 2.0, w: 8, h: 0.6,
  fontSize: 22, fontFace: "Calibri", color: C.accentLight, margin: 0,
});

// Divider line
s1.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 2.85, w: 2.5, h: 0.04, fill: { color: C.accent },
});

s1.addText("AI-Powered Learning Platform", {
  x: 0.8, y: 3.1, w: 6, h: 0.5,
  fontSize: 16, fontFace: "Calibri", color: C.accentLight, margin: 0,
});

s1.addText("March 2026  |  Executive Management Review", {
  x: 0.8, y: 4.5, w: 8, h: 0.4,
  fontSize: 12, fontFace: "Calibri", color: C.accentLight, margin: 0,
});

// ============================================================================
// SLIDE 2: The Opportunity
// ============================================================================
let s2 = pres.addSlide();
s2.background = { color: C.offWhite };

s2.addText("The Opportunity", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

// Left column — problem
s2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.4, w: 4, h: 3.4,
  fill: { color: C.white }, shadow: makeShadow(),
});
s2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 1.4, w: 4, h: 0.06, fill: { color: C.red },
});
s2.addText("Problem", {
  x: 1.1, y: 1.65, w: 3.5, h: 0.4,
  fontSize: 18, fontFace: "Georgia", bold: true, color: C.red, margin: 0,
});
s2.addText([
  { text: "Students struggle to convert handwritten notes, photos, and documents into effective study material", options: { breakLine: true, fontSize: 13 } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "Existing tools are passive — they store notes, not teach from them", options: { breakLine: true, fontSize: 13 } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "No single platform combines OCR, AI tutoring, spaced repetition, and exam prep", options: { fontSize: 13 } },
], { x: 1.1, y: 2.2, w: 3.4, h: 2.4, fontFace: "Calibri", color: C.darkText, valign: "top", margin: 0 });

// Right column — solution
s2.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 1.4, w: 4, h: 3.4,
  fill: { color: C.white }, shadow: makeShadow(),
});
s2.addShape(pres.shapes.RECTANGLE, {
  x: 5.2, y: 1.4, w: 4, h: 0.06, fill: { color: C.green },
});
s2.addText("X+1 Solution", {
  x: 5.5, y: 1.65, w: 3.5, h: 0.4,
  fontSize: 18, fontFace: "Georgia", bold: true, color: C.green, margin: 0,
});
s2.addText([
  { text: "Snap a photo of notes → AI generates interactive courses, quizzes, and study guides", options: { breakLine: true, fontSize: 13 } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "Supports images, PDFs, PPTX, DOCX + Hebrew/English", options: { breakLine: true, fontSize: 13 } },
  { text: "", options: { breakLine: true, fontSize: 8 } },
  { text: "90+ API routes: homework tutor, exams, SRS flashcards, walkthroughs, diagrams", options: { fontSize: 13 } },
], { x: 5.5, y: 2.2, w: 3.4, h: 2.4, fontFace: "Calibri", color: C.darkText, valign: "top", margin: 0 });

// Market size callout
s2.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 5.05, w: 8.4, h: 0.4,
  fill: { color: C.darkBlue },
});
s2.addText("Global EdTech market: $340B by 2027 (CAGR 16.3%)  —  AI tutoring segment growing 25%+ YoY", {
  x: 0.8, y: 5.05, w: 8.4, h: 0.4,
  fontSize: 11, fontFace: "Calibri", color: C.white, align: "center", valign: "middle", margin: 0,
});

// ============================================================================
// SLIDE 3: Product Overview
// ============================================================================
let s3 = pres.addSlide();
s3.background = { color: C.offWhite };

s3.addText("Product at a Glance", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

const features = [
  { title: "Smart Upload", desc: "Photo, PDF, PPTX, DOCX\nOCR + AI extraction", color: C.accent },
  { title: "AI Course Gen", desc: "Full interactive courses\nfrom any source material", color: C.midBlue },
  { title: "Homework Help", desc: "Step-by-step solver\nwith visual walkthroughs", color: C.green },
  { title: "Exam Prep", desc: "Auto-generated exams\nwith past-exam analysis", color: C.orange },
  { title: "SRS Flashcards", desc: "Spaced repetition with\nFSRS algorithm", color: "8B5CF6" },
  { title: "100+ Diagrams", desc: "Visual math engine\nTikZ, Recharts, Mermaid", color: C.red },
];

features.forEach((f, i) => {
  const col = i % 3;
  const row = Math.floor(i / 3);
  const x = 0.8 + col * 3.0;
  const y = 1.4 + row * 1.9;

  s3.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 2.7, h: 1.6,
    fill: { color: C.white }, shadow: makeShadow(),
  });
  // Color accent top
  s3.addShape(pres.shapes.RECTANGLE, {
    x, y, w: 2.7, h: 0.06, fill: { color: f.color },
  });
  s3.addText(f.title, {
    x: x + 0.2, y: y + 0.2, w: 2.3, h: 0.4,
    fontSize: 15, fontFace: "Georgia", bold: true, color: f.color, margin: 0,
  });
  s3.addText(f.desc, {
    x: x + 0.2, y: y + 0.65, w: 2.3, h: 0.8,
    fontSize: 12, fontFace: "Calibri", color: C.darkText, margin: 0,
  });
});

// ============================================================================
// SLIDE 4: Cost Structure
// ============================================================================
let s4 = pres.addSlide();
s4.background = { color: C.offWhite };

s4.addText("Monthly Cost Structure", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

s4.addText("Total monthly cost by active user count (mixed usage: 40% light, 40% medium, 20% heavy)", {
  x: 0.8, y: 1.0, w: 8, h: 0.4,
  fontSize: 12, fontFace: "Calibri", color: C.gray, margin: 0,
});

// Cost table
const costData = [
  [
    { text: "Cost Category", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "left" } },
    { text: "50 Users", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "center" } },
    { text: "100 Users", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "center" } },
    { text: "500 Users", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "center" } },
    { text: "1,000 Users", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "center" } },
    { text: "5,000 Users", options: { bold: true, color: C.white, fill: { color: C.darkBlue }, align: "center" } },
  ],
  ["Claude AI API", "$665", "$1,330", "$6,650", "$13,300", "$66,500"],
  ["Infrastructure", "$38", "$55", "$272", "$472", "$2,449"],
  ["Marketing", "$500", "$1,000", "$3,000", "$5,000", "$15,000"],
  ["Contractors", "$2,000", "$2,000", "$3,000", "$5,000", "$10,000"],
  [
    { text: "TOTAL/Month", options: { bold: true, color: C.white, fill: { color: C.midBlue } } },
    { text: "$3,203", options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: "center" } },
    { text: "$4,385", options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: "center" } },
    { text: "$12,922", options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: "center" } },
    { text: "$23,772", options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: "center" } },
    { text: "$93,949", options: { bold: true, color: C.white, fill: { color: C.midBlue }, align: "center" } },
  ],
];

s4.addTable(costData, {
  x: 0.8, y: 1.6, w: 8.4, h: 2.8,
  fontSize: 12, fontFace: "Calibri", color: C.darkText,
  border: { pt: 0.5, color: C.lightGray },
  colW: [1.8, 1.2, 1.2, 1.4, 1.4, 1.4],
  rowH: [0.4, 0.35, 0.35, 0.35, 0.35, 0.4],
  autoPage: false,
});

// Key insight box
s4.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.6, w: 8.4, h: 0.7,
  fill: { color: C.white }, shadow: makeShadow(),
});
s4.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 4.6, w: 0.06, h: 0.7, fill: { color: C.accent },
});
s4.addText("AI API is the #1 cost driver (65-70% of total). Cost scales linearly with users. Key lever: usage caps, caching, and Haiku for simple tasks can reduce AI costs by 30-40%.", {
  x: 1.1, y: 4.6, w: 7.9, h: 0.7,
  fontSize: 12, fontFace: "Calibri", color: C.darkText, valign: "middle", margin: 0,
});

// ============================================================================
// SLIDE 5: Revenue Models
// ============================================================================
let s5 = pres.addSlide();
s5.background = { color: C.offWhite };

s5.addText("Four Revenue Strategies", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

const models = [
  {
    letter: "A", name: "Freemium", desc: "Free tier + $9.99 Basic + $19.99 Pro",
    detail: "60% free / 25% Basic / 15% Pro", rev500: "$4,998", color: C.accent,
  },
  {
    letter: "B", name: "Subscription", desc: "14-day trial → $9.99 or $19.99/mo",
    detail: "50% convert: 60% Basic, 40% Pro", rev500: "$6,996", color: C.green,
  },
  {
    letter: "C", name: "Pay-per-Use", desc: "Credit packs ($4.99 / $9.99 / $24.99)",
    detail: "Avg: $3-25/mo based on activity", rev500: "$5,100", color: C.orange,
  },
  {
    letter: "D", name: "Free", desc: "No revenue — growth & fundraising",
    detail: "Focus on MAU, engagement, valuation", rev500: "$0", color: C.red,
  },
];

models.forEach((m, i) => {
  const y = 1.3 + i * 1.0;

  // Card background
  s5.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y, w: 8.4, h: 0.85,
    fill: { color: C.white }, shadow: makeShadow(),
  });
  // Left accent
  s5.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y, w: 0.06, h: 0.85, fill: { color: m.color },
  });
  // Letter badge
  s5.addShape(pres.shapes.OVAL, {
    x: 1.1, y: y + 0.175, w: 0.5, h: 0.5, fill: { color: m.color },
  });
  s5.addText(m.letter, {
    x: 1.1, y: y + 0.175, w: 0.5, h: 0.5,
    fontSize: 18, fontFace: "Georgia", bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
  });
  // Name + desc
  s5.addText(m.name, {
    x: 1.85, y: y + 0.08, w: 3, h: 0.35,
    fontSize: 16, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
  });
  s5.addText(m.desc, {
    x: 1.85, y: y + 0.45, w: 3, h: 0.3,
    fontSize: 11, fontFace: "Calibri", color: C.gray, margin: 0,
  });
  // Detail
  s5.addText(m.detail, {
    x: 5.2, y: y + 0.08, w: 2.5, h: 0.35,
    fontSize: 11, fontFace: "Calibri", color: C.darkText, margin: 0,
  });
  // Revenue at 500 users
  s5.addText(m.rev500, {
    x: 7.8, y: y + 0.08, w: 1.2, h: 0.5,
    fontSize: 20, fontFace: "Georgia", bold: true, color: m.color, align: "right", margin: 0,
  });
  s5.addText("@500 users", {
    x: 7.8, y: y + 0.55, w: 1.2, h: 0.25,
    fontSize: 9, fontFace: "Calibri", color: C.gray, align: "right", margin: 0,
  });
});

// Recommendation
s5.addShape(pres.shapes.RECTANGLE, {
  x: 0.8, y: 5.0, w: 8.4, h: 0.45,
  fill: { color: C.darkBlue },
});
s5.addText("Recommendation: Start with Model B (Subscription) — highest ARPU, clearest path to profitability", {
  x: 0.8, y: 5.0, w: 8.4, h: 0.45,
  fontSize: 13, fontFace: "Calibri", bold: true, color: C.gold, align: "center", valign: "middle", margin: 0,
});

// ============================================================================
// SLIDE 6: Profitability Analysis
// ============================================================================
let s6 = pres.addSlide();
s6.background = { color: C.offWhite };

s6.addText("Unit Economics & Break-Even", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

// Chart: Net profit by model at different scales
s6.addChart(pres.charts.BAR, [
  { name: "Freemium", labels: ["50", "100", "500", "1K", "5K"], values: [-3103, -4085, -7924, -17772, -58949] },
  { name: "Subscription", labels: ["50", "100", "500", "1K", "5K"], values: [-2953, -3785, -5926, -14772, -43949] },
  { name: "Pay-per-Use", labels: ["50", "100", "500", "1K", "5K"], values: [-3053, -3985, -7822, -16772, -53949] },
], {
  x: 0.5, y: 1.3, w: 5.5, h: 3.5,
  barDir: "col",
  chartColors: [C.accent, C.green, C.orange],
  showTitle: true,
  title: "Monthly Net Profit/(Loss) by User Scale",
  titleColor: C.darkText,
  titleFontSize: 12,
  catAxisLabelColor: C.gray,
  valAxisLabelColor: C.gray,
  valGridLine: { color: C.lightGray, size: 0.5 },
  catGridLine: { style: "none" },
  showLegend: true,
  legendPos: "b",
  legendFontSize: 10,
  valAxisNumFmt: "$#,##0;($#,##0)",
});

// Break-even callout
s6.addShape(pres.shapes.RECTANGLE, {
  x: 6.3, y: 1.3, w: 3.2, h: 1.5,
  fill: { color: C.white }, shadow: makeShadow(),
});
s6.addShape(pres.shapes.RECTANGLE, {
  x: 6.3, y: 1.3, w: 3.2, h: 0.06, fill: { color: C.green },
});
s6.addText("Break-Even Point", {
  x: 6.5, y: 1.5, w: 2.8, h: 0.35,
  fontSize: 16, fontFace: "Georgia", bold: true, color: C.green, margin: 0,
});
s6.addText([
  { text: "~250-300", options: { fontSize: 28, bold: true, color: C.green, breakLine: true } },
  { text: "paying subscribers needed", options: { fontSize: 12, color: C.gray } },
], { x: 6.5, y: 1.9, w: 2.8, h: 0.8, margin: 0 });

// Key metrics
s6.addShape(pres.shapes.RECTANGLE, {
  x: 6.3, y: 3.0, w: 3.2, h: 1.8,
  fill: { color: C.white }, shadow: makeShadow(),
});
s6.addText("Key Metrics", {
  x: 6.5, y: 3.15, w: 2.8, h: 0.35,
  fontSize: 14, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});
s6.addText([
  { text: "AI cost/user: $3.69-$28.19/mo", options: { breakLine: true, fontSize: 11 } },
  { text: "ARPU (Sub): $13.99/mo", options: { breakLine: true, fontSize: 11 } },
  { text: "Gross margin: -30% to +25%", options: { breakLine: true, fontSize: 11 } },
  { text: "Target: 50% conversion rate", options: { fontSize: 11 } },
], {
  x: 6.5, y: 3.55, w: 2.8, h: 1.1,
  fontFace: "Calibri", color: C.darkText, margin: 0,
});

// ============================================================================
// SLIDE 7: 12-Month Projection
// ============================================================================
let s7 = pres.addSlide();
s7.background = { color: C.offWhite };

s7.addText("12-Month Cash Flow", {
  x: 0.8, y: 0.3, w: 8, h: 0.6,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

s7.addText("Subscription model (B) — 0 to 500 active users, 50% paying conversion", {
  x: 0.8, y: 0.9, w: 8, h: 0.3,
  fontSize: 12, fontFace: "Calibri", color: C.gray, margin: 0,
});

// Cumulative cash flow chart
s7.addChart(pres.charts.LINE, [
  {
    name: "Monthly Revenue",
    labels: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"],
    values: [140, 406, 680, 994, 1326, 1385, 1444, 1505, 1566, 1851, 1918, 1569],
  },
  {
    name: "Monthly Costs",
    labels: ["M1","M2","M3","M4","M5","M6","M7","M8","M9","M10","M11","M12"],
    values: [11504, 3936, 4072, 4225, 3725, 3737, 3622, 3632, 3642, 4165, 4185, 3652],
  },
], {
  x: 0.5, y: 1.5, w: 6.0, h: 3.5,
  lineSize: 3,
  lineSmooth: true,
  chartColors: [C.green, C.red],
  showTitle: false,
  catAxisLabelColor: C.gray,
  valAxisLabelColor: C.gray,
  valGridLine: { color: C.lightGray, size: 0.5 },
  catGridLine: { style: "none" },
  showLegend: true,
  legendPos: "b",
  legendFontSize: 10,
  valAxisNumFmt: "$#,##0",
});

// Summary stats
const stats = [
  { label: "Year 1 Revenue", value: "$14,784", color: C.green },
  { label: "Year 1 Costs", value: "$54,097", color: C.red },
  { label: "Year 1 Net", value: "($39,313)", color: C.red },
  { label: "One-Time Setup", value: "$9,200", color: C.orange },
];
stats.forEach((st, i) => {
  const y = 1.5 + i * 0.85;
  s7.addShape(pres.shapes.RECTANGLE, {
    x: 6.8, y, w: 2.7, h: 0.7,
    fill: { color: C.white }, shadow: makeShadow(),
  });
  s7.addText(st.label, {
    x: 7.0, y: y + 0.05, w: 2.3, h: 0.25,
    fontSize: 10, fontFace: "Calibri", color: C.gray, margin: 0,
  });
  s7.addText(st.value, {
    x: 7.0, y: y + 0.28, w: 2.3, h: 0.35,
    fontSize: 20, fontFace: "Georgia", bold: true, color: st.color, margin: 0,
  });
});

// ============================================================================
// SLIDE 8: Launch Timeline
// ============================================================================
let s8 = pres.addSlide();
s8.background = { color: C.offWhite };

s8.addText("Launch Roadmap", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

const phases = [
  { phase: "Phase 1", weeks: "Weeks 1-2", title: "Pre-Launch", items: "Legal, Landing page,\nSEO, Payments,\nSecurity audit, QA", color: C.accent },
  { phase: "Phase 2", weeks: "Weeks 3-4", title: "Soft Launch", items: "50 beta users,\nFeedback loop,\nContent marketing,\nProduct Hunt prep", color: C.midBlue },
  { phase: "Phase 3", weeks: "Weeks 5-8", title: "Public Launch", items: "PH launch, PR,\nGoogle/Social ads,\nInfluencer outreach,\nYouTube tutorial", color: C.green },
  { phase: "Phase 4", weeks: "Months 3-12", title: "Growth", items: "Retention, Localization,\nTeacher dashboard,\nMobile app,\nEnterprise plan", color: C.orange },
];

phases.forEach((p, i) => {
  const x = 0.5 + i * 2.35;

  // Card
  s8.addShape(pres.shapes.RECTANGLE, {
    x, y: 1.3, w: 2.15, h: 3.8,
    fill: { color: C.white }, shadow: makeShadow(),
  });
  // Top color bar
  s8.addShape(pres.shapes.RECTANGLE, {
    x, y: 1.3, w: 2.15, h: 0.06, fill: { color: p.color },
  });
  // Phase number
  s8.addShape(pres.shapes.OVAL, {
    x: x + 0.7, y: 1.55, w: 0.7, h: 0.7, fill: { color: p.color },
  });
  s8.addText(String(i + 1), {
    x: x + 0.7, y: 1.55, w: 0.7, h: 0.7,
    fontSize: 24, fontFace: "Georgia", bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
  });
  // Title
  s8.addText(p.title, {
    x: x + 0.15, y: 2.4, w: 1.85, h: 0.35,
    fontSize: 15, fontFace: "Georgia", bold: true, color: C.darkText, align: "center", margin: 0,
  });
  // Weeks
  s8.addText(p.weeks, {
    x: x + 0.15, y: 2.75, w: 1.85, h: 0.25,
    fontSize: 10, fontFace: "Calibri", color: C.gray, align: "center", margin: 0,
  });
  // Items
  s8.addText(p.items, {
    x: x + 0.2, y: 3.15, w: 1.75, h: 1.8,
    fontSize: 11, fontFace: "Calibri", color: C.darkText, valign: "top", margin: 0,
  });

  // Arrow between phases
  if (i < 3) {
    s8.addText("\u25B6", {
      x: x + 2.15, y: 2.8, w: 0.2, h: 0.3,
      fontSize: 14, color: C.gray, align: "center", valign: "middle", margin: 0,
    });
  }
});

// ============================================================================
// SLIDE 9: Risk & Mitigation
// ============================================================================
let s9 = pres.addSlide();
s9.background = { color: C.offWhite };

s9.addText("Risks & Mitigation", {
  x: 0.8, y: 0.4, w: 8, h: 0.7,
  fontSize: 36, fontFace: "Georgia", bold: true, color: C.darkText, margin: 0,
});

const risks = [
  { risk: "AI costs exceed budget", level: "HIGH", mitigation: "Usage caps, caching, Haiku for simple tasks", color: C.red },
  { risk: "Low conversion to paid", level: "HIGH", mitigation: "A/B test pricing, strong onboarding, annual discount", color: C.red },
  { risk: "Founder burnout (solo)", level: "HIGH", mitigation: "Hire key contractor early, automate ops", color: C.red },
  { risk: "Claude API outages", level: "MED", mitigation: "Request queuing, graceful degradation, cached fallback", color: C.orange },
  { risk: "Competitor launch", level: "MED", mitigation: "Hebrew+English niche, community moat, fast iteration", color: C.orange },
  { risk: "GDPR compliance gaps", level: "LOW", mitigation: "Legal review, EU data residency, privacy-by-design", color: C.green },
];

risks.forEach((r, i) => {
  const y = 1.2 + i * 0.7;

  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y, w: 8.4, h: 0.6,
    fill: { color: C.white }, shadow: makeShadow(),
  });
  // Level badge
  s9.addShape(pres.shapes.RECTANGLE, {
    x: 0.8, y, w: 0.06, h: 0.6, fill: { color: r.color },
  });
  s9.addText(r.level, {
    x: 1.0, y, w: 0.7, h: 0.6,
    fontSize: 9, fontFace: "Calibri", bold: true, color: C.white, align: "center", valign: "middle", margin: 0,
    fill: { color: r.color },
  });
  s9.addText(r.risk, {
    x: 1.9, y, w: 3.0, h: 0.6,
    fontSize: 13, fontFace: "Calibri", bold: true, color: C.darkText, valign: "middle", margin: 0,
  });
  s9.addText(r.mitigation, {
    x: 5.0, y, w: 4.0, h: 0.6,
    fontSize: 11, fontFace: "Calibri", color: C.gray, valign: "middle", margin: 0,
  });
});

// ============================================================================
// SLIDE 10: The Ask
// ============================================================================
let s10 = pres.addSlide();
s10.background = { color: C.navy };

s10.addShape(pres.shapes.RECTANGLE, {
  x: 0, y: 0, w: 10, h: 0.06, fill: { color: C.accent },
});

s10.addText("The Ask", {
  x: 0.8, y: 0.6, w: 8, h: 0.7,
  fontSize: 40, fontFace: "Georgia", bold: true, color: C.white, margin: 0,
});

// Budget request boxes
const asks = [
  { label: "One-Time Setup", amount: "$9,200", desc: "Legal, design, security, QA, launch PR", color: C.accent },
  { label: "Monthly Runway (6 mo)", amount: "$4,400/mo", desc: "Infrastructure + AI + marketing + contractors", color: C.green },
  { label: "Total Year 1 Budget", amount: "$62,000", desc: "Setup + 12 months operating costs", color: C.gold },
];

asks.forEach((a, i) => {
  const x = 0.6 + i * 3.1;
  s10.addShape(pres.shapes.RECTANGLE, {
    x, y: 1.7, w: 2.8, h: 2.0,
    fill: { color: C.darkBlue },
  });
  s10.addShape(pres.shapes.RECTANGLE, {
    x, y: 1.7, w: 2.8, h: 0.06, fill: { color: a.color },
  });
  s10.addText(a.label, {
    x: x + 0.2, y: 1.85, w: 2.4, h: 0.35,
    fontSize: 13, fontFace: "Calibri", color: C.gray, margin: 0,
  });
  s10.addText(a.amount, {
    x: x + 0.2, y: 2.25, w: 2.4, h: 0.6,
    fontSize: 28, fontFace: "Georgia", bold: true, color: a.color, margin: 0,
  });
  s10.addText(a.desc, {
    x: x + 0.2, y: 2.9, w: 2.4, h: 0.6,
    fontSize: 11, fontFace: "Calibri", color: C.accentLight, margin: 0,
  });
});

// Next steps
s10.addText("Next Steps", {
  x: 0.8, y: 4.0, w: 8, h: 0.5,
  fontSize: 20, fontFace: "Georgia", bold: true, color: C.white, margin: 0,
});

s10.addText([
  { text: "1.  Approve budget and pricing model (Subscription recommended)", options: { breakLine: true, fontSize: 13 } },
  { text: "2.  Kick off Phase 1 pre-launch immediately (Week 1)", options: { breakLine: true, fontSize: 13 } },
  { text: "3.  First 50 beta users within 3 weeks", options: { fontSize: 13 } },
], {
  x: 0.8, y: 4.35, w: 8, h: 0.8,
  fontFace: "Calibri", color: C.accentLight, margin: 0,
});

// ============================================================================
// Generate
// ============================================================================
const outPath = "/Users/curvalux/X+1/docs/budget/X+1_Launch_Presentation.pptx";
pres.writeFile({ fileName: outPath }).then(() => {
  console.log("Saved to " + outPath);
});
