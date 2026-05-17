---
name: Refactor Code
description: Cleans up a file or set of files by replacing inline SVGs with lucide-react, fixing TypeScript issues, removing dead code, and enforcing Next.js/TypeScript practical guidelines. Does NOT rewrite logic.
---

You are a focused refactor agent. When invoked, apply the rules below to the target file(s). Do not rewrite logic, add abstractions, or change data-fetching patterns unless the file is explicitly in scope.

## Rules

### 1. Replace inline SVGs with lucide-react

`lucide-react` is already installed (`^0.562.0`).

- Find every `<svg>...</svg>` block used as an icon (not data visualizations or complex illustrations).
- Identify the icon by its path data and map it to the closest lucide-react icon name.
- Replace with the lucide-react component:
  ```tsx
  // Before
  import { ArrowRight } from 'lucide-react'
  // After usage
  <ArrowRight className="w-5 h-5 ltr:ml-2 rtl:mr-2 rtl:rotate-180" />
  ```
- Preserve all `className` props — sizing (`w-5 h-5`), color (`text-white`), RTL (`ltr:ml-2 rtl:mr-2 rtl:rotate-180`), etc.
- If the path doesn't map exactly to a lucide icon, pick the closest match and add a brief comment: `{/* closest match: ArrowRight */}`
- Add the import at the top with other lucide imports (group them in one import statement).

### 2. TypeScript strictness

- Replace `any` with a proper interface, the actual type, or `unknown`.
- Remove non-null assertions (`!`) where unnecessary — use optional chaining (`?.`) or explicit `if` guards instead. Keep `!` only when TypeScript genuinely cannot infer and there is a real invariant.
- Add explicit return types to exported functions and components (`export function Foo(): JSX.Element`, `export async function handler(): Promise<NextResponse>`).

### 3. Next.js patterns

- Remove `'use client'` from components that contain no hooks, no event handlers, and no browser APIs — they should be server components.
- Add `'use client'` where React hooks (`useState`, `useEffect`, `useContext`, etc.) are used but the directive is missing.
- Change type-only imports to `import type`:
  ```ts
  // Before
  import { Course } from '@/types'
  // After (if Course is only used as a type)
  import type { Course } from '@/types'
  ```

### 4. Remove dead code

- Delete commented-out code blocks (not explanatory comments — actual `// <SomeComponent ... />` commented JSX or logic).
- Remove unused imports (`import X from 'y'` where `X` is never referenced).
- Remove unused variables and state (`const [x, setX] = useState(...)` where neither `x` nor `setX` is used).

### 5. Console statements

- Remove `console.log` and `console.warn` from production component/page/API files.
- Keep `console.error` only inside `catch` blocks or error boundaries.
- Leave console statements in test files and scripts untouched.

### 6. Comments

- Keep `// ===...===` banner/section-divider comments — they are intentional and help scan large files.
- Remove inline comments that only restate what the code already says (e.g. `// increment counter` above `count++`).
- Keep comments that explain a non-obvious WHY: a hidden constraint, a workaround, a subtle invariant.

## What NOT to do

- Do not rewrite working logic or restructure component trees.
- Do not introduce new abstractions or helper functions not requested.
- Do not change data-fetching patterns (e.g. `fetch` → SWR) unless explicitly asked.
- Do not rename variables or functions that are already clear.
- Do not touch `__tests__/`, `e2e/`, or `.test.ts` files unless they are the explicit target.

## Verification (run after changes)

1. `npx tsc --noEmit` — confirm zero new type errors.
2. Visually verify every replaced SVG maps to a lucide icon that actually exists in v0.562.0.
3. Confirm the dev server still compiles cleanly.
