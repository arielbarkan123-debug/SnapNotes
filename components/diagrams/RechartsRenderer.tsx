'use client'

import { useMemo } from 'react'
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { useTranslations } from 'next-intl'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ChartType = 'bar' | 'histogram' | 'pie' | 'line' | 'scatter' | 'dot_plot' | 'box_plot'

export interface ChartDataPoint {
  name: string
  value: number
  [key: string]: string | number
}

export interface BoxPlotData {
  label: string
  min: number
  q1: number
  median: number
  q3: number
  max: number
  outliers?: number[]
}

export interface RechartsRendererProps {
  chartType: ChartType
  data: ChartDataPoint[]
  boxPlotData?: BoxPlotData[]
  xAxisLabel?: string
  yAxisLabel?: string
  title?: string
  colors?: string[]
  darkMode?: boolean
  seriesKeys?: string[]
}

// ---------------------------------------------------------------------------
// Default Colors
// ---------------------------------------------------------------------------

const DEFAULT_COLORS = [
  '#6366f1', '#ef4444', '#22c55e', '#f59e0b', '#3b82f6',
  '#ec4899', '#14b8a6', '#f97316', '#8b5cf6', '#06b6d4',
]

// ---------------------------------------------------------------------------
// Box Plot SVG Component
// ---------------------------------------------------------------------------

function BoxPlotChart({
  data,
  darkMode,
  title,
}: {
  data: BoxPlotData[]
  darkMode: boolean
  title?: string
}) {
  const textColor = darkMode ? '#d1d5db' : '#374151'
  const gridColor = darkMode ? '#374151' : '#e5e7eb'

  // Calculate bounds
  const allValues = data.flatMap((d) => [d.min, d.max, ...(d.outliers || [])])
  const dataMin = Math.min(...allValues)
  const dataMax = Math.max(...allValues)
  const padding = (dataMax - dataMin) * 0.1 || 1
  const scaleMin = dataMin - padding
  const scaleMax = dataMax + padding

  const svgWidth = 500
  const svgHeight = 60 * data.length + 80
  const plotLeft = 80
  const plotRight = svgWidth - 30
  const plotWidth = plotRight - plotLeft
  const plotTop = 30
  const boxHeight = 30
  const rowHeight = 60

  const scale = (v: number) =>
    plotLeft + ((v - scaleMin) / (scaleMax - scaleMin)) * plotWidth

  // Tick marks
  const tickCount = 6
  const step = (scaleMax - scaleMin) / (tickCount - 1)
  const ticks = Array.from({ length: tickCount }, (_, i) =>
    Math.round((scaleMin + step * i) * 100) / 100
  )

  return (
    <svg
      viewBox={`0 0 ${svgWidth} ${svgHeight}`}
      className="w-full"
      role="img"
      aria-label={title || 'Box plot'}
    >
      {title && (
        <text x={svgWidth / 2} y={16} textAnchor="middle" fontSize={13} fill={textColor} fontWeight="600">
          {title}
        </text>
      )}

      {/* Axis line */}
      <line x1={plotLeft} y1={svgHeight - 40} x2={plotRight} y2={svgHeight - 40} stroke={gridColor} strokeWidth={1} />

      {/* Ticks & labels */}
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={scale(t)} y1={svgHeight - 40} x2={scale(t)} y2={svgHeight - 35} stroke={gridColor} />
          <text x={scale(t)} y={svgHeight - 22} textAnchor="middle" fontSize={10} fill={textColor}>
            {t}
          </text>
          {/* Grid lines */}
          <line x1={scale(t)} y1={plotTop} x2={scale(t)} y2={svgHeight - 40} stroke={gridColor} strokeWidth={0.5} strokeDasharray="3,3" opacity={0.5} />
        </g>
      ))}

      {/* Boxes */}
      {data.map((d, i) => {
        const cy = plotTop + i * rowHeight + boxHeight / 2 + 10
        const color = DEFAULT_COLORS[i % DEFAULT_COLORS.length]

        return (
          <g key={i}>
            {/* Label */}
            <text x={plotLeft - 8} y={cy + 4} textAnchor="end" fontSize={11} fill={textColor}>
              {d.label}
            </text>

            {/* Whisker line (min to max) */}
            <line x1={scale(d.min)} y1={cy} x2={scale(d.max)} y2={cy} stroke={color} strokeWidth={1.5} />

            {/* Min cap */}
            <line x1={scale(d.min)} y1={cy - 8} x2={scale(d.min)} y2={cy + 8} stroke={color} strokeWidth={1.5} />

            {/* Max cap */}
            <line x1={scale(d.max)} y1={cy - 8} x2={scale(d.max)} y2={cy + 8} stroke={color} strokeWidth={1.5} />

            {/* Box (Q1 to Q3) */}
            <rect
              x={scale(d.q1)}
              y={cy - boxHeight / 2}
              width={scale(d.q3) - scale(d.q1)}
              height={boxHeight}
              fill={color}
              fillOpacity={0.2}
              stroke={color}
              strokeWidth={1.5}
              rx={2}
            />

            {/* Median line */}
            <line
              x1={scale(d.median)}
              y1={cy - boxHeight / 2}
              x2={scale(d.median)}
              y2={cy + boxHeight / 2}
              stroke={color}
              strokeWidth={2.5}
            />

            {/* Outliers */}
            {(d.outliers || []).map((o, j) => (
              <circle key={j} cx={scale(o)} cy={cy} r={3} fill="none" stroke={color} strokeWidth={1.5} />
            ))}
          </g>
        )
      })}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Dot Plot SVG Component
// ---------------------------------------------------------------------------

function DotPlotChart({
  data,
  darkMode,
  title,
  xAxisLabel,
}: {
  data: ChartDataPoint[]
  darkMode: boolean
  title?: string
  xAxisLabel?: string
}) {
  const t = useTranslations('diagram')
  const textColor = darkMode ? '#d1d5db' : '#374151'
  const gridColor = darkMode ? '#374151' : '#e5e7eb'

  // Group data by name to stack dots
  const groups = data.reduce<Record<string, number>>((acc, d) => {
    acc[d.name] = (acc[d.name] || 0) + d.value
    return acc
  }, {})

  const labels = Object.keys(groups)
  const maxCount = Math.max(...Object.values(groups), 1)

  const svgWidth = Math.max(400, labels.length * 50 + 80)
  const svgHeight = maxCount * 20 + 80
  const plotLeft = 40
  const plotBottom = svgHeight - 40
  const dotRadius = 6
  const dotSpacing = 18

  const xStep = (svgWidth - plotLeft - 30) / Math.max(labels.length, 1)

  return (
    <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full" role="img" aria-label={title || t('dotPlotLabel')}>
      {title && (
        <text x={svgWidth / 2} y={16} textAnchor="middle" fontSize={13} fill={textColor} fontWeight="600">
          {title}
        </text>
      )}

      {/* Axis */}
      <line x1={plotLeft} y1={plotBottom} x2={svgWidth - 20} y2={plotBottom} stroke={gridColor} strokeWidth={1} />

      {labels.map((label, i) => {
        const cx = plotLeft + i * xStep + xStep / 2
        const count = groups[label]

        return (
          <g key={i}>
            {/* Label */}
            <text x={cx} y={plotBottom + 18} textAnchor="middle" fontSize={10} fill={textColor}>
              {label}
            </text>

            {/* Dots stacked upward */}
            {Array.from({ length: count }, (_, j) => (
              <circle
                key={j}
                cx={cx}
                cy={plotBottom - 10 - j * dotSpacing}
                r={dotRadius}
                fill={DEFAULT_COLORS[0]}
                fillOpacity={0.8}
                stroke={DEFAULT_COLORS[0]}
                strokeWidth={1}
              />
            ))}
          </g>
        )
      })}

      {/* X-axis label */}
      {xAxisLabel && (
        <text x={svgWidth / 2} y={svgHeight - 4} textAnchor="middle" fontSize={11} fill={textColor}>
          {xAxisLabel}
        </text>
      )}
    </svg>
  )
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function RechartsRenderer({
  chartType,
  data,
  boxPlotData,
  xAxisLabel,
  yAxisLabel,
  title,
  colors = DEFAULT_COLORS,
  darkMode = false,
  seriesKeys,
}: RechartsRendererProps) {
  const textColor = darkMode ? '#d1d5db' : '#374151'
  const gridColor = darkMode ? '#374151' : '#e5e7eb'

  const chartColors = useMemo(() => {
    return colors.length > 0 ? colors : DEFAULT_COLORS
  }, [colors])

  // Box plot uses custom SVG
  if (chartType === 'box_plot' && boxPlotData) {
    return (
      <div className="w-full">
        <BoxPlotChart data={boxPlotData} darkMode={darkMode} title={title} />
      </div>
    )
  }

  // Dot plot uses custom SVG
  if (chartType === 'dot_plot') {
    return (
      <div className="w-full">
        <DotPlotChart data={data} darkMode={darkMode} title={title} xAxisLabel={xAxisLabel} />
      </div>
    )
  }

  const renderChart = () => {
    switch (chartType) {
      case 'bar':
      case 'histogram': {
        const keys = seriesKeys || ['value']
        return (
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: textColor } : undefined} />
            <YAxis tick={{ fill: textColor, fontSize: 11 }} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined} />
            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: gridColor, color: textColor }} />
            {keys.length > 1 && <Legend />}
            {keys.map((key, i) => (
              <Bar key={key} dataKey={key} fill={chartColors[i % chartColors.length]} radius={[2, 2, 0, 0]} />
            ))}
          </BarChart>
        )
      }

      case 'pie':
        return (
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={120}
              label={({ name, percent }: { name?: string; percent?: number }) => `${name ?? ''} ${((percent ?? 0) * 100).toFixed(0)}%`}
            >
              {data.map((_, i) => (
                <Cell key={i} fill={chartColors[i % chartColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: gridColor, color: textColor }} />
            <Legend />
          </PieChart>
        )

      case 'line': {
        const keys = seriesKeys || ['value']
        return (
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 11 }} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: textColor } : undefined} />
            <YAxis tick={{ fill: textColor, fontSize: 11 }} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined} />
            <Tooltip contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: gridColor, color: textColor }} />
            {keys.length > 1 && <Legend />}
            {keys.map((key, i) => (
              <Line key={key} type="monotone" dataKey={key} stroke={chartColors[i % chartColors.length]} strokeWidth={2} dot={{ r: 3 }} />
            ))}
          </LineChart>
        )
      }

      case 'scatter':
        return (
          <ScatterChart>
            <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
            <XAxis dataKey="x" type="number" tick={{ fill: textColor, fontSize: 11 }} name={xAxisLabel || 'X'} label={xAxisLabel ? { value: xAxisLabel, position: 'insideBottom', offset: -5, fill: textColor } : undefined} />
            <YAxis dataKey="y" type="number" tick={{ fill: textColor, fontSize: 11 }} name={yAxisLabel || 'Y'} label={yAxisLabel ? { value: yAxisLabel, angle: -90, position: 'insideLeft', fill: textColor } : undefined} />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ backgroundColor: darkMode ? '#1f2937' : '#fff', borderColor: gridColor, color: textColor }} />
            <Scatter data={data} fill={chartColors[0]} />
          </ScatterChart>
        )

      default:
        return null
    }
  }

  return (
    <div className="w-full">
      {title && (
        <h3 className="mb-2 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
          {title}
        </h3>
      )}
      <ResponsiveContainer width="100%" height={350}>
        {renderChart() || <div />}
      </ResponsiveContainer>
    </div>
  )
}
