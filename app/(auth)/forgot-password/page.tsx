'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import FormInput from '@/components/ui/FormInput'

// Admin email for support
const ADMIN_EMAIL = process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'support@notesnap.com'

export default function ForgotPasswordPage() {
  const t = useTranslations('auth')
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [showHelp, setShowHelp] = useState(false)
  const [retryAfter, setRetryAfter] = useState<number | null>(null)

  const validateEmail = (): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email) {
      setError(t('validation.emailRequired'))
      return false
    }
    if (!emailRegex.test(email)) {
      setError(t('validation.emailInvalid'))
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')
    setRetryAfter(null)

    if (!validateEmail()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.toLowerCase().trim() }),
      })

      const data = await response.json()

      if (!response.ok) {
        if (response.status === 429) {
          setRetryAfter(data.retryAfter)
          setError(data.error)
        } else {
          setError(data.error || 'Something went wrong. Please try again.')
        }
      } else {
        setSuccessMessage(data.message)
        setEmail('')
        setShowHelp(true) // Show help section after success
      }
    } catch {
      setError(t('forgotPassword.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
          {/* Header */}
          <div className="text-center mb-6 sm:mb-8">
            <Link
              href="/"
              className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400"
            >
              NoteSnap
            </Link>
            <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mt-3 sm:mt-4">
              {t('forgotPassword.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 text-sm sm:text-base">
              {t('forgotPassword.subtitle')}
            </p>
          </div>

          {/* Security Note */}
          <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-xs sm:text-sm text-blue-700 dark:text-blue-300">
                <strong>{t('forgotPassword.secureReset')}</strong> {t('forgotPassword.secureResetDesc')}
              </p>
            </div>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-green-700 dark:text-green-400 text-sm font-medium">
                    {successMessage}
                  </p>
                  <p className="text-green-600 dark:text-green-500 text-xs mt-1">
                    {t('forgotPassword.checkInboxSpam')}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && !successMessage && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <div className="flex items-start gap-2">
                <svg className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {error}
                </p>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormInput
              label={t('forgotPassword.email')}
              name="email"
              type="email"
              placeholder={t('forgotPassword.emailPlaceholder')}
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                if (error) setError('')
              }}
              disabled={isLoading || retryAfter !== null}
              autoComplete="email"
            />

            <button
              type="submit"
              disabled={isLoading || retryAfter !== null}
              className="w-full py-3.5 sm:py-3 bg-indigo-600 text-white rounded-xl sm:rounded-lg hover:bg-indigo-700 active:bg-indigo-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px] text-base"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ms-1 me-2 h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
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
                  {t('forgotPassword.sending')}
                </>
              ) : retryAfter !== null ? (
                t('forgotPassword.tryAgainIn', { minutes: Math.ceil(retryAfter / 60) })
              ) : (
                t('forgotPassword.sendLink')
              )}
            </button>
          </form>

          {/* Help Section */}
          {(showHelp || successMessage) && (
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
                {t('forgotPassword.didntReceive')}
              </h3>
              <ul className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">1.</span>
                  <span>{t('forgotPassword.helpStep1')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">2.</span>
                  <span>{t('forgotPassword.helpStep2')}</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-indigo-500 mt-0.5">3.</span>
                  <span>{t('forgotPassword.helpStep3')}</span>
                </li>
              </ul>
            </div>
          )}

          {/* Contact Admin Section */}
          <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-4">
              <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                {t('forgotPassword.needHelp')}
              </h3>
              <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 mb-3">
                {t('forgotPassword.cantAccessEmail')}
              </p>
              <a
                href={`mailto:${ADMIN_EMAIL}?subject=Account Recovery Request&body=Hi,%0A%0AI need help recovering my NoteSnap account.%0A%0AMy registered email: ${email || '[your email]'}%0A%0APlease help me reset my password.%0A%0AThank you.`}
                className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                {ADMIN_EMAIL}
              </a>
            </div>
          </div>

          {/* Back to Login Link */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm sm:text-base">
            <Link
              href="/login"
              className="text-indigo-600 dark:text-indigo-400 hover:underline active:text-indigo-700 font-medium"
            >
              ← {t('forgotPassword.backToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
