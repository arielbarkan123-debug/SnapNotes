'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { createBrowserClient } from '@supabase/ssr'
import {
  uploadFileToStorage,
  uploadImagesToStorage,
  validateFile,
  validateImageFile,
  generateCourseId,
} from '@/lib/upload/direct-upload'

type InputMode = 'files' | 'text'
type Stage = 'idle' | 'uploading' | 'processing' | 'generating'

interface PrepareUploadModalProps {
  isOpen: boolean
  onClose: () => void
  onGenerated: (guideId: string) => void
}

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif', 'gif']
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

export default function PrepareUploadModal({ isOpen, onClose, onGenerated }: PrepareUploadModalProps) {
  const t = useTranslations('prepare')
  const [mode, setMode] = useState<InputMode>('files')
  const [textContent, setTextContent] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const isWorking = stage !== 'idle'

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isWorking) onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, onClose, isWorking])

  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [isOpen])

  const handleFileSelection = useCallback((newFiles: File[]) => {
    if (newFiles.length === 0) return
    setError(null)

    const images = newFiles.filter(isImageFile)
    const docs = newFiles.filter(isDocFile)
    const unknown = newFiles.filter(f => !isImageFile(f) && !isDocFile(f))

    if (unknown.length > 0) {
      setError(`Unsupported files: ${unknown.map(f => f.name).join(', ')}. Use images (JPG, PNG, HEIC) or documents (DOCX, PPTX).`)
      return
    }

    if (images.length > 0 && docs.length > 0) {
      setError('Please upload either images OR a document, not both.')
      return
    }

    if (docs.length > 1) {
      setError('Please upload one document at a time.')
      return
    }

    for (const file of images) {
      const v = validateImageFile(file)
      if (!v.valid) { setError(`${file.name}: ${v.error}`); return }
    }
    for (const file of docs) {
      const v = validateFile(file)
      if (!v.valid) { setError(`${file.name}: ${v.error}`); return }
    }

    if (images.length > 10) {
      setError('Maximum 10 images allowed.')
      return
    }

    setFiles(newFiles)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    handleFileSelection(Array.from(e.dataTransfer.files))
  }, [handleFileSelection])

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index))
  }

  /** Convert pasted HTML hyperlinks to markdown format so the AI preserves them */
  const handlePaste = useCallback((e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const html = e.clipboardData.getData('text/html')
    if (!html || !html.includes('<a ')) return // No links in paste — use default behavior

    e.preventDefault()

    // Use plain text as base, then overlay markdown links extracted from HTML
    let text = e.clipboardData.getData('text/plain') || ''

    // Extract all <a href="...">text</a> pairs from the HTML via matchAll
    const linkRegex = /<a\s[^>]*href=["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi
    const matches = Array.from(html.matchAll(linkRegex))
    for (const m of matches) {
      const url = m[1]
      // Strip any nested HTML tags from the link text
      const linkText = m[2].replace(/<[^>]*>/g, '').trim()
      if (url && linkText && text.includes(linkText)) {
        // Replace the first occurrence of the plain link text with markdown link
        text = text.replace(linkText, `[${linkText}](${url})`)
      }
    }

    // Insert at cursor position
    const textarea = e.currentTarget
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = textContent.slice(0, start)
    const after = textContent.slice(end)
    setTextContent(before + text + after)
  }, [textContent])

  /** Consume SSE stream from the generation API */
  const consumeSSE = async (response: Response): Promise<void> => {
    const reader = response.body?.getReader()
    if (!reader) throw new Error('No response stream')

    const decoder = new TextDecoder()
    let buffer = ''
    let currentEvent = ''
    let lastEventType = ''
    let lastEventData = ''
    let eventCount = 0
    const startTime = Date.now()

    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() || ''

      for (const line of lines) {
        if (line.startsWith('event: ')) {
          currentEvent = line.slice(7).trim()
        } else if (line.startsWith('data: ') && currentEvent) {
          eventCount++
          lastEventType = currentEvent
          lastEventData = line.slice(6)
          try {
            const data = JSON.parse(line.slice(6))
            if (currentEvent === 'status') {
              setStatusMessage(data.message || '')
            } else if (currentEvent === 'complete') {
              onGenerated(data.guideId)
              return
            } else if (currentEvent === 'error') {
              throw new Error(data.message || 'Generation failed')
            }
            // Ignore heartbeat events
          } catch (e) {
            if (e instanceof Error && !e.message.includes('Unexpected token')) {
              throw e
            }
          }
          currentEvent = ''
        } else if (line === '') {
          currentEvent = ''
        }
      }
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1)
    throw new Error(
      `Stream ended after ${elapsed}s (${eventCount} events). Last: ${lastEventType}=${lastEventData.slice(0, 200)}`
    )
  }

  const startGeneration = async (params: {
    content: string
    sourceType: string
    imageUrls?: string[]
    documentUrl?: string
  }) => {
    setStage('generating')
    setStatusMessage(t('generate.generating'))

    const res = await fetch('/api/prepare/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!res.ok) throw new Error('Failed to start generation')
    await consumeSSE(res)
  }

  const handleGenerate = async () => {
    setError(null)

    try {
      if (mode === 'text') {
        if (!textContent.trim() || textContent.trim().length < 20) {
          setError('Please provide at least 20 characters of content.')
          return
        }
        await startGeneration({ content: textContent.trim(), sourceType: 'text' })
        return
      }

      // File mode
      if (files.length === 0) {
        setError('Please select files to upload.')
        return
      }

      setStage('uploading')

      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Please log in to continue.')

      if (isImageFile(files[0])) {
        // Image upload flow
        const batchId = generateCourseId()
        setStatusMessage('Uploading images...')

        const results = await uploadImagesToStorage(files, user.id, batchId, (current, total) => {
          setStatusMessage(`Uploading image ${current}/${total}...`)
        })

        setStatusMessage('Processing images...')
        const signRes = await fetch('/api/sign-image-urls', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePaths: results.map(r => r.storagePath),
            courseId: batchId,
          }),
        })

        if (!signRes.ok) throw new Error('Failed to process images')
        const signData = await signRes.json()
        const imageUrls = signData.images.map((img: { url: string }) => img.url)

        await startGeneration({
          content: `[${files.length} uploaded images]`,
          sourceType: 'image',
          imageUrls,
        })
      } else {
        // Document upload flow
        setStatusMessage('Uploading document...')
        const { storagePath, fileType } = await uploadFileToStorage(files[0], user.id)

        setStage('processing')
        setStatusMessage('Extracting text from document...')

        const processRes = await fetch('/api/process-document', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            storagePath,
            fileName: files[0].name,
            fileType,
          }),
        })

        if (!processRes.ok) throw new Error('Failed to process document')
        const processData = await processRes.json()

        let extractedText = ''
        if (processData.extractedContent?.sections) {
          extractedText = processData.extractedContent.sections
            .map((s: { title?: string; content: string }) =>
              s.title ? `## ${s.title}\n${s.content}` : s.content
            )
            .join('\n\n')
        } else if (typeof processData.extractedContent === 'string') {
          extractedText = processData.extractedContent
        }

        if (!extractedText || extractedText.length < 20) {
          throw new Error('Could not extract enough text from the document. Try uploading photos of the pages instead.')
        }

        await startGeneration({
          content: extractedText,
          sourceType: fileType,
          documentUrl: storagePath,
        })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStage('idle')
    }
  }

  const reset = () => {
    setFiles([])
    setTextContent('')
    setError(null)
    setStage('idle')
    setStatusMessage('')
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={!isWorking ? onClose : undefined}
      />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white dark:bg-gray-800 rounded-2xl shadow-xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {t('generate.title')}
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {t('generate.description')}
              </p>
            </div>
            {!isWorking && (
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {isWorking ? (
            /* Progress */
            <div className="text-center py-12">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-violet-100 dark:bg-violet-900/30 mb-4">
                <svg className="w-8 h-8 text-violet-600 dark:text-violet-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              </div>
              <p className="text-lg font-medium text-gray-900 dark:text-white mb-1">{statusMessage}</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('generate.generatingDescription')}</p>
            </div>
          ) : (
            <>
              {/* Mode Tabs */}
              <div className="flex gap-1 p-1 rounded-xl bg-gray-100 dark:bg-gray-700 mb-4">
                <button
                  onClick={() => { setMode('files'); setError(null) }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'files'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Upload Files
                </button>
                <button
                  onClick={() => { setMode('text'); setError(null) }}
                  className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors ${
                    mode === 'text'
                      ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  Paste Text
                </button>
              </div>

              {mode === 'files' ? (
                <>
                  {/* Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`relative border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-colors ${
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
                      onChange={(e) => {
                        if (e.target.files) handleFileSelection(Array.from(e.target.files))
                        e.target.value = ''
                      }}
                    />
                    <div className="text-4xl mb-3">{files.length > 0 ? '✅' : '📎'}</div>
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      {files.length > 0
                        ? `${files.length} file${files.length !== 1 ? 's' : ''} selected — click or drop to change`
                        : 'Drop files here or click to browse'}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Images (JPG, PNG, HEIC) or Documents (DOCX, PPTX)
                    </p>
                  </div>

                  {/* File Previews */}
                  {files.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {files.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-gray-700/50"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span className="text-lg">{isImageFile(file) ? '🖼️' : '📄'}</span>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                {file.name}
                              </p>
                              <p className="text-xs text-gray-400">
                                {(file.size / 1024 / 1024).toFixed(1)} MB
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={(e) => { e.stopPropagation(); removeFile(i) }}
                            className="p-1 text-gray-400 hover:text-red-500 transition-colors"
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
                <textarea
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  onPaste={handlePaste}
                  placeholder={t('generate.textPlaceholder')}
                  className="w-full h-64 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder:text-gray-400 resize-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                />
              )}

              {/* Error */}
              {error && (
                <div className="mt-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              )}

              {/* Footer */}
              <div className="flex items-center justify-between mt-4">
                <span className="text-xs text-gray-400">
                  {mode === 'text'
                    ? `${textContent.length} characters`
                    : `${files.length} file${files.length !== 1 ? 's' : ''} selected`}
                </span>
                <div className="flex gap-3">
                  <button
                    onClick={() => { reset(); onClose() }}
                    className="px-4 py-2 rounded-xl text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleGenerate}
                    disabled={mode === 'text' ? textContent.trim().length < 20 : files.length === 0}
                    className="px-6 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-rose-500 text-white font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                  >
                    Generate
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
