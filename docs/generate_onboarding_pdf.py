#!/usr/bin/env python3
"""Generate professional NoteSnap Developer Onboarding PDF."""

from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, white, black
from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_JUSTIFY
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas
from reportlab.lib import colors
import os

# ── Colors ──
DARK_BG = HexColor("#0F172A")
ACCENT = HexColor("#3B82F6")
ACCENT_DARK = HexColor("#1E40AF")
ACCENT_LIGHT = HexColor("#DBEAFE")
GRAY_50 = HexColor("#F8FAFC")
GRAY_100 = HexColor("#F1F5F9")
GRAY_200 = HexColor("#E2E8F0")
GRAY_300 = HexColor("#CBD5E1")
GRAY_500 = HexColor("#64748B")
GRAY_600 = HexColor("#475569")
GRAY_700 = HexColor("#334155")
GRAY_800 = HexColor("#1E293B")
GRAY_900 = HexColor("#0F172A")
GREEN = HexColor("#10B981")
RED = HexColor("#EF4444")
AMBER = HexColor("#F59E0B")
CODE_BG = HexColor("#1E293B")
CODE_BORDER = HexColor("#334155")
WARNING_BG = HexColor("#FEF3C7")
WARNING_BORDER = HexColor("#F59E0B")
INFO_BG = HexColor("#DBEAFE")
INFO_BORDER = HexColor("#3B82F6")


def build_styles():
    """Create all paragraph styles."""
    styles = getSampleStyleSheet()

    custom = {
        'DocTitle': ParagraphStyle(
            'DocTitle', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=28, leading=34,
            textColor=white, alignment=TA_LEFT,
            spaceAfter=4*mm
        ),
        'DocSubtitle': ParagraphStyle(
            'DocSubtitle', parent=styles['Normal'],
            fontName='Helvetica', fontSize=12, leading=16,
            textColor=HexColor("#94A3B8"), alignment=TA_LEFT,
            spaceAfter=2*mm
        ),
        'DocMeta': ParagraphStyle(
            'DocMeta', parent=styles['Normal'],
            fontName='Courier', fontSize=9, leading=13,
            textColor=HexColor("#64748B"), alignment=TA_LEFT,
        ),
        'SectionTitle': ParagraphStyle(
            'SectionTitle', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=18, leading=24,
            textColor=GRAY_900, spaceBefore=14*mm, spaceAfter=5*mm,
            borderPadding=(0, 0, 2*mm, 0),
        ),
        'SubSection': ParagraphStyle(
            'SubSection', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=13, leading=18,
            textColor=GRAY_800, spaceBefore=7*mm, spaceAfter=3*mm,
        ),
        'Body': ParagraphStyle(
            'Body', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9.5, leading=14,
            textColor=GRAY_700, alignment=TA_JUSTIFY,
            spaceAfter=3*mm,
        ),
        'BodyBold': ParagraphStyle(
            'BodyBold', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=9.5, leading=14,
            textColor=GRAY_800, spaceAfter=2*mm,
        ),
        'Bullet': ParagraphStyle(
            'Bullet', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9.5, leading=14,
            textColor=GRAY_700, leftIndent=12*mm, bulletIndent=5*mm,
            spaceAfter=1.5*mm, bulletFontName='Helvetica',
        ),
        'Code': ParagraphStyle(
            'Code', parent=styles['Normal'],
            fontName='Courier', fontSize=8, leading=11.5,
            textColor=HexColor("#E2E8F0"), backColor=CODE_BG,
            leftIndent=4*mm, rightIndent=4*mm,
            spaceBefore=1*mm, spaceAfter=1*mm,
            borderPadding=(2*mm, 3*mm, 2*mm, 3*mm),
        ),
        'CodeLabel': ParagraphStyle(
            'CodeLabel', parent=styles['Normal'],
            fontName='Courier-Bold', fontSize=7.5, leading=10,
            textColor=ACCENT, spaceBefore=3*mm, spaceAfter=0,
            leftIndent=4*mm,
        ),
        'InlineCode': ParagraphStyle(
            'InlineCode', parent=styles['Normal'],
            fontName='Courier', fontSize=8.5, leading=12,
            textColor=ACCENT_DARK, backColor=ACCENT_LIGHT,
        ),
        'TableHeader': ParagraphStyle(
            'TableHeader', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=8.5, leading=12,
            textColor=white, alignment=TA_LEFT,
        ),
        'TableCell': ParagraphStyle(
            'TableCell', parent=styles['Normal'],
            fontName='Helvetica', fontSize=8.5, leading=12,
            textColor=GRAY_700, alignment=TA_LEFT,
        ),
        'TableCellCode': ParagraphStyle(
            'TableCellCode', parent=styles['Normal'],
            fontName='Courier', fontSize=7.5, leading=11,
            textColor=ACCENT_DARK, alignment=TA_LEFT,
        ),
        'WarningBox': ParagraphStyle(
            'WarningBox', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9, leading=13,
            textColor=GRAY_800, backColor=WARNING_BG,
            borderPadding=(3*mm, 3*mm, 3*mm, 3*mm),
            spaceBefore=3*mm, spaceAfter=3*mm,
        ),
        'InfoBox': ParagraphStyle(
            'InfoBox', parent=styles['Normal'],
            fontName='Helvetica', fontSize=9, leading=13,
            textColor=GRAY_800, backColor=INFO_BG,
            borderPadding=(3*mm, 3*mm, 3*mm, 3*mm),
            spaceBefore=3*mm, spaceAfter=3*mm,
        ),
        'TOCItem': ParagraphStyle(
            'TOCItem', parent=styles['Normal'],
            fontName='Helvetica', fontSize=11, leading=18,
            textColor=GRAY_700, leftIndent=8*mm,
            spaceAfter=1*mm,
        ),
        'FooterText': ParagraphStyle(
            'FooterText', parent=styles['Normal'],
            fontName='Helvetica', fontSize=7, leading=9,
            textColor=GRAY_500, alignment=TA_CENTER,
        ),
        'NumberCircle': ParagraphStyle(
            'NumberCircle', parent=styles['Normal'],
            fontName='Helvetica-Bold', fontSize=10, leading=14,
            textColor=white, alignment=TA_CENTER,
        ),
    }
    return custom


def make_table(headers, rows, col_widths=None):
    """Create a styled table."""
    s = build_styles()
    header_cells = [Paragraph(h, s['TableHeader']) for h in headers]

    data = [header_cells]
    for row in rows:
        data.append([
            Paragraph(str(cell), s['TableCellCode'] if i == 0 else s['TableCell'])
            for i, cell in enumerate(row)
        ])

    page_width = A4[0] - 30*mm
    if col_widths is None:
        n = len(headers)
        col_widths = [page_width / n] * n

    t = Table(data, colWidths=col_widths, repeatRows=1)
    t.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), ACCENT_DARK),
        ('TEXTCOLOR', (0, 0), (-1, 0), white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 9),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 4*mm),
        ('TOPPADDING', (0, 0), (-1, 0), 3*mm),
        ('LEFTPADDING', (0, 0), (-1, -1), 3*mm),
        ('RIGHTPADDING', (0, 0), (-1, -1), 3*mm),
        ('BACKGROUND', (0, 1), (-1, -1), white),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [white, GRAY_50]),
        ('GRID', (0, 0), (-1, -1), 0.5, GRAY_200),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 1), (-1, -1), 2.5*mm),
        ('BOTTOMPADDING', (0, 1), (-1, -1), 2.5*mm),
    ]))
    return t


def code_block(lines, label=None):
    """Create a code block with optional label."""
    s = build_styles()
    elements = []
    if label:
        elements.append(Paragraph(label, s['CodeLabel']))

    # Escape HTML entities and join
    escaped = []
    for line in lines:
        line = line.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
        escaped.append(line)
    code_text = '<br/>'.join(escaped)
    elements.append(Paragraph(code_text, s['Code']))
    return elements


def section_divider():
    return HRFlowable(width="100%", thickness=0.5, color=GRAY_200,
                      spaceBefore=5*mm, spaceAfter=2*mm)


def add_cover_page(c_canvas, doc):
    """Draw the cover page."""
    w, h = A4

    # Full dark background
    c_canvas.setFillColor(DARK_BG)
    c_canvas.rect(0, 0, w, h, fill=1, stroke=0)

    # Accent stripe at top
    c_canvas.setFillColor(ACCENT)
    c_canvas.rect(0, h - 8*mm, w, 8*mm, fill=1, stroke=0)

    # Subtle grid pattern (decorative)
    c_canvas.setStrokeColor(HexColor("#1E293B"))
    c_canvas.setLineWidth(0.3)
    for x in range(0, int(w), 20):
        c_canvas.line(x, 0, x, h - 8*mm)
    for y in range(0, int(h) - int(8*mm), 20):
        c_canvas.line(0, y, w, y)

    # Large accent circle (decorative)
    c_canvas.setFillColor(HexColor("#1E3A5F"))
    c_canvas.circle(w - 60*mm, h - 100*mm, 80*mm, fill=1, stroke=0)
    c_canvas.setFillColor(HexColor("#172554"))
    c_canvas.circle(w - 50*mm, h - 90*mm, 50*mm, fill=1, stroke=0)

    # Title
    c_canvas.setFillColor(white)
    c_canvas.setFont('Helvetica-Bold', 42)
    c_canvas.drawString(25*mm, h - 75*mm, "NoteSnap")

    c_canvas.setFillColor(ACCENT)
    c_canvas.setFont('Helvetica-Bold', 18)
    c_canvas.drawString(25*mm, h - 88*mm, "Developer Onboarding Guide")

    # Subtitle line
    c_canvas.setFillColor(GRAY_500)
    c_canvas.setFont('Helvetica', 11)
    c_canvas.drawString(25*mm, h - 103*mm, "Everything you need to start contributing on day one.")

    # Metadata box
    box_y = h - 160*mm
    c_canvas.setFillColor(HexColor("#1E293B"))
    c_canvas.roundRect(25*mm, box_y, w - 50*mm, 42*mm, 3*mm, fill=1, stroke=0)

    c_canvas.setFillColor(GRAY_500)
    c_canvas.setFont('Helvetica', 9)
    items = [
        ("Last Updated", "March 15, 2026"),
        ("Production", "snap-notes-j68u-three.vercel.app"),
        ("Supabase", "ybgkzqrpfdhyftnbvgox"),
        ("Status", "All tests passing | Zero type errors | Build clean"),
    ]
    for i, (label, value) in enumerate(items):
        y = box_y + 32*mm - i * 9*mm
        c_canvas.setFillColor(GRAY_500)
        c_canvas.setFont('Helvetica', 8)
        c_canvas.drawString(30*mm, y, label.upper())
        c_canvas.setFillColor(white)
        c_canvas.setFont('Courier', 9)
        c_canvas.drawString(70*mm, y, value)

    # Classification
    c_canvas.setFillColor(ACCENT)
    c_canvas.setFont('Helvetica-Bold', 9)
    c_canvas.drawString(25*mm, 25*mm, "CONFIDENTIAL")
    c_canvas.setFillColor(GRAY_500)
    c_canvas.setFont('Helvetica', 9)
    c_canvas.drawString(25*mm, 18*mm, "Internal use only. Do not distribute outside the team.")


def header_footer(c_canvas, doc):
    """Add header/footer to content pages."""
    w, h = A4

    # Header line
    c_canvas.setStrokeColor(GRAY_200)
    c_canvas.setLineWidth(0.5)
    c_canvas.line(15*mm, h - 15*mm, w - 15*mm, h - 15*mm)

    c_canvas.setFillColor(GRAY_500)
    c_canvas.setFont('Helvetica', 7)
    c_canvas.drawString(15*mm, h - 13*mm, "NoteSnap Developer Onboarding Guide")
    c_canvas.drawRightString(w - 15*mm, h - 13*mm, "CONFIDENTIAL")

    # Footer
    c_canvas.setStrokeColor(GRAY_200)
    c_canvas.line(15*mm, 12*mm, w - 15*mm, 12*mm)

    c_canvas.setFillColor(GRAY_500)
    c_canvas.setFont('Helvetica', 7)
    c_canvas.drawString(15*mm, 7*mm, "March 2026")
    c_canvas.drawCentredString(w / 2, 7*mm, f"Page {doc.page}")
    c_canvas.drawRightString(w - 15*mm, 7*mm, "v1.0")


def build_pdf():
    output_path = os.path.join(os.path.dirname(__file__), "NoteSnap_Developer_Onboarding.pdf")

    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        topMargin=22*mm,
        bottomMargin=18*mm,
        leftMargin=15*mm,
        rightMargin=15*mm,
    )

    s = build_styles()
    story = []
    pw = A4[0] - 30*mm  # page width minus margins

    # ═══════════════════════════════════════════════════════════
    # TABLE OF CONTENTS
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("Table of Contents", s['SectionTitle']))
    story.append(Spacer(1, 3*mm))

    toc_items = [
        "1. What Is NoteSnap",
        "2. Quick Start",
        "3. Tech Stack",
        "4. Project Structure",
        "5. Architecture &amp; Patterns",
        "6. Database Schema",
        "7. Feature Flows",
        "8. API Reference",
        "9. Testing",
        "10. Deployment &amp; CI/CD",
        "11. i18n (English + Hebrew)",
        "12. Common Tasks &amp; Recipes",
        "13. Gotchas &amp; Rules",
    ]
    for item in toc_items:
        story.append(Paragraph(item, s['TOCItem']))

    story.append(PageBreak())

    # ═══════════════════════════════════════════════════════════
    # 1. WHAT IS NOTESNAP
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("1. What Is NoteSnap", s['SectionTitle']))

    story.append(Paragraph(
        "NoteSnap is an <b>AI-powered adaptive learning platform</b> for students. "
        "Users photograph their notebooks, upload PDFs/PPTX/DOCX, or paste text "
        "- and the AI generates interactive courses with lessons, flashcards, practice "
        "problems, homework tutoring, exam preparation, and spaced repetition.",
        s['Body']
    ))

    story.append(Paragraph("Core Features", s['SubSection']))

    features = [
        ("<b>Course Generation</b> - Upload images/documents -> AI extracts content -> generates structured lessons",),
        ("<b>Spaced Repetition (SRS)</b> - FSRS algorithm with per-user optimization, 8+ card types",),
        ("<b>Homework Help</b> - Upload a problem -> AI tutor guides step-by-step with diagrams, hints, walkthroughs",),
        ("<b>Practice &amp; Exams</b> - AI-generated practice questions, timed exams, adaptive difficulty",),
        ("<b>Visual Diagrams</b> - 100+ diagram types via Recraft (SVG), TikZ (LaTeX), Desmos, GeoGebra, Mermaid, Recharts",),
        ("<b>Study Plans</b> - AI-generated daily study plans with task tracking",),
        ("<b>Full Bilingual</b> - English + Hebrew with RTL layout support",),
    ]
    for f in features:
        story.append(Paragraph(f[0], s['Bullet'], bulletText=chr(8226)))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 2. QUICK START
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("2. Quick Start", s['SectionTitle']))

    story.append(Paragraph("Prerequisites", s['SubSection']))
    for item in ["Node.js 20+", "npm", "Git"]:
        story.append(Paragraph(item, s['Bullet'], bulletText=chr(8226)))

    story.append(Paragraph("Setup", s['SubSection']))
    story.extend(code_block([
        "# Clone the repo",
        "git clone &lt;repo-url&gt;",
        "cd NoteSnap",
        "",
        "# Install dependencies",
        "npm install",
        "",
        "# Copy environment variables",
        "cp .env.example .env.local",
        "# Fill in your values (see below)",
        "",
        "# Run development server",
        "npm run dev",
        "# -> http://localhost:3000",
    ], label="TERMINAL"))

    story.append(Paragraph("Environment Variables", s['SubSection']))
    story.append(Paragraph(
        "Create <font face='Courier' color='#1E40AF'>.env.local</font> with these values "
        "(get credentials from the team lead):",
        s['Body']
    ))

    env_table = make_table(
        ["Variable", "Required", "Purpose"],
        [
            ["NEXT_PUBLIC_SUPABASE_URL", "Yes", "Supabase project URL"],
            ["NEXT_PUBLIC_SUPABASE_ANON_KEY", "Yes", "Supabase anonymous/public key"],
            ["SUPABASE_SERVICE_ROLE_KEY", "Yes", "Supabase service role (server-side only)"],
            ["ANTHROPIC_API_KEY", "Yes", "Claude AI API key"],
            ["RECRAFT_API_KEY", "No", "SVG diagram generation"],
            ["E2B_API_KEY", "No", "Code execution sandbox"],
            ["E2B_LATEX_TEMPLATE_ID", "No", "Custom E2B template for LaTeX diagrams"],
            ["RESEND_API_KEY", "No", "Transactional emails"],
            ["NEXT_PUBLIC_ADMIN_EMAIL", "No", "Admin email for support"],
            ["ADMIN_SUPPORT_EMAIL", "No", "Admin email (server-side)"],
            ["NEXT_PUBLIC_APP_URL", "No", "Public app URL (defaults localhost:3000)"],
            ["ANTHROPIC_MODEL", "No", "AI model (default: claude-sonnet-4-6)"],
        ],
        col_widths=[pw * 0.40, pw * 0.12, pw * 0.48]
    )
    story.append(env_table)

    story.append(Spacer(1, 4*mm))
    story.append(Paragraph("Verify Your Setup", s['SubSection']))
    story.extend(code_block([
        "npx tsc --noEmit      # TypeScript check (0 errors)",
        "npm test              # All tests should pass",
        "npm run build         # Production build (no errors)",
    ], label="TERMINAL"))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 3. TECH STACK
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("3. Tech Stack", s['SectionTitle']))

    story.append(make_table(
        ["Layer", "Technology", "Version"],
        [
            ["Framework", "Next.js 14 (App Router)", "14.2.35"],
            ["Language", "TypeScript (strict mode)", "5.x"],
            ["Database", "Supabase (PostgreSQL + RLS)", "-"],
            ["Auth", "Supabase Auth (JWT cookies)", "-"],
            ["Storage", "Supabase Storage", "-"],
            ["AI", "Anthropic Claude SDK", "0.71.0"],
            ["CSS", "Tailwind CSS 3.4 + RTL", "3.4.1"],
            ["i18n", "next-intl", "4.7.0"],
            ["Data Fetching", "SWR", "2.3.7"],
            ["Animations", "Framer Motion", "12.26.2"],
            ["Testing", "Jest 30 + React Testing Library", "30.2.0"],
            ["Deployment", "Vercel", "-"],
        ],
        col_widths=[pw * 0.20, pw * 0.50, pw * 0.30]
    ))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 4. PROJECT STRUCTURE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("4. Project Structure", s['SectionTitle']))

    story.extend(code_block([
        "NoteSnap/",
        "|-- app/                          # Next.js App Router",
        "|   |-- (auth)/                   # Public auth pages",
        "|   |-- (main)/                   # Protected pages (require auth)",
        "|   |   |-- dashboard/            # Main dashboard",
        "|   |   |-- courses/              # Course list",
        "|   |   |-- course/[id]/          # Course view + lessons",
        "|   |   |-- homework/             # Homework help",
        "|   |   |-- practice/             # Practice hub",
        "|   |   |-- review/               # SRS flashcard review",
        "|   |   |-- exams/                # Exam list + take exam",
        "|   |   |-- prepare/              # Study guides",
        "|   |   +-- ...                   # settings, profile, etc.",
        "|   +-- api/                      # 130 API routes",
        "|",
        "|-- components/                   # React components",
        "|   |-- ui/                       # Primitives (Button, Input, etc.)",
        "|   |-- diagrams/                 # Diagram renderers",
        "|   |-- math/                     # 100+ math/science SVG components",
        "|   +-- ...                       # 35 total component directories",
        "|",
        "|-- lib/                          # Business logic (47 directories)",
        "|   |-- ai/claude.ts              # Claude API (2400+ lines)",
        "|   |-- supabase/                 # DB clients (server, client)",
        "|   |-- srs/                      # FSRS algorithm",
        "|   |-- homework/                 # Tutor + checker engines",
        "|   |-- diagram-engine/           # Multi-backend rendering",
        "|   |-- errors/                   # Error codes + mappers",
        "|   +-- ...                       # analytics, email, etc.",
        "|",
        "|-- types/                        # 7 type definition files",
        "|-- messages/{en,he}/             # 37 i18n files per language",
        "|-- hooks/                        # 20+ custom React hooks",
        "|-- __tests__/                    # 49 test suites",
        "+-- middleware.ts                 # Auth guard + locale detection",
    ], label="DIRECTORY TREE"))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 5. ARCHITECTURE & PATTERNS
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("5. Architecture &amp; Patterns", s['SectionTitle']))

    story.append(Paragraph("Supabase Clients - The #1 Thing To Get Right", s['SubSection']))

    story.append(Paragraph(
        '<font color="#EF4444"><b>WARNING:</b></font> Getting async/sync wrong will break things silently.',
        s['WarningBox']
    ))

    story.extend(code_block([
        "// Server components &amp; API routes (reads auth cookie, respects RLS):",
        "import { createClient } from '@/lib/supabase/server'",
        "const supabase = await createClient()  // ASYNC - must await",
        "",
        "// Service role (bypasses RLS - admin operations only):",
        "import { createServiceClient } from '@/lib/supabase/server'",
        "const supabase = createServiceClient()  // NOT async - no await",
        "",
        "// Browser / client components:",
        "import { createClient } from '@/lib/supabase/client'",
        "const supabase = createClient()  // NOT async - no await",
    ], label="SUPABASE CLIENTS"))

    story.append(Paragraph("Auth Check in API Routes", s['SubSection']))
    story.append(Paragraph("Every API route starts the same way:", s['Body']))

    story.extend(code_block([
        "export async function POST(request: NextRequest) {",
        "  const supabase = await createClient()",
        "  const { data: { user } } = await supabase.auth.getUser()",
        "",
        "  if (!user) {",
        "    return createErrorResponse(ErrorCodes.UNAUTHORIZED)",
        "  }",
        "  // ... your logic",
        "}",
    ], label="API ROUTE PATTERN"))

    story.append(Paragraph("Streaming API Pattern (Long AI Operations)", s['SubSection']))
    story.extend(code_block([
        "export const maxDuration = 240  // seconds",
        "",
        "export async function POST(request: NextRequest) {",
        "  const stream = new ReadableStream({",
        "    async start(controller) {",
        "      const send = (data) =&gt;",
        "        controller.enqueue(encoder.encode(",
        "          JSON.stringify(data) + '\\n'",
        "        ))",
        "",
        "      // Heartbeat prevents iOS Safari timeout",
        "      const heartbeat = setInterval(() =&gt;",
        "        send({ type: 'heartbeat' }), 2000)",
        "      // ... do work, send progress, cleanup",
        "    }",
        "  })",
        "}",
    ], label="STREAMING PATTERN"))

    story.append(Paragraph("Import Paths", s['SubSection']))
    story.extend(code_block([
        "// Types (all re-exported from types/index.ts)",
        "import { Course, Lesson, Step } from '@/types'",
        "import { ReviewCard, CardType } from '@/types'",
        "",
        "// Errors (preferred - new error system)",
        "import { createErrorResponse, ErrorCodes } from '@/lib/errors'",
        "// Legacy shim (deprecated, ~55 routes still use it):",
        "// import { ... } from '@/lib/api/errors'",
        "",
        "// AI",
        "import { AI_MODEL, getAnthropicClient } from '@/lib/ai/claude'",
    ], label="IMPORT CONVENTIONS"))

    story.append(Paragraph("Error Codes", s['SubSection']))
    story.append(make_table(
        ["Code Name", "Error Code", "HTTP Status"],
        [
            ["UNAUTHORIZED", "NS-AUTH-090", "401"],
            ["RATE_LIMITED", "NS-AI-002", "429"],
            ["INVALID_INPUT", "NS-VAL-014", "400"],
            ["NOT_FOUND", "NS-DB-021", "404"],
            ["DATABASE_ERROR", "NS-DB-001", "500"],
        ],
        col_widths=[pw * 0.35, pw * 0.30, pw * 0.35]
    ))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        '<font color="#3B82F6"><b>NOTE:</b></font> '
        '<font face="Courier" size="8">lib/errors/codes.ts</font> is the source of truth with 100+ granular codes. '
        '<font face="Courier" size="8">lib/api/errors.ts</font> is a legacy compatibility shim. '
        '<b>New code should import from <font face="Courier">@/lib/errors</font>.</b>',
        s['InfoBox']
    ))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 6. DATABASE SCHEMA
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("6. Database Schema", s['SectionTitle']))

    story.append(Paragraph("Core Tables", s['SubSection']))
    story.append(make_table(
        ["Table", "Purpose", "Key Columns"],
        [
            ["courses", "User courses with AI content", "id, user_id, title, generated_course (JSONB)"],
            ["user_progress", "Per-user per-course progress", "user_id, course_id, current_lesson, completed_lessons[]"],
            ["lesson_progress", "Per-lesson mastery metrics", "user_id, course_id, lesson_index, mastery_level"],
        ],
        col_widths=[pw * 0.22, pw * 0.33, pw * 0.45]
    ))

    story.append(Paragraph("Spaced Repetition Tables", s['SubSection']))
    story.append(make_table(
        ["Table", "Purpose", "Key Columns"],
        [
            ["review_cards", "Flashcards with FSRS state", "card_type, front, back, due_date, stability, difficulty"],
            ["review_logs", "Every review event", "card_id, user_id, rating, duration_ms"],
            ["user_srs_settings", "Per-user SRS config", "target_retention, max_new_cards_per_day"],
            ["fsrs_user_parameters", "Optimized FSRS weights", "user_id, w[] (17 parameters)"],
        ],
        col_widths=[pw * 0.25, pw * 0.30, pw * 0.45]
    ))

    story.append(Paragraph("Homework Help Tables", s['SubSection']))
    story.append(make_table(
        ["Table", "Purpose"],
        [
            ["homework_sessions", "Tutor sessions (image or text mode)"],
            ["homework_turns", "Individual tutor messages + diagram data"],
            ["homework_walkthroughs", "Step-by-step solutions with quality scores"],
            ["homework_checks", "Problem analysis results (JSONB)"],
        ],
        col_widths=[pw * 0.35, pw * 0.65]
    ))

    story.append(Paragraph("Other Key Tables", s['SubSection']))
    story.append(make_table(
        ["Table", "Purpose"],
        [
            ["practice_sessions / practice_questions", "Practice session records + generated questions"],
            ["exams / exam_templates", "Generated exams + past exam templates"],
            ["user_learning_profile", "Education level, study system, goals, language"],
            ["concepts / user_concept_mastery", "Knowledge graph + per-concept mastery"],
        ],
        col_widths=[pw * 0.40, pw * 0.60]
    ))

    story.append(Spacer(1, 3*mm))
    story.append(Paragraph(
        '<font color="#EF4444"><b>SECURITY:</b></font> '
        'All tables have Row-Level Security (RLS) policies filtering by <font face="Courier">auth.uid()</font>. '
        'Users can only see their own data. Service role key bypasses RLS for admin operations only.',
        s['WarningBox']
    ))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 7. FEATURE FLOWS
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("7. Feature Flows", s['SectionTitle']))

    story.append(Paragraph("Course Creation Flow", s['SubSection']))
    story.extend(code_block([
        "User uploads image/PDF/PPTX/DOCX/text",
        "    |",
        "    v",
        "/api/upload or /api/upload-document",
        "    |  (store file in Supabase Storage)",
        "    v",
        "/api/generate-course (240s, streaming)",
        "    |  Claude extracts content (OCR/parse)",
        "    |  Claude generates course structure:",
        "    |    - Title &amp; overview",
        "    |    - Lessons with steps",
        "    |    - Learning objectives",
        "    v",
        "Store in courses.generated_course (JSONB)",
        "    |",
        "    v",
        "/api/generate-course/continue (progressive)",
        "    |",
        "    v",
        "/api/srs/cards/generate (auto-create flashcards)",
        "    |",
        "    v",
        "User views at /course/[id]/lesson/[lessonIndex]",
    ], label="COURSE CREATION"))

    story.append(Paragraph("Homework Help Flow", s['SubSection']))
    story.extend(code_block([
        "User uploads problem photo or types question",
        "    |",
        "    v",
        "/api/homework/sessions (POST) -> analyzes question",
        "    |",
        "    v",
        "User opens /homework/[sessionId]",
        "    |",
        "    v",
        "/api/homework/sessions/[id]/chat (POST, 120s)",
        "    |  AI tutor responds with guidance + diagrams",
        "    v",
        "User requests hint -> /api/.../hint (levels 1-3)",
        "    |",
        "    v",
        "User requests walkthrough -> /api/.../walkthrough (240s)",
        "    |  AI generates step-by-step worked solution",
    ], label="HOMEWORK HELP"))

    story.append(Paragraph("SRS Review Flow", s['SubSection']))
    story.extend(code_block([
        "Cards generated from course content",
        "    |",
        "    v",
        "/api/srs/due (GET) -> cards due today",
        "    |",
        "    v",
        "User reviews at /review",
        "User rates: 1=Again, 2=Hard, 3=Good, 4=Easy",
        "    |",
        "    v",
        "/api/srs/review (POST)",
        "    |  FSRS algorithm calculates next review date",
        "    |  Update: stability, difficulty, due_date",
        "    v",
        "/api/srs/optimize -> calibrate per-user FSRS weights",
    ], label="SPACED REPETITION"))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 8. API REFERENCE
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("8. API Reference", s['SectionTitle']))

    story.append(Paragraph("Major Endpoints", s['SubSection']))
    story.append(make_table(
        ["Method", "Endpoint", "Timeout", "Purpose"],
        [
            ["POST", "/api/generate-course", "240s", "Generate course (streaming)"],
            ["POST", "/api/generate-course/continue", "180s", "Continue progressive generation"],
            ["POST", "/api/chat", "90s", "Lesson chat with AI tutor"],
            ["POST", "/api/homework/sessions", "60s", "Create homework session"],
            ["POST", "/api/homework/sessions/[id]/chat", "120s", "Homework tutor chat"],
            ["POST", "/api/homework/sessions/[id]/walkthrough", "240s", "Step-by-step solution"],
            ["POST", "/api/srs/review", "-", "Submit card review (FSRS)"],
            ["GET", "/api/srs/due", "-", "Get cards due today"],
            ["POST", "/api/practice/session", "-", "Create practice session"],
            ["POST", "/api/exams", "180s", "Generate exam from templates"],
            ["POST", "/api/exams/[id]/submit", "120s", "Submit and grade exam"],
            ["POST", "/api/diagram-engine/generate", "120s", "Generate visual diagram"],
            ["POST", "/api/prepare", "240s", "Generate study guide"],
            ["GET", "/api/courses", "-", "List courses (cursor pagination)"],
            ["PATCH", "/api/courses/[id]", "240s", "Add material to course"],
        ],
        col_widths=[pw * 0.10, pw * 0.38, pw * 0.10, pw * 0.42]
    ))

    story.append(Paragraph("Rate Limiting", s['SubSection']))
    story.append(make_table(
        ["Header", "Description"],
        [
            ["X-RateLimit-Limit", "Max requests in window"],
            ["X-RateLimit-Remaining", "Requests remaining"],
            ["X-RateLimit-Reset", "Seconds until window resets (NOT an epoch timestamp)"],
        ],
        col_widths=[pw * 0.35, pw * 0.65]
    ))
    story.append(Spacer(1, 2*mm))
    story.append(Paragraph(
        "When exceeded, returns <font face='Courier'>429</font> with error code "
        "<font face='Courier'>NS-AI-002</font>.",
        s['Body']
    ))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 9. TESTING
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("9. Testing", s['SectionTitle']))

    story.append(Paragraph("Commands", s['SubSection']))
    story.append(make_table(
        ["Command", "Purpose"],
        [
            ["npm test", "Run all tests"],
            ["npx jest __tests__/api/chat.test.ts", "Run specific test file"],
            ["npx jest --verbose", "Verbose output"],
            ["npm run test:coverage", "Run with coverage"],
            ["npm run test:watch", "Watch mode"],
        ],
        col_widths=[pw * 0.50, pw * 0.50]
    ))

    story.append(Paragraph("Test Patterns", s['SubSection']))
    story.extend(code_block([
        "// Mock Supabase",
        "jest.mock('@/lib/supabase/server', () =&gt; ({",
        "  createClient: jest.fn(),",
        "}))",
        "",
        "// Mock Claude",
        "jest.mock('@/lib/ai/claude', () =&gt; ({",
        "  AI_MODEL: 'claude-3-haiku-20240307',",
        "  getAnthropicClient: () =&gt; ({",
        "    messages: { create: mockCreate },",
        "  }),",
        "}))",
        "",
        "// IMPORTANT: reset rate limiter in beforeEach",
        "// jest.clearAllMocks() does NOT reset mockReturnValue",
        "beforeEach(() =&gt; {",
        "  jest.clearAllMocks()",
        "  const { checkRateLimit } = require('@/lib/rate-limit')",
        "  checkRateLimit.mockReturnValue({",
        "    allowed: true, remaining: 10,",
        "    resetAt: Date.now() + 60000",
        "  })",
        "})",
    ], label="TEST MOCK PATTERN"))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 10. DEPLOYMENT
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("10. Deployment &amp; CI/CD", s['SectionTitle']))

    story.append(Paragraph("CI Pipeline (GitHub Actions)", s['SubSection']))
    steps = [
        "<font face='Courier'>npm ci</font> - Install dependencies",
        "<font face='Courier'>npx tsc --noEmit</font> - TypeScript check",
        "<font face='Courier'>npm run lint</font> - ESLint",
        "<font face='Courier'>npm test -- --ci</font> - All tests",
        "<font face='Courier'>npm run build</font> - Production build",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", s['Bullet']))

    story.append(Paragraph("Vercel Configuration", s['SubSection']))
    items = [
        "<b>Auto-deploy</b> on push to main",
        "<b>Preview deployments</b> on PRs",
        "<b>Environment variables</b> set in Vercel dashboard",
        "<b>Serverless timeout:</b> up to 240s (per route via maxDuration)",
        "<b>Cron:</b> /api/cron/aggregate-analytics (daily 02:00 UTC)",
        "<b>Cron:</b> /api/reports/weekly/send-all (Sundays 08:00 UTC)",
    ]
    for item in items:
        story.append(Paragraph(item, s['Bullet'], bulletText=chr(8226)))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 11. I18N
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("11. i18n (English + Hebrew)", s['SectionTitle']))

    story.extend(code_block([
        "// Server component:",
        "import { getLocale, getMessages } from 'next-intl/server'",
        "const locale = await getLocale()",
        "",
        "// Client component:",
        "import { useTranslations } from 'next-intl'",
        "const t = useTranslations('dashboard')",
        "// namespace = filename in messages/en/",
        "",
        "// RTL detection:",
        "import { isRTL } from '@/i18n/config'",
        "const dir = isRTL(locale) ? 'rtl' : 'ltr'",
    ], label="I18N USAGE"))

    story.append(Paragraph("Adding a New Translation Key", s['SubSection']))
    steps = [
        "Add key to <font face='Courier'>messages/en/&lt;namespace&gt;.json</font>",
        "Add Hebrew translation to <font face='Courier'>messages/he/&lt;namespace&gt;.json</font>",
        "Use in component: <font face='Courier'>t('your_new_key')</font>",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", s['Bullet']))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 12. COMMON TASKS
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("12. Common Tasks &amp; Recipes", s['SectionTitle']))

    story.append(Paragraph("Add a New API Route", s['SubSection']))
    story.extend(code_block([
        "import { type NextRequest, NextResponse } from 'next/server'",
        "import { createClient } from '@/lib/supabase/server'",
        "import { createErrorResponse, ErrorCodes } from '@/lib/errors'",
        "",
        "export async function GET(request: NextRequest) {",
        "  const supabase = await createClient()",
        "  const { data: { user } } = await supabase.auth.getUser()",
        "",
        "  if (!user) {",
        "    return createErrorResponse(ErrorCodes.UNAUTHORIZED)",
        "  }",
        "",
        "  // Your logic here",
        "  return NextResponse.json({ success: true, data: result })",
        "}",
    ], label="NEW API ROUTE TEMPLATE"))

    story.append(Paragraph("Add a New Type", s['SubSection']))
    steps = [
        "First check if a similar type already exists in <font face='Courier'>types/</font> - read ALL type files",
        "Add to the appropriate file in <font face='Courier'>types/</font>",
        "If new file, re-export from <font face='Courier'>types/index.ts</font>",
    ]
    for i, step in enumerate(steps, 1):
        story.append(Paragraph(f"{i}. {step}", s['Bullet']))

    story.append(section_divider())

    # ═══════════════════════════════════════════════════════════
    # 13. GOTCHAS & RULES
    # ═══════════════════════════════════════════════════════════
    story.append(Paragraph("13. Gotchas &amp; Rules", s['SectionTitle']))

    story.append(Paragraph("Critical Rules", s['SubSection']))
    rules = [
        "<b>NEVER guess types.</b> Before creating ANY new interface/type, read the relevant file in types/.",
        "<b>NEVER reinvent utilities.</b> Search lib/ first - there are 47 lib directories.",
        "<b>createClient() is async on server, sync on client.</b> Getting this wrong breaks things silently.",
        "<b>createServiceClient() is NOT async.</b> Don't await it.",
        "<b>jest.clearAllMocks() does NOT reset mockReturnValue.</b> Must explicitly re-set in beforeEach.",
        "<b>Supabase mock chains must match the route's call order.</b> If route does .limit().lt(), mock must return builder from .limit().",
        "<b>Rate limiting is in-memory.</b> Resets on server restart.",
        "<b>Streaming responses need heartbeats.</b> iOS Safari closes after ~30s silence. Use 2s interval.",
        "<b>All user data is RLS-protected.</b> Never use createServiceClient() for user-facing queries.",
        "<b>Hebrew RTL affects layout.</b> Test every UI change in both EN and HE mode.",
    ]
    for i, rule in enumerate(rules, 1):
        story.append(Paragraph(f"{i}. {rule}", s['Bullet']))

    story.append(Paragraph("Security Rules", s['SubSection']))
    security = [
        "<b>NEVER commit .env.local</b> - it's gitignored",
        "<b>NEVER hardcode API keys</b> - always use process.env",
        "<b>NEVER commit screenshots</b> - gpai-*.png and production-*.png are gitignored",
        "All API routes validate ANTHROPIC_API_KEY at runtime before calling Claude",
    ]
    for item in security:
        story.append(Paragraph(item, s['Bullet'], bulletText=chr(8226)))

    story.append(Spacer(1, 5*mm))

    # Quick reference card
    story.append(Paragraph("Quick Reference Card", s['SubSection']))
    story.append(make_table(
        ["Task", "Command"],
        [
            ["Dev server", "npm run dev"],
            ["Build", "npm run build"],
            ["Type check", "npx tsc --noEmit"],
            ["Run all tests", "npm test"],
            ["Run one test", "npx jest __tests__/api/chat.test.ts"],
            ["Watch tests", "npm run test:watch"],
            ["Lint", "npm run lint"],
        ],
        col_widths=[pw * 0.30, pw * 0.70]
    ))

    story.append(Spacer(1, 5*mm))
    story.append(make_table(
        ["Question", "Answer"],
        [
            ["Where are types?", "types/ (7 files, re-exported from types/index.ts)"],
            ["Where are API routes?", "app/api/ (130 routes)"],
            ["Where is AI logic?", "lib/ai/claude.ts (2400+ lines)"],
            ["Where are errors?", "lib/errors/codes.ts (source of truth)"],
            ["Where are translations?", "messages/en/ and messages/he/ (37 files each)"],
            ["Where are tests?", "__tests__/ (49 suites, 1000+ tests)"],
            ["Where is the DB schema?", "supabase/migrations/"],
            ["Where is auth middleware?", "middleware.ts + lib/supabase/middleware.ts"],
        ],
        col_widths=[pw * 0.35, pw * 0.65]
    ))

    story.append(Spacer(1, 10*mm))
    story.append(HRFlowable(width="40%", thickness=1, color=ACCENT, spaceBefore=3*mm, spaceAfter=3*mm))
    story.append(Paragraph(
        "Welcome to the team! If this doc doesn't answer your question, "
        "check <font face='Courier'>CLAUDE.md</font> in the project root for additional context.",
        ParagraphStyle('Welcome', parent=s['Body'], alignment=TA_CENTER, textColor=GRAY_500, fontSize=9)
    ))

    # ── Build ──
    doc.build(
        story,
        onFirstPage=add_cover_page,
        onLaterPages=header_footer,
    )

    print(f"PDF generated: {output_path}")
    print(f"Size: {os.path.getsize(output_path) / 1024:.0f} KB")


if __name__ == '__main__':
    build_pdf()
