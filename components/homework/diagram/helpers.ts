/**
 * Diagram helper functions for TutoringChat
 */

import type { TutorDiagramState, ConversationMessage } from '@/lib/homework/types'
import type { DiagramState } from './types'

/**
 * Convert TutorDiagramState from API response to DiagramState for renderer
 */
export function convertToDiagramState(tutorDiagram: TutorDiagramState): DiagramState {
  return {
    type: tutorDiagram.type,
    data: tutorDiagram.data as Record<string, unknown> | undefined,
    visibleStep: tutorDiagram.visibleStep,
    totalSteps: tutorDiagram.totalSteps,
    stepConfig: tutorDiagram.stepConfig,
    stepByStepSource: tutorDiagram.stepByStepSource,
    stepImages: tutorDiagram.stepImages,
  }
}

/**
 * Extract the latest diagram from conversation messages
 * Returns the most recent diagram that a tutor message included
 */
export function getLatestDiagram(messages: ConversationMessage[]): DiagramState | null {
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'tutor' && msg.diagram) {
      return convertToDiagramState(msg.diagram)
    }
  }
  return null
}
