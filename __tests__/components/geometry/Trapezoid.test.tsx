import React from 'react'
import { render } from '@testing-library/react'
import { Trapezoid } from '@/components/geometry/Trapezoid'
import type { TrapezoidData } from '@/types/geometry'

const baseData: TrapezoidData = {
  topBase: 4,
  bottomBase: 8,
  height: 5,
  isIsosceles: true,
}

describe('Trapezoid', () => {
  it('renders without crashing', () => {
    const { container } = render(<Trapezoid data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to geometry subject', () => {
    const { container } = render(<Trapezoid data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<Trapezoid data={baseData} subject="math" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<Trapezoid data={baseData} complexity="elementary" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG with correct dimensions', () => {
    const { container } = render(<Trapezoid data={baseData} width={500} height={400} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '500')
    expect(svg).toHaveAttribute('height', '400')
  })

  it('renders step-by-step when enabled', () => {
    const { container } = render(<Trapezoid data={{ ...baseData, showCalculations: true }} showStepByStep />)
    expect(container.querySelector('.border-l-2')).toBeInTheDocument()
  })

  it('supports Hebrew language', () => {
    const { container } = render(<Trapezoid data={baseData} language="he" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(<Trapezoid data={baseData} className="custom" />)
    expect(container.firstChild).toHaveClass('custom')
  })
})
