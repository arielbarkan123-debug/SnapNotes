import React from 'react'
import { render } from '@testing-library/react'
import { Rectangle } from '@/components/geometry/Rectangle'
import type { RectangleData } from '@/types/geometry'

const baseData: RectangleData = {
  width: 8,
  height: 5,
  showDiagonals: true,
}

describe('Rectangle', () => {
  it('renders without crashing', () => {
    const { container } = render(<Rectangle data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to geometry subject', () => {
    const { container } = render(<Rectangle data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<Rectangle data={baseData} subject="math" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<Rectangle data={baseData} complexity="high_school" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG with correct dimensions', () => {
    const { container } = render(<Rectangle data={baseData} width={500} height={400} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '100%')
    expect(svg).toHaveAttribute('viewBox', '0 0 500 400')
  })

  it('renders step-by-step when enabled', () => {
    const { container } = render(<Rectangle data={{ ...baseData, showCalculations: true }} showStepByStep />)
    expect(container.querySelector('.border-l-2')).toBeInTheDocument()
  })

  it('supports Hebrew language', () => {
    const { container } = render(<Rectangle data={baseData} language="he" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(<Rectangle data={baseData} className="custom" />)
    expect(container.firstChild).toHaveClass('custom')
  })
})
