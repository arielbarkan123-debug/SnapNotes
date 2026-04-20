# Study Plan v2: Calendar + AI Chat System

## Status: Phase 1 starting
## Plan file: /Users/curvalux/.claude/plans/proud-watching-waffle.md

## Summary
Rebuilding study plan from rigid wizard to interactive calendar + AI chat.
- Two-panel layout: calendar (left) + AI chat (right)
- Mobile: tabs ("Calendar" | "AI Assistant")
- Academic events (test/quiz/homework/project) as first-class entities
- AI chat with Claude tool_use for event CRUD + prep schedule generation
- Per-event study plans with cram/spread strategy

## 9 Phases
1. Database + Types (migration + TypeScript)
2. Academic Events API + Event Scheduler
3. Calendar UI (InteractiveCalendar, MonthView, WeekView)
4. Event Detail Panel + Add Event Modal
5. AI Chat API (Claude tool_use)
6. Chat UI components
7. Two-Panel Layout + Mobile Tabs
8. Wire Everything (calendar↔chat sync)
9. i18n + Polish (EN + HE)

## Key Files
- Plan: `/Users/curvalux/.claude/plans/proud-watching-waffle.md`
- New types: `types/academic-events.ts`
- New migration: `supabase/migrations/20260330_academic_events_and_chat.sql`
- Existing scheduler to adapt: `lib/study-plan/scheduler.ts`
- Existing student context: `lib/student-context/index.ts`
