'use client'

import { useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import type { CheatsheetBlock as CheatsheetBlockType } from '@/lib/cheatsheet/generator'
import { BlockMath } from 'react-katex'
import 'katex/dist/katex.min.css'

// ─── Severity Config ─────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
  high: 'border-red-400 dark:border-red-600 bg-red-50 dark:bg-red-900/20',
  medium: 'border-amber-400 dark:border-amber-600 bg-amber-50 dark:bg-amber-900/20',
  low: 'border-green-400 dark:border-green-600 bg-green-50 dark:bg-green-900/20',
}

const SEVERITY_BADGE = {
  high: 'bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400',
  medium: 'bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400',
  low: 'bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-400',
}

// ─── Component ───────────────────────────────────────────────────────────────

interface CheatsheetBlockProps {
  block: CheatsheetBlockType
}

export default function CheatsheetBlock({ block }: CheatsheetBlockProps) {
  const locale = useLocale()
  const isHe = locale === 'he'
  const t = useTranslations('cheatsheet')
  const [isExpanded, setIsExpanded] = useState(false)

  const title = isHe ? block.titleHe : block.title
  const content = isHe ? block.contentHe : block.content

  switch (block.type) {
    case 'section_header':
      return (
        <div className="pt-6 pb-2 first:pt-0">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white border-b-2 border-violet-500 pb-2">
            {title}
          </h3>
        </div>
      )

    case 'formula':
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 shadow-sm">
          <p className="text-sm font-semibold text-violet-600 dark:text-violet-400 mb-2">{title}</p>
          {block.latex && (
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 mb-2 overflow-x-auto">
              <BlockMath math={block.latex} />
            </div>
          )}
          <p className="text-sm text-gray-600 dark:text-gray-400">{content}</p>
        </div>
      )

    case 'definition':
      return (
        <div className="border-s-4 border-violet-500 bg-violet-50 dark:bg-violet-900/10 rounded-e-xl p-4">
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
        </div>
      )

    case 'key_fact': {
      const severity = block.severity || 'medium'
      return (
        <div className={`rounded-xl border-s-4 p-4 ${SEVERITY_COLORS[severity]}`}>
          <div className="flex items-center gap-2 mb-1">
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${SEVERITY_BADGE[severity]}`}>
              {severity === 'high' ? `⚡ ${t('severity.high')}` : severity === 'medium' ? `📌 ${t('severity.medium')}` : `💡 ${t('severity.low')}`}
            </span>
          </div>
          <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{title}</p>
          <p className="text-sm text-gray-700 dark:text-gray-300">{content}</p>
        </div>
      )
    }

    case 'example':
      return (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <span className="text-sm font-medium text-gray-900 dark:text-white flex items-center gap-2">
              <span className="text-blue-500">📝</span> {title}
            </span>
            <span className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}>
              ▼
            </span>
          </button>
          {isExpanded && (
            <div className="px-4 pb-4 pt-0 border-t border-gray-100 dark:border-gray-700">
              <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap mt-3">{content}</p>
            </div>
          )}
        </div>
      )

    case 'warning':
      return (
        <div className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/50 rounded-xl p-4">
          <p className="text-sm font-semibold text-red-700 dark:text-red-400 mb-1 flex items-center gap-2">
            <span>⚠️</span> {title}
          </p>
          <p className="text-sm text-red-600 dark:text-red-400/80">{content}</p>
        </div>
      )

    default:
      return null
  }
}
