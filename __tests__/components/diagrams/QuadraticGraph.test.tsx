/**
 * Render tests for QuadraticGraph component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { QuadraticGraph } from '@/components/math/QuadraticGraph'
import type { QuadraticGraphData } from '@/types/math'

const mockData: QuadraticGraphData = {
  a: 1,
  b: -4,
  c: 3,
  expression: 'x^2 - 4x + 3',
  vertex: { x: 2, y: -1 },
  roots: [1, 3],
  axisOfSymmetry: 2,
  showVertex: true,
  showRoots: true,
  showAxisOfSymmetry: true,
  title: 'Quadratic: x^2 - 4x + 3',
}

describe('QuadraticGraph', () => {
  it('renders without crashing', () => {
    const { container } = render(<QuadraticGraph data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<QuadraticGraph data={mockData} />)
    expect(screen.getByTestId('quadratic-graph')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<QuadraticGraph data={mockData} />)
    expect(screen.getByTestId('qg-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<QuadraticGraph data={mockData} initialStep={3} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders parabola opening downward', () => {
    const downward: QuadraticGraphData = {
      a: -1,
      b: 0,
      c: 4,
      title: 'Opens downward',
    }
    const { container } = render(<QuadraticGraph data={downward} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with no real roots (discriminant < 0)', () => {
    const noRoots: QuadraticGraphData = {
      a: 1,
      b: 0,
      c: 4,
      roots: [],
      title: 'No real roots',
    }
    const { container } = render(<QuadraticGraph data={noRoots} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<QuadraticGraph data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
