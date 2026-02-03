'use client'

import { forwardRef } from 'react'
import Link from 'next/link'

// ============================================================================
// Types
// ============================================================================

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonBaseProps {
  variant?: ButtonVariant
  size?: ButtonSize
  isLoading?: boolean
  loadingText?: string
  showLoadingSpinner?: boolean
  children: React.ReactNode
  className?: string
}

interface ButtonAsButton extends ButtonBaseProps, Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, keyof ButtonBaseProps> {
  href?: never
}

interface ButtonAsLink extends ButtonBaseProps, Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof ButtonBaseProps> {
  href: string
}

type ButtonProps = ButtonAsButton | ButtonAsLink

// ============================================================================
// Styles
// ============================================================================

const variantStyles: Record<ButtonVariant, string> = {
  primary: 'bg-gradient-to-r from-violet-500 to-violet-600 text-white hover:from-violet-600 hover:to-violet-700 focus:ring-violet-500',
  secondary: 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 focus:ring-gray-500',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
  ghost: 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 focus:ring-gray-500',
}

const sizeStyles: Record<ButtonSize, string> = {
  sm: 'px-3 py-1.5 text-sm min-w-[80px]',
  md: 'px-4 py-2 text-sm min-w-[100px]',
  lg: 'px-6 py-3 text-base min-w-[120px]',
}

// ============================================================================
// Spinner Component
// ============================================================================

interface SpinnerProps {
  size?: ButtonSize
  className?: string
}

function ButtonSpinner({ size = 'md', className = '' }: SpinnerProps) {
  const spinnerSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  }

  return (
    <svg
      className={`animate-spin ${spinnerSizes[size]} ${className}`}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
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
  )
}

// ============================================================================
// Button Component
// ============================================================================

const Button = forwardRef<HTMLButtonElement | HTMLAnchorElement, ButtonProps>(
  (props, ref) => {
    const {
      variant = 'primary',
      size = 'md',
      isLoading = false,
      loadingText,
      showLoadingSpinner = true,
      children,
      className = '',
      ...rest
    } = props

    const baseStyles = `
      inline-flex items-center justify-center font-medium rounded-full
      transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
      disabled:opacity-50 disabled:cursor-not-allowed
    `

    const combinedClassName = `${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`

    // Determine loading content
    const loadingContent = () => {
      if (!showLoadingSpinner) {
        return loadingText || children
      }

      if (loadingText) {
        return (
          <>
            <ButtonSpinner size={size} className="-ml-1 mr-2" />
            {loadingText}
          </>
        )
      }

      // Show spinner only (no text) when no loadingText provided
      return (
        <>
          <ButtonSpinner size={size} className="-ml-1 mr-2" />
          <span className="opacity-0">{children}</span>
          <span className="absolute inset-0 flex items-center justify-center">
            <ButtonSpinner size={size} />
          </span>
        </>
      )
    }

    const content = isLoading ? loadingContent() : children

    // Render as link
    if ('href' in rest && rest.href) {
      const linkClassName = isLoading
        ? `${combinedClassName} pointer-events-none opacity-50 cursor-not-allowed`
        : combinedClassName

      return (
        <Link
          ref={ref as React.Ref<HTMLAnchorElement>}
          className={linkClassName}
          aria-disabled={isLoading}
          aria-busy={isLoading}
          tabIndex={isLoading ? -1 : undefined}
          {...(rest as ButtonAsLink)}
        >
          {content}
        </Link>
      )
    }

    // Render as button
    return (
      <button
        ref={ref as React.Ref<HTMLButtonElement>}
        className={`${combinedClassName} ${isLoading ? 'relative' : ''}`}
        disabled={isLoading || (rest as ButtonAsButton).disabled}
        aria-busy={isLoading}
        {...(rest as ButtonAsButton)}
      >
        {content}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
