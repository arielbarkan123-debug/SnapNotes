# NoteSnap Feature Sprint — Plan Index

## How to Use These Plans

Each plan file is **self-contained** — it has all the context, conventions, code templates, file locations, and testing checklists needed. You can give any single plan file to a Claude session and it will know exactly what to do.

### To start a session on a specific day:
1. Tell Claude: "Read the plan at `.claude/plans/sprint/dayX-name.md` and execute it"
2. Claude will have everything it needs to implement the feature

---

## Plan Files

| File | Feature | Est. Time |
|------|---------|-----------|
| `day0-pre-implementation.md` | Install deps, create migration, verify baseline | 30 min |
| `day1-step-sequence.md` | Step-by-step animated diagram breakdowns | 4-6 hours |
| `day2-explanation-styles.md` | 5 explanation styles (ELI5, Socratic, etc.) | 3-4 hours |
| `day3-formula-scanner.md` | Formula scanner & visual explainer page | 4-5 hours |
| `day4-mistake-patterns.md` | Mistake pattern detector + gap auto-router | 5-6 hours |
| `day5-parent-reports.md` | Parent email reports + exam prediction | 5-6 hours |
| `day6-youtube-cheatsheets.md` | YouTube → Course + AI cheatsheets | 6-7 hours |
| `day7-integration-deploy.md` | Full integration test, polish, deploy | 4-5 hours |

---

## Dependencies

```
Day 0 ──→ Day 1 ──→ Day 2 (uses step sequence from Day 1)
  │         │
  │         └──→ Day 3 (independent)
  │         └──→ Day 4 (independent, uses migration from Day 0)
  │         └──→ Day 5 (uses resend from Day 0, mistake patterns from Day 4)
  │         └──→ Day 6 (uses migration from Day 0)
  │
  └──→ Day 7 (needs ALL days complete)
```

**Days 3, 4, 5, 6 can run in parallel** after Day 1+2 are done.

---

## Quick Start Commands

```bash
# Tell Claude to execute a specific day:
"Read the plan at /Users/curvalux/NoteSnap/.claude/plans/sprint/day0-pre-implementation.md and execute it"

# Or for any day:
"Read the plan at /Users/curvalux/NoteSnap/.claude/plans/sprint/day1-step-sequence.md and execute it"
```

---

## Sprint Summary

- **9 Features** across 7 days
- **30+ new files** created
- **10+ files** modified
- **12 i18n files** (EN + HE)
- **1 Supabase migration** (3 tables/columns)
- **Quality gates**: Zero TS errors, zero build errors, browser-tested, Hebrew + dark mode + mobile
