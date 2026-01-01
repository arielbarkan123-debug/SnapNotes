'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Button from '@/components/ui/Button'

// ============================================================================
// Types
// ============================================================================

interface HomeworkItem {
  id: string
  type: 'check' | 'help'
  title: string
  subject: string
  createdAt: string
  status: string
  grade?: string
}

// ============================================================================
// Page Component
// ============================================================================

export default function HomeworkHistoryPage() {
  const [items, setItems] = useState<HomeworkItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<'all' | 'check' | 'help'>('all')

  useEffect(() => {
    async function fetchHistory() {
      try {
        // Fetch homework checks
        const checksRes = await fetch('/api/homework/check?limit=50')
        if (checksRes.ok) {
          const { checks } = await checksRes.json()
          const formattedChecks: HomeworkItem[] = (checks || []).map((check: any) => ({
            id: check.id,
            type: 'check' as const,
            title: check.topic || 'Homework Check',
            subject: check.subject || 'General',
            createdAt: check.created_at,
            status: check.status,
            grade: check.feedback?.gradeEstimate,
          }))
          setItems(formattedChecks)
        }
      } catch {
        // Error handled silently - UI shows empty state
      } finally {
        setIsLoading(false)
      }
    }

    fetchHistory()
  }, [])

  const filteredItems = items.filter(item => {
    if (filter === 'all') return true
    return item.type === filter
  })

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="container mx-auto px-4 py-6 max-w-3xl">
          <Link
            href="/homework"
            className="inline-flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 text-sm font-medium transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Homework Hub
          </Link>

          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center text-2xl shadow-lg">
              📜
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
                Homework History
              </h1>
              <p className="text-gray-600 dark:text-gray-400 text-sm">
                View your past checks and sessions
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        {/* Filters */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'all'
                ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('check')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'check'
                ? 'bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Checks
          </button>
          <button
            onClick={() => setFilter('help')}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              filter === 'help'
                ? 'bg-purple-100 dark:bg-purple-900/50 text-purple-700 dark:text-purple-300'
                : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700'
            }`}
          >
            Help Sessions
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Loading history...</p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filteredItems.length === 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="text-5xl mb-4">📭</div>
            <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
              No history yet
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
              {filter === 'all'
                ? "You haven't checked any homework or started any help sessions yet."
                : filter === 'check'
                ? "You haven't checked any homework yet."
                : "You haven't started any help sessions yet."}
            </p>
            <div className="flex gap-3 justify-center">
              <Link href="/homework/check">
                <Button variant="primary" size="md">
                  Check Homework
                </Button>
              </Link>
              <Link href="/homework/help">
                <Button variant="outline" size="md">
                  Get Help
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* History List */}
        {!isLoading && filteredItems.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
            {filteredItems.map((item, idx) => (
              <Link
                key={item.id}
                href={`/homework/${item.id}`}
                className={`flex items-center justify-between px-5 py-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${
                  idx !== filteredItems.length - 1 ? 'border-b border-gray-100 dark:border-gray-700' : ''
                }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl ${
                    item.type === 'check'
                      ? 'bg-blue-100 dark:bg-blue-900/30'
                      : 'bg-purple-100 dark:bg-purple-900/30'
                  }`}>
                    {item.type === 'check' ? '📝' : '🎓'}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">{item.title}</p>
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                      <span>{item.subject}</span>
                      <span>•</span>
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {item.grade && (
                    <span className={`px-2.5 py-1 text-xs font-semibold rounded-full ${
                      item.grade.includes('A') || item.grade.includes('Excellent')
                        ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                        : item.grade.includes('B') || item.grade.includes('Good')
                        ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                        : 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400'
                    }`}>
                      {item.grade}
                    </span>
                  )}
                  {item.status === 'analyzing' && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 rounded-full">
                      Analyzing...
                    </span>
                  )}
                  {item.status === 'error' && (
                    <span className="px-2.5 py-1 text-xs font-semibold bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 rounded-full">
                      Error
                    </span>
                  )}
                  <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
