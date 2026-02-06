/**
 * Render tests for LimitVisualization component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { LimitVisualization } from '@/components/math/LimitVisualization'
import type { LimitVisualizationData } from '@/types/math'

const mockData: LimitVisualizationData = {
  expression: '(x^2 - 1)/(x - 1)',
  approachValue: 1,
  leftLimit: 2,
  rightLimit: 2,
  showApproachArrows: true,
  showDiscontinuity: true,
  domain: { min: -3, max: 5 },
  title: 'Limit as x approaches 1',
}

describe('LimitVisualization', () => {
  it('renders without crashing', () => {
    const { container } = render(<LimitVisualization data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<LimitVisualization data={mockData} />)
    expect(screen.getByTestId('limit-visualization')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<LimitVisualization data={mockData} />)
    expect(screen.getByTestId('lv-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<LimitVisualization data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with one-sided limit', () => {
    const oneSided: LimitVisualizationData = {
      expression: '(x^2 - 1)/(x - 1)',
      approachValue: 1,
      leftLimit: 2,
      rightLimit: 3,
      title: 'One-sided limit',
    }
    const { container } = render(<LimitVisualization data={oneSided} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without title', () => {
    const noTitle: LimitVisualizationData = {
      expression: 'x^2',
      approachValue: 0,
      leftLimit: 0,
      rightLimit: 0,
    }
    render(<LimitVisualization data={noTitle} />)
    expect(screen.queryByTestId('lv-title')).not.toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<LimitVisualization data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
