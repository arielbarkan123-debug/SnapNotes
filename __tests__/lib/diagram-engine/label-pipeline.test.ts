// Mock the Anthropic SDK to prevent browser environment check during testing
jest.mock('@anthropic-ai/sdk', () => {
  return jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
})

import { computeLabelPositions } from '@/lib/diagram-engine/label-pipeline'

describe('computeLabelPositions', () => {
  it('places left-side labels when targetX < 40', () => {
    const results = [
      { text: 'Nucleus', found: true, targetX: 30, targetY: 50 },
    ]

    const labels = computeLabelPositions(results)

    expect(labels).toHaveLength(1)
    expect(labels[0].text).toBe('Nucleus')
    expect(labels[0].x).toBe(5) // Left side
    expect(labels[0].targetX).toBe(30)
    expect(labels[0].targetY).toBe(50)
  })

  it('places right-side labels when targetX > 60', () => {
    const results = [
      { text: 'Cell Wall', found: true, targetX: 75, targetY: 40 },
    ]

    const labels = computeLabelPositions(results)

    expect(labels).toHaveLength(1)
    expect(labels[0].text).toBe('Cell Wall')
    expect(labels[0].x).toBe(95) // Right side
    expect(labels[0].targetX).toBe(75)
    expect(labels[0].targetY).toBe(40)
  })

  it('distributes middle-zone labels to less crowded side', () => {
    // Two labels already on the left, one in the middle zone
    const results = [
      { text: 'Left A', found: true, targetX: 20, targetY: 30 },
      { text: 'Left B', found: true, targetX: 25, targetY: 60 },
      { text: 'Middle', found: true, targetX: 50, targetY: 45 },
    ]

    const labels = computeLabelPositions(results)

    expect(labels).toHaveLength(3)
    // Middle label should go to the right side (less crowded: 0 right vs 2 left)
    const middleLabel = labels.find(l => l.text === 'Middle')
    expect(middleLabel).toBeDefined()
    expect(middleLabel!.x).toBe(95) // Right side
  })

  it('enforces 6-unit minimum gap between labels on same side', () => {
    const results = [
      { text: 'A', found: true, targetX: 20, targetY: 30 },
      { text: 'B', found: true, targetX: 25, targetY: 32 }, // Only 2 units apart
      { text: 'C', found: true, targetX: 22, targetY: 34 }, // Only 2 more units
    ]

    const labels = computeLabelPositions(results)

    // All should be on the left side
    const leftLabels = labels.filter(l => l.x < 50).sort((a, b) => a.y - b.y)
    expect(leftLabels.length).toBe(3)

    // Each pair should be at least 6 units apart
    for (let i = 1; i < leftLabels.length; i++) {
      expect(leftLabels[i].y - leftLabels[i - 1].y).toBeGreaterThanOrEqual(6)
    }
  })

  it('excludes labels with found=false', () => {
    const results = [
      { text: 'Visible', found: true, targetX: 30, targetY: 50 },
      { text: 'NotFound', found: false, targetX: 60, targetY: 40 },
      { text: 'AlsoVisible', found: true, targetX: 70, targetY: 60 },
    ]

    const labels = computeLabelPositions(results)

    expect(labels).toHaveLength(2)
    expect(labels.map(l => l.text)).toContain('Visible')
    expect(labels.map(l => l.text)).toContain('AlsoVisible')
    expect(labels.map(l => l.text)).not.toContain('NotFound')
  })

  it('clamps positions to 5-95 safe margins', () => {
    const results = [
      { text: 'Edge', found: true, targetX: 2, targetY: 99 },
    ]

    const labels = computeLabelPositions(results)

    expect(labels).toHaveLength(1)
    expect(labels[0].targetX).toBeGreaterThanOrEqual(5)
    expect(labels[0].targetX).toBeLessThanOrEqual(95)
    expect(labels[0].targetY).toBeGreaterThanOrEqual(5)
    expect(labels[0].targetY).toBeLessThanOrEqual(95)
  })

  it('merges label content data when provided', () => {
    const results = [
      { text: 'Nucleus', found: true, targetX: 30, targetY: 50 },
    ]
    const labelContent = [
      {
        text: 'Nucleus',
        textHe: 'גרעין',
        description: 'Control center of the cell',
        descriptionHe: 'מרכז הבקרה של התא',
        stepGroup: 1,
      },
    ]

    const labels = computeLabelPositions(results, labelContent)

    expect(labels).toHaveLength(1)
    expect(labels[0].textHe).toBe('גרעין')
    expect(labels[0].description).toBe('Control center of the cell')
    expect(labels[0].descriptionHe).toBe('מרכז הבקרה של התא')
    expect(labels[0].stepGroup).toBe(1)
  })

  it('handles empty results array', () => {
    const labels = computeLabelPositions([])
    expect(labels).toHaveLength(0)
  })

  it('handles all labels found=false', () => {
    const results = [
      { text: 'A', found: false, targetX: 30, targetY: 50 },
      { text: 'B', found: false, targetX: 70, targetY: 40 },
    ]

    const labels = computeLabelPositions(results)
    expect(labels).toHaveLength(0)
  })
})
