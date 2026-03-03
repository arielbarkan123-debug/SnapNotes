'use client'

import dynamic from 'next/dynamic'
import type { GeoGebraCommand } from '@/components/diagrams/GeoGebraRenderer'

const GeoGebraRenderer = dynamic(() => import('@/components/diagrams/GeoGebraRenderer'), {
  ssr: false,
  loading: () => (
    <div className="flex h-[400px] items-center justify-center rounded-lg border border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800">
      <svg className="h-6 w-6 animate-spin text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
    </div>
  ),
})

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface GeoGebraEmbedProps {
  commands: Array<{
    command: string
    label?: string
    color?: string
    showLabel?: boolean
  }>
  title?: string
  darkMode?: boolean
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function GeoGebraEmbed({
  commands,
  title,
  darkMode = false,
}: GeoGebraEmbedProps) {
  const geogebraCommands: GeoGebraCommand[] = commands.map((cmd) => ({
    command: cmd.command,
    label: cmd.label,
    color: cmd.color,
    showLabel: cmd.showLabel,
  }))

  return (
    <GeoGebraRenderer
      commands={geogebraCommands}
      title={title}
      darkMode={darkMode}
    />
  )
}
