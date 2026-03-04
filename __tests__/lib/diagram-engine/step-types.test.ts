import type { StepByStepSource, StepLayerMeta } from '@/components/homework/diagram/types'

describe('StepByStep types', () => {
  it('StepByStepSource has required fields', () => {
    const source: StepByStepSource = {
      tikzCode: '\\begin{tikzpicture}...',
      steps: [
        {
          layer: 1,
          label: 'Draw object',
          labelHe: 'צייר גוף',
          explanation: 'We start by drawing the object.',
          explanationHe: 'נתחיל בציור הגוף.',
        },
      ],
    }
    expect(source.tikzCode).toBeTruthy()
    expect(source.steps).toHaveLength(1)
    expect(source.steps[0].layer).toBe(1)
    expect(source.steps[0].label).toBeTruthy()
    expect(source.steps[0].labelHe).toBeTruthy()
    expect(source.steps[0].explanation).toBeTruthy()
    expect(source.steps[0].explanationHe).toBeTruthy()
  })
})
