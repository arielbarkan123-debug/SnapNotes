/**
 * Mock Course Data for Testing
 */

import type { Course, GeneratedCourse } from '@/types'

/**
 * Mock generated course content
 */
export const mockGeneratedCourse: GeneratedCourse = {
  title: 'Cell Biology Fundamentals',
  overview: 'This course covers the fundamental concepts of cell biology, including cell structure, organelles, and cellular processes.',
  lessons: [
    {
      title: 'Introduction to Cells',
      steps: [
        {
          type: 'explanation',
          content: 'Cells are the basic structural and functional units of all living organisms. They are often called the "building blocks of life."',
        },
        {
          type: 'key_point',
          content: 'All living organisms are made of one or more cells.',
        },
        {
          type: 'question',
          content: 'What is the basic unit of life?',
          options: ['Cell', 'Atom', 'Molecule', 'Tissue'],
          correct_answer: 0,
          explanation: 'The cell is considered the basic unit of life because it is the smallest unit that can carry out all life processes.',
        },
        {
          type: 'explanation',
          content: 'Cells come in two main types: prokaryotic (without a nucleus) and eukaryotic (with a nucleus).',
        },
        {
          type: 'question',
          content: 'Which type of cell has a nucleus?',
          options: ['Prokaryotic', 'Eukaryotic', 'Both', 'Neither'],
          correct_answer: 1,
          explanation: 'Eukaryotic cells have a true nucleus enclosed by a nuclear membrane.',
        },
      ],
    },
    {
      title: 'Cell Organelles',
      steps: [
        {
          type: 'explanation',
          content: 'Organelles are specialized structures within cells that perform specific functions.',
        },
        {
          type: 'key_point',
          content: 'The mitochondria is known as the "powerhouse of the cell" because it produces ATP.',
        },
        {
          type: 'question',
          content: 'Which organelle is responsible for protein synthesis?',
          options: ['Mitochondria', 'Ribosome', 'Golgi apparatus', 'Lysosome'],
          correct_answer: 1,
          explanation: 'Ribosomes are the sites of protein synthesis in all cells.',
        },
        {
          type: 'diagram',
          title: 'Animal Cell Structure',
          content: 'A typical animal cell contains various organelles including the nucleus, mitochondria, endoplasmic reticulum, and Golgi apparatus.',
        },
      ],
    },
    {
      title: 'Cell Membrane',
      steps: [
        {
          type: 'explanation',
          content: 'The cell membrane is a selectively permeable barrier that surrounds all cells.',
        },
        {
          type: 'key_point',
          content: 'The fluid mosaic model describes the cell membrane as a dynamic structure with proteins floating in a lipid bilayer.',
        },
        {
          type: 'question',
          content: 'What is the main component of the cell membrane?',
          options: ['Proteins', 'Carbohydrates', 'Phospholipids', 'Nucleic acids'],
          correct_answer: 2,
          explanation: 'Phospholipids form the basic structure of the cell membrane bilayer.',
        },
      ],
    },
  ],
}

/**
 * Mock course database record
 */
export const mockCourseFromDB: Course = {
  id: 'course-123',
  user_id: 'user-123',
  title: 'Cell Biology Fundamentals',
  source_type: 'image',
  original_image_url: 'https://example.com/image.jpg',
  extracted_content: 'Sample extracted content from the notes.',
  generated_course: mockGeneratedCourse,
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

/**
 * Mock course with visual content in title (for image question detection)
 */
export const mockVisualCourse: Course = {
  id: 'course-visual-456',
  user_id: 'user-123',
  title: 'Human Anatomy: Heart Diagrams and Structure',
  source_type: 'image',
  original_image_url: 'https://example.com/heart-diagram.jpg',
  extracted_content: 'Extracted content about heart anatomy.',
  generated_course: {
    ...mockGeneratedCourse,
    title: 'Human Anatomy: Heart Diagrams and Structure',
    lessons: [
      {
        title: 'Heart Structure',
        steps: [
          {
            type: 'diagram',
            title: 'Heart Anatomy Diagram',
            content: 'The human heart has four chambers: two atria and two ventricles.',
          },
          {
            type: 'question',
            content: 'How many chambers does the human heart have?',
            options: ['Two', 'Three', 'Four', 'Five'],
            correct_answer: 2,
            explanation: 'The heart has four chambers: left and right atria, and left and right ventricles.',
          },
        ],
      },
    ],
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

/**
 * Mock course in Hebrew
 */
export const mockHebrewCourse: Course = {
  id: 'course-hebrew-789',
  user_id: 'user-456',
  title: 'ביולוגיה של התא',
  source_type: 'text',
  original_image_url: null,
  extracted_content: 'תאים הם יחידות המבנה והתפקוד הבסיסיות של כל היצורים החיים.',
  generated_course: {
    title: 'ביולוגיה של התא',
    overview: 'קורס זה מכסה את מבנה התא ותפקודיו.',
    lessons: [
      {
        title: 'מבוא לתאים',
        steps: [
          {
            type: 'explanation',
            content: 'תאים הם יחידות המבנה והתפקוד הבסיסיות של כל היצורים החיים.',
          },
        ],
      },
    ],
  },
  created_at: '2024-01-15T10:00:00Z',
  updated_at: '2024-01-15T10:00:00Z',
}

/**
 * Helper to get mock course by scenario
 */
export function getMockCourse(scenario: 'default' | 'visual' | 'hebrew'): Course {
  switch (scenario) {
    case 'visual':
      return mockVisualCourse
    case 'hebrew':
      return mockHebrewCourse
    default:
      return mockCourseFromDB
  }
}
