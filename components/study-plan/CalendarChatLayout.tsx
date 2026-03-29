'use client'

import { useState, type ReactNode } from 'react'
import { Calendar, MessageSquare } from 'lucide-react'
import { useTranslations } from 'next-intl'

// =============================================================================
// Props
// =============================================================================

interface CalendarChatLayoutProps {
  calendarPanel: ReactNode
  chatPanel: ReactNode
}

// =============================================================================
// Component
// =============================================================================

export default function CalendarChatLayout({
  calendarPanel,
  chatPanel,
}: CalendarChatLayoutProps) {
  const t = useTranslations('studyPlan')
  const [activeTab, setActiveTab] = useState<'calendar' | 'chat'>('calendar')

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* ── Mobile tab bar (hidden on md+) ── */}
      <div className="md:hidden flex border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shrink-0">
        <button
          onClick={() => setActiveTab('calendar')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'calendar'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <Calendar className="w-4 h-4" />
          {t('calendarTitle')}
        </button>
        <button
          onClick={() => setActiveTab('chat')}
          className={`flex-1 py-3 text-sm font-medium text-center transition-colors flex items-center justify-center gap-1.5 ${
            activeTab === 'chat'
              ? 'text-violet-600 dark:text-violet-400 border-b-2 border-violet-600 dark:border-violet-400'
              : 'text-gray-500 dark:text-gray-400'
          }`}
        >
          <MessageSquare className="w-4 h-4" />
          AI Assistant
        </button>
      </div>

      {/* ── Two-panel content ── */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left panel: Calendar — 60% on desktop, full on mobile calendar tab */}
        <div
          className={`${
            activeTab === 'calendar' ? 'flex' : 'hidden'
          } md:flex flex-col flex-1 md:w-3/5 overflow-y-auto`}
        >
          {calendarPanel}
        </div>

        {/* Right panel: Chat — 40% on desktop, full on mobile chat tab */}
        <div
          className={`${
            activeTab === 'chat' ? 'flex' : 'hidden'
          } md:flex flex-col w-full md:w-2/5 md:border-l border-gray-200 dark:border-gray-700`}
        >
          {chatPanel}
        </div>
      </div>
    </div>
  )
}
