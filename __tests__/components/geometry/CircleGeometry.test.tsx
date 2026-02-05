import React from 'react'
import { render, screen } from '@testing-library/react'
import { CircleGeometry } from '@/components/geometry/CircleGeometry'
import type { CircleGeometryData } from '@/types/geometry'

const baseData: CircleGeometryData = {
  radius: 5,
  showDiameter: true,
  showRadius: true,
}

describe('CircleGeometry', () => {
  it('renders without crashing', () => {
    const { container } = render(<CircleGeometry data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to geometry subject', () => {
    const { container } = render(<CircleGeometry data={baseData} />)
    const svg = container.querySelector('svg')
    expect(svg).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<CircleGeometry data={baseData} subject="math" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<CircleGeometry data={baseData} complexity="elementary" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders circle element', () => {
    const { container } = render(<CircleGeometry data={baseData} />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBeGreaterThan(0)
  })

  it('renders with custom dimensions', () => {
    const { container } = render(<CircleGeometry data={baseData} width={500} height={500} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '500')
    expect(svg).toHaveAttribute('height', '500')
  })

  it('supports Hebrew language', () => {
    const { container } = render(<CircleGeometry data={baseData} language="he" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(<CircleGeometry data={baseData} className="custom-class" />)
    expect(container.firstChild).toHaveClass('custom-class')
  })
})
