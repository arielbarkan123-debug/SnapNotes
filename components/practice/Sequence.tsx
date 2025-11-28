'use client'

import { useState, useMemo } from 'react'

// =============================================================================
// Types
// =============================================================================

interface SequenceProps {
  instruction: string
  items: string[]
  correctOrder: number[] // correctOrder[i] = which item should be at position i
  onAnswer: (correct: boolean) => void
}

interface DragState {
  isDragging: boolean
  dragIndex: number | null
  dragOverIndex: number | null
}

// =============================================================================
// Component
// =============================================================================

export default function Sequence({
  instruction,
  items,
  correctOrder,
  onAnswer,
}: SequenceProps) {
  // Shuffle items on mount
  const initialOrder = useMemo(() => {
    const indices = items.map((_, i) => i)
    // Fisher-Yates shuffle
    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[indices[i], indices[j]] = [indices[j], indices[i]]
    }
    return indices
  }, [items])

  const [currentOrder, setCurrentOrder] = useState<number[]>(initialOrder)
  const [hasChecked, setHasChecked] = useState(false)
  const [results, setResults] = useState<boolean[]>([])
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    dragIndex: null,
    dragOverIndex: null,
  })

  const moveItem = (fromIndex: number, toIndex: number) => {
    if (hasChecked) return
    if (fromIndex === toIndex) return

    const newOrder = [...currentOrder]
    const [movedItem] = newOrder.splice(fromIndex, 1)
    newOrder.splice(toIndex, 0, movedItem)
    setCurrentOrder(newOrder)
  }

  const moveUp = (index: number) => {
    if (index > 0) {
      moveItem(index, index - 1)
    }
  }

  const moveDown = (index: number) => {
    if (index < currentOrder.length - 1) {
      moveItem(index, index + 1)
    }
  }

  // Drag handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (hasChecked) return
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', index.toString())
    setDragState({ isDragging: true, dragIndex: index, dragOverIndex: null })
  }

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (dragState.dragOverIndex !== index) {
      setDragState((prev) => ({ ...prev, dragOverIndex: index }))
    }
  }

  const handleDragLeave = () => {
    setDragState((prev) => ({ ...prev, dragOverIndex: null }))
  }

  const handleDrop = (e: React.DragEvent, toIndex: number) => {
    e.preventDefault()
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10)
    moveItem(fromIndex, toIndex)
    setDragState({ isDragging: false, dragIndex: null, dragOverIndex: null })
  }

  const handleDragEnd = () => {
    setDragState({ isDragging: false, dragIndex: null, dragOverIndex: null })
  }

  // Touch drag support
  const [touchDragIndex, setTouchDragIndex] = useState<number | null>(null)

  const handleTouchStart = (index: number) => {
    if (hasChecked) return
    setTouchDragIndex(index)
  }

  const handleTouchMove = (index: number) => {
    if (touchDragIndex !== null && touchDragIndex !== index) {
      moveItem(touchDragIndex, index)
      setTouchDragIndex(index)
    }
  }

  const handleTouchEnd = () => {
    setTouchDragIndex(null)
  }

  const handleCheck = () => {
    // Check if current order matches correct order
    const checkResults = currentOrder.map((itemIndex, position) => {
      return correctOrder[position] === itemIndex
    })

    setResults(checkResults)
    setHasChecked(true)

    const allCorrect = checkResults.every((r) => r)
    onAnswer(allCorrect)
  }

  const getItemStyle = (index: number) => {
    const isDragging = dragState.dragIndex === index
    const isDragOver = dragState.dragOverIndex === index
    const isTouchDragging = touchDragIndex === index

    let baseClass =
      'w-full p-4 rounded-xl border-2 transition-all duration-200 font-medium flex items-center gap-3 '

    if (hasChecked) {
      if (results[index]) {
        baseClass +=
          'border-green-500 bg-green-50 dark:bg-green-900/30 text-green-700 dark:text-green-300'
      } else {
        baseClass += 'border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300'
      }
    } else if (isDragging || isTouchDragging) {
      baseClass +=
        'border-indigo-500 bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 opacity-50 scale-95'
    } else if (isDragOver) {
      baseClass +=
        'border-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 text-gray-700 dark:text-gray-300 scale-[1.02]'
    } else {
      baseClass +=
        'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
    }

    return baseClass
  }

  const getNumberStyle = (index: number) => {
    let baseClass =
      'flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold '

    if (hasChecked) {
      if (results[index]) {
        baseClass += 'bg-green-500 text-white'
      } else {
        baseClass += 'bg-red-500 text-white'
      }
    } else {
      baseClass += 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
    }

    return baseClass
  }

  const correctCount = results.filter((r) => r).length

  return (
    <div className="w-full max-w-2xl mx-auto">
      {/* Instruction */}
      <div className="mb-6">
        <p className="text-xl sm:text-2xl font-semibold text-gray-900 dark:text-white leading-relaxed text-center">
          {instruction}
        </p>
        {!hasChecked && (
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-2">
            Drag items or use arrows to reorder
          </p>
        )}
      </div>

      {/* Sortable Items */}
      <div className="space-y-2 mb-6">
        {currentOrder.map((itemIndex, position) => (
          <div
            key={itemIndex}
            draggable={!hasChecked}
            onDragStart={(e) => handleDragStart(e, position)}
            onDragOver={(e) => handleDragOver(e, position)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, position)}
            onDragEnd={handleDragEnd}
            onTouchStart={() => handleTouchStart(position)}
            onTouchMove={() => handleTouchMove(position)}
            onTouchEnd={handleTouchEnd}
            className={getItemStyle(position)}
          >
            {/* Drag Handle */}
            {!hasChecked && (
              <div className="flex-shrink-0 cursor-grab active:cursor-grabbing text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 8h16M4 16h16"
                  />
                </svg>
              </div>
            )}

            {/* Position Number */}
            <span className={getNumberStyle(position)}>{position + 1}</span>

            {/* Item Text */}
            <span className="flex-1">{items[itemIndex]}</span>

            {/* Up/Down Buttons */}
            {!hasChecked && (
              <div className="flex flex-col gap-1">
                <button
                  onClick={() => moveUp(position)}
                  disabled={position === 0}
                  className={`p-1 rounded transition-colors ${
                    position === 0
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                  aria-label="Move up"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 15l7-7 7 7"
                    />
                  </svg>
                </button>
                <button
                  onClick={() => moveDown(position)}
                  disabled={position === currentOrder.length - 1}
                  className={`p-1 rounded transition-colors ${
                    position === currentOrder.length - 1
                      ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed'
                      : 'text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30'
                  }`}
                  aria-label="Move down"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>
              </div>
            )}

            {/* Result Icon */}
            {hasChecked && (
              <span className="flex-shrink-0 text-xl">
                {results[position] ? '✓' : '✗'}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Result Message */}
      {hasChecked && (
        <div
          className={`mb-4 p-4 rounded-xl ${
            correctCount === items.length
              ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
              : 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
          }`}
        >
          <p
            className={`font-bold text-lg text-center ${
              correctCount === items.length
                ? 'text-green-700 dark:text-green-400'
                : 'text-amber-700 dark:text-amber-400'
            }`}
          >
            {correctCount === items.length
              ? 'Perfect order! 🎉'
              : `${correctCount}/${items.length} in correct position`}
          </p>
        </div>
      )}

      {/* Correct Order (shown if any wrong) */}
      {hasChecked && correctCount < items.length && (
        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-3">
            Correct order:
          </p>
          <ol className="space-y-2">
            {correctOrder.map((itemIndex, position) => (
              <li key={position} className="flex items-center gap-3 text-sm">
                <span className="w-6 h-6 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center font-bold text-xs">
                  {position + 1}
                </span>
                <span className="text-gray-700 dark:text-gray-300">{items[itemIndex]}</span>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Action Button */}
      {!hasChecked ? (
        <button
          onClick={handleCheck}
          className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Check Order
        </button>
      ) : (
        <button
          onClick={() => {
            // Parent handles navigation via onAnswer callback
          }}
          className="w-full py-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all"
        >
          Continue
        </button>
      )}
    </div>
  )
}
