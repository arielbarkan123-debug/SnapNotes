/**
 * Age-Differentiated Learning Configuration
 *
 * Based on research findings:
 * - Adaptive AI systems improved post-assessment scores: 68.4 → 82.7
 * - Self-efficacy improvement with AI feedback: Cohen's d = 0.312
 * - Serious games in STEM: mean score 8/10
 *
 * This module provides age-appropriate learning parameters for:
 * - Lesson structure (length, steps, content density)
 * - Content complexity (vocabulary, abstraction, visuals)
 * - Question design (types, difficulty progression)
 * - Gamification (XP, rewards, competition)
 * - Feedback (timing, tone, depth)
 */

export interface AgeGroupConfig {
  id: string
  name: string
  nameHebrew: string
  ageRange: [number, number]
  educationLevels: string[]

  // Lesson Parameters
  lessonLength: { min: number; max: number; optimal: number } // minutes
  stepsPerLesson: { min: number; max: number }
  wordsPerExplanation: { min: number; max: number }

  // Content Parameters
  vocabularyLevel: 'simple' | 'expanding' | 'advanced'
  abstractionLevel: 'concrete' | 'moderate' | 'high'
  examplesRequired: number
  visualContentWeight: number // 0-1, higher = more visuals

  // Question Parameters
  questionTypes: string[]
  questionsPerLesson: { min: number; max: number }
  difficultyRange: { min: number; max: number } // 1-10 scale

  // Gamification Parameters
  gamificationStyle: 'visual_rewards' | 'strategy_competition' | 'achievement_mastery'
  xpMultiplier: number
  showLeaderboard: boolean
  badgeStyle: 'colorful' | 'professional'
  streakImportance: 'high' | 'medium' | 'low'

  // Feedback Parameters
  feedbackStyle: 'immediate_positive' | 'timely_explanatory' | 'detailed_constructive'
  feedbackDelay: number // seconds
  showDetailedExplanations: boolean
  encouragementLevel: 'high' | 'moderate' | 'minimal'

  // Attention & Engagement
  breakFrequency: number // minutes between suggested breaks
  interactiveElementsPerLesson: number
  chunkSize: 'small' | 'medium' | 'large' // information chunk size
}

export const AGE_GROUP_CONFIGS: Record<string, AgeGroupConfig> = {
  elementary: {
    id: 'elementary',
    name: 'Elementary (6-12)',
    nameHebrew: 'יסודי (6-12)',
    ageRange: [6, 12],
    educationLevels: ['elementary'],

    // Short, focused lessons for young attention spans
    lessonLength: { min: 5, max: 15, optimal: 10 },
    stepsPerLesson: { min: 5, max: 8 },
    wordsPerExplanation: { min: 30, max: 60 },

    // Concrete, visual, simple language
    vocabularyLevel: 'simple',
    abstractionLevel: 'concrete',
    examplesRequired: 3,
    visualContentWeight: 0.7,

    // Simple question types only
    questionTypes: ['multiple_choice', 'matching', 'true_false', 'fill_blank'],
    questionsPerLesson: { min: 3, max: 5 },
    difficultyRange: { min: 1, max: 4 },

    // High gamification with visual rewards
    gamificationStyle: 'visual_rewards',
    xpMultiplier: 1.5, // More XP to encourage young learners
    showLeaderboard: false, // Avoid competition stress
    badgeStyle: 'colorful',
    streakImportance: 'high',

    // Immediate, enthusiastic feedback
    feedbackStyle: 'immediate_positive',
    feedbackDelay: 0,
    showDetailedExplanations: false,
    encouragementLevel: 'high',

    // Frequent breaks, high interactivity
    breakFrequency: 10,
    interactiveElementsPerLesson: 5,
    chunkSize: 'small',
  },

  middle_school: {
    id: 'middle_school',
    name: 'Middle School (11-14)',
    nameHebrew: 'חטיבת ביניים (11-14)',
    ageRange: [11, 14],
    educationLevels: ['middle_school'],

    lessonLength: { min: 10, max: 20, optimal: 15 },
    stepsPerLesson: { min: 6, max: 10 },
    wordsPerExplanation: { min: 50, max: 100 },

    vocabularyLevel: 'expanding',
    abstractionLevel: 'moderate',
    examplesRequired: 2,
    visualContentWeight: 0.5,

    questionTypes: [
      'multiple_choice',
      'short_answer',
      'fill_blank',
      'matching',
      'sequence',
    ],
    questionsPerLesson: { min: 3, max: 6 },
    difficultyRange: { min: 2, max: 6 },

    gamificationStyle: 'strategy_competition',
    xpMultiplier: 1.2,
    showLeaderboard: true,
    badgeStyle: 'colorful',
    streakImportance: 'high',

    feedbackStyle: 'timely_explanatory',
    feedbackDelay: 1,
    showDetailedExplanations: true,
    encouragementLevel: 'moderate',

    breakFrequency: 15,
    interactiveElementsPerLesson: 4,
    chunkSize: 'medium',
  },

  high_school: {
    id: 'high_school',
    name: 'High School (14-18)',
    nameHebrew: 'תיכון (14-18)',
    ageRange: [14, 18],
    educationLevels: ['high_school'],

    lessonLength: { min: 15, max: 30, optimal: 20 },
    stepsPerLesson: { min: 8, max: 12 },
    wordsPerExplanation: { min: 80, max: 150 },

    vocabularyLevel: 'expanding',
    abstractionLevel: 'moderate',
    examplesRequired: 2,
    visualContentWeight: 0.4,

    questionTypes: [
      'multiple_choice',
      'short_answer',
      'fill_blank',
      'sequence',
      'scenario',
      'calculation',
      'multi_select',
    ],
    questionsPerLesson: { min: 3, max: 5 },
    difficultyRange: { min: 3, max: 8 },

    gamificationStyle: 'strategy_competition',
    xpMultiplier: 1.0,
    showLeaderboard: true,
    badgeStyle: 'professional',
    streakImportance: 'medium',

    feedbackStyle: 'timely_explanatory',
    feedbackDelay: 2,
    showDetailedExplanations: true,
    encouragementLevel: 'moderate',

    breakFrequency: 25,
    interactiveElementsPerLesson: 3,
    chunkSize: 'medium',
  },

  university: {
    id: 'university',
    name: 'University (18-22)',
    nameHebrew: 'אוניברסיטה (18-22)',
    ageRange: [18, 22],
    educationLevels: ['university'],

    lessonLength: { min: 20, max: 45, optimal: 30 },
    stepsPerLesson: { min: 10, max: 15 },
    wordsPerExplanation: { min: 100, max: 200 },

    vocabularyLevel: 'advanced',
    abstractionLevel: 'high',
    examplesRequired: 2,
    visualContentWeight: 0.3,

    questionTypes: [
      'multiple_choice',
      'short_answer',
      'open_ended',
      'case_study',
      'application',
      'calculation',
      'proof',
      'multi_select',
    ],
    questionsPerLesson: { min: 2, max: 4 },
    difficultyRange: { min: 5, max: 10 },

    gamificationStyle: 'achievement_mastery',
    xpMultiplier: 1.0,
    showLeaderboard: true,
    badgeStyle: 'professional',
    streakImportance: 'medium',

    feedbackStyle: 'detailed_constructive',
    feedbackDelay: 3,
    showDetailedExplanations: true,
    encouragementLevel: 'minimal',

    breakFrequency: 30,
    interactiveElementsPerLesson: 2,
    chunkSize: 'large',
  },

  professional: {
    id: 'professional',
    name: 'Professional/Adult (22+)',
    nameHebrew: 'מקצועי/מבוגר (22+)',
    ageRange: [22, 99],
    educationLevels: ['graduate', 'professional'],

    lessonLength: { min: 20, max: 45, optimal: 25 },
    stepsPerLesson: { min: 8, max: 12 },
    wordsPerExplanation: { min: 100, max: 180 },

    vocabularyLevel: 'advanced',
    abstractionLevel: 'high',
    examplesRequired: 2,
    visualContentWeight: 0.25,

    questionTypes: [
      'multiple_choice',
      'short_answer',
      'case_study',
      'application',
      'scenario',
      'calculation',
      'multi_select',
    ],
    questionsPerLesson: { min: 2, max: 4 },
    difficultyRange: { min: 5, max: 10 },

    gamificationStyle: 'achievement_mastery',
    xpMultiplier: 0.8, // Less gamification focus for adults
    showLeaderboard: false,
    badgeStyle: 'professional',
    streakImportance: 'low',

    feedbackStyle: 'detailed_constructive',
    feedbackDelay: 5,
    showDetailedExplanations: true,
    encouragementLevel: 'minimal',

    breakFrequency: 30,
    interactiveElementsPerLesson: 2,
    chunkSize: 'large',
  },
}

/**
 * Education level to age group mapping
 */
const EDUCATION_TO_AGE_GROUP: Record<string, string> = {
  elementary: 'elementary',
  middle_school: 'middle_school',
  high_school: 'high_school',
  university: 'university',
  graduate: 'professional',
  professional: 'professional',
}

/**
 * Get the age group configuration for a given education level
 */
export function getAgeGroupConfig(educationLevel: string): AgeGroupConfig {
  const ageGroupId = EDUCATION_TO_AGE_GROUP[educationLevel] || 'high_school'
  return AGE_GROUP_CONFIGS[ageGroupId]
}

/**
 * Get the age group configuration by age
 */
export function getAgeGroupConfigByAge(age: number): AgeGroupConfig {
  for (const config of Object.values(AGE_GROUP_CONFIGS)) {
    if (age >= config.ageRange[0] && age <= config.ageRange[1]) {
      return config
    }
  }
  return AGE_GROUP_CONFIGS.high_school // Default fallback
}

/**
 * Get all available education levels
 */
export function getEducationLevels(): Array<{ id: string; name: string; nameHebrew: string }> {
  return Object.values(AGE_GROUP_CONFIGS).map((config) => ({
    id: config.id,
    name: config.name,
    nameHebrew: config.nameHebrew,
  }))
}

/**
 * Calculate the optimal lesson duration based on topic complexity
 */
export function calculateOptimalLessonDuration(
  educationLevel: string,
  topicComplexity: number // 1-10 scale
): number {
  const config = getAgeGroupConfig(educationLevel)
  const { min, max, optimal } = config.lessonLength

  // Adjust based on complexity: higher complexity = longer lesson (up to max)
  const complexityFactor = topicComplexity / 10
  const adjustedDuration = optimal + (max - optimal) * complexityFactor

  return Math.min(max, Math.max(min, Math.round(adjustedDuration)))
}

/**
 * Calculate the optimal number of steps for a lesson
 */
export function calculateOptimalSteps(
  educationLevel: string,
  lessonDuration: number
): number {
  const config = getAgeGroupConfig(educationLevel)
  const { min, max } = config.stepsPerLesson

  // Roughly 2-3 minutes per step for younger, 3-4 minutes for older
  const minutesPerStep = config.abstractionLevel === 'concrete' ? 2 : 3
  const calculatedSteps = Math.round(lessonDuration / minutesPerStep)

  return Math.min(max, Math.max(min, calculatedSteps))
}

/**
 * Get question types appropriate for the age group and difficulty level
 */
export function getAppropriateQuestionTypes(
  educationLevel: string,
  difficultyLevel: number // 1-10
): string[] {
  const config = getAgeGroupConfig(educationLevel)
  const allTypes = config.questionTypes

  // For lower difficulty, prefer simpler question types
  if (difficultyLevel <= 3) {
    return allTypes.filter((type) =>
      ['multiple_choice', 'true_false', 'matching', 'fill_blank'].includes(type)
    )
  }

  // For medium difficulty, include more variety
  if (difficultyLevel <= 6) {
    return allTypes.filter(
      (type) => !['open_ended', 'case_study', 'proof'].includes(type)
    )
  }

  // For high difficulty, use all available types
  return allTypes
}

/**
 * Get vocabulary complexity instructions for AI prompts
 */
export function getVocabularyInstructions(config: AgeGroupConfig): string {
  switch (config.vocabularyLevel) {
    case 'simple':
      return `Use ONLY simple, everyday words that a child would know.
- Maximum sentence length: 10-12 words
- Avoid jargon and technical terms
- If a new term must be introduced, explain it immediately with a simple example
- Use words related to daily life: toys, games, food, animals, family`

    case 'expanding':
      return `Use clear, accessible language while gradually introducing technical vocabulary.
- Maximum sentence length: 15-20 words
- Introduce technical terms with clear definitions
- Use analogies to explain abstract concepts
- Build vocabulary progressively through the lesson`

    case 'advanced':
      return `Use proper academic and technical terminology.
- Assume foundational knowledge of the subject
- Use precise, domain-specific language
- Complex sentence structures are acceptable
- Technical accuracy takes priority over simplicity`

    default:
      return ''
  }
}

/**
 * Get abstraction level instructions for AI prompts
 */
export function getAbstractionInstructions(config: AgeGroupConfig): string {
  switch (config.abstractionLevel) {
    case 'concrete':
      return `Keep ALL explanations concrete and tangible.
- Use real-world examples from daily life
- Reference physical objects students can visualize
- Avoid abstract reasoning - make everything "touchable"
- Use visual representations whenever possible
- Connect concepts to things students have experienced`

    case 'moderate':
      return `Balance concrete examples with abstract concepts.
- Start with concrete examples, then move to abstract
- Scaffold complexity gradually
- Use analogies to bridge concrete and abstract thinking
- Include some theoretical reasoning, but always ground it in examples`

    case 'high':
      return `Engage with theoretical concepts and complex reasoning.
- Abstract thinking is expected and encouraged
- Include proofs, derivations, and formal reasoning
- Complex multi-step problem solving
- Nuanced analysis and critical thinking
- Connect to broader theoretical frameworks`

    default:
      return ''
  }
}

/**
 * Get gamification style description for UI components
 */
export function getGamificationStyle(educationLevel: string): {
  showAnimations: boolean
  celebrationLevel: 'high' | 'moderate' | 'minimal'
  xpVisibility: 'prominent' | 'visible' | 'subtle'
  badgeEmoji: boolean
  soundEffects: boolean
} {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.gamificationStyle) {
    case 'visual_rewards':
      return {
        showAnimations: true,
        celebrationLevel: 'high',
        xpVisibility: 'prominent',
        badgeEmoji: true,
        soundEffects: true,
      }

    case 'strategy_competition':
      return {
        showAnimations: true,
        celebrationLevel: 'moderate',
        xpVisibility: 'visible',
        badgeEmoji: true,
        soundEffects: false,
      }

    case 'achievement_mastery':
      return {
        showAnimations: false,
        celebrationLevel: 'minimal',
        xpVisibility: 'subtle',
        badgeEmoji: false,
        soundEffects: false,
      }

    default:
      return {
        showAnimations: true,
        celebrationLevel: 'moderate',
        xpVisibility: 'visible',
        badgeEmoji: true,
        soundEffects: false,
      }
  }
}
