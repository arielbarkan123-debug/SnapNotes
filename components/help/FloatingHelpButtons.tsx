'use client'

import { useState, createContext, useContext, useMemo, useCallback } from 'react'
import dynamic from 'next/dynamic'
import { useTranslations } from 'next-intl'
import { type HelpContext } from '@/types'

const HelpModal = dynamic(() => import('@/components/help/HelpModal'), {
  loading: () => null,
  ssr: false,
})
const ChatTutor = dynamic(
  () => import('@/components/chat/ChatTutor').then(mod => ({ default: mod.ChatTutor })),
  { loading: () => null, ssr: false }
)

// --- Help Context Provider ---
// Pages can optionally provide help context + course info for richer help

interface HelpContextValue {
  helpContext: HelpContext | null
  setHelpContext: (ctx: HelpContext | null) => void
  courseId: string | null
  courseName: string | null
  setCourseInfo: (id: string | null, name: string | null) => void
}

const FloatingHelpContext = createContext<HelpContextValue | undefined>(undefined)

export function useFloatingHelp() {
  return useContext(FloatingHelpContext)
}

// --- Provider + Buttons ---

export default function FloatingHelpButtons({ children }: { children: React.ReactNode }) {
  const t = useTranslations('lesson')
  const [showHelp, setShowHelp] = useState(false)
  const [isChatOpen, setIsChatOpen] = useState(false)
  const [helpContext, setHelpContext] = useState<HelpContext | null>(null)
  const [courseId, setCourseId] = useState<string | null>(null)
  const [courseName, setCourseName] = useState<string | null>(null)

  const setCourseInfo = useCallback((id: string | null, name: string | null) => {
    setCourseId(id)
    setCourseName(name)
  }, [])

  const contextValue = useMemo<HelpContextValue>(() => ({
    helpContext,
    setHelpContext,
    courseId,
    courseName,
    setCourseInfo,
  }), [helpContext, courseId, courseName, setCourseInfo])

  // Default help context when no page provides one
  const effectiveHelpContext: HelpContext = helpContext ?? {
    courseId: courseId ?? '',
    courseTitle: courseName ?? '',
    lessonIndex: 0,
    lessonTitle: '',
    stepIndex: 0,
    stepContent: '',
    stepType: 'explanation',
  }

  return (
    <FloatingHelpContext.Provider value={contextValue}>
      {children}

      {/* Only show floating help/chat buttons when a page has set help context
          (i.e., user is in a lesson, exam, or practice session) */}
      {helpContext && (
        <>
          {/* Floating Help Button */}
          <button
            onClick={() => setShowHelp(true)}
            className="fixed bottom-[calc(128px+env(safe-area-inset-bottom,0px))] md:bottom-8 end-3 xs:end-4 md:end-8 w-11 h-11 xs:w-12 xs:h-12 bg-violet-100 dark:bg-violet-900/50 text-violet-600 dark:text-violet-300 rounded-full shadow-lg flex items-center justify-center hover:bg-violet-200 dark:hover:bg-violet-900 transition-all hover:scale-110 z-40"
            aria-label={t('getHelp')}
            title={t('needHelpPressF9')}
            type="button"
          >
            <span className="text-lg xs:text-xl">❓</span>
          </button>

          {/* AI Chat Tutor Button */}
          {!isChatOpen && (
            <button
              onClick={() => setIsChatOpen(true)}
              className="fixed bottom-[calc(184px+env(safe-area-inset-bottom,0px))] md:bottom-24 end-3 xs:end-4 md:end-8 w-11 h-11 xs:w-12 xs:h-12 bg-violet-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-violet-700 transition-all hover:scale-110 z-40"
              aria-label={t('askAI')}
              title={t('askAI')}
              type="button"
            >
              <svg className="w-5 h-5 xs:w-6 xs:h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
            </button>
          )}
        </>
      )}

      {/* Help Modal — rendered outside the guard so it can close gracefully */}
      <HelpModal
        isOpen={showHelp}
        onClose={() => setShowHelp(false)}
        context={effectiveHelpContext}
      />

      {/* Chat Tutor Modal — rendered outside the guard so it can close gracefully */}
      <ChatTutor
        courseId={courseId ?? undefined}
        courseName={courseName ?? undefined}
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
      />
    </FloatingHelpContext.Provider>
  )
}
