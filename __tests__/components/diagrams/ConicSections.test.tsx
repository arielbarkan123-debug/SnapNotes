/**
 * Render tests for ConicSections component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { ConicSections } from '@/components/math/ConicSections'
import type { ConicSectionsData } from '@/types/math'

const mockCircle: ConicSectionsData = {
  type: 'circle',
  center: { x: 0, y: 0 },
  radiusX: 3,
  radiusY: 3,
  expression: 'x^2 + y^2 = 9',
  title: 'Circle: r = 3',
}

const mockEllipse: ConicSectionsData = {
  type: 'ellipse',
  center: { x: 0, y: 0 },
  radiusX: 4,
  radiusY: 2,
  showFoci: true,
  expression: 'x^2/16 + y^2/4 = 1',
  title: 'Ellipse',
}

const mockParabola: ConicSectionsData = {
  type: 'parabola',
  vertex: { x: 0, y: 0 },
  focus: { x: 0, y: 1 },
  directrix: -1,
  showFoci: true,
  showDirectrix: true,
  title: 'Parabola',
}

describe('ConicSections', () => {
  it('renders circle without crashing', () => {
    const { container } = render(<ConicSections data={mockCircle} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<ConicSections data={mockCircle} />)
    expect(screen.getByTestId('conic-sections')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<ConicSections data={mockCircle} />)
    expect(screen.getByTestId('cs-title')).toBeInTheDocument()
  })

  it('renders ellipse variant', () => {
    const { container } = render(<ConicSections data={mockEllipse} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders parabola variant', () => {
    const { container } = render(<ConicSections data={mockParabola} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<ConicSections data={mockCircle} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders hyperbola variant', () => {
    const hyperbola: ConicSectionsData = {
      type: 'hyperbola',
      center: { x: 0, y: 0 },
      a: 3,
      b: 2,
      orientation: 'horizontal',
      showAsymptotes: true,
      title: 'Hyperbola',
    }
    const { container } = render(<ConicSections data={hyperbola} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders an svg element', () => {
    const { container } = render(<ConicSections data={mockCircle} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
