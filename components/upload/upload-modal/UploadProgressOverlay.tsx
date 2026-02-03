'use client'

import { useTranslations } from 'next-intl'
import { type UploadProgress, type SelectedFile } from './types'
import { formatFileSize } from './helpers'

interface UploadProgressOverlayProps {
  progress: UploadProgress
  files: SelectedFile[]
}

/**
 * Overlay showing upload progress
 */
export default function UploadProgressOverlay({
  progress,
  files,
}: UploadProgressOverlayProps) {
  const t = useTranslations('upload')

  const totalSize = files.reduce((acc, f) => acc + f.file.size, 0)
  const isLargeUpload = totalSize > 5 * 1024 * 1024

  return (
    <div className="px-4 sm:px-6 py-3 bg-violet-50 dark:bg-violet-900/30 border-t border-violet-100 dark:border-violet-800">
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="w-8 h-8 border-2 border-violet-200 dark:border-violet-700 rounded-full" />
          <div className="absolute top-0 left-0 w-8 h-8 border-2 border-violet-600 dark:border-violet-400 rounded-full border-t-transparent animate-spin" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-violet-700 dark:text-violet-300">
            {progress.status === 'uploading' && (
              <>{files.length === 1
                ? t('uploadingFile', { count: files.length })
                : t('uploadingFiles', { count: files.length })}</>
            )}
            {progress.status === 'processing' && (
              <>{t('processing')}</>
            )}
            {progress.status === 'complete' && (
              <>{t('uploadComplete')}</>
            )}
          </p>
          {progress.status === 'uploading' && (
            <p className="text-xs text-violet-600 dark:text-violet-400">
              {isLargeUpload ? t('largeFileHint') : t('uploadWait')}
            </p>
          )}
          {progress.status === 'processing' && (
            <p className="text-xs text-violet-600 dark:text-violet-400">
              {t('processingWait')}
            </p>
          )}
        </div>
      </div>
      {/* Progress bar */}
      <div className="mt-2 h-1.5 bg-violet-200 dark:bg-violet-800 rounded-full overflow-hidden">
        <div
          className={`h-full bg-violet-600 dark:bg-violet-400 rounded-full transition-all duration-500 ${
            progress.status === 'uploading' || progress.status === 'processing' ? 'animate-pulse' : ''
          }`}
          style={{
            width: progress.status === 'complete' ? '100%' : progress.status === 'processing' ? '80%' : '60%'
          }}
        />
      </div>
      {/* File count indicator */}
      {progress.status === 'uploading' && files.length > 1 && (
        <p className="mt-1.5 text-xs text-violet-500 dark:text-violet-400 text-center">
          {t('fileCount', { count: files.length })} &bull; {t('totalSize', { size: formatFileSize(totalSize) })}
        </p>
      )}
    </div>
  )
}
