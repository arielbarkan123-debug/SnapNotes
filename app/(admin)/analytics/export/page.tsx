'use client'

import { useState } from 'react'

type DataType = 'sessions' | 'page-views' | 'events' | 'errors' | 'funnels'
type ExportFormat = 'csv' | 'json'

const DATA_TYPES: { id: DataType; label: string; description: string }[] = [
  { id: 'sessions', label: 'Sessions', description: 'User session data with device info' },
  { id: 'page-views', label: 'Page Views', description: 'Individual page view events' },
  { id: 'events', label: 'Events', description: 'Custom events and feature usage' },
  { id: 'errors', label: 'Errors', description: 'JavaScript and API errors' },
  { id: 'funnels', label: 'Funnels', description: 'Funnel step completions' },
]

export default function ExportPage() {
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
  })
  const [selectedTypes, setSelectedTypes] = useState<DataType[]>(['sessions'])
  const [format, setFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)
  const [exportStatus, setExportStatus] = useState<string | null>(null)

  const toggleDataType = (type: DataType) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    )
  }

  const handleExport = async () => {
    if (selectedTypes.length === 0) {
      setExportStatus('Please select at least one data type to export.')
      return
    }

    setIsExporting(true)
    setExportStatus(null)

    try {
      for (const dataType of selectedTypes) {
        const params = new URLSearchParams({
          startDate: dateRange.startDate,
          endDate: dateRange.endDate,
          type: dataType,
          format,
        })

        const response = await fetch(`/api/admin/analytics/export?${params}`)

        if (!response.ok) {
          throw new Error(`Failed to export ${dataType}`)
        }

        // Get the file content
        const blob = await response.blob()
        const filename =
          format === 'csv'
            ? `analytics_${dataType}_${dateRange.startDate}_${dateRange.endDate}.csv`
            : `analytics_${dataType}_${dateRange.startDate}_${dateRange.endDate}.json`

        // Trigger download
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = filename
        document.body.appendChild(a)
        a.click()
        window.URL.revokeObjectURL(url)
        document.body.removeChild(a)

        // Small delay between downloads
        if (selectedTypes.length > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500))
        }
      }

      setExportStatus(`Successfully exported ${selectedTypes.length} file(s)`)
    } catch (error) {
      console.error('Export error:', error)
      setExportStatus(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Export Data</h1>
        <p className="mt-1 text-gray-600 dark:text-gray-400">
          Download analytics data as CSV or JSON files
        </p>
      </div>

      {/* Date Range */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Date Range
        </h2>
        <div className="flex flex-wrap items-center gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Date
            </label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, startDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Date
            </label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange((prev) => ({ ...prev, endDate: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          <div className="flex gap-2 mt-5">
            <button
              onClick={() => {
                const today = new Date()
                const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
                setDateRange({
                  startDate: weekAgo.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 7 days
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)
                setDateRange({
                  startDate: monthAgo.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 30 days
            </button>
            <button
              onClick={() => {
                const today = new Date()
                const monthAgo = new Date(today.getTime() - 90 * 24 * 60 * 60 * 1000)
                setDateRange({
                  startDate: monthAgo.toISOString().split('T')[0],
                  endDate: today.toISOString().split('T')[0],
                })
              }}
              className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600"
            >
              Last 90 days
            </button>
          </div>
        </div>
      </div>

      {/* Data Types */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Select Data to Export
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {DATA_TYPES.map((type) => (
            <label
              key={type.id}
              className={`flex items-start gap-3 p-4 border-2 rounded-xl cursor-pointer transition-colors ${
                selectedTypes.includes(type.id)
                  ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <input
                type="checkbox"
                checked={selectedTypes.includes(type.id)}
                onChange={() => toggleDataType(type.id)}
                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{type.label}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{type.description}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      {/* Export Format */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Export Format
        </h2>
        <div className="flex gap-4">
          <label
            className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl cursor-pointer transition-colors ${
              format === 'csv'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="format"
              value="csv"
              checked={format === 'csv'}
              onChange={() => setFormat('csv')}
              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">CSV</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Spreadsheet compatible (Excel, Google Sheets)
              </p>
            </div>
          </label>
          <label
            className={`flex items-center gap-3 px-4 py-3 border-2 rounded-xl cursor-pointer transition-colors ${
              format === 'json'
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
            }`}
          >
            <input
              type="radio"
              name="format"
              value="json"
              checked={format === 'json'}
              onChange={() => setFormat('json')}
              className="w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
            />
            <div>
              <p className="font-medium text-gray-900 dark:text-white">JSON</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Machine readable, includes metadata
              </p>
            </div>
          </label>
        </div>
      </div>

      {/* Export Button */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6">
        <button
          onClick={handleExport}
          disabled={isExporting || selectedTypes.length === 0}
          className={`w-full md:w-auto px-8 py-3 rounded-xl font-semibold transition-colors ${
            isExporting || selectedTypes.length === 0
              ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed'
              : 'bg-indigo-600 hover:bg-indigo-700 text-white'
          }`}
        >
          {isExporting ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
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
              Exporting...
            </span>
          ) : (
            <>
              Download {selectedTypes.length} File{selectedTypes.length !== 1 ? 's' : ''} ({format.toUpperCase()})
            </>
          )}
        </button>

        {exportStatus && (
          <p
            className={`mt-4 text-sm ${
              exportStatus.includes('Successfully')
                ? 'text-green-600 dark:text-green-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {exportStatus}
          </p>
        )}

        <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
          Data will be limited to 10,000 rows per export. For larger exports, use smaller date ranges.
        </p>
      </div>
    </div>
  )
}
