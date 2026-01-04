/**
 * Mock User Learning Profiles for Testing
 * Tests various combinations of user settings
 */

import type { StudySystem, ExamFormat } from '@/lib/curriculum'

// Type for user context passed to AI prompts
export interface MockUserContext {
  educationLevel?: 'elementary' | 'middle_school' | 'high_school' | 'university' | 'graduate' | 'professional'
  studySystem?: StudySystem
  studyGoal?: 'exam_prep' | 'general_learning' | 'skill_improvement'
  learningStyles?: string[]
  language?: 'en' | 'he'
}

// Type for database profile records
export interface MockDatabaseProfile {
  user_id: string
  education_level: string
  study_system: string
  study_goal?: string
  learning_styles?: string[]
  subjects?: string[]
  subject_levels?: Record<string, string>
  exam_format?: string
  language?: string
}

/**
 * User context objects (used in AI prompts)
 */
export const mockUserContexts: Record<string, MockUserContext | null> = {
  // IB Biology HL student - English
  ibBiologyHL: {
    educationLevel: 'high_school',
    studySystem: 'ib',
    studyGoal: 'exam_prep',
    learningStyles: ['practice', 'visual'],
    language: 'en',
  },

  // Israeli Bagrut student - Hebrew
  bagrutHebrew: {
    educationLevel: 'high_school',
    studySystem: 'israeli_bagrut',
    studyGoal: 'exam_prep',
    learningStyles: ['reading'],
    language: 'he',
  },

  // UK A-Level student
  ukALevel: {
    educationLevel: 'high_school',
    studySystem: 'uk',
    studyGoal: 'exam_prep',
    learningStyles: ['practice'],
    language: 'en',
  },

  // AP student
  apStudent: {
    educationLevel: 'high_school',
    studySystem: 'ap',
    studyGoal: 'exam_prep',
    learningStyles: ['reading', 'practice'],
    language: 'en',
  },

  // General learner (no curriculum context)
  generalLearner: {
    educationLevel: 'university',
    studySystem: 'general',
    studyGoal: 'general_learning',
    learningStyles: ['practice'],
    language: 'en',
  },

  // Elementary school student
  elementaryStudent: {
    educationLevel: 'elementary',
    studySystem: 'us',
    studyGoal: 'general_learning',
    learningStyles: ['visual'],
    language: 'en',
  },

  // Graduate level student
  graduateStudent: {
    educationLevel: 'graduate',
    studySystem: 'general',
    studyGoal: 'skill_improvement',
    learningStyles: ['reading', 'practice'],
    language: 'en',
  },

  // No profile (null)
  noProfile: null,

  // Partial profile (missing fields)
  partialProfile: {
    educationLevel: 'high_school',
    studySystem: 'uk',
    // Missing: studyGoal, learningStyles, language
  },
}

/**
 * Database profile records (as stored in user_learning_profile table)
 */
export const mockDatabaseProfiles: Record<string, MockDatabaseProfile | null> = {
  ibBiologyHL: {
    user_id: 'user-ib-123',
    education_level: 'high_school',
    study_system: 'ib',
    study_goal: 'exam_prep',
    learning_styles: ['practice', 'visual'],
    subjects: ['biology'],
    subject_levels: { biology: 'HL' },
    exam_format: 'match_real',
    language: 'en',
  },

  bagrutHebrew: {
    user_id: 'user-bagrut-456',
    education_level: 'high_school',
    study_system: 'israeli_bagrut',
    study_goal: 'exam_prep',
    learning_styles: ['reading'],
    subjects: ['mathematics'],
    subject_levels: { mathematics: '5' },
    exam_format: 'match_real',
    language: 'he',
  },

  ukALevel: {
    user_id: 'user-uk-789',
    education_level: 'high_school',
    study_system: 'uk',
    study_goal: 'exam_prep',
    learning_styles: ['practice'],
    subjects: ['chemistry'],
    subject_levels: { chemistry: 'A-Level' },
    exam_format: 'match_real',
    language: 'en',
  },

  apStudent: {
    user_id: 'user-ap-101',
    education_level: 'high_school',
    study_system: 'ap',
    study_goal: 'exam_prep',
    learning_styles: ['reading', 'practice'],
    subjects: ['physics'],
    subject_levels: { physics: 'AP' },
    exam_format: 'match_real',
    language: 'en',
  },

  generalLearner: {
    user_id: 'user-general-202',
    education_level: 'university',
    study_system: 'general',
    study_goal: 'general_learning',
    learning_styles: ['practice'],
    subjects: [],
    subject_levels: {},
    exam_format: 'inspired_by',
    language: 'en',
  },

  inspiredByFormat: {
    user_id: 'user-inspired-303',
    education_level: 'high_school',
    study_system: 'ib',
    study_goal: 'exam_prep',
    learning_styles: ['practice'],
    subjects: ['biology'],
    subject_levels: { biology: 'SL' },
    exam_format: 'inspired_by',
    language: 'en',
  },

  noProfile: null,

  partialProfile: {
    user_id: 'user-partial-404',
    education_level: 'high_school',
    study_system: 'uk',
    // Missing optional fields
  },
}

/**
 * Helper to get profile by key
 */
export function getMockProfile(key: keyof typeof mockDatabaseProfiles): MockDatabaseProfile | null {
  return mockDatabaseProfiles[key] ?? null
}

/**
 * Helper to get user context by key
 */
export function getMockUserContext(key: keyof typeof mockUserContexts): MockUserContext | null {
  return mockUserContexts[key] ?? null
}
