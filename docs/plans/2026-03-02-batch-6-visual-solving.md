# Batch 6: Visual Solving Alongside Chat -- Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a persistent diagram panel alongside the homework tutoring chat that updates in sync with each tutoring step, using Desmos (algebra/functions), GeoGebra (geometry), Recharts (statistics), or existing TikZ engine (physics).

**Architecture:** Split-panel layout (60/40 desktop, stacked mobile). AI tutor responses include `visualUpdate` field. Frontend accumulates visual updates and renders via embedded tools. Step controls let user scrub through visual history.

**Tech Stack:** Next.js 14, Desmos API, GeoGebra API, Recharts, TypeScript, Tailwind CSS, Framer Motion

**NOTE:** This feature is intentionally last. It depends on DesmosRenderer and GeoGebraRenderer from Batch 4.

---

## Context: Existing Architecture

The tutoring system lives in these files:

- **`components/homework/TutoringChat.tsx`** (480 lines) -- main chat component with message bubbles, hint buttons, progress bar, input area. Currently renders inline diagrams via `InlineDiagram` component.
- **`app/api/homework/sessions/[sessionId]/chat/route.ts`** (307 lines) -- POST endpoint for chat messages. Calls `generateTutorResponse()`, adds messages to conversation, handles solution detection.
- **`lib/homework/tutor-engine.ts`** (949+ lines) -- `generateTutorResponse()` with Socratic tutor system prompt. Already generates `diagram` field in responses (`TutorDiagramState`).
- **`lib/homework/types.ts`** -- defines `ConversationMessage` (with `diagram?: TutorDiagramState`), `TutorResponse`, `TutorDiagramState` (type, data, visibleStep, totalSteps, evolutionMode, stepConfig, enableInteractive).
- **`app/(main)/homework/[sessionId]/page.tsx`** (929 lines) -- session page that renders `TutoringChat`, handles message sending, hint requests, completion.
- **`components/homework/diagram/`** -- InlineDiagram, DiagramRenderer, EngineDiagramImage, StepSequencePlayer.

Key existing types:

```typescript
interface TutorDiagramState {
  type: 'fbd' | 'inclined_plane' | 'long_division' | 'coordinate_plane' | ... | 'engine_image' | 'step_sequence'
  data: Record<string, unknown>
  visibleStep: number
  totalSteps?: number
  evolutionMode?: 'manual' | 'auto-advance'
  stepConfig?: Array<{ step: number; stepLabel?: string; ... }>
  enableInteractive?: boolean
}

interface ConversationMessage {
  role: 'tutor' | 'student'
  content: string
  diagram?: TutorDiagramState
  ...
}
```

From Batch 4, we have:
- `components/diagrams/DesmosRenderer.tsx` -- Desmos graph embed
- `components/diagrams/GeoGebraRenderer.tsx` -- GeoGebra geometry embed
- `components/diagrams/RechartsRenderer.tsx` -- statistical charts
- `lib/diagram-engine/desmos-adapter.ts` -- converts diagram JSON to Desmos props
- `lib/diagram-engine/geogebra-adapter.ts` -- converts diagram JSON to GeoGebra props
- `lib/diagram-engine/router.ts` -- `getHybridPipeline()`, `HybridPipeline` type

---

## Data Flow

```
Student sends message
    |
    v
POST /api/homework/sessions/{id}/chat
    |
    v
generateTutorResponse() returns:
  { message, diagram, visualUpdate? }   <-- NEW: visualUpdate field
    |
    v
Frontend accumulates visualUpdates in state
    |
    v
VisualSolvingPanel renders current visual state:
  - Desmos for math graphing (coordinate_plane, function_graph, quadratic, etc.)
  - GeoGebra for geometry (triangle, circle, transformation, etc.)
  - Recharts for statistics (box_plot, histogram, etc.)
  - Existing SVG diagrams for physics/elementary math
    |
    v
Step controls: [<< Prev] Step 3/7 [Next >>]
User can scrub through visual history
```

---

## Task 1: Define VisualUpdate type

**File:** `/Users/curvalux/NoteSnap/lib/homework/types.ts`

Add new types for the visual update system. Add these after the existing `TutorDiagramState` interface:

```typescript
/**
 * Visual update sent alongside each tutor message.
 * The frontend accumulates these to build the current visual state.
 */
export interface VisualUpdate {
  /** Which rendering tool to use */
  tool: 'desmos' | 'geogebra' | 'recharts' | 'svg' | 'engine_image'
  /** Action: add new elements, replace all, or clear */
  action: 'add' | 'replace' | 'clear'
  /** Step number (1-indexed) for this visual state */
  stepNumber: number
  /** Label for this step */
  stepLabel: string
  /** Hebrew label */
  stepLabelHe?: string
  /** Desmos expressions (when tool = 'desmos') */
  desmosExpressions?: Array<{
    id?: string
    latex: string
    color?: string
    label?: string
    hidden?: boolean
  }>
  /** Desmos axis configuration */
  desmosConfig?: {
    xRange?: [number, number]
    yRange?: [number, number]
    showGrid?: boolean
  }
  /** GeoGebra commands (when tool = 'geogebra') */
  geogebraCommands?: Array<{
    command: string
    label?: string
    color?: string
    showLabel?: boolean
  }>
  /** Recharts data (when tool = 'recharts') */
  rechartsData?: {
    chartType: 'bar' | 'histogram' | 'pie' | 'line' | 'scatter' | 'box_plot'
    data?: Array<{ name: string; value: number; value2?: number; color?: string }>
    boxPlotData?: Array<{ name: string; min: number; q1: number; median: number; q3: number; max: number; outliers?: number[] }>
    xLabel?: string
    yLabel?: string
  }
  /** SVG diagram state (when tool = 'svg', reuses existing TutorDiagramState) */
  svgDiagram?: TutorDiagramState
  /** Title for the visual panel */
  title?: string
  /** Title in Hebrew */
  titleHe?: string
}
```

Also add `visualUpdate` to the `TutorResponse` interface:

```typescript
export interface TutorResponse {
  message: string
  pedagogicalIntent: PedagogicalIntent
  detectedUnderstanding: boolean
  detectedMisconception: string | null
  suggestedNextAction: string
  estimatedProgress: number
  shouldEndSession: boolean
  celebrationMessage?: string
  diagram?: TutorDiagramState
  /** Visual update for the persistent diagram panel (Batch 6) */
  visualUpdate?: VisualUpdate
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 2: Create VisualSolvingPanel component

**New file:** `/Users/curvalux/NoteSnap/components/homework/VisualSolvingPanel.tsx`

This is the persistent diagram panel that sits alongside the chat.

```typescript
'use client'

import { useState, useMemo, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronLeft, ChevronRight, Maximize2, Minimize2, X } from 'lucide-react'
import { useTranslations, useLocale } from 'next-intl'
import dynamic from 'next/dynamic'
import type { VisualUpdate } from '@/lib/homework/types'
import type { DesmosExpression } from '@/components/diagrams/DesmosRenderer'

// Lazy-load heavy renderers
const DesmosRenderer = dynamic(() => import('@/components/diagrams/DesmosRenderer'), {
  ssr: false,
  loading: () => <PanelLoadingFallback />,
})
const GeoGebraRenderer = dynamic(() => import('@/components/diagrams/GeoGebraRenderer'), {
  ssr: false,
  loading: () => <PanelLoadingFallback />,
})
const RechartsRenderer = dynamic(() => import('@/components/diagrams/RechartsRenderer'), {
  ssr: false,
  loading: () => <PanelLoadingFallback />,
})

// Lazy-load existing diagram renderer for SVG diagrams
const DiagramRenderer = dynamic(() => import('@/components/homework/diagram/DiagramRenderer').then(mod => ({ default: mod.default })), {
  ssr: false,
  loading: () => <PanelLoadingFallback />,
})

// --- Types ---

interface VisualSolvingPanelProps {
  /** All visual updates from the conversation so far */
  visualUpdates: VisualUpdate[]
  /** Whether the panel is visible */
  isOpen: boolean
  /** Close the panel */
  onClose: () => void
  /** Dark mode */
  darkMode?: boolean
}

// --- Loading Fallback ---

function PanelLoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full min-h-[200px]">
      <div className="flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-gray-500 dark:text-gray-400">Loading...</span>
      </div>
    </div>
  )
}

// --- Component ---

export default function VisualSolvingPanel({
  visualUpdates,
  isOpen,
  onClose,
  darkMode = false,
}: VisualSolvingPanelProps) {
  const t = useTranslations('chat')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [currentStep, setCurrentStep] = useState(0)
  const [isFullScreen, setIsFullScreen] = useState(false)

  // Auto-advance to latest step when new updates arrive
  const totalSteps = visualUpdates.length
  const effectiveStep = Math.min(currentStep, totalSteps - 1)

  // Keep in sync with latest update
  useMemo(() => {
    if (totalSteps > 0 && currentStep < totalSteps - 1) {
      setCurrentStep(totalSteps - 1)
    }
  }, [totalSteps, currentStep])

  const currentUpdate = totalSteps > 0 ? visualUpdates[effectiveStep] : null

  // Build accumulated Desmos expressions (for 'add' actions)
  const accumulatedDesmosExpressions = useMemo((): DesmosExpression[] => {
    if (!currentUpdate || currentUpdate.tool !== 'desmos') return []

    const expressions: DesmosExpression[] = []

    // Accumulate all 'add' actions up to current step
    for (let i = 0; i <= effectiveStep; i++) {
      const update = visualUpdates[i]
      if (update.tool !== 'desmos') continue

      if (update.action === 'replace' || update.action === 'clear') {
        expressions.length = 0 // Clear accumulated
      }

      if (update.action !== 'clear' && update.desmosExpressions) {
        update.desmosExpressions.forEach((expr, j) => {
          expressions.push({
            id: expr.id || `step${i}-expr${j}`,
            latex: expr.latex,
            color: expr.color || '#6366f1',
            label: expr.label,
            showLabel: !!expr.label,
            hidden: expr.hidden,
          })
        })
      }
    }

    return expressions
  }, [visualUpdates, effectiveStep, currentUpdate])

  // Get the latest Desmos config
  const latestDesmosConfig = useMemo(() => {
    for (let i = effectiveStep; i >= 0; i--) {
      if (visualUpdates[i]?.desmosConfig) {
        return visualUpdates[i].desmosConfig!
      }
    }
    return { xRange: [-10, 10] as [number, number], yRange: [-10, 10] as [number, number], showGrid: true }
  }, [visualUpdates, effectiveStep])

  // Navigation
  const goToPrev = useCallback(() => {
    setCurrentStep((prev) => Math.max(0, prev - 1))
  }, [])

  const goToNext = useCallback(() => {
    setCurrentStep((prev) => Math.min(totalSteps - 1, prev + 1))
  }, [totalSteps])

  if (!isOpen || totalSteps === 0) return null

  const stepLabel = currentUpdate
    ? (isHe ? currentUpdate.stepLabelHe || currentUpdate.stepLabel : currentUpdate.stepLabel)
    : ''
  const panelTitle = currentUpdate
    ? (isHe ? currentUpdate.titleHe || currentUpdate.title : currentUpdate.title)
    : ''

  const panelClasses = isFullScreen
    ? 'fixed inset-0 z-50 bg-white dark:bg-gray-900'
    : 'relative'

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, x: isHe ? -20 : 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: isHe ? -20 : 20 }}
        className={`${panelClasses} flex flex-col`}
      >
        {/* Panel Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
              {panelTitle || t('visualPanel')}
            </span>
            {currentUpdate?.tool && (
              <span className="px-2 py-0.5 text-xs font-medium bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 rounded-full">
                {currentUpdate.tool === 'desmos' ? 'Graph' :
                 currentUpdate.tool === 'geogebra' ? 'Geometry' :
                 currentUpdate.tool === 'recharts' ? 'Chart' : 'Diagram'}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title={isFullScreen ? 'Exit full screen' : 'Full screen'}
            >
              {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Close panel"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Diagram Area */}
        <div className="flex-1 overflow-auto p-4">
          {currentUpdate?.tool === 'desmos' && (
            <DesmosRenderer
              expressions={accumulatedDesmosExpressions}
              xRange={latestDesmosConfig.xRange}
              yRange={latestDesmosConfig.yRange}
              showGrid={latestDesmosConfig.showGrid ?? true}
              height={isFullScreen ? 600 : 350}
              interactive
              darkMode={darkMode}
            />
          )}

          {currentUpdate?.tool === 'geogebra' && currentUpdate.geogebraCommands && (
            <GeoGebraRenderer
              commands={currentUpdate.geogebraCommands.map((cmd) => ({
                command: cmd.command,
                label: cmd.label,
                color: cmd.color,
                showLabel: cmd.showLabel,
              }))}
              height={isFullScreen ? 600 : 350}
              interactive
              showGrid
              showAxes
            />
          )}

          {currentUpdate?.tool === 'recharts' && currentUpdate.rechartsData && (
            <RechartsRenderer
              chartType={currentUpdate.rechartsData.chartType}
              data={currentUpdate.rechartsData.data}
              boxPlotData={currentUpdate.rechartsData.boxPlotData}
              xLabel={currentUpdate.rechartsData.xLabel}
              yLabel={currentUpdate.rechartsData.yLabel}
              height={isFullScreen ? 500 : 300}
              darkMode={darkMode}
            />
          )}

          {currentUpdate?.tool === 'svg' && currentUpdate.svgDiagram && (
            <DiagramRenderer
              diagram={{
                type: currentUpdate.svgDiagram.type,
                data: currentUpdate.svgDiagram.data,
                visibleStep: currentUpdate.svgDiagram.visibleStep,
                totalSteps: currentUpdate.svgDiagram.totalSteps || 1,
              }}
            />
          )}

          {currentUpdate?.tool === 'engine_image' && currentUpdate.svgDiagram?.data?.imageUrl && (
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentUpdate.svgDiagram.data.imageUrl as string}
                alt={panelTitle || 'Diagram'}
                className="w-full h-auto"
              />
            </div>
          )}
        </div>

        {/* Step Controls */}
        <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={goToPrev}
            disabled={effectiveStep <= 0}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <div className="text-center">
            <p className="text-xs font-medium text-gray-700 dark:text-gray-300">
              {t('visualStep', { current: effectiveStep + 1, total: totalSteps })}
            </p>
            {stepLabel && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 max-w-[200px] truncate">
                {stepLabel}
              </p>
            )}
          </div>

          <button
            onClick={goToNext}
            disabled={effectiveStep >= totalSteps - 1}
            className="p-2 rounded-lg text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 3: Update TutoringChat with split-panel layout

**File:** `/Users/curvalux/NoteSnap/components/homework/TutoringChat.tsx`

Modifications:

1. Import `VisualSolvingPanel` and `VisualUpdate`
2. Add state: `visualUpdates: VisualUpdate[]`, `isVisualPanelOpen: boolean`
3. Extract visual updates from conversation messages
4. Render split layout when visual panel is open

**Add imports:**

```typescript
import dynamic from 'next/dynamic'
import type { VisualUpdate } from '@/lib/homework/types'

const VisualSolvingPanel = dynamic(() => import('./VisualSolvingPanel'), {
  ssr: false,
})
```

**Add state** inside the component:

```typescript
const [isVisualPanelOpen, setIsVisualPanelOpen] = useState(false)
```

**Extract visual updates** from conversation:

```typescript
// Extract visual updates from conversation messages
const visualUpdates = useMemo<VisualUpdate[]>(() => {
  const updates: VisualUpdate[] = []
  session.conversation.forEach((msg) => {
    if (msg.role === 'tutor' && msg.visualUpdate) {
      updates.push(msg.visualUpdate)
    }
  })
  return updates
}, [session.conversation])

// Auto-open panel when first visual update arrives
useEffect(() => {
  if (visualUpdates.length > 0 && !isVisualPanelOpen) {
    setIsVisualPanelOpen(true)
  }
}, [visualUpdates.length, isVisualPanelOpen])
```

Note: `msg.visualUpdate` does not exist on `ConversationMessage` yet. We need to add it in Task 1 (types) and Task 5 (API).

**Update the return JSX** to wrap in split layout:

Replace the existing outer `<div>` structure. The key change: when `isVisualPanelOpen` is true AND we're on desktop (>768px), split the layout 60/40. On mobile, stack vertically with collapsible diagram on top.

```tsx
return (
  <div className="flex h-full bg-gray-50 dark:bg-gray-900">
    {/* Main Chat Area */}
    <div className={`flex flex-col ${isVisualPanelOpen ? 'w-full md:w-[60%]' : 'w-full'}`}>
      {/* ... existing chat UI (diagram toggle, progress, messages, hints, input) ... */}
    </div>

    {/* Visual Solving Panel (desktop: side panel, mobile: hidden -- uses full-screen mode) */}
    {isVisualPanelOpen && visualUpdates.length > 0 && (
      <div className="hidden md:flex md:w-[40%] border-s border-gray-200 dark:border-gray-700">
        <VisualSolvingPanel
          visualUpdates={visualUpdates}
          isOpen={isVisualPanelOpen}
          onClose={() => setIsVisualPanelOpen(false)}
          darkMode={false}
        />
      </div>
    )}

    {/* Mobile: Floating button to open visual panel */}
    {visualUpdates.length > 0 && !isVisualPanelOpen && (
      <button
        onClick={() => setIsVisualPanelOpen(true)}
        className="md:hidden fixed bottom-24 end-4 z-40 p-3 bg-violet-600 text-white rounded-full shadow-lg hover:bg-violet-700 transition-colors"
        title="Show diagram"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
        </svg>
      </button>
    )}

    {/* Mobile: Full-screen visual panel overlay */}
    {visualUpdates.length > 0 && isVisualPanelOpen && (
      <div className="md:hidden fixed inset-0 z-50">
        <VisualSolvingPanel
          visualUpdates={visualUpdates}
          isOpen={isVisualPanelOpen}
          onClose={() => setIsVisualPanelOpen(false)}
          darkMode={false}
        />
      </div>
    )}
  </div>
)
```

**Verify:** `npx tsc --noEmit`

---

## Task 4: Add visualUpdate to ConversationMessage

**File:** `/Users/curvalux/NoteSnap/lib/homework/types.ts`

Add `visualUpdate` to `ConversationMessage`:

```typescript
export interface ConversationMessage {
  role: MessageRole
  content: string
  timestamp: string
  hintLevel?: HintLevel
  pedagogicalIntent?: PedagogicalIntent
  referencedConcept?: string
  showsUnderstanding?: boolean
  misconceptionDetected?: string
  /** Physics diagram state for this message (tutor messages only) */
  diagram?: TutorDiagramState
  /** Visual update for persistent diagram panel (Batch 6) */
  visualUpdate?: VisualUpdate
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 5: Update tutor-engine.ts to generate visual updates

**File:** `/Users/curvalux/NoteSnap/lib/homework/tutor-engine.ts`

This is the most critical change. The AI system prompt already generates `diagram` data. We need to add a post-processing step that converts certain diagram types into `visualUpdate` format for the panel.

Add a new function after the existing `generateTutorResponse`:

```typescript
import { getHybridPipeline } from '@/lib/diagram-engine/router'
import { adaptToDesmosProps } from '@/lib/diagram-engine/desmos-adapter'
import { adaptToGeoGebraProps } from '@/lib/diagram-engine/geogebra-adapter'
import type { VisualUpdate } from './types'

/**
 * Convert a TutorDiagramState to a VisualUpdate for the persistent panel.
 * Returns null if the diagram type is not suitable for the visual panel
 * (e.g., engine_image, step_sequence, elementary math SVGs).
 */
function diagramToVisualUpdate(
  diagram: TutorDiagramState,
  stepNumber: number,
): VisualUpdate | null {
  const hybridPipeline = getHybridPipeline(diagram.type)

  if (hybridPipeline === 'desmos') {
    const desmosProps = adaptToDesmosProps(diagram.type, diagram.data)
    if (!desmosProps) return null

    return {
      tool: 'desmos',
      action: 'replace',
      stepNumber,
      stepLabel: diagram.stepConfig?.[diagram.visibleStep]?.stepLabel || `Step ${stepNumber}`,
      stepLabelHe: diagram.stepConfig?.[diagram.visibleStep]?.stepLabelHe,
      desmosExpressions: desmosProps.expressions,
      desmosConfig: {
        xRange: desmosProps.xRange,
        yRange: desmosProps.yRange,
        showGrid: true,
      },
      title: desmosProps.title,
    }
  }

  if (hybridPipeline === 'geogebra') {
    const geogebraProps = adaptToGeoGebraProps(diagram.type, diagram.data)
    if (!geogebraProps) return null

    return {
      tool: 'geogebra',
      action: 'replace',
      stepNumber,
      stepLabel: diagram.stepConfig?.[diagram.visibleStep]?.stepLabel || `Step ${stepNumber}`,
      stepLabelHe: diagram.stepConfig?.[diagram.visibleStep]?.stepLabelHe,
      geogebraCommands: geogebraProps.commands,
      title: geogebraProps.title,
    }
  }

  if (hybridPipeline === 'recharts') {
    // The diagram data structure varies -- extract what we can
    const chartTypeMap: Record<string, string> = {
      'box_plot': 'box_plot',
      'histogram': 'histogram',
      'dot_plot': 'scatter',
      'bar_chart': 'bar',
      'pie_chart': 'pie',
      'line_chart': 'line',
      'stem_leaf_plot': 'bar',
      'frequency_table': 'bar',
    }

    return {
      tool: 'recharts',
      action: 'replace',
      stepNumber,
      stepLabel: diagram.stepConfig?.[diagram.visibleStep]?.stepLabel || `Step ${stepNumber}`,
      rechartsData: {
        chartType: (chartTypeMap[diagram.type] || 'bar') as VisualUpdate['rechartsData'] extends undefined ? never : NonNullable<VisualUpdate['rechartsData']>['chartType'],
        data: Array.isArray(diagram.data.data)
          ? (diagram.data.data as Array<{ name: string; value: number }>)
          : undefined,
        boxPlotData: Array.isArray(diagram.data.boxPlotData)
          ? (diagram.data.boxPlotData as Array<{ name: string; min: number; q1: number; median: number; q3: number; max: number }>)
          : undefined,
        xLabel: diagram.data.xLabel as string | undefined,
        yLabel: diagram.data.yLabel as string | undefined,
      },
      title: diagram.data.title as string | undefined,
    }
  }

  // For non-hybrid diagrams, wrap the existing SVG diagram
  if (diagram.type !== 'engine_image' && diagram.type !== 'step_sequence') {
    return {
      tool: 'svg',
      action: 'replace',
      stepNumber,
      stepLabel: diagram.stepConfig?.[diagram.visibleStep]?.stepLabel || `Step ${stepNumber}`,
      stepLabelHe: diagram.stepConfig?.[diagram.visibleStep]?.stepLabelHe,
      svgDiagram: diagram,
      title: diagram.data.title as string | undefined,
    }
  }

  return null
}
```

Then, in the existing `generateTutorResponse` function, after the diagram is parsed from the AI response, add:

```typescript
// Convert diagram to visual update for persistent panel
if (tutorResult.diagram) {
  const stepNumber = context.session.conversation.filter(m => m.role === 'tutor').length + 1
  const visualUpdate = diagramToVisualUpdate(tutorResult.diagram, stepNumber)
  if (visualUpdate) {
    tutorResult.visualUpdate = visualUpdate
  }
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 6: Update chat API route to pass visualUpdate

**File:** `/Users/curvalux/NoteSnap/app/api/homework/sessions/[sessionId]/chat/route.ts`

In the section where the tutor message is constructed (around line 181), add the `visualUpdate` field:

```typescript
const tutorMessage: ConversationMessage = {
  role: 'tutor',
  content: tutorResponse.message,
  timestamp: new Date().toISOString(),
  pedagogicalIntent: tutorResponse.pedagogicalIntent,
  showsUnderstanding: tutorResponse.detectedUnderstanding,
  misconceptionDetected: tutorResponse.detectedMisconception || undefined,
  diagram: tutorResponse.diagram,
  visualUpdate: tutorResponse.visualUpdate,  // <-- NEW
}
```

No other changes needed in the API route -- the `visualUpdate` is just passed through to the conversation and returned to the frontend.

**Verify:** `npx tsc --noEmit`

---

## Task 7: Add i18n keys

**File:** `/Users/curvalux/NoteSnap/messages/en/chat.json`

Add these keys (merge into existing):

```json
{
  "visualPanel": "Visual Solving",
  "visualStep": "Step {current} of {total}",
  "showDiagram": "Show diagram",
  "hideDiagram": "Hide diagram",
  "fullScreen": "Full screen",
  "exitFullScreen": "Exit full screen"
}
```

**File:** `/Users/curvalux/NoteSnap/messages/he/chat.json`

Add these keys (merge into existing):

```json
{
  "visualPanel": "פתרון ויזואלי",
  "visualStep": "שלב {current} מתוך {total}",
  "showDiagram": "הצג תרשים",
  "hideDiagram": "הסתר תרשים",
  "fullScreen": "מסך מלא",
  "exitFullScreen": "צא ממסך מלא"
}
```

**Verify:** Both files are valid JSON.

---

## Task 8: Create DesmosEmbed wrapper for tutoring context

**New file:** `/Users/curvalux/NoteSnap/components/homework/DesmosEmbed.tsx`

A thin wrapper around DesmosRenderer specifically for the tutoring context. Adds step-aware expression highlighting and "current step" indicator.

```typescript
'use client'

import dynamic from 'next/dynamic'
import type { DesmosExpression } from '@/components/diagrams/DesmosRenderer'

const DesmosRenderer = dynamic(() => import('@/components/diagrams/DesmosRenderer'), {
  ssr: false,
})

interface DesmosEmbedProps {
  expressions: DesmosExpression[]
  xRange?: [number, number]
  yRange?: [number, number]
  title?: string
  height?: number
  darkMode?: boolean
  /** Which expression IDs were added in the current step (for highlighting) */
  newExpressionIds?: string[]
}

export default function DesmosEmbed({
  expressions,
  xRange = [-10, 10],
  yRange = [-10, 10],
  title,
  height = 350,
  darkMode = false,
  newExpressionIds = [],
}: DesmosEmbedProps) {
  // Highlight new expressions by making them thicker
  const highlightedExpressions = expressions.map((expr) => ({
    ...expr,
    lineWidth: newExpressionIds.includes(expr.id || '') ? 4 : (expr.lineWidth || 2.5),
  }))

  return (
    <DesmosRenderer
      expressions={highlightedExpressions}
      xRange={xRange}
      yRange={yRange}
      title={title}
      height={height}
      interactive
      showGrid
      showAxisNumbers
      darkMode={darkMode}
    />
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 9: Create GeoGebraEmbed wrapper for tutoring context

**New file:** `/Users/curvalux/NoteSnap/components/homework/GeoGebraEmbed.tsx`

```typescript
'use client'

import dynamic from 'next/dynamic'
import type { GeoGebraCommand } from '@/components/diagrams/GeoGebraRenderer'

const GeoGebraRenderer = dynamic(() => import('@/components/diagrams/GeoGebraRenderer'), {
  ssr: false,
})

interface GeoGebraEmbedProps {
  commands: GeoGebraCommand[]
  title?: string
  height?: number
  xRange?: [number, number]
  yRange?: [number, number]
}

export default function GeoGebraEmbed({
  commands,
  title,
  height = 350,
  xRange,
  yRange,
}: GeoGebraEmbedProps) {
  return (
    <GeoGebraRenderer
      commands={commands}
      title={title}
      height={height}
      interactive
      showGrid
      showAxes
      xRange={xRange}
      yRange={yRange}
    />
  )
}
```

**Verify:** `npx tsc --noEmit`

---

## Task 10: Type check + build

```bash
cd /Users/curvalux/NoteSnap && npx tsc --noEmit
```

Common issues:
1. `VisualUpdate` type may need to be imported in various files
2. `visualUpdate` field on `ConversationMessage` is optional, so existing code won't break
3. The `useMemo` in VisualSolvingPanel that auto-advances step may trigger lint warnings about dependencies -- ensure the dependency array is correct
4. `DiagramRenderer` dynamic import needs to match the actual export from the module

After type check:

```bash
cd /Users/curvalux/NoteSnap && npm run build
```

---

## Task 11: Commit

```bash
cd /Users/curvalux/NoteSnap && git add -A && git commit -m "feat: visual solving panel -- persistent diagram alongside tutoring chat

- Add VisualSolvingPanel with Desmos/GeoGebra/Recharts/SVG rendering
- Add VisualUpdate type for step-by-step visual state tracking
- Add diagramToVisualUpdate converter in tutor-engine.ts
- Update TutoringChat with 60/40 split layout (desktop) and full-screen overlay (mobile)
- Add DesmosEmbed and GeoGebraEmbed tutoring-context wrappers
- Wire visualUpdate through chat API route and ConversationMessage type
- Add i18n keys for EN and HE"
```

---

## Summary

| # | Task | Files | Est. |
|---|------|-------|------|
| 1 | Define VisualUpdate type | `lib/homework/types.ts` | 3 min |
| 2 | Create VisualSolvingPanel | `components/homework/VisualSolvingPanel.tsx` (NEW) | 5 min |
| 3 | Update TutoringChat layout | `components/homework/TutoringChat.tsx` | 5 min |
| 4 | Add visualUpdate to ConversationMessage | `lib/homework/types.ts` | 2 min |
| 5 | Update tutor-engine.ts | `lib/homework/tutor-engine.ts` | 5 min |
| 6 | Update chat API route | `app/api/homework/sessions/[sessionId]/chat/route.ts` | 2 min |
| 7 | Add i18n keys | `messages/{en,he}/chat.json` | 2 min |
| 8 | DesmosEmbed wrapper | `components/homework/DesmosEmbed.tsx` (NEW) | 3 min |
| 9 | GeoGebraEmbed wrapper | `components/homework/GeoGebraEmbed.tsx` (NEW) | 3 min |
| 10 | Type check + build | -- | 3 min |
| 11 | Commit | -- | 1 min |
| **Total** | | **3 new + 5 modified** | **~34 min** |

---

## Dependencies

- **Batch 4 (required):** DesmosRenderer, GeoGebraRenderer, RechartsRenderer, `getHybridPipeline()`, `adaptToDesmosProps()`, `adaptToGeoGebraProps()` must all exist before this batch can be implemented.
- **Batch 5 (independent):** Formula Scanner solve feature is independent and can be done in parallel.

---

## Layout Specifications

### Desktop (>768px)
```
+---------------------------------------------+-----------------------------+
|                                             |                             |
|           Chat (60%)                         |    Visual Panel (40%)       |
|                                             |                             |
|  [Progress Bar]                             |  [Title: Graph of y=x^2]   |
|  [Messages]                                 |                             |
|  [Hint Buttons]                             |  [Desmos/GeoGebra/Chart]   |
|  [Input]                                    |                             |
|                                             |  [<< Step 3/7 >>]          |
+---------------------------------------------+-----------------------------+
```

### Mobile (<768px)
```
+---------------------------+
| [Chat fills full width]   |
|                           |
| [Messages]                |
| [Hints]                   |
| [Input]                   |
|                           |
|    [Floating diagram btn] |
+---------------------------+

When button tapped:
+---------------------------+
| [Full-screen diagram]     |
| [Title]                   |
| [Desmos/GeoGebra/Chart]  |
| [<< Step 3/7 >>]         |
| [Close button]            |
+---------------------------+
```

### Panel Visibility Rules
- Panel only appears when `visualUpdates.length > 0`
- Auto-opens on first visual update
- User can close and reopen
- Step controls let user scrub through visual history
- Full-screen toggle available on both desktop and mobile
