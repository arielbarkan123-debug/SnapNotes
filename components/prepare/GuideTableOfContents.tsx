'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import type { GuideTopic, GuideSection } from '@/types/prepare'

interface GuideTableOfContentsProps {
  topics: GuideTopic[]
  quickReference?: GuideSection
  activeSectionId: string | null
}

export default function GuideTableOfContents({
  topics,
  quickReference,
  activeSectionId,
}: GuideTableOfContentsProps) {
  const t = useTranslations('prepare')
  const [isExpanded, setIsExpanded] = useState(false)

  const scrollToSection = (sectionId: string) => {
    const el = document.getElementById(sectionId)
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
    setIsExpanded(false)
  }

  return (
    <div className="mb-8">
      {/* Mobile: collapsible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="lg:hidden w-full flex items-center justify-between p-4 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
      >
        <span className="font-semibold text-gray-900 dark:text-white">{t('viewer.tableOfContents')}</span>
        <svg
          className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* TOC content */}
      <div className={`lg:block ${isExpanded ? 'block' : 'hidden'}`}>
        <nav className="p-4 rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 lg:mt-0 mt-2">
          <h3 className="hidden lg:block font-semibold text-gray-900 dark:text-white mb-3">
            {t('viewer.tableOfContents')}
          </h3>
          <ul className="space-y-1.5">
            {topics.map((topic) => (
              <li key={topic.id}>
                <button
                  onClick={() => scrollToSection(topic.id)}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSectionId?.startsWith(topic.id)
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {topic.title}
                </button>
              </li>
            ))}
            {quickReference && (
              <li>
                <button
                  onClick={() => scrollToSection(quickReference.id)}
                  className={`w-full text-start px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    activeSectionId === quickReference.id
                      ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  {t('viewer.quickReference')}
                </button>
              </li>
            )}
          </ul>
        </nav>
      </div>
    </div>
  )
}
