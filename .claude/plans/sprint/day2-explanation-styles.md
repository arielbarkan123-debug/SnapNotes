# Day 2: Multiple Explanation Styles

## Goal
Add a style selector so students choose HOW the tutor explains — Step-by-Step, ELI5, Visual Builder, Worked Example, or Socratic. Each style modifies the AI system prompt and diagram behavior. Persists across sessions.

## Prerequisites
- Day 0 + Day 1 completed
- Step sequence system working (Visual Builder style uses it)
- `npm run build` passes

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **i18n**: `useTranslations('namespace')` → JSON files in `messages/{en,he}/`
- **Components**: `'use client'`, Tailwind with `dark:` classes, Framer Motion animations
- **LocalStorage**: Use for client-side persistence (prefix: `notesnap_`)
- **Tutor Engine**: `lib/homework/tutor-engine.ts` → `generateTutorResponse()` builds system prompt + calls Claude
- **API Routes**: Auth via `createClient()` + `getUser()`, errors via `createErrorResponse()`

### Critical File Locations
- `lib/homework/tutor-engine.ts` — Main tutor response generator (system prompt building)
- `components/homework/TutoringChat.tsx` — Chat UI with message bubbles, input, hint buttons
- `components/practice/WorkTogetherModal.tsx` — Practice mode tutoring (same chat pattern)
- `app/api/homework/sessions/[sessionId]/chat/route.ts` — Homework chat API
- `app/api/practice/tutor/route.ts` — Practice tutor API
- `messages/en/homework.json` + `messages/he/homework.json` — Homework i18n

---

## Implementation Steps

### Step 1: Create `lib/homework/explanation-styles.ts`

```typescript
/**
 * Explanation Style Definitions
 *
 * Each style modifies the tutor's behavior through:
 * - systemPromptModifier: appended to the base system prompt
 * - diagramMode: controls diagram generation behavior
 * - forceLanguageLevel: overrides response complexity
 */

export type ExplanationStyleId =
  | 'step_by_step'
  | 'eli5'
  | 'visual_builder'
  | 'worked_example'
  | 'socratic'

export type DiagramMode = 'single' | 'step_sequence' | 'none'

export interface ExplanationStyle {
  id: ExplanationStyleId
  icon: string
  labelKey: string        // i18n key under 'explanationStyles'
  descriptionKey: string  // i18n key under 'explanationStyles'
  systemPromptModifier: string
  diagramMode: DiagramMode
  forceLanguageLevel?: 'simple' | 'standard' | 'advanced'
}

export const EXPLANATION_STYLES: ExplanationStyle[] = [
  {
    id: 'step_by_step',
    icon: '📋',
    labelKey: 'stepByStep.label',
    descriptionKey: 'stepByStep.description',
    diagramMode: 'single',
    systemPromptModifier: `
EXPLANATION STYLE: Step-by-Step
- Break down the solution into clear numbered steps
- Each step should build logically on the previous one
- Use transitional phrases: "First...", "Next...", "Therefore..."
- Show intermediate calculations clearly
- Conclude with the final answer clearly stated`,
  },
  {
    id: 'eli5',
    icon: '🧒',
    labelKey: 'eli5.label',
    descriptionKey: 'eli5.description',
    diagramMode: 'single',
    forceLanguageLevel: 'simple',
    systemPromptModifier: `
EXPLANATION STYLE: Explain Like I'm 5 (ELI5)
- Use simple, everyday analogies to explain concepts
- Avoid ALL technical jargon — if you must use a term, define it immediately
- Use comparisons to real-world objects the student knows
- Keep sentences short (max 15 words)
- Use concrete examples, not abstract definitions
- Example: "Think of a fraction like cutting a pizza into slices"
- Be enthusiastic and encouraging`,
  },
  {
    id: 'visual_builder',
    icon: '🎨',
    labelKey: 'visualBuilder.label',
    descriptionKey: 'visualBuilder.description',
    diagramMode: 'step_sequence',
    systemPromptModifier: `
EXPLANATION STYLE: Visual Builder
- Every step of the explanation should be accompanied by a visual diagram
- Focus on building up the visual understanding piece by piece
- Describe what the student should see in each diagram
- Use spatial language: "on the left", "above", "next to"
- Connect visual elements to mathematical concepts
- The system will generate a step-by-step diagram sequence automatically`,
  },
  {
    id: 'worked_example',
    icon: '📝',
    labelKey: 'workedExample.label',
    descriptionKey: 'workedExample.description',
    diagramMode: 'single',
    systemPromptModifier: `
EXPLANATION STYLE: Worked Example
- Before solving the student's problem, show 1-2 SIMILAR but DIFFERENT solved examples
- Label them clearly: "Example 1:", "Example 2:"
- Solve each example step by step
- Then say: "Now let's apply the same approach to your problem:"
- Show the parallels between the examples and the student's problem
- This helps the student see the pattern before applying it`,
  },
  {
    id: 'socratic',
    icon: '🤔',
    labelKey: 'socratic.label',
    descriptionKey: 'socratic.description',
    diagramMode: 'none',
    systemPromptModifier: `
EXPLANATION STYLE: Socratic Method
- NEVER give direct answers or solutions
- ONLY ask guiding questions that lead the student to discover the answer
- Start with broad questions, then narrow down based on responses
- If the student is stuck, rephrase or give a simpler guiding question
- Celebrate when the student discovers something: "Exactly! You got it!"
- Example questions: "What do you think would happen if...?", "Can you see a pattern?", "What's the first thing you notice?"
- Maximum 2 questions per response
- Be patient and encouraging`,
  },
]

/**
 * Get a style by ID. Returns step_by_step as default.
 */
export function getExplanationStyle(id?: string): ExplanationStyle {
  if (!id) return EXPLANATION_STYLES[0]
  return EXPLANATION_STYLES.find(s => s.id === id) || EXPLANATION_STYLES[0]
}

/**
 * Get all available style IDs for validation.
 */
export function getValidStyleIds(): string[] {
  return EXPLANATION_STYLES.map(s => s.id)
}
```

### Step 2: Create `components/homework/ExplanationStyleSelector.tsx`

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { useTranslations } from 'next-intl'
import { EXPLANATION_STYLES, type ExplanationStyleId } from '@/lib/homework/explanation-styles'

const STORAGE_KEY = 'notesnap_explanation_style'

interface ExplanationStyleSelectorProps {
  value?: ExplanationStyleId
  onChange: (styleId: ExplanationStyleId) => void
  compact?: boolean
}

function loadSavedStyle(): ExplanationStyleId {
  if (typeof window === 'undefined') return 'step_by_step'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && EXPLANATION_STYLES.some(s => s.id === saved)) {
      return saved as ExplanationStyleId
    }
  } catch {
    // localStorage unavailable
  }
  return 'step_by_step'
}

export default function ExplanationStyleSelector({
  value,
  onChange,
  compact = false,
}: ExplanationStyleSelectorProps) {
  const t = useTranslations('explanationStyles')
  const scrollRef = useRef<HTMLDivElement>(null)
  const [selectedId, setSelectedId] = useState<ExplanationStyleId>(
    value || loadSavedStyle()
  )

  // Sync external value
  useEffect(() => {
    if (value && value !== selectedId) {
      setSelectedId(value)
    }
  }, [value, selectedId])

  // Initialize from localStorage on mount
  useEffect(() => {
    if (!value) {
      const saved = loadSavedStyle()
      setSelectedId(saved)
      onChange(saved)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSelect = (id: ExplanationStyleId) => {
    setSelectedId(id)
    onChange(id)
    try {
      localStorage.setItem(STORAGE_KEY, id)
    } catch {
      // localStorage unavailable
    }
  }

  return (
    <div className="w-full">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 px-1">
        {t('selectorLabel')}
      </p>
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide snap-x snap-mandatory"
        role="radiogroup"
        aria-label={t('selectorLabel')}
      >
        {EXPLANATION_STYLES.map((style) => {
          const isActive = selectedId === style.id
          return (
            <button
              key={style.id}
              onClick={() => handleSelect(style.id)}
              role="radio"
              aria-checked={isActive}
              className={`
                relative flex-shrink-0 snap-start rounded-xl border-2 transition-all duration-200
                ${compact ? 'px-3 py-2' : 'px-4 py-3 min-w-[140px]'}
                ${isActive
                  ? 'border-violet-600 bg-violet-50 dark:bg-violet-900/20 shadow-sm'
                  : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-gray-300 dark:hover:border-gray-600'
                }
              `}
            >
              {isActive && (
                <motion.div
                  layoutId="style-indicator"
                  className="absolute inset-0 rounded-xl border-2 border-violet-600"
                  transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                />
              )}
              <div className="relative flex items-center gap-2">
                <span className="text-lg">{style.icon}</span>
                <div className={`text-start ${compact ? '' : ''}`}>
                  <p className={`text-sm font-medium ${isActive ? 'text-violet-700 dark:text-violet-300' : 'text-gray-700 dark:text-gray-300'}`}>
                    {t(style.labelKey)}
                  </p>
                  {!compact && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {t(style.descriptionKey)}
                    </p>
                  )}
                </div>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
```

### Step 3: Modify `lib/homework/tutor-engine.ts`

Find `generateTutorResponse()` and make these changes:

1. **Add import at top:**
```typescript
import { getExplanationStyle, type ExplanationStyleId, type DiagramMode } from '@/lib/homework/explanation-styles'
```

2. **Add `explanationStyle` parameter** to the function signature (or the context/options object it accepts):
```typescript
// If it takes an options object, add:
explanationStyle?: ExplanationStyleId

// If it takes individual params, add as a new param:
explanationStyle?: string
```

3. **Modify system prompt building** — find where the system prompt is constructed and append the style modifier:
```typescript
const style = getExplanationStyle(explanationStyle)

// Append to system prompt:
let systemPrompt = existingSystemPrompt
if (style.systemPromptModifier) {
  systemPrompt += '\n\n' + style.systemPromptModifier
}

// If style forces simple language:
if (style.forceLanguageLevel === 'simple') {
  systemPrompt += '\n\nIMPORTANT: Use only simple vocabulary suitable for a young learner. No jargon.'
}
```

4. **Modify diagram behavior** based on style's `diagramMode`:
```typescript
const diagramMode = style.diagramMode

// When deciding whether to generate diagrams:
if (diagramMode === 'none') {
  // Skip all diagram generation (Socratic mode)
  // Don't call tryEngineDiagram or generateStepSequence
} else if (diagramMode === 'step_sequence') {
  // Force step sequence (Visual Builder mode)
  // Always use generateStepSequence() instead of tryEngineDiagram()
} else {
  // Default 'single' mode — use existing logic
  // (tryEngineDiagram for concepts, generateStepSequence for multi-step)
}
```

### Step 4: Modify `components/homework/TutoringChat.tsx`

1. **Add imports:**
```typescript
import ExplanationStyleSelector from './ExplanationStyleSelector'
import type { ExplanationStyleId } from '@/lib/homework/explanation-styles'
```

2. **Add state:**
```typescript
const [explanationStyle, setExplanationStyle] = useState<ExplanationStyleId>('step_by_step')
```

3. **Add selector above the chat input area** (find the input/textarea section):
```tsx
{/* Before the text input */}
<div className="px-4 py-2 border-t border-gray-100 dark:border-gray-700">
  <ExplanationStyleSelector
    value={explanationStyle}
    onChange={setExplanationStyle}
    compact
  />
</div>
```

4. **Pass style to API** — find where `onSendMessage` is called or where the API fetch happens, and include the style:
```typescript
// In the fetch call body, add:
explanationStyle: explanationStyle,
```

### Step 5: Modify Chat API Route

**File**: `app/api/homework/sessions/[sessionId]/chat/route.ts`

1. **Accept the style parameter** from request body:
```typescript
const { message, explanationStyle } = await request.json()
```

2. **Pass it to the tutor engine:**
```typescript
const response = await generateTutorResponse({
  // ... existing params
  explanationStyle,
})
```

### Step 6: Modify Practice Tutor API

**File**: `app/api/practice/tutor/route.ts`

Same changes as Step 5:
1. Accept `explanationStyle` from request body
2. Pass it to the tutor response generator

### Step 7: Modify `components/practice/WorkTogetherModal.tsx`

Add the same selector as in TutoringChat:
1. Import `ExplanationStyleSelector` and `ExplanationStyleId`
2. Add state for `explanationStyle`
3. Add selector UI
4. Pass style in API calls

### Step 8: Update i18n Files

**Add to `messages/en/homework.json`** (merge with existing):
```json
{
  "explanationStyles": {
    "selectorLabel": "Explanation Style",
    "stepByStep": {
      "label": "Step by Step",
      "description": "Clear numbered steps"
    },
    "eli5": {
      "label": "ELI5",
      "description": "Simple analogies, no jargon"
    },
    "visualBuilder": {
      "label": "Visual Builder",
      "description": "Every step with a diagram"
    },
    "workedExample": {
      "label": "Worked Example",
      "description": "Learn from solved examples first"
    },
    "socratic": {
      "label": "Socratic",
      "description": "Guided questions only"
    }
  }
}
```

**Add to `messages/he/homework.json`** (merge with existing):
```json
{
  "explanationStyles": {
    "selectorLabel": "סגנון הסבר",
    "stepByStep": {
      "label": "צעד אחר צעד",
      "description": "צעדים ממוספרים וברורים"
    },
    "eli5": {
      "label": "תסביר לי בפשטות",
      "description": "אנלוגיות פשוטות, בלי מונחים מקצועיים"
    },
    "visualBuilder": {
      "label": "בנייה ויזואלית",
      "description": "כל שלב עם תרשים"
    },
    "workedExample": {
      "label": "דוגמה פתורה",
      "description": "ללמוד מדוגמאות פתורות קודם"
    },
    "socratic": {
      "label": "שיטת סוקרטס",
      "description": "רק שאלות מנחות"
    }
  }
}
```

**IMPORTANT**: Check if `explanationStyles` should be a top-level key or nested under an existing key. If `homework.json` already has a flat structure, keep it consistent. The translations should be accessible via `useTranslations('explanationStyles')` — this may require creating a SEPARATE i18n namespace file `messages/en/explanationStyles.json` and registering it in `messages/en/index.ts`. Check the existing pattern.

If separate namespace files are used:
- Create `messages/en/explanationStyles.json` and `messages/he/explanationStyles.json`
- Add `import explanationStyles from './explanationStyles.json'` to both `messages/en/index.ts` and `messages/he/index.ts`
- Add `explanationStyles` to the messages object export

---

## Testing Checklist

```bash
npx tsc --noEmit   # Zero errors
npm test            # All pass
npm run build       # Clean
```

### Browser Testing
1. **Start dev**: `npm run dev`
2. **Homework chat**: Open a tutoring session
3. **Selector visible**: Style selector should appear above/near the chat input
4. **Default**: "Step by Step" should be selected by default
5. **Each style test**:
   - **Step by Step**: Response has numbered steps
   - **ELI5**: Response uses simple language, analogies
   - **Visual Builder**: Response triggers step sequence diagrams (multi-step)
   - **Worked Example**: Response shows 1-2 similar examples before solving
   - **Socratic**: Response ONLY asks questions, never gives answers
6. **Persistence**: Select "ELI5", refresh page → still "ELI5" selected
7. **Practice modal**: Open practice → "Work Together" → selector is there too
8. **Hebrew**: Switch to Hebrew → labels are in Hebrew, RTL scroll works
9. **Dark mode**: All selector cards have dark variants
10. **Mobile 375px**: Cards scroll horizontally, no overflow

---

## Files Created
- `lib/homework/explanation-styles.ts`
- `components/homework/ExplanationStyleSelector.tsx`
- `messages/en/explanationStyles.json` (or merged into homework.json)
- `messages/he/explanationStyles.json` (or merged into homework.json)

## Files Modified
- `lib/homework/tutor-engine.ts` (accept style, modify prompt + diagram mode)
- `components/homework/TutoringChat.tsx` (add selector, pass style)
- `components/practice/WorkTogetherModal.tsx` (add selector, pass style)
- `app/api/homework/sessions/[sessionId]/chat/route.ts` (accept + pass style)
- `app/api/practice/tutor/route.ts` (accept + pass style)
- `messages/en/index.ts` (register new namespace if separate file)
- `messages/he/index.ts` (register new namespace if separate file)

## What's Next
Day 3: Formula Scanner & Visual Explainer (`day3-formula-scanner.md`)
