// =============================================================================
// Practice Question Bank Types
// =============================================================================

import { CognitiveLevel, DifficultyLevel } from '@/lib/adaptive/types'

// -----------------------------------------------------------------------------
// Question Types
// -----------------------------------------------------------------------------

export type PracticeQuestionType =
  | 'multiple_choice'
  | 'true_false'
  | 'fill_blank'
  | 'short_answer'
  | 'matching'
  | 'sequence'
  | 'image_label'

export type QuestionSource = 'generated' | 'manual' | 'imported' | 'srs'

export interface PracticeQuestion {
  id: string
  // Source reference
  course_id: string | null
  // Classification
  subject: string | null
  topic: string | null
  subtopic: string | null
  // Question content
  question_type: PracticeQuestionType
  question_text: string
  options: QuestionOptions | null
  correct_answer: string
  explanation: string | null
  // Difficulty and concept linkage
  difficulty_level: DifficultyLevel
  cognitive_level: CognitiveLevel | null
  primary_concept_id: string | null
  related_concept_ids: string[] | null
  // Performance tracking
  times_shown: number
  times_correct: number
  avg_response_time_ms: number | null
  // Metadata
  tags: string[] | null
  source: QuestionSource
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface QuestionOptions {
  // For multiple choice
  choices?: { label: string; value: string }[]
  // For matching
  pairs?: { left: string; right: string }[]
  // For sequence
  items?: string[]
  // For image_label
  image_label_data?: {
    image_url: string
    interaction_mode: 'drag' | 'type' | 'both'
    labels: Array<{
      id: string
      correct_text: string
      position: { x: number; y: number }
      box_width?: number
      hints?: string[]
    }>
  }
}

export type PracticeQuestionInsert = Omit<
  PracticeQuestion,
  | 'id'
  | 'times_shown'
  | 'times_correct'
  | 'avg_response_time_ms'
  | 'is_active'
  | 'created_at'
  | 'updated_at'
>

// -----------------------------------------------------------------------------
// Session Types
// -----------------------------------------------------------------------------

export type SessionType =
  | 'targeted'   // Focus on specific concepts (gaps)
  | 'mixed'      // Interleaved from all courses
  | 'exam_prep'  // Course-specific intensive
  | 'quick'      // Fast 5-10 question session
  | 'custom'     // User-defined criteria

export type SessionStatus = 'active' | 'paused' | 'completed' | 'abandoned'

export interface PracticeSession {
  id: string
  user_id: string
  // Session configuration
  session_type: SessionType
  course_id: string | null
  // Targeting
  target_concept_ids: string[] | null
  target_difficulty: DifficultyLevel | null
  // Session configuration
  question_count: number
  time_limit_minutes: number | null
  // Progress
  questions_answered: number
  questions_correct: number
  current_question_index: number
  // Question order (array of question IDs)
  question_order: string[]
  // Results
  accuracy: number | null
  avg_response_time_ms: number | null
  gaps_identified: string[] | null
  concepts_practiced: string[] | null
  // Timing
  started_at: string
  completed_at: string | null
  total_time_seconds: number | null
  // Status
  status: SessionStatus
  created_at: string
}

export interface PracticeSessionQuestion {
  id: string
  session_id: string
  question_id: string
  // Order in session
  question_index: number
  // Answer
  user_answer: string | null
  is_correct: boolean | null
  // Timing
  started_at: string | null
  answered_at: string | null
  response_time_ms: number | null
  // Hints
  hint_used: boolean
  // Timestamps
  created_at: string
}

// -----------------------------------------------------------------------------
// API Request/Response Types
// -----------------------------------------------------------------------------

export interface CreateSessionRequest {
  sessionType: SessionType
  courseId?: string
  targetConceptIds?: string[]
  targetDifficulty?: DifficultyLevel
  questionCount?: number
  timeLimitMinutes?: number
}

export interface CreateSessionResponse {
  sessionId: string
  questionCount: number
  estimatedMinutes: number
  targetConcepts: string[]
}

export interface AnswerQuestionRequest {
  sessionId: string
  questionId: string
  questionIndex: number
  userAnswer: string
  responseTimeMs?: number
}

export interface AnswerQuestionResponse {
  isCorrect: boolean
  correctAnswer: string
  explanation: string | null
  sessionProgress: {
    questionsAnswered: number
    questionsCorrect: number
    totalQuestions: number
    accuracy: number
  }
}

export interface SessionProgress {
  sessionId: string
  status: SessionStatus
  questionsAnswered: number
  questionsCorrect: number
  totalQuestions: number
  accuracy: number
  currentQuestionIndex: number
  elapsedSeconds: number
  remainingQuestions: number
}

export interface SessionResult {
  sessionId: string
  sessionType: SessionType
  totalQuestions: number
  questionsCorrect: number
  accuracy: number
  totalTimeSeconds: number
  avgResponseTimeMs: number | null
  conceptsPracticed: string[]
  gapsIdentified: string[]
  improvement: {
    conceptId: string
    conceptName: string
    previousMastery: number
    newMastery: number
    change: number
  }[]
}

// -----------------------------------------------------------------------------
// Question Generation Types
// -----------------------------------------------------------------------------

export interface GenerateQuestionsRequest {
  courseId: string
  count: number
  conceptIds?: string[]
  difficulty?: DifficultyLevel
  questionTypes?: PracticeQuestionType[]
  /** Education level for age-appropriate question generation */
  educationLevel?: 'elementary' | 'middle_school' | 'high_school' | 'university' | 'graduate' | 'professional'
}

export interface GeneratedQuestion {
  question_type: PracticeQuestionType
  question_text: string
  options: QuestionOptions | null
  correct_answer: string
  explanation: string
  difficulty_level: DifficultyLevel
  cognitive_level: CognitiveLevel
  concept_name: string
  tags: string[]
}

// -----------------------------------------------------------------------------
// Practice Hub Types
// -----------------------------------------------------------------------------

export interface PracticeStats {
  totalSessions: number
  totalQuestions: number
  totalCorrect: number
  overallAccuracy: number
  streakDays: number
  lastPracticeDate: string | null
  weakConcepts: {
    conceptId: string
    conceptName: string
    accuracy: number
    lastPracticed: string | null
  }[]
  recentSessions: {
    sessionId: string
    sessionType: SessionType
    date: string
    accuracy: number
    questionsAnswered: number
  }[]
}

export interface QuickPracticeOption {
  type: SessionType
  title: string
  description: string
  questionCount: number
  estimatedMinutes: number
  icon: string
  available: boolean
  reason?: string
}

// -----------------------------------------------------------------------------
// Step-by-Step Math Practice Types
// -----------------------------------------------------------------------------

export type MathProblemType =
  | 'long_division'
  | 'fraction_simplify'
  | 'fraction_add'
  | 'fraction_multiply'
  | 'equation_linear'
  | 'equation_quadratic'
  | 'multiplication'
  | 'decimal_operation'

export type StepStatus = 'pending' | 'active' | 'correct' | 'incorrect' | 'skipped'

export interface ProblemStep {
  id: string
  stepNumber: number
  instruction: string           // "מה התוצאה של 7 × 2?" / "What is 7 × 2?"
  instructionHe?: string        // Hebrew instruction
  expectedAnswer: string        // "14"
  acceptableAnswers?: string[]  // Alternative correct answers
  hint?: string                 // "כמה פעמים 7 נכנס ב-15?"
  hintHe?: string              // Hebrew hint
  inputType: 'number' | 'fraction' | 'expression' | 'text'
  inputPlaceholder?: string
  visualUpdate?: {              // How to update visualization after step
    type: string
    config: Record<string, unknown>
  }
}

export interface StepByStepProblem {
  id: string
  type: MathProblemType
  difficulty: DifficultyLevel
  question: string              // "חשב: 156 ÷ 7" / "Calculate: 156 ÷ 7"
  questionHe?: string           // Hebrew question
  steps: ProblemStep[]
  finalAnswer: string           // "22 remainder 2"
  visualization?: {
    type: 'long_division' | 'fraction' | 'equation' | 'number_line' | 'coordinate_plane'
    initialConfig: Record<string, unknown>
  }
  explanation?: string          // Full solution explanation
  explanationHe?: string        // Hebrew explanation
}

export interface StepAttempt {
  stepId: string
  userAnswer: string
  correct: boolean
  attempts: number
  hintUsed: boolean
  timeSpentMs: number
}

export interface MathPracticeSession {
  id: string
  userId: string
  problemType: MathProblemType
  difficulty: DifficultyLevel
  currentProblem: StepByStepProblem | null
  currentStepIndex: number
  stepAttempts: StepAttempt[]
  problemsCompleted: number
  problemsCorrect: number
  totalStepsCompleted: number
  totalStepsCorrect: number
  startedAt: string
  completedAt: string | null
}

export interface ValidateStepRequest {
  problemId: string
  stepId: string
  userAnswer: string
}

export interface ValidateStepResponse {
  correct: boolean
  feedback: string
  feedbackHe?: string
  correctAnswer?: string        // Only revealed after max attempts
  hint?: string                 // Next hint if incorrect
  hintHe?: string
  attemptsRemaining: number
  stepComplete: boolean
  problemComplete: boolean
}

export interface GenerateMathProblemRequest {
  type: MathProblemType
  difficulty: DifficultyLevel
  language?: 'en' | 'he'
}

// Math difficulty levels (1=easy, 2=medium, 3=hard)
export type MathDifficulty = 'easy' | 'medium' | 'hard'

// Problem type configurations
export const MATH_PROBLEM_CONFIG = {
  long_division: {
    name: 'Long Division',
    nameHe: 'חילוק ארוך',
    icon: '➗',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 3,
  },
  fraction_simplify: {
    name: 'Simplify Fractions',
    nameHe: 'צמצום שברים',
    icon: '½',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 2,
  },
  fraction_add: {
    name: 'Add Fractions',
    nameHe: 'חיבור שברים',
    icon: '⅓+⅔',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 3,
  },
  fraction_multiply: {
    name: 'Multiply Fractions',
    nameHe: 'כפל שברים',
    icon: '×',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 2,
  },
  equation_linear: {
    name: 'Linear Equations',
    nameHe: 'משוואות ליניאריות',
    icon: 'x=?',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 3,
  },
  equation_quadratic: {
    name: 'Quadratic Equations',
    nameHe: 'משוואות ריבועיות',
    icon: 'x²',
    difficulties: ['medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 5,
  },
  multiplication: {
    name: 'Long Multiplication',
    nameHe: 'כפל ארוך',
    icon: '×',
    difficulties: ['easy', 'medium'] as MathDifficulty[],
    estimatedMinutes: 2,
  },
  decimal_operation: {
    name: 'Decimal Operations',
    nameHe: 'פעולות עם עשרוניים',
    icon: '0.5',
    difficulties: ['easy', 'medium', 'hard'] as MathDifficulty[],
    estimatedMinutes: 2,
  },
} as const

// -----------------------------------------------------------------------------
// Configuration
// -----------------------------------------------------------------------------

export const PRACTICE_CONFIG = {
  // Default question counts by session type
  defaultQuestionCounts: {
    targeted: 10,
    mixed: 15,
    exam_prep: 30,
    quick: 5,
    custom: 10,
  } as Record<SessionType, number>,

  // Time estimates (minutes per question by type)
  minutesPerQuestion: {
    multiple_choice: 0.5,
    true_false: 0.25,
    fill_blank: 0.75,
    short_answer: 1.5,
    matching: 1,
    sequence: 1,
    image_label: 2,
  } as Record<PracticeQuestionType, number>,

  // Minimum questions for each session type
  minQuestions: {
    targeted: 5,
    mixed: 5,
    exam_prep: 10,
    quick: 3,
    custom: 1,
  } as Record<SessionType, number>,

  // Maximum questions
  maxQuestions: 50,

  // Accuracy thresholds
  accuracyThresholds: {
    excellent: 0.9,
    good: 0.75,
    fair: 0.6,
    needsWork: 0,
  },

  // Gap identification threshold
  gapThreshold: 0.5, // <50% accuracy on concept = gap
}
