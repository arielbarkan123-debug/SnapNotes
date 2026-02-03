'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import FormInput from '@/components/ui/FormInput'
import { mapSupabaseAuthError } from '@/lib/api/errors'

interface FormData {
  email: string
  password: string
}

interface FormErrors {
  email?: string
  password?: string
}

function LoginForm() {
  const t = useTranslations('auth')
  const router = useRouter()
  const searchParams = useSearchParams()
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    // Check for success message in URL params (from password reset or email verification)
    const message = searchParams.get('message')
    if (message) {
      setSuccessMessage(decodeURIComponent(message))
    }

    // Check for error message in URL params (from failed email verification)
    const error = searchParams.get('error')
    if (error) {
      setServerError(decodeURIComponent(error))
    }
  }, [searchParams])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

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
    setServerError('')

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      })

      if (error) {
        // Map Supabase auth errors to user-friendly messages
        const { message } = mapSupabaseAuthError(error.message)
        setServerError(message)
      } else {
        // Success - redirect to dashboard
        router.push('/dashboard')
        router.refresh()
      }
    } catch {
      setServerError(t('login.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-6 sm:p-8">
      {/* Header */}
      <div className="text-center mb-6 sm:mb-8">
        <Link
          href="/"
          className="text-xl sm:text-2xl font-bold text-violet-600 dark:text-violet-400"
        >
          NoteSnap
        </Link>
        <h1 className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white mt-3 sm:mt-4">
          {t('login.title')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1.5 sm:mt-2 text-sm sm:text-base">
          {t('login.subtitle')}
        </p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-green-700 dark:text-green-400 text-sm text-center">
            {successMessage}
          </p>
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
          label={t('login.email')}
          name="email"
          type="email"
          placeholder={t('login.emailPlaceholder')}
          value={formData.email}
          onChange={handleChange}
          error={errors.email}
          disabled={isLoading}
          autoComplete="email"
        />

        <FormInput
          label={t('login.password')}
          name="password"
          type="password"
          placeholder="••••••••"
          value={formData.password}
          onChange={handleChange}
          error={errors.password}
          disabled={isLoading}
          autoComplete="current-password"
        />

        {/* Forgot Password Link */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-sm text-violet-600 dark:text-violet-400 hover:underline active:text-violet-700 py-1"
          >
            {t('login.forgotPassword')}
          </Link>
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 sm:py-3 bg-gradient-to-r from-violet-500 to-violet-600 text-white rounded-full hover:from-violet-600 hover:to-violet-700 active:from-violet-700 active:to-violet-800 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-h-[48px] text-base"
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
              {t('login.signingIn')}
            </>
          ) : (
            t('login.signIn')
          )}
        </button>
      </form>

      {/* Sign Up Link */}
      <p className="text-center text-gray-600 dark:text-gray-400 mt-6 text-sm sm:text-base">
        {t('login.noAccount')}{' '}
        <Link
          href="/signup"
          className="text-violet-600 dark:text-violet-400 hover:underline active:text-violet-700 font-medium"
        >
          {t('login.signUp')}
        </Link>
      </p>
    </div>
  )
}

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <Suspense
          fallback={
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
              <div className="flex items-center justify-center">
                <svg
                  className="animate-spin h-8 w-8 text-violet-600"
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
              </div>
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
