'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useFunnelTracking, useEventTracking } from '@/lib/analytics'

// =============================================================================
// Types
// =============================================================================

type StudyGoal = 'exam_prep' | 'general_learning' | 'skill_improvement'
type TimeAvailability = 'short' | 'medium' | 'long'
type PreferredTime = 'morning' | 'afternoon' | 'evening' | 'varies'
type LearningStyle = 'reading' | 'visual' | 'practice'
type EducationLevel = 'elementary' | 'middle_school' | 'high_school' | 'university' | 'graduate' | 'professional'
type StudySystem = 'general' | 'us' | 'uk' | 'israeli_bagrut' | 'ib' | 'ap' | 'other'

interface OnboardingData {
  educationLevel: EducationLevel | null
  studySystem: StudySystem | null
  studyGoal: StudyGoal | null
  timeAvailability: TimeAvailability | null
  preferredTime: PreferredTime | null
  learningStyles: LearningStyle[]
}

// =============================================================================
// Constants
// =============================================================================

const EDUCATION_LEVELS = [
  {
    id: 'elementary' as EducationLevel,
    icon: '🎒',
    title: 'Elementary School',
    description: 'Grades 1-5 (ages 6-11)',
  },
  {
    id: 'middle_school' as EducationLevel,
    icon: '📓',
    title: 'Middle School',
    description: 'Grades 6-8 (ages 11-14)',
  },
  {
    id: 'high_school' as EducationLevel,
    icon: '🎓',
    title: 'High School',
    description: 'Grades 9-12 (ages 14-18)',
  },
  {
    id: 'university' as EducationLevel,
    icon: '🏛️',
    title: 'University / College',
    description: 'Undergraduate studies',
  },
  {
    id: 'graduate' as EducationLevel,
    icon: '📜',
    title: 'Graduate School',
    description: "Master's or PhD studies",
  },
  {
    id: 'professional' as EducationLevel,
    icon: '💼',
    title: 'Professional',
    description: 'Work-related learning or certifications',
  },
]

const STUDY_SYSTEMS = [
  {
    id: 'general' as StudySystem,
    icon: '🌍',
    title: 'General',
    description: 'Standard curriculum or self-study',
  },
  {
    id: 'us' as StudySystem,
    icon: '🇺🇸',
    title: 'US System',
    description: 'American curriculum (Common Core, SAT, ACT)',
  },
  {
    id: 'uk' as StudySystem,
    icon: '🇬🇧',
    title: 'UK System',
    description: 'British curriculum (GCSE, A-Levels)',
  },
  {
    id: 'israeli_bagrut' as StudySystem,
    icon: '🇮🇱',
    title: 'Israeli Bagrut',
    description: 'Israeli matriculation exams',
  },
  {
    id: 'ib' as StudySystem,
    icon: '🌐',
    title: 'IB (International Baccalaureate)',
    description: 'International Baccalaureate program',
  },
  {
    id: 'ap' as StudySystem,
    icon: '📚',
    title: 'AP (Advanced Placement)',
    description: 'College-level courses in high school',
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

const TOTAL_STEPS = 6

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
    educationLevel: null,
    studySystem: null,
    studyGoal: null,
    timeAvailability: null,
    preferredTime: null,
    learningStyles: [],
  })

  // Analytics tracking
  const { trackStep } = useFunnelTracking('onboarding')
  const { trackFeature } = useEventTracking()

  // Track step changes
  const trackOnboardingStep = useCallback((step: number) => {
    const stepNames = [
      'start',
      'education_level',
      'study_system',
      'study_goal',
      'time_availability',
      'preferred_time',
      'learning_style',
    ]
    if (step >= 1 && step <= stepNames.length) {
      trackStep(stepNames[step - 1], step)
    }
  }, [trackStep])

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

  // Handle option selection
  const handleSelect = (value: string) => {
    switch (currentStep) {
      case 1:
        setData(prev => ({ ...prev, educationLevel: value as EducationLevel }))
        nextStep()
        break
      case 2:
        setData(prev => ({ ...prev, studySystem: value as StudySystem }))
        nextStep()
        break
      case 3:
        setData(prev => ({ ...prev, studyGoal: value as StudyGoal }))
        nextStep()
        break
      case 4:
        setData(prev => ({ ...prev, timeAvailability: value as TimeAvailability }))
        nextStep()
        break
      case 5:
        setData(prev => ({ ...prev, preferredTime: value as PreferredTime }))
        nextStep()
        break
    }
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
    if (currentStep < TOTAL_STEPS) {
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
    if (currentStep < TOTAL_STEPS) {
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
    trackStep('complete', 8)
    trackFeature('onboarding_complete', {
      educationLevel: data.educationLevel,
      studySystem: data.studySystem,
      studyGoal: data.studyGoal,
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

      // Create learning profile
      const profileData = {
        user_id: user.id,
        education_level: data.educationLevel || 'high_school',
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
      }

      const { error } = await supabase
        .from('user_learning_profile')
        .insert(profileData)

      if (error) {
        console.error('Failed to save profile:', error)
        // Continue anyway - they can update later
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
        console.error('Failed to init gamification:', gamError)
      }

      // Redirect to dashboard
      router.push('/dashboard?welcome=true')
    } catch (error) {
      console.error('Onboarding error:', error)
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
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
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
            Step {currentStep} of {TOTAL_STEPS}
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
            {currentStep === 1 && (
              <StepContent
                title="What's your education level?"
                subtitle="We'll adjust content complexity to match your level"
                options={EDUCATION_LEVELS}
                selected={data.educationLevel}
                onSelect={handleSelect}
              />
            )}

            {currentStep === 2 && (
              <StepContent
                title="What study system are you in?"
                subtitle="This helps us tailor content to your curriculum (optional)"
                options={STUDY_SYSTEMS}
                selected={data.studySystem}
                onSelect={handleSelect}
              />
            )}

            {currentStep === 3 && (
              <StepContent
                title="What's your main study goal?"
                subtitle="This helps us personalize your learning experience"
                options={STUDY_GOALS}
                selected={data.studyGoal}
                onSelect={handleSelect}
              />
            )}

            {currentStep === 4 && (
              <StepContent
                title="How much time can you study daily?"
                subtitle="We'll optimize session lengths for your schedule"
                options={TIME_OPTIONS}
                selected={data.timeAvailability}
                onSelect={handleSelect}
              />
            )}

            {currentStep === 5 && (
              <StepContent
                title="When do you prefer to study?"
                subtitle="We'll remind you at the best times"
                options={TIME_PREFERENCES}
                selected={data.preferredTime}
                onSelect={handleSelect}
              />
            )}

            {currentStep === 6 && (
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
            Skip {currentStep === TOTAL_STEPS ? '& Finish' : ''}
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
