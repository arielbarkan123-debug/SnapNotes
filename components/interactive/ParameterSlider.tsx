'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/**
 * Parameter definition for a slider
 */
export interface ParameterDef {
  id: string
  name: string
  symbol?: string
  unit?: string
  min: number
  max: number
  step: number
  defaultValue: number
  description?: string
  /** Color for the slider track */
  color?: string
  /** Whether this parameter affects physics calculations */
  affectsPhysics?: boolean
}

interface ParameterSliderProps {
  parameter: ParameterDef
  value: number
  onChange: (value: number) => void
  /** Show the numeric input field */
  showInput?: boolean
  /** Compact mode for inline use */
  compact?: boolean
  /** Disabled state */
  disabled?: boolean
  /** Language for labels */
  language?: 'en' | 'he'
}

/**
 * ParameterSlider - Interactive slider for adjusting diagram parameters
 *
 * Features:
 * - Smooth dragging with visual feedback
 * - Numeric input for precise values
 * - Unit display
 * - RTL support for Hebrew
 * - Accessibility labels
 */
export function ParameterSlider({
  parameter,
  value,
  onChange,
  showInput = true,
  compact = false,
  disabled = false,
  language = 'en',
}: ParameterSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  const isRTL = language === 'he'

  // Calculate percentage for slider fill
  const percentage = useMemo(() => {
    return ((value - parameter.min) / (parameter.max - parameter.min)) * 100
  }, [value, parameter.min, parameter.max])

  // Format display value
  const displayValue = useMemo(() => {
    const decimals = parameter.step < 1 ?
      Math.max(0, -Math.floor(Math.log10(parameter.step))) : 0
    return value.toFixed(decimals)
  }, [value, parameter.step])

  // Handle slider change
  const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseFloat(e.target.value)
    onChange(newValue)
    setInputValue(newValue.toString())
  }, [onChange])

  // Handle input change
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value)
  }, [])

  // Handle input blur - validate and apply
  const handleInputBlur = useCallback(() => {
    const parsed = parseFloat(inputValue)
    if (!isNaN(parsed)) {
      const clamped = Math.max(parameter.min, Math.min(parameter.max, parsed))
      const stepped = Math.round(clamped / parameter.step) * parameter.step
      onChange(stepped)
      setInputValue(stepped.toString())
    } else {
      setInputValue(value.toString())
    }
  }, [inputValue, parameter.min, parameter.max, parameter.step, onChange, value])

  // Handle enter key in input
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleInputBlur()
    }
  }, [handleInputBlur])

  const sliderColor = parameter.color || '#3b82f6'

  return (
    <div
      className={`
        ${compact ? 'py-1' : 'py-2'}
        ${isRTL ? 'text-right' : 'text-left'}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Label row */}
      <div className={`flex items-center justify-between mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        <label
          htmlFor={`param-${parameter.id}`}
          className="font-medium text-gray-700 dark:text-gray-300"
        >
          {parameter.symbol ? (
            <span>
              <span className="font-mono">{parameter.symbol}</span>
              {' = '}
            </span>
          ) : null}
          {parameter.name}
        </label>

        {/* Value display */}
        <div className="flex items-center gap-1">
          {showInput ? (
            <input
              type="number"
              value={inputValue}
              onChange={handleInputChange}
              onBlur={handleInputBlur}
              onKeyDown={handleInputKeyDown}
              disabled={disabled}
              min={parameter.min}
              max={parameter.max}
              step={parameter.step}
              className={`
                w-16 px-2 py-0.5 text-right font-mono
                border border-gray-300 dark:border-gray-600 rounded
                bg-white dark:bg-gray-800
                text-gray-900 dark:text-gray-100
                focus:outline-none focus:ring-2 focus:ring-blue-500
                disabled:opacity-50 disabled:cursor-not-allowed
                ${compact ? 'text-xs' : 'text-sm'}
              `}
            />
          ) : (
            <span className="font-mono text-gray-900 dark:text-gray-100">
              {displayValue}
            </span>
          )}
          {parameter.unit && (
            <span className="text-gray-500 dark:text-gray-400 text-xs">
              {parameter.unit}
            </span>
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          id={`param-${parameter.id}`}
          type="range"
          min={parameter.min}
          max={parameter.max}
          step={parameter.step}
          value={value}
          onChange={handleSliderChange}
          onMouseDown={() => setIsDragging(true)}
          onMouseUp={() => setIsDragging(false)}
          onTouchStart={() => setIsDragging(true)}
          onTouchEnd={() => setIsDragging(false)}
          disabled={disabled}
          className={`
            w-full h-2 rounded-lg appearance-none cursor-pointer
            bg-gray-200 dark:bg-gray-700
            disabled:opacity-50 disabled:cursor-not-allowed
            [&::-webkit-slider-thumb]:appearance-none
            [&::-webkit-slider-thumb]:w-4
            [&::-webkit-slider-thumb]:h-4
            [&::-webkit-slider-thumb]:rounded-full
            [&::-webkit-slider-thumb]:bg-white
            [&::-webkit-slider-thumb]:border-2
            [&::-webkit-slider-thumb]:shadow-md
            [&::-webkit-slider-thumb]:cursor-pointer
            [&::-webkit-slider-thumb]:transition-transform
            [&::-webkit-slider-thumb]:duration-150
            ${isDragging ? '[&::-webkit-slider-thumb]:scale-125' : ''}
          `}
          style={{
            background: `linear-gradient(to ${isRTL ? 'left' : 'right'}, ${sliderColor} 0%, ${sliderColor} ${percentage}%, rgb(229 231 235) ${percentage}%, rgb(229 231 235) 100%)`,
            // @ts-expect-error CSS custom property for thumb border
            '--thumb-border-color': sliderColor,
          }}
          aria-label={parameter.description || parameter.name}
        />

        {/* Dragging indicator */}
        <AnimatePresence>
          {isDragging && (
            <motion.div
              initial={{ opacity: 0, y: 5, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 5, scale: 0.9 }}
              className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-gray-900 text-white text-xs rounded shadow-lg whitespace-nowrap"
              style={{ left: `${percentage}%` }}
            >
              {displayValue}{parameter.unit ? ` ${parameter.unit}` : ''}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Min/Max labels */}
      {!compact && (
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>{parameter.min}{parameter.unit ? ` ${parameter.unit}` : ''}</span>
          <span>{parameter.max}{parameter.unit ? ` ${parameter.unit}` : ''}</span>
        </div>
      )}

      {/* Description */}
      {!compact && parameter.description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {parameter.description}
        </p>
      )}
    </div>
  )
}

/**
 * ParameterSliderGroup - Group of parameter sliders
 */
interface ParameterSliderGroupProps {
  parameters: ParameterDef[]
  values: Record<string, number>
  onChange: (id: string, value: number) => void
  title?: string
  compact?: boolean
  disabled?: boolean
  language?: 'en' | 'he'
}

export function ParameterSliderGroup({
  parameters,
  values,
  onChange,
  title,
  compact = false,
  disabled = false,
  language = 'en',
}: ParameterSliderGroupProps) {
  const isRTL = language === 'he'

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg
        ${compact ? 'p-2' : 'p-4'}
        border border-gray-200 dark:border-gray-700
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {title && (
        <h3 className={`
          font-semibold text-gray-900 dark:text-gray-100
          ${compact ? 'text-sm mb-2' : 'text-base mb-3'}
        `}>
          {title}
        </h3>
      )}

      <div className={compact ? 'space-y-1' : 'space-y-3'}>
        {parameters.map((param) => (
          <ParameterSlider
            key={param.id}
            parameter={param}
            value={values[param.id] ?? param.defaultValue}
            onChange={(value) => onChange(param.id, value)}
            compact={compact}
            disabled={disabled}
            language={language}
          />
        ))}
      </div>
    </div>
  )
}

export default ParameterSlider
