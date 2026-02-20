/**
 * Shared User Profile Loader
 *
 * Single reusable function that loads the user's learning profile
 * and relevant metadata for AI personalization across all routes.
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export interface UserProfile {
  studySystem: string
  grade: string | null
  subjects: string[]
  subjectLevels: Record<string, string>
  examFormat: string | null
  language: string
  educationLevel: string | null
}

/**
 * Load user's learning profile from Supabase.
 * Returns a merged profile from user_learning_profile table.
 * Returns null if no profile exists.
 */
export async function loadUserProfile(
  supabase: SupabaseClient,
  userId: string
): Promise<UserProfile | null> {
  const { data: profile } = await supabase
    .from('user_learning_profile')
    .select('study_system, grade, subjects, subject_levels, exam_format, language, education_level')
    .eq('user_id', userId)
    .maybeSingle()

  if (!profile) return null

  return {
    studySystem: profile.study_system || 'general',
    grade: profile.grade || null,
    subjects: profile.subjects || [],
    subjectLevels: profile.subject_levels || {},
    examFormat: profile.exam_format || null,
    language: profile.language || 'en',
    educationLevel: profile.education_level || null,
  }
}
