/**
 * Format a share text string for practice results.
 */
export function formatShareText(accuracy: number, courseName?: string): string {
  const base = `I scored ${accuracy}% on NoteSnap practice!`
  if (courseName) {
    return `${base} (${courseName})`
  }
  return base
}
