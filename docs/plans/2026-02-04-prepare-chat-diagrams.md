# Prepare Chat Diagrams Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a "Draw Diagram" quick action button to the Prepare chat sidebar and render AI-generated diagrams inline in chat messages.

**Architecture:** Extend the existing chat sidebar with a 4th quick action button (`action: 'diagram'`) that tells the AI to generate a diagram for the current section. The API already returns `diagram` JSON and stores it in DB — the missing piece is the UI: adding the button, updating the `ChatMessage` interface to carry diagram data, and rendering `InlineDiagram` inside assistant message bubbles.

**Tech Stack:** Tiptap (existing), InlineDiagram + DiagramRenderer (existing), Supabase (existing), next-intl i18n.

---

### Task 1: Add i18n translations for the diagram button

**Files:**
- Modify: `messages/en/prepare.json:53-55`
- Modify: `messages/he/prepare.json:53-55`

**Step 1: Add English translation**

In `messages/en/prepare.json`, add `"drawDiagram": "Draw Diagram"` after `"explainMore"` (line 55) inside the `"chat"` block:

```json
"explainMore": "Explain More",
"drawDiagram": "Draw Diagram",
```

**Step 2: Add Hebrew translation**

In `messages/he/prepare.json`, add `"drawDiagram": "צייר דיאגרמה"` after `"explainMore"` (line 55) inside the `"chat"` block:

```json
"explainMore": "הסבר עוד",
"drawDiagram": "צייר דיאגרמה",
```

**Step 3: Verify**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No new errors.

---

### Task 2: Add `diagram` action to the chat API

**Files:**
- Modify: `app/api/prepare/[id]/chat/route.ts:22-26` (ChatRequest interface)
- Modify: `app/api/prepare/[id]/chat/route.ts:54-57` (system prompt Quick Actions)
- Modify: `app/api/prepare/[id]/chat/route.ts:142-154` (action handling)
- Modify: `app/api/prepare/[id]/chat/route.ts:59-66` (Response Format in system prompt)

**Step 1: Extend the ChatRequest action type**

At line 25, change:
```typescript
action?: 'quiz' | 'practice' | 'explain'
```
to:
```typescript
action?: 'quiz' | 'practice' | 'explain' | 'diagram'
```

**Step 2: Add diagram instruction to system prompt Quick Actions section**

After the `"Explain More"` line in the Quick Actions section of `buildSystemPrompt` (around line 57), add:

```
- "Draw Diagram": Generate a visual diagram that helps explain the concept. Return a diagram object with the appropriate type (physics: fbd, inclined_plane, projectile, pulley, circuit, wave, optics, motion; math: long_division, equation, fraction, number_line, coordinate_plane, triangle, circle, bar_model, area_model; chemistry: atom, molecule, periodic_element, bonding; biology: cell, organelle, dna, process). The diagram object should match the DiagramState schema for that type.
```

**Step 3: Update the Response Format section in the system prompt**

Replace the Response Format section to be more explicit about diagram structure:

```
## Response Format
Return JSON:
{
  "message": "Your response in markdown explaining the diagram",
  "diagram": { "type": "coordinate_plane", "totalSteps": 3, ... } or null
}

When "diagram" action is used, you MUST include a valid diagram object. The diagram must have at minimum: "type" (string), "totalSteps" (number, minimum 1). Include relevant data fields for the chosen diagram type. Return ONLY valid JSON.
```

**Step 4: Add diagram action handling**

After the `else if (action === 'explain')` block (line 153), add:

```typescript
} else if (action === 'diagram') {
  userMessage = sectionRef
    ? `Draw a visual diagram to help explain: ${sectionRef}`
    : 'Draw a visual diagram for the most important concept in this guide'
}
```

**Step 5: Verify**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No new errors.

---

### Task 3: Update ChatMessage interface and rendering in PrepareChatSidebar

**Files:**
- Modify: `components/prepare/PrepareChatSidebar.tsx:1-12` (imports + interface)
- Modify: `components/prepare/PrepareChatSidebar.tsx:37-59` (chat history loading)
- Modify: `components/prepare/PrepareChatSidebar.tsx:67-110` (sendMessage)
- Modify: `components/prepare/PrepareChatSidebar.tsx:136-157` (message rendering)
- Modify: `components/prepare/PrepareChatSidebar.tsx:191-214` (quick action buttons)

**Step 1: Add diagram field to ChatMessage and import InlineDiagram**

Add import at top of file (after line 6):
```typescript
import dynamic from 'next/dynamic'
import type { DiagramState } from '@/components/homework/diagram/types'

const InlineDiagram = dynamic(
  () => import('@/components/homework/diagram/InlineDiagram'),
  { ssr: false }
)
```

Update the `ChatMessage` interface to include optional diagram:
```typescript
interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  diagram?: DiagramState | null
}
```

**Step 2: Load diagram data from chat history**

In the `loadHistory` function, update the `select` query (line 46) to include the `diagram` column:

```typescript
.select('id, role, content, diagram, created_at')
```

And in the `map` callback (lines 52-57), include diagram:
```typescript
data.map((msg) => ({
  id: msg.id,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  diagram: msg.diagram as DiagramState | null,
}))
```

**Step 3: Capture diagram from API response in sendMessage**

In `sendMessage`, update the `sendMessage` action type union (line 67):
```typescript
const sendMessage = useCallback(async (text: string, action?: 'quiz' | 'practice' | 'explain' | 'diagram') => {
```

Update the user message content mapping (lines 71-73) to include diagram:
```typescript
content: action
  ? action === 'quiz' ? t('chat.quizMe')
    : action === 'practice' ? t('chat.practiceQuestions')
    : action === 'explain' ? t('chat.explainMore')
    : t('chat.drawDiagram')
  : text,
```

Update the assistantMessage creation (lines 94-98) to include diagram:
```typescript
const assistantMessage: ChatMessage = {
  id: `assistant-${Date.now()}`,
  role: 'assistant',
  content: data.response?.message || 'Sorry, I could not generate a response.',
  diagram: data.response?.diagram || null,
}
```

**Step 4: Render diagram in assistant message bubbles**

In the message rendering section (lines 148-154), after the `MarkdownWithMath` component for assistant messages, add diagram rendering:

```tsx
{msg.role === 'assistant' ? (
  <>
    <MarkdownWithMath className="prose prose-sm dark:prose-invert max-w-none [&>p]:my-1 [&>ul]:my-1 [&>ol]:my-1">
      {msg.content}
    </MarkdownWithMath>
    {msg.diagram && (
      <InlineDiagram
        diagram={msg.diagram}
        currentStep={0}
        size="compact"
        showExpandButton={true}
      />
    )}
  </>
) : (
  <p>{msg.content}</p>
)}
```

**Step 5: Add the "Draw Diagram" quick action button**

After the "Explain More" button (line 213), add:

```tsx
<button
  onClick={() => sendMessage('', 'diagram')}
  disabled={isLoading}
  className="px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/40 disabled:opacity-50 transition-colors"
>
  {t('chat.drawDiagram')}
</button>
```

**Step 6: Verify**

Run: `npx tsc --noEmit 2>&1 | head -5`
Expected: No new errors.

---

### Task 4: Build, deploy, and verify

**Files:** None (verification only)

**Step 1: Type check**

Run: `npx tsc --noEmit 2>&1 | head -20`
Expected: No new errors (pre-existing FullScreenDiagramView test errors are OK).

**Step 2: Build**

Run: `npx next build 2>&1 | tail -10`
Expected: Build succeeds.

**Step 3: Deploy to Vercel**

Run: `vercel --prod 2>&1 | tail -5`
Expected: Deployment succeeds.

**Step 4: Commit and push**

```bash
git add messages/en/prepare.json messages/he/prepare.json app/api/prepare/[id]/chat/route.ts components/prepare/PrepareChatSidebar.tsx
git commit -m "feat: add Draw Diagram button and inline diagram rendering in Prepare chat"
git push origin main
```

---

## Verification Checklist

- [ ] "Draw Diagram" / "צייר דיאגרמה" button appears in chat sidebar (blue themed)
- [ ] Clicking button sends `action: 'diagram'` to API
- [ ] API generates diagram JSON in response
- [ ] Diagram renders inline in assistant message bubble via `InlineDiagram`
- [ ] Expand button on diagram opens `FullScreenDiagramView`
- [ ] Chat history loads diagrams from DB on page reload
- [ ] `npm run build` passes
- [ ] Works in both EN and HE
