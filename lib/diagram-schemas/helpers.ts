import type { DiagramSchema } from './types'

/**
 * Generate a prompt listing diagram schemas, optionally filtered by subject.
 */
export function getDiagramSchemaPrompt(
  allSchemas: Record<string, DiagramSchema>,
  subject?: string
): string {
  const filtered = Object.values(allSchemas).filter(
    (s) => !subject || s.subject === subject
  )

  if (filtered.length === 0) return ''

  return filtered
    .map(
      (s) =>
        `### Diagram Schema: ${s.type}\n${s.description}\nGrades: ${s.gradeRange}\nExample: ${s.jsonExample}`
    )
    .join('\n\n')
}

/**
 * Check if a grade falls within a gradeRange string like "3-8" or "8".
 */
function gradeInRange(grade: number, gradeRange: string): boolean {
  const parts = gradeRange.split('-').map(Number)
  if (parts.length === 1) {
    return grade === parts[0]
  }
  return grade >= parts[0] && grade <= parts[1]
}

/**
 * Generate a context-aware diagram schema prompt filtered by subject and grade.
 * Falls back to a compact type-name-only summary if no subject is provided.
 */
export function getFilteredDiagramSchemaPrompt(
  allSchemas: Record<string, DiagramSchema>,
  subject?: string,
  grade?: number
): string {
  if (!subject) {
    const typesBySubject: Record<string, string[]> = {}
    for (const schema of Object.values(allSchemas)) {
      if (!typesBySubject[schema.subject]) {
        typesBySubject[schema.subject] = []
      }
      typesBySubject[schema.subject].push(schema.type)
    }
    return Object.entries(typesBySubject)
      .map(([subj, types]) => `${subj}: ${types.join(', ')}`)
      .join('\n')
  }

  let filtered = Object.values(allSchemas).filter(
    (s) => s.subject === subject
  )

  if (grade !== undefined && grade > 0) {
    const gradeFiltered = filtered.filter((s) => gradeInRange(grade, s.gradeRange))
    if (gradeFiltered.length > 0) {
      filtered = gradeFiltered
    }
  }

  if (filtered.length === 0) return ''

  return filtered
    .map(
      (s) =>
        `### ${s.type}\n${s.description}\nGrades: ${s.gradeRange}\nExample: ${s.jsonExample}`
    )
    .join('\n\n')
}
