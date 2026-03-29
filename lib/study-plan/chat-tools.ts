/**
 * Study Plan Chat Tool Definitions
 *
 * Defines the Claude tool_use tool specifications for the study plan
 * AI chat assistant. These tools allow the AI to create, update, and
 * delete academic events and generate preparation schedules.
 */

import type Anthropic from '@anthropic-ai/sdk'

export const STUDY_PLAN_CHAT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'create_event',
    description:
      'Create a new academic event on the student calendar. Use when the student mentions an upcoming test, quiz, homework, project, or presentation.',
    input_schema: {
      type: 'object' as const,
      properties: {
        title: {
          type: 'string',
          description: 'Event title (e.g., "Biology Final Exam")',
        },
        event_type: {
          type: 'string',
          enum: ['test', 'quiz', 'homework', 'project', 'presentation', 'other'],
          description: 'Type of academic event',
        },
        event_date: {
          type: 'string',
          description: 'Event date in YYYY-MM-DD format',
        },
        event_time: {
          type: 'string',
          description: 'Optional event time in HH:MM format',
        },
        subject: {
          type: 'string',
          description: 'Subject name (e.g., "Biology", "Mathematics")',
        },
        description: {
          type: 'string',
          description: 'Optional description or notes',
        },
        topics: {
          type: 'array',
          items: { type: 'string' },
          description: 'Topics covered (e.g., ["Chapter 5", "Photosynthesis"])',
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
          description: 'Priority level',
        },
        prep_strategy: {
          type: 'string',
          enum: ['cram', 'spread'],
          description: 'Study preparation strategy',
        },
        prep_days: {
          type: 'number',
          description: 'Number of days to spread preparation across',
        },
      },
      required: ['title', 'event_type', 'event_date'],
    },
  },
  {
    name: 'update_event',
    description:
      'Modify an existing academic event. Use when the student wants to change event details, reschedule, or add information.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The UUID of the event to update',
        },
        title: { type: 'string' },
        event_type: {
          type: 'string',
          enum: ['test', 'quiz', 'homework', 'project', 'presentation', 'other'],
        },
        event_date: {
          type: 'string',
          description: 'New date in YYYY-MM-DD format',
        },
        event_time: { type: 'string' },
        subject: { type: 'string' },
        description: { type: 'string' },
        topics: {
          type: 'array',
          items: { type: 'string' },
        },
        priority: {
          type: 'string',
          enum: ['low', 'medium', 'high'],
        },
        prep_strategy: {
          type: 'string',
          enum: ['cram', 'spread'],
        },
        prep_days: { type: 'number' },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'delete_event',
    description:
      'Remove an academic event from the calendar. Use when the student says an event was cancelled or wants to remove it.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The UUID of the event to delete',
        },
      },
      required: ['event_id'],
    },
  },
  {
    name: 'generate_prep_schedule',
    description:
      'Generate a study preparation schedule for an upcoming event. Creates study tasks distributed across days before the event.',
    input_schema: {
      type: 'object' as const,
      properties: {
        event_id: {
          type: 'string',
          description: 'The UUID of the event to generate prep for',
        },
        strategy: {
          type: 'string',
          enum: ['cram', 'spread'],
          description: 'Preparation strategy',
        },
        days: {
          type: 'number',
          description: 'Number of days to spread preparation (for spread strategy)',
        },
      },
      required: ['event_id', 'strategy'],
    },
  },
]
