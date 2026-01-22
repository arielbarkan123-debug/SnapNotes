/**
 * Diagram helper functions for TutoringChat
 */

import type { TutorDiagramState, ConversationMessage } from '@/lib/homework/types'
import type { DiagramState as PhysicsDiagramState } from '@/types/physics'
import type { MathDiagramState } from '@/types/math'
import { type DiagramState, PHYSICS_DIAGRAM_TYPES } from './types'

/**
 * Convert TutorDiagramState from API response to DiagramState for renderer
 * Handles both physics and math diagram types
 */
export function convertToDiagramState(tutorDiagram: TutorDiagramState): DiagramState {
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
export function getLatestDiagram(messages: ConversationMessage[]): DiagramState | null {
  // Iterate from end to find most recent tutor message with diagram
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]
    if (msg.role === 'tutor' && msg.diagram) {
      return convertToDiagramState(msg.diagram)
    }
  }
  return null
}
