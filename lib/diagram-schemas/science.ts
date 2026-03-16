import type { DiagramSchema } from './types'

/**
 * Science diagram schemas — physics.
 */
export const scienceSchemas: Record<string, DiagramSchema> = {
  // ---- PHYSICS: Currently Implemented ----

  fbd: {
    type: 'fbd',
    subject: 'physics',
    gradeRange: '9-12',
    engine: 'svg',
    description: 'Free body diagram with forces on an object. Object types: block, sphere, wedge, particle, car, person. Force angles: 0=right, 90=up, -90=down, 180=left.',
    jsonExample: JSON.stringify({
      type: 'fbd',
      visibleStep: 0,
      totalSteps: 3,
      data: {
        object: { type: 'block', position: { x: 150, y: 150 }, mass: 5, label: 'm', color: '#e0e7ff' },
        forces: [
          { name: 'weight', type: 'weight', magnitude: 50, angle: -90, symbol: 'W', color: '#22c55e' },
          { name: 'normal', type: 'normal', magnitude: 50, angle: 90, symbol: 'N', color: '#3b82f6' },
          { name: 'friction', type: 'friction', magnitude: 15, angle: 180, symbol: 'f', subscript: 'k', color: '#ef4444' },
        ],
        title: 'Forces on block',
        showForceMagnitudes: true,
      },
      stepConfig: [
        { step: 0, visibleForces: [], stepLabel: 'Object' },
        { step: 1, visibleForces: ['weight'], highlightForces: ['weight'], stepLabel: 'Weight = 50N' },
        { step: 2, visibleForces: ['weight', 'normal', 'friction'], stepLabel: 'All forces' },
      ],
    }),
  },
}
