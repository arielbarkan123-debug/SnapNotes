'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function PageViewsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR(
    `/api/admin/analytics/page-views?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Page Views</h1>
        <div className="flex items-center gap-4">
          <input
            type="date"
            value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
          <span className="text-gray-500">to</span>
          <input
            type="date"
            value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700"
          />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse space-y-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 h-64"></div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Pages by Views ({data?.total || 0} total views)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                  <th className="pb-3">Page Path</th>
                  <th className="pb-3 text-right">Views</th>
                  <th className="pb-3 text-right">Avg Time</th>
                  <th className="pb-3 text-right">Avg Scroll</th>
                </tr>
              </thead>
              <tbody>
                {data?.aggregatedPages?.map((page: {
                  path: string
                  views: number
                  avgTimeOnPage: number
                  avgScrollDepth: number
                }, i: number) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                    <td className="py-3 font-mono text-sm text-gray-900 dark:text-white">
                      {page.path}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {page.views.toLocaleString()}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {formatDuration(page.avgTimeOnPage)}
                    </td>
                    <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                      {page.avgScrollDepth}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
