'use client'

import { motion } from 'framer-motion'
import { Check } from 'lucide-react'

interface StepDotProps {
  stepNumber: number
  isActive: boolean
  isCompleted: boolean
  onClick: () => void
  label?: string
}

export default function StepDot({ stepNumber, isActive, isCompleted, onClick, label }: StepDotProps) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1 group"
      aria-label={label || `Step ${stepNumber}`}
      aria-current={isActive ? 'step' : undefined}
    >
      <motion.div
        className={`
          flex items-center justify-center rounded-full transition-colors duration-200
          ${isActive
            ? 'w-8 h-8 bg-violet-600 text-white shadow-lg shadow-violet-600/30'
            : isCompleted
              ? 'w-6 h-6 bg-violet-100 dark:bg-violet-900/40 text-violet-600 dark:text-violet-400'
              : 'w-6 h-6 bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 group-hover:bg-gray-200 dark:group-hover:bg-gray-600'
          }
        `}
        animate={{ scale: isActive ? 1.1 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {isCompleted && !isActive ? (
          <Check className="w-3.5 h-3.5" />
        ) : (
          <span className="text-xs font-semibold">{stepNumber}</span>
        )}
      </motion.div>
      {label && (
        <span className={`text-[10px] max-w-[60px] text-center leading-tight truncate
          ${isActive ? 'text-violet-600 dark:text-violet-400 font-medium' : 'text-gray-400 dark:text-gray-500'}
        `}>
          {label}
        </span>
      )}
    </button>
  )
}
