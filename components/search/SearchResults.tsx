'use client'

import { useTranslations } from 'next-intl'
import { BookOpen, RotateCcw, FileText, ClipboardList } from 'lucide-react'
import type { SearchResult } from '@/hooks/useGlobalSearch'

interface SearchResultsProps {
  results: SearchResult[]
  isLoading: boolean
  isAISearching: boolean
  query: string
  onResultClick: (result: SearchResult) => void
  selectedIndex?: number
}

const typeIcons: Record<SearchResult['type'], React.FC<{ className?: string }>> = {
  course: BookOpen,
  review_card: RotateCcw,
  homework: FileText,
  practice: FileText,
  exam: ClipboardList,
}

const typeBadgeColors: Record<SearchResult['type'], string> = {
  course: 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400',
  review_card: 'bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400',
  homework: 'bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400',
  practice: 'bg-green-100 dark:bg-green-900/40 text-green-600 dark:text-green-400',
  exam: 'bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400',
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-pulse">
      <div className="w-8 h-8 rounded-lg bg-gray-200 dark:bg-gray-700 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
      </div>
      <div className="h-5 w-14 bg-gray-200 dark:bg-gray-700 rounded-full shrink-0" />
    </div>
  )
}

export default function SearchResults({ results, isLoading, isAISearching, query, onResultClick, selectedIndex = -1 }: SearchResultsProps) {
  const t = useTranslations('search')

  if (isLoading) {
    return (
      <div className="py-2">
        <SkeletonRow />
        <SkeletonRow />
        <SkeletonRow />
      </div>
    )
  }

  if (results.length === 0 && query.length >= 2) {
    return (
      <div className="px-4 py-8 text-center">
        <p className="text-gray-500 dark:text-gray-300">
          {t('noResults', { query })}
        </p>
      </div>
    )
  }

  // Build a flat index across all grouped results for selectedIndex matching
  let flatIndex = 0

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, result) => {
    if (!acc[result.type]) acc[result.type] = []
    acc[result.type].push(result)
    return acc
  }, {})

  return (
    <div className="py-2" role="listbox" id="search-results-listbox">
      {isAISearching && (
        <div className="px-4 py-2 text-sm text-indigo-600 dark:text-indigo-400 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-indigo-600 dark:border-indigo-400 border-t-transparent rounded-full animate-spin" />
          {t('searchingAI')}
        </div>
      )}

      {Object.entries(grouped).map(([type, items]) => {
        const Icon = typeIcons[type as SearchResult['type']]
        const badgeColor = typeBadgeColors[type as SearchResult['type']]

        return (
          <div key={type}>
            <div className="px-4 py-1.5 text-xs font-semibold text-gray-400 dark:text-gray-400 uppercase tracking-wider">
              {t(`resultTypes.${type}` as Parameters<typeof t>[0])}
            </div>
            {items.map((result, index) => {
              const currentFlatIndex = flatIndex
              flatIndex++
              const isSelected = currentFlatIndex === selectedIndex

              return (
                <button
                  key={`${result.courseId || result.cardId}-${index}`}
                  id={`search-result-${currentFlatIndex}`}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => onResultClick(result)}
                  className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors text-start ${isSelected ? 'bg-gray-100 dark:bg-gray-700' : ''}`}
                >
                  <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-700 flex items-center justify-center shrink-0">
                    <Icon className="w-4 h-4 text-gray-500 dark:text-gray-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {result.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-300 truncate">
                      {result.snippet}
                    </p>
                  </div>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${badgeColor}`}>
                    {t(`resultTypes.${type}` as Parameters<typeof t>[0])}
                  </span>
                </button>
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
