'use client'

import { useState, useMemo } from 'react'
import useSWR from 'swr'

const fetcher = (url: string) => fetch(url).then((res) => res.json())

interface ClickData {
  clicks: { x: number; y: number; path: string; event: string; time: string }[]
  pages: string[]
  densityGrid: number[][]
  maxDensity: number
  totalClicks: number
}

function getHeatColor(value: number, max: number): string {
  if (max === 0) return 'rgba(59, 130, 246, 0)'
  const ratio = value / max

  if (ratio < 0.2) return `rgba(59, 130, 246, ${ratio * 2})`
  if (ratio < 0.4) return `rgba(34, 197, 94, ${0.4 + ratio})`
  if (ratio < 0.6) return `rgba(234, 179, 8, ${0.5 + ratio * 0.5})`
  if (ratio < 0.8) return `rgba(249, 115, 22, ${0.6 + ratio * 0.4})`
  return `rgba(239, 68, 68, ${0.7 + ratio * 0.3})`
}

export default function HeatmapPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [selectedPage, setSelectedPage] = useState<string>('')

  const apiUrl = useMemo(() => {
    const params = new URLSearchParams({
      startDate: dateRange.startDate,
      endDate: dateRange.endDate,
    })
    if (selectedPage) params.set('path', selectedPage)
    return `/api/admin/analytics/clicks?${params}`
  }, [dateRange.startDate, dateRange.endDate, selectedPage])

  const { data, isLoading } = useSWR<ClickData>(apiUrl, fetcher)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Click Heatmap</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Visualize where users click on your pages
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

      {/* Page Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          Filter by Page
        </label>
        <select
          value={selectedPage}
          onChange={(e) => setSelectedPage(e.target.value)}
          className="w-full md:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
        >
          <option value="">All Pages</option>
          {data?.pages.map((page) => (
            <option key={page} value={page}>
              {page}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 animate-pulse">
          <div className="h-64 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      ) : (
        <>
          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Clicks</p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white">
                {data?.totalClicks.toLocaleString() || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Pages with Clicks</p>
              <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
                {data?.pages.length || 0}
              </p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <p className="text-sm text-gray-500 dark:text-gray-400">Hottest Zone</p>
              <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                {data?.maxDensity || 0} clicks
              </p>
            </div>
          </div>

          {/* Heatmap Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Click Density Grid
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Shows click distribution across the viewport (10x10 grid)
            </p>

            {data?.totalClicks === 0 ? (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                No click data available for this period
              </div>
            ) : (
              <div className="relative">
                {/* Axis labels */}
                <div className="flex items-center justify-between mb-2 text-xs text-gray-500">
                  <span>Left</span>
                  <span>Center</span>
                  <span>Right</span>
                </div>

                {/* Grid */}
                <div className="aspect-video border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div
                    className="grid h-full"
                    style={{
                      gridTemplateColumns: `repeat(${data?.densityGrid[0]?.length || 10}, 1fr)`,
                      gridTemplateRows: `repeat(${data?.densityGrid.length || 10}, 1fr)`,
                    }}
                  >
                    {data?.densityGrid.map((row, rowIndex) =>
                      row.map((value, colIndex) => (
                        <div
                          key={`${rowIndex}-${colIndex}`}
                          className="flex items-center justify-center text-xs font-medium border border-gray-100 dark:border-gray-700/50 transition-colors hover:border-gray-300"
                          style={{
                            backgroundColor: getHeatColor(value, data.maxDensity),
                            color: value > data.maxDensity * 0.5 ? 'white' : 'inherit',
                          }}
                          title={`Row ${rowIndex + 1}, Col ${colIndex + 1}: ${value} clicks`}
                        >
                          {value > 0 && value}
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Vertical axis label */}
                <div className="flex justify-between mt-2 text-xs text-gray-500">
                  <span>Top</span>
                  <span>Bottom</span>
                </div>

                {/* Legend */}
                <div className="flex items-center justify-center gap-4 mt-4">
                  <span className="text-xs text-gray-500">Low</span>
                  <div className="flex gap-0.5">
                    <div className="w-6 h-4 rounded-l" style={{ backgroundColor: 'rgba(59, 130, 246, 0.3)' }} />
                    <div className="w-6 h-4" style={{ backgroundColor: 'rgba(34, 197, 94, 0.6)' }} />
                    <div className="w-6 h-4" style={{ backgroundColor: 'rgba(234, 179, 8, 0.7)' }} />
                    <div className="w-6 h-4" style={{ backgroundColor: 'rgba(249, 115, 22, 0.8)' }} />
                    <div className="w-6 h-4 rounded-r" style={{ backgroundColor: 'rgba(239, 68, 68, 0.9)' }} />
                  </div>
                  <span className="text-xs text-gray-500">High</span>
                </div>
              </div>
            )}
          </div>

          {/* Recent Clicks Table */}
          {data && data.clicks.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Recent Clicks
              </h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200 dark:border-gray-700">
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Time</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Page</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Event</th>
                      <th className="text-left py-2 px-3 text-gray-600 dark:text-gray-400">Position</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.clicks.slice(0, 20).map((click, index) => (
                      <tr
                        key={index}
                        className="border-b border-gray-100 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <td className="py-2 px-3 text-gray-900 dark:text-white">
                          {new Date(click.time).toLocaleString()}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400 font-mono text-xs">
                          {click.path}
                        </td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">{click.event}</td>
                        <td className="py-2 px-3 text-gray-600 dark:text-gray-400">
                          ({click.x.toFixed(0)}, {click.y.toFixed(0)})
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
