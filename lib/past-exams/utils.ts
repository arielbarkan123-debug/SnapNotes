/**
 * Past Exams — Client-safe utility functions
 * These can be imported from client components without pulling in server-only deps.
 */

/**
 * Convert subject ID to display label
 * e.g., "biology-hl" → "Biology HL", "math-5" → "Math 5"
 */
export function formatSubjectLabel(subjectId: string): string {
  return subjectId
    .split('-')
    .map((part) => {
      // Keep HL/SL uppercase
      if (part.match(/^(hl|sl)$/i)) return part.toUpperCase()
      // Numbers as-is
      if (/^\d+$/.test(part)) return part
      // Capitalize first letter of every word
      return part.charAt(0).toUpperCase() + part.slice(1)
    })
    .join(' ')
}
