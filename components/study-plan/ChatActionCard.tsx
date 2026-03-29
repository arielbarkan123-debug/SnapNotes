'use client'

import type { ChatAction, CreateEventAction } from '@/types'

interface ChatActionCardProps {
  action: ChatAction
}

const ACTION_CONFIG: Record<
  ChatAction['type'],
  { icon: string; label: string; accent: string; bgClass: string; textClass: string; borderClass: string }
> = {
  create_event: {
    icon: '\u2705',
    label: 'Created',
    accent: 'green',
    bgClass: 'bg-green-50 dark:bg-green-900/20',
    textClass: 'text-green-700 dark:text-green-300',
    borderClass: 'border-green-200 dark:border-green-800',
  },
  update_event: {
    icon: '\u270F\uFE0F',
    label: 'Updated event',
    accent: 'blue',
    bgClass: 'bg-blue-50 dark:bg-blue-900/20',
    textClass: 'text-blue-700 dark:text-blue-300',
    borderClass: 'border-blue-200 dark:border-blue-800',
  },
  delete_event: {
    icon: '\uD83D\uDDD1\uFE0F',
    label: 'Removed event',
    accent: 'red',
    bgClass: 'bg-red-50 dark:bg-red-900/20',
    textClass: 'text-red-700 dark:text-red-300',
    borderClass: 'border-red-200 dark:border-red-800',
  },
  generate_prep_schedule: {
    icon: '\uD83D\uDCC5',
    label: 'Generated study schedule',
    accent: 'violet',
    bgClass: 'bg-violet-50 dark:bg-violet-900/20',
    textClass: 'text-violet-700 dark:text-violet-300',
    borderClass: 'border-violet-200 dark:border-violet-800',
  },
}

function getActionDescription(action: ChatAction): string {
  const config = ACTION_CONFIG[action.type]

  switch (action.type) {
    case 'create_event': {
      const createAction = action as CreateEventAction
      const title = createAction.event.title
      const date = createAction.event.event_date
      return `${config.label}: ${title} on ${date}`
    }
    case 'update_event':
      return config.label
    case 'delete_event':
      return config.label
    case 'generate_prep_schedule':
      return config.label
    default:
      return 'Action performed'
  }
}

export function ChatActionCard({ action }: ChatActionCardProps) {
  const config = ACTION_CONFIG[action.type]
  if (!config) return null

  const description = getActionDescription(action)
  const statusBadge =
    action.status === 'applied' ? (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-white/60 dark:bg-white/10 text-gray-600 dark:text-gray-400">
        Applied
      </span>
    ) : action.status === 'pending' ? (
      <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300">
        Pending
      </span>
    ) : null

  return (
    <div
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${config.bgClass} ${config.textClass} ${config.borderClass}`}
    >
      <span className="text-sm leading-none">{config.icon}</span>
      <span className="truncate max-w-[200px]">{description}</span>
      {statusBadge}
    </div>
  )
}

export default ChatActionCard
