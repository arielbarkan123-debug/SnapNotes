'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useTranslations, useLocale } from 'next-intl'
import { useToast } from '@/contexts/ToastContext'
import { ScanLine, Upload, Type, Loader2, Calculator } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import 'katex/dist/katex.min.css'
import { BlockMath } from 'react-katex'
import FormulaBreakdown from '@/components/formula-scanner/FormulaBreakdown'
import SolveResult from '@/components/formula-scanner/SolveResult'
import type { FormulaAnalysis } from '@/lib/formula-scanner/analyzer'
import type { FormulaSolution } from '@/lib/formula-scanner/solver'
import { createClient } from '@/lib/supabase/client'
import { createLogger } from '@/lib/logger'


const log = createLogger('page:formula-scanner-FormulaScannerContentx')
type InputTab = 'image' | 'text'

export default function FormulaScannerContent() {
  const t = useTranslations('formulaScanner')
  const locale = useLocale()
  const { error: showError } = useToast()

  // State
  const [inputTab, setInputTab] = useState<InputTab>('text')
  const [latexInput, setLatexInput] = useState('')
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<FormulaAnalysis | null>(null)
  const [isSolving, setIsSolving] = useState(false)
  const [solution, setSolution] = useState<FormulaSolution | null>(null)

  // Track previewUrl for cleanup on unmount
  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => { previewUrlRef.current = previewUrl }, [previewUrl])
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    }
  }, [])

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

    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setSelectedFile(file)
    setPreviewUrl(URL.createObjectURL(file))
    setAnalysis(null)
    setSolution(null)
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
    setSolution(null)

    try {
      let body: { imageUrl?: string; latexText?: string } = {}

      if (inputTab === 'text') {
        if (!latexInput.trim()) {
          showError(t('errors.noFormula'))
          setIsAnalyzing(false)
          return
        }
        body = { latexText: latexInput.trim() }
      } else {
        if (!selectedFile) {
          showError(t('errors.noImage'))
          setIsAnalyzing(false)
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
      log.error({ detail: err }, 'Error')
      showError(err instanceof Error ? err.message : t('errors.analysisFailed'))
    } finally {
      setIsAnalyzing(false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputTab, latexInput, selectedFile, showError, t])

  // ─── Solve ───────────────────────────────────────────────────────────────

  const handleSolve = useCallback(async () => {
    if (!analysis) return

    setIsSolving(true)
    try {
      const context = `Formula: ${analysis.name}. Subject: ${analysis.subject}.`

      const response = await fetch('/api/formula-scanner/solve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ latex: analysis.latex, context }),
      })

      if (!response.ok) {
        const err = await response.json().catch(() => ({}))
        throw new Error(err.error?.message || 'Solve failed')
      }

      const data = await response.json()
      setSolution(data.solution)
    } catch (err) {
      log.error({ detail: err }, 'Solve error')
      showError(err instanceof Error ? err.message : t('errors.solveFailed'))
    } finally {
      setIsSolving(false)
    }
  }, [analysis, showError, t])

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
          onClick={() => { setInputTab('text'); setAnalysis(null); setSolution(null) }}
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
          onClick={() => { setInputTab('image'); setAnalysis(null); setSolution(null) }}
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
              onChange={(e) => { setLatexInput(e.target.value); setAnalysis(null); setSolution(null) }}
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
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewUrl}
                  alt="Formula"
                  className="max-h-48 mx-auto rounded-lg"
                />
                <button
                  onClick={() => { if (previewUrl) URL.revokeObjectURL(previewUrl); setSelectedFile(null); setPreviewUrl(null); setAnalysis(null); setSolution(null) }}
                  className="absolute top-2 right-2 p-1.5 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                  aria-label={t('removeImage')}
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
        className="w-full py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:bg-gray-300 dark:disabled:bg-gray-700 text-white font-medium rounded-xl transition-colors flex items-center justify-center gap-2 disabled:cursor-not-allowed"
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
            className="mt-6 space-y-4"
          >
            <FormulaBreakdown
              analysis={analysis}
              language={locale as 'en' | 'he'}
            />

            {/* Solve This Button */}
            <button
              type="button"
              onClick={handleSolve}
              disabled={isSolving}
              className="w-full py-3 px-6 bg-gradient-to-r from-teal-500 to-teal-600 hover:from-teal-600 hover:to-teal-700 disabled:from-gray-300 disabled:to-gray-400 dark:disabled:from-gray-700 dark:disabled:to-gray-600 text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2 disabled:cursor-not-allowed shadow-sm"
            >
              {isSolving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t('solve.solving')}
                </>
              ) : (
                <>
                  <Calculator className="w-4 h-4" />
                  {t('solve.solveThis')}
                </>
              )}
            </button>

            {/* Solution */}
            {solution && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <SolveResult solution={solution} />
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
