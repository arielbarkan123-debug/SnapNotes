'use client'

import { useState, useCallback, useMemo, useRef } from 'react'
import type {
  ParameterDefinition,
  InteractiveParametersState,
  InteractiveParametersActions,
  CalculationResult,
} from '@/types/interactivity'

/**
 * Configuration options for useInteractiveParameters
 */
export interface UseInteractiveParametersOptions {
  /** Maximum history size for undo/redo */
  maxHistorySize?: number
  /** Callback when parameters change */
  onChange?: (values: Record<string, number>) => void
  /** Callback when results are recalculated */
  onResultsChange?: (results: CalculationResult[]) => void
  /** Calculate results from parameters */
  calculate?: (params: Record<string, number>) => CalculationResult[]
}

/**
 * Return type for useInteractiveParameters hook
 */
export interface UseInteractiveParametersReturn {
  /** Current state */
  state: InteractiveParametersState
  /** Available actions */
  actions: InteractiveParametersActions
  /** Calculated results */
  results: CalculationResult[]
  /** Parameter values shorthand */
  values: Record<string, number>
}

/**
 * useInteractiveParameters - Hook for managing interactive diagram parameters
 *
 * Features:
 * - Track parameter values with change detection
 * - Undo/redo history
 * - Reset to defaults
 * - Calculate derived results
 * - Callbacks for external sync
 *
 * @example
 * ```tsx
 * const { state, actions, results, values } = useInteractiveParameters(
 *   [
 *     { name: 'mass', label: 'Mass', default: 5, min: 0.1, max: 100, step: 0.1 },
 *     { name: 'angle', label: 'Angle', default: 30, min: 0, max: 90, step: 1 },
 *   ],
 *   {
 *     calculate: (params) => [
 *       { label: 'Weight', value: params.mass * 9.8, unit: 'N', formatted: `${(params.mass * 9.8).toFixed(1)} N` },
 *     ],
 *   }
 * )
 * ```
 */
export function useInteractiveParameters(
  parameters: ParameterDefinition[],
  options: UseInteractiveParametersOptions = {}
): UseInteractiveParametersReturn {
  const {
    maxHistorySize = 50,
    onChange,
    onResultsChange,
    calculate,
  } = options

  // Get default values from parameters
  const defaultValues = useMemo(() => {
    const defaults: Record<string, number> = {}
    parameters.forEach((p) => {
      defaults[p.name] = p.default
    })
    return defaults
  }, [parameters])

  // State
  const [values, setValues] = useState<Record<string, number>>(defaultValues)
  const [history, setHistory] = useState<Record<string, number>[]>([defaultValues])
  const [historyIndex, setHistoryIndex] = useState(0)

  // Track if dirty (any value differs from default)
  const isDirty = useMemo(() => {
    return Object.keys(defaultValues).some((key) => values[key] !== defaultValues[key])
  }, [values, defaultValues])

  // Calculate results
  const results = useMemo(() => {
    if (!calculate) return []
    const calculatedResults = calculate(values)
    return calculatedResults
  }, [calculate, values])

  // Ref to track previous results for callback
  const prevResultsRef = useRef<CalculationResult[]>([])

  // Notify about results change
  useMemo(() => {
    if (onResultsChange && JSON.stringify(results) !== JSON.stringify(prevResultsRef.current)) {
      prevResultsRef.current = results
      onResultsChange(results)
    }
  }, [results, onResultsChange])

  // Add to history
  const addToHistory = useCallback((newValues: Record<string, number>) => {
    setHistory((prev) => {
      // Remove any redo history
      const trimmed = prev.slice(0, historyIndex + 1)
      // Add new state
      const updated = [...trimmed, newValues]
      // Limit history size
      if (updated.length > maxHistorySize) {
        return updated.slice(-maxHistorySize)
      }
      return updated
    })
    setHistoryIndex((prev) => Math.min(prev + 1, maxHistorySize - 1))
  }, [historyIndex, maxHistorySize])

  // Set a single value
  const setValue = useCallback((name: string, value: number) => {
    setValues((prev) => {
      // Validate against parameter bounds
      const param = parameters.find((p) => p.name === name)
      if (param) {
        value = Math.max(param.min, Math.min(param.max, value))
        // Round to step
        value = Math.round(value / param.step) * param.step
      }

      const newValues = { ...prev, [name]: value }
      addToHistory(newValues)
      onChange?.(newValues)
      return newValues
    })
  }, [parameters, addToHistory, onChange])

  // Set multiple values at once
  const setMultipleValues = useCallback((changes: Record<string, number>) => {
    setValues((prev) => {
      const newValues = { ...prev }

      Object.entries(changes).forEach(([name, value]) => {
        const param = parameters.find((p) => p.name === name)
        if (param) {
          value = Math.max(param.min, Math.min(param.max, value))
          value = Math.round(value / param.step) * param.step
        }
        newValues[name] = value
      })

      addToHistory(newValues)
      onChange?.(newValues)
      return newValues
    })
  }, [parameters, addToHistory, onChange])

  // Reset to defaults
  const reset = useCallback(() => {
    setValues(defaultValues)
    addToHistory(defaultValues)
    onChange?.(defaultValues)
  }, [defaultValues, addToHistory, onChange])

  // Undo
  const undo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1
      setHistoryIndex(newIndex)
      const prevValues = history[newIndex]
      setValues(prevValues)
      onChange?.(prevValues)
    }
  }, [historyIndex, history, onChange])

  // Redo
  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1
      setHistoryIndex(newIndex)
      const nextValues = history[newIndex]
      setValues(nextValues)
      onChange?.(nextValues)
    }
  }, [historyIndex, history, onChange])

  // Can undo/redo
  const canUndo = historyIndex > 0
  const canRedo = historyIndex < history.length - 1

  // Build state object
  const state: InteractiveParametersState = useMemo(() => ({
    values,
    isDirty,
    history,
    historyIndex,
  }), [values, isDirty, history, historyIndex])

  // Build actions object
  const actions: InteractiveParametersActions = useMemo(() => ({
    setValue,
    setValues: setMultipleValues,
    reset,
    undo,
    redo,
    canUndo,
    canRedo,
  }), [setValue, setMultipleValues, reset, undo, redo, canUndo, canRedo])

  return {
    state,
    actions,
    results,
    values,
  }
}

export default useInteractiveParameters
