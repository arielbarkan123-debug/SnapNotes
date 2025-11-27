'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import FormInput from '@/components/ui/FormInput'
import { mapSupabaseAuthError } from '@/lib/api/errors'

interface FormData {
  password: string
  confirmPassword: string
}

interface FormErrors {
  password?: string
  confirmPassword?: string
}

export default function ResetPasswordPage() {
  const router = useRouter()
  const [formData, setFormData] = useState<FormData>({
    password: '',
    confirmPassword: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [isLoading, setIsLoading] = useState(false)
  const [serverError, setServerError] = useState('')
  const [isValidSession, setIsValidSession] = useState<boolean | null>(null)

  useEffect(() => {
    // Check if user has a valid recovery session
    const checkSession = async () => {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()

      // User should have a session from the email link
      setIsValidSession(!!session)
    }

    checkSession()

    // Listen for auth state changes (when user clicks email link)
    const supabase = createClient()
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === 'PASSWORD_RECOVERY') {
          setIsValidSession(true)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    // Password validation
    if (!formData.password) {
      newErrors.password = 'Password is required'
    } else if (formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters'
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
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

      const { error } = await supabase.auth.updateUser({
        password: formData.password,
      })

      if (error) {
        const { message } = mapSupabaseAuthError(error.message)
        setServerError(message)
      } else {
        // Sign out after password reset
        await supabase.auth.signOut()
        // Redirect to login with success message
        router.push('/login?message=Password updated successfully. Please log in.')
      }
    } catch {
      setServerError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  // Loading state while checking session
  if (isValidSession === null) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
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
        </div>
      </div>
    )
  }

  // Invalid session - no recovery token
  if (!isValidSession) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
            <div className="text-center">
              <Link
                href="/"
                className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
              >
                StudySnap
              </Link>
              <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
                Invalid or Expired Link
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                This password reset link is invalid or has expired.
              </p>
              <div className="mt-6 space-y-3">
                <Link
                  href="/forgot-password"
                  className="block w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors text-center"
                >
                  Request New Link
                </Link>
                <Link
                  href="/login"
                  className="block text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                >
                  ← Back to login
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          {/* Header */}
          <div className="text-center mb-8">
            <Link
              href="/"
              className="text-2xl font-bold text-indigo-600 dark:text-indigo-400"
            >
              StudySnap
            </Link>
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-white mt-4">
              Reset your password
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Enter your new password below.
            </p>
          </div>

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
              label="New Password"
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
              label="Confirm New Password"
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
              className="w-full py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
            >
              {isLoading ? (
                <>
                  <svg
                    className="animate-spin -ml-1 mr-2 h-4 w-4 text-white"
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
                  Updating...
                </>
              ) : (
                'Reset Password'
              )}
            </button>
          </form>

          {/* Back to Login Link */}
          <p className="text-center text-gray-600 dark:text-gray-400 mt-6">
            <Link
              href="/login"
              className="text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
            >
              ← Back to login
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
