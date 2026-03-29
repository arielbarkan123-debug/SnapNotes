// ============================================
// STUDY PLAN V2: ACADEMIC EVENTS & CHAT
// Types for the calendar-based study planning system
// ============================================

// Event types
export type AcademicEventType = 'test' | 'quiz' | 'homework' | 'project' | 'presentation' | 'other'
export type EventPriority = 'low' | 'medium' | 'high'
export type PrepStrategy = 'cram' | 'spread' | 'custom'
export type EventStatus = 'upcoming' | 'completed' | 'cancelled'
export type CalendarView = 'month' | 'week'

export interface EventMaterial {
  type: 'link' | 'file' | 'note'
  url?: string
  title: string
  courseId?: string
}

export interface AcademicEvent {
  id: string
  user_id: string
  title: string
  event_type: AcademicEventType
  event_date: string  // YYYY-MM-DD
  event_time?: string | null
  subject?: string | null
  course_id?: string | null
  description?: string | null
  topics: string[]
  materials: EventMaterial[]
  priority: EventPriority
  prep_strategy: PrepStrategy
  prep_days: number
  color?: string | null
  status: EventStatus
  created_via: 'manual' | 'ai_chat'
  created_at: string
  updated_at: string
}

export interface AcademicEventInsert {
  title: string
  event_type: AcademicEventType
  event_date: string
  event_time?: string
  subject?: string
  course_id?: string
  description?: string
  topics?: string[]
  materials?: EventMaterial[]
  priority?: EventPriority
  prep_strategy?: PrepStrategy
  prep_days?: number
  color?: string
  status?: EventStatus
  created_via?: 'manual' | 'ai_chat'
}

export interface AcademicEventUpdate {
  title?: string
  event_type?: AcademicEventType
  event_date?: string
  event_time?: string | null
  subject?: string | null
  course_id?: string | null
  description?: string | null
  topics?: string[]
  materials?: EventMaterial[]
  priority?: EventPriority
  prep_strategy?: PrepStrategy
  prep_days?: number
  color?: string | null
  status?: EventStatus
}

// Calendar types
export interface CalendarDay {
  date: string
  events: AcademicEvent[]
  isToday: boolean
  isCurrentMonth: boolean
  isPast: boolean
}

// Chat types
export interface StudyPlanChatMessage {
  id: string
  user_id: string
  role: 'user' | 'assistant'
  content: string
  metadata: ChatMessageMetadata
  created_at: string
}

export interface ChatMessageMetadata {
  actions?: ChatAction[]
  thinking?: string
}

export type ChatAction =
  | CreateEventAction
  | UpdateEventAction
  | DeleteEventAction
  | GeneratePrepScheduleAction

export interface CreateEventAction {
  type: 'create_event'
  event: AcademicEventInsert
  status: 'pending' | 'applied' | 'rejected'
  resultId?: string
}

export interface UpdateEventAction {
  type: 'update_event'
  eventId: string
  updates: AcademicEventUpdate
  status: 'pending' | 'applied' | 'rejected'
}

export interface DeleteEventAction {
  type: 'delete_event'
  eventId: string
  status: 'pending' | 'applied' | 'rejected'
}

export interface GeneratePrepScheduleAction {
  type: 'generate_prep_schedule'
  eventId: string
  strategy: PrepStrategy
  days: number
  status: 'pending' | 'applied' | 'rejected'
}

// Color map for event types
export const EVENT_TYPE_COLORS: Record<AcademicEventType, { bg: string; text: string; border: string; dot: string }> = {
  test:         { bg: 'bg-red-100 dark:bg-red-900/30',     text: 'text-red-700 dark:text-red-300',     border: 'border-red-300 dark:border-red-700',     dot: 'bg-red-500' },
  quiz:         { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-300 dark:border-orange-700', dot: 'bg-orange-500' },
  homework:     { bg: 'bg-blue-100 dark:bg-blue-900/30',    text: 'text-blue-700 dark:text-blue-300',    border: 'border-blue-300 dark:border-blue-700',    dot: 'bg-blue-500' },
  project:      { bg: 'bg-green-100 dark:bg-green-900/30',  text: 'text-green-700 dark:text-green-300',  border: 'border-green-300 dark:border-green-700',  dot: 'bg-green-500' },
  presentation: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-300 dark:border-purple-700', dot: 'bg-purple-500' },
  other:        { bg: 'bg-gray-100 dark:bg-gray-900/30',    text: 'text-gray-700 dark:text-gray-300',    border: 'border-gray-300 dark:border-gray-700',    dot: 'bg-gray-500' },
}

// Event type icons (emoji)
export const EVENT_TYPE_ICONS: Record<AcademicEventType, string> = {
  test: '\u{1F4DD}',
  quiz: '\u{2753}',
  homework: '\u{1F4DA}',
  project: '\u{1F3AF}',
  presentation: '\u{1F3A4}',
  other: '\u{1F4CC}',
}
