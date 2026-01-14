'use client'

import { useState, useRef, useEffect, useCallback, useMemo } from 'react'
import { useTranslations } from 'next-intl'
import type { HomeworkSession, ConversationMessage, HintLevel, TutorDiagramState } from '@/lib/homework/types'
import { PhysicsDiagramRenderer } from '@/components/physics'
import { MathDiagramRenderer } from '@/components/math'
import type { DiagramState as PhysicsDiagramState } from '@/types/physics'
import type { MathDiagramState } from '@/types/math'

// Combined diagram type that can be either physics or math
type DiagramState = PhysicsDiagramState | MathDiagramState

// Physics diagram types
const PHYSICS_DIAGRAM_TYPES = ['fbd', 'inclined_plane', 'projectile', 'pulley', 'circuit', 'wave', 'optics', 'motion']

// Math diagram types
const MATH_DIAGRAM_TYPES = ['long_division', 'equation', 'fraction', 'number_line', 'coordinate_plane', 'triangle', 'circle', 'bar_model', 'area_model']

// Chemistry diagram types
const CHEMISTRY_DIAGRAM_TYPES = ['molecule', 'reaction', 'energy_diagram']

// Biology diagram types
const BIOLOGY_DIAGRAM_TYPES = ['cell', 'system', 'process_flow']

function isPhysicsDiagram(diagram: DiagramState): diagram is PhysicsDiagramState {
  return PHYSICS_DIAGRAM_TYPES.includes(diagram.type as string)
}

function isMathDiagram(diagram: DiagramState): diagram is MathDiagramState {
  return MATH_DIAGRAM_TYPES.includes(diagram.type as string)
}

// Placeholder functions for future chemistry/biology diagram renderers
function _isChemistryDiagram(diagram: DiagramState): boolean {
  return CHEMISTRY_DIAGRAM_TYPES.includes(diagram.type as string)
}

function _isBiologyDiagram(diagram: DiagramState): boolean {
  return BIOLOGY_DIAGRAM_TYPES.includes(diagram.type as string)
}

/**
 * Get human-readable diagram type name
 */
function getDiagramTypeName(type: string): string {
  const names: Record<string, string> = {
    // Physics diagrams
    fbd: 'Free Body Diagram',
    inclined_plane: 'Inclined Plane',
    projectile: 'Projectile Motion',
    pulley: 'Pulley System',
    circuit: 'Circuit Diagram',
    wave: 'Wave Diagram',
    optics: 'Optics',
    motion: 'Motion Diagram',
    // Math diagrams
    long_division: 'Long Division',
    equation: 'Equation Solving',
    fraction: 'Fractions',
    number_line: 'Number Line',
    coordinate_plane: 'Coordinate Plane',
    triangle: 'Triangle',
    circle: 'Circle',
    bar_model: 'Bar Model',
    area_model: 'Area Model',
    // Chemistry diagrams
    molecule: 'Molecule Structure',
    reaction: 'Chemical Reaction',
    energy_diagram: 'Energy Diagram',
    // Biology diagrams
    cell: 'Cell Structure',
    system: 'System Diagram',
    process_flow: 'Process Flow',
  }
  return names[type] || type.replace(/_/g, ' ')
}

// ============================================================================
// Types
// ============================================================================

interface TutoringChatProps {
  session: HomeworkSession
  onSendMessage: (message: string) => Promise<void>
  onRequestHint: (level: HintLevel) => Promise<void>
  onComplete: () => Promise<void>
  isLoading?: boolean
}

// ============================================================================
// LocalStorage Draft Persistence
// ============================================================================

const CHAT_DRAFT_KEY_PREFIX = 'notesnap_chat_draft_'

function getDraftKey(sessionId: string): string {
  return `${CHAT_DRAFT_KEY_PREFIX}${sessionId}`
}

function saveDraft(sessionId: string, text: string): void {
  if (typeof window === 'undefined') return
  try {
    if (text.trim()) {
      localStorage.setItem(getDraftKey(sessionId), JSON.stringify({
        text,
        savedAt: Date.now(),
      }))
    } else {
      localStorage.removeItem(getDraftKey(sessionId))
    }
  } catch {
    // localStorage might be full - silently continue
  }
}

function loadDraft(sessionId: string): string {
  if (typeof window === 'undefined') return ''
  try {
    const stored = localStorage.getItem(getDraftKey(sessionId))
    if (!stored) return ''

    const draft = JSON.parse(stored)
    // Only use draft if saved within last 24 hours
    const maxAge = 24 * 60 * 60 * 1000
    if (Date.now() - draft.savedAt > maxAge) {
      localStorage.removeItem(getDraftKey(sessionId))
      return ''
    }
    return draft.text || ''
  } catch {
    return ''
  }
}

function clearDraft(sessionId: string): void {
  if (typeof window === 'undefined') return
  try {
    localStorage.removeItem(getDraftKey(sessionId))
  } catch {
    // Ignore errors
  }
}

// ============================================================================
// Diagram Helpers (Physics + Math)
// ============================================================================

/**
 * Convert TutorDiagramState from API response to DiagramState for renderer
 * Handles both physics and math diagram types
 */
function convertToDiagramState(tutorDiagram: TutorDiagramState): DiagramState {
  const diagramType = tutorDiagram.type as string

  // Check if it's a physics diagram
  if (PHYSICS_DIAGRAM_TYPES.includes(diagramType)) {
    return {
      type: tutorDiagram.type as PhysicsDiagramState['type'],
      data: tutorDiagram.data as unknown as PhysicsDiagramState['data'],
      visibleStep: tutorDiagram.visibleStep,
      totalSteps: tutorDiagram.totalSteps,
      stepConfig: tutorDiagram.stepConfig,
    } as PhysicsDiagramState
  }

  // It's a math diagram
  return {
    type: tutorDiagram.type as MathDiagramState['type'],
    data: tutorDiagram.data as unknown as MathDiagramState['data'],
    visibleStep: tutorDiagram.visibleStep,
    totalSteps: tutorDiagram.totalSteps,
    stepConfig: tutorDiagram.stepConfig,
  } as MathDiagramState
}

/**
 * Extract the latest diagram from conversation messages
 * Returns the most recent diagram that a tutor message included
 */
function getLatestDiagram(messages: ConversationMessage[]): DiagramState | null {
  // Iterate from end to find most recent tutor message with diagram
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'tutor' && msg.diagram) {
      return convertToDiagramState(msg.diagram)
    }
  }
  return null
}

// ============================================================================
// Sub-components
// ============================================================================

function MessageBubble({ message, t, diagramStep, onStepAdvance }: {
  message: ConversationMessage
  t: ReturnType<typeof useTranslations<'chat'>>
  diagramStep?: number
  onStepAdvance?: () => void
}) {
  const isTutor = message.role === 'tutor'
  const hasDiagram = isTutor && message.diagram

  // Convert diagram to correct type if present
  const diagramState = hasDiagram ? convertToDiagramState(message.diagram!) : null

  return (
    <div className={`flex ${isTutor ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] ${isTutor ? '' : 'order-last'}`}>
        {isTutor && (
          <div className="flex items-center gap-2 mb-1">
            <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm">
              🎓
            </div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tutor')}</span>
            {message.hintLevel && (
              <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 rounded-full">
                {t('hint', { level: message.hintLevel })}
              </span>
            )}
          </div>
        )}
        <div
          className={`
            rounded-2xl px-4 py-3 text-sm
            ${isTutor
              ? 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white rounded-tl-md'
              : 'bg-indigo-600 text-white rounded-tr-md'
            }
          `}
        >
          <p className="whitespace-pre-wrap">{message.content}</p>

          {/* Inline Diagram - shows directly in message when diagram is present */}
          {diagramState && (
            <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-600">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400">
                  📊 {getDiagramTypeName(diagramState.type)}
                </span>
              </div>
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-3 overflow-x-auto">
                {isPhysicsDiagram(diagramState) ? (
                  <PhysicsDiagramRenderer
                    diagram={diagramState}
                    currentStep={diagramStep ?? 0}
                    animate={true}
                    showControls={true}
                    onStepAdvance={onStepAdvance}
                    language="en"
                    width={350}
                    height={280}
                  />
                ) : isMathDiagram(diagramState) ? (
                  <MathDiagramRenderer
                    diagram={diagramState}
                    currentStep={diagramStep ?? 0}
                    animate={true}
                    showControls={true}
                    onStepAdvance={onStepAdvance}
                    language="en"
                    width={350}
                    height={280}
                  />
                ) : (
                  <div className="flex items-center justify-center h-32 text-gray-500 dark:text-gray-400 text-xs">
                    Diagram visualization coming soon
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function HintButtons({
  hintsUsed,
  onRequestHint,
  disabled,
  t,
}: {
  hintsUsed: number
  onRequestHint: (level: HintLevel) => void
  disabled: boolean
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const hints: { level: HintLevel; labelKey: string; icon: string }[] = [
    { level: 1, labelKey: 'hintConcept', icon: '💡' },
    { level: 2, labelKey: 'hintStrategy', icon: '🧭' },
    { level: 3, labelKey: 'hintExample', icon: '📝' },
    { level: 4, labelKey: 'hintGuide', icon: '🤝' },
    { level: 5, labelKey: 'hintAnswer', icon: '✅' },
  ]

  return (
    <div className="bg-gray-50 dark:bg-gray-800/50 border-t border-gray-200 dark:border-gray-700 px-4 py-3">
      <p className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400 mb-2">
        <span>💡</span>
        <span>{t('needHelp', { count: hintsUsed })}</span>
      </p>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {hints.map(({ level, labelKey, icon }) => (
          <button
            key={level}
            onClick={() => onRequestHint(level)}
            disabled={disabled}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap
              transition-colors disabled:opacity-50 disabled:cursor-not-allowed
              ${level === 5
                ? 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:bg-amber-200 dark:hover:bg-amber-900/50'
                : 'bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'
              }
            `}
          >
            <span>{icon}</span>
            <span>{t(labelKey)}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function ProgressBar({
  currentStep,
  totalSteps,
  t,
}: {
  currentStep: number
  totalSteps: number
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const progress = Math.min(100, (currentStep / totalSteps) * 100)

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 py-3">
      <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between items-center mt-1.5 text-xs text-gray-500 dark:text-gray-400">
        <span>{t('progress')}</span>
        <span>{t('stepOf', { current: currentStep, total: totalSteps })}</span>
      </div>
    </div>
  )
}

// ============================================================================
// Main Component
// ============================================================================

export default function TutoringChat({
  session,
  onSendMessage,
  onRequestHint,
  onComplete,
  isLoading = false,
}: TutoringChatProps) {
  const t = useTranslations('chat')
  const [input, setInput] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false) // Local state to prevent double-submit
  const [diagramStep, setDiagramStep] = useState(0) // Track manual diagram step advances
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)

  // Get the current physics diagram from conversation (if any)
  const currentDiagram = useMemo(() => {
    return getLatestDiagram(session.conversation)
  }, [session.conversation])

  // Determine if diagram uses auto-advance mode
  const isAutoAdvance = currentDiagram?.evolutionMode === 'auto-advance'

  // Track previous diagram step for animation detection
  const prevDiagramStepRef = useRef<number>(0)

  // Reset diagram step when a new diagram arrives (auto-advance)
  useEffect(() => {
    if (currentDiagram) {
      const newStep = currentDiagram.visibleStep
      prevDiagramStepRef.current = diagramStep
      setDiagramStep(newStep)
    }
  }, [currentDiagram, diagramStep])

  // Restore draft from localStorage on mount
  useEffect(() => {
    if (session.id) {
      const savedDraft = loadDraft(session.id)
      if (savedDraft) {
        setInput(savedDraft)
      }
    }
  }, [session.id])

  // Auto-save draft to localStorage (debounced)
  useEffect(() => {
    if (!session.id) return

    const timeoutId = setTimeout(() => {
      saveDraft(session.id, input)
    }, 500) // Debounce 500ms

    return () => clearTimeout(timeoutId)
  }, [session.id, input])

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [session.conversation])

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault()
      const message = input.trim()
      if (!message || isLoading || isSubmitting) return

      setIsSubmitting(true)
      setInput('')
      // Clear draft since message is being sent
      if (session.id) {
        clearDraft(session.id)
      }
      try {
        await onSendMessage(message)
      } finally {
        setIsSubmitting(false)
      }
    },
    [input, isLoading, isSubmitting, onSendMessage, session.id]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleSubmit(e)
      }
    },
    [handleSubmit]
  )

  const handleHintRequest = useCallback(
    async (level: HintLevel) => {
      if (isLoading || isSubmitting) return
      await onRequestHint(level)
    },
    [isLoading, isSubmitting, onRequestHint]
  )

  return (
    <div className="flex h-full bg-gray-50 dark:bg-gray-900">
      {/* Main Chat Area */}
      <div className={`flex flex-col ${currentDiagram ? 'flex-1 lg:w-1/2' : 'w-full'}`}>
        {/* Progress */}
        <ProgressBar
          currentStep={session.current_step}
          totalSteps={session.total_estimated_steps || 5}
          t={t}
        />

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {session.conversation.map((msg, idx) => (
            <MessageBubble
              key={idx}
              message={msg}
              t={t}
              diagramStep={diagramStep}
              onStepAdvance={() => setDiagramStep(prev => Math.min(prev + 1, (currentDiagram?.totalSteps || 10) - 1))}
            />
          ))}

          {isLoading && (
            <div className="flex justify-start">
              <div className="max-w-[85%]">
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-sm">
                    🎓
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{t('tutor')}</span>
                </div>
                <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-md px-4 py-3">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Hint Buttons */}
        <HintButtons
          hintsUsed={session.hints_used}
          onRequestHint={handleHintRequest}
          disabled={isLoading}
          t={t}
        />

        {/* Input Area */}
        <div className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 p-4">
          <form onSubmit={handleSubmit} className="flex gap-2">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('typeAnswer')}
              disabled={isLoading}
              rows={1}
              className="flex-1 resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 px-4 py-2.5 text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
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
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            </button>
          </form>

          {/* Complete Button */}
          <div className="flex justify-center mt-3">
            <button
              onClick={onComplete}
              disabled={isLoading}
              className="text-sm text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-medium transition-colors disabled:opacity-50"
            >
              {t('markComplete')}
            </button>
          </div>
        </div>
      </div>

      {/* Physics Diagram Panel - shows when diagram is present */}
      {currentDiagram && (
        <div className="hidden lg:flex lg:w-1/2 flex-col border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          {/* Diagram Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center">
                <svg className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {t('diagramTitle') || 'Diagram'}
              </span>
            </div>
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {getDiagramTypeName(currentDiagram.type)}
            </span>
          </div>

          {/* Diagram Content */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="sticky top-0">
              {isPhysicsDiagram(currentDiagram) ? (
                <PhysicsDiagramRenderer
                  diagram={currentDiagram}
                  currentStep={diagramStep}
                  animate={true}
                  showControls={!isAutoAdvance}
                  onStepAdvance={() => setDiagramStep(prev => Math.min(prev + 1, (currentDiagram.totalSteps || 10) - 1))}
                  language="en"
                />
              ) : isMathDiagram(currentDiagram) ? (
                <MathDiagramRenderer
                  diagram={currentDiagram}
                  currentStep={diagramStep}
                  animate={true}
                  showControls={!isAutoAdvance}
                  onStepAdvance={() => setDiagramStep(prev => Math.min(prev + 1, (currentDiagram.totalSteps || 10) - 1))}
                  language="en"
                />
              ) : (
                // Placeholder for chemistry/biology diagrams (coming soon)
                <div className="flex items-center justify-center h-64 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                  <div className="text-center px-4">
                    <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {getDiagramTypeName((currentDiagram as { type: string }).type)}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Diagram visualization coming soon
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Diagram Instructions */}
          <div className="px-4 py-3 bg-indigo-50 dark:bg-indigo-900/20 border-t border-gray-200 dark:border-gray-700">
            <p className="text-xs text-indigo-700 dark:text-indigo-300">
              {isAutoAdvance
                ? (t('diagramAutoAdvance') || 'The diagram reveals more as the tutor explains each concept.')
                : (t('diagramInstructions') || 'Use the controls above to step through the diagram as you follow along with the explanation.')}
            </p>
          </div>
        </div>
      )}

      {/* Mobile Diagram (collapsible) - shows on small screens when diagram is present */}
      {currentDiagram && (
        <MobileDiagramPanel
          diagram={currentDiagram}
          diagramStep={diagramStep}
          onStepAdvance={() => setDiagramStep(prev => Math.min(prev + 1, (currentDiagram.totalSteps || 10) - 1))}
          t={t}
        />
      )}
    </div>
  )
}

// ============================================================================
// Mobile Diagram Panel (for smaller screens)
// ============================================================================

function MobileDiagramPanel({
  diagram,
  diagramStep,
  onStepAdvance,
  t,
}: {
  diagram: DiagramState
  diagramStep: number
  onStepAdvance: () => void
  t: ReturnType<typeof useTranslations<'chat'>>
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="lg:hidden fixed bottom-20 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-12 h-12 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center hover:bg-indigo-700 transition-colors"
      >
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          {isOpen ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          )}
        </svg>
      </button>

      {/* Popup Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-[calc(100vw-2rem)] max-w-md bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {t('diagramTitle') || getDiagramTypeName(diagram.type)}
            </span>
            <button onClick={() => setIsOpen(false)} className="text-gray-500 hover:text-gray-700">
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Content */}
          <div className="p-3 max-h-[60vh] overflow-y-auto">
            {isPhysicsDiagram(diagram) ? (
              <PhysicsDiagramRenderer
                diagram={diagram}
                currentStep={diagramStep}
                animate={true}
                showControls={diagram.evolutionMode !== 'auto-advance'}
                onStepAdvance={onStepAdvance}
                width={350}
                height={280}
                language="en"
              />
            ) : isMathDiagram(diagram) ? (
              <MathDiagramRenderer
                diagram={diagram}
                currentStep={diagramStep}
                animate={true}
                showControls={diagram.evolutionMode !== 'auto-advance'}
                onStepAdvance={onStepAdvance}
                width={350}
                height={280}
                language="en"
              />
            ) : (
              // Placeholder for chemistry/biology diagrams (coming soon)
              <div className="flex items-center justify-center h-48 bg-gray-50 dark:bg-gray-800 rounded-lg border-2 border-dashed border-gray-300 dark:border-gray-600">
                <div className="text-center px-4">
                  <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {getDiagramTypeName((diagram as { type: string }).type)}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Coming soon
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
