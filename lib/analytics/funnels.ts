// ============================================================================
// Funnel Configurations
// Predefined funnels for tracking user journeys
// ============================================================================

export interface FunnelConfig {
  name: string
  description: string
  steps: {
    name: string
    order: number
    description: string
  }[]
}

/**
 * Onboarding funnel - tracks user's first-time setup
 */
export const ONBOARDING_FUNNEL: FunnelConfig = {
  name: 'onboarding',
  description: 'User onboarding flow completion',
  steps: [
    { name: 'start', order: 1, description: 'User starts onboarding' },
    { name: 'education_level', order: 2, description: 'Selects education level' },
    { name: 'study_system', order: 3, description: 'Selects study system' },
    { name: 'study_goal', order: 4, description: 'Selects study goal' },
    { name: 'time_availability', order: 5, description: 'Sets time availability' },
    { name: 'preferred_time', order: 6, description: 'Sets preferred study time' },
    { name: 'learning_style', order: 7, description: 'Selects learning style' },
    { name: 'complete', order: 8, description: 'Completes onboarding' },
  ],
}

/**
 * Course creation funnel - tracks course upload and generation
 */
export const COURSE_CREATION_FUNNEL: FunnelConfig = {
  name: 'course_creation',
  description: 'Course creation and generation flow',
  steps: [
    { name: 'upload_click', order: 1, description: 'Clicks upload button' },
    { name: 'file_selected', order: 2, description: 'Selects file to upload' },
    { name: 'upload_started', order: 3, description: 'Upload begins' },
    { name: 'processing', order: 4, description: 'Course generation starts' },
    { name: 'course_created', order: 5, description: 'Course successfully created' },
  ],
}

/**
 * Lesson completion funnel - tracks lesson progress
 */
export const LESSON_FUNNEL: FunnelConfig = {
  name: 'lesson_completion',
  description: 'Individual lesson completion flow',
  steps: [
    { name: 'lesson_started', order: 1, description: 'User starts a lesson' },
    { name: 'first_step', order: 2, description: 'Views first step' },
    { name: 'midpoint', order: 3, description: 'Reaches lesson midpoint' },
    { name: 'last_step', order: 4, description: 'Views last step' },
    { name: 'lesson_completed', order: 5, description: 'Completes the lesson' },
  ],
}

/**
 * Practice session funnel - tracks practice flow
 */
export const PRACTICE_FUNNEL: FunnelConfig = {
  name: 'practice_session',
  description: 'Practice session flow',
  steps: [
    { name: 'practice_started', order: 1, description: 'Starts practice' },
    { name: 'first_question', order: 2, description: 'Answers first question' },
    { name: 'midpoint', order: 3, description: 'Reaches session midpoint' },
    { name: 'practice_completed', order: 4, description: 'Completes practice session' },
  ],
}

/**
 * Exam funnel - tracks exam taking flow
 */
export const EXAM_FUNNEL: FunnelConfig = {
  name: 'exam_session',
  description: 'Exam taking flow',
  steps: [
    { name: 'exam_started', order: 1, description: 'Starts exam' },
    { name: 'first_question', order: 2, description: 'Answers first question' },
    { name: 'halfway', order: 3, description: 'Reaches halfway point' },
    { name: 'last_question', order: 4, description: 'Answers last question' },
    { name: 'exam_submitted', order: 5, description: 'Submits exam' },
    { name: 'results_viewed', order: 6, description: 'Views exam results' },
  ],
}

/**
 * Review session funnel - tracks SRS review flow
 */
export const REVIEW_FUNNEL: FunnelConfig = {
  name: 'review_session',
  description: 'Spaced repetition review flow',
  steps: [
    { name: 'review_started', order: 1, description: 'Starts review session' },
    { name: 'first_card', order: 2, description: 'Reviews first card' },
    { name: 'halfway', order: 3, description: 'Reaches halfway point' },
    { name: 'review_completed', order: 4, description: 'Completes review session' },
  ],
}

/**
 * Signup funnel - tracks user registration
 */
export const SIGNUP_FUNNEL: FunnelConfig = {
  name: 'signup',
  description: 'User registration flow',
  steps: [
    { name: 'signup_page', order: 1, description: 'Views signup page' },
    { name: 'form_started', order: 2, description: 'Starts filling form' },
    { name: 'form_submitted', order: 3, description: 'Submits signup form' },
    { name: 'email_verified', order: 4, description: 'Verifies email' },
    { name: 'first_login', order: 5, description: 'First successful login' },
  ],
}

/**
 * Homework checker funnel - tracks homework checking flow
 */
export const HOMEWORK_CHECKER_FUNNEL: FunnelConfig = {
  name: 'homework_checker',
  description: 'Homework checking and feedback flow',
  steps: [
    { name: 'checker_opened', order: 1, description: 'Opens homework checker' },
    { name: 'task_uploaded', order: 2, description: 'Uploads task image' },
    { name: 'answer_uploaded', order: 3, description: 'Uploads answer image' },
    { name: 'check_submitted', order: 4, description: 'Submits for checking' },
    { name: 'feedback_received', order: 5, description: 'Receives AI feedback' },
    { name: 'feedback_reviewed', order: 6, description: 'Reviews feedback details' },
  ],
}

/**
 * Homework helper funnel - tracks tutoring session flow
 */
export const HOMEWORK_HELPER_FUNNEL: FunnelConfig = {
  name: 'homework_helper',
  description: 'Socratic tutoring session flow',
  steps: [
    { name: 'helper_opened', order: 1, description: 'Opens homework helper' },
    { name: 'question_uploaded', order: 2, description: 'Uploads question image' },
    { name: 'context_provided', order: 3, description: 'Provides comfort level/context' },
    { name: 'session_started', order: 4, description: 'Starts tutoring session' },
    { name: 'first_hint_used', order: 5, description: 'Uses first hint' },
    { name: 'solution_reached', order: 6, description: 'Reaches solution' },
    { name: 'session_completed', order: 7, description: 'Completes session' },
  ],
}

/**
 * Knowledge map funnel - tracks knowledge exploration
 */
export const KNOWLEDGE_MAP_FUNNEL: FunnelConfig = {
  name: 'knowledge_map',
  description: 'Knowledge map exploration flow',
  steps: [
    { name: 'map_opened', order: 1, description: 'Opens knowledge map' },
    { name: 'concept_viewed', order: 2, description: 'Views a concept' },
    { name: 'connection_explored', order: 3, description: 'Explores concept connections' },
    { name: 'gap_identified', order: 4, description: 'Identifies knowledge gap' },
    { name: 'action_taken', order: 5, description: 'Takes action on gap' },
  ],
}

/**
 * Adaptive practice funnel - tracks adaptive learning sessions
 */
export const ADAPTIVE_PRACTICE_FUNNEL: FunnelConfig = {
  name: 'adaptive_practice',
  description: 'Adaptive practice session flow',
  steps: [
    { name: 'practice_hub_opened', order: 1, description: 'Opens practice hub' },
    { name: 'session_configured', order: 2, description: 'Configures session settings' },
    { name: 'session_started', order: 3, description: 'Starts adaptive session' },
    { name: 'difficulty_adjusted', order: 4, description: 'Difficulty auto-adjusted' },
    { name: 'session_completed', order: 5, description: 'Completes session' },
    { name: 'results_reviewed', order: 6, description: 'Reviews session results' },
  ],
}

/**
 * Course mastery funnel - tracks mastery progression
 */
export const COURSE_MASTERY_FUNNEL: FunnelConfig = {
  name: 'course_mastery',
  description: 'Course mastery progression flow',
  steps: [
    { name: 'course_started', order: 1, description: 'Starts course' },
    { name: 'first_lesson_complete', order: 2, description: 'Completes first lesson' },
    { name: 'quarter_mastery', order: 3, description: 'Reaches 25% mastery' },
    { name: 'half_mastery', order: 4, description: 'Reaches 50% mastery' },
    { name: 'three_quarter_mastery', order: 5, description: 'Reaches 75% mastery' },
    { name: 'full_mastery', order: 6, description: 'Achieves 100% mastery' },
  ],
}

// All funnels for reference
export const ALL_FUNNELS = {
  onboarding: ONBOARDING_FUNNEL,
  course_creation: COURSE_CREATION_FUNNEL,
  lesson_completion: LESSON_FUNNEL,
  practice_session: PRACTICE_FUNNEL,
  exam_session: EXAM_FUNNEL,
  review_session: REVIEW_FUNNEL,
  signup: SIGNUP_FUNNEL,
  homework_checker: HOMEWORK_CHECKER_FUNNEL,
  homework_helper: HOMEWORK_HELPER_FUNNEL,
  knowledge_map: KNOWLEDGE_MAP_FUNNEL,
  adaptive_practice: ADAPTIVE_PRACTICE_FUNNEL,
  course_mastery: COURSE_MASTERY_FUNNEL,
} as const

export type FunnelName = keyof typeof ALL_FUNNELS

// Helper to get step order by name
export function getStepOrder(funnelName: FunnelName, stepName: string): number {
  const funnel = ALL_FUNNELS[funnelName]
  const step = funnel.steps.find((s) => s.name === stepName)
  return step?.order ?? -1
}
