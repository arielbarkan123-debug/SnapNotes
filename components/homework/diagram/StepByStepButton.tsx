'use client'

import { Layers } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface StepByStepButtonProps {
  onClick: () => void
  disabled?: boolean
  loading?: boolean
}

export default function StepByStepButton({
  onClick,
  disabled,
  loading,
}: StepByStepButtonProps) {
  const t = useTranslations('diagram')

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg
        bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300
        hover:bg-violet-200 dark:hover:bg-violet-900/50
        disabled:opacity-40 disabled:cursor-not-allowed
        transition-all duration-200 shadow-sm"
      aria-label={t('stepByStep.buttonLabel')}
    >
      {loading ? (
        <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-violet-600 dark:border-violet-400" />
      ) : (
        <Layers className="w-3.5 h-3.5" />
      )}
      <span>{loading ? t('stepByStep.loading') : t('stepByStep.button')}</span>
    </button>
  )
}
