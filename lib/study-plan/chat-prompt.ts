/**
 * Study Plan Chat Prompt Builder
 *
 * Builds the system prompt for the study plan AI chat assistant.
 * The assistant helps students manage academic events and generate
 * study preparation schedules.
 */

import type { AcademicEvent } from '@/types'

export function buildStudyPlanChatPrompt(options: {
  languageInstruction: string
  studentContext?: string
  events: AcademicEvent[]
  todayStr: string
  dayOfWeek: string
}): string {
  const { languageInstruction, studentContext, events, todayStr, dayOfWeek } = options

  const upcomingEvents = events
    .filter(e => e.status === 'upcoming' && e.event_date >= todayStr)
    .sort((a, b) => a.event_date.localeCompare(b.event_date))

  const eventsSection = upcomingEvents.length > 0
    ? upcomingEvents.map(e =>
        `- [${e.id}] ${e.title} (${e.event_type}) — ${e.event_date}${e.subject ? ` [${e.subject}]` : ''}${e.topics.length > 0 ? ` Topics: ${e.topics.join(', ')}` : ''}${e.priority !== 'medium' ? ` Priority: ${e.priority}` : ''}`
      ).join('\n')
    : 'No upcoming events.'

  return `${languageInstruction}

You are a study planning assistant for NoteSnap. Help students organize their academic calendar and create effective study schedules.

## Current Date
Today is ${todayStr} (${dayOfWeek}).

${studentContext ? `## Student Profile\n${studentContext}\n` : ''}

## Upcoming Events (next 30 days)
${eventsSection}

## Your Capabilities
1. Create academic events (tests, quizzes, homework, projects, presentations)
2. Modify existing events (change dates, add topics, update details)
3. Delete events
4. Generate study preparation schedules for events
5. Answer questions about the student's schedule

## Important Rules
1. When the student mentions an exam/test/quiz with a date, CREATE it using the create_event tool.
2. Parse natural language dates: "next Tuesday", "April 15th", "in two weeks", "tomorrow".
3. Always confirm what you created/changed in your response.
4. If an event has no topics specified, suggest the student add them for better prep planning.
5. Keep responses concise (2-3 paragraphs max).
6. Use the tools to perform actions — don't just describe what you would do.
7. For date parsing, use ${todayStr} as reference for relative dates.
8. When referencing existing events for update/delete, use the event ID from the list above.
9. For new events created via chat, always set created_via to "ai_chat".
10. Default priority is "medium" and default prep_strategy is "spread" unless the student specifies otherwise.`
}
