'use client'

import { useState, useRef, useCallback } from 'react'
import { X, Plus } from 'lucide-react'

// ============================================================================
// Props
// ============================================================================

interface TopicsListProps {
  topics: string[]
  onChange: (topics: string[]) => void
}

// ============================================================================
// Component
// ============================================================================

export default function TopicsList({ topics, onChange }: TopicsListProps) {
  const [inputValue, setInputValue] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const addTopic = useCallback(() => {
    const trimmed = inputValue.trim()
    if (!trimmed) return

    // Duplicate prevention (case-insensitive)
    const isDuplicate = topics.some(
      (t) => t.toLowerCase() === trimmed.toLowerCase()
    )
    if (isDuplicate) {
      setInputValue('')
      return
    }

    onChange([...topics, trimmed])
    setInputValue('')
    inputRef.current?.focus()
  }, [inputValue, topics, onChange])

  const removeTopic = useCallback(
    (index: number) => {
      const next = topics.filter((_, i) => i !== index)
      onChange(next)
    },
    [topics, onChange]
  )

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addTopic()
    }
  }

  return (
    <div className="space-y-2">
      {/* Topic pills */}
      {topics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {topics.map((topic, i) => (
            <span
              key={`${topic}-${i}`}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm font-medium
                bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300"
            >
              {topic}
              <button
                type="button"
                onClick={() => removeTopic(i)}
                className="ml-0.5 p-0.5 rounded-full hover:bg-violet-200 dark:hover:bg-violet-800
                  transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
                aria-label={`Remove topic: ${topic}`}
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Add topic input */}
      <div className="flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add a topic..."
          className="flex-1 px-3 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600
            bg-white dark:bg-gray-700 text-gray-900 dark:text-white
            placeholder:text-gray-400 dark:placeholder:text-gray-500
            focus:outline-none focus:ring-2 focus:ring-violet-400 focus:border-transparent
            transition-colors"
        />
        <button
          type="button"
          onClick={addTopic}
          disabled={!inputValue.trim()}
          className="p-1.5 rounded-lg text-violet-600 dark:text-violet-400
            hover:bg-violet-50 dark:hover:bg-violet-900/30
            disabled:opacity-40 disabled:cursor-not-allowed
            transition-colors focus:outline-none focus:ring-2 focus:ring-violet-400"
          aria-label="Add topic"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
