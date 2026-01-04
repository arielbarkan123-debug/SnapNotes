/**
 * Mock Past Exam Templates for Testing
 * Tests exam style guide generation and integration
 */

import type { ExamAnalysis, PastExamTemplate, QuestionTypeKey } from '@/types/past-exam'

/**
 * Complete mock ExamAnalysis object
 * Represents a typical IB Biology paper analysis
 */
export const mockExamAnalysis: ExamAnalysis = {
  total_questions: 25,
  total_points: 100,
  time_estimate_minutes: 90,

  question_types: {
    multiple_choice: { count: 15, percentage: 60, avg_points: 2 },
    short_answer: { count: 5, percentage: 20, avg_points: 4 },
    essay: { count: 5, percentage: 20, avg_points: 8 },
  },

  difficulty_distribution: {
    easy: 30,
    medium: 50,
    hard: 20,
  },

  point_distribution: {
    min_points: 1,
    max_points: 10,
    avg_points: 4,
    common_values: [1, 2, 4, 8],
  },

  structure_patterns: {
    has_sections: true,
    section_count: 3,
    sections: [
      { name: 'Section A', question_count: 15, points: 30 },
      { name: 'Section B', question_count: 5, points: 20 },
      { name: 'Section C', question_count: 5, points: 50 },
    ],
    has_instructions: true,
    instruction_style: 'Answer ALL questions in Section A. Answer TWO questions from Section B.',
  },

  grading_patterns: {
    partial_credit_allowed: true,
    rubric_style: 'points',
    common_point_values: [1, 2, 4, 8],
    bonus_questions: false,
  },

  question_style: {
    avg_question_length_words: 25,
    uses_scenarios: true,
    uses_diagrams: true,
    uses_calculations: false,
    command_terms: ['Define', 'Explain', 'Compare', 'Evaluate', 'Outline', 'Describe'],
    bloom_levels: {
      remember: 20,
      understand: 30,
      apply: 25,
      analyze: 15,
      evaluate: 8,
      create: 2,
    },
  },

  sample_questions: [
    {
      type: 'multiple_choice',
      text: 'Which organelle is responsible for protein synthesis?',
      points: 2,
      difficulty: 'easy',
    },
    {
      type: 'short_answer',
      text: 'Explain the process of osmosis in plant cells.',
      points: 4,
      difficulty: 'medium',
    },
    {
      type: 'essay',
      text: 'Evaluate the importance of biodiversity in ecosystem stability.',
      points: 8,
      difficulty: 'hard',
    },
  ],

  image_analysis: {
    has_diagrams: true,
    diagram_count: 3,
    diagram_types: ['cell_diagram', 'anatomy'],
    diagram_topics: ['cell structure', 'human heart', 'plant leaf cross-section'],
    labeling_style: 'fill_blank',
    typical_label_count: 5,
    requires_labeling: true,
    suggested_image_queries: ['cell diagram labeled', 'heart anatomy diagram'],
  },
}

/**
 * Second mock analysis (essay-focused exam)
 */
export const mockEssayExamAnalysis: ExamAnalysis = {
  total_questions: 10,
  total_points: 100,
  time_estimate_minutes: 120,

  question_types: {
    essay: { count: 10, percentage: 100, avg_points: 10 },
  },

  difficulty_distribution: {
    easy: 10,
    medium: 40,
    hard: 50,
  },

  point_distribution: {
    min_points: 8,
    max_points: 15,
    avg_points: 10,
    common_values: [8, 10, 12, 15],
  },

  structure_patterns: {
    has_sections: false,
    section_count: 1,
    sections: [],
    has_instructions: true,
    instruction_style: 'Answer any FIVE questions.',
  },

  grading_patterns: {
    partial_credit_allowed: true,
    rubric_style: 'descriptive',
    common_point_values: [8, 10, 12, 15],
    bonus_questions: false,
  },

  question_style: {
    avg_question_length_words: 40,
    uses_scenarios: true,
    uses_diagrams: false,
    uses_calculations: false,
    command_terms: ['Discuss', 'Analyze', 'Evaluate', 'Compare and contrast'],
    bloom_levels: {
      remember: 5,
      understand: 15,
      apply: 20,
      analyze: 30,
      evaluate: 25,
      create: 5,
    },
  },

  sample_questions: [],
}

/**
 * Mock analysis with NO images/diagrams
 */
export const mockNoImagesAnalysis: ExamAnalysis = {
  ...mockExamAnalysis,
  question_style: {
    ...mockExamAnalysis.question_style,
    uses_diagrams: false,
  },
  image_analysis: {
    has_diagrams: false,
    diagram_count: 0,
    diagram_types: [],
    diagram_topics: [],
    labeling_style: null,
    typical_label_count: 0,
    requires_labeling: false,
    suggested_image_queries: [],
  },
}

/**
 * Mock analysis with high easy difficulty (70% easy)
 */
export const mockHighEasyAnalysis: ExamAnalysis = {
  ...mockExamAnalysis,
  difficulty_distribution: {
    easy: 70,
    medium: 20,
    hard: 10,
  },
}

/**
 * Past Exam Templates (as returned from database)
 */
export const mockPastExamTemplates: Partial<PastExamTemplate>[] = [
  {
    id: 'template-1',
    user_id: 'user-123',
    title: 'IB Biology Paper 1 2023',
    description: 'Multiple choice and short answer',
    file_type: 'pdf',
    analysis_status: 'completed',
    extracted_analysis: mockExamAnalysis,
  },
  {
    id: 'template-2',
    user_id: 'user-123',
    title: 'IB Biology Paper 2 2023',
    description: 'Essay questions',
    file_type: 'pdf',
    analysis_status: 'completed',
    extracted_analysis: mockEssayExamAnalysis,
  },
]

/**
 * Single template (for simpler tests)
 */
export const mockSingleTemplate: Partial<PastExamTemplate>[] = [
  {
    id: 'template-single',
    user_id: 'user-123',
    title: 'Sample Exam',
    analysis_status: 'completed',
    extracted_analysis: mockExamAnalysis,
  },
]

/**
 * Templates with NO images
 */
export const mockTemplatesNoImages: Partial<PastExamTemplate>[] = [
  {
    id: 'template-no-images',
    user_id: 'user-123',
    title: 'Text-Only Exam',
    analysis_status: 'completed',
    extracted_analysis: mockNoImagesAnalysis,
  },
]

/**
 * Templates with high easy difficulty
 */
export const mockTemplatesHighEasy: Partial<PastExamTemplate>[] = [
  {
    id: 'template-easy',
    user_id: 'user-123',
    title: 'Easy Exam',
    analysis_status: 'completed',
    extracted_analysis: mockHighEasyAnalysis,
  },
]

/**
 * Empty templates array
 */
export const emptyPastExamTemplates: Partial<PastExamTemplate>[] = []

/**
 * Templates with pending analysis (should be filtered out)
 */
export const mockPendingTemplates: Partial<PastExamTemplate>[] = [
  {
    id: 'template-pending',
    user_id: 'user-123',
    title: 'Pending Analysis Exam',
    analysis_status: 'pending',
    extracted_analysis: null,
  },
]

/**
 * Helper to get templates by scenario
 */
export function getMockTemplates(
  scenario: 'complete' | 'single' | 'empty' | 'noImages' | 'highEasy' | 'pending'
): Partial<PastExamTemplate>[] {
  switch (scenario) {
    case 'complete':
      return mockPastExamTemplates
    case 'single':
      return mockSingleTemplate
    case 'empty':
      return emptyPastExamTemplates
    case 'noImages':
      return mockTemplatesNoImages
    case 'highEasy':
      return mockTemplatesHighEasy
    case 'pending':
      return mockPendingTemplates
    default:
      return emptyPastExamTemplates
  }
}
