'use client'

import { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { ParameterDefinition, SliderMark } from '@/types/interactivity'

/**
 * Legacy parameter definition for backward compatibility
 * @deprecated Use ParameterDefinition from types/interactivity.ts instead
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

/**
 * Convert legacy ParameterDef to new ParameterDefinition
 */
export function convertLegacyParameter(legacy: ParameterDef): ParameterDefinition {
  return {
    name: legacy.id,
    label: legacy.name,
    default: legacy.defaultValue,
    min: legacy.min,
    max: legacy.max,
    step: legacy.step,
    unit: legacy.unit,
    description: legacy.description,
    color: legacy.color,
    affectsPhysics: legacy.affectsPhysics,
  }
}

interface ParameterSliderProps {
  parameter: ParameterDefinition | ParameterDef
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
  /** Optional marks/ticks on the slider */
  marks?: SliderMark[]
  /** Show current value display (default: true) */
  showValue?: boolean
  /** Additional className */
  className?: string
}

/**
 * Type guard to check if parameter is legacy ParameterDef
 */
function isLegacyParameter(param: ParameterDefinition | ParameterDef): param is ParameterDef {
  return 'id' in param && 'defaultValue' in param
}

/**
 * Normalize parameter to ParameterDefinition format
 */
function normalizeParameter(param: ParameterDefinition | ParameterDef): ParameterDefinition {
  if (isLegacyParameter(param)) {
    return convertLegacyParameter(param)
  }
  return param
}

/**
 * ParameterSlider - Interactive slider for adjusting diagram parameters
 *
 * Features:
 * - Smooth dragging with visual feedback
 * - Numeric input for precise values
 * - Unit display with i18n support
 * - RTL support for Hebrew
 * - Optional marks/ticks
 * - Accessibility labels
 */
export function ParameterSlider({
  parameter: rawParameter,
  value,
  onChange,
  showInput = true,
  compact = false,
  disabled = false,
  language = 'en',
  marks,
  showValue = true,
  className = '',
}: ParameterSliderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [inputValue, setInputValue] = useState(value.toString())

  const isRTL = language === 'he'

  // Normalize parameter to new format
  const parameter = useMemo(() => normalizeParameter(rawParameter), [rawParameter])

  // Get localized strings
  const label = isRTL && parameter.labelHe ? parameter.labelHe : parameter.label
  const unit = isRTL && parameter.unitHe ? parameter.unitHe : parameter.unit
  const description = isRTL && parameter.descriptionHe ? parameter.descriptionHe : parameter.description

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
        ${className}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* Label row */}
      <div className={`flex items-center justify-between mb-1 ${compact ? 'text-xs' : 'text-sm'}`}>
        <label
          htmlFor={`param-${parameter.name}`}
          className="font-medium text-gray-700 dark:text-gray-300"
        >
          {label}
        </label>

        {/* Value display */}
        {showValue && (
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
            {unit && (
              <span className="text-gray-500 dark:text-gray-400 text-xs">
                {unit}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Slider */}
      <div className="relative">
        <input
          id={`param-${parameter.name}`}
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
          aria-label={description || label}
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
              {displayValue}{unit ? ` ${unit}` : ''}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Marks */}
        {marks && marks.length > 0 && (
          <div className="relative w-full h-4 mt-1">
            {marks.map((mark) => {
              const markPercentage = ((mark.value - parameter.min) / (parameter.max - parameter.min)) * 100
              const markLabel = isRTL && mark.labelHe ? mark.labelHe : mark.label
              return (
                <div
                  key={mark.value}
                  className="absolute transform -translate-x-1/2 flex flex-col items-center"
                  style={{ left: `${markPercentage}%` }}
                >
                  <div className="w-0.5 h-1.5 bg-gray-400 dark:bg-gray-500" />
                  <span className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 whitespace-nowrap">
                    {markLabel}
                  </span>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Min/Max labels */}
      {!compact && !marks && (
        <div className="flex justify-between mt-1 text-xs text-gray-400">
          <span>{parameter.min}{unit ? ` ${unit}` : ''}</span>
          <span>{parameter.max}{unit ? ` ${unit}` : ''}</span>
        </div>
      )}

      {/* Description */}
      {!compact && description && (
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {description}
        </p>
      )}
    </div>
  )
}

/**
 * ParameterSliderGroup - Group of parameter sliders
 */
interface ParameterSliderGroupProps {
  parameters: (ParameterDefinition | ParameterDef)[]
  values: Record<string, number>
  onChange: (name: string, value: number) => void
  title?: string
  titleHe?: string
  compact?: boolean
  disabled?: boolean
  language?: 'en' | 'he'
  /** Filter by category */
  category?: ParameterDefinition['category']
  /** Custom marks for all sliders */
  marks?: Record<string, SliderMark[]>
  /** Additional className */
  className?: string
}

export function ParameterSliderGroup({
  parameters,
  values,
  onChange,
  title,
  titleHe,
  compact = false,
  disabled = false,
  language = 'en',
  category,
  marks,
  className = '',
}: ParameterSliderGroupProps) {
  const isRTL = language === 'he'

  // Filter by category if specified
  const filteredParams = useMemo(() => {
    if (!category) return parameters
    return parameters.filter((p) => {
      const normalized = isLegacyParameter(p) ? convertLegacyParameter(p) : p
      return normalized.category === category
    })
  }, [parameters, category])

  // Display title
  const displayTitle = isRTL && titleHe ? titleHe : title

  return (
    <div
      className={`
        bg-white dark:bg-gray-800 rounded-lg
        ${compact ? 'p-2' : 'p-4'}
        border border-gray-200 dark:border-gray-700
        ${className}
      `}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {displayTitle && (
        <h3 className={`
          font-semibold text-gray-900 dark:text-gray-100
          ${compact ? 'text-sm mb-2' : 'text-base mb-3'}
        `}>
          {displayTitle}
        </h3>
      )}

      <div className={compact ? 'space-y-1' : 'space-y-3'}>
        {filteredParams.map((param) => {
          const _normalized = isLegacyParameter(param) ? convertLegacyParameter(param) : param
          const paramName = isLegacyParameter(param) ? param.id : param.name
          const paramDefault = isLegacyParameter(param) ? param.defaultValue : param.default
          return (
            <ParameterSlider
              key={paramName}
              parameter={param}
              value={values[paramName] ?? paramDefault}
              onChange={(value) => onChange(paramName, value)}
              compact={compact}
              disabled={disabled}
              language={language}
              marks={marks?.[paramName]}
            />
          )
        })}
      </div>
    </div>
  )
}

export default ParameterSlider
