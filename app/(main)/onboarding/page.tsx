'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useFunnelTracking, useEventTracking } from '@/lib/analytics'
import { GradeSelector, SubjectPicker, type SelectedSubject } from '@/components/curriculum'
import { getDefaultGrade, hasCurriculumData } from '@/lib/curriculum/grades'
import type { StudySystem } from '@/lib/curriculum/types'

// =============================================================================
// Types
// =============================================================================

type StudyGoal = 'exam_prep' | 'general_learning' | 'skill_improvement'
type TimeAvailability = 'short' | 'medium' | 'long'
type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'varies'
type LearningStyle = 'reading' | 'visual' | 'practice'

interface OnboardingData {
  studySystem: StudySystem | null
  grade: string | null
  subjects: SelectedSubject[]
  studyGoal: StudyGoal | null
  timeAvailability: TimeAvailability | null
  preferredTime: PreferredTime | null
  learningStyles: LearningStyle[]
}

// =============================================================================
// Constants
// =============================================================================

const STUDY_SYSTEMS = [
  {
    id: 'ib' as StudySystem,
    icon: '🌐',
    title: 'IB (International Baccalaureate)',
    description: 'International Baccalaureate Diploma Programme',
  },
  {
    id: 'uk' as StudySystem,
    icon: '🇬🇧',
    title: 'UK A-Levels',
    description: 'British curriculum (GCSE, A-Levels)',
  },
  {
    id: 'ap' as StudySystem,
    icon: '📚',
    title: 'AP (Advanced Placement)',
    description: 'College-level courses in high school',
  },
  {
    id: 'israeli_bagrut' as StudySystem,
    icon: '🇮🇱',
    title: 'Israeli Bagrut',
    description: 'Israeli matriculation exams',
  },
  {
    id: 'us' as StudySystem,
    icon: '🇺🇸',
    title: 'US System',
    description: 'American curriculum (Common Core)',
  },
  {
    id: 'general' as StudySystem,
    icon: '🌍',
    title: 'General',
    description: 'Standard curriculum or self-study',
  },
]

const STUDY_GOALS = [
  {
    id: 'exam_prep' as StudyGoal,
    icon: '📝',
    title: 'Exam Preparation',
    description: 'Preparing for tests, certifications, or academic exams',
  },
  {
    id: 'general_learning' as StudyGoal,
    icon: '📚',
    title: 'General Learning',
    description: 'Expanding knowledge and learning new subjects',
  },
  {
    id: 'skill_improvement' as StudyGoal,
    icon: '🎯',
    title: 'Skill Improvement',
    description: 'Building specific skills for work or hobbies',
  },
]

const TIME_OPTIONS = [
  {
    id: 'short' as TimeAvailability,
    icon: '⚡',
    title: '5-10 minutes',
    description: 'Quick study sessions between tasks',
  },
  {
    id: 'medium' as TimeAvailability,
    icon: '⏱️',
    title: '15-20 minutes',
    description: 'Focused daily practice sessions',
  },
  {
    id: 'long' as TimeAvailability,
    icon: '📖',
    title: '30+ minutes',
    description: 'Deep study and comprehensive review',
  },
]

const TIME_PREFERENCES = [
  {
    id: 'morning' as PreferredTime,
    icon: '🌅',
    title: 'Morning',
    description: 'Best focus before the day starts',
  },
  {
    id: 'afternoon' as PreferredTime,
    icon: '☀️',
    title: 'Afternoon',
    description: 'Study during midday breaks',
  },
  {
    id: 'evening' as PreferredTime,
    icon: '🌙',
    title: 'Evening',
    description: 'Wind down with evening review',
  },
  {
    id: 'varies' as PreferredTime,
    icon: '🔄',
    title: 'Varies',
    description: 'My schedule changes day to day',
  },
]

const LEARNING_STYLES = [
  {
    id: 'reading' as LearningStyle,
    icon: '📖',
    title: 'Reading',
    description: 'Learning through text and explanations',
  },
  {
    id: 'visual' as LearningStyle,
    icon: '🖼️',
    title: 'Visual',
    description: 'Diagrams, charts, and visual content',
  },
  {
    id: 'practice' as LearningStyle,
    icon: '✍️',
    title: 'Practice & Testing',
    description: 'Learning by doing and self-testing',
  },
]

// =============================================================================
// Main Component
// =============================================================================

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')

  const [data, setData] = useState<OnboardingData>({
    studySystem: null,
    grade: null,
    subjects: [],
    studyGoal: null,
    timeAvailability: null,
    preferredTime: null,
    learningStyles: [],
  })

  // Determine if we should show subject selection step
  const showSubjectStep = data.studySystem && hasCurriculumData(data.studySystem)

  // Step flow: 1=system, 2=grade, 3=subjects (if curriculum), 4=goal, 5=time, 6=preferred, 7=learning
  const BASE_STEPS = 6 // system, grade, goal, time, preferred, learning
  const EXTENDED_STEPS = 7 // +subjects
  const totalSteps = showSubjectStep ? EXTENDED_STEPS : BASE_STEPS

  // Analytics tracking
  const { trackStep } = useFunnelTracking('onboarding')
  const { trackFeature } = useEventTracking()

  // Track step changes
  const trackOnboardingStep = useCallback((step: number) => {
    const stepNames = showSubjectStep
      ? ['start', 'study_system', 'grade', 'subjects', 'study_goal', 'time_availability', 'preferred_time', 'learning_style']
      : ['start', 'study_system', 'grade', 'study_goal', 'time_availability', 'preferred_time', 'learning_style']
    if (step >= 1 && step <= stepNames.length) {
      trackStep(stepNames[step - 1], step)
    }
  }, [trackStep, showSubjectStep])

  // Check if user already has a profile
  useEffect(() => {
    const checkProfile = async () => {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      const { data: profile } = await supabase
        .from('user_learning_profile')
        .select('id')
        .eq('user_id', user.id)
        .single()

      if (profile) {
        // Already onboarded, redirect to dashboard
        router.replace('/dashboard')
        return
      }

      setIsLoading(false)
      // Track onboarding start
      trackOnboardingStep(1)
    }

    checkProfile()
  }, [router, trackOnboardingStep])

  // Get the actual step content based on current step and whether subjects are shown
  const getStepContent = (step: number): string => {
    if (showSubjectStep) {
      // With subject selection: 1=system, 2=grade, 3=subjects, 4=goal, 5=time, 6=preferred, 7=learning
      const steps = ['system', 'grade', 'subjects', 'goal', 'time', 'preferred', 'learning']
      return steps[step - 1] || ''
    } else {
      // Without subject selection: 1=system, 2=grade, 3=goal, 4=time, 5=preferred, 6=learning
      const steps = ['system', 'grade', 'goal', 'time', 'preferred', 'learning']
      return steps[step - 1] || ''
    }
  }

  // Handle option selection
  const handleSelect = (value: string) => {
    const stepContent = getStepContent(currentStep)

    switch (stepContent) {
      case 'system':
        const newSystem = value as StudySystem
        const defaultGrade = getDefaultGrade(newSystem) || null
        setData(prev => ({
          ...prev,
          studySystem: newSystem,
          grade: defaultGrade,
          // Clear subjects if switching systems
          subjects: [],
        }))
        nextStep()
        break
      case 'goal':
        setData(prev => ({ ...prev, studyGoal: value as StudyGoal }))
        nextStep()
        break
      case 'time':
        setData(prev => ({ ...prev, timeAvailability: value as TimeAvailability }))
        nextStep()
        break
      case 'preferred':
        setData(prev => ({ ...prev, preferredTime: value as PreferredTime }))
        nextStep()
        break
    }
  }

  // Handle grade selection
  const handleGradeChange = (grade: string) => {
    setData(prev => ({ ...prev, grade }))
    // Auto-advance after a short delay for better UX
    setTimeout(() => nextStep(), 200)
  }

  // Handle subject changes
  const handleSubjectsChange = (subjects: SelectedSubject[]) => {
    setData(prev => ({ ...prev, subjects }))
  }

  // Handle learning style toggle (multi-select)
  const toggleLearningStyle = (style: LearningStyle) => {
    setData(prev => ({
      ...prev,
      learningStyles: prev.learningStyles.includes(style)
        ? prev.learningStyles.filter(s => s !== style)
        : [...prev.learningStyles, style],
    }))
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setDirection('forward')
      const newStep = currentStep + 1
      setCurrentStep(newStep)
      trackOnboardingStep(newStep)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setDirection('backward')
      setCurrentStep(prev => prev - 1)
    }
  }

  const skip = () => {
    if (currentStep < totalSteps) {
      setDirection('forward')
      setCurrentStep(prev => prev + 1)
    } else {
      completeOnboarding()
    }
  }

  // Save and complete onboarding
  const completeOnboarding = async () => {
    setIsSaving(true)

    // Track completion
    trackStep('complete', totalSteps + 1)
    trackFeature('onboarding_complete', {
      studySystem: data.studySystem,
      grade: data.grade,
      studyGoal: data.studyGoal,
      subjectCount: data.subjects.length,
      learningStyles: data.learningStyles,
    })

    try {
      const supabase = createClient()
      const { data: { user } } = await supabase.auth.getUser()

      if (!user) {
        router.replace('/login')
        return
      }

      // Map time availability to session length in minutes
      const sessionLengthMap: Record<TimeAvailability, number> = {
        short: 10,
        medium: 20,
        long: 30,
      }

      const sessionLength = data.timeAvailability
        ? sessionLengthMap[data.timeAvailability]
        : 15

      // Convert subjects to arrays for storage
      const subjectIds = data.subjects.map(s => s.id)
      const subjectLevels = data.subjects.reduce<Record<string, string>>((acc, s) => {
        if (s.level) {
          acc[s.id] = s.level
        }
        return acc
      }, {})

      // Create learning profile
      const profileData = {
        user_id: user.id,
        education_level: 'high_school', // Legacy field, keep for backward compat
        study_system: data.studySystem || 'general',
        study_goal: data.studyGoal || 'general_learning',
        preferred_study_time: data.preferredTime || 'varies',
        learning_styles: data.learningStyles.length > 0
          ? data.learningStyles
          : ['practice'],
        avg_session_length: sessionLength,
        optimal_session_length: sessionLength,
        strong_subjects: [],
        weak_subjects: [],
        // Curriculum context fields
        subjects: subjectIds,
        subject_levels: subjectLevels,
        exam_format: 'match_real',
      }

      const { error } = await supabase
        .from('user_learning_profile')
        .insert(profileData)

      if (error) {
        // Learning profile save failed - continue anyway
      }

      // Also update the profiles table with grade and subjects
      const { error: profileUpdateError } = await supabase
        .from('profiles')
        .update({
          study_system: data.studySystem || 'general',
          grade: data.grade,
          subjects: subjectIds,
          subject_levels: subjectLevels,
          exam_format: 'match_real',
        })
        .eq('id', user.id)

      if (profileUpdateError) {
        // Profile update failed - continue anyway
      }

      // Initialize gamification stats
      const { error: gamError } = await supabase
        .from('user_gamification')
        .upsert({
          user_id: user.id,
          total_xp: 0,
          level: 1,
          current_streak: 0,
          longest_streak: 0,
          streak_last_activity: new Date().toISOString().split('T')[0],
        }, {
          onConflict: 'user_id',
        })

      if (gamError) {
        // Gamification init failed - continue anyway
      }

      // Redirect to dashboard
      router.push('/dashboard?welcome=true')
    } catch {
      router.push('/dashboard')
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white dark:from-gray-900 dark:to-gray-800 flex flex-col">
      {/* Header */}
      <div className="p-4 sm:p-6">
        <div className="max-w-md mx-auto">
          {/* Progress Dots */}
          <div className="flex justify-center gap-2 mb-2">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div
                key={i}
                className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${
                  i + 1 === currentStep
                    ? 'bg-indigo-600 scale-125'
                    : i + 1 < currentStep
                    ? 'bg-indigo-400'
                    : 'bg-gray-300 dark:bg-gray-600'
                }`}
              />
            ))}
          </div>
          <p className="text-center text-sm text-gray-500 dark:text-gray-400">
            Step {currentStep} of {totalSteps}
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <div
            key={currentStep}
            className={`animate-in ${
              direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'
            } fade-in duration-300`}
          >
            {getStepContent(currentStep) === 'system' && (
              <StepContent
                title="What study system are you in?"
                subtitle="This helps us tailor content to your curriculum"
                options={STUDY_SYSTEMS}
                selected={data.studySystem}
                onSelect={handleSelect}
              />
            )}

            {getStepContent(currentStep) === 'grade' && data.studySystem && (
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  What grade are you in?
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Select your current grade level
                </p>

                <GradeSelector
                  system={data.studySystem}
                  value={data.grade}
                  onChange={handleGradeChange}
                  className="justify-center"
                />
              </div>
            )}

            {getStepContent(currentStep) === 'subjects' && data.studySystem && (
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  Which subjects are you studying?
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-6">
                  Select the subjects you want to focus on
                </p>

                <div className="max-h-[50vh] overflow-y-auto text-left mb-6">
                  <SubjectPicker
                    system={data.studySystem}
                    grade={data.grade}
                    selectedSubjects={data.subjects}
                    onChange={handleSubjectsChange}
                    compact
                  />
                </div>

                <button
                  onClick={nextStep}
                  className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl transition-colors"
                >
                  {data.subjects.length > 0 ? `Continue with ${data.subjects.length} subject${data.subjects.length > 1 ? 's' : ''}` : 'Skip for now'}
                </button>
              </div>
            )}

            {getStepContent(currentStep) === 'goal' && (
              <StepContent
                title="What's your main study goal?"
                subtitle="This helps us personalize your learning experience"
                options={STUDY_GOALS}
                selected={data.studyGoal}
                onSelect={handleSelect}
              />
            )}

            {getStepContent(currentStep) === 'time' && (
              <StepContent
                title="How much time can you study daily?"
                subtitle="We'll optimize session lengths for your schedule"
                options={TIME_OPTIONS}
                selected={data.timeAvailability}
                onSelect={handleSelect}
              />
            )}

            {getStepContent(currentStep) === 'preferred' && (
              <StepContent
                title="When do you prefer to study?"
                subtitle="We'll remind you at the best times"
                options={TIME_PREFERENCES}
                selected={data.preferredTime}
                onSelect={handleSelect}
              />
            )}

            {getStepContent(currentStep) === 'learning' && (
              <div className="text-center">
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
                  How do you learn best?
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-8">
                  Select all that apply (optional)
                </p>

                <div className="space-y-3 mb-8">
                  {LEARNING_STYLES.map(style => (
                    <button
                      key={style.id}
                      onClick={() => toggleLearningStyle(style.id)}
                      className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
                        data.learningStyles.includes(style.id)
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                          : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-gray-800'
                      }`}
                    >
                      <span className="text-3xl">{style.icon}</span>
                      <div className="text-left flex-1">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {style.title}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {style.description}
                        </p>
                      </div>
                      <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                        data.learningStyles.includes(style.id)
                          ? 'border-indigo-500 bg-indigo-500'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}>
                        {data.learningStyles.includes(style.id) && (
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                    </button>
                  ))}
                </div>

                <button
                  onClick={completeOnboarding}
                  disabled={isSaving}
                  className="w-full py-4 px-6 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-semibold rounded-xl transition-colors flex items-center justify-center gap-2"
                >
                  {isSaving ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Setting up...
                    </>
                  ) : (
                    <>
                      Get Started
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                      </svg>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 sm:p-6">
        <div className="max-w-md mx-auto flex justify-between items-center">
          <button
            onClick={prevStep}
            className={`px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors ${
              currentStep === 1 ? 'invisible' : ''
            }`}
          >
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </span>
          </button>

          <button
            onClick={skip}
            className="px-4 py-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors text-sm"
          >
            Skip {currentStep === totalSteps ? '& Finish' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Step Content Component
// =============================================================================

interface StepOption {
  id: string
  icon: string
  title: string
  description: string
}

interface StepContentProps {
  title: string
  subtitle: string
  options: StepOption[]
  selected: string | null
  onSelect: (value: string) => void
}

function StepContent({ title, subtitle, options, selected, onSelect }: StepContentProps) {
  return (
    <div className="text-center">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-2">
        {title}
      </h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">
        {subtitle}
      </p>

      <div className="space-y-3">
        {options.map(option => (
          <button
            key={option.id}
            onClick={() => onSelect(option.id)}
            className={`w-full p-4 rounded-xl border-2 transition-all duration-200 flex items-center gap-4 ${
              selected === option.id
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-700 bg-white dark:bg-gray-800 hover:scale-[1.02] active:scale-[0.98]'
            }`}
          >
            <span className="text-3xl">{option.icon}</span>
            <div className="text-left">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {option.title}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {option.description}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
