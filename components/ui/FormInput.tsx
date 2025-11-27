'use client'

import { forwardRef } from 'react'

interface FormInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

const FormInput = forwardRef<HTMLInputElement, FormInputProps>(
  ({ label, error, type = 'text', id, className = '', ...props }, ref) => {
    const inputId = id || label.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 sm:mb-2"
        >
          {label}
        </label>
        <input
          ref={ref}
          type={type}
          id={inputId}
          className={`
            w-full px-4 py-3.5 sm:py-3 rounded-xl sm:rounded-lg border bg-white dark:bg-gray-700
            text-gray-900 dark:text-white outline-none transition text-base
            min-h-[48px] sm:min-h-[44px]
            ${error
              ? 'border-red-500 focus:ring-2 focus:ring-red-500'
              : 'border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-indigo-500 focus:border-transparent'
            }
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? `${inputId}-error` : undefined}
          {...props}
        />
        {error && (
          <p
            id={`${inputId}-error`}
            className="mt-1.5 text-sm text-red-500"
            role="alert"
          >
            {error}
          </p>
        )}
      </div>
    )
  }
)

FormInput.displayName = 'FormInput'

export default FormInput
