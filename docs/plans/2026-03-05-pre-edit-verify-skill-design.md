# Pre-Edit Verify Skill Design

## Problem

Claude hallucinate wrong types, fields, and interfaces when writing code for NoteSnap. It invents fields that don't exist, uses wrong type names, and guesses import paths instead of reading the actual source.

## Solution

A skill called `pre-edit-verify` that forces Claude to verify proposed code against the actual codebase before every Edit/Write on source files.

## Skill Location

`~/.claude/skills/pre-edit-verify.md`

## Frontmatter

```yaml
---
name: pre-edit-verify
description: Use BEFORE every Edit or Write tool call on project source files. Classifies edit risk level and runs verification against actual codebase to prevent hallucinated types, wrong imports, and incorrect patterns.
---
```

## Trigger

- Before every `Edit` or `Write` tool call on source files (`.ts`, `.tsx`, `.js`, `.jsx`, `.json` in app/, components/, lib/, types/, contexts/)
- NOT triggered for: CLAUDE.md, docs/, plan files, README, config-only files

## 3-Level Smart Gate

### LEVEL 1 — LOW RISK (quick check)

**What**: CSS-only changes, text/copy, comments, i18n strings, simple renaming

**Steps**:
1. Read the file being edited (if not already read this session)
2. Proceed with edit

### LEVEL 2 — MEDIUM RISK (standard check)

**What**: Component logic, hooks, state management, utility functions, test files

**Steps**:
1. Read the file being edited
2. Read any type files for interfaces being used (`types/*.ts`)
3. List every type/interface being referenced in the planned edit
4. Verify each field/property exists in the actual type definition
5. If creating a new function, search `lib/` for existing implementations
6. Proceed with edit

### LEVEL 3 — HIGH RISK (full verification)

**What**: Type definitions, API routes, database queries, Supabase calls, creating new files, modifying imports/exports

**Steps**:
1. Read the file being edited
2. Read ALL relevant type files
3. Read an existing pattern example (another API route, another similar component)
4. List every type, field, import path, and function call in the planned edit
5. Cross-reference each one:
   - Does this type exist? check/fail
   - Does this field exist on this type? check/fail
   - Is this import path correct? check/fail
   - Does this Supabase table/column exist? check/fail
6. If ANY check fails: fix before editing, do NOT proceed
7. Proceed with edit

## Hard Gate

> If you cannot verify a type field or import path exists in the codebase, you MUST NOT use it. Read the actual type file and use only what exists. Creating new types/fields is only allowed when explicitly requested by the user.

## Output Format

Brief verification block before each edit:

```
[PRE-EDIT VERIFY] Level N — path/to/file.ts
  Types checked: TypeName (check N fields match)
  Imports verified: @/types (check), @/lib/supabase/server (check)
  → Proceeding with edit
```

For Level 3:

```
[PRE-EDIT VERIFY] Level 3 — app/api/courses/route.ts
  Types checked:
    Course.id: string check
    Course.user_id: string check
    Course.generation_status: GenerationStatus check
  Supabase: courses table, columns [id, user_id, generation_status] check
  Auth pattern: createClient() → getUser() check
  → Proceeding with edit
```

## Key Implementation Notes

- The skill is "rigid" — follow exactly, don't adapt away the discipline
- Include anti-rationalization section (block thoughts like "this is simple, skip verification")
- Reference the Type File Index from CLAUDE.md so Claude knows where to look
- The skill should remind Claude of the NoteSnap-specific patterns (Supabase clients, streaming routes, etc.)
