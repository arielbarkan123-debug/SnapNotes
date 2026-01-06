/**
 * Hook for accessing age-adaptive learning settings
 *
 * Provides age-appropriate feedback, gamification, and UI settings
 * based on the user's education level.
 *
 * Enhanced with RLPA-style dynamic profile refinement for personalized
 * difficulty and session length recommendations.
 */

'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  type AgeGroupConfig,
  getAgeGroupConfig,
  getGamificationStyle,
} from '@/lib/learning/age-config'
import {
  generateAnswerFeedback,
  generateLessonCompletionFeedback,
  generateProgressFeedback,
  getFeedbackSettings,
  type AnswerFeedback,
  type LessonCompletionFeedback,
  type ProgressFeedback,
} from '@/lib/feedback/age-adaptive-feedback'
import {
  getXPFeedback,
  getStreakFeedback,
  shouldShowLeaderboard,
  getBadgeStyle,
  type XPFeedback,
} from '@/lib/gamification/age-adaptive-xp'
import { type EffectiveProfile } from '@/lib/profile/profile-sync'

export interface AgeAdaptiveSettings {
  // Core config
  educationLevel: string
  ageGroupConfig: AgeGroupConfig
  isLoading: boolean

  // Feedback settings
  feedbackSettings: ReturnType<typeof getFeedbackSettings>

  // Gamification settings
  gamificationStyle: ReturnType<typeof getGamificationStyle>
  showLeaderboard: boolean
  badgeStyle: ReturnType<typeof getBadgeStyle>

  // Feedback generators
  getAnswerFeedback: (isCorrect: boolean, explanation?: string) => AnswerFeedback
  getLessonCompletionFeedback: (accuracy: number, lessonTitle: string) => LessonCompletionFeedback
  getProgressFeedback: (percentComplete: number) => ProgressFeedback
  getXPFeedback: (amount: number, eventType: string, leveledUp?: boolean) => XPFeedback
  getStreakFeedback: (streakDays: number) => ReturnType<typeof getStreakFeedback>
}

/**
 * Internal hook to fetch user's education level
 */
function useEducationLevel(): { educationLevel: string; isLoading: boolean } {
  const [educationLevel, setEducationLevel] = useState<string>('high_school')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function fetchEducationLevel() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setEducationLevel('high_school')
          setIsLoading(false)
          return
        }

        const { data: profile } = await supabase
          .from('user_learning_profile')
          .select('education_level')
          .eq('user_id', user.id)
          .single()

        if (profile?.education_level) {
          setEducationLevel(profile.education_level)
        }
      } catch {
        // Default to high_school on error
        setEducationLevel('high_school')
      } finally {
        setIsLoading(false)
      }
    }

    fetchEducationLevel()
  }, [])

  return { educationLevel, isLoading }
}

/**
 * Hook to get age-adaptive learning settings for the current user
 */
export function useAgeAdaptiveSettings(): AgeAdaptiveSettings {
  const { educationLevel, isLoading } = useEducationLevel()

  // Memoize the answer feedback generator to avoid recreating on every render
  const getAnswerFeedbackFn = useCallback(
    (isCorrect: boolean, explanation?: string) =>
      generateAnswerFeedback(isCorrect, educationLevel, explanation),
    [educationLevel]
  )

  const getLessonCompletionFeedbackFn = useCallback(
    (accuracy: number, lessonTitle: string) =>
      generateLessonCompletionFeedback(accuracy, educationLevel, lessonTitle),
    [educationLevel]
  )

  const getProgressFeedbackFn = useCallback(
    (percentComplete: number) =>
      generateProgressFeedback(percentComplete, educationLevel),
    [educationLevel]
  )

  const getXPFeedbackFn = useCallback(
    (amount: number, eventType: string, leveledUp?: boolean) =>
      getXPFeedback(amount, educationLevel, eventType as any, leveledUp),
    [educationLevel]
  )

  const getStreakFeedbackFn = useCallback(
    (streakDays: number) => getStreakFeedback(streakDays, educationLevel),
    [educationLevel]
  )

  return useMemo(() => {
    const ageGroupConfig = getAgeGroupConfig(educationLevel)

    return {
      // Core config
      educationLevel,
      ageGroupConfig,
      isLoading,

      // Feedback settings
      feedbackSettings: getFeedbackSettings(educationLevel),

      // Gamification settings
      gamificationStyle: getGamificationStyle(educationLevel),
      showLeaderboard: shouldShowLeaderboard(educationLevel),
      badgeStyle: getBadgeStyle(educationLevel),

      // Feedback generators
      getAnswerFeedback: getAnswerFeedbackFn,
      getLessonCompletionFeedback: getLessonCompletionFeedbackFn,
      getProgressFeedback: getProgressFeedbackFn,
      getXPFeedback: getXPFeedbackFn,
      getStreakFeedback: getStreakFeedbackFn,
    }
  }, [
    educationLevel,
    isLoading,
    getAnswerFeedbackFn,
    getLessonCompletionFeedbackFn,
    getProgressFeedbackFn,
    getXPFeedbackFn,
    getStreakFeedbackFn,
  ])
}

/**
 * Hook for standalone use when you just need gamification style
 */
export function useGamificationStyle() {
  const { educationLevel } = useEducationLevel()

  return useMemo(
    () => ({
      ...getGamificationStyle(educationLevel),
      showLeaderboard: shouldShowLeaderboard(educationLevel),
      badgeStyle: getBadgeStyle(educationLevel),
    }),
    [educationLevel]
  )
}

/**
 * Hook for standalone use when you just need feedback settings
 */
export function useFeedbackSettings() {
  const { educationLevel } = useEducationLevel()

  return useMemo(() => getFeedbackSettings(educationLevel), [educationLevel])
}

// =============================================================================
// Enhanced Hook with Dynamic Profile Refinement
// =============================================================================

export interface DynamicAgeAdaptiveSettings extends AgeAdaptiveSettings {
  // Dynamic refinement values
  effectiveDifficultyTarget: number
  effectiveSessionLength: number
  estimatedAbility: number

  // Confidence scores (0-1, higher = more data supporting this value)
  difficultyConfidence: number
  sessionLengthConfidence: number

  // Source tracking
  difficultySource: 'age_config' | 'refinement'
  sessionLengthSource: 'age_config' | 'refinement'

  // Effective profile reference
  effectiveProfile: EffectiveProfile | null
}

/**
 * Enhanced hook that incorporates RLPA-style dynamic profile refinement
 *
 * This hook provides all the same settings as useAgeAdaptiveSettings,
 * plus dynamic values from the profile refinement system that adapt
 * based on the user's actual learning behavior.
 */
export function useDynamicAgeAdaptiveSettings(): DynamicAgeAdaptiveSettings {
  const baseSettings = useAgeAdaptiveSettings()
  const [effectiveProfile, setEffectiveProfile] = useState<EffectiveProfile | null>(null)
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)

  // Fetch effective profile from refinement system
  useEffect(() => {
    async function fetchEffectiveProfile() {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()

        if (!user) {
          setIsLoadingProfile(false)
          return
        }

        // Fetch from the refinement API
        const response = await fetch('/api/profile/refinement')
        if (response.ok) {
          const data = await response.json()
          if (data.success && data.data?.effectiveProfile) {
            setEffectiveProfile(data.data.effectiveProfile)
          }
        }
      } catch (error) {
        console.error('Failed to fetch effective profile:', error)
      } finally {
        setIsLoadingProfile(false)
      }
    }

    fetchEffectiveProfile()
  }, [])

  return useMemo(() => {
    const ageConfig = baseSettings.ageGroupConfig

    // Determine effective values
    // Use refinement values if available and confident, otherwise fall back to age config
    let effectiveDifficultyTarget = 3.0
    let difficultySource: 'age_config' | 'refinement' = 'age_config'
    let difficultyConfidence = 0

    if (effectiveProfile && effectiveProfile.difficultyConfidence >= 0.5) {
      effectiveDifficultyTarget = effectiveProfile.currentDifficultyTarget
      difficultySource = 'refinement'
      difficultyConfidence = effectiveProfile.difficultyConfidence
    } else {
      // Use middle of age config range
      effectiveDifficultyTarget = 3.0
    }

    let effectiveSessionLength = ageConfig.lessonLength.optimal
    let sessionLengthSource: 'age_config' | 'refinement' = 'age_config'
    let sessionLengthConfidence = 0

    if (effectiveProfile && effectiveProfile.sessionLengthConfidence >= 0.5) {
      effectiveSessionLength = effectiveProfile.optimalSessionLength
      sessionLengthSource = 'refinement'
      sessionLengthConfidence = effectiveProfile.sessionLengthConfidence
    }

    const estimatedAbility = effectiveProfile?.estimatedAbility ?? 2.5

    return {
      ...baseSettings,
      isLoading: baseSettings.isLoading || isLoadingProfile,

      // Dynamic refinement values
      effectiveDifficultyTarget,
      effectiveSessionLength,
      estimatedAbility,

      // Confidence scores
      difficultyConfidence,
      sessionLengthConfidence,

      // Source tracking
      difficultySource,
      sessionLengthSource,

      // Effective profile reference
      effectiveProfile,
    }
  }, [baseSettings, effectiveProfile, isLoadingProfile])
}

export default useAgeAdaptiveSettings
