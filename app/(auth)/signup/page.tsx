'use client'

import { useState } from 'react'
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
  const [successMessage, setSuccessMessage] = useState('')
  const [serverError, setServerError] = useState('')

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

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()

      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
          },
        },
      })

      if (error) {
        // Map Supabase auth errors to user-friendly messages
        const { message } = mapSupabaseAuthError(error.message)
        setServerError(message)
      } else {
        setSuccessMessage(t('signup.checkEmailVerify'))
        // Clear form
        setFormData({
          name: '',
          email: '',
          password: '',
          confirmPassword: '',
        })
      }
    } catch {
      setServerError(t('signup.unexpectedError'))
    } finally {
      setIsLoading(false)
    }
  }

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
