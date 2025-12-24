'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface JourneyData {
  transitions: { from: string; to: string; count: number }[]
  pages: string[]
  entryPages: { path: string; count: number }[]
  exitPages: { path: string; count: number }[]
  stats: {
    totalSessions: number
    avgPagesPerSession: string
    totalTransitions: number
  }
}

function shortenPath(path: string): string {
  if (path.length <= 25) return path
  const parts = path.split('/')
  if (parts.length > 3) {
    return `/${parts[1]}/.../${parts[parts.length - 1]}`
  }
  return path.substring(0, 22) + '...'
}

export default function JourneysPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR<JourneyData>(
    `/api/admin/analytics/journeys?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  const maxTransitionCount = data?.transitions[0]?.count || 1

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Journeys</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Navigation paths and flow between pages
          </p>
        </div>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.stats.totalSessions.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Pages/Session</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.stats.avgPagesPerSession || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Page Transitions</p>
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {data?.stats.totalTransitions.toLocaleString() || 0}
              </p>
            </div>
          </div>

          {/* Entry & Exit Pages */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Entry Pages */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-green-500">→</span> Top Entry Pages
              </h2>
              {data?.entryPages.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {data?.entryPages.map((page, index) => (
                    <div key={page.path} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate font-mono">
                          {page.path}
                        </p>
                        <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-green-500 rounded-full"
                            style={{
                              width: `${(page.count / (data.entryPages[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {page.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Exit Pages */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <span className="text-red-500">←</span> Top Exit Pages
              </h2>
              {data?.exitPages.length === 0 ? (
                <p className="text-gray-500 dark:text-gray-400 text-center py-4">No data</p>
              ) : (
                <div className="space-y-3">
                  {data?.exitPages.map((page, index) => (
                    <div key={page.path} className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-500 w-6">{index + 1}.</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-900 dark:text-white truncate font-mono">
                          {page.path}
                        </p>
                        <div className="mt-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{
                              width: `${(page.count / (data.exitPages[0]?.count || 1)) * 100}%`,
                            }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                        {page.count}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Page Transitions Flow */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Page Transitions
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Most common navigation paths between pages
            </p>

            {data?.transitions.length === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No navigation data available for this period
              </div>
            ) : (
              <div className="space-y-3">
                {data?.transitions.slice(0, 20).map((transition, index) => (
                  <div
                    key={`${transition.from}-${transition.to}`}
                    className="flex items-center gap-4 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-400 w-6">{index + 1}.</span>
                    <div className="flex-1 min-w-0 flex items-center gap-2">
                      <code className="text-sm bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-1 rounded truncate max-w-[200px]">
                        {shortenPath(transition.from)}
                      </code>
                      <span className="text-indigo-500 flex-shrink-0">→</span>
                      <code className="text-sm bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 px-2 py-1 rounded truncate max-w-[200px]">
                        {shortenPath(transition.to)}
                      </code>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <div className="w-24 h-2 bg-gray-200 dark:bg-gray-600 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{
                            width: `${(transition.count / maxTransitionCount) * 100}%`,
                          }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-400 w-12 text-right">
                        {transition.count}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}
