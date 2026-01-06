/**
 * Age-Adaptive XP System
 *
 * Adjusts XP rewards and gamification based on the learner's age group.
 *
 * Research basis:
 * - Young learners benefit from higher XP multipliers (encouragement focus)
 * - Adults prefer mastery indicators over arbitrary points
 * - Teens respond well to competitive elements
 */

import { type AgeGroupConfig, getAgeGroupConfig } from '@/lib/learning/age-config'
import {
  XP_REWARDS,
  type XPRewardType,
  calculateLevel,
  getLevelTitle,
  type XPGain,
} from './xp'

// ============================================
// AGE-ADJUSTED XP REWARDS
// ============================================

/**
 * Calculate age-adjusted XP reward
 *
 * @param baseXP - Base XP amount from XP_REWARDS
 * @param educationLevel - User's education level
 * @param eventType - Type of XP event
 * @returns Adjusted XP amount
 */
export function calculateAgeAdjustedXP(
  baseXP: number,
  educationLevel: string,
  eventType: XPRewardType
): number {
  const config = getAgeGroupConfig(educationLevel)
  let adjustedXP = Math.round(baseXP * config.xpMultiplier)

  // Apply event-specific bonuses based on gamification style
  adjustedXP = applyEventBonus(adjustedXP, config, eventType)

  return adjustedXP
}

/**
 * Apply event-specific bonuses based on gamification style
 */
function applyEventBonus(
  xp: number,
  config: AgeGroupConfig,
  eventType: XPRewardType
): number {
  switch (config.gamificationStyle) {
    case 'visual_rewards':
      // Young learners: bonus for completion and streaks (encouragement)
      if (eventType === 'lesson_complete') return Math.round(xp * 1.3)
      if (eventType === 'streak_maintained') return Math.round(xp * 1.5)
      if (eventType === 'first_lesson') return Math.round(xp * 2.0)
      if (eventType === 'practice_complete') return Math.round(xp * 1.2)
      break

    case 'strategy_competition':
      // Teens: bonus for perfect scores and achievements (competition)
      if (eventType === 'lesson_perfect') return Math.round(xp * 1.3)
      if (eventType === 'practice_perfect') return Math.round(xp * 1.4)
      if (eventType === 'streak_week') return Math.round(xp * 1.2)
      if (eventType === 'mastery_achieved') return Math.round(xp * 1.25)
      break

    case 'achievement_mastery':
      // Adults: bonus for mastery and course creation (mastery focus)
      if (eventType === 'mastery_achieved') return Math.round(xp * 1.5)
      if (eventType === 'course_created') return Math.round(xp * 0.8) // Less XP for just creating
      if (eventType === 'lesson_complete') return Math.round(xp * 0.9) // Slightly less for just completing
      break
  }

  return xp
}

/**
 * Award XP with age-based adjustments
 *
 * @param currentTotalXP - User's current total XP
 * @param type - Type of XP reward
 * @param educationLevel - User's education level
 * @param bonusXP - Optional additional bonus XP
 * @returns XP gain result with level up info
 */
export function awardAgeAdaptiveXP(
  currentTotalXP: number,
  type: XPRewardType,
  educationLevel: string,
  bonusXP: number = 0
): XPGain {
  const baseAmount = XP_REWARDS[type]
  const adjustedBase = calculateAgeAdjustedXP(baseAmount, educationLevel, type)
  const amount = adjustedBase + bonusXP
  const newTotal = currentTotalXP + amount

  const oldLevel = calculateLevel(currentTotalXP)
  const newLevel = calculateLevel(newTotal)
  const leveledUp = newLevel > oldLevel

  return {
    amount,
    newTotal,
    leveledUp,
    newLevel: leveledUp ? newLevel : undefined,
    newTitle: leveledUp ? getLevelTitle(newLevel) : undefined,
  }
}

// ============================================
// AGE-APPROPRIATE FEEDBACK MESSAGES
// ============================================

export interface XPFeedback {
  message: string
  emoji: string
  showAnimation: boolean
  soundEffect: boolean
}

/**
 * Get age-appropriate XP gain feedback
 *
 * @param amount - XP amount earned
 * @param educationLevel - User's education level
 * @param eventType - Type of XP event
 * @param leveledUp - Whether the user leveled up
 * @returns Feedback object with message and display options
 */
export function getXPFeedback(
  amount: number,
  educationLevel: string,
  eventType: XPRewardType,
  leveledUp: boolean = false
): XPFeedback {
  const config = getAgeGroupConfig(educationLevel)

  if (leveledUp) {
    return getLevelUpFeedback(config)
  }

  return getEventFeedback(amount, config, eventType)
}

/**
 * Get level up feedback based on age group
 */
function getLevelUpFeedback(config: AgeGroupConfig): XPFeedback {
  switch (config.gamificationStyle) {
    case 'visual_rewards':
      const youngMessages = [
        'WOW! You leveled up!',
        'Amazing! New level!',
        'Super star! Level up!',
        'Incredible! You did it!',
      ]
      return {
        message: youngMessages[Math.floor(Math.random() * youngMessages.length)],
        emoji: '🎉🌟🏆',
        showAnimation: true,
        soundEffect: true,
      }

    case 'strategy_competition':
      const teenMessages = [
        'Level up! Keep climbing!',
        'New level unlocked!',
        'Level up! Nice work!',
        'You reached a new level!',
      ]
      return {
        message: teenMessages[Math.floor(Math.random() * teenMessages.length)],
        emoji: '⬆️✨',
        showAnimation: true,
        soundEffect: false,
      }

    case 'achievement_mastery':
      return {
        message: 'Level increased.',
        emoji: '',
        showAnimation: false,
        soundEffect: false,
      }

    default:
      return {
        message: 'Level up!',
        emoji: '✨',
        showAnimation: true,
        soundEffect: false,
      }
  }
}

/**
 * Get XP event feedback based on age group
 */
function getEventFeedback(
  amount: number,
  config: AgeGroupConfig,
  eventType: XPRewardType
): XPFeedback {
  switch (config.gamificationStyle) {
    case 'visual_rewards':
      return getYoungLearnerFeedback(amount, eventType)
    case 'strategy_competition':
      return getTeenFeedback(amount, eventType)
    case 'achievement_mastery':
      return getAdultFeedback(amount, eventType)
    default:
      return {
        message: `+${amount} XP`,
        emoji: '✨',
        showAnimation: true,
        soundEffect: false,
      }
  }
}

/**
 * Feedback for young learners (elementary)
 */
function getYoungLearnerFeedback(amount: number, eventType: XPRewardType): XPFeedback {
  const messages: Partial<Record<XPRewardType, string[]>> = {
    lesson_complete: [
      'You finished the lesson! So cool!',
      'Wow! You learned something new!',
      'Great job completing the lesson!',
      'You are a super learner!',
    ],
    lesson_perfect: [
      'PERFECT! You got everything right!',
      'Amazing! 100% correct!',
      'Super star! All correct!',
      'Incredible! Perfect score!',
    ],
    streak_maintained: [
      'You came back to learn! Awesome!',
      'Your streak is growing!',
      'Keep coming back! You are doing great!',
    ],
    practice_complete: [
      'Great practice! Keep it up!',
      'You practiced like a champion!',
      'Practice makes perfect! Good job!',
    ],
    first_lesson: [
      'Your first lesson! Welcome!',
      'You started your learning adventure!',
      'The first step is the most important!',
    ],
  }

  const eventMessages = messages[eventType] || ['Great job!']
  const message = eventMessages[Math.floor(Math.random() * eventMessages.length)]

  return {
    message: `${message} +${amount} XP`,
    emoji: '🌟⭐✨',
    showAnimation: true,
    soundEffect: true,
  }
}

/**
 * Feedback for teens (middle/high school)
 */
function getTeenFeedback(amount: number, eventType: XPRewardType): XPFeedback {
  const messages: Partial<Record<XPRewardType, string[]>> = {
    lesson_complete: ['Lesson complete!', 'Done!', 'Nice!'],
    lesson_perfect: ['Perfect score!', 'Flawless!', '100%!'],
    streak_maintained: ['Streak kept!', 'On fire!'],
    practice_complete: ['Practice done!', 'Good grind!'],
    mastery_achieved: ['Topic mastered!', 'Expert level reached!'],
  }

  const eventMessages = messages[eventType] || ['XP earned!']
  const message = eventMessages[Math.floor(Math.random() * eventMessages.length)]

  return {
    message: `${message} +${amount} XP`,
    emoji: '⚡',
    showAnimation: true,
    soundEffect: false,
  }
}

/**
 * Feedback for adults (university/professional)
 */
function getAdultFeedback(amount: number, eventType: XPRewardType): XPFeedback {
  const messages: Partial<Record<XPRewardType, string[]>> = {
    lesson_complete: ['Completed'],
    lesson_perfect: ['Perfect'],
    mastery_achieved: ['Mastered'],
    practice_complete: ['Practiced'],
    course_created: ['Created'],
  }

  const eventMessages = messages[eventType] || ['']
  const message = eventMessages[0]

  return {
    message: message ? `${message} +${amount}` : `+${amount}`,
    emoji: '',
    showAnimation: false,
    soundEffect: false,
  }
}

// ============================================
// STREAK IMPORTANCE BY AGE
// ============================================

/**
 * Get streak messaging based on age group
 *
 * @param streakDays - Current streak in days
 * @param educationLevel - User's education level
 * @returns Streak message and display options
 */
export function getStreakFeedback(
  streakDays: number,
  educationLevel: string
): {
  message: string
  showProminently: boolean
  emoji: string
} {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.streakImportance) {
    case 'high':
      // Young learners - make a big deal of streaks
      if (streakDays === 1) {
        return {
          message: 'You started a streak! Come back tomorrow!',
          showProminently: true,
          emoji: '🔥',
        }
      }
      if (streakDays < 7) {
        return {
          message: `${streakDays} days in a row! Amazing!`,
          showProminently: true,
          emoji: '🔥'.repeat(Math.min(streakDays, 5)),
        }
      }
      if (streakDays >= 7 && streakDays < 30) {
        return {
          message: `${streakDays} day streak! You are on fire!`,
          showProminently: true,
          emoji: '🔥🌟',
        }
      }
      return {
        message: `WOW! ${streakDays} day streak! Incredible!`,
        showProminently: true,
        emoji: '🔥👑',
      }

    case 'medium':
      // Teens - show streaks but less enthusiastically
      return {
        message: `${streakDays} day streak`,
        showProminently: streakDays >= 7,
        emoji: '🔥',
      }

    case 'low':
      // Adults - minimal streak emphasis
      return {
        message: `${streakDays}d`,
        showProminently: false,
        emoji: '',
      }

    default:
      return {
        message: `${streakDays} day streak`,
        showProminently: true,
        emoji: '🔥',
      }
  }
}

// ============================================
// LEADERBOARD VISIBILITY
// ============================================

/**
 * Check if leaderboard should be shown for this age group
 *
 * @param educationLevel - User's education level
 * @returns Whether to show leaderboard
 */
export function shouldShowLeaderboard(educationLevel: string): boolean {
  const config = getAgeGroupConfig(educationLevel)
  return config.showLeaderboard
}

/**
 * Get leaderboard display style for age group
 *
 * @param educationLevel - User's education level
 * @returns Leaderboard style configuration
 */
export function getLeaderboardStyle(educationLevel: string): {
  showRankings: boolean
  showUsernames: boolean
  competitiveLanguage: boolean
  maxVisible: number
} {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.gamificationStyle) {
    case 'visual_rewards':
      // Young learners - no competitive rankings
      return {
        showRankings: false,
        showUsernames: false,
        competitiveLanguage: false,
        maxVisible: 0,
      }

    case 'strategy_competition':
      // Teens - full competitive experience
      return {
        showRankings: true,
        showUsernames: true,
        competitiveLanguage: true,
        maxVisible: 10,
      }

    case 'achievement_mastery':
      // Adults - optional, focus on self
      return {
        showRankings: true,
        showUsernames: false,
        competitiveLanguage: false,
        maxVisible: 5,
      }

    default:
      return {
        showRankings: true,
        showUsernames: true,
        competitiveLanguage: false,
        maxVisible: 10,
      }
  }
}

// ============================================
// BADGE STYLING
// ============================================

/**
 * Get badge display style for age group
 *
 * @param educationLevel - User's education level
 * @returns Badge styling options
 */
export function getBadgeStyle(educationLevel: string): {
  style: 'colorful' | 'professional'
  showEmoji: boolean
  animateUnlock: boolean
  celebrationLevel: 'high' | 'moderate' | 'minimal'
} {
  const config = getAgeGroupConfig(educationLevel)

  switch (config.badgeStyle) {
    case 'colorful':
      return {
        style: 'colorful',
        showEmoji: true,
        animateUnlock: true,
        celebrationLevel:
          config.gamificationStyle === 'visual_rewards' ? 'high' : 'moderate',
      }

    case 'professional':
      return {
        style: 'professional',
        showEmoji: false,
        animateUnlock: config.gamificationStyle === 'strategy_competition',
        celebrationLevel:
          config.gamificationStyle === 'achievement_mastery' ? 'minimal' : 'moderate',
      }

    default:
      return {
        style: 'colorful',
        showEmoji: true,
        animateUnlock: true,
        celebrationLevel: 'moderate',
      }
  }
}
