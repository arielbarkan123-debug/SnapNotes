'use client'

import { motion } from 'framer-motion'
import type { BatchWorksheetItem } from '@/lib/homework/types'

interface WorksheetTileProps {
  item: BatchWorksheetItem
  isExpanded: boolean
  onClick: () => void
}

function getTileColor(isCorrect: boolean | null) {
  if (isCorrect === true) return {
    bg: 'bg-green-100 dark:bg-green-900/30',
    border: 'border-green-300 dark:border-green-700',
    text: 'text-green-700 dark:text-green-400',
    icon: '\u2713',
  }
  if (isCorrect === false) return {
    bg: 'bg-red-100 dark:bg-red-900/30',
    border: 'border-red-300 dark:border-red-700',
    text: 'text-red-700 dark:text-red-400',
    icon: '\u2717',
  }
  return {
    bg: 'bg-gray-100 dark:bg-gray-800',
    border: 'border-gray-300 dark:border-gray-600',
    text: 'text-gray-500 dark:text-gray-400',
    icon: '?',
  }
}

export default function WorksheetTile({ item, isExpanded, onClick }: WorksheetTileProps) {
  const colors = getTileColor(item.isCorrect)

  return (
    <motion.button
      onClick={onClick}
      className={`
        relative flex flex-col items-center justify-center
        rounded-xl border-2 p-3 transition-all
        ${colors.bg} ${colors.border}
        ${isExpanded ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-900' : ''}
        hover:scale-105 active:scale-95
      `}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.95 }}
      layout
    >
      <span className={`text-2xl font-bold ${colors.text}`}>
        {colors.icon}
      </span>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400 mt-1 truncate w-full text-center">
        #{item.problemNumber}
      </span>
    </motion.button>
  )
}
