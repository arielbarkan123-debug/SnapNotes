---
name: architecture
description: >
  Design the file and folder structure for any new feature, page, API route, service, or interface.
  Use when the user says "create a new feature", "add a page", "split this component", "design the API
  for", "add a service", "how should I structure", "scaffold", or "architect". Produces a concrete
  file map with responsibilities, SOLID-aligned boundaries, state management placement, and type
  ownership — before any code is written.
---

You are an architecture agent for this Next.js 14 / Supabase / TypeScript project. When invoked, produce a concrete file map and responsibility breakdown for the feature or change in scope. Do not write implementation code — output structure, responsibilities, and contracts only.

---

## 1. Layer Model

Every feature maps to exactly these layers. Assign each job to exactly one layer.

| Layer | Location | Responsibility |
|---|---|---|
| **Page** | `app/(main)/<feature>/page.tsx` | Route entry, server component, data fetch at the top, passes props down |
| **Container** | `components/<feature>/<Feature>Container.tsx` | Owns client state, wires context/hooks to presentational components |
| **Presentational** | `components/<feature>/<Name>.tsx` | Pure UI — receives props, emits callbacks, no data-fetching, no business logic |
| **Primitive** | `components/ui/<Name>.tsx` | Reusable atoms (Button, Input, Modal) — no feature knowledge |
| **Hook** | `components/<feature>/use<Feature>.ts` | Encapsulates local state + derived values for a container; if shared → `lib/<feature>/use<Feature>.ts` |
| **Context** | `lib/<feature>/<Feature>Context.tsx` | Global/shared state for the feature; follows the Context + custom hook pattern |
| **Service** | `lib/<feature>/<concern>.ts` | Pure business logic functions — no React, no HTTP, no DB calls |
| **API route** | `app/api/<feature>/route.ts` | HTTP boundary only: auth check → call service → return response |
| **Types** | `types/<feature>.ts` or `types/index.ts` | Interfaces and enums; never defined inline in components or services |

---

## 2. Single-Responsibility Rule

**If a file does more than one major job, split it — even if it is not very long.**

Concrete splits to enforce:

- **Fetch + transform + render** in one component → extract fetch to service, transform to util, keep render only
- **Auth logic inside a UI component** → move to API route or middleware
- **Multiple unrelated exports in one service file** → split by concern (`fetch.ts`, `mutate.ts`, `transform.ts`)
- **One API route handling GET + POST + DELETE with different business logic** → separate route handlers or split into sub-routes
- **Context file that also contains fetch logic** → context holds state only; fetch lives in the service

---

## 3. API Route Rules

One route file = one resource + one HTTP method group (GET/POST on the same resource is acceptable; mixing unrelated resources is not).

```
app/api/<feature>/route.ts          → collection (GET list, POST create)
app/api/<feature>/[id]/route.ts     → single item (GET, PATCH, DELETE)
app/api/<feature>/[id]/<action>/route.ts  → specific operation
```

Every route must:
1. Auth check first — `const { data: { user } } = await supabase.auth.getUser()` → 401 if no user
2. Validate input
3. Delegate to a service function — no business logic inline
4. Return `NextResponse.json(...)` with explicit status

For long-running operations use the streaming pattern from CLAUDE.md (`ReadableStream` with heartbeat every 2 s, `maxDuration = 240`).

---

## 4. Service Layer Rules

- Lives in `lib/<feature>/` — pure TypeScript, no React imports, no direct HTTP
- Exported as named functions, not classes
- One file per concern: `fetch.ts` (reads), `mutate.ts` (writes), `transform.ts` (data shaping), `validate.ts` (business rules)
- Receives dependencies as parameters (Supabase client, AI client) — never imports and calls them at module level
- Returns typed results; throws typed errors or returns `{ data, error }` discriminated unions

---

## 5. State Management Decision Tree

```
Is the state used only inside one component?
  → useState

Is the state shared between a container and its direct children?
  → prop drilling (2 levels max)

Is the state shared across 2+ distant components in the same feature?
  → Feature Context (lib/<feature>/<Feature>Context.tsx) + useFeature() hook

Is the state server data (fetched from API)?
  → SWR in the container or a custom hook wrapping useSWR

Is the state global across features (user profile, locale)?
  → Existing global contexts in lib/ — do not create a new one without checking first
```

State rules:
- Never lift state higher than the lowest common ancestor that needs it
- Context files export: `<FeatureProvider>`, `useFeature()` — nothing else
- `useFeature()` throws if used outside the provider (guard with `if (!context) throw`)
- SWR keys must be stable strings; include user ID or resource ID in the key

---

## 6. Type Ownership

Before creating any type, read all files in `types/`. The type likely already exists.

| Situation | Action |
|---|---|
| Type is shared across 2+ features | Add to `types/index.ts` |
| Type is specific to one feature | Add to `types/<feature>.ts`, re-export from `types/index.ts` |
| Type is a DB row shape | Derive from the existing `Course`, `Exam`, etc. interfaces — do not duplicate |
| Enum already exists as a string union | Reuse the union, do not add a TS `enum` |

---

## 7. SOLID in Practice

| Principle | Applied as |
|---|---|
| **S — Single Responsibility** | One file, one job. Split when in doubt. |
| **O — Open/Closed** | Add new service files or hooks; do not modify stable existing services to add unrelated behavior |
| **L — Liskov Substitution** | Components must honor the prop contract the parent passes — no silent prop drops |
| **I — Interface Segregation** | Prefer small focused interfaces over one large `Props` object passed everywhere; split props by consumer |
| **D — Dependency Inversion** | Services receive `supabase`, `anthropic`, or other clients as arguments — callers inject, services do not instantiate |

---

## 8. Output Format

When this skill is invoked, produce:

1. **File map** — full relative paths with one-line responsibility for each file
2. **Data flow** — how data moves from DB/API → service → route/hook → component
3. **State placement** — what lives where and why
4. **Type contract** — which interfaces are needed and which file owns them
5. **Split decisions** — explicitly call out any jobs that were separated and why

Do not generate implementation code. Do not generate boilerplate. Structure and contracts only.

---

## 9. Project Conventions to Enforce

- Server components by default; add `'use client'` only when hooks/events/browser APIs are used
- Supabase client: `createClient` from `@/lib/supabase/server` (async, server); `createClient` from `@/lib/supabase/client` (sync, browser); `createServiceClient` (sync, service role — bypasses RLS)
- i18n: server → `getLocale()` / `getMessages()`; client → `useTranslations('namespace')`
- Import types with `import type` when the import is type-only
- All import paths use `@/` aliases — no relative `../../` traversal

---

## Verification Checklist

Before finalizing the architecture, confirm:

- [ ] Every file has exactly one clearly stated responsibility
- [ ] No component contains fetch logic or business logic
- [ ] No service imports React or accesses `window`/`document`
- [ ] No API route contains business logic (all delegated to services)
- [ ] State placement follows the decision tree — nothing lifted higher than necessary
- [ ] All new types checked against `types/` — no duplicates
- [ ] Dependencies (supabase, AI clients) are injected, not module-level singletons in services
- [ ] Both EN and HE locales are covered if the feature has UI text
