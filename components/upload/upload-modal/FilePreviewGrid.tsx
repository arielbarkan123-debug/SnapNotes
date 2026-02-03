'use client'

import { useCallback, useState } from 'react'
import Image from 'next/image'
import { useTranslations } from 'next-intl'
import { type SelectedFile, MAX_FILES, FILE_ICONS } from './types'
import { formatFileSize } from './helpers'

interface FilePreviewGridProps {
  files: SelectedFile[]
  isUploading: boolean
  isDragging: boolean
  onRemoveFile: (id: string) => void
  onClearAll: () => void
  onReorderFiles: (newFiles: SelectedFile[]) => void
  onAddMoreClick: () => void
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
}

/**
 * Grid display of selected files with preview thumbnails
 */
export default function FilePreviewGrid({
  files,
  isUploading,
  isDragging,
  onRemoveFile,
  onClearAll,
  onReorderFiles,
  onAddMoreClick,
  onDragOver,
  onDragLeave,
  onDrop,
}: FilePreviewGridProps) {
  const t = useTranslations('upload')

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)
  const [showClearConfirm, setShowClearConfirm] = useState(false)

  const handleClearClick = useCallback(() => {
    if (files.length > 3) {
      setShowClearConfirm(true)
    } else {
      onClearAll()
    }
  }, [files.length, onClearAll])

  const handleMoveUp = useCallback((index: number) => {
    if (index <= 0) return
    const newFiles = [...files]
    const temp = newFiles[index - 1]
    newFiles[index - 1] = newFiles[index]
    newFiles[index] = temp
    onReorderFiles(newFiles)
  }, [files, onReorderFiles])

  const handleMoveDown = useCallback((index: number) => {
    if (index >= files.length - 1) return
    const newFiles = [...files]
    const temp = newFiles[index + 1]
    newFiles[index + 1] = newFiles[index]
    newFiles[index] = temp
    onReorderFiles(newFiles)
  }, [files, onReorderFiles])

  const handleThumbnailDragStart = useCallback((e: React.DragEvent, index: number) => {
    setDraggedIndex(index)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    setTimeout(() => {
      const target = e.target as HTMLElement
      target.style.opacity = '0.5'
    }, 0)
  }, [])

  const handleThumbnailDragEnd = useCallback((e: React.DragEvent) => {
    const target = e.target as HTMLElement
    target.style.opacity = '1'
    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [])

  const handleThumbnailDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggedIndex !== null && draggedIndex !== index) {
      setDragOverIndex(index)
    }
  }, [draggedIndex])

  const handleThumbnailDragLeave = useCallback(() => {
    setDragOverIndex(null)
  }, [])

  const handleThumbnailDrop = useCallback((e: React.DragEvent, targetIndex: number) => {
    e.preventDefault()
    e.stopPropagation()

    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null)
      setDragOverIndex(null)
      return
    }

    const newFiles = [...files]
    const [draggedItem] = newFiles.splice(draggedIndex, 1)
    newFiles.splice(targetIndex, 0, draggedItem)
    onReorderFiles(newFiles)

    setDraggedIndex(null)
    setDragOverIndex(null)
  }, [draggedIndex, files, onReorderFiles])

  return (
    <div className="space-y-4">
      {/* Header with count and clear button */}
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {files.length === 1 ? t('fileSelected', { count: 1 }) : t('filesSelected', { count: files.length })}
          {files.length >= MAX_FILES && (
            <span className="text-gray-500 dark:text-gray-400 font-normal"> {t('maxReached')}</span>
          )}
        </p>
        <button
          onClick={handleClearClick}
          disabled={isUploading}
          className="text-sm text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 font-medium disabled:opacity-50"
        >
          {t('clearAll')}
        </button>
      </div>

      {/* Clear Confirmation Dialog */}
      {showClearConfirm && (
        <div className="mb-4 p-3 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-3">
            <svg className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div className="flex-1">
              <p className="text-amber-700 dark:text-amber-400 text-sm font-medium">{t('clearConfirmTitle', { count: files.length })}</p>
              <p className="text-amber-600 dark:text-amber-500 text-xs mt-1">{t('clearConfirmDesc')}</p>
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => { onClearAll(); setShowClearConfirm(false); }}
                  className="px-3 py-1.5 text-xs font-medium text-white bg-red-600 hover:bg-red-700 rounded-md transition-colors"
                >
                  {t('clearAll')}
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3 py-1.5 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-md transition-colors"
                >
                  {t('cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reorder hint */}
      {files.length > 1 && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          {t('reorderHint')}
        </p>
      )}

      {/* Thumbnail Grid */}
      <div
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onDrop={onDrop}
        className={`
          grid grid-cols-2 xs:grid-cols-3 md:grid-cols-4 gap-2 xs:gap-3 p-2 xs:p-3 rounded-xl border-2 border-dashed transition-colors
          ${isDragging
            ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
            : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50'
          }
        `}
      >
        {files.map((sf, index) => (
          <div
            key={sf.id}
            draggable={!isUploading && files.length > 1}
            onDragStart={(e) => handleThumbnailDragStart(e, index)}
            onDragEnd={handleThumbnailDragEnd}
            onDragOver={(e) => handleThumbnailDragOver(e, index)}
            onDragLeave={handleThumbnailDragLeave}
            onDrop={(e) => handleThumbnailDrop(e, index)}
            className={`
              relative group bg-white dark:bg-gray-700 rounded-lg overflow-hidden shadow-sm transition-all
              ${files.length > 1 ? 'cursor-grab active:cursor-grabbing' : ''}
              ${draggedIndex === index ? 'opacity-50 scale-95' : ''}
              ${dragOverIndex === index ? 'ring-2 ring-violet-500 ring-offset-2 dark:ring-offset-gray-800' : ''}
            `}
          >
            {/* Page Number Badge */}
            <div className="absolute top-1 left-1 z-10 px-1.5 py-0.5 bg-black/70 text-white text-xs font-medium rounded flex items-center gap-1">
              <span>{FILE_ICONS[sf.category]}</span>
              <span>{index + 1}</span>
            </div>

            {/* Thumbnail - Image or Document Icon */}
            <div className="relative aspect-square">
              {sf.category === 'image' && sf.preview ? (
                <Image
                  src={sf.preview}
                  alt={sf.file.name}
                  fill
                  className="object-cover pointer-events-none"
                />
              ) : (
                /* Document preview - icon + filename */
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-600 dark:to-gray-700 p-2">
                  <span className="text-4xl mb-1">{FILE_ICONS[sf.category]}</span>
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-medium">
                    {sf.category}
                  </span>
                </div>
              )}

              {/* Overlay controls - visible on hover */}
              <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors">
                {/* Drag handle indicator */}
                {files.length > 1 && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <svg className="w-8 h-8 text-white drop-shadow-lg" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM8 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 6a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 12a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM14 18a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
                    </svg>
                  </div>
                )}

                {/* Remove button */}
                <button
                  onClick={(e) => { e.stopPropagation(); onRemoveFile(sf.id); }}
                  disabled={isUploading}
                  className="absolute top-1 right-1 p-1.5 bg-black/60 hover:bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all disabled:opacity-50"
                  aria-label={`Remove ${sf.file.name}`}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                {/* Reorder arrows */}
                {files.length > 1 && (
                  <div className="absolute bottom-1 right-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {/* Move left/up */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveUp(index); }}
                      disabled={isUploading || index === 0}
                      className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move earlier"
                      title="Move earlier"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                      </svg>
                    </button>
                    {/* Move right/down */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleMoveDown(index); }}
                      disabled={isUploading || index === files.length - 1}
                      className="p-1 bg-black/60 hover:bg-black/80 text-white rounded disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label="Move later"
                      title="Move later"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* File info */}
            <div className="p-2">
              <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                {sf.file.name}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {formatFileSize(sf.file.size)}
              </p>
            </div>
          </div>
        ))}

        {/* Add More Images Button */}
        {files.length < MAX_FILES && (
          <button
            onClick={onAddMoreClick}
            disabled={isUploading}
            className="aspect-square flex flex-col items-center justify-center bg-white dark:bg-gray-700 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600 hover:border-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors disabled:opacity-50"
          >
            <svg className="w-8 h-8 text-gray-400 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">{t('addMore')}</span>
          </button>
        )}
      </div>
    </div>
  )
}
