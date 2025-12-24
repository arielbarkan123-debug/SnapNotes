'use client'

import { useState } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

export default function EngagementPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })

  const { data, isLoading } = useSWR(
    `/api/admin/analytics/engagement?startDate=${dateRange.startDate}&endDate=${dateRange.endDate}`,
    fetcher
  )

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Engagement</h1>
        <div className="flex items-center gap-4">
          <input type="date" value={dateRange.startDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
          <span className="text-gray-500">to</span>
          <input type="date" value={dateRange.endDate}
            onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700" />
        </div>
      </div>

      {isLoading ? (
        <div className="animate-pulse grid grid-cols-3 gap-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-white dark:bg-gray-800 rounded-xl p-6 h-24"></div>
          ))}
        </div>
      ) : (
        <>
          {/* Active Users */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">DAU (Today)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.activeUsers?.daily || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">WAU (7 days)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.activeUsers?.weekly || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">MAU (30 days)</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.activeUsers?.monthly || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Stickiness (DAU/MAU)</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.stickiness || 0}%
              </p>
            </div>
          </div>

          {/* Retention */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Retention</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{data?.retention?.day1 || 0}%</p>
                <p className="text-sm text-gray-500 mt-1">Day 1</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-yellow-600">{data?.retention?.day7 || 0}%</p>
                <p className="text-sm text-gray-500 mt-1">Day 7</p>
              </div>
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{data?.retention?.day30 || 0}%</p>
                <p className="text-sm text-gray-500 mt-1">Day 30</p>
              </div>
            </div>
          </div>

          {/* Activity Heatmap */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Activity Heatmap (Sessions by Hour & Day)
            </h3>
            <div className="overflow-x-auto">
              <div className="min-w-[600px]">
                {/* Hour labels */}
                <div className="flex mb-2">
                  <div className="w-12"></div>
                  {Array.from({ length: 24 }, (_, i) => (
                    <div key={i} className="flex-1 text-center text-xs text-gray-500">
                      {i % 6 === 0 ? `${i}:00` : ''}
                    </div>
                  ))}
                </div>
                {/* Heatmap grid */}
                {dayNames.map((day, dayIndex) => {
                  const dayData = data?.heatmapData?.[dayIndex] || Array(24).fill(0)
                  const maxValue = Math.max(...(data?.heatmapData?.flat() || [1]))
                  return (
                    <div key={day} className="flex items-center mb-1">
                      <div className="w-12 text-xs text-gray-500 dark:text-gray-400">{day}</div>
                      {dayData.map((value: number, hour: number) => {
                        const intensity = maxValue > 0 ? value / maxValue : 0
                        return (
                          <div
                            key={hour}
                            className="flex-1 h-6 mx-0.5 rounded-sm transition-colors group relative"
                            style={{
                              backgroundColor: `rgba(99, 102, 241, ${intensity * 0.9 + 0.1})`,
                            }}
                          >
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10">
                              {day} {hour}:00 - {value} sessions
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
