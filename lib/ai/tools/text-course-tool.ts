import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const LearningObjectiveSchema = z.object({
  id: z.string(),
  objective: z.string(),
  bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
  actionVerb: z.string(),
})

const StepSchema = z.object({
  type: z.enum([
    'explanation', 'key_point', 'question', 'formula',
    'example', 'summary', 'worked_example', 'practice_problem',
  ]),
  content: z.string(),
  title: z.string().optional(),
  options: z.array(z.string()).optional(),
  correctIndex: z.number().optional(),
  explanation: z.string().optional(),
})

const FormulaSchema = z.object({
  formula: z.string(),
  explanation: z.string(),
})

const SectionSchema = z.object({
  title: z.string(),
  originalNotes: z.string().optional(),
  steps: z.array(StepSchema),
  formulas: z.array(FormulaSchema).optional(),
})

export const TextCourseOutputSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  learningObjectives: z.array(LearningObjectiveSchema).optional(),
  keyConcepts: z.array(z.string()).optional(),
  sections: z.array(SectionSchema).min(1),
  connections: z.string().optional(),
  summary: z.string().optional(),
  furtherStudy: z.array(z.string()).optional(),
})

export type TextCourseToolOutput = z.infer<typeof TextCourseOutputSchema>

export const TEXT_COURSE_TOOL: Anthropic.Tool = {
  name: 'emit_text_course',
  description: 'Emit the complete structured text course with all sections and steps.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string', description: 'Clear, descriptive course title' },
      overview: {
        type: 'string',
        description: '2-3 paragraph overview: what this course covers, why it matters, what the student will learn',
      },
      learningObjectives: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            objective: { type: 'string' },
            bloomLevel: {
              type: 'string',
              enum: ['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create'],
            },
            actionVerb: { type: 'string' },
          },
          required: ['id', 'objective', 'bloomLevel', 'actionVerb'],
        },
      },
      keyConcepts: {
        type: 'array',
        items: { type: 'string' },
        description: '5-10 key terms or concepts students should know',
      },
      sections: {
        type: 'array',
        description: 'One section per major topic — each section is one full lesson',
        minItems: 1,
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
            originalNotes: {
              type: 'string',
              description: 'The portion of the user input this section is based on',
            },
            steps: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  type: {
                    type: 'string',
                    enum: [
                      'explanation', 'key_point', 'question', 'formula',
                      'example', 'summary', 'worked_example', 'practice_problem',
                    ],
                  },
                  content: { type: 'string' },
                  title: { type: 'string' },
                  options: { type: 'array', items: { type: 'string' } },
                  correctIndex: { type: 'number' },
                  explanation: { type: 'string' },
                },
                required: ['type', 'content'],
              },
            },
            formulas: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  formula: { type: 'string' },
                  explanation: { type: 'string' },
                },
                required: ['formula', 'explanation'],
              },
            },
          },
          required: ['title', 'steps'],
        },
      },
      connections: {
        type: 'string',
        description: 'A paragraph explaining how the different sections/concepts connect',
      },
      summary: { type: 'string', description: 'Concise 1-2 paragraph summary of the entire course' },
      furtherStudy: {
        type: 'array',
        items: { type: 'string' },
        description: '2-4 suggested topics or resources for deeper learning',
      },
    },
    required: ['title', 'overview', 'sections'],
  },
}
