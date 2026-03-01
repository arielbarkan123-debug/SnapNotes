'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useTranslations, useLocale } from 'next-intl'
import { motion } from 'framer-motion'

interface CheatsheetItem {
  id: string
  title: string
  title_he: string | null
  course_id: string
  exam_mode: boolean
  created_at: string
}

export default function CheatsheetsListContent() {
  const t = useTranslations('cheatsheet')
  const locale = useLocale()
  const isHe = locale === 'he'

  const [cheatsheets, setCheatsheets] = useState<CheatsheetItem[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch('/api/cheatsheets')
        const json = await res.json()
        if (json.success) {
          setCheatsheets(json.cheatsheets)
        }
      } catch {
        // Silent
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="px-4 md:px-10 py-6 md:py-10 max-w-[1100px] mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-extrabold gradient-text mb-2">{t('title')}</h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm">{t('subtitle')}</p>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-gray-100 dark:bg-gray-800 rounded-[22px] animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && cheatsheets.length === 0 && (
        <div className="text-center py-16">
          <div className="w-16 h-16 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-3xl">📋</span>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{t('empty')}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 max-w-sm mx-auto mb-6">{t('emptyDesc')}</p>
          <Link
            href="/courses"
            className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-medium text-sm transition-colors"
          >
            {t('goToCourses')}
          </Link>
        </div>
      )}

      {/* Grid */}
      {!isLoading && cheatsheets.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {cheatsheets.map((sheet, idx) => (
            <motion.div
              key={sheet.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
            >
              <Link
                href={`/cheatsheets/${sheet.id}`}
                className="block bg-white dark:bg-gray-800 rounded-[22px] border border-gray-200 dark:border-gray-700 shadow-card card-hover-lift overflow-hidden group"
              >
                <div className="h-1 bg-gradient-to-r from-violet-500 to-purple-500" />
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">📋</span>
                    <h3 className="font-semibold text-gray-900 dark:text-white text-sm truncate">
                      {isHe && sheet.title_he ? sheet.title_he : sheet.title}
                    </h3>
                  </div>
                  <div className="flex items-center gap-2">
                    {sheet.exam_mode && (
                      <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full font-medium">
                        {t('examMode')}
                      </span>
                    )}
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(sheet.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
