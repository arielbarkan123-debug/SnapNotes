'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useTranslations } from 'next-intl'
import { createClient } from '@/lib/supabase/client'
import { useToast } from '@/contexts/ToastContext'
import { useEventTracking } from '@/lib/analytics/hooks'
import { GradeSelector, SubjectPicker, type SelectedSubject } from '@/components/curriculum'
import { getDefaultGrade, hasCurriculumData } from '@/lib/curriculum/grades'
import type { ExamFormat, StudySystem } from '@/lib/curriculum'
import { locales, localeNames, type Locale } from '@/i18n/config'

// =============================================================================
// Types
// =============================================================================

type Theme = 'light' | 'dark' | 'system'
type TimeAvailability = 'short' | 'medium' | 'long'
type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'varies'

interface UserSettings {
  displayName: string
  email: string
  createdAt: string
  studySystem: StudySystem | null
  grade: string | null
  timeAvailability: TimeAvailability | null
  preferredTime: PreferredTime | null
  // Curriculum settings
  subjects: SelectedSubject[]
  examFormat: ExamFormat
  // Language settings
  language: Locale
}

// =============================================================================
// Constants
// =============================================================================

const STUDY_SYSTEMS: { id: StudySystem; icon: string; label: string }[] = [
  { id: 'ib', icon: '🌐', label: 'IB' },
  { id: 'uk', icon: '🇬🇧', label: 'UK A-Levels' },
  { id: 'ap', icon: '📚', label: 'AP' },
  { id: 'israeli_bagrut', icon: '🇮🇱', label: 'Israeli Bagrut' },
  { id: 'us', icon: '🇺🇸', label: 'US System' },
  { id: 'general', icon: '🌍', label: 'General' },
]

const TIME_OPTIONS: { id: TimeAvailability; icon: string; label: string; description: string }[] = [
  { id: 'short', icon: '⚡', label: 'Quick', description: '< 15 min' },
  { id: 'medium', icon: '⏱️', label: 'Focused', description: '15-30 min' },
  { id: 'long', icon: '📖', label: 'Deep', description: '30+ min' },
]

const PREFERRED_TIMES: { id: PreferredTime; icon: string; label: string }[] = [
  { id: 'morning', icon: '🌅', label: 'Morning' },
  { id: 'afternoon', icon: '☀️', label: 'Afternoon' },
  { id: 'evening', icon: '🌙', label: 'Evening' },
  { id: 'varies', icon: '🔄', label: 'Varies' },
]

// =============================================================================
// Settings Page Component
// =============================================================================

export default function SettingsPage() {
  const router = useRouter()
  const toast = useToast()
  const supabase = createClient()
  const { trackFeature } = useEventTracking()
  const t = useTranslations('settings')
  const tc = useTranslations('common')

  // State
  const [isLoading, setIsLoading] = useState(true)
  const [hasTrackedView, setHasTrackedView] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [theme, setTheme] = useState<Theme>('system')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')

  const [settings, setSettings] = useState<UserSettings>({
    displayName: '',
    email: '',
    createdAt: '',
    studySystem: null,
    grade: null,
    timeAvailability: null,
    preferredTime: null,
    subjects: [],
    examFormat: 'match_real',
    language: 'en',
  })

  // Load user data
  useEffect(() => {
    async function loadUser() {
      try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error || !user) {
          router.push('/login')
          return
        }

        const metadata = user.user_metadata || {}

        // Load from user_learning_profile table for curriculum data
        // Only select columns that exist from migrations
        const { data: learningProfile } = await supabase
          .from('user_learning_profile')
          .select('study_system, grade, subjects, subject_levels, exam_format, language')
          .eq('user_id', user.id)
          .single()

        const studySystem = (learningProfile?.study_system || metadata.study_system || null) as StudySystem | null
        const subjectIds = (learningProfile?.subjects || []) as string[]
        const subjectLevels = (learningProfile?.subject_levels || {}) as Record<string, string>

        // Convert to SelectedSubject format
        const selectedSubjects: SelectedSubject[] = subjectIds.map(id => ({
          id,
          level: subjectLevels[id] || null,
        }))

        // Get language from database or cookie
        const savedLanguage = (learningProfile?.language || 'en') as Locale

        setSettings({
          displayName: metadata.name || user.email?.split('@')[0] || '',
          email: user.email || '',
          createdAt: user.created_at,
          studySystem,
          grade: learningProfile?.grade || null,
          timeAvailability: metadata.time_availability || null,
          preferredTime: metadata.preferred_time || null,
          subjects: selectedSubjects,
          examFormat: learningProfile?.exam_format || 'match_real',
          language: savedLanguage,
        })

        // Load theme preference
        const savedTheme = localStorage.getItem('theme') as Theme | null
        if (savedTheme) {
          setTheme(savedTheme)
        }
      } catch {
        toast.error(t('toast.loadError'))
      } finally {
        setIsLoading(false)
      }
    }

    loadUser()
  }, [router, supabase, toast])

  // Track page view when settings load
  useEffect(() => {
    if (!isLoading && !hasTrackedView && settings.email) {
      trackFeature('settings_page_view', {
        studySystem: settings.studySystem,
        grade: settings.grade,
        subjectsCount: settings.subjects.length,
        hasTimeAvailability: !!settings.timeAvailability,
        hasPreferredTime: !!settings.preferredTime,
      })
      setHasTrackedView(true)
    }
  }, [isLoading, hasTrackedView, settings, trackFeature])

  // Apply theme
  useEffect(() => {
    const applyTheme = (t: Theme) => {
      const root = document.documentElement
      if (t === 'system') {
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
        root.classList.toggle('dark', prefersDark)
      } else {
        root.classList.toggle('dark', t === 'dark')
      }
    }

    applyTheme(theme)
    localStorage.setItem('theme', theme)

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (theme === 'system') {
        applyTheme('system')
      }
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [theme])

  // Update setting helper
  const updateSetting = useCallback(<K extends keyof UserSettings>(key: K, value: UserSettings[K]) => {
    setSettings(prev => {
      // When changing study system, update grade to default and clear subjects
      if (key === 'studySystem') {
        const newSystem = value as StudySystem
        const defaultGrade = getDefaultGrade(newSystem) || null
        return {
          ...prev,
          [key]: value,
          grade: defaultGrade,
          subjects: [],
        }
      }
      return { ...prev, [key]: value }
    })
    setHasChanges(true)
  }, [])

  // Handle subjects change from SubjectPicker
  const handleSubjectsChange = useCallback((subjects: SelectedSubject[]) => {
    setSettings(prev => ({ ...prev, subjects }))
    setHasChanges(true)
  }, [])

  // Handle language change
  const handleLanguageChange = useCallback((newLanguage: Locale) => {
    setSettings(prev => ({ ...prev, language: newLanguage }))
    setHasChanges(true)
    // Set cookie for immediate effect after save
    document.cookie = `NEXT_LOCALE=${newLanguage};path=/;max-age=31536000`
  }, [])

  // Save settings
  const handleSave = async () => {
    setIsSaving(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Convert subjects to arrays for storage
      const subjectIds = settings.subjects.map(s => s.id)
      const subjectLevels = settings.subjects.reduce<Record<string, string>>((acc, s) => {
        if (s.level) {
          acc[s.id] = s.level
        }
        return acc
      }, {})

      // Update user metadata
      const { error: authError } = await supabase.auth.updateUser({
        data: {
          name: settings.displayName,
          study_system: settings.studySystem,
          time_availability: settings.timeAvailability,
          preferred_time: settings.preferredTime,
        }
      })

      if (authError) throw authError

      // Update user_learning_profile with curriculum data
      // First check if profile exists
      const { data: existingProfile } = await supabase
        .from('user_learning_profile')
        .select('id')
        .eq('user_id', user.id)
        .single()

      let profileError = null

      // Upsert curriculum data - only use columns added by migrations
      // From 20241217_education_level.sql: education_level, grade, study_system
      // From 20241229_curriculum_profile.sql: subjects, subject_levels, exam_format
      // From 20250102_language_support.sql: language
      const profileData = {
        user_id: user.id,
        study_system: settings.studySystem || 'general',
        grade: settings.grade,
        subjects: subjectIds,
        subject_levels: subjectLevels,
        exam_format: settings.examFormat || 'match_real',
        language: settings.language,
      }

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from('user_learning_profile')
          .update(profileData)
          .eq('user_id', user.id)
        profileError = error
      } else {
        // Insert new profile - only include columns that exist from migrations
        const { error } = await supabase
          .from('user_learning_profile')
          .insert(profileData)
        profileError = error
      }

      if (profileError) {
        toast.warning(t('toast.savePartial'))
      } else {
        toast.success(t('toast.saveSuccess'))
        // Track successful settings save
        trackFeature('settings_saved', {
          studySystem: settings.studySystem,
          grade: settings.grade,
          subjectsCount: settings.subjects.length,
          timeAvailability: settings.timeAvailability,
          preferredTime: settings.preferredTime,
          examFormat: settings.examFormat,
          language: settings.language,
        })
        // Reload page after a short delay to apply language change
        setTimeout(() => window.location.reload(), 500)
      }
      setHasChanges(false)
    } catch (err) {
      toast.error(t('toast.saveError'))
      trackFeature('settings_save_error', {
        error: err instanceof Error ? err.message : 'Unknown error',
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Sign out
  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/login')
    } catch {
      toast.error(t('toast.signOutError'))
    }
  }

  // Reset onboarding
  const handleResetOnboarding = async () => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          onboarding_completed: false,
          education_level: null,
          study_system: null,
          study_goal: null,
          time_availability: null,
          preferred_time: null,
          learning_styles: [],
        }
      })

      if (error) throw error

      toast.success(t('toast.onboardingReset'))
      setTimeout(() => router.push('/onboarding'), 1000)
    } catch {
      toast.error(t('toast.onboardingResetError'))
    }
  }

  // Delete account
  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') return

    try {
      // Note: Full account deletion typically requires a server-side function
      // For now, we'll sign out and show a message
      toast.info(t('toast.deleteRequest'))
      await supabase.auth.signOut()
      router.push('/')
    } catch {
      toast.error(t('toast.deleteError'))
    }
  }

  if (isLoading) {
    return <SettingsLoadingSkeleton />
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="mb-4 inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t('backToProfile')}
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{t('title')}</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">{t('subtitle')}</p>
        </div>

        {/* Profile Section */}
        <section className="mb-6">
          <SettingsCard
            icon={
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
            }
            title={t('profile.title')}
            description={t('profile.description')}
          >
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.displayName')}
                </label>
                <input
                  type="text"
                  value={settings.displayName}
                  onChange={(e) => updateSetting('displayName', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 text-gray-900 placeholder-gray-400 transition-all focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-gray-700 dark:bg-gray-800 dark:text-white dark:placeholder-gray-500"
                  placeholder={t('profile.displayNamePlaceholder')}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t('profile.email')}
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 dark:border-gray-700 dark:bg-gray-800/50">
                  <span className="text-gray-600 dark:text-gray-400">{settings.email}</span>
                  <span className="ml-auto rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-500 dark:bg-gray-700 dark:text-gray-400">
                    {tc('labels.readOnly')}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Member since {new Date(settings.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </div>
            </div>
          </SettingsCard>
        </section>

        {/* Learning Preferences Section */}
        <section className="mb-6">
          <SettingsCard
            icon={
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
              </div>
            }
            title={t('learning.title')}
            description={t('learning.description')}
          >
            <div className="space-y-6">
              {/* Study System */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('learning.studySystem')}
                </label>
                <div className="flex flex-wrap gap-2">
                  {STUDY_SYSTEMS.map((system) => (
                    <button
                      key={system.id}
                      onClick={() => updateSetting('studySystem', system.id)}
                      className={`
                        flex items-center gap-2 rounded-full border-2 px-4 py-2 transition-all
                        ${settings.studySystem === system.id
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span>{system.icon}</span>
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{system.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Grade - only show if a study system is selected */}
              {settings.studySystem && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('learning.grade')}
                  </label>
                  <GradeSelector
                    system={settings.studySystem}
                    value={settings.grade}
                    onChange={(grade) => updateSetting('grade', grade)}
                  />
                </div>
              )}

              {/* Time Availability */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('learning.dailyStudyTime')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {TIME_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      onClick={() => updateSetting('timeAvailability', option.id)}
                      className={`
                        flex flex-col items-center gap-1 rounded-xl border-2 p-4 transition-all
                        ${settings.timeAvailability === option.id
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-2xl">{option.icon}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{option.label}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{option.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preferred Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('learning.preferredStudyTime')}
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {PREFERRED_TIMES.map((time) => (
                    <button
                      key={time.id}
                      onClick={() => updateSetting('preferredTime', time.id)}
                      className={`
                        flex flex-col items-center gap-1 rounded-xl border-2 p-3 transition-all
                        ${settings.preferredTime === time.id
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-xl">{time.icon}</span>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{time.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </SettingsCard>
        </section>

        {/* Curriculum Settings Section - Only show for curriculum systems */}
        {settings.studySystem && hasCurriculumData(settings.studySystem) && (
          <section className="mb-6">
            <SettingsCard
              icon={
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 text-white">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                  </svg>
                </div>
              }
              title={t('curriculum.title')}
              description={t('curriculum.description')}
            >
              <div className="space-y-6">
                {/* Subjects */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    {t('curriculum.yourSubjects')}
                  </label>
                  <div className="max-h-80 overflow-y-auto">
                    <SubjectPicker
                      system={settings.studySystem}
                      grade={settings.grade}
                      selectedSubjects={settings.subjects}
                      onChange={handleSubjectsChange}
                      compact
                    />
                  </div>
                </div>

                {/* Exam Format */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Exam Format Preference
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      onClick={() => updateSetting('examFormat', 'match_real')}
                      className={`
                        flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all
                        ${settings.examFormat === 'match_real'
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-2xl">📝</span>
                      <span className="font-medium text-gray-900 dark:text-white">Match Real Format</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Exams follow your curriculum&apos;s exact structure
                      </span>
                    </button>
                    <button
                      onClick={() => updateSetting('examFormat', 'inspired_by')}
                      className={`
                        flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all
                        ${settings.examFormat === 'inspired_by'
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-2xl">✨</span>
                      <span className="font-medium text-gray-900 dark:text-white">Inspired By</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        Flexible format with similar question styles
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </section>
        )}

        {/* App Settings Section */}
        <section className="mb-6">
          <SettingsCard
            icon={
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
            }
            title={t('appSettings.title')}
            description={t('appSettings.description')}
          >
            <div className="space-y-6">
              {/* Theme Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('appSettings.theme')}
                </label>
                <div className="grid grid-cols-3 gap-3">
                  <ThemeButton
                    active={theme === 'light'}
                    onClick={() => setTheme('light')}
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                      </svg>
                    }
                    label={t('appSettings.themeLight')}
                  />
                  <ThemeButton
                    active={theme === 'dark'}
                    onClick={() => setTheme('dark')}
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                      </svg>
                    }
                    label={t('appSettings.themeDark')}
                  />
                  <ThemeButton
                    active={theme === 'system'}
                    onClick={() => setTheme('system')}
                    icon={
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    }
                    label={t('appSettings.themeSystem')}
                  />
                </div>
              </div>

              {/* Language Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                  {t('appSettings.language')} / שפה
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {locales.map((locale) => (
                    <button
                      key={locale}
                      onClick={() => handleLanguageChange(locale)}
                      className={`
                        flex items-center justify-center gap-2 rounded-xl border-2 p-4 transition-all
                        ${settings.language === locale
                          ? 'border-indigo-500 bg-indigo-50 dark:border-indigo-400 dark:bg-indigo-500/10'
                          : 'border-gray-200 bg-white hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:hover:border-gray-600'
                        }
                      `}
                    >
                      <span className="text-xl">{locale === 'en' ? '🇺🇸' : '🇮🇱'}</span>
                      <span className="font-medium text-gray-900 dark:text-white">{localeNames[locale]}</span>
                    </button>
                  ))}
                </div>
                {settings.language !== 'en' && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {t('saveChangesRefreshHint')}
                  </p>
                )}
              </div>

              {/* Reset Onboarding */}
              <div className="flex items-center justify-between rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-700 dark:bg-gray-800/50">
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{t('appSettings.resetOnboarding')}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400">{t('appSettings.resetOnboardingDesc')}</p>
                </div>
                <button
                  onClick={handleResetOnboarding}
                  className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  {tc('buttons.reset')}
                </button>
              </div>
            </div>
          </SettingsCard>
        </section>

        {/* Account Section */}
        <section className="mb-6">
          <SettingsCard
            icon={
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-rose-500 to-pink-600 text-white">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            }
            title={t('account.title')}
            description={t('account.description')}
          >
            <div className="space-y-4">
              {/* Sign Out */}
              <button
                onClick={handleSignOut}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-300 bg-white px-4 py-3 font-medium text-gray-700 transition-all hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                {tc('auth.signOut')}
              </button>

              {/* Danger Zone */}
              <div className="mt-6 rounded-xl border-2 border-dashed border-red-200 bg-red-50/50 p-4 dark:border-red-800/50 dark:bg-red-900/10">
                <h4 className="font-medium text-red-700 dark:text-red-400">{t('account.dangerZone')}</h4>
                <p className="mb-3 text-sm text-red-600/70 dark:text-red-400/70">
                  {t('account.dangerZoneDesc')}
                </p>

                {!showDeleteConfirm ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className="rounded-lg border border-red-300 bg-white px-4 py-2 text-sm font-medium text-red-600 transition-all hover:bg-red-50 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                  >
                    {t('account.deleteAccount')}
                  </button>
                ) : (
                  <div className="space-y-3">
                    <p className="text-sm text-red-600 dark:text-red-400">
                      Type <strong>DELETE</strong> to confirm:
                    </p>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full rounded-lg border border-red-300 bg-white px-3 py-2 text-sm text-red-600 placeholder-red-300 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500/20 dark:border-red-700 dark:bg-red-900/20 dark:text-red-400 dark:placeholder-red-600"
                      placeholder="DELETE"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(false)
                          setDeleteConfirmText('')
                        }}
                        className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleDeleteAccount}
                        disabled={deleteConfirmText !== 'DELETE'}
                        className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Delete Forever
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </SettingsCard>
        </section>

        {/* Save Button - Fixed at bottom when changes exist */}
        {hasChanges && (
          <div className="fixed bottom-0 left-0 right-0 border-t border-gray-200 bg-white/80 px-4 py-4 backdrop-blur-lg dark:border-gray-800 dark:bg-gray-900/80">
            <div className="mx-auto flex max-w-5xl items-center justify-between gap-4">
              <p className="text-sm text-gray-500 dark:text-gray-400">{tc('labels.unsavedChanges')}</p>
              <div className="flex gap-3">
                <button
                  onClick={() => window.location.reload()}
                  className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  {tc('buttons.discard')}
                </button>
                <button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 px-6 py-2 text-sm font-medium text-white shadow-lg shadow-indigo-500/25 transition-all hover:shadow-xl hover:shadow-indigo-500/30 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      {tc('buttons.saving')}
                    </>
                  ) : (
                    tc('buttons.saveChanges')
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bottom padding when save bar is shown */}
        {hasChanges && <div className="h-20" />}
      </div>
    </div>
  )
}

// =============================================================================
// Settings Card Component
// =============================================================================

interface SettingsCardProps {
  icon: React.ReactNode
  title: string
  description: string
  children: React.ReactNode
}

function SettingsCard({ icon, title, description, children }: SettingsCardProps) {
  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
        {icon}
        <div>
          <h2 className="font-semibold text-gray-900 dark:text-white">{title}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{description}</p>
        </div>
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

// =============================================================================
// Theme Button Component
// =============================================================================

interface ThemeButtonProps {
  active: boolean
  onClick: () => void
  icon: React.ReactNode
  label: string
}

function ThemeButton({ active, onClick, icon, label }: ThemeButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-center gap-2 rounded-xl border-2 p-4 transition-all
        ${active
          ? 'border-indigo-500 bg-indigo-50 text-indigo-600 dark:border-indigo-400 dark:bg-indigo-500/10 dark:text-indigo-400'
          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:border-gray-600'
        }
      `}
    >
      {icon}
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}

// =============================================================================
// Loading Skeleton
// =============================================================================

function SettingsLoadingSkeleton() {
  return (
    <div className="min-h-[calc(100vh-4rem)] bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="mx-auto max-w-5xl px-4 py-8">
        {/* Header skeleton */}
        <div className="mb-8">
          <div className="mb-4 h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
          <div className="h-9 w-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700" />
          <div className="mt-2 h-5 w-48 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
        </div>

        {/* Cards skeleton */}
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="mb-6 overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
            <div className="flex items-center gap-4 border-b border-gray-100 px-6 py-4 dark:border-gray-800">
              <div className="h-10 w-10 animate-pulse rounded-xl bg-gray-200 dark:bg-gray-700" />
              <div>
                <div className="h-5 w-24 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
                <div className="mt-1 h-4 w-32 animate-pulse rounded bg-gray-200 dark:bg-gray-700" />
              </div>
            </div>
            <div className="space-y-4 p-6">
              <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
              <div className="h-12 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
