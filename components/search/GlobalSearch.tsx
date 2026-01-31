'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { AnimatePresence, motion } from 'framer-motion'
import { Search, X, Clock } from 'lucide-react'
import { useGlobalSearch } from '@/hooks/useGlobalSearch'
import type { SearchResult } from '@/hooks/useGlobalSearch'
import SearchResults from './SearchResults'

interface GlobalSearchProps {
  isOpen: boolean
  onClose: () => void
}

function getResultUrl(result: SearchResult): string {
  switch (result.type) {
    case 'course':
      if (result.lessonIndex !== undefined) {
        return `/course/${result.courseId}/lesson/${result.lessonIndex}`
      }
      return `/course/${result.courseId}`
    case 'review_card':
      return '/review'
    case 'practice':
      return '/practice'
    case 'exam':
      return '/exams'
    case 'homework':
      return '/homework'
    default:
      return '/dashboard'
  }
}

export default function GlobalSearch({ isOpen, onClose }: GlobalSearchProps) {
  const router = useRouter()
  const t = useTranslations('search')
  const inputRef = useRef<HTMLInputElement>(null)
  const {
    query,
    setQuery,
    results,
    isLoading,
    isAISearching,
    recentSearches,
    addRecentSearch,
    clearRecentSearches,
  } = useGlobalSearch()

  // Auto-focus input when opened
  useEffect(() => {
    if (isOpen) {
      // Small delay to allow animation to start
      const timer = setTimeout(() => {
        inputRef.current?.focus()
      }, 100)
      return () => clearTimeout(timer)
    } else {
      setQuery('')
    }
  }, [isOpen, setQuery])

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose])

  // Prevent body scroll when open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  const handleResultClick = (result: SearchResult) => {
    addRecentSearch(query)
    onClose()
    router.push(getResultUrl(result))
  }

  const handleRecentClick = (search: string) => {
    setQuery(search)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Search Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-0 z-[70] flex items-start justify-center pt-[10vh] md:pt-[15vh] px-4"
          >
            <div
              className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-xl shadow-2xl overflow-hidden max-h-[70vh] md:max-h-[60vh] flex flex-col"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Search Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <Search className="w-5 h-5 text-gray-400 dark:text-gray-500 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t('placeholder')}
                  className="flex-1 bg-transparent text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 outline-none text-sm"
                />
                {query && (
                  <button
                    onClick={() => setQuery('')}
                    className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={onClose}
                  className="hidden md:flex text-xs text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded font-mono"
                >
                  ESC
                </button>
              </div>

              {/* Results Area */}
              <div className="flex-1 overflow-y-auto">
                {query.length >= 2 ? (
                  <SearchResults
                    results={results}
                    isLoading={isLoading}
                    isAISearching={isAISearching}
                    query={query}
                    onResultClick={handleResultClick}
                  />
                ) : recentSearches.length > 0 ? (
                  <div className="py-2">
                    <div className="flex items-center justify-between px-4 py-1.5">
                      <span className="text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                        {t('recentSearches')}
                      </span>
                      <button
                        onClick={clearRecentSearches}
                        className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                      >
                        {t('clearRecent')}
                      </button>
                    </div>
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentClick(search)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-start"
                      >
                        <Clock className="w-4 h-4 text-gray-400 dark:text-gray-500 shrink-0" />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{search}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {/* Footer */}
              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span>{t('shortcut')}</span>
                {results.length > 0 && (
                  <span>{t('results', { count: results.length })}</span>
                )}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
