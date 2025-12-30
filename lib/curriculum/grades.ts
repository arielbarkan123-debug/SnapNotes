/**
 * Grade Configurations by Study System
 *
 * Defines system-specific grades and subject level configurations.
 * Each education system has its own grade naming (IB: DP1/DP2, Bagrut: א-יב, etc.)
 */

import type {
  StudySystem,
  SystemGradeConfig,
  LevelConfig,
  GradeOption,
} from './types'

// =============================================================================
// Grade Configurations by System
// =============================================================================

export const SYSTEM_GRADES: Record<StudySystem, SystemGradeConfig> = {
  ib: {
    systemId: 'ib',
    systemName: 'International Baccalaureate',
    grades: [
      { id: 'pre-dp', label: 'Pre-DP', description: 'Pre-Diploma Programme (MYP Year 5)', order: 1 },
      { id: 'dp1', label: 'DP Year 1', description: 'Diploma Programme Year 1', order: 2 },
      { id: 'dp2', label: 'DP Year 2', description: 'Diploma Programme Year 2', order: 3 },
    ],
    defaultGrade: 'dp1',
  },

  israeli_bagrut: {
    systemId: 'israeli_bagrut',
    systemName: 'Israeli Bagrut',
    grades: [
      { id: 'א', label: "א'", labelLocalized: "כיתה א'", order: 1 },
      { id: 'ב', label: "ב'", labelLocalized: "כיתה ב'", order: 2 },
      { id: 'ג', label: "ג'", labelLocalized: "כיתה ג'", order: 3 },
      { id: 'ד', label: "ד'", labelLocalized: "כיתה ד'", order: 4 },
      { id: 'ה', label: "ה'", labelLocalized: "כיתה ה'", order: 5 },
      { id: 'ו', label: "ו'", labelLocalized: "כיתה ו'", order: 6 },
      { id: 'ז', label: "ז'", labelLocalized: "כיתה ז'", order: 7 },
      { id: 'ח', label: "ח'", labelLocalized: "כיתה ח'", order: 8 },
      { id: 'ט', label: "ט'", labelLocalized: "כיתה ט'", order: 9 },
      { id: 'י', label: "י'", labelLocalized: "כיתה י'", description: 'Grade 10', order: 10 },
      { id: 'יא', label: "יא'", labelLocalized: "כיתה יא'", description: 'Grade 11', order: 11 },
      { id: 'יב', label: "יב'", labelLocalized: "כיתה יב'", description: 'Grade 12', order: 12 },
    ],
    defaultGrade: 'י',
  },

  uk: {
    systemId: 'uk',
    systemName: 'UK A-Levels',
    grades: [
      { id: 'year12', label: 'Year 12', description: 'AS Level / Lower Sixth', order: 1 },
      { id: 'year13', label: 'Year 13', description: 'A2 Level / Upper Sixth', order: 2 },
    ],
    defaultGrade: 'year12',
  },

  ap: {
    systemId: 'ap',
    systemName: 'Advanced Placement',
    grades: [
      { id: 'grade9', label: 'Grade 9', description: 'Freshman', order: 1 },
      { id: 'grade10', label: 'Grade 10', description: 'Sophomore', order: 2 },
      { id: 'grade11', label: 'Grade 11', description: 'Junior', order: 3 },
      { id: 'grade12', label: 'Grade 12', description: 'Senior', order: 4 },
    ],
    defaultGrade: 'grade11',
  },

  us: {
    systemId: 'us',
    systemName: 'US Education',
    grades: [
      { id: 'grade9', label: 'Grade 9', description: 'Freshman', order: 1 },
      { id: 'grade10', label: 'Grade 10', description: 'Sophomore', order: 2 },
      { id: 'grade11', label: 'Grade 11', description: 'Junior', order: 3 },
      { id: 'grade12', label: 'Grade 12', description: 'Senior', order: 4 },
    ],
    defaultGrade: 'grade10',
  },

  general: {
    systemId: 'general',
    systemName: 'General Education',
    grades: [
      { id: 'elementary', label: 'Elementary School', description: 'Grades 1-5 (ages 6-11)', order: 1 },
      { id: 'middle_school', label: 'Middle School', description: 'Grades 6-8 (ages 11-14)', order: 2 },
      { id: 'high_school', label: 'High School', description: 'Grades 9-12 (ages 14-18)', order: 3 },
      { id: 'university', label: 'University', description: 'Undergraduate studies', order: 4 },
      { id: 'graduate', label: 'Graduate', description: "Master's or PhD studies", order: 5 },
      { id: 'professional', label: 'Professional', description: 'Work-related learning', order: 6 },
    ],
    defaultGrade: 'high_school',
  },

  other: {
    systemId: 'other',
    systemName: 'Other',
    grades: [
      { id: 'elementary', label: 'Elementary', order: 1 },
      { id: 'middle', label: 'Middle School', order: 2 },
      { id: 'high', label: 'High School', order: 3 },
      { id: 'university', label: 'University', order: 4 },
      { id: 'other', label: 'Other', order: 5 },
    ],
    defaultGrade: 'high',
  },
}

// =============================================================================
// Level Configurations by System
// =============================================================================

export const LEVEL_CONFIGS: Record<StudySystem, LevelConfig> = {
  ib: {
    systemId: 'ib',
    type: 'toggle',
    options: ['SL', 'HL'],
    defaultValue: 'SL',
    labels: {
      SL: 'Standard Level',
      HL: 'Higher Level',
    },
  },

  israeli_bagrut: {
    systemId: 'israeli_bagrut',
    type: 'select',
    options: ['3', '4', '5'],
    defaultValue: '5',
    labels: {
      '3': '3 יחידות',
      '4': '4 יחידות',
      '5': '5 יחידות',
    },
  },

  uk: {
    systemId: 'uk',
    type: 'none',
    options: [],
  },

  ap: {
    systemId: 'ap',
    type: 'none',
    options: [],
  },

  us: {
    systemId: 'us',
    type: 'none',
    options: [],
  },

  general: {
    systemId: 'general',
    type: 'none',
    options: [],
  },

  other: {
    systemId: 'other',
    type: 'none',
    options: [],
  },
}

// =============================================================================
// Curriculum Systems (systems that have structured curriculum data)
// =============================================================================

export const CURRICULUM_SYSTEMS: StudySystem[] = ['ib', 'ap', 'uk', 'israeli_bagrut']

// =============================================================================
// Helper Functions
// =============================================================================

/**
 * Get grade options for a specific study system
 */
export function getGradesForSystem(system: StudySystem): GradeOption[] {
  return SYSTEM_GRADES[system]?.grades || []
}

/**
 * Get the default grade for a study system
 */
export function getDefaultGrade(system: StudySystem): string | undefined {
  return SYSTEM_GRADES[system]?.defaultGrade
}

/**
 * Get level configuration for a study system
 */
export function getLevelConfig(system: StudySystem): LevelConfig {
  return LEVEL_CONFIGS[system] || { systemId: system, type: 'none', options: [] }
}

/**
 * Check if a study system has subject levels (SL/HL, units, etc.)
 */
export function hasSubjectLevels(system: StudySystem): boolean {
  const config = LEVEL_CONFIGS[system]
  return config?.type !== 'none' && config?.options.length > 0
}

/**
 * Get the default level for a study system
 */
export function getDefaultLevel(system: StudySystem): string | undefined {
  return LEVEL_CONFIGS[system]?.defaultValue
}

/**
 * Check if a system has curriculum data (subjects, etc.)
 */
export function hasCurriculumData(system: StudySystem): boolean {
  return CURRICULUM_SYSTEMS.includes(system)
}

/**
 * Get grade label (with localization support)
 */
export function getGradeLabel(system: StudySystem, gradeId: string): string {
  const grade = SYSTEM_GRADES[system]?.grades.find(g => g.id === gradeId)
  return grade?.labelLocalized || grade?.label || gradeId
}

/**
 * Get level label
 */
export function getLevelLabel(system: StudySystem, level: string): string {
  const config = LEVEL_CONFIGS[system]
  return config?.labels?.[level] || level
}
