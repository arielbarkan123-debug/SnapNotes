import React from 'react'
import { render } from '@testing-library/react'
import { Square } from '@/components/geometry/Square'
import type { SquareData } from '@/types/geometry'

const baseData: SquareData = {
  side: 5,
  showDiagonals: true,
}

describe('Square', () => {
  it('renders without crashing', () => {
    const { container } = render(<Square data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to geometry subject', () => {
    const { container } = render(<Square data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<Square data={baseData} subject="math" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<Square data={baseData} complexity="elementary" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG with responsive width and correct viewBox', () => {
    const { container } = render(<Square data={baseData} width={400} height={400} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '100%')
    expect(svg).toHaveAttribute('height', '400')
    expect(svg).toHaveAttribute('viewBox', '0 0 400 400')
  })

  it('renders step-by-step when enabled', () => {
    const { container } = render(<Square data={{ ...baseData, showCalculations: true }} showStepByStep />)
    expect(container.querySelector('.border-l-2')).toBeInTheDocument()
  })

  it('supports Hebrew language', () => {
    const { container } = render(<Square data={baseData} language="he" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(<Square data={baseData} className="custom" />)
    expect(container.firstChild).toHaveClass('custom')
  })
})
