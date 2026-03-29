'use client'

import { Zap, CalendarDays, Pencil, Loader2 } from 'lucide-react'
import type { PrepStrategy } from '@/types'

// ============================================================================
// Props
// ============================================================================

interface PrepStrategyPickerProps {
  strategy: PrepStrategy
  days: number
  onStrategyChange: (strategy: PrepStrategy) => void
  onDaysChange: (days: number) => void
  onGenerate: () => void
  isGenerating?: boolean
}

// ============================================================================
// Strategy card definitions
// ============================================================================

interface StrategyCardDef {
  key: PrepStrategy
  icon: typeof Zap
  label: string
  description: string
}

const STRATEGIES: StrategyCardDef[] = [
  {
    key: 'cram',
    icon: Zap,
    label: 'Cram',
    description: 'Study everything the night before',
  },
  {
    key: 'spread',
    icon: CalendarDays,
    label: 'Spread',
    description: 'Distribute across multiple days',
  },
  {
    key: 'custom',
    icon: Pencil,
    label: 'Custom',
    description: "I'll plan it myself",
  },
]

// ============================================================================
// Component
// ============================================================================

export default function PrepStrategyPicker({
  strategy,
  days,
  onStrategyChange,
  onDaysChange,
  onGenerate,
  isGenerating = false,
}: PrepStrategyPickerProps) {
  return (
    <div className="space-y-4">
      {/* Strategy cards */}
      <div className="grid grid-cols-3 gap-2">
        {STRATEGIES.map((s) => {
          const isSelected = strategy === s.key
          const Icon = s.icon
          return (
            <button
              key={s.key}
              type="button"
              onClick={() => onStrategyChange(s.key)}
              className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all
                focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2
                dark:focus:ring-offset-gray-800
                ${
                  isSelected
                    ? 'border-violet-500 bg-violet-50 dark:bg-violet-900/30 dark:border-violet-400'
                    : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-700 hover:border-gray-300 dark:hover:border-gray-500'
                }`}
            >
              <Icon
                className={`w-5 h-5 ${
                  isSelected
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-gray-500 dark:text-gray-400'
                }`}
              />
              <span
                className={`text-xs font-semibold ${
                  isSelected
                    ? 'text-violet-700 dark:text-violet-300'
                    : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {s.label}
              </span>
              <span className="text-[10px] text-gray-500 dark:text-gray-400 text-center leading-tight">
                {s.description}
              </span>
            </button>
          )
        })}
      </div>

      {/* Day slider (visible when Spread is selected) */}
      {strategy === 'spread' && (
        <div className="space-y-2 px-1">
          <div className="flex items-center justify-between">
            <label
              htmlFor="prep-days-slider"
              className="text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              Prep days
            </label>
            <span className="text-sm font-bold text-violet-600 dark:text-violet-400">
              {days} {days === 1 ? 'day' : 'days'}
            </span>
          </div>
          <input
            id="prep-days-slider"
            type="range"
            min={1}
            max={14}
            value={days}
            onChange={(e) => onDaysChange(Number(e.target.value))}
            className="w-full h-2 rounded-full appearance-none cursor-pointer
              bg-gray-200 dark:bg-gray-600
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-violet-500
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-white
              [&::-webkit-slider-thumb]:dark:border-gray-800
              [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-violet-500
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-white
              [&::-moz-range-thumb]:dark:border-gray-800
              [&::-moz-range-thumb]:cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-gray-400">
            <span>1</span>
            <span>7</span>
            <span>14</span>
          </div>
        </div>
      )}

      {/* Generate button */}
      <button
        type="button"
        onClick={onGenerate}
        disabled={strategy === 'custom' || isGenerating}
        className="w-full py-2.5 px-4 rounded-xl font-semibold text-sm text-white
          bg-gradient-to-r from-violet-500 to-violet-600
          hover:from-violet-600 hover:to-violet-700
          disabled:opacity-50 disabled:cursor-not-allowed
          transition-all focus:outline-none focus:ring-2 focus:ring-violet-400 focus:ring-offset-2
          dark:focus:ring-offset-gray-800
          flex items-center justify-center gap-2"
      >
        {isGenerating ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Generating schedule...
          </>
        ) : (
          'Generate Study Schedule'
        )}
      </button>
    </div>
  )
}
