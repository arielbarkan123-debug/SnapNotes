import type Anthropic from '@anthropic-ai/sdk'
import { z } from 'zod'

const LearningObjectiveSchema = z.object({
  id: z.string(),
  objective: z.string(),
  bloomLevel: z.enum(['remember', 'understand', 'apply', 'analyze', 'evaluate', 'create']),
  actionVerb: z.string(),
})

const LessonOutlineSchema = z.object({
  index: z.number(),
  title: z.string(),
  description: z.string(),
  estimatedSteps: z.number(),
  topics: z.array(z.string()),
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

const LessonSchema = z.object({
  title: z.string(),
  steps: z.array(StepSchema),
})

export const InitialCourseOutputSchema = z.object({
  title: z.string().min(1),
  overview: z.string().min(1),
  documentSummary: z.string().min(1),
  learningObjectives: z.array(LearningObjectiveSchema).optional(),
  lessonOutline: z.array(LessonOutlineSchema).min(1),
  lessons: z.array(LessonSchema).min(1).max(2),
})

export type InitialCourseToolOutput = z.infer<typeof InitialCourseOutputSchema>

export const INITIAL_COURSE_TOOL: Anthropic.Tool = {
  name: 'emit_course_structure',
  description: 'Emit the complete initial course structure with outline and first 2 lessons.',
  input_schema: {
    type: 'object' as const,
    properties: {
      title: { type: 'string' },
      overview: { type: 'string' },
      documentSummary: {
        type: 'string',
        description: '400-600 word summary of the entire document for continuation generation',
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
      lessonOutline: {
        type: 'array',
        description: 'ALL planned lessons — not just the first 2',
        items: {
          type: 'object',
          properties: {
            index: { type: 'number' },
            title: { type: 'string' },
            description: { type: 'string' },
            estimatedSteps: { type: 'number' },
            topics: { type: 'array', items: { type: 'string' } },
          },
          required: ['index', 'title', 'description', 'estimatedSteps', 'topics'],
        },
        minItems: 1,
      },
      lessons: {
        type: 'array',
        description: 'ONLY the first 2 lessons with full step content',
        items: {
          type: 'object',
          properties: {
            title: { type: 'string' },
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
          },
          required: ['title', 'steps'],
        },
        minItems: 1,
        maxItems: 2,
      },
    },
    required: ['title', 'overview', 'documentSummary', 'lessonOutline', 'lessons'],
  },
}
