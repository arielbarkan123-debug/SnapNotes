# X+1 — Layouts & Shared Shell Components

Root layout, auth/main/admin layouts, and global shell components (Header, SideNav, BottomTabBar, Providers).

---

## `app/(admin)/layout.tsx`

```tsx
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import AdminNav from '@/components/admin/AdminNav'
import { createLogger } from '@/lib/logger'


const log = createLogger('page:layoutx')
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    log.info('No user found, redirecting to login')
    redirect('/login')
  }

  log.info({ detail: [user.id, user.email] }, 'User found')

  // Use service client to bypass RLS for admin check
  const serviceClient = createServiceClient()
  const { data: adminUser, error } = await serviceClient
    .from('admin_users')
    .select('id, role')
    .eq('user_id', user.id)
    .maybeSingle()

  log.info({ detail: { adminUser, error } }, 'Admin check result')

  if (!adminUser) {
    log.info('Not an admin, redirecting to dashboard')
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
      {/* Admin Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <Link href="/dashboard" className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </Link>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                Admin Dashboard
              </h1>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {user.email}
              </span>
              <span className="px-2 py-1 text-xs font-medium bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-300 rounded">
                {adminUser.role}
              </span>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-[calc(100vh-4rem)] bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700">
          <AdminNav />
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
```

---

## `app/(auth)/layout.tsx`

```tsx
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen aurora-bg">
      {children}
    </div>
  )
}
```

---

## `app/(auth)/login/layout.tsx`

```tsx
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

export const metadata: Metadata = {
  title: 'Log In',
  description: 'Sign in to your X+1 account to continue your learning journey.',
  alternates: {
    canonical: `${APP_URL}/login`,
  },
}

export default function LoginLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

---

## `app/(auth)/signup/layout.tsx`

```tsx
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

export const metadata: Metadata = {
  title: 'Sign Up',
  description: 'Create your free X+1 account and start your AI-powered learning journey today.',
  alternates: {
    canonical: `${APP_URL}/signup`,
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

---

## `app/(main)/layout.tsx`

```tsx
import { Suspense } from 'react'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import Sidebar from '@/components/ui/Sidebar'
import NavigationProgress from '@/components/ui/NavigationProgress'
import OfflineIndicator from '@/components/ui/OfflineIndicator'
import FloatingHelpButtons from '@/components/help/FloatingHelpButtons'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Check if user is admin
  let isAdmin = false
  if (user) {
    const serviceClient = createServiceClient()
    const { data: adminUser } = await serviceClient
      .from('admin_users')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle()
    isAdmin = !!adminUser
  }

  return (
    <div className="min-h-screen aurora-bg">
      <Suspense fallback={null}>
        <NavigationProgress />
      </Suspense>
      <Sidebar
        userEmail={user?.email}
        userName={user?.user_metadata?.name}
        isAdmin={isAdmin}
      />
      <main className="sidebar-main min-h-screen">
        <FloatingHelpButtons>
          {children}
        </FloatingHelpButtons>
      </main>
      <OfflineIndicator />
    </div>
  )
}
```

---

## `app/(main)/practice/layout.tsx`

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Practice',
  description: 'Practice and test your knowledge with AI-generated questions',
}

export default function PracticeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

---

## `app/(main)/review/layout.tsx`

```tsx
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Review',
  description: 'Review your study materials with spaced repetition',
}

export default function ReviewLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
```

---

## `app/layout.tsx`

```tsx
import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans, Rubik } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages } from "next-intl/server";
import "./globals.css";
import Providers from "@/components/Providers";
import { isRTL, type Locale } from "@/i18n/config";
import SwCachePurgeScript from "@/components/SwCachePurgeScript";
import CookieConsent from "@/components/CookieConsent";
import JsonLd from "@/components/JsonLd";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700', '800'],
  variable: '--font-sans',
});

// Hebrew-supporting font
const rubik = Rubik({
  subsets: ["hebrew", "latin"],
  variable: "--font-rubik",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'
  ),
  title: {
    default: "X+1 — Learn anything. Master everything.",
    template: "%s | X+1",
  },
  description:
    "AI-powered learning platform that transforms your notes, homework, and study materials into interactive courses, practice sessions, and personalized tutoring.",
  keywords: [
    "AI learning",
    "AI tutor",
    "study courses",
    "homework help",
    "exam prep",
    "education",
    "student tools",
    "X+1",
  ],
  authors: [{ name: "X+1" }],
  creator: "X+1",
  publisher: "X+1",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "X+1",
    title: "X+1 — Learn anything. Master everything.",
    description:
      "AI-powered learning platform that transforms your notes into interactive courses, practice sessions, and personalized tutoring.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "X+1 — AI-powered learning platform",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "X+1 — Learn anything. Master everything.",
    description:
      "AI-powered learning platform that transforms your notes into interactive courses, practice sessions, and personalized tutoring.",
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-touch-icon.png",
  },
  manifest: "/manifest.json",
  alternates: {
    canonical: "/",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#111827" },
  ],
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale() as Locale;
  const messages = await getMessages();
  const dir = isRTL(locale) ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} suppressHydrationWarning>
      <head>
        <SwCachePurgeScript />
        <JsonLd />
      </head>
      <body
        className={`${plusJakarta.variable} ${rubik.variable} antialiased bg-white dark:bg-gray-900 text-gray-900 dark:text-white`}
      >
        <NextIntlClientProvider messages={messages}>
          <Providers>
            {children}
            <CookieConsent />
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

---

## `components/Providers.tsx`

```tsx
'use client'

import { useEffect } from 'react'
import { type ReactNode } from 'react'
import { migrateLocalStorage } from '@/lib/migrate-local-storage'
import { ThemeProvider } from 'next-themes'
import { ErrorBoundary } from './ErrorBoundary'
import { ToastProvider } from '@/contexts/ToastContext'
import { XPProvider } from '@/contexts/XPContext'
import { VisualsProvider } from '@/contexts/VisualsContext'
import { SWRProvider } from './providers/SWRProvider'
import { AnalyticsProvider } from './providers/AnalyticsProvider'
import { PWAProvider } from './providers/PWAProvider'
import { MonitoringProvider } from './providers/MonitoringProvider'
import { PostHogProvider } from './providers/PostHogProvider'

interface ProvidersProps {
  children: ReactNode
}

export function Providers({ children }: ProvidersProps) {
  useEffect(() => { migrateLocalStorage() }, [])

  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
        <MonitoringProvider>
          <PostHogProvider>
          <SWRProvider>
            <AnalyticsProvider>
              <PWAProvider>
                <ToastProvider>
                  <XPProvider>
                    <VisualsProvider>
                      {children}
                    </VisualsProvider>
                  </XPProvider>
                </ToastProvider>
              </PWAProvider>
            </AnalyticsProvider>
          </SWRProvider>
          </PostHogProvider>
        </MonitoringProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default Providers
```

---

## `components/shared/ContentUploadPanel.tsx`

```tsx
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
```

---

## `components/shared/DifficultyFeedback.tsx`

```tsx
'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'

interface DifficultyFeedbackProps {
  onFeedback: (feedback: 'too_easy' | 'too_hard') => void
  namespace?: 'review' | 'practice'
}

export default function DifficultyFeedback({ onFeedback, namespace = 'review' }: DifficultyFeedbackProps) {
  const [given, setGiven] = useState(false)
  const t = useTranslations(namespace)

  const handleFeedback = (feedback: 'too_easy' | 'too_hard') => {
    if (given) return
    setGiven(true)
    onFeedback(feedback)
  }

  if (given) {
    return (
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-2">
        {t('feedbackThanks')}
      </p>
    )
  }

  return (
    <div className="flex items-center justify-center gap-2 mt-2">
      <button
        onClick={() => handleFeedback('too_easy')}
        className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {t('tooEasy')}
      </button>
      <button
        onClick={() => handleFeedback('too_hard')}
        className="px-3 py-1 text-xs font-medium border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-400 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        {t('tooHard')}
      </button>
    </div>
  )
}
```

---

## `components/ui/Button.tsx`

```tsx
'use client'

import { forwardRef } from 'react'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  showLoadingSpinner?: boolean
  children: React.ReactNode
  className?: string
}

interface ButtonAsButton extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: never
}

interface ButtonAsLink extends ButtonBaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  href: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 focus:ring-violet-500',
  secondary: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-w-[80px] min-h-[44px]',
  md: 'px-4 py-2 text-sm min-w-[100px]',
  lg: 'px-6 py-3 text-base min-w-[120px]',
}

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: ButtonSize
  className?: string
}

function ButtonSpinner({ size = 'md', className = '' }: SpinnerProps) {
  const spinnerSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ============================================================================
// Button Component
// ============================================================================

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      showLoadingSpinner = true,
      children,
      className = '',
      ...rest
    } = props

    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-full
      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

    // Determine loading content
    const loadingContent = () => {
      if (!showLoadingSpinner) {
        return loadingText || children
      }

      if (loadingText) {
        return (
          <>
            <ButtonSpinner size={size} className="-ml-1 mr-2" />
            {loadingText}
          </>
        )
      }

      // Show spinner only (no text) when no loadingText provided
      return (
        <>
          <ButtonSpinner size={size} className="-ml-1 mr-2" />
          <span className="opacity-0">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <ButtonSpinner size={size} />
          </span>
        </>
      )
    }

    const content = isLoading ? loadingContent() : children

    // Render as link
    if ('href' in rest && rest.href) {
      const linkClassName = isLoading
        ? `${combinedClassName} pointer-events-none opacity-50 cursor-not-allowed`
        : combinedClassName

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={linkClassName}
          aria-disabled={isLoading}
          aria-busy={isLoading}
          tabIndex={isLoading ? -1 : undefined}
          {...(rest as ButtonAsLink)}
        >
          {content}
        </Link>
      )
    }

    // Render as button
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={`${combinedClassName} ${isLoading ? 'relative' : ''}`}
        disabled={isLoading || (rest as ButtonAsButton).disabled}
        aria-busy={isLoading}
        {...(rest as ButtonAsButton)}
      >
        {content}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
```

---

## `components/ui/ConfirmDialog.tsx`

```tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import Button from './Button'

type DialogVariant = 'danger' | 'warning' | 'info'

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  description?: string
  confirmText?: string
  loadingText?: string
  cancelText?: string
  variant?: DialogVariant
  isLoading?: boolean
}

const variantConfig = {
  danger: {
    icon: (
      <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    ),
    bgColor: 'bg-red-100 dark:bg-red-900/30',
    buttonVariant: 'danger' as const,
  },
  warning: {
    icon: (
      <svg className="w-8 h-8 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
    ),
    bgColor: 'bg-amber-100 dark:bg-amber-900/30',
    buttonVariant: 'primary' as const,
  },
  info: {
    icon: (
      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
    bgColor: 'bg-blue-100 dark:bg-blue-900/30',
    buttonVariant: 'primary' as const,
  },
}

// Track number of open modals to prevent overflow conflicts
let openModalCount = 0

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  description,
  confirmText = 'Confirm',
  loadingText,
  cancelText = 'Cancel',
  variant = 'danger',
  isLoading = false,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null)
  const hasSetOverflow = useRef(false)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  // Store the previously focused element when dialog opens
  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  // Restore focus when dialog closes
  const handleClose = useCallback(() => {
    onClose()
    // Restore focus to the element that triggered the dialog
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      // Use setTimeout to ensure the dialog is fully closed before restoring focus
      setTimeout(() => {
        previousActiveElement.current?.focus()
      }, 0)
    }
  }, [onClose])

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose, isLoading])

  // Prevent body scroll when modal is open - use counter to handle nested modals
  useEffect(() => {
    if (isOpen && !hasSetOverflow.current) {
      openModalCount++
      hasSetOverflow.current = true
      document.body.style.overflow = 'hidden'
    }

    return () => {
      if (hasSetOverflow.current) {
        openModalCount--
        hasSetOverflow.current = false
        // Only restore overflow when no modals are open
        if (openModalCount === 0) {
          document.body.style.overflow = ''
        }
      }
    }
  }, [isOpen])

  // Focus trap
  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const config = variantConfig[variant]

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isLoading ? undefined : handleClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="dialog-title"
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Icon */}
        <div className="pt-6 flex justify-center">
          <div className={`w-16 h-16 ${config.bgColor} rounded-full flex items-center justify-center`}>
            {config.icon}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h3
            id="dialog-title"
            className="text-xl font-semibold text-gray-900 dark:text-white mb-2"
          >
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-2">
            {message}
          </p>
          {description && (
            <p className="text-sm text-gray-500 dark:text-gray-500">
              {description}
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {cancelText}
          </Button>
          <Button
            variant={config.buttonVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            loadingText={loadingText}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## `components/ui/ConfirmModal.tsx`

```tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import Button from '@/components/ui/Button'

interface ConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'danger' | 'warning' | 'info'
  isLoading?: boolean
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  cancelLabel,
  variant = 'warning',
  isLoading = false,
}: ConfirmModalProps) {
  const t = useTranslations('common.confirmModal')
  const dialogRef = useRef<HTMLDivElement>(null)
  const previousActiveElement = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (isOpen) {
      previousActiveElement.current = document.activeElement as HTMLElement
    }
  }, [isOpen])

  const handleClose = useCallback(() => {
    onClose()
    if (previousActiveElement.current && typeof previousActiveElement.current.focus === 'function') {
      setTimeout(() => {
        previousActiveElement.current?.focus()
      }, 0)
    }
  }, [onClose])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isLoading) {
        handleClose()
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [isOpen, handleClose, isLoading])

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden'
    }
    return () => {
      if (isOpen) {
        document.body.style.overflow = ''
      }
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen && dialogRef.current) {
      dialogRef.current.focus()
    }
  }, [isOpen])

  if (!isOpen) return null

  const iconColors = {
    danger: 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400',
    warning: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    info: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
  }

  const confirmVariant = variant === 'danger' ? 'danger' : 'primary'

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 bg-black/50 backdrop-blur-sm"
      onClick={isLoading ? undefined : handleClose}
      aria-hidden="true"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="relative w-full sm:max-w-md bg-white dark:bg-gray-800 rounded-t-2xl sm:rounded-2xl shadow-2xl outline-none"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {/* Icon */}
        <div className="pt-6 flex justify-center">
          <div className={`w-14 h-14 rounded-full flex items-center justify-center ${iconColors[variant]}`}>
            {variant === 'danger' ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
              </svg>
            ) : variant === 'warning' ? (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            ) : (
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 text-center">
          <h3 id="confirm-dialog-title" className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {title}
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 p-4 sm:p-6 pt-0">
          <Button
            variant="secondary"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {cancelLabel || t('cancel')}
          </Button>
          <Button
            variant={confirmVariant}
            onClick={onConfirm}
            disabled={isLoading}
            isLoading={isLoading}
            className="flex-1 min-h-[48px] sm:min-h-[44px]"
          >
            {confirmLabel || t('confirm')}
          </Button>
        </div>
      </div>
    </div>
  )
}
```

---

## `components/ui/DiagramToggle.tsx`

```tsx
'use client'

import { useVisuals, type DiagramMode } from '@/contexts/VisualsContext'
import { useTranslations } from 'next-intl'

interface DiagramToggleProps {
  /** Compact mode shows just icons (no label text) */
  compact?: boolean
  className?: string
}

const MODES: { value: DiagramMode; icon: string; colorOn: string }[] = [
  { value: 'off', icon: '✕', colorOn: 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300' },
  { value: 'quick', icon: '⚡', colorOn: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300' },
  { value: 'accurate', icon: '🎯', colorOn: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
]

/**
 * Three-way diagram mode selector: Off / Quick / Accurate.
 * Reads from and writes to VisualsContext (persisted in localStorage + DB).
 * Can be placed in any feature UI (courses, practice, homework, prepare).
 */
export default function DiagramToggle({ compact = false, className = '' }: DiagramToggleProps) {
  const { preferences, setDiagramMode } = useVisuals()
  const t = useTranslations('common')
  const currentMode = preferences.diagramMode

  return (
    <div
      className={`inline-flex items-center gap-0.5 p-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 ${className}`}
      role="radiogroup"
      aria-label={t('settings.diagramMode') || 'Diagram mode'}
    >
      {MODES.map((mode) => {
        const isActive = currentMode === mode.value
        const label = t(`settings.diagram${mode.value.charAt(0).toUpperCase() + mode.value.slice(1)}`) || mode.value

        return (
          <button
            key={mode.value}
            type="button"
            role="radio"
            aria-checked={isActive}
            onClick={() => setDiagramMode(mode.value)}
            className={`
              flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-all
              ${isActive
                ? `${mode.colorOn} shadow-sm`
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'
              }
            `}
            title={label}
          >
            <span className="text-xs leading-none">{mode.icon}</span>
            {!compact && <span>{label}</span>}
          </button>
        )
      })}
    </div>
  )
}
```

---

## `components/ui/EmptyState.tsx`

```tsx
'use client'

import { type ReactNode } from 'react'
import Button from './Button'

export interface EmptyStateProps {
  /** Icon to display (emoji or ReactNode) */
  icon?: ReactNode
  /** Main title text */
  title: string
  /** Description text below the title */
  description?: string
  /** Primary action button */
  action?: {
    label: string
    onClick: () => void
    icon?: ReactNode
  }
  /** Secondary action button */
  secondaryAction?: {
    label: string
    onClick: () => void
  }
  /** Additional CSS classes */
  className?: string
}

/**
 * Reusable empty state component for displaying when no content is available
 *
 * @example
 * ```tsx
 * <EmptyState
 *   icon={<BookIcon />}
 *   title="No courses yet"
 *   description="Upload your first notebook to get started"
 *   action={{
 *     label: "Upload Notebook",
 *     onClick: () => setShowUpload(true),
 *     icon: <UploadIcon />
 *   }}
 * />
 * ```
 */
export default function EmptyState({
  icon,
  title,
  description,
  action,
  secondaryAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center py-12 px-4 text-center ${className}`}
    >
      {icon && (
        <div className="w-20 h-20 bg-violet-100 dark:bg-violet-900/30 rounded-full flex items-center justify-center mb-6">
          {typeof icon === 'string' ? (
            <span className="text-4xl">{icon}</span>
          ) : (
            <div className="text-violet-400 dark:text-violet-500 w-10 h-10">{icon}</div>
          )}
        </div>
      )}

      <h2 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mb-2">
        {title}
      </h2>

      {description && (
        <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-sm text-sm sm:text-base">
          {description}
        </p>
      )}

      {(action || secondaryAction) && (
        <div className="flex flex-col sm:flex-row gap-3">
          {action && (
            <Button size="lg" onClick={action.onClick}>
              {action.icon && <span className="me-2">{action.icon}</span>}
              {action.label}
            </Button>
          )}
          {secondaryAction && (
            <Button variant="secondary" size="lg" onClick={secondaryAction.onClick}>
              {secondaryAction.label}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Preset icons for common empty states
 */
export const EmptyStateIcons = {
  book: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
      />
    </svg>
  ),
  search: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
      />
    </svg>
  ),
  inbox: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
      />
    </svg>
  ),
  document: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  ),
  chart: (
    <svg className="w-full h-full" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
      />
    </svg>
  ),
}
```

---

## `components/ui/FormInput.tsx`

```tsx
'use client'

import { forwardRef } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, type = 'text', id, name, className = '', ...props }, ref) => {
    const inputId = id || (name ? `form-input-${name}` : label.toLowerCase().replace(/\s+/g, '-'))

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
        >
          {label}
        </label>
        <input
          ref={ref}
          type={type}
          id={inputId}
          name={name}
          className={`
            w-full px-4 py-3.5 sm:py-3 rounded-xl sm:rounded-lg border bg-white dark:bg-gray-700
            text-gray-900 dark:text-white outline-none transition text-base
            min-h-[48px] sm:min-h-[44px]
            ${error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-violet-500 focus:border-transparent'
            }
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
```

---

## `components/ui/Header.tsx`

```tsx
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toggleLanguage as syncLanguage } from '@/lib/i18n/toggle-language'

const GlobalSearch = dynamic(() => import('@/components/search/GlobalSearch'), { ssr: false })

interface HeaderProps {
  userEmail?: string
  userName?: string
  isAdmin?: boolean
}

export default function Header({ userEmail, userName, isAdmin }: HeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common')
  const currentLocale = useLocale()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)

  const displayName = userName || userEmail?.split('@')[0] || 'User'

  // Prefetch all navigation routes on mount for instant navigation
  useEffect(() => {
    const routes = ['/dashboard', '/review', '/practice', '/homework', '/progress', '/exams', '/profile', '/settings']
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Cmd+K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'en' ? 'he' : 'en'
    syncLanguage(newLocale)
    router.refresh()
  }

  const isActive = (path: string) => pathname === path

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link
              href="/dashboard"
              className="text-xl font-bold text-violet-600 dark:text-violet-400 hover:text-violet-700 dark:hover:text-violet-300 transition-colors"
            >
              X+1
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-6">
              <nav className="flex items-center gap-1">
                <NavLink href="/dashboard" active={isActive('/dashboard')}>
                  {t('nav.courses')}
                </NavLink>
                <NavLink href="/review" active={isActive('/review')}>
                  {t('nav.review')}
                </NavLink>
                <NavLink href="/practice" active={isActive('/practice')} badge={t('nav.practiceMix')}>
                  {t('nav.practice')}
                </NavLink>
                <NavLink href="/homework" active={isActive('/homework') || pathname?.startsWith('/homework')}>
                  {t('nav.homework')}
                </NavLink>
                <NavLink href="/exams" active={isActive('/exams')}>
                  {t('nav.exams')}
                </NavLink>
                <NavLink href="/study-plan" active={isActive('/study-plan')}>
                  {t('nav.studyPlan')}
                </NavLink>
                <NavLink href="/progress" active={isActive('/progress')}>
                  {t('nav.progress')}
                </NavLink>
                {isAdmin && (
                  <NavLink href="/analytics" active={pathname?.startsWith('/analytics')}>
                    {t('nav.admin')}
                  </NavLink>
                )}
              </nav>
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={t('nav.search')}
                title={t('nav.search')}
              >
                <Search className="w-4 h-4" />
              </button>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <button
                onClick={toggleLanguage}
                className="px-2 py-1.5 text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                aria-label={t('language.switch')}
                title={currentLocale === 'en' ? 'עברית' : 'English'}
              >
                {currentLocale === 'en' ? '🇮🇱 עברית' : '🇺🇸 English'}
              </button>
              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700" />
              <Link
                href="/profile"
                className={`flex items-center gap-2 px-3 py-1.5 text-sm font-medium transition-colors rounded-lg ${
                  isActive('/profile')
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                {displayName}
              </Link>
              <button
                onClick={handleLogout}
                disabled={isLoggingOut}
                className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:text-red-600 dark:hover:text-red-400 font-medium transition-colors disabled:opacity-50"
              >
                {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
              </button>
            </div>

            {/* Mobile: Search, Profile & Menu Button */}
            <div className="flex md:hidden items-center gap-2">
              <button
                onClick={() => setIsSearchOpen(true)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
                aria-label={t('nav.search')}
              >
                <Search className="w-5 h-5" />
              </button>
              <Link
                href="/profile"
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
                aria-label={t('nav.profile')}
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </Link>
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
                aria-label={t('nav.toggleMenu')}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {isMobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed top-14 right-0 bottom-0 z-50 w-[85vw] max-w-72 bg-white dark:bg-gray-800 shadow-xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                <span className="text-violet-600 dark:text-violet-400 font-semibold">
                  {displayName.charAt(0).toUpperCase()}
                </span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            <MobileNavLink href="/dashboard" icon={CoursesIcon} active={isActive('/dashboard')}>
              {t('nav.courses')}
            </MobileNavLink>
            <MobileNavLink href="/review" icon={ReviewIcon} active={isActive('/review')}>
              {t('nav.reviewCards')}
            </MobileNavLink>
            <MobileNavLink href="/practice" icon={PracticeIcon} active={isActive('/practice')} badge={t('nav.practiceMix')}>
              {t('nav.practice')}
            </MobileNavLink>
            <MobileNavLink href="/homework" icon={HomeworkIcon} active={isActive('/homework') || pathname?.startsWith('/homework')}>
              {t('nav.homeworkHelp')}
            </MobileNavLink>
            <MobileNavLink href="/exams" icon={ExamIcon} active={isActive('/exams')}>
              {t('nav.exams')}
            </MobileNavLink>
            <MobileNavLink href="/study-plan" icon={StudyPlanIcon} active={isActive('/study-plan')}>
              {t('nav.studyPlan')}
            </MobileNavLink>
            <MobileNavLink href="/progress" icon={ProgressIcon} active={isActive('/progress')}>
              {t('nav.progress')}
            </MobileNavLink>
            <MobileNavLink href="/profile" icon={ProfileIcon} active={isActive('/profile')}>
              {t('nav.profile')}
            </MobileNavLink>
            {isAdmin && (
              <MobileNavLink href="/analytics" icon={AdminIcon} active={pathname?.startsWith('/analytics')}>
                {t('nav.adminDashboard')}
              </MobileNavLink>
            )}

            {/* Language Toggle */}
            <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full"
              >
                <span className="w-5 h-5 flex items-center justify-center text-base">
                  {currentLocale === 'en' ? '🇮🇱' : '🇺🇸'}
                </span>
                <span className="flex-1 text-start">
                  {currentLocale === 'en' ? 'עברית' : 'English'}
                </span>
              </button>
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 xs:h-16">
          <BottomNavLink href="/dashboard" icon={CoursesIcon} label={t('nav.courses')} active={isActive('/dashboard')} />
          <BottomNavLink href="/review" icon={ReviewIcon} label={t('nav.review')} active={isActive('/review')} />
          <BottomNavLink href="/practice" icon={PracticeIcon} label={t('nav.practice')} active={isActive('/practice')} />
          <BottomNavLink href="/exams" icon={ExamIcon} label={t('nav.exams')} active={isActive('/exams')} />
          <BottomNavLink href="/study-plan" icon={StudyPlanIcon} label={t('nav.studyPlan')} active={isActive('/study-plan')} />
          <BottomNavLink href="/progress" icon={ProgressIcon} label={t('nav.progress')} active={isActive('/progress')} />
        </div>
      </nav>

      {/* Spacer for bottom nav on mobile - accounts for safe area */}
      <div className="h-14 xs:h-16 md:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom)' }} />

      {/* Global Search Overlay */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

// Desktop nav link
function NavLink({ href, children, active, badge }: { href: string; children: React.ReactNode; active: boolean; badge?: string }) {
  return (
    <Link
      href={href}
      className={`px-3 py-2 text-sm font-medium transition-colors rounded-lg flex items-center gap-1 ${
        active
          ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
          : 'text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      {children}
      {badge && (
        <span className="text-xs px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

// Mobile nav link
function MobileNavLink({ href, icon: Icon, children, active, badge }: { href: string; icon: React.FC<{ className?: string }>; children: React.ReactNode; active: boolean; badge?: string }) {
  return (
    <Link
      href={href}
      className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
        active
          ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
          : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
      }`}
    >
      <Icon className="w-5 h-5" />
      <span className="flex-1">{children}</span>
      {badge && (
        <span className="text-xs px-2 py-0.5 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-full">
          {badge}
        </span>
      )}
    </Link>
  )
}

// Bottom nav link
function BottomNavLink({ href, icon: Icon, label, active }: { href: string; icon: React.FC<{ className?: string }>; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 px-2 xs:px-3 py-1.5 min-w-[56px] xs:min-w-[64px] min-h-[44px] transition-colors ${
        active
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <Icon className="w-5 h-5 xs:w-6 xs:h-6" />
      <span className="text-[10px] xs:text-xs font-medium truncate max-w-full">{label}</span>
    </Link>
  )
}

// Icons
function CoursesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  )
}

function ReviewIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  )
}

function PracticeIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
    </svg>
  )
}

function ExamIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  )
}

function ProgressIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function ProfileIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  )
}

function AdminIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  )
}

function StudyPlanIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  )
}

function HomeworkIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01" />
    </svg>
  )
}
```

---

## `components/ui/LazySection.tsx`

```tsx
'use client'

import { type ReactNode } from 'react'
import { useInView } from '@/hooks/useInView'

interface LazySectionProps {
  children: ReactNode
  // Skeleton to show while not in view
  skeleton?: ReactNode
  // Custom className for the wrapper
  className?: string
  // Margin before triggering load (default: 200px - loads slightly before visible)
  rootMargin?: string
  // Minimum height to prevent layout shift
  minHeight?: string | number
  // Optional: force render immediately (for SSR or above-the-fold content)
  forceRender?: boolean
}

/**
 * LazySection component - only renders children when scrolled into view
 * Shows a skeleton placeholder until the section is visible
 */
export function LazySection({
  children,
  skeleton,
  className = '',
  rootMargin = '200px',
  minHeight,
  forceRender = false,
}: LazySectionProps) {
  const { ref, inView } = useInView({
    rootMargin,
    triggerOnce: true,
    initialInView: forceRender,
  })

  const minHeightStyle = minHeight
    ? typeof minHeight === 'number'
      ? `${minHeight}px`
      : minHeight
    : undefined

  // If forceRender is true, skip the intersection observer logic
  if (forceRender) {
    return <div className={className}>{children}</div>
  }

  return (
    <div
      ref={ref}
      className={className}
      style={{ minHeight: !inView ? minHeightStyle : undefined }}
    >
      {inView ? children : skeleton}
    </div>
  )
}

/**
 * Pre-built skeleton variants for common section types
 */

export function ChartSectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-40 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="h-48 bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item" />
    </div>
  )
}

export function MasteryMapSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="space-y-4">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="border border-gray-200 dark:border-gray-700 rounded-lg p-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
              <div className="flex-1">
                <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
                <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              </div>
              <div className="hidden sm:block w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function AreasSectionSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-5 w-28 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
      </div>
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
            <div className="flex-1">
              <div className="h-4 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-1" />
              <div className="h-3 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function InsightsSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
      <div className="h-5 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-4" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div
            key={i}
            className="p-3 rounded-lg border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-start gap-2">
              <div className="w-6 h-6 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              <div className="flex-1">
                <div className="h-4 w-full bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-1" />
                <div className="h-4 w-2/3 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function RecommendationSkeleton() {
  return (
    <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-xl border border-violet-200 dark:border-violet-800/50 p-4 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-violet-200 dark:bg-violet-800/50 rounded-lg skeleton-shimmer-item" />
        <div className="flex-1">
          <div className="h-5 w-48 bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-full bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item mb-1" />
          <div className="h-4 w-2/3 bg-violet-200 dark:bg-violet-800/50 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

export function SRSWidgetSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-4 sm:p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <div className="h-6 w-32 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        <div className="h-8 w-24 bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item" />
      </div>
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-1/2 bg-gray-200 dark:bg-gray-700 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

export default LazySection
```

---

## `components/ui/MathInput.tsx`

```tsx
'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import katex from 'katex'
import DOMPurify from 'dompurify'

// ============================================================================
// Types
// ============================================================================

export interface MathInputProps {
  /** Current LaTeX value */
  value?: string
  /** Callback when value changes */
  onChange?: (latex: string) => void
  /** Callback when user submits (Enter key) */
  onSubmit?: (latex: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Whether to auto-focus on mount */
  autoFocus?: boolean
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
  /** Error message to display */
  error?: string
  /** Label for the input */
  label?: string
  /** Helper text below the input */
  helperText?: string
  /** Whether to show a live preview of the rendered math */
  showPreview?: boolean
  /** Keyboard shortcuts to show */
  showKeyboard?: boolean
}

export interface MathInputRef {
  /** Focus the input */
  focus: () => void
  /** Clear the input */
  clear: () => void
  /** Get current LaTeX value */
  getValue: () => string
  /** Set the value */
  setValue: (latex: string) => void
}

// ============================================================================
// Math Keyboard Shortcuts
// ============================================================================

interface MathShortcut {
  label: string
  latex: string
  tooltip?: string
}

const MATH_SHORTCUTS: MathShortcut[][] = [
  // Row 1: Fractions and powers
  [
    { label: '÷', latex: '\\frac{□}{□}', tooltip: 'Fraction' },
    { label: 'x²', latex: '^2', tooltip: 'Square' },
    { label: 'xⁿ', latex: '^{□}', tooltip: 'Power' },
    { label: '√', latex: '\\sqrt{□}', tooltip: 'Square root' },
    { label: 'ⁿ√', latex: '\\sqrt[□]{□}', tooltip: 'nth root' },
  ],
  // Row 2: Greek and special symbols
  [
    { label: 'π', latex: '\\pi', tooltip: 'Pi' },
    { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
    { label: '∞', latex: '\\infty', tooltip: 'Infinity' },
    { label: '±', latex: '\\pm', tooltip: 'Plus/minus' },
    { label: '≠', latex: '\\neq', tooltip: 'Not equal' },
  ],
  // Row 3: Trigonometry
  [
    { label: 'sin', latex: '\\sin(□)', tooltip: 'Sine' },
    { label: 'cos', latex: '\\cos(□)', tooltip: 'Cosine' },
    { label: 'tan', latex: '\\tan(□)', tooltip: 'Tangent' },
    { label: 'log', latex: '\\log(□)', tooltip: 'Logarithm' },
    { label: 'ln', latex: '\\ln(□)', tooltip: 'Natural log' },
  ],
  // Row 4: Relations and operators
  [
    { label: '≤', latex: '\\leq', tooltip: 'Less than or equal' },
    { label: '≥', latex: '\\geq', tooltip: 'Greater than or equal' },
    { label: '×', latex: '\\times', tooltip: 'Times' },
    { label: '()', latex: '(□)', tooltip: 'Parentheses' },
    { label: '|x|', latex: '|□|', tooltip: 'Absolute value' },
  ],
]

// ============================================================================
// Sanitization - Using DOMPurify for XSS protection
// ============================================================================

/**
 * Safely sanitize and render LaTeX as HTML for preview.
 * Uses DOMPurify to prevent XSS attacks from KaTeX output.
 */
function sanitizeAndRenderLatex(latex: string): string {
  if (!latex.trim()) return ''

  try {
    const rawHtml = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: 'html',
    })
    // SECURITY: Sanitize KaTeX HTML output with DOMPurify
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'span', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
        'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd',
        'mtext', 'mspace', 'semantics', 'annotation',
      ],
      ALLOWED_ATTR: ['class', 'style', 'aria-hidden', 'data-*'],
      ALLOW_DATA_ATTR: true,
    })
  } catch {
    // Fallback: sanitize the raw latex as text
    return DOMPurify.sanitize(`<span class="text-gray-400">${latex}</span>`)
  }
}

// ============================================================================
// Preview Component (safe rendering)
// ============================================================================

function MathPreview({ latex }: { latex: string }) {
  const sanitizedHtml = sanitizeAndRenderLatex(latex)

  return (
    <div
      className="flex min-h-[2rem] items-center justify-center text-lg text-gray-900 dark:text-white"
      // SECURITY: Content is sanitized by DOMPurify in sanitizeAndRenderLatex
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

// ============================================================================
// Component
// ============================================================================

/**
 * MathInput - LaTeX equation input with live preview
 *
 * A user-friendly input for entering mathematical equations with:
 * - Live KaTeX preview (sanitized with DOMPurify)
 * - Math symbol shortcuts keyboard
 * - Keyboard navigation support
 * - Error validation display
 *
 * @example
 * // Basic usage
 * <MathInput
 *   value={equation}
 *   onChange={setEquation}
 *   placeholder="Enter an equation..."
 * />
 *
 * @example
 * // With submission handling
 * <MathInput
 *   onSubmit={(latex) => handleGraph(latex)}
 *   showKeyboard={true}
 *   showPreview={true}
 * />
 */
export const MathInput = forwardRef<MathInputRef, MathInputProps>(
  function MathInput(
    {
      value = '',
      onChange,
      onSubmit,
      placeholder = 'Enter an equation...',
      disabled = false,
      autoFocus = false,
      size = 'md',
      className = '',
      error,
      label,
      helperText,
      showPreview = true,
      showKeyboard = false,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [localValue, setLocalValue] = useState(value)
    const [showKeyboardPanel, setShowKeyboardPanel] = useState(showKeyboard)

    // Sync external value changes
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    // Auto-focus on mount
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus()
      }
    }, [autoFocus])

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)
        onChange?.(newValue)
      },
      [onChange]
    )

    // Handle key events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit?.(localValue)
        }
      },
      [localValue, onSubmit]
    )

    // Insert shortcut at cursor position
    const insertShortcut = useCallback(
      (shortcut: MathShortcut) => {
        if (!inputRef.current || disabled) return

        const input = inputRef.current
        const start = input.selectionStart ?? localValue.length
        const end = input.selectionEnd ?? localValue.length

        // Replace □ with selected text or cursor position
        let latex = shortcut.latex
        const selectedText = localValue.substring(start, end)
        if (selectedText) {
          latex = latex.replace('□', selectedText)
        }

        // Insert the LaTeX
        const before = localValue.substring(0, start)
        const after = localValue.substring(end)
        const newValue = before + latex + after

        setLocalValue(newValue)
        onChange?.(newValue)

        // Focus and position cursor
        requestAnimationFrame(() => {
          input.focus()
          const cursorPos = start + latex.indexOf('□')
          if (cursorPos >= start) {
            // Move cursor to first □ placeholder
            const actualPos = before.length + latex.indexOf('□')
            input.setSelectionRange(actualPos, actualPos + 1)
          } else {
            // Move cursor to end of inserted text
            const actualPos = before.length + latex.length
            input.setSelectionRange(actualPos, actualPos)
          }
        })
      },
      [localValue, onChange, disabled]
    )

    // Imperative API
    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => {
          setLocalValue('')
          onChange?.('')
        },
        getValue: () => localValue,
        setValue: (latex: string) => {
          setLocalValue(latex)
          onChange?.(latex)
        },
      }),
      [localValue, onChange]
    )

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    }

    return (
      <div className={`w-full ${className}`}>
        {/* Label */}
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full rounded-xl border font-mono transition-all
              ${sizeClasses[size]}
              ${error
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'
                : 'border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              focus:outline-none focus:ring-2 focus:ring-offset-0
            `}
            aria-invalid={!!error}
            aria-describedby={error ? 'math-input-error' : helperText ? 'math-input-helper' : undefined}
          />

          {/* Keyboard toggle button */}
          <button
            type="button"
            onClick={() => setShowKeyboardPanel(!showKeyboardPanel)}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors
              ${showKeyboardPanel
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
              }
            `}
            title={showKeyboardPanel ? 'Hide math keyboard' : 'Show math keyboard'}
            disabled={disabled}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h7" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            id="math-input-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p id="math-input-helper" className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}

        {/* Live preview */}
        {showPreview && localValue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Preview:</div>
            <MathPreview latex={localValue} />
          </motion.div>
        )}

        {/* Math keyboard */}
        {showKeyboardPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="space-y-2">
              {MATH_SHORTCUTS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((shortcut) => (
                    <button
                      key={shortcut.latex}
                      type="button"
                      onClick={() => insertShortcut(shortcut)}
                      disabled={disabled}
                      className={`
                        flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium
                        transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700
                        dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200
                        dark:hover:border-primary-500 dark:hover:bg-primary-900/30 dark:hover:text-primary-300
                        disabled:cursor-not-allowed disabled:opacity-50
                      `}
                      title={shortcut.tooltip}
                    >
                      {shortcut.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    )
  }
)

export default MathInput
```

---

## `components/ui/MathRenderer.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import katex from 'katex'
import DOMPurify from 'dompurify'
import 'katex/dist/katex.min.css'

interface MathRendererProps {
  math: string
  block?: boolean
  className?: string
}

/**
 * Renders LaTeX math using KaTeX with DOMPurify sanitization
 * @param math - LaTeX string to render
 * @param block - If true, renders as block (display) math; otherwise inline
 */
export function MathRenderer({ math, block = false, className = '' }: MathRendererProps) {
  const [html, setHtml] = useState('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    try {
      const rendered = katex.renderToString(math, {
        displayMode: block,
        throwOnError: false,
        errorColor: '#cc0000',
        strict: false,
        trust: false,
      })
      // Sanitize KaTeX output with DOMPurify for security
      const sanitized = DOMPurify.sanitize(rendered, {
        ADD_TAGS: ['semantics', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub', 'mfrac', 'msqrt', 'mtext', 'annotation'],
        ADD_ATTR: ['encoding', 'mathvariant', 'stretchy', 'fence', 'separator', 'accent'],
      })
      setHtml(sanitized)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to render math')
      setHtml('')
    }
  }, [math, block])

  if (error) {
    return <span className="text-red-500 font-mono text-sm">{math}</span>
  }

  return (
    <span
      className={`math-renderer ${block ? 'block my-2' : 'inline'} ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

/**
 * Parses text containing inline $...$ and block $$...$$ math expressions
 * and renders them with KaTeX while keeping regular text as-is
 */
interface MathTextProps {
  children: string
  className?: string
}

export function MathText({ children, className = '' }: MathTextProps) {
  if (!children) return null

  // Split by math delimiters while keeping the delimiters
  // Match $$...$$ (block) first, then $...$ (inline)
  const parts = children.split(/(\$\$[\s\S]+?\$\$|\$[^$\n]+?\$)/g)

  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (!part) return null

        // Block math: $$...$$
        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2).trim()
          return (
            <span key={index} className="block my-2">
              <MathRenderer math={math} block />
            </span>
          )
        }

        // Inline math: $...$
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const math = part.slice(1, -1)
          return <MathRenderer key={index} math={math} />
        }

        // Regular text
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

/**
 * Inline math shorthand component
 */
export function InlineMath({ children }: { children: string }) {
  return <MathRenderer math={children} block={false} />
}

/**
 * Block math shorthand component
 */
export function BlockMath({ children }: { children: string }) {
  return <MathRenderer math={children} block={true} />
}
```

---

## `components/ui/MathText.tsx`

```tsx
'use client'

import { useMemo } from 'react'
import { formatMathInText } from '@/lib/utils/math-format'

interface MathTextProps {
  /** The text content that may contain math expressions */
  children: string
  /** Additional CSS classes */
  className?: string
  /** HTML tag to use for rendering */
  as?: 'span' | 'p' | 'div' | 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'label'
}

/**
 * MathText Component
 *
 * Renders text with properly formatted mathematical expressions.
 * Converts plain text notation like x^2, a_1, sqrt(x) into proper
 * Unicode mathematical symbols.
 *
 * @example
 * <MathText>Using the formula x^2 + y^2 = r^2</MathText>
 * // Renders: Using the formula x² + y² = r²
 *
 * @example
 * <MathText>If x >= 5, then x^(n+1) is valid</MathText>
 * // Renders: If x ≥ 5, then x⁽ⁿ⁺¹⁾ is valid
 */
export default function MathText({
  children,
  className = '',
  as: Component = 'span',
}: MathTextProps) {
  const formattedText = useMemo(() => {
    if (typeof children !== 'string') return children
    return formatMathInText(children)
  }, [children])

  return <Component className={className}>{formattedText}</Component>
}

/**
 * Hook to format math in text
 * Useful when you need the formatted string without a component
 */
export function useMathText(text: string): string {
  return useMemo(() => {
    if (typeof text !== 'string') return text
    return formatMathInText(text)
  }, [text])
}
```

---

## `components/ui/MotionWrappers.tsx`

```tsx
'use client';

import { motion, AnimatePresence } from 'framer-motion';
import type { ReactNode } from 'react';

// Re-export for direct use
export { motion, AnimatePresence };

interface MotionProps {
  children: ReactNode;
  delay?: number;
  duration?: number;
  className?: string;
}

// FadeIn — opacity 0→1 with optional delay
export function FadeIn({ children, delay = 0, duration = 0.4, className }: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// SlideUp — translate-y 20→0 + fade
export function SlideUp({ children, delay = 0, duration = 0.5, className }: MotionProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// StaggerContainer + StaggerItem — staggered children
export function StaggerContainer({ children, className, delay = 0 }: MotionProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: {
          transition: {
            staggerChildren: 0.1,
            delayChildren: delay,
          },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({ children, className }: Omit<MotionProps, 'delay' | 'duration'>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 15 },
        visible: { opacity: 1, y: 0 },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

// ScaleIn — scale 0.9→1 spring animation
export function ScaleIn({ children, delay = 0, className }: Omit<MotionProps, 'duration'>) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 25, delay }}
      className={className}
    >
      {children}
    </motion.div>
  );
}
```

---

## `components/ui/NavigationProgress.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false)
    setProgress(0)
  }, [pathname, searchParams])

  useEffect(() => {
    let progressInterval: NodeJS.Timeout
    let completeTimeout: NodeJS.Timeout

    const handleStart = () => {
      setIsNavigating(true)
      setProgress(0)

      // Animate progress bar
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          // Slow down as we approach 90%
          const increment = Math.max(1, (90 - prev) / 10)
          return Math.min(90, prev + increment)
        })
      }, 100)
    }

    const _handleComplete = () => {
      setProgress(100)
      completeTimeout = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 200)
    }

    // Listen for link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href && !link.href.startsWith('#') && !link.target) {
        const url = new URL(link.href)
        // Only trigger for internal navigation
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          handleStart()
        }
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      clearInterval(progressInterval)
      clearTimeout(completeTimeout)
    }
  }, [pathname])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page navigation loading"
    >
      <div
        className="h-full bg-gradient-to-r from-violet-500 via-purple-500 to-violet-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.7), 0 0 5px rgba(99, 102, 241, 0.5)',
        }}
      />
    </div>
  )
}
```

---

## `components/ui/OfflineIndicator.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'
import { useTranslations } from 'next-intl'
import { useOnlineStatus } from '@/hooks/useOnlineStatus'
import { WifiOff, Wifi } from 'lucide-react'

/**
 * Shows a banner when user goes offline or comes back online
 */
export function OfflineIndicator() {
  const t = useTranslations('errors')
  const { isOnline, wasOffline, clearReconnectionFlag } = useOnlineStatus()
  const [showReconnected, setShowReconnected] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Prevent hydration mismatch - only render after client mount
  useEffect(() => {
    setMounted(true)
  }, [])

  // Show "reconnected" message briefly when coming back online
  useEffect(() => {
    if (wasOffline && isOnline) {
      setShowReconnected(true)
      const timer = setTimeout(() => {
        setShowReconnected(false)
        clearReconnectionFlag()
      }, 3000)
      return () => clearTimeout(timer)
    }
  }, [wasOffline, isOnline, clearReconnectionFlag])

  // Don't render anything until mounted (prevents hydration mismatch)
  if (!mounted) {
    return null
  }

  // Show offline banner
  if (!isOnline) {
    return (
      <div className="fixed bottom-0 md:bottom-0 left-0 right-0 z-50 bg-amber-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg max-md:bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))]">
        <WifiOff className="w-4 h-4" />
        <span className="text-sm font-medium">
          {t('offline')} {t('offlineDescription')}
        </span>
      </div>
    )
  }

  // Show "reconnected" message
  if (showReconnected) {
    return (
      <div className="fixed bottom-0 md:bottom-0 left-0 right-0 z-50 bg-green-500 text-white px-4 py-2 flex items-center justify-center gap-2 shadow-lg animate-fade-in max-md:bottom-[calc(var(--bottom-nav-height)+env(safe-area-inset-bottom,0px))]">
        <Wifi className="w-4 h-4" />
        <span className="text-sm font-medium">
          {t('backOnline')}
        </span>
      </div>
    )
  }

  return null
}

export default OfflineIndicator
```

---

## `components/ui/RichTextInput.tsx`

```tsx
'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { useEffect, useRef } from 'react'
import { editorJsonToMarkdown, markdownToEditorHtml, getPlainTextLength } from '@/lib/rich-text-utils'

interface RichTextInputProps {
  value: string
  onChange: (markdown: string) => void
  placeholder?: string
  minHeight?: string
  maxLength?: number
  className?: string
}

export default function RichTextInput({
  value,
  onChange,
  placeholder = '',
  minHeight = '160px',
  maxLength,
  className = '',
}: RichTextInputProps) {
  const isUpdatingRef = useRef(false)

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        // Disable all formatting — we only want plain text + links
        bold: false,
        italic: false,
        strike: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        bulletList: false,
        orderedList: false,
        listItem: false,
        heading: false,
        horizontalRule: false,
        // Link is built into StarterKit v3 — configure here, not separately
        link: {
          openOnClick: true,
          autolink: true,
          linkOnPaste: true,
          HTMLAttributes: {
            class: 'text-violet-600 dark:text-violet-400 underline cursor-pointer',
            target: '_blank',
            rel: 'noopener noreferrer',
          },
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: markdownToEditorHtml(value),
    editorProps: {
      attributes: {
        class: 'outline-none h-full',
        dir: 'auto',
      },
      // Strip all formatting on paste except links.
      // Uses DOMParser for safe HTML parsing — Tiptap's schema then
      // filters to only allow configured node types (paragraph, text, link).
      transformPastedHTML(html: string) {
        const parser = new DOMParser()
        const doc = parser.parseFromString(html, 'text/html')

        function cleanNode(node: Node): string {
          if (node.nodeType === Node.TEXT_NODE) {
            return node.textContent || ''
          }
          if (node.nodeType === Node.ELEMENT_NODE) {
            const el = node as Element
            const tag = el.tagName.toLowerCase()
            const childContent = Array.from(el.childNodes).map(cleanNode).join('')

            if (tag === 'a') {
              const href = el.getAttribute('href')
              if (href && /^https?:\/\//i.test(href)) {
                return `<a href="${encodeURI(href)}">${childContent}</a>`
              }
            }
            if (tag === 'br') return '<br>'
            if (['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'tr'].includes(tag)) {
              return `<p>${childContent}</p>`
            }
            return childContent
          }
          return ''
        }

        return Array.from(doc.body.childNodes).map(cleanNode).join('')
      },
    },
    onUpdate: ({ editor: ed }) => {
      if (isUpdatingRef.current) return
      const json = ed.getJSON()
      const markdown = editorJsonToMarkdown(json)
      onChange(markdown)
    },
  })

  // Sync external value changes into editor
  useEffect(() => {
    if (!editor || editor.isDestroyed) return
    const currentMarkdown = editorJsonToMarkdown(editor.getJSON())
    if (value !== currentMarkdown) {
      isUpdatingRef.current = true
      editor.commands.setContent(markdownToEditorHtml(value))
      isUpdatingRef.current = false
    }
  }, [value, editor])

  const charCount = editor ? getPlainTextLength(editor.getJSON()) : 0

  return (
    <div className={`relative rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus-within:ring-2 focus-within:ring-violet-500 focus-within:border-transparent transition-all ${className}`}>
      <EditorContent
        editor={editor}
        className="px-4 py-3 text-gray-900 dark:text-white overflow-y-auto [&_.tiptap]:outline-none [&_.tiptap_p]:my-0 [&_.tiptap_p:not(:first-child)]:mt-2 [&_.is-editor-empty:first-child::before]:text-gray-400 [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.is-editor-empty:first-child::before]:float-left rtl:[&_.is-editor-empty:first-child::before]:float-right [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:h-0 [&_.tiptap]:min-h-[var(--min-height)]"
        style={{ '--min-height': minHeight } as React.CSSProperties}
      />
      {maxLength !== undefined && (
        <div className="px-4 py-1.5 text-end">
          <span className={`text-xs ${charCount > maxLength ? 'text-red-500' : 'text-gray-400'}`}>
            {charCount} characters
          </span>
        </div>
      )}
    </div>
  )
}
```

---

## `components/ui/SWRErrorState.tsx`

```tsx
'use client'

import { AlertCircle } from 'lucide-react'
import { useTranslations } from 'next-intl'

interface SWRErrorStateProps {
  onRetry: () => void
  message?: string
}

export function SWRErrorState({ onRetry, message }: SWRErrorStateProps) {
  const t = useTranslations('common')

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-6 px-4">
      <div className="w-10 h-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
        <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400" />
      </div>
      <p className="text-sm text-gray-600 dark:text-gray-400 text-center">
        {message || t('error.failedToLoad')}
      </p>
      <button
        onClick={onRetry}
        className="px-4 py-1.5 text-sm font-medium text-white bg-violet-600 hover:bg-violet-700 dark:bg-violet-500 dark:hover:bg-violet-600 rounded-lg transition-colors"
      >
        {t('error.retry')}
      </button>
    </div>
  )
}

export default SWRErrorState
```

---

## `components/ui/Sidebar.tsx`

```tsx
'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { useRouter, usePathname } from 'next/navigation'
import { useTranslations, useLocale } from 'next-intl'
import { useTheme } from 'next-themes'
import { Search, PanelLeftClose, Menu } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { toggleLanguage as syncLanguage } from '@/lib/i18n/toggle-language'

const GlobalSearch = dynamic(() => import('@/components/search/GlobalSearch'), { ssr: false })

interface SidebarProps {
  userEmail?: string
  userName?: string
  isAdmin?: boolean
}

export default function Sidebar({ userEmail, userName, isAdmin }: SidebarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const t = useTranslations('common')
  const currentLocale = useLocale()
  const { setTheme, resolvedTheme } = useTheme()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)

  const displayName = userName || userEmail?.split('@')[0] || 'User'
  const initials = displayName.charAt(0).toUpperCase()

  // Prevent hydration mismatch for theme + restore sidebar state
  useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem('sidebar-collapsed')
    if (saved === 'true') {
      setIsCollapsed(true)
    }
  }, [])

  const toggleCollapsed = useCallback(() => {
    setIsCollapsed(prev => {
      const next = !prev
      localStorage.setItem('sidebar-collapsed', String(next))
      document.documentElement.setAttribute('data-sidebar-collapsed', String(next))
      return next
    })
  }, [])

  // Sync collapsed state to document for CSS
  useEffect(() => {
    document.documentElement.setAttribute('data-sidebar-collapsed', String(isCollapsed))
  }, [isCollapsed])

  // Prefetch all navigation routes on mount
  useEffect(() => {
    const routes = ['/dashboard', '/courses', '/review', '/practice', '/homework', '/progress', '/exams', '/study-plan', '/prepare', '/formula-scanner', '/cheatsheets', '/settings']
    routes.forEach(route => {
      router.prefetch(route)
    })
  }, [router])

  // Close mobile menu on route change
  useEffect(() => {
    setIsMobileMenuOpen(false)
  }, [pathname])

  // Prevent body scroll when menu is open
  useEffect(() => {
    if (isMobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isMobileMenuOpen])

  // Cmd+K / Ctrl+K keyboard shortcut for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsSearchOpen(prev => !prev)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleLogout = async () => {
    setIsLoggingOut(true)
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch {
      setIsLoggingOut(false)
    }
  }

  const toggleLanguage = () => {
    const newLocale = currentLocale === 'en' ? 'he' : 'en'
    syncLanguage(newLocale)
    router.refresh()
  }

  const toggleTheme = () => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }

  const isActive = (path: string) => pathname === path || pathname?.startsWith(path + '/')

  const navItems = [
    { href: '/dashboard', icon: '🏠', label: t('nav.dashboard'), active: pathname === '/dashboard' },
    { href: '/courses', icon: '📚', label: t('nav.courses'), active: isActive('/courses') },
    { href: '/review', icon: '🧠', label: t('nav.review'), active: isActive('/review') },
    { href: '/practice', icon: '🎯', label: t('nav.practice'), active: isActive('/practice') },
    { href: '/homework', icon: '📝', label: t('nav.homework'), active: isActive('/homework') },
    { href: '/exams', icon: '📋', label: t('nav.exams'), active: isActive('/exams') },
    { href: '/prepare', icon: '📖', label: t('nav.prepare'), active: isActive('/prepare') },
    { href: '/study-plan', icon: '📅', label: t('nav.studyPlan'), active: isActive('/study-plan') },
    { href: '/progress', icon: '📊', label: t('nav.progress'), active: isActive('/progress') },
    { href: '/formula-scanner', icon: '🔬', label: t('nav.formulaScanner'), active: isActive('/formula-scanner') },
    { href: '/cheatsheets', icon: '📄', label: t('nav.cheatsheets'), active: isActive('/cheatsheets') },
    { href: '/settings', icon: '⚙️', label: t('nav.settings'), active: isActive('/settings') },
  ]

  if (isAdmin) {
    navItems.push({ href: '/analytics', icon: '🔒', label: t('nav.admin'), active: isActive('/analytics') })
  }

  return (
    <>
      {/* Desktop Sidebar - Expanded */}
      <aside
        className={`hidden md:flex fixed inset-y-0 start-0 z-50 w-[250px] flex-col sidebar transition-transform duration-300 ease-in-out ${
          isCollapsed ? '-translate-x-full rtl:translate-x-full' : 'translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full py-7 px-4">
          {/* Logo + Collapse Button */}
          <div className="flex items-center justify-between mb-8">
            <Link href="/dashboard" className="flex items-center gap-3 px-2">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
                <span className="text-white text-lg">📚</span>
              </div>
              <span className="text-xl font-extrabold gradient-text">X+1</span>
            </Link>
            <button
              onClick={toggleCollapsed}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 hover:bg-white/50 dark:hover:bg-white/10 transition-colors"
              aria-label="Close sidebar"
            >
              <PanelLeftClose className="w-5 h-5 rtl:scale-x-[-1]" />
            </button>
          </div>

          {/* Search Button */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-3 px-4 py-3 mb-4 rounded-xl bg-white/50 dark:bg-white/5 border border-gray-200/50 dark:border-white/10 text-gray-500 dark:text-gray-400 hover:bg-white/80 dark:hover:bg-white/10 transition-colors"
          >
            <Search className="w-4 h-4" />
            <span className="text-sm">{t('nav.search')}</span>
            <kbd className="ms-auto text-xs bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded">⌘K</kbd>
          </button>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`sidebar-nav-item ${item.active ? 'active' : ''}`}
              >
                <span className="w-7 text-center text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>

          {/* Bottom Section */}
          <div className="pt-4 mt-4 border-t border-gray-200/50 dark:border-white/10 space-y-2">
            {/* Theme Toggle */}
            {mounted && (
              <button
                onClick={toggleTheme}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/50 dark:bg-white/5 hover:bg-white/80 dark:hover:bg-white/10 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                <span>{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
                <span className="text-sm">
                  {resolvedTheme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}
                </span>
              </button>
            )}

            {/* Language Toggle */}
            <button
              onClick={toggleLanguage}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl hover:bg-white/50 dark:hover:bg-white/5 text-gray-600 dark:text-gray-400 transition-colors"
            >
              <span>{currentLocale === 'en' ? '🇮🇱' : '🇺🇸'}</span>
              <span className="text-sm">{currentLocale === 'en' ? 'עברית' : 'English'}</span>
            </button>

            {/* User Info & Logout */}
            <div className="flex items-center gap-3 px-3 py-3 rounded-xl bg-white/30 dark:bg-white/5">
              <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center flex-shrink-0">
                <span className="text-white font-semibold">{initials}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{displayName}</p>
                <button
                  onClick={handleLogout}
                  disabled={isLoggingOut}
                  className="text-xs text-red-500 hover:text-red-600 dark:text-red-400 dark:hover:text-red-300 font-medium disabled:opacity-50"
                >
                  {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Desktop Collapsed - Hamburger Button */}
      <button
        onClick={toggleCollapsed}
        className={`hidden md:flex fixed top-5 start-5 z-50 items-center justify-center w-11 h-11 rounded-xl bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-lg border border-gray-200/50 dark:border-white/10 text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-700 transition-all duration-300 ${
          isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none'
        }`}
        aria-label="Open sidebar"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Mobile Header Bar */}
      <header className="sticky top-0 z-50 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl shadow-sm md:hidden">
        <div className="flex items-center justify-between h-14 px-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center">
              <span className="text-white text-sm">📚</span>
            </div>
            <span className="text-lg font-bold gradient-text">X+1</span>
          </Link>

          {/* Mobile Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSearchOpen(true)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-violet-600 dark:hover:text-violet-400"
              aria-label={t('nav.search')}
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="p-2 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
              aria-label={t('nav.toggleMenu')}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {isMobileMenuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden transition-opacity duration-300 ${
          isMobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Slide-out Menu */}
      <div
        className={`fixed top-14 start-0 bottom-0 z-50 w-[85vw] max-w-[280px] bg-white dark:bg-gray-800 shadow-xl md:hidden transform transition-transform duration-300 ease-out ${
          isMobileMenuOpen ? 'translate-x-0 rtl:-translate-x-0' : '-translate-x-full rtl:translate-x-full'
        }`}
      >
        <div className="flex flex-col h-full">
          {/* User Info */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-rose-500 flex items-center justify-center avatar-glow">
                <span className="text-white font-semibold text-lg">{initials}</span>
              </div>
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{displayName}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{userEmail}</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-xl font-medium transition-colors ${
                  item.active
                    ? 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-900/20'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="w-6 text-center text-lg">{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            ))}

            {/* Theme & Language */}
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700 space-y-1">
              {mounted && (
                <button
                  onClick={toggleTheme}
                  className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full transition-colors"
                >
                  <span className="w-6 text-center text-lg">{resolvedTheme === 'dark' ? '☀️' : '🌙'}</span>
                  <span>{resolvedTheme === 'dark' ? t('sidebar.lightMode') : t('sidebar.darkMode')}</span>
                </button>
              )}
              <button
                onClick={toggleLanguage}
                className="flex items-center gap-3 px-4 py-3 rounded-xl font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 w-full transition-colors"
              >
                <span className="w-6 text-center">{currentLocale === 'en' ? '🇮🇱' : '🇺🇸'}</span>
                <span>{currentLocale === 'en' ? 'עברית' : 'English'}</span>
              </button>
            </div>
          </nav>

          {/* Logout */}
          <div className="p-4 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 dark:text-red-400 font-medium bg-red-50 dark:bg-red-900/20 rounded-xl hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors disabled:opacity-50"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              {isLoggingOut ? t('auth.loggingOut') : t('auth.logOut')}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white/70 dark:bg-gray-900/60 backdrop-blur-xl border-t border-gray-200 dark:border-gray-700 md:hidden pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around h-14 xs:h-16">
          <BottomNavLink href="/dashboard" icon="🏠" label={t('nav.dashboard')} active={pathname === '/dashboard'} />
          <BottomNavLink href="/review" icon="🧠" label={t('nav.review')} active={isActive('/review')} />
          <BottomNavLink href="/practice" icon="🎯" label={t('nav.practice')} active={isActive('/practice')} />
          <BottomNavLink href="/homework" icon="📝" label={t('nav.homework')} active={isActive('/homework')} />
          <BottomNavLink href="/prepare" icon="📖" label={t('nav.prepare')} active={isActive('/prepare')} />
        </div>
      </nav>

      {/* Global Search */}
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}

// Bottom nav link component
function BottomNavLink({ href, icon, label, active }: { href: string; icon: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`flex flex-col items-center justify-center gap-0.5 px-2 xs:px-3 py-1.5 min-w-[56px] xs:min-w-[64px] min-h-[44px] transition-colors ${
        active
          ? 'text-violet-600 dark:text-violet-400'
          : 'text-gray-500 dark:text-gray-400'
      }`}
    >
      <span className="text-lg xs:text-xl">{icon}</span>
      <span className="text-[10px] xs:text-xs font-medium truncate max-w-full">{label}</span>
    </Link>
  )
}
```

---

## `components/ui/Skeleton.tsx`

```tsx
'use client'

import { type ReactNode } from 'react'
import { useTranslations } from 'next-intl'

// ============================================================================
// Types
// ============================================================================

interface SkeletonProps {
  className?: string
  children?: ReactNode
}

interface SkeletonTextProps extends SkeletonProps {
  lines?: number
  lastLineWidth?: string
}

interface SkeletonCircleProps extends SkeletonProps {
  size?: number | string
}

interface SkeletonRectProps extends SkeletonProps {
  width?: number | string
  height?: number | string
}

// ============================================================================
// Base Skeleton Component
// ============================================================================

export function Skeleton({ className = '', children }: SkeletonProps) {
  return (
    <div
      className={`bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item ${className}`}
      aria-hidden="true"
    >
      {children}
    </div>
  )
}

// ============================================================================
// Skeleton Variants
// ============================================================================

/**
 * Text skeleton - simulates lines of text
 */
export function SkeletonText({
  lines = 3,
  lastLineWidth = '60%',
  className = '',
}: SkeletonTextProps) {
  return (
    <div className={`space-y-2 ${className}`} aria-hidden="true">
      {Array.from({ length: lines }).map((_, index) => (
        <div
          key={index}
          className="h-4 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item"
          style={{
            width: index === lines - 1 ? lastLineWidth : '100%',
          }}
        />
      ))}
    </div>
  )
}

/**
 * Circle skeleton - for avatars, profile images
 */
export function SkeletonCircle({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  const sizeStyle = typeof size === 'number' ? `${size}px` : size

  return (
    <div
      className={`rounded-full bg-violet-100/50 dark:bg-violet-900/20 skeleton-shimmer-item ${className}`}
      style={{ width: sizeStyle, height: sizeStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Avatar skeleton - alias for circle with common avatar sizes
 */
export function SkeletonAvatar({
  size = 40,
  className = '',
}: SkeletonCircleProps) {
  return <SkeletonCircle size={size} className={className} />
}

/**
 * Rectangle skeleton - for images, cards
 */
export function SkeletonRect({
  width = '100%',
  height = 100,
  className = '',
}: SkeletonRectProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Button skeleton - small rectangle for buttons
 */
export function SkeletonButton({
  width = 100,
  height = 40,
  className = '',
}: SkeletonRectProps) {
  const widthStyle = typeof width === 'number' ? `${width}px` : width
  const heightStyle = typeof height === 'number' ? `${height}px` : height

  return (
    <div
      className={`bg-gray-200 dark:bg-gray-700 rounded-lg skeleton-shimmer-item ${className}`}
      style={{ width: widthStyle, height: heightStyle }}
      aria-hidden="true"
    />
  )
}

/**
 * Card skeleton - common card layout with image + content
 */
export function SkeletonCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Image placeholder */}
      <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title */}
        <div className="h-5 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item w-3/4" />

        {/* Description lines */}
        <div className="space-y-2">
          <div className="h-3 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
          <div className="h-3 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item w-5/6" />
        </div>

        {/* Meta */}
        <div className="flex items-center gap-2 pt-2">
          <div className="h-3 w-20 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

/**
 * Stat card skeleton - for dashboard stat boxes
 */
export function SkeletonStatCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-violet-100/50 dark:bg-violet-900/20 skeleton-shimmer-item" />
        <div className="h-4 w-20 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
      </div>
      <div className="h-8 w-16 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item mb-2" />
      <div className="h-3 w-24 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
    </div>
  )
}

/**
 * Chart skeleton - for chart/graph areas
 */
export function SkeletonChart({ height = 256, className = '' }: { height?: number; className?: string }) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-100 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="h-5 w-32 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item mb-4" />
      <div
        className="bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item"
        style={{ height: `${height}px` }}
      />
    </div>
  )
}

/**
 * Exam card skeleton - for exam list items
 */
export function SkeletonExamCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
      aria-hidden="true"
    >
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="h-5 w-3/4 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item mb-2" />
          <div className="h-4 w-40 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
        </div>
        <div className="text-right">
          <div className="h-6 w-20 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
        </div>
      </div>
    </div>
  )
}

/**
 * Flashcard skeleton - for practice flashcard area
 */
export function SkeletonFlashcard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-2xl mx-auto ${className}`}
      aria-hidden="true"
    >
      {/* Progress bar */}
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full mb-6 skeleton-shimmer-item" />

      {/* Card type badge */}
      <div className="flex justify-center mb-4">
        <div className="h-6 w-24 bg-gray-200 dark:bg-gray-700 rounded-full skeleton-shimmer-item" />
      </div>

      {/* Question area */}
      <div className="min-h-[200px] flex flex-col items-center justify-center space-y-4">
        <div className="h-6 w-4/5 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
        <div className="h-6 w-3/5 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
        <div className="h-6 w-2/5 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
      </div>

      {/* Answer options */}
      <div className="mt-8 space-y-3">
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            className="h-12 bg-gray-100 dark:bg-gray-700/50 rounded-lg skeleton-shimmer-item"
          />
        ))}
      </div>
    </div>
  )
}

/**
 * Course card skeleton - matches CourseCard layout exactly
 */
export function SkeletonCourseCard({ className = '' }: SkeletonProps) {
  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden ${className}`}
      aria-hidden="true"
    >
      {/* Thumbnail - aspect-square to match CourseCard */}
      <div className="relative aspect-square w-full bg-gray-200 dark:bg-gray-700">
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-gray-300/50 dark:via-gray-600/50 to-transparent skeleton-shimmer" />
      </div>

      {/* Content */}
      <div className="p-4">
        <div className="h-5 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item w-4/5 mb-2" />
        <div className="h-4 w-24 bg-violet-100/50 dark:bg-violet-900/20 rounded skeleton-shimmer-item" />
      </div>
    </div>
  )
}

/**
 * Course card skeleton grid - for loading multiple cards
 */
export function SkeletonCourseCardGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCourseCard key={index} />
      ))}
    </div>
  )
}

// ============================================================================
// Spinner Component (keeping for backwards compatibility)
// ============================================================================

interface SpinnerProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

const spinnerSizes = {
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
}

export function Spinner({ size = 'md', className = '' }: SpinnerProps) {
  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  )
}

// ============================================================================
// Loading Overlay
// ============================================================================

interface LoadingOverlayProps {
  message?: string
}

export function LoadingOverlay({ message }: LoadingOverlayProps) {
  const t = useTranslations('processing')
  const displayMessage = message ?? t('loading')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
      <div className="text-center">
        <Spinner size="lg" className="mx-auto mb-4 text-violet-600 dark:text-violet-400" />
        <p className="text-gray-600 dark:text-gray-400">{displayMessage}</p>
      </div>
    </div>
  )
}

// ============================================================================
// Default Export
// ============================================================================

export default Skeleton
```

---

## `components/ui/Toast.tsx`

```tsx
'use client'

import { useEffect, useState } from 'react'

// ============================================================================
// Types
// ============================================================================

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  message: string
  duration?: number
  errorCode?: string // Error code for error toasts (e.g., NS-AI-001)
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

interface ToastContainerProps {
  toasts: Toast[]
  onDismiss: (id: string) => void
}

// ============================================================================
// Toast Icons
// ============================================================================

function SuccessIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function ErrorIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function WarningIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
      />
    </svg>
  )
}

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
      />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 18L18 6M6 6l12 12"
      />
    </svg>
  )
}

// ============================================================================
// Toast Item Component
// ============================================================================

const toastStyles: Record<ToastType, { container: string; icon: string }> = {
  success: {
    container: 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800',
    icon: 'text-green-500 dark:text-green-400',
  },
  error: {
    container: 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800',
    icon: 'text-red-500 dark:text-red-400',
  },
  warning: {
    container: 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800',
    icon: 'text-yellow-500 dark:text-yellow-400',
  },
  info: {
    container: 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800',
    icon: 'text-blue-500 dark:text-blue-400',
  },
}

const iconMap: Record<ToastType, React.FC> = {
  success: SuccessIcon,
  error: ErrorIcon,
  warning: WarningIcon,
  info: InfoIcon,
}

export function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isLeaving, setIsLeaving] = useState(false)

  const styles = toastStyles[toast.type]
  const Icon = iconMap[toast.type]

  const handleDismiss = () => {
    setIsLeaving(true)
    setTimeout(() => {
      onDismiss(toast.id)
    }, 300) // Match animation duration
  }

  useEffect(() => {
    // Trigger enter animation
    const enterTimer = setTimeout(() => setIsVisible(true), 10)

    // Auto dismiss
    const duration = toast.duration ?? 5000
    const dismissTimer = setTimeout(() => {
      handleDismiss()
    }, duration)

    return () => {
      clearTimeout(enterTimer)
      clearTimeout(dismissTimer)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.duration, toast.id])

  return (
    <div
      className={`
        flex items-start gap-3 px-4 py-3 rounded-lg border shadow-lg
        transform transition-all duration-300 ease-out
        ${styles.container}
        ${isVisible && !isLeaving ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
      `}
      role="alert"
    >
      <div className={`${styles.icon} mt-0.5`}>
        <Icon />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 dark:text-white">
          {toast.message}
        </p>
        {toast.errorCode && toast.type === 'error' && (
          <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
            Code: <code className="font-mono">{toast.errorCode}</code>
          </p>
        )}
      </div>
      <button
        onClick={handleDismiss}
        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0"
        aria-label="Dismiss"
      >
        <CloseIcon />
      </button>
    </div>
  )
}

// ============================================================================
// Toast Container Component
// ============================================================================

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null

  return (
    <div
      className="fixed top-4 end-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
      aria-live="polite"
      aria-label="Notifications"
    >
      {toasts.map((toast) => (
        <div key={toast.id} className="pointer-events-auto">
          <ToastItem toast={toast} onDismiss={onDismiss} />
        </div>
      ))}
    </div>
  )
}

export default ToastContainer
```

---

## `tailwind.config.ts`

```ts
import type { Config } from "tailwindcss";
import rtl from "tailwindcss-rtl";

const config: Config = {
  darkMode: 'class',
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        aurora: {
          violet: 'var(--aurora-violet)',
          'violet-light': 'var(--aurora-violet-light)',
          'violet-dark': 'var(--aurora-violet-dark)',
          rose: 'var(--aurora-rose)',
          sky: 'var(--aurora-sky)',
          amber: 'var(--aurora-amber)',
          green: 'var(--aurora-green)',
        },
      },
      borderRadius: {
        'card': '22px',
      },
      boxShadow: {
        'card': 'var(--card-shadow)',
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'var(--font-rubik)', 'system-ui', 'sans-serif'],
      },
      screens: {
        'xs': '375px',  // iPhone SE and larger
        '3xl': '1920px', // Large desktop
      },
    },
  },
  plugins: [rtl],
};
export default config;
```

---

## `app/globals.css`

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

:root {
  --background: #ffffff;
  --foreground: #171717;

  --bottom-nav-height: 56px;
  --mobile-header-height: 56px;
  --safe-area-bottom: env(safe-area-inset-bottom, 0px);

  --aurora-violet: #8B5CF6;
  --aurora-violet-light: #A78BFA;
  --aurora-violet-dark: #7C3AED;
  --aurora-rose: #EC4899;
  --aurora-sky: #0EA5E9;
  --aurora-amber: #F59E0B;
  --aurora-green: #10B981;

  --text-primary: #1E1B2E;
  --text-secondary: #6B7280;
  --text-tertiary: #9CA3AF;

  --card-bg: #FFFFFF;
  --card-radius: 22px;
  --card-shadow: 0 2px 8px rgba(0,0,0,0.04), 0 8px 32px rgba(0,0,0,0.06);

  --surface-bg: #F5F3FF;
  --glass-bg: rgba(255,255,255,0.7);
  --glass-border: rgba(255,255,255,0.3);
}

@media (prefers-color-scheme: dark) {
  :root {
    --background: #0a0a0a;
    --foreground: #ededed;
  }
}

.dark {
  --text-primary: #F3F0FF;
  --text-secondary: #A5A0C0;
  --text-tertiary: #6B6590;

  --card-bg: rgba(30,25,50,0.8);
  --card-shadow: 0 2px 8px rgba(0,0,0,0.2), 0 8px 32px rgba(0,0,0,0.3);

  --surface-bg: #0F0B1E;
  --glass-bg: rgba(30,25,50,0.6);
  --glass-border: rgba(139,92,246,0.15);
}

html, body {
  height: 100%;
  overflow-x: hidden;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

body {
  color: var(--foreground);
  background: var(--background);
}

@layer utilities {
  .text-balance {
    text-wrap: balance;
  }
}

/* Processing page animations */
@keyframes scan {
  0% {
    transform: translateY(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateY(100%);
    opacity: 0;
  }
}

.animate-scan {
  animation: scan 2s ease-in-out infinite;
}

/* Pulse glow effect for processing */
@keyframes pulse-glow {
  0%, 100% {
    box-shadow: 0 0 20px rgba(139, 92, 246, 0.3);
  }
  50% {
    box-shadow: 0 0 40px rgba(139, 92, 246, 0.6);
  }
}

.animate-pulse-glow {
  animation: pulse-glow 2s ease-in-out infinite;
}

/* Skeleton shimmer animation */
@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

.skeleton-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .skeleton-shimmer {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
}

.skeleton-shimmer-item {
  position: relative;
  overflow: hidden;
}

.skeleton-shimmer-item::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.4) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

.dark .skeleton-shimmer-item::after {
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255, 255, 255, 0.1) 50%,
    transparent 100%
  );
  background-size: 200% 100%;
}

/* Lesson step animations */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeIn {
  animation: fadeIn 0.4s ease-out;
}

.animate-fade-in-delayed {
  opacity: 0;
  animation: fadeIn 0.6s ease-out 1.5s forwards;
}

@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.8);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.animate-scaleIn {
  animation: scaleIn 0.5s ease-out;
}

/* Confetti animation */
@keyframes confetti {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(720deg);
    opacity: 0;
  }
}

.animate-confetti {
  animation: confetti 4s ease-out forwards;
}

/* Safe area padding for iPhone notch/home indicator */
.safe-area-pb {
  padding-bottom: env(safe-area-inset-bottom, 0px);
}

.safe-area-pt {
  padding-top: env(safe-area-inset-top, 0px);
}

/* Hide scrollbar but keep functionality */
.scrollbar-hide {
  -ms-overflow-style: none;
  scrollbar-width: none;
}

.scrollbar-hide::-webkit-scrollbar {
  display: none;
}

/* Indeterminate progress bar animation */
@keyframes indeterminate {
  0% {
    transform: translateX(-100%);
  }
  100% {
    transform: translateX(400%);
  }
}

.animate-indeterminate {
  animation: indeterminate 1.5s ease-in-out infinite;
}

/* Aurora mesh gradient background */
.aurora-bg {
  background-color: var(--surface-bg);
  background-image:
    radial-gradient(ellipse 80% 60% at 20% 40%, #EDE9FE 0%, transparent 70%),
    radial-gradient(ellipse 60% 80% at 80% 20%, #FCE7F3 0%, transparent 70%),
    radial-gradient(ellipse 70% 50% at 60% 80%, #E0F2FE 0%, transparent 70%);
}
.dark .aurora-bg {
  background-image:
    radial-gradient(ellipse 80% 60% at 20% 40%, rgba(139,92,246,0.15) 0%, transparent 70%),
    radial-gradient(ellipse 60% 80% at 80% 20%, rgba(236,72,153,0.1) 0%, transparent 70%),
    radial-gradient(ellipse 70% 50% at 60% 80%, rgba(14,165,233,0.1) 0%, transparent 70%);
}

/* Sidebar Variables */
:root {
  --sidebar-width: 250px;
  --sidebar-bg: rgba(255,255,255,0.7);
  --sidebar-border: rgba(139,92,246,0.1);
}

.dark {
  --sidebar-bg: rgba(20,15,40,0.75);
  --sidebar-border: rgba(139,92,246,0.15);
}

/* Sidebar Styles */
.sidebar {
  width: var(--sidebar-width);
  background: var(--sidebar-bg);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-inline-end: 1px solid var(--sidebar-border);
}

.sidebar-nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  border-radius: 14px;
  font-weight: 500;
  font-size: 0.9rem;
  border-inline-start: 3px solid transparent;
  transition: all 0.15s ease;
  color: var(--text-secondary);
}

.sidebar-nav-item:hover {
  background: rgba(139,92,246,0.06);
}

.sidebar-nav-item.active {
  background: rgba(139,92,246,0.08);
  color: var(--aurora-violet);
  font-weight: 600;
  border-inline-start-color: var(--aurora-violet);
}

/* Main content area with sidebar */
.main-with-sidebar {
  margin-inline-start: var(--sidebar-width);
  flex: 1;
  padding: 40px;
  max-width: 1100px;
}

/* Collapsible sidebar - main content margin */
@media (min-width: 768px) {
  main.sidebar-main {
    margin-inline-start: 250px;
    transition: margin-inline-start 0.3s ease-in-out;
  }
  [data-sidebar-collapsed="true"] main.sidebar-main {
    margin-inline-start: 0px;
  }
}

@media (max-width: 767px) {
  main.sidebar-main {
    padding-bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 16px);
  }
  .main-with-sidebar {
    margin-inline-start: 0;
    padding: 16px;
    padding-bottom: calc(var(--bottom-nav-height) + var(--safe-area-bottom) + 16px);
  }
}

/* Mobile viewport height fix for Safari address bar */
@supports (height: 100dvh) {
  .min-h-screen { min-height: 100dvh; }
  .h-screen { height: 100dvh; }
}

/* Touch target minimum size utility */
.touch-target { min-height: 44px; min-width: 44px; }

/* Fade Slide In Animation */
@keyframes fadeSlideIn {
  from {
    opacity: 0;
    transform: translateY(16px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.animate-fadeSlideIn {
  animation: fadeSlideIn 0.5s ease forwards;
}

/* Stagger delays for sequential elements */
.stagger-1 { animation-delay: 0s; }
.stagger-2 { animation-delay: 0.08s; }
.stagger-3 { animation-delay: 0.16s; }
.stagger-4 { animation-delay: 0.24s; }
.stagger-5 { animation-delay: 0.32s; }
.stagger-6 { animation-delay: 0.4s; }

/* XP Bar Shimmer Animation */
@keyframes xpShimmer {
  0% { transform: translateX(-100%); }
  100% { transform: translateX(200%); }
}

.xp-shimmer::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(
    90deg,
    transparent 0%,
    rgba(255,255,255,0.4) 50%,
    transparent 100%
  );
  animation: xpShimmer 2s infinite;
}

/* Card hover lift */
.card-hover-lift {
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.card-hover-lift:hover {
  transform: translateY(-3px);
  box-shadow: 0 8px 24px rgba(0,0,0,0.1);
}

/* Avatar glow effect */
.avatar-glow {
  position: relative;
}

.avatar-glow::before {
  content: '';
  position: absolute;
  inset: -4px;
  background: linear-gradient(135deg, var(--aurora-violet), var(--aurora-rose));
  border-radius: 50%;
  filter: blur(8px);
  opacity: 0.5;
  z-index: -1;
}

/* Progress ring pulse */
@keyframes progressPulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(139,92,246,0.4); }
  50% { box-shadow: 0 0 0 16px rgba(139,92,246,0); }
}

.progress-ring-pulse {
  animation: progressPulse 2s infinite;
}

/* Gradient text */
.gradient-text {
  background: linear-gradient(135deg, var(--aurora-violet), var(--aurora-rose));
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

/* Streak gold gradient */
.streak-gold {
  background: linear-gradient(135deg, #FEF3C7, #FDE68A);
}

/* Toggle switch */
.toggle-switch {
  width: 48px;
  height: 28px;
  background: #E5E7EB;
  border-radius: 14px;
  position: relative;
  cursor: pointer;
  transition: background 0.2s ease;
}

.toggle-switch.active {
  background: var(--aurora-violet);
}

.toggle-switch::after {
  content: '';
  position: absolute;
  width: 22px;
  height: 22px;
  background: white;
  border-radius: 50%;
  top: 3px;
  left: 3px;
  transition: transform 0.2s ease;
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.toggle-switch.active::after {
  transform: translateX(20px);
}

.dark .toggle-switch {
  background: #374151;
}

.dark .toggle-switch.active {
  background: var(--aurora-violet);
}
```

---

## `i18n/config.ts`

```ts
export const locales = ['en', 'he'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'en'

export const localeNames: Record<Locale, string> = {
  en: 'English',
  he: 'עברית'
}

export function isRTL(locale: Locale): boolean {
  return locale === 'he'
}
```

---

