/**
 * One-time migration of localStorage keys from old "notesnap" prefix to "xplus1".
 * Runs on app mount. Safe to remove after a few months when all active users have migrated.
 */

const MIGRATION_FLAG = 'xplus1_storage_migrated'

const EXACT_KEYS = [
  ['notesnap_welcome_dismissed', 'xplus1_welcome_dismissed'],
  ['notesnap_explanation_style', 'xplus1_explanation_style'],
  ['notesnap_visual_preferences', 'xplus1_visual_preferences'],
  ['notesnap_practice_session', 'xplus1_practice_session'],
  ['notesnap_onboarding_state', 'xplus1_onboarding_state'],
  ['notesnap_analytics_session', 'xplus1_analytics_session'],
  ['notesnap_analytics_session_timeout', 'xplus1_analytics_session_timeout'],
  ['notesnap-recent-searches', 'xplus1-recent-searches'],
] as const

const PREFIX_MIGRATIONS = [
  ['notesnap_exam_answers_', 'xplus1_exam_answers_'],
  ['notesnap_exam_marked_', 'xplus1_exam_marked_'],
  ['notesnap_practice_state_', 'xplus1_practice_state_'],
  ['notesnap_chat_draft_', 'xplus1_chat_draft_'],
  ['notesnap-dismissed-insight-', 'xplus1-dismissed-insight-'],
] as const

export function migrateLocalStorage() {
  if (typeof window === 'undefined') return
  if (localStorage.getItem(MIGRATION_FLAG)) return

  // Migrate exact-match keys
  for (const [oldKey, newKey] of EXACT_KEYS) {
    const value = localStorage.getItem(oldKey)
    if (value && !localStorage.getItem(newKey)) {
      localStorage.setItem(newKey, value)
      localStorage.removeItem(oldKey)
    }
  }

  // Migrate prefixed keys
  const allKeys = Object.keys(localStorage)
  for (const [oldPrefix, newPrefix] of PREFIX_MIGRATIONS) {
    for (const key of allKeys) {
      if (key.startsWith(oldPrefix)) {
        const newKey = newPrefix + key.slice(oldPrefix.length)
        const value = localStorage.getItem(key)
        if (value && !localStorage.getItem(newKey)) {
          localStorage.setItem(newKey, value)
          localStorage.removeItem(key)
        }
      }
    }
  }

  localStorage.setItem(MIGRATION_FLAG, '1')
}
