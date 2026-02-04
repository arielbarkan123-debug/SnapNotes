'use client'

import { useTranslations } from 'next-intl'
import MarkdownWithMath from './MarkdownWithMath'
import GuideTableRenderer from './GuideTableRenderer'
import YouTubeEmbed from './YouTubeEmbed'
import type { GuideSection } from '@/types/prepare'

interface GuideSectionRendererProps {
  section: GuideSection
  onAskAboutSection: () => void
}

const sectionIcons: Record<string, string> = {
  overview: '📋',
  definitions: '📖',
  theory: '🔬',
  examples: '💡',
  model_answer: '✍️',
  formula: '🧮',
  comparison: '⚖️',
  quick_reference: '⚡',
  possible_questions: '❓',
}

const sectionColors: Record<string, string> = {
  overview: 'border-blue-200 dark:border-blue-800',
  definitions: 'border-emerald-200 dark:border-emerald-800',
  theory: 'border-purple-200 dark:border-purple-800',
  examples: 'border-amber-200 dark:border-amber-800',
  model_answer: 'border-rose-200 dark:border-rose-800',
  formula: 'border-cyan-200 dark:border-cyan-800',
  comparison: 'border-indigo-200 dark:border-indigo-800',
  quick_reference: 'border-orange-200 dark:border-orange-800',
  possible_questions: 'border-pink-200 dark:border-pink-800',
}

export default function GuideSectionRenderer({ section, onAskAboutSection }: GuideSectionRendererProps) {
  const t = useTranslations('prepare')
  const icon = sectionIcons[section.type] || '📄'
  const borderColor = sectionColors[section.type] || 'border-gray-200 dark:border-gray-700'

  return (
    <div className={`rounded-xl border-s-4 ${borderColor} bg-white dark:bg-gray-800/50 p-5`}>
      {/* Section Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-gray-900 dark:text-white">
          <span>{icon}</span>
          <span>{section.title}</span>
        </h3>
        <button
          onClick={onAskAboutSection}
          className="text-xs px-2.5 py-1 rounded-full bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 transition-colors"
          title={t('chat.explainMore')}
        >
          Ask AI
        </button>
      </div>

      {/* Content rendered via markdown with LaTeX math support */}
      <MarkdownWithMath className="prose prose-sm dark:prose-invert max-w-none prose-headings:text-gray-900 dark:prose-headings:text-white prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-strong:text-gray-900 dark:prose-strong:text-white prose-code:text-violet-600 dark:prose-code:text-violet-400">
        {section.content}
      </MarkdownWithMath>

      {/* Tables */}
      {section.tables && section.tables.length > 0 && (
        <div className="mt-4 space-y-4">
          {section.tables.map((table, idx) => (
            <GuideTableRenderer key={idx} table={table} />
          ))}
        </div>
      )}

      {/* Subsections */}
      {section.subsections && section.subsections.length > 0 && (
        <div className="mt-4 space-y-3">
          {section.subsections.map((sub) => (
            <div key={sub.id} className="ps-4 border-s-2 border-gray-200 dark:border-gray-700">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {sub.title}
              </h4>
              <MarkdownWithMath className="prose prose-sm dark:prose-invert max-w-none">
                {sub.content}
              </MarkdownWithMath>
            </div>
          ))}
        </div>
      )}

      {/* YouTube Videos */}
      {section.videos && section.videos.length > 0 && (
        <div className="mt-4 space-y-3">
          {section.videos.map((video) => (
            <YouTubeEmbed key={video.videoId} video={video} />
          ))}
        </div>
      )}
    </div>
  )
}
