'use client'

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void
}

const SUGGESTIONS = [
  { text: 'I have a test coming up', icon: '\uD83D\uDCDD' },
  { text: 'What should I study today?', icon: '\uD83D\uDCA1' },
  { text: 'Help me plan this week', icon: '\uD83D\uDCC6' },
  { text: 'Show my upcoming events', icon: '\uD83D\uDCC5' },
]

export function SuggestedPrompts({ onSelect }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-wrap gap-2">
      {SUGGESTIONS.map((s) => (
        <button
          key={s.text}
          onClick={() => onSelect(s.text)}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm text-gray-700 dark:text-gray-300 hover:border-violet-400 dark:hover:border-violet-500 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-900/20 transition-colors cursor-pointer"
        >
          <span className="text-base leading-none">{s.icon}</span>
          <span>{s.text}</span>
        </button>
      ))}
    </div>
  )
}

export default SuggestedPrompts
