/**
 * Render tests for SlopeTriangle component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { SlopeTriangle } from '@/components/math/SlopeTriangle'
import type { SlopeTriangleData } from '@/types/math'

const mockData: SlopeTriangleData = {
  point1: { x: 1, y: 2 },
  point2: { x: 4, y: 8 },
  rise: 6,
  run: 3,
  slope: 2,
  showRiseRun: true,
  showSlopeFormula: true,
  title: 'Slope = 2',
}

describe('SlopeTriangle', () => {
  it('renders without crashing', () => {
    const { container } = render(<SlopeTriangle data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<SlopeTriangle data={mockData} />)
    expect(screen.getByTestId('slope-triangle')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<SlopeTriangle data={mockData} />)
    expect(screen.getByTestId('st-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<SlopeTriangle data={mockData} initialStep={3} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with negative slope', () => {
    const negativeSlope: SlopeTriangleData = {
      point1: { x: 0, y: 5 },
      point2: { x: 5, y: 0 },
      rise: -5,
      run: 5,
      slope: -1,
    }
    const { container } = render(<SlopeTriangle data={negativeSlope} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<SlopeTriangle data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
