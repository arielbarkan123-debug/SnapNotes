'use client'

import { useState, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { useToast } from '@/contexts/ToastContext'
import Button from '@/components/ui/Button'
import { Trash2, CheckSquare, Square } from 'lucide-react'

interface BulkDeleteBarProps {
  selectedIds: Set<string>
  totalCount: number
  onSelectAll: () => void
  onDeselectAll: () => void
  onDeleteComplete: (deletedIds: string[]) => void
}

export default function BulkDeleteBar({
  selectedIds,
  totalCount,
  onSelectAll,
  onDeselectAll,
  onDeleteComplete,
}: BulkDeleteBarProps) {
  const t = useTranslations('courses.bulkDelete')
  const tc = useTranslations('common.buttons')
  const { success, error: showError } = useToast()
  const [showConfirm, setShowConfirm] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const count = selectedIds.size
  const allSelected = count === totalCount && totalCount > 0

  const handleDelete = useCallback(async () => {
    setIsDeleting(true)
    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(
      ids.map(id =>
        fetch(`/api/courses/${id}`, { method: 'DELETE' }).then(res => {
          if (!res.ok) throw new Error('Failed')
          return id
        })
      )
    )

    const succeeded = results
      .filter((r): r is PromiseFulfilledResult<string> => r.status === 'fulfilled')
      .map(r => r.value)
    const failedCount = results.filter(r => r.status === 'rejected').length

    if (failedCount === 0) {
      success(t('success', { count: succeeded.length }))
    } else {
      showError(t('partialFail', { success: succeeded.length, failed: failedCount }))
    }

    setShowConfirm(false)
    setIsDeleting(false)
    onDeleteComplete(succeeded)
  }, [selectedIds, success, showError, t, onDeleteComplete])

  if (count === 0) return null

  return (
    <>
      {/* Sticky bar */}
      <div className="sticky bottom-0 max-md:bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))] sm:bottom-4 z-40 mx-auto max-w-2xl">
        <div className="flex items-center justify-between gap-3 px-4 py-3 bg-gray-900 dark:bg-gray-700 text-white rounded-t-xl sm:rounded-xl shadow-lg">
          <span className="text-sm font-medium">
            {t('selected', { count })}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={allSelected ? onDeselectAll : onSelectAll}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium text-gray-300 hover:text-white bg-gray-800 dark:bg-gray-600 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-500 transition-colors"
            >
              {allSelected ? <Square className="w-3.5 h-3.5" /> : <CheckSquare className="w-3.5 h-3.5" />}
              {allSelected ? t('deselectAll') : t('selectAll')}
            </button>
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-2.5 min-h-[44px] text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              {t('deleteSelected')}
            </button>
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
          onClick={isDeleting ? undefined : () => setShowConfirm(false)}
          aria-hidden="true"
        >
          <div
            role="dialog"
            aria-modal="true"
            className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pt-6 flex justify-center">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                <Trash2 className="w-8 h-8 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="p-6 text-center">
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                {t('confirmTitle')}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {t('confirmText', { count })}
              </p>
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
              <Button
                variant="secondary"
                onClick={() => setShowConfirm(false)}
                disabled={isDeleting}
                className="flex-1 min-h-[48px] sm:min-h-[44px]"
              >
                {tc('cancel')}
              </Button>
              <Button
                variant="danger"
                onClick={handleDelete}
                disabled={isDeleting}
                isLoading={isDeleting}
                loadingText={t('deleting')}
                className="flex-1 min-h-[48px] sm:min-h-[44px]"
              >
                {t('deleteSelected')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
