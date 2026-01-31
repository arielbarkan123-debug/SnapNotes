'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Share2, Check } from 'lucide-react'
import { formatShareText } from '@/lib/export/share-card'

interface ShareResultCardProps {
  accuracy: number
  questionsAnswered: number
  courseName?: string
  timeTaken?: number
}

export default function ShareResultCard({
  accuracy,
  questionsAnswered,
  courseName,
  timeTaken,
}: ShareResultCardProps) {
  const t = useTranslations('export')
  const [copied, setCopied] = useState(false)

  const shareText = formatShareText(accuracy, courseName)

  const handleShare = async () => {
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ text: shareText })
        return
      } catch {
        // User cancelled or share API failed, fall through to clipboard
      }
    }

    // Fallback: copy to clipboard
    try {
      await navigator.clipboard.writeText(shareText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard failed silently
    }
  }

  return (
    <div className="p-5 rounded-xl bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 border border-indigo-200 dark:border-indigo-800/50">
      {/* Stats */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {accuracy}%
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {questionsAnswered} questions
          </p>
        </div>
        {courseName && (
          <p className="text-sm font-medium text-gray-700 dark:text-gray-300 text-end max-w-[50%] truncate">
            {courseName}
          </p>
        )}
      </div>

      {timeTaken !== undefined && (
        <p className="text-xs text-gray-400 dark:text-gray-500 mb-4">
          {Math.floor(timeTaken / 60)}m {timeTaken % 60}s
        </p>
      )}

      {/* Share button */}
      <button
        onClick={handleShare}
        className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
      >
        {copied ? (
          <>
            <Check className="w-4 h-4" />
            {t('copied')}
          </>
        ) : (
          <>
            <Share2 className="w-4 h-4" />
            {t('shareResults')}
          </>
        )}
      </button>
    </div>
  )
}
