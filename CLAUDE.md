# NoteSnap Project Instructions

## Important URLs

- **Production App**: https://snap-notes-j68u-three.vercel.app/
- **Supabase Dashboard**: https://supabase.com/dashboard/project/ybgkzqrpfdhyftnbvgox

## Project Overview

NoteSnap is an AI-powered homework checker and learning assistant app built with:
- Next.js 14 (App Router)
- Supabase (Auth, Database)
- Tailwind CSS
- Internationalization (English + Hebrew)

## Key Features

- Homework photo upload and AI checking
- PDF/DOCX document support
- Math visualizations (NumberLine, CoordinatePlane, Triangle, etc.)
- Multi-language support (EN/HE with RTL)

## Email Configuration

Custom SMTP configured with Resend for better email deliverability (especially iOS).

## Work Standards

- **Always finish to the end.** Never stop after implementing a skeleton or partial solution. Every feature must be fully complete, wired up, tested, and deployed before considering it done. If a plan has 6 phases, do all 6. If there are known gaps, fix them in the same session — don't list them as "future work."
- **No shortcuts, no loose ends.** Upload flows must actually upload. Chat history must actually load. PDF export must actually produce a PDF. Heartbeats must actually keep connections alive. If something is listed in the plan, it ships working.
- **Ask specific questions early.** If requirements are ambiguous or a decision is needed, ask immediately with concrete options — don't guess and don't defer. Questions should be specific (e.g., "Should PDF export use @react-pdf/renderer or html-to-pdf?") not vague (e.g., "How should I proceed?").
- **Own the verification.** After implementing, build it, type-check it, and test it in the browser. Deploy if asked. Don't declare done until it actually works end-to-end.
