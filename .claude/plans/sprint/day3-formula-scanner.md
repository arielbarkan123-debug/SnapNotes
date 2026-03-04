# Day 3: Formula Scanner & Visual Explainer

## Goal
Create a standalone page where students upload an image of a formula OR type LaTeX text → get a beautiful annotated visual breakdown explaining every symbol, its meaning, units, derivation, related formulas, and a practice question.

## Prerequisites
- Day 0-2 completed, `npm run build` passes
- KaTeX already installed (`katex`, `react-katex` in package.json)
- Claude Vision available for image analysis

---

## Project Context & Conventions

**NoteSnap** is a Next.js 14 (App Router) homework assistant with Supabase, Tailwind, next-intl (EN+HE), dark mode.

### Key Conventions
- **Page Pattern**: Server component (`page.tsx`) handles auth → passes data to client component (`Content.tsx`)
- **API Routes**: `createClient()` + `getUser()` for auth, `createErrorResponse(ErrorCodes.X)` for errors, `AI_MODEL` for Claude
- **i18n**: `useTranslations('namespace')` + separate JSON files registered in `messages/{en,he}/index.ts`
- **Sidebar Nav**: Array of items in `components/ui/Sidebar.tsx` with `{ href, icon, label, active }` — icons are emojis
- **Image Upload**: Existing patterns use Supabase Storage upload → get public URL → pass to API
- **Error imports**: `import { createErrorResponse, ErrorCodes } from '@/lib/errors'`
- **AI imports**: `import { AI_MODEL } from '@/lib/ai/claude'`; `import Anthropic from '@anthropic-ai/sdk'`
- **Supabase server**: `import { createClient } from '@/lib/supabase/server'`
- **Supabase client**: `import { createClient } from '@/lib/supabase/client'`
- **Toast**: `import { useToast } from '@/contexts/ToastContext'`

### Critical File Locations
- `components/ui/Sidebar.tsx` — Navigation sidebar (line ~60-80 for navItems array)
- `app/(main)/dashboard/page.tsx` — Example server component page
- `app/(main)/homework/HomeworkContent.tsx` — Example client content component
- `messages/en/index.ts` — EN message namespace registry
- `messages/he/index.ts` — HE message namespace registry
- `lib/supabase/server.ts` — Server-side Supabase client
- `lib/supabase/client.ts` — Client-side Supabase client

---

## Implementation Steps

### Step 1: Create `lib/formula-scanner/analyzer.ts`

```typescript
/**
 * Formula Scanner Analyzer
 *
 * Uses Claude Vision to extract formulas from images,
 * then analyzes each symbol, derivation, and relationships.
 */

import Anthropic from '@anthropic-ai/sdk'
import { AI_MODEL } from '@/lib/ai/claude'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface FormulaSymbol {
  symbol: string       // e.g., "E"
  latex: string        // e.g., "E"
  name: string         // English name
  nameHe: string       // Hebrew name
  meaning: string      // English meaning
  meaningHe: string    // Hebrew meaning
  units: string        // e.g., "Joules (J)"
  typicalRange?: string // e.g., "any positive value"
}

export interface FormulaAnalysis {
  latex: string           // Full formula in LaTeX
  name: string            // English name (e.g., "Einstein's Mass-Energy Equivalence")
  nameHe: string          // Hebrew name
  subject: string         // e.g., "Physics", "Mathematics"
  symbols: FormulaSymbol[]
  derivation: string      // English derivation/explanation
  derivationHe: string    // Hebrew derivation
  relatedFormulas: Array<{
    latex: string
    name: string
    nameHe: string
    relationship: string  // How it relates
  }>
  practiceQuestion: string    // A practice question using this formula
  practiceQuestionHe: string
  practiceAnswer: string      // Answer to the practice question
  practiceAnswerHe: string
}

// ─── Claude Analysis ─────────────────────────────────────────────────────────

const ANALYZE_FORMULA_PROMPT = `You are a mathematics and science expert. Analyze the given formula and provide a comprehensive breakdown.

Return JSON (no markdown code blocks):
{
  "latex": "The formula in LaTeX notation",
  "name": "English name of the formula",
  "nameHe": "Hebrew name of the formula",
  "subject": "Subject area (Physics, Mathematics, Chemistry, etc.)",
  "symbols": [
    {
      "symbol": "Display symbol",
      "latex": "LaTeX for this symbol",
      "name": "English name",
      "nameHe": "Hebrew name",
      "meaning": "What this symbol represents in English",
      "meaningHe": "What this symbol represents in Hebrew",
      "units": "SI units (or 'dimensionless')",
      "typicalRange": "Typical values or range (optional)"
    }
  ],
  "derivation": "Brief derivation or explanation of where this formula comes from (2-4 sentences, English)",
  "derivationHe": "Same derivation in Hebrew",
  "relatedFormulas": [
    {
      "latex": "Related formula in LaTeX",
      "name": "English name",
      "nameHe": "Hebrew name",
      "relationship": "How it relates to the main formula"
    }
  ],
  "practiceQuestion": "A concrete practice problem using this formula (English)",
  "practiceQuestionHe": "Same question in Hebrew",
  "practiceAnswer": "Step-by-step solution (English)",
  "practiceAnswerHe": "Same solution in Hebrew"
}

Rules:
- Include ALL symbols in the formula, including constants
- Derivation should be accessible to a high school student
- Practice question should use concrete numbers
- Related formulas: 2-3 max
- If the formula is from a specific curriculum context, mention it
- Always provide both English AND Hebrew for every text field`

/**
 * Analyze a formula from LaTeX text input.
 */
export async function analyzeFormulaFromText(latexText: string): Promise<FormulaAnalysis> {
  const client = new Anthropic()

  const response = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 3000,
    system: ANALYZE_FORMULA_PROMPT,
    messages: [{
      role: 'user',
      content: `Analyze this formula: ${latexText}`,
    }],
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error('Failed to parse formula analysis response')
  }

  return JSON.parse(jsonMatch[0]) as FormulaAnalysis
}

/**
 * Extract formula from image using Claude Vision, then analyze it.
 */
export async function analyzeFormulaFromImage(imageUrl: string): Promise<FormulaAnalysis> {
  const client = new Anthropic()

  // Step 1: Extract LaTeX from image
  const extractResponse = await client.messages.create({
    model: AI_MODEL,
    max_tokens: 500,
    messages: [{
      role: 'user',
      content: [
        {
          type: 'image',
          source: { type: 'url', url: imageUrl },
        },
        {
          type: 'text',
          text: 'Extract the mathematical formula from this image and write it in LaTeX notation. Return ONLY the LaTeX formula, nothing else. If there are multiple formulas, return the main/primary one.',
        },
      ],
    }],
  })

  const extractedLatex = extractResponse.content[0].type === 'text'
    ? extractResponse.content[0].text.trim()
    : ''

  if (!extractedLatex) {
    throw new Error('Could not extract a formula from the image')
  }

  // Step 2: Analyze the extracted formula
  const analysis = await analyzeFormulaFromText(extractedLatex)

  // Override latex with what was extracted (in case AI modified it)
  analysis.latex = extractedLatex

  return analysis
}
```

### Step 2: Create API Route `app/api/formula-scanner/analyze/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createErrorResponse, ErrorCodes } from '@/lib/errors'
import { analyzeFormulaFromText, analyzeFormulaFromImage } from '@/lib/formula-scanner/analyzer'

export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Auth
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return createErrorResponse(ErrorCodes.UNAUTHORIZED)
    }

    // Parse request
    const body = await request.json()
    const { imageUrl, latexText } = body as {
      imageUrl?: string
      latexText?: string
    }

    if (!imageUrl && !latexText) {
      return createErrorResponse(ErrorCodes.INVALID_INPUT, 'Either imageUrl or latexText is required')
    }

    // Analyze
    let analysis

    if (latexText) {
      analysis = await analyzeFormulaFromText(latexText)
    } else if (imageUrl) {
      analysis = await analyzeFormulaFromImage(imageUrl)
    }

    return NextResponse.json({
      success: true,
      analysis,
    })
  } catch (error) {
    console.error('[FormulaScanner] Error:', error)
    const message = error instanceof Error ? error.message : 'Failed to analyze formula'
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, message)
  }
}
```

### Step 3: Create `components/formula-scanner/FormulaBreakdown.tsx`

```typescript
'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, BookOpen, FlaskConical, Calculator } from 'lucide-react'
import { useTranslations } from 'next-intl'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import type { FormulaAnalysis } from '@/lib/formula-scanner/analyzer'

interface FormulaBreakdownProps {
  analysis: FormulaAnalysis
  language?: 'en' | 'he'
}

export default function FormulaBreakdown({ analysis, language = 'en' }: FormulaBreakdownProps) {
  const t = useTranslations('formulaScanner')
  const isHe = language === 'he'
  const [showDerivation, setShowDerivation] = useState(false)
  const [showPractice, setShowPractice] = useState(false)
  const [showAnswer, setShowAnswer] = useState(false)

  return (
    <div className="space-y-6" dir={isHe ? 'rtl' : 'ltr'}>
      {/* Formula Display */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-6 text-center">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          {isHe ? analysis.nameHe : analysis.name}
        </p>
        <div className="text-3xl md:text-4xl py-4">
          <BlockMath math={analysis.latex} />
        </div>
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-violet-50 dark:bg-violet-900/20 rounded-full text-xs text-violet-600 dark:text-violet-400">
          <FlaskConical className="w-3 h-3" />
          {analysis.subject}
        </span>
      </div>

      {/* Symbol Cards */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <BookOpen className="w-4 h-4" />
          {t('symbols')}
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {analysis.symbols.map((sym, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-10 h-10 flex items-center justify-center bg-gray-50 dark:bg-gray-900 rounded-lg text-lg">
                  <InlineMath math={sym.latex} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                    {isHe ? sym.nameHe : sym.name}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {isHe ? sym.meaningHe : sym.meaning}
                  </p>
                  <p className="text-xs text-violet-600 dark:text-violet-400 mt-1">
                    {sym.units}
                  </p>
                  {sym.typicalRange && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
                      {t('range')}: {sym.typicalRange}
                    </p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Derivation (expandable) */}
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <button
          onClick={() => setShowDerivation(!showDerivation)}
          className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {t('derivation')}
          </span>
          {showDerivation ? (
            <ChevronUp className="w-4 h-4 text-gray-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400" />
          )}
        </button>
        <AnimatePresence>
          {showDerivation && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4 text-sm text-gray-600 dark:text-gray-400 leading-relaxed border-t border-gray-100 dark:border-gray-700 pt-3">
                {isHe ? analysis.derivationHe : analysis.derivation}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Related Formulas */}
      {analysis.relatedFormulas.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
            {t('relatedFormulas')}
          </h3>
          <div className="space-y-2">
            {analysis.relatedFormulas.map((rf, i) => (
              <div
                key={i}
                className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 px-4 py-3"
              >
                <div className="text-sm">
                  <InlineMath math={rf.latex} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {isHe ? rf.nameHe : rf.name}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Practice Question */}
      <div className="bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-200 dark:border-violet-800 p-4">
        <button
          onClick={() => setShowPractice(!showPractice)}
          className="w-full flex items-center justify-between"
        >
          <span className="flex items-center gap-2 text-sm font-medium text-violet-700 dark:text-violet-300">
            <Calculator className="w-4 h-4" />
            {t('practiceQuestion')}
          </span>
          {showPractice ? (
            <ChevronUp className="w-4 h-4 text-violet-400" />
          ) : (
            <ChevronDown className="w-4 h-4 text-violet-400" />
          )}
        </button>

        <AnimatePresence>
          {showPractice && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 pt-3 border-t border-violet-200 dark:border-violet-800">
                <p className="text-sm text-violet-800 dark:text-violet-200 mb-3">
                  {isHe ? analysis.practiceQuestionHe : analysis.practiceQuestion}
                </p>

                {!showAnswer ? (
                  <button
                    onClick={() => setShowAnswer(true)}
                    className="px-4 py-2 bg-violet-600 text-white text-sm rounded-lg hover:bg-violet-700 transition-colors"
                  >
                    {t('showAnswer')}
                  </button>
                ) : (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="p-3 bg-white dark:bg-gray-800 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                  >
                    {isHe ? analysis.practiceAnswerHe : analysis.practiceAnswer}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
```

### Step 4: Create `app/(main)/formula-scanner/page.tsx` (Server Component)

```typescript
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FormulaScannerContent from './FormulaScannerContent'

export default async function FormulaScannerPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <FormulaScannerContent />
}
```

### Step 5: Create `app/(main)/formula-scanner/FormulaScannerContent.tsx` (Client Component)

```typescript
'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/contexts/ToastContext'
import { ScanLine, Upload, Type, Loader2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'
import FormulaBreakdown from '@/components/formula-scanner/FormulaBreakdown'
import type { FormulaAnalysis } from '@/lib/formula-scanner/analyzer'
import { createClient } from '@/lib/supabase/client'

type InputTab = 'image' | 'text'

export default function FormulaScannerContent() {
  const t = useTranslations('formulaScanner')
  const { error: showError } = useToast()

  // State
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [latexInput, setLatexInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<FormulaAnalysis | null>(null)

  // ─── Image Upload ──────────────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showError(t('errors.notImage'))
      return
    }

    if (file.size > 10 * 1024 * 1024) {
      showError(t('errors.fileTooLarge'))
      return
    }

    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setAnalysis(null)
  }

  // ─── Upload to Supabase Storage ────────────────────────────────────────────

  const uploadImage = async (file: File): Promise<string> => {
    const supabase = createClient()
    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `formula-scanner/${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('uploads')
      .upload(fileName, file, { contentType: file.type })

    if (error) throw new Error('Failed to upload image')

    const { data: urlData } = supabase.storage
      .from('uploads')
      .getPublicUrl(data.path)

    return urlData.publicUrl
  }

  // ─── Analyze ───────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    setIsAnalyzing(true)
    setAnalysis(null)

    try {
      let body: { imageUrl?: string; latexText?: string } = {}

      if (inputTab === 'text') {
        if (!latexInput.trim()) {
          showError(t('errors.noFormula'))
          return
        }
        body = { latexText: latexInput.trim() }
      } else {
        if (!selectedFile) {
          showError(t('errors.noImage'))
          return
        }
        const imageUrl = await uploadImage(selectedFile)
        body = { imageUrl }
      }

      const response = await fetch('/api/formula-scanner/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.message || 'Analysis failed')
      }

      const data = await response.json()
      setAnalysis(data.analysis)
    } catch (err) {
      console.error('[FormulaScanner] Error:', err)
      showError(err instanceof Error ? err.message : t('errors.analysisFailed'))
    } finally {
      setIsAnalyzing(false)
    }
  }, [inputTab, latexInput, selectedFile, showError, t])

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="px-4 md:px-10 py-6 max-w-[800px] mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 bg-violet-100 dark:bg-violet-900/30 rounded-xl">
            <ScanLine className="w-6 h-6 text-violet-600 dark:text-violet-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {t('title')}
          </h1>
        </div>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          {t('subtitle')}
        </p>
      </div>

      {/* Input Tabs */}
      <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-800 rounded-lg mb-4">
        <button
          onClick={() => { setInputTab('text'); setAnalysis(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors
            ${inputTab === 'text'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <Type className="w-4 h-4" />
          {t('tabs.typeLatex')}
        </button>
        <button
          onClick={() => { setInputTab('image'); setAnalysis(null) }}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-md text-sm font-medium transition-colors
            ${inputTab === 'image'
              ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
            }`}
        >
          <Upload className="w-4 h-4" />
          {t('tabs.uploadImage')}
        </button>
      </div>

      {/* Input Area */}
      <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 mb-4">
        {inputTab === 'text' ? (
          <div className="space-y-3">
            <textarea
              value={latexInput}
              onChange={(e) => { setLatexInput(e.target.value); setAnalysis(null) }}
              placeholder={t('placeholders.latex')}
              className="w-full h-24 px-4 py-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 font-mono"
            />
            {/* Live KaTeX preview */}
            {latexInput.trim() && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-xl text-center min-h-[60px] flex items-center justify-center">
                <div className="text-xl">
                  {(() => {
                    try {
                      return <BlockMath math={latexInput} />
                    } catch {
                      return <span className="text-red-400 text-xs">{t('errors.invalidLatex')}</span>
                    }
                  })()}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div>
            {previewUrl ? (
              <div className="relative">
                <img
                  src={previewUrl}
                  alt="Formula"
                  className="max-h-48 mx-auto rounded-lg"
                />
                <button
                  onClick={() => { setSelectedFile(null); setPreviewUrl(null); setAnalysis(null) }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                >
                  &times;
                </button>
              </div>
            ) : (
              <label className="flex flex-col items-center justify-center h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-violet-400 dark:hover:border-violet-500 transition-colors">
                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {t('placeholders.dropImage')}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>
        )}
      </div>

      {/* Analyze Button */}
      <button
        onClick={handleAnalyze}
        disabled={isAnalyzing || (inputTab === 'text' ? !latexInput.trim() : !selectedFile)}
        className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2"
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('analyzing')}
          </>
        ) : (
          <>
            <ScanLine className="w-4 h-4" />
            {t('analyzeButton')}
          </>
        )}
      </button>

      {/* Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-6"
          >
            <FormulaBreakdown analysis={analysis} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
```

### Step 6: Add to Sidebar Navigation

Open `components/ui/Sidebar.tsx` and add a nav item to the `navItems` array:

```typescript
{ href: '/formula-scanner', icon: '🔬', label: t('nav.formulaScanner'), active: isActive('/formula-scanner') },
```

Add after the 'homework' or 'practice' entry (wherever makes sense in the navigation order).

Also add the translation key to sidebar/common i18n:
- `messages/en/common.json`: Add `"nav": { ..., "formulaScanner": "Formula Scanner" }`
- `messages/he/common.json`: Add `"nav": { ..., "formulaScanner": "סורק נוסחאות" }`

### Step 7: Create i18n Files

**Create `messages/en/formulaScanner.json`:**
```json
{
  "title": "Formula Scanner",
  "subtitle": "Upload or type a formula to get a complete breakdown of every symbol, its meaning, and units",
  "tabs": {
    "typeLatex": "Type Formula",
    "uploadImage": "Upload Image"
  },
  "placeholders": {
    "latex": "Type LaTeX here... e.g., E = mc^2",
    "dropImage": "Click to upload or drag an image"
  },
  "analyzeButton": "Analyze Formula",
  "analyzing": "Analyzing...",
  "symbols": "Symbol Breakdown",
  "derivation": "Derivation & Background",
  "relatedFormulas": "Related Formulas",
  "practiceQuestion": "Practice with this Formula",
  "showAnswer": "Show Answer",
  "range": "Range",
  "errors": {
    "notImage": "Please select an image file",
    "fileTooLarge": "Image must be under 10MB",
    "noFormula": "Please enter a formula",
    "noImage": "Please upload an image",
    "invalidLatex": "Invalid LaTeX",
    "analysisFailed": "Failed to analyze formula. Please try again."
  }
}
```

**Create `messages/he/formulaScanner.json`:**
```json
{
  "title": "סורק נוסחאות",
  "subtitle": "העלו תמונה או הקלידו נוסחה כדי לקבל פירוט מלא של כל סמל, משמעותו ויחידותיו",
  "tabs": {
    "typeLatex": "הקלד נוסחה",
    "uploadImage": "העלה תמונה"
  },
  "placeholders": {
    "latex": "הקלד LaTeX כאן... למשל E = mc^2",
    "dropImage": "לחץ להעלאה או גרור תמונה"
  },
  "analyzeButton": "נתח נוסחה",
  "analyzing": "מנתח...",
  "symbols": "פירוט סמלים",
  "derivation": "גזירה ורקע",
  "relatedFormulas": "נוסחאות קשורות",
  "practiceQuestion": "תרגול עם הנוסחה",
  "showAnswer": "הצג תשובה",
  "range": "טווח",
  "errors": {
    "notImage": "אנא בחר קובץ תמונה",
    "fileTooLarge": "התמונה חייבת להיות עד 10MB",
    "noFormula": "אנא הזן נוסחה",
    "noImage": "אנא העלה תמונה",
    "invalidLatex": "LaTeX לא תקין",
    "analysisFailed": "ניתוח הנוסחה נכשל. נסה שוב."
  }
}
```

### Step 8: Register i18n Namespace

**Add to `messages/en/index.ts`:**
```typescript
import formulaScanner from './formulaScanner.json'

// In the messages object:
const messages = {
  // ... existing
  formulaScanner,
}
```

**Add to `messages/he/index.ts`:**
```typescript
import formulaScanner from './formulaScanner.json'

// In the messages object:
const messages = {
  // ... existing
  formulaScanner,
}
```

---

## Testing Checklist

```bash
npx tsc --noEmit   # Zero errors
npm test            # All pass
npm run build       # Clean
```

### Browser Testing
1. Navigate to `/formula-scanner` — page loads with title, tabs, input
2. **Text mode**: Type `E = mc^2` → live KaTeX preview shows rendered formula
3. Click "Analyze Formula" → loading state → result appears
4. Result shows: formula display, 3 symbol cards (E, m, c), derivation expandable, related formulas, practice question
5. **Image mode**: Upload image of quadratic formula → extracts LaTeX → full breakdown
6. **Invalid input**: Empty submit → error toast, garbage LaTeX → "Invalid LaTeX" in preview
7. **Hebrew**: Switch to HE → all labels Hebrew, RTL layout, symbol meanings in Hebrew
8. **Dark mode**: All sections have dark backgrounds and appropriate text colors
9. **Mobile 375px**: Stacks vertically, no overflow, symbol cards single column
10. **Sidebar**: "Formula Scanner" link appears in navigation

---

## Files Created
- `lib/formula-scanner/analyzer.ts`
- `app/api/formula-scanner/analyze/route.ts`
- `components/formula-scanner/FormulaBreakdown.tsx`
- `app/(main)/formula-scanner/page.tsx`
- `app/(main)/formula-scanner/FormulaScannerContent.tsx`
- `messages/en/formulaScanner.json`
- `messages/he/formulaScanner.json`

## Files Modified
- `components/ui/Sidebar.tsx` (add nav item)
- `messages/en/common.json` (add nav label)
- `messages/he/common.json` (add nav label)
- `messages/en/index.ts` (register namespace)
- `messages/he/index.ts` (register namespace)

## What's Next
Day 4: Mistake Pattern Detector + Gap Auto-Router (`day4-mistake-patterns.md`)
