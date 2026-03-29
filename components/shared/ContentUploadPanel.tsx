'use client'

import { useState, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import {
  validateFile,
  validateImageFile,
} from '@/lib/upload/direct-upload'

export interface ContentInput {
  mode: 'text' | 'files'
  textContent?: string
  files?: File[]
  fileType?: 'image' | 'pptx' | 'docx'
}

export interface ContentUploadPanelProps {
  onContentReady: (content: ContentInput | null) => void
  isDisabled?: boolean
  compact?: boolean
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']
const DOC_EXTENSIONS = ['docx', 'pptx']

function getFileExtension(file: File): string {
  return file.name.split('.').pop()?.toLowerCase() || ''
}

function isImageFile(file: File): boolean {
  return IMAGE_EXTENSIONS.includes(getFileExtension(file))
}

function isDocFile(file: File): boolean {
  return DOC_EXTENSIONS.includes(getFileExtension(file))
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

const MIN_TEXT_LENGTH = 50

export default function ContentUploadPanel({
  onContentReady,
  isDisabled = false,
  compact = false,
}: ContentUploadPanelProps) {
  const t = useTranslations('contentUpload')
  const [mode, setMode] = useState<'files' | 'text'>('files')
  const [textContent, setTextContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileSelection = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return
    setError(null)

    const images = newFiles.filter(isImageFile)
    const docs = newFiles.filter(isDocFile)
    const unknown = newFiles.filter(f => !isImageFile(f) && !isDocFile(f))

    if (unknown.length > 0) {
      setError(`Unsupported files: ${unknown.map(f => f.name).join(', ')}`)
      onContentReady(null)
      return
    }

    if (images.length > 0 && docs.length > 0) {
      setError('Please upload either images OR a document, not both.')
      onContentReady(null)
      return
    }

    if (docs.length > 1) {
      setError('Please upload one document at a time.')
      onContentReady(null)
      return
    }

    if (images.length > 10) {
      setError('Maximum 10 images allowed.')
      onContentReady(null)
      return
    }

    for (const file of images) {
      const v = validateImageFile(file)
      if (!v.valid) {
        setError(`${file.name}: ${v.error}`)
        onContentReady(null)
        return
      }
    }

    for (const file of docs) {
      const v = validateFile(file)
      if (!v.valid) {
        setError(`${file.name}: ${v.error}`)
        onContentReady(null)
        return
      }
    }

    setFiles(newFiles)

    const fileType = images.length > 0
      ? 'image' as const
      : getFileExtension(docs[0]) === 'pptx'
        ? 'pptx' as const
        : 'docx' as const

    onContentReady({ mode: 'files', files: newFiles, fileType })
  }, [onContentReady])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (!isDisabled) setIsDragging(true)
  }, [isDisabled])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (!isDisabled) {
      handleFileSelection(Array.from(e.dataTransfer.files))
    }
  }, [isDisabled, handleFileSelection])

  const removeFile = (index: number) => {
    const updated = files.filter((_, i) => i !== index)
    setFiles(updated)
    setError(null)
    if (updated.length === 0) {
      onContentReady(null)
    } else {
      const fileType = isImageFile(updated[0])
        ? 'image' as const
        : getFileExtension(updated[0]) === 'pptx'
          ? 'pptx' as const
          : 'docx' as const
      onContentReady({ mode: 'files', files: updated, fileType })
    }
  }

  const handleTextChange = (value: string) => {
    setTextContent(value)
    if (value.length >= MIN_TEXT_LENGTH) {
      onContentReady({ mode: 'text', textContent: value })
    } else {
      onContentReady(null)
    }
  }

  const switchMode = (newMode: 'files' | 'text') => {
    setMode(newMode)
    setError(null)
    // Notify parent that content is cleared on mode switch
    if (newMode === 'files' && files.length === 0) {
      onContentReady(null)
    } else if (newMode === 'files' && files.length > 0) {
      const fileType = isImageFile(files[0])
        ? 'image' as const
        : getFileExtension(files[0]) === 'pptx'
          ? 'pptx' as const
          : 'docx' as const
      onContentReady({ mode: 'files', files, fileType })
    } else if (newMode === 'text' && textContent.length >= MIN_TEXT_LENGTH) {
      onContentReady({ mode: 'text', textContent })
    } else {
      onContentReady(null)
    }
  }

  const padding = compact ? 'p-4' : 'p-6'
  const dropPadding = compact ? 'p-4' : 'p-6'

  return (
    <div className={`${isDisabled ? 'opacity-60 pointer-events-none' : ''}`}>
      {/* Mode Tabs */}
      <div className="flex gap-1 p-1 rounded-lg bg-gray-100 dark:bg-gray-700 mb-4">
        <button
          type="button"
          onClick={() => switchMode('files')}
          disabled={isDisabled}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'files'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.files')}
        </button>
        <button
          type="button"
          onClick={() => switchMode('text')}
          disabled={isDisabled}
          className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
            mode === 'text'
              ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
              : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
          }`}
        >
          {t('tabs.text')}
        </button>
      </div>

      {mode === 'files' ? (
        <>
          {/* Drop Zone */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isDisabled && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl ${dropPadding} text-center cursor-pointer transition-colors ${
              isDragging
                ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/20'
                : files.length > 0
                  ? 'border-green-300 dark:border-green-700 bg-green-50/50 dark:bg-green-900/10'
                  : 'border-gray-300 dark:border-gray-600 hover:border-violet-400 dark:hover:border-violet-600'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.docx,.pptx"
              disabled={isDisabled}
              onChange={(e) => {
                if (e.target.files) handleFileSelection(Array.from(e.target.files))
                e.target.value = ''
              }}
            />
            <div className="text-4xl mb-2">
              {files.length > 0 ? (
                <svg className="w-10 h-10 mx-auto text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="w-10 h-10 mx-auto text-gray-400 dark:text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              )}
            </div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {files.length > 0
                ? t('files.selected', { count: files.length })
                : t('files.dragDrop')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
              {t('files.fileTypes')}
            </p>
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">
              {t('files.maxSize')}
            </p>
          </div>

          {/* File Previews */}
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center justify-between p-3 rounded-xl bg-gray-50 dark:bg-gray-700/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="flex-shrink-0">
                      {isImageFile(file) ? (
                        <svg className="w-5 h-5 text-violet-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      ) : (
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      )}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                    disabled={isDisabled}
                    className="flex-shrink-0 p-1 text-gray-400 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      ) : (
        /* Text mode */
        <div>
          <textarea
            value={textContent}
            onChange={(e) => handleTextChange(e.target.value)}
            placeholder={t('text.placeholder')}
            disabled={isDisabled}
            rows={compact ? 6 : 8}
            className={`w-full ${padding} rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent transition-colors`}
          />
          <div className="flex items-center justify-between mt-2">
            <p className={`text-xs ${textContent.length >= MIN_TEXT_LENGTH ? 'text-green-500 dark:text-green-400' : 'text-gray-400 dark:text-gray-500'}`}>
              {t('text.charCount', { count: textContent.length })}
            </p>
            {textContent.length > 0 && textContent.length < MIN_TEXT_LENGTH && (
              <p className="text-xs text-amber-500 dark:text-amber-400">
                {t('text.minChars')}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
    </div>
  )
}
