'use client'

import { useState, useCallback } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

function formatLastUpdated(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSec = Math.floor(diffMs / 1000)

  if (diffSec < 5) return 'just now'
  if (diffSec < 60) return `${diffSec}s ago`
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`
  return date.toLocaleTimeString()
}

interface DailyMetric {
  date: string
  daily_active_users: number
  total_sessions: number
  total_page_views: number
  total_events: number
  total_errors: number
  new_users: number
}

interface OverviewData {
  dateRange: { start: string; end: string }
  previousPeriod: { start: string; end: string }
  totals: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    totalEvents: number
    totalErrors: number
    newUsers: number
  }
  previousTotals: {
    totalUsers: number
    totalSessions: number
    totalPageViews: number
    totalEvents: number
    totalErrors: number
    newUsers: number
  }
  comparison: {
    users: number
    sessions: number
    pageViews: number
    events: number
    errors: number
    newUsers: number
  }
  dailyMetrics: DailyMetric[]
  realtime: {
    activeSessions: number
    recentErrors: number
  }
  topPages: { path: string; count: number }[]
  deviceBreakdown: Record<string, number>
}

function ChangeIndicator({ change, inverted = false }: { change: number; inverted?: boolean }) {
  const isPositive = inverted ? change < 0 : change > 0
  const isNegative = inverted ? change > 0 : change < 0

  if (change === 0) {
    return <span className="text-xs text-gray-400">—</span>
  }

  return (
    <span
      className={`text-xs font-medium flex items-center gap-0.5 ${
        isPositive
          ? 'text-green-600 dark:text-green-400'
          : isNegative
          ? 'text-red-600 dark:text-red-400'
          : 'text-gray-500'
      }`}
    >
      {change > 0 ? '↑' : '↓'}
      {Math.abs(change)}%
    </span>
  )
}

export default function AnalyticsOverviewPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const [lastUpdated, setLastUpdated] = useState<Date>(new Date())
  const [isRefreshing, setIsRefreshing] = useState(false)

  const { data, error, isLoading, mutate } = useSWR<OverviewData>(
    `/api/admin/analytics/overview?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher,
    {
      refreshInterval: 30000, // Refresh every 30 seconds
      onSuccess: () => setLastUpdated(new Date()),
    }
  )

  const handleManualRefresh = useCallback(async () => {
    setIsRefreshing(true)
    await mutate()
    setIsRefreshing(false)
  }, [mutate])

  if (error) {
    return (
      <div className="p-8 text-center">
        <p className="text-red-500">Failed to load analytics data</p>
        <p className="text-sm text-gray-500 mt-2">{error.message}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Overview</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Last updated: {formatLastUpdated(lastUpdated)}
            {isRefreshing && <span className="ml-2 text-indigo-500">Refreshing...</span>}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={handleManualRefresh}
            disabled={isRefreshing}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50"
            title="Refresh data"
          >
            <svg
              className={`w-5 h-5 text-gray-600 dark:text-gray-400 ${isRefreshing ? 'animate-spin' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
          </button>
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
              <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          {/* Realtime Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400 mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium">Active Sessions</span>
              </div>
              <p className="text-3xl font-bold text-green-700 dark:text-green-300">
                {data?.realtime.activeSessions || 0}
              </p>
            </div>
            <div className={`rounded-xl p-6 ${
              (data?.realtime.recentErrors || 0) > 0
                ? 'bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800'
                : 'bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700'
            }`}>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400 mb-2">
                <span className="text-sm font-medium">Errors (24h)</span>
              </div>
              <p className={`text-3xl font-bold ${
                (data?.realtime.recentErrors || 0) > 0
                  ? 'text-red-700 dark:text-red-300'
                  : 'text-gray-700 dark:text-gray-300'
              }`}>
                {data?.realtime.recentErrors || 0}
              </p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              label="Total Users"
              value={data?.totals.totalUsers || 0}
              subValue={`${data?.totals.newUsers || 0} new`}
              icon="users"
              change={data?.comparison.users}
            />
            <MetricCard
              label="Total Sessions"
              value={data?.totals.totalSessions || 0}
              icon="sessions"
              change={data?.comparison.sessions}
            />
            <MetricCard
              label="Page Views"
              value={data?.totals.totalPageViews || 0}
              icon="pages"
              change={data?.comparison.pageViews}
            />
            <MetricCard
              label="Events"
              value={data?.totals.totalEvents || 0}
              icon="events"
              change={data?.comparison.events}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Active Users Chart */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Daily Active Users
              </h3>
              <div className="h-64">
                <SimpleLineChart
                  data={data?.dailyMetrics || []}
                  dataKey="daily_active_users"
                  dateKey="date"
                />
              </div>
            </div>

            {/* Device Breakdown */}
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Device Breakdown
              </h3>
              <div className="space-y-4">
                {Object.entries(data?.deviceBreakdown || {}).map(([device, count]) => {
                  const total = Object.values(data?.deviceBreakdown || {}).reduce((a, b) => a + b, 0)
                  const percentage = total > 0 ? (count / total) * 100 : 0
                  return (
                    <div key={device}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600 dark:text-gray-400 capitalize">{device}</span>
                        <span className="text-gray-900 dark:text-white">{count} ({percentage.toFixed(1)}%)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full"
                          style={{ width: `${percentage}%` }}
                        ></div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* Top Pages */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Top Pages
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="text-left text-sm text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-700">
                    <th className="pb-3">Page</th>
                    <th className="pb-3 text-right">Views</th>
                  </tr>
                </thead>
                <tbody>
                  {data?.topPages.map((page, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-gray-700/50">
                      <td className="py-3 text-gray-900 dark:text-white font-mono text-sm">
                        {page.path}
                      </td>
                      <td className="py-3 text-right text-gray-600 dark:text-gray-400">
                        {page.count.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// Simple metric card component
function MetricCard({
  label,
  value,
  subValue,
  icon: _icon,
  change,
  invertChange,
}: {
  label: string
  value: number
  subValue?: string
  icon: string
  change?: number
  invertChange?: boolean
}) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
      <div className="flex items-center justify-between mb-1">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        {change !== undefined && (
          <ChangeIndicator change={change} inverted={invertChange} />
        )}
      </div>
      <p className="text-2xl font-bold text-gray-900 dark:text-white">
        {value.toLocaleString()}
      </p>
      {subValue && (
        <p className="text-sm text-green-600 dark:text-green-400 mt-1">{subValue}</p>
      )}
    </div>
  )
}

// Simple line chart using CSS (no external dependencies)
function SimpleLineChart({
  data,
  dataKey,
  dateKey,
}: {
  data: DailyMetric[]
  dataKey: keyof DailyMetric
  dateKey: keyof DailyMetric
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        No data available
      </div>
    )
  }

  const values = data.map((d) => Number(d[dataKey]) || 0)
  const maxValue = Math.max(...values, 1)

  return (
    <div className="h-full flex items-end gap-1">
      {data.map((d, i) => {
        const value = Number(d[dataKey]) || 0
        const height = (value / maxValue) * 100
        const date = new Date(String(d[dateKey]))
        const isWeekend = date.getDay() === 0 || date.getDay() === 6

        return (
          <div
            key={i}
            className="flex-1 group relative"
            style={{ minWidth: '8px' }}
          >
            <div
              className={`w-full rounded-t transition-all ${
                isWeekend ? 'bg-indigo-300 dark:bg-indigo-700' : 'bg-indigo-500'
              } hover:bg-indigo-600`}
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
              {date.toLocaleDateString()}: {value}
            </div>
          </div>
        )
      })}
    </div>
  )
}
