/**
 * Render tests for FractionCircle component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { FractionCircle } from '@/components/math/FractionCircle'
import type { FractionCircleData } from '@/types/math'

const mockData: FractionCircleData = {
  numerator: 3,
  denominator: 4,
  showLabel: true,
  color: '#3b82f6',
  title: 'Three-quarters',
}

describe('FractionCircle', () => {
  it('renders without crashing', () => {
    const { container } = render(<FractionCircle data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<FractionCircle data={mockData} />)
    expect(screen.getByTestId('fraction-circle')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<FractionCircle data={mockData} />)
    expect(screen.getByTestId('fc-title')).toBeInTheDocument()
  })

  it('renders without title', () => {
    const dataNoTitle: FractionCircleData = {
      numerator: 1,
      denominator: 2,
      showLabel: false,
    }
    render(<FractionCircle data={dataNoTitle} />)
    expect(screen.queryByTestId('fc-title')).not.toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<FractionCircle data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with comparison', () => {
    const compareData: FractionCircleData = {
      numerator: 1,
      denominator: 2,
      showLabel: true,
      compareTo: { numerator: 2, denominator: 4 },
      title: 'Equivalent fractions',
    }
    const { container } = render(<FractionCircle data={compareData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<FractionCircle data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
    expect(svg.getAttribute('aria-label')).toContain('3/4')
  })
})
