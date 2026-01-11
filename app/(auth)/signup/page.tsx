'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import FormInput from '@/components/ui/FormInput'
import { mapSupabaseAuthError } from '@/lib/api/errors'

interface FormData {
  name: string
  email: string
  password: string
  confirmPassword: string
}

interface FormErrors {
  name?: string
  email?: string
  password?: string
  confirmPassword?: string
}

// Cooldown time in seconds between resend attempts
const RESEND_COOLDOWN_SECONDS = 60

export default function SignupPage() {
  const t = useTranslations('auth')
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')
  const [registeredEmail, setRegisteredEmail] = useState('')
  const [showResendOption, setShowResendOption] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return

    const timer = setInterval(() => {
      setResendCooldown(prev => Math.max(0, prev - 1))
    }, 1000)

    return () => clearInterval(timer)
  }, [resendCooldown])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Name validation
    if (!formData.name.trim()) {
      newErrors.name = t('validation.nameRequired')
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!formData.email) {
      newErrors.email = t('validation.emailRequired')
    } else if (!emailRegex.test(formData.email)) {
      newErrors.email = t('validation.emailInvalid')
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = t('validation.passwordRequired')
    } else if (formData.password.length < 8) {
      newErrors.password = t('validation.passwordTooShort')
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.confirmPasswordRequired')
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('validation.passwordsNoMatch')
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Clear error when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    // Clear server error when user makes changes
    if (serverError) {
      setServerError('')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSuccessMessage('')
    setServerError('')
    setShowResendOption(false)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      // Get the current origin for the redirect URL
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log('[Signup] Attempting signup for:', formData.email)
      console.log('[Signup] Redirect URL:', redirectUrl)

      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) {
        console.error('[Signup] Error:', error.message, error.code)
        // Map Supabase auth errors to user-friendly messages
        const { message } = mapSupabaseAuthError(error.message)
        setServerError(message)
      } else {
        console.log('[Signup] Success, user data:', data?.user?.id ? 'User created' : 'No user')
        console.log('[Signup] Confirmation sent to:', data?.user?.email)
        console.log('[Signup] Email confirmation status:', data?.user?.identities?.length === 0 ? 'User already exists' : 'New user')

        // Store the email for resend functionality
        setRegisteredEmail(formData.email)
        setShowResendOption(true)
        setSuccessMessage(t('signup.checkEmailVerify'))
        // Start cooldown timer for resend button
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        })
      }
    } catch (err) {
      console.error('[Signup] Unexpected error:', err)
      setServerError(t('signup.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendVerification = useCallback(async () => {
    if (!registeredEmail) {
      setServerError(t('signup.noEmailToResend'))
      return
    }

    // Don't allow resend if cooldown is active
    if (resendCooldown > 0) {
      return
    }

    setIsResending(true)
    setServerError('')

    try {
      const supabase = createClient()
      const redirectUrl = `${window.location.origin}/auth/callback`

      console.log('[Signup] Resending verification to:', registeredEmail)

      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
        options: {
          emailRedirectTo: redirectUrl,
        },
      })

      if (error) {
        console.error('[Signup] Resend error:', error.message, error.code)

        // Handle rate limiting gracefully
        if (error.message.toLowerCase().includes('rate limit') ||
            error.message.toLowerCase().includes('too many') ||
            error.message.toLowerCase().includes('email rate limit')) {
          setServerError(t('signup.resendRateLimited'))
          // Set a longer cooldown on rate limit
          setResendCooldown(300) // 5 minutes
        } else {
          const { message } = mapSupabaseAuthError(error.message)
          setServerError(message)
        }
      } else {
        console.log('[Signup] Verification email resent successfully')
        setSuccessMessage(t('signup.verificationResent'))
        // Reset cooldown after successful resend
        setResendCooldown(RESEND_COOLDOWN_SECONDS)
      }
    } catch (err) {
      console.error('[Signup] Resend unexpected error:', err)
      setServerError(t('signup.unexpectedError'))
    } finally {
      setIsResending(false)
    }
  }, [registeredEmail, resendCooldown, t])

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-6 sm:py-8">
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
              {t('signup.title')}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 text-sm sm:text-base">
              {t('signup.subtitle')}
            </p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
              {/* Main success message */}
              <div className="flex items-center justify-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-green-700 dark:text-green-400 font-medium">
                  {successMessage}
                </p>
              </div>

              {/* Email instructions */}
              <p className="text-gray-600 dark:text-gray-400 text-sm text-center mb-2">
                {t('signup.emailInstructions')}
              </p>

              {/* Check spam folder hint */}
              <p className="text-amber-600 dark:text-amber-400 text-xs text-center mb-2">
                ⚠️ {t('signup.checkSpamFolder')}
              </p>

              {/* Gmail tip */}
              <p className="text-gray-500 dark:text-gray-500 text-xs text-center mb-3">
                💡 {t('signup.gmailTip')}
              </p>

              {/* Delivery note */}
              <p className="text-gray-500 dark:text-gray-500 text-xs text-center italic mb-3">
                {t('signup.emailDeliveryNote')}
              </p>

              {showResendOption && registeredEmail && (
                <div className="pt-3 border-t border-green-200 dark:border-green-800 text-center">
                  <p className="text-gray-600 dark:text-gray-400 text-xs mb-2">
                    {t('signup.didntReceiveEmail')}
                  </p>
                  <button
                    type="button"
                    onClick={handleResendVerification}
                    disabled={isResending || resendCooldown > 0}
                    className="text-indigo-600 dark:text-indigo-400 hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isResending
                      ? t('signup.resending')
                      : resendCooldown > 0
                        ? t('signup.resendIn', { seconds: resendCooldown })
                        : t('signup.resendVerification')
                    }
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Server Error */}
          {serverError && (
            <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg">
              <p className="text-red-700 dark:text-red-400 text-sm text-center">
                {serverError}
              </p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormInput
              label={t('signup.fullName')}
              name="name"
              type="text"
              placeholder={t('signup.namePlaceholder')}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              disabled={isLoading}
              autoComplete="name"
            />

            <FormInput
              label={t('signup.email')}
              name="email"
              type="email"
              placeholder={t('signup.emailPlaceholder')}
              value={formData.email}
              onChange={handleChange}
              error={errors.email}
              disabled={isLoading}
              autoComplete="email"
            />

            <FormInput
              label={t('signup.password')}
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              error={errors.password}
              disabled={isLoading}
              autoComplete="new-password"
            />

            <FormInput
              label={t('signup.confirmPassword')}
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              error={errors.confirmPassword}
              disabled={isLoading}
              autoComplete="new-password"
            />

            <button
              type="submit"
              disabled={isLoading}
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
                  {t('signup.creating')}
                </>
              ) : (
                t('signup.createAccount')
              )}
            </button>
          </form>

          {/* Login Link */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm sm:text-base">
            {t('signup.hasAccount')}{' '}
            <Link
              href="/login"
              className="text-indigo-600 dark:text-indigo-400 hover:underline active:text-indigo-700 font-medium"
            >
              {t('signup.signIn')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
