/**
 * Render tests for ParametricCurve component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { ParametricCurve } from '@/components/math/ParametricCurve'
import type { ParametricCurveData } from '@/types/math'

const mockData: ParametricCurveData = {
  xExpression: '2*cos(t)',
  yExpression: '2*sin(t)',
  tRange: { min: 0, max: 6.28 },
  showDirection: true,
  showPoints: [
    { t: 0, label: 't=0' },
    { t: 1.57, label: 't=pi/2' },
    { t: 3.14, label: 't=pi' },
  ],
  title: 'Circle: x=2cos(t), y=2sin(t)',
}

describe('ParametricCurve', () => {
  it('renders without crashing', () => {
    const { container } = render(<ParametricCurve data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<ParametricCurve data={mockData} />)
    expect(screen.getByTestId('parametric-curve')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<ParametricCurve data={mockData} />)
    expect(screen.getByTestId('pc-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<ParametricCurve data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without showPoints', () => {
    const noPoints: ParametricCurveData = {
      xExpression: '2*cos(t)',
      yExpression: '2*sin(t)',
      tRange: { min: 0, max: 6.28 },
    }
    const { container } = render(<ParametricCurve data={noPoints} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<ParametricCurve data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
