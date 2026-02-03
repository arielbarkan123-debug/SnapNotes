'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function SessionsPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR(
    `/api/admin/analytics/sessions?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  const formatDuration = (ms: number) => {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)
    if (hours > 0) return `${hours}h ${minutes % 60}m`
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`
    return `${seconds}s`
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sessions</h1>
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
        <div className="animate-pulse grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 h-24"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Sessions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.totalSessions?.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Time in App</p>
              <p className="text-2xl font-bold text-violet-600 dark:text-violet-400">
                {formatDuration(data?.stats?.totalTimeInApp || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatDuration(data?.stats?.avgDuration || 0)}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Bounce Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.bounceRate || 0}%
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pages/Session</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {data?.stats?.avgPagesPerSession || 0}
              </p>
            </div>
          </div>

          {/* Hourly Distribution */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Hourly Distribution
            </h3>
            <div className="h-32 flex items-end gap-1">
              {data?.hourlyDistribution?.map((count: number, hour: number) => {
                const max = Math.max(...(data?.hourlyDistribution || [1]))
                const height = max > 0 ? (count / max) * 100 : 0
                return (
                  <div key={hour} className="flex-1 group relative">
                    <div
                      className="w-full bg-violet-500 rounded-t hover:bg-violet-600 transition-colors"
                      style={{ height: `${Math.max(height, 2)}%` }}
                    />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap">
                      {hour}:00 - {count} sessions
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-gray-500">
              <span>12am</span>
              <span>6am</span>
              <span>12pm</span>
              <span>6pm</span>
              <span>12am</span>
            </div>
          </div>

          {/* Device Breakdown */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Devices</h3>
            <div className="grid grid-cols-3 gap-4">
              {Object.entries(data?.stats?.deviceBreakdown || {}).map(([device, count]) => (
                <div key={device} className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <p className="text-3xl mb-2">
                    {device === 'desktop' ? '💻' : device === 'mobile' ? '📱' : '📲'}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{device}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">{count as number}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
