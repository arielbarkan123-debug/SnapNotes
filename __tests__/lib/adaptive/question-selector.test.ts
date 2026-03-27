/**
 * Tests for lib/adaptive/question-selector.ts
 *
 * Tests the pure functions: calculateTargetDifficulty, scoreQuestion, selectQuestions
 */

import {
  calculateTargetDifficulty,
  scoreQuestion,
  selectQuestions,
} from '@/lib/adaptive/question-selector'
import type {
  UserPerformanceState,
  QuestionWithDifficulty,
} from '@/lib/adaptive/types'

// =============================================================================
// Helpers
// =============================================================================

function makeState(overrides: Partial<UserPerformanceState> = {}): UserPerformanceState {
  return {
    id: 'state-1',
    user_id: 'user-1',
    course_id: null,
    session_difficulty_level: 2.5,
    target_difficulty: 3.0,
    rolling_accuracy: 0.75,
    rolling_response_time_ms: 5000,
    estimated_ability: 2.5,
    correct_streak: 0,
    wrong_streak: 0,
    last_cognitive_level: null,
    questions_answered: 10,
    session_start: null,
    difficulty_floor: 1.0,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  }
}

function makeQuestion(overrides: Partial<QuestionWithDifficulty> = {}): QuestionWithDifficulty {
  return {
    id: 'q-1',
    difficulty: 3,
    ...overrides,
  }
}

// =============================================================================
// calculateTargetDifficulty
// =============================================================================

describe('calculateTargetDifficulty', () => {
  it('should return stable when accuracy is within normal range', () => {
    const state = makeState({ rolling_accuracy: 0.75, session_difficulty_level: 3.0 })
    const result = calculateTargetDifficulty(state)
    expect(result.adjustmentReason).toBe('stable')
    expect(result.targetDifficulty).toBe(3.0)
  })

  it('should increase difficulty when accuracy is high (>0.80)', () => {
    const state = makeState({ rolling_accuracy: 0.85, session_difficulty_level: 3.0 })
    const result = calculateTargetDifficulty(state)
    expect(result.adjustmentReason).toBe('accuracy_high')
    // 3.0 + 0.4 = 3.4
    expect(result.targetDifficulty).toBe(3.4)
  })

  it('should decrease difficulty when accuracy is low (<0.65)', () => {
    const state = makeState({ rolling_accuracy: 0.50, session_difficulty_level: 3.0 })
    const result = calculateTargetDifficulty(state)
    expect(result.adjustmentReason).toBe('accuracy_low')
    // 3.0 - 0.4 = 2.6
    expect(result.targetDifficulty).toBe(2.6)
  })

  it('should apply streak bonus when correct_streak >= 2 and accuracy high', () => {
    const state = makeState({
      rolling_accuracy: 0.90,
      session_difficulty_level: 3.0,
      correct_streak: 3,
    })
    const result = calculateTargetDifficulty(state)
    expect(result.adjustmentReason).toBe('streak_up')
    // 3.0 + 0.4 + 0.25 = 3.65
    expect(result.targetDifficulty).toBe(3.65)
  })

  it('should apply streak penalty when wrong_streak >= 2 and accuracy low', () => {
    const state = makeState({
      rolling_accuracy: 0.40,
      session_difficulty_level: 3.0,
      wrong_streak: 3,
    })
    const result = calculateTargetDifficulty(state)
    expect(result.adjustmentReason).toBe('streak_down')
    // 3.0 - 0.4 - 0.25 = 2.35
    expect(result.targetDifficulty).toBe(2.35)
  })

  it('should clamp difficulty to minDifficulty (1)', () => {
    const state = makeState({
      rolling_accuracy: 0.20,
      session_difficulty_level: 1.2,
      wrong_streak: 5,
    })
    const result = calculateTargetDifficulty(state)
    // 1.2 - 0.4 - 0.25 = 0.55, clamped to 1
    expect(result.targetDifficulty).toBe(1)
  })

  it('should clamp difficulty to maxDifficulty (5)', () => {
    const state = makeState({
      rolling_accuracy: 0.95,
      session_difficulty_level: 4.8,
      correct_streak: 5,
    })
    const result = calculateTargetDifficulty(state)
    // 4.8 + 0.4 + 0.25 = 5.45, clamped to 5
    expect(result.targetDifficulty).toBe(5)
  })

  it('should respect difficulty_floor', () => {
    const state = makeState({
      rolling_accuracy: 0.40,
      session_difficulty_level: 2.5,
      difficulty_floor: 2.0,
    })
    const result = calculateTargetDifficulty(state)
    // 2.5 - 0.4 = 2.1, floor is 2.0 => 2.1 (above floor)
    expect(result.targetDifficulty).toBe(2.1)
  })

  it('should enforce difficulty_floor when calculation drops below it', () => {
    const state = makeState({
      rolling_accuracy: 0.30,
      session_difficulty_level: 2.0,
      wrong_streak: 3,
      difficulty_floor: 2.0,
    })
    const result = calculateTargetDifficulty(state)
    // 2.0 - 0.4 - 0.25 = 1.35, floor is 2.0 => 2.0
    expect(result.targetDifficulty).toBe(2.0)
  })

  it('should include currentAccuracy and estimatedAbility in result', () => {
    const state = makeState({ rolling_accuracy: 0.70, estimated_ability: 3.5 })
    const result = calculateTargetDifficulty(state)
    expect(result.currentAccuracy).toBe(0.70)
    expect(result.estimatedAbility).toBe(3.5)
  })
})

// =============================================================================
// scoreQuestion
// =============================================================================

describe('scoreQuestion', () => {
  it('should give high score for exact difficulty match', () => {
    const question = makeQuestion({ difficulty: 3.0 })
    const score = scoreQuestion(question, 3.0)
    // difficultyMatch = (1 - 0/4) * 50 = 50, freshness=10 (no lastSeenAt), novelty=5 (no timesShown)
    expect(score).toBe(50 + 10 + 5)
  })

  it('should give lower score for difficulty mismatch', () => {
    const question = makeQuestion({ difficulty: 1.0 })
    const score = scoreQuestion(question, 3.0)
    // difficultyMatch = (1 - 2/4) * 50 = 25
    expect(score).toBe(25 + 10 + 5)
  })

  it('should add concept priority bonus for weak concepts (simple list)', () => {
    const question = makeQuestion({ conceptId: 'concept-A', difficulty: 3.0 })
    const score = scoreQuestion(question, 3.0, ['concept-A'])
    // 50 (diff) + 50 (weak concept) + 10 (fresh) + 5 (novel) = 115
    expect(score).toBe(115)
  })

  it('should add detailed weak concept bonus with mastery info', () => {
    const question = makeQuestion({ conceptId: 'concept-B', difficulty: 3.0 })
    const weakConcepts = [{ id: 'concept-B', mastery: 0.2 }]
    const score = scoreQuestion(question, 3.0, [], undefined, weakConcepts)
    // 50 (diff) + 50 (weak concept base) + 20*(1-0.2)=16 (severity) + 10 (fresh) + 5 (novel) = 131
    expect(score).toBe(131)
  })

  it('should add variety bonus when cognitive level differs from last', () => {
    const question = makeQuestion({ difficulty: 3.0, cognitiveLevel: 'apply' })
    const score = scoreQuestion(question, 3.0, [], 'remember')
    // 50 (diff) + 10 (variety) + 10 (fresh) + 5 (novel) + 6 (Bloom's apply) = 81
    expect(score).toBe(81)
  })

  it('should not add variety bonus when same cognitive level as last', () => {
    const question = makeQuestion({ difficulty: 3.0, cognitiveLevel: 'apply' })
    const score = scoreQuestion(question, 3.0, [], 'apply')
    // 50 (diff) + 0 (no variety) + 10 (fresh) + 5 (novel) + 6 (Bloom's apply) = 71
    expect(score).toBe(71)
  })

  it('should add Bloom taxonomy bonus for higher cognitive levels', () => {
    const questionCreate = makeQuestion({ difficulty: 3.0, cognitiveLevel: 'create' })
    const questionRemember = makeQuestion({ difficulty: 3.0, cognitiveLevel: 'remember' })
    const scoreCreate = scoreQuestion(questionCreate, 3.0, [], 'other')
    const scoreRemember = scoreQuestion(questionRemember, 3.0, [], 'other')
    // create gets 15 Bloom bonus, remember gets 0
    expect(scoreCreate - scoreRemember).toBe(15)
  })

  it('should use empiricalDifficulty over difficulty when available', () => {
    const question = makeQuestion({ difficulty: 5.0, empiricalDifficulty: 3.0 })
    const score = scoreQuestion(question, 3.0)
    // Should use empiricalDifficulty=3.0, gap=0
    // 50 (diff) + 10 (fresh) + 5 (novel) = 65
    expect(score).toBe(65)
  })
})

// =============================================================================
// selectQuestions
// =============================================================================

describe('selectQuestions', () => {
  const questions: QuestionWithDifficulty[] = [
    { id: 'q1', difficulty: 1.0 },
    { id: 'q2', difficulty: 2.0 },
    { id: 'q3', difficulty: 3.0 },
    { id: 'q4', difficulty: 4.0 },
    { id: 'q5', difficulty: 5.0 },
  ]

  it('should return requested count of questions for count > 1', () => {
    const result = selectQuestions(questions, 3.0, [], undefined, 3)
    expect(result).toHaveLength(3)
  })

  it('should return a single question when count=1', () => {
    const result = selectQuestions(questions, 3.0, [], undefined, 1)
    expect(result).toHaveLength(1)
    expect(result[0]).toHaveProperty('questionId')
    expect(result[0]).toHaveProperty('score')
  })

  it('should return empty array for empty question pool', () => {
    const result = selectQuestions([], 3.0)
    expect(result).toHaveLength(0)
  })

  it('should return all questions when count exceeds pool size', () => {
    const result = selectQuestions(questions, 3.0, [], undefined, 10)
    expect(result).toHaveLength(5)
  })

  it('should prefer questions closer to target difficulty (count > 1)', () => {
    const result = selectQuestions(questions, 3.0, [], undefined, 3)
    // q3 (diff=3.0) should be ranked highest
    expect(result[0].questionId).toBe('q3')
  })

  it('should include scored fields in results', () => {
    const result = selectQuestions(questions, 3.0, [], undefined, 1)
    const q = result[0]
    expect(typeof q.score).toBe('number')
    expect(typeof q.difficultyMatch).toBe('number')
    expect(typeof q.conceptPriority).toBe('number')
    expect(typeof q.varietyBonus).toBe('number')
  })
})
