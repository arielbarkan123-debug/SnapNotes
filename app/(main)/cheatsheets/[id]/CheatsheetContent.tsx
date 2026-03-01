'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'
import CheatsheetBlock from '@/components/cheatsheet/CheatsheetBlock'
import type { CheatsheetBlock as BlockType } from '@/lib/cheatsheet/generator'

interface CheatsheetData {
  id: string
  title: string
  title_he: string | null
  blocks: BlockType[]
  exam_mode: boolean
  created_at: string
}

interface CheatsheetContentProps {
  cheatsheetId: string
}

export default function CheatsheetContent({ cheatsheetId }: CheatsheetContentProps) {
  const t = useTranslations('cheatsheet')
  const locale = useLocale()
  const router = useRouter()
  const isHe = locale === 'he'

  const [data, setData] = useState<CheatsheetData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [examMode, setExamMode] = useState(false)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/cheatsheets/${cheatsheetId}`)
        const json = await res.json()
        if (json.success) {
          setData(json.cheatsheet)
          setExamMode(json.cheatsheet.exam_mode || false)
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [cheatsheetId])

  const handlePrint = useCallback(() => {
    window.print()
  }, [])

  const handleDelete = useCallback(async () => {
    if (!confirm(t('confirmDelete'))) return
    try {
      const res = await fetch(`/api/cheatsheets/${cheatsheetId}`, { method: 'DELETE' })
      if (!res.ok) return
      router.push('/cheatsheets')
    } catch {
      // Network error — stay on page
    }
  }, [cheatsheetId, router, t])

  // Filter blocks for exam mode
  const displayBlocks = data?.blocks
    ? examMode
      ? data.blocks.filter(b => b.type !== 'example')
      : data.blocks
    : []

  if (isLoading) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 max-w-[800px] mx-auto">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-gray-200 dark:bg-gray-700 rounded animate-pulse" />
          <div className="h-4 w-48 bg-gray-100 dark:bg-gray-800 rounded animate-pulse" />
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-gray-800 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    )
  }

  if (!data) {
    return (
      <div className="px-4 md:px-10 py-6 md:py-10 max-w-[800px] mx-auto text-center">
        <p className="text-gray-500 dark:text-gray-400">{t('notFound')}</p>
      </div>
    )
  }

  const title = isHe && data.title_he ? data.title_he : data.title

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-[800px] mx-auto print:max-w-full print:p-0">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mb-2">
            📋 {title}
          </h1>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {new Date(data.created_at).toLocaleDateString()}
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 print:hidden">
          {/* Exam Mode Toggle */}
          <button
            onClick={() => setExamMode(!examMode)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              examMode
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}
          >
            {t('examMode')}
          </button>

          {/* Print */}
          <button
            onClick={handlePrint}
            className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg text-xs font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
          >
            🖨️ {t('print')}
          </button>

          {/* Delete */}
          <button
            onClick={handleDelete}
            className="px-3 py-1.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-xs font-medium hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            {t('delete')}
          </button>
        </div>
      </div>

      {/* Blocks */}
      <div className="space-y-3">
        {displayBlocks.map((block, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.03 }}
          >
            <CheatsheetBlock block={block} />
          </motion.div>
        ))}
      </div>

      {displayBlocks.length === 0 && (
        <p className="text-center text-gray-500 dark:text-gray-400 py-8">
          {t('noBlocks')}
        </p>
      )}
    </div>
  )
}
