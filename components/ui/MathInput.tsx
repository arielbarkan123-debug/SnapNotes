'use client'

import { useRef, useEffect, useState, useCallback, forwardRef, useImperativeHandle } from 'react'
import { motion } from 'framer-motion'
import katex from 'katex'
import DOMPurify from 'dompurify'

// ============================================================================
// Types
// ============================================================================

export interface MathInputProps {
  /** Current LaTeX value */
  value?: string
  /** Callback when value changes */
  onChange?: (latex: string) => void
  /** Callback when user submits (Enter key) */
  onSubmit?: (latex: string) => void
  /** Placeholder text */
  placeholder?: string
  /** Whether the input is disabled */
  disabled?: boolean
  /** Whether to auto-focus on mount */
  autoFocus?: boolean
  /** Input size variant */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
  /** Error message to display */
  error?: string
  /** Label for the input */
  label?: string
  /** Helper text below the input */
  helperText?: string
  /** Whether to show a live preview of the rendered math */
  showPreview?: boolean
  /** Keyboard shortcuts to show */
  showKeyboard?: boolean
}

export interface MathInputRef {
  /** Focus the input */
  focus: () => void
  /** Clear the input */
  clear: () => void
  /** Get current LaTeX value */
  getValue: () => string
  /** Set the value */
  setValue: (latex: string) => void
}

// ============================================================================
// Math Keyboard Shortcuts
// ============================================================================

interface MathShortcut {
  label: string
  latex: string
  tooltip?: string
}

const MATH_SHORTCUTS: MathShortcut[][] = [
  // Row 1: Fractions and powers
  [
    { label: '÷', latex: '\\frac{□}{□}', tooltip: 'Fraction' },
    { label: 'x²', latex: '^2', tooltip: 'Square' },
    { label: 'xⁿ', latex: '^{□}', tooltip: 'Power' },
    { label: '√', latex: '\\sqrt{□}', tooltip: 'Square root' },
    { label: 'ⁿ√', latex: '\\sqrt[□]{□}', tooltip: 'nth root' },
  ],
  // Row 2: Greek and special symbols
  [
    { label: 'π', latex: '\\pi', tooltip: 'Pi' },
    { label: 'θ', latex: '\\theta', tooltip: 'Theta' },
    { label: '∞', latex: '\\infty', tooltip: 'Infinity' },
    { label: '±', latex: '\\pm', tooltip: 'Plus/minus' },
    { label: '≠', latex: '\\neq', tooltip: 'Not equal' },
  ],
  // Row 3: Trigonometry
  [
    { label: 'sin', latex: '\\sin(□)', tooltip: 'Sine' },
    { label: 'cos', latex: '\\cos(□)', tooltip: 'Cosine' },
    { label: 'tan', latex: '\\tan(□)', tooltip: 'Tangent' },
    { label: 'log', latex: '\\log(□)', tooltip: 'Logarithm' },
    { label: 'ln', latex: '\\ln(□)', tooltip: 'Natural log' },
  ],
  // Row 4: Relations and operators
  [
    { label: '≤', latex: '\\leq', tooltip: 'Less than or equal' },
    { label: '≥', latex: '\\geq', tooltip: 'Greater than or equal' },
    { label: '×', latex: '\\times', tooltip: 'Times' },
    { label: '()', latex: '(□)', tooltip: 'Parentheses' },
    { label: '|x|', latex: '|□|', tooltip: 'Absolute value' },
  ],
]

// ============================================================================
// Sanitization - Using DOMPurify for XSS protection
// ============================================================================

/**
 * Safely sanitize and render LaTeX as HTML for preview.
 * Uses DOMPurify to prevent XSS attacks from KaTeX output.
 */
function sanitizeAndRenderLatex(latex: string): string {
  if (!latex.trim()) return ''

  try {
    const rawHtml = katex.renderToString(latex, {
      throwOnError: false,
      displayMode: true,
      output: 'html',
    })
    // SECURITY: Sanitize KaTeX HTML output with DOMPurify
    return DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'span', 'math', 'mrow', 'mi', 'mo', 'mn', 'msup', 'msub',
        'mfrac', 'mover', 'munder', 'msqrt', 'mroot', 'mtable', 'mtr', 'mtd',
        'mtext', 'mspace', 'semantics', 'annotation',
      ],
      ALLOWED_ATTR: ['class', 'style', 'aria-hidden', 'data-*'],
      ALLOW_DATA_ATTR: true,
    })
  } catch {
    // Fallback: sanitize the raw latex as text
    return DOMPurify.sanitize(`<span class="text-gray-400">${latex}</span>`)
  }
}

// ============================================================================
// Preview Component (safe rendering)
// ============================================================================

function MathPreview({ latex }: { latex: string }) {
  const sanitizedHtml = sanitizeAndRenderLatex(latex)

  return (
    <div
      className="flex min-h-[2rem] items-center justify-center text-lg text-gray-900 dark:text-white"
      // SECURITY: Content is sanitized by DOMPurify in sanitizeAndRenderLatex
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  )
}

// ============================================================================
// Component
// ============================================================================

/**
 * MathInput - LaTeX equation input with live preview
 *
 * A user-friendly input for entering mathematical equations with:
 * - Live KaTeX preview (sanitized with DOMPurify)
 * - Math symbol shortcuts keyboard
 * - Keyboard navigation support
 * - Error validation display
 *
 * @example
 * // Basic usage
 * <MathInput
 *   value={equation}
 *   onChange={setEquation}
 *   placeholder="Enter an equation..."
 * />
 *
 * @example
 * // With submission handling
 * <MathInput
 *   onSubmit={(latex) => handleGraph(latex)}
 *   showKeyboard={true}
 *   showPreview={true}
 * />
 */
export const MathInput = forwardRef<MathInputRef, MathInputProps>(
  function MathInput(
    {
      value = '',
      onChange,
      onSubmit,
      placeholder = 'Enter an equation...',
      disabled = false,
      autoFocus = false,
      size = 'md',
      className = '',
      error,
      label,
      helperText,
      showPreview = true,
      showKeyboard = false,
    },
    ref
  ) {
    const inputRef = useRef<HTMLInputElement>(null)
    const [localValue, setLocalValue] = useState(value)
    const [showKeyboardPanel, setShowKeyboardPanel] = useState(showKeyboard)

    // Sync external value changes
    useEffect(() => {
      setLocalValue(value)
    }, [value])

    // Auto-focus on mount
    useEffect(() => {
      if (autoFocus && inputRef.current) {
        inputRef.current.focus()
      }
    }, [autoFocus])

    // Handle input change
    const handleChange = useCallback(
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value
        setLocalValue(newValue)
        onChange?.(newValue)
      },
      [onChange]
    )

    // Handle key events
    const handleKeyDown = useCallback(
      (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault()
          onSubmit?.(localValue)
        }
      },
      [localValue, onSubmit]
    )

    // Insert shortcut at cursor position
    const insertShortcut = useCallback(
      (shortcut: MathShortcut) => {
        if (!inputRef.current || disabled) return

        const input = inputRef.current
        const start = input.selectionStart ?? localValue.length
        const end = input.selectionEnd ?? localValue.length

        // Replace □ with selected text or cursor position
        let latex = shortcut.latex
        const selectedText = localValue.substring(start, end)
        if (selectedText) {
          latex = latex.replace('□', selectedText)
        }

        // Insert the LaTeX
        const before = localValue.substring(0, start)
        const after = localValue.substring(end)
        const newValue = before + latex + after

        setLocalValue(newValue)
        onChange?.(newValue)

        // Focus and position cursor
        requestAnimationFrame(() => {
          input.focus()
          const cursorPos = start + latex.indexOf('□')
          if (cursorPos >= start) {
            // Move cursor to first □ placeholder
            const actualPos = before.length + latex.indexOf('□')
            input.setSelectionRange(actualPos, actualPos + 1)
          } else {
            // Move cursor to end of inserted text
            const actualPos = before.length + latex.length
            input.setSelectionRange(actualPos, actualPos)
          }
        })
      },
      [localValue, onChange, disabled]
    )

    // Imperative API
    useImperativeHandle(
      ref,
      () => ({
        focus: () => inputRef.current?.focus(),
        clear: () => {
          setLocalValue('')
          onChange?.('')
        },
        getValue: () => localValue,
        setValue: (latex: string) => {
          setLocalValue(latex)
          onChange?.(latex)
        },
      }),
      [localValue, onChange]
    )

    // Size classes
    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm',
      md: 'px-4 py-2.5 text-base',
      lg: 'px-5 py-3 text-lg',
    }

    return (
      <div className={`w-full ${className}`}>
        {/* Label */}
        {label && (
          <label className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-gray-300">
            {label}
          </label>
        )}

        {/* Input container */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={localValue}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            className={`
              w-full rounded-xl border font-mono transition-all
              ${sizeClasses[size]}
              ${error
                ? 'border-red-300 bg-red-50 text-red-900 focus:border-red-500 focus:ring-red-500 dark:border-red-600 dark:bg-red-900/20 dark:text-red-200'
                : 'border-gray-200 bg-white text-gray-900 focus:border-primary-500 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white'
              }
              ${disabled ? 'cursor-not-allowed opacity-50' : ''}
              focus:outline-none focus:ring-2 focus:ring-offset-0
            `}
            aria-invalid={!!error}
            aria-describedby={error ? 'math-input-error' : helperText ? 'math-input-helper' : undefined}
          />

          {/* Keyboard toggle button */}
          <button
            type="button"
            onClick={() => setShowKeyboardPanel(!showKeyboardPanel)}
            className={`
              absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 transition-colors
              ${showKeyboardPanel
                ? 'bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-400'
                : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300'
              }
            `}
            title={showKeyboardPanel ? 'Hide math keyboard' : 'Show math keyboard'}
            disabled={disabled}
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7h16M4 12h16M4 17h7" />
            </svg>
          </button>
        </div>

        {/* Error message */}
        {error && (
          <motion.p
            id="math-input-error"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-1.5 text-sm text-red-600 dark:text-red-400"
          >
            {error}
          </motion.p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p id="math-input-helper" className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
            {helperText}
          </p>
        )}

        {/* Live preview */}
        {showPreview && localValue && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50"
          >
            <div className="mb-1 text-xs font-medium text-gray-500 dark:text-gray-400">Preview:</div>
            <MathPreview latex={localValue} />
          </motion.div>
        )}

        {/* Math keyboard */}
        {showKeyboardPanel && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-3 rounded-xl border border-gray-200 bg-white p-3 shadow-lg dark:border-gray-700 dark:bg-gray-800"
          >
            <div className="space-y-2">
              {MATH_SHORTCUTS.map((row, rowIndex) => (
                <div key={rowIndex} className="flex gap-2">
                  {row.map((shortcut) => (
                    <button
                      key={shortcut.latex}
                      type="button"
                      onClick={() => insertShortcut(shortcut)}
                      disabled={disabled}
                      className={`
                        flex-1 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm font-medium
                        transition-all hover:border-primary-300 hover:bg-primary-50 hover:text-primary-700
                        dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200
                        dark:hover:border-primary-500 dark:hover:bg-primary-900/30 dark:hover:text-primary-300
                        disabled:cursor-not-allowed disabled:opacity-50
                      `}
                      title={shortcut.tooltip}
                    >
                      {shortcut.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    )
  }
)

export default MathInput
