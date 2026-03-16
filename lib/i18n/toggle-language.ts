/**
 * Shared language toggle utility (client-side only).
 * Sets cookies and fire-and-forget syncs to the DB.
 */
export function toggleLanguage(newLocale: 'en' | 'he') {
  // 1. Set NEXT_LOCALE cookie (used by next-intl middleware)
  document.cookie = `NEXT_LOCALE=${newLocale};path=/;max-age=31536000;samesite=lax`

  // 2. Mark that the user explicitly chose a language
  document.cookie = 'LANG_EXPLICIT=1;path=/;max-age=31536000;samesite=lax'

  // 3. Fire-and-forget DB sync — no await, suppress errors
  fetch('/api/user/language', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ language: newLocale }),
  }).catch(() => {})
}
