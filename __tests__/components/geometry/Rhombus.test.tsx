import React from 'react'
import { render } from '@testing-library/react'
import { Rhombus } from '@/components/geometry/Rhombus'
import type { RhombusData } from '@/types/geometry'

const baseData: RhombusData = {
  side: 0,
  diagonal1: 10,
  diagonal2: 6,
  showDiagonals: true,
}

describe('Rhombus', () => {
  it('renders without crashing', () => {
    const { container } = render(<Rhombus data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to geometry subject', () => {
    const { container } = render(<Rhombus data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<Rhombus data={baseData} subject="physics" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<Rhombus data={baseData} complexity="advanced" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG with correct dimensions', () => {
    const { container } = render(<Rhombus data={baseData} width={400} height={400} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '100%')
    expect(svg).toHaveAttribute('viewBox', '0 0 400 400')
  })

  it('renders step-by-step when enabled', () => {
    const { container } = render(<Rhombus data={{ ...baseData, showCalculations: true }} showStepByStep />)
    expect(container.querySelector('.border-l-2')).toBeInTheDocument()
  })

  it('supports Hebrew language', () => {
    const { container } = render(<Rhombus data={baseData} language="he" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('applies className prop', () => {
    const { container } = render(<Rhombus data={baseData} className="custom" />)
    expect(container.firstChild).toHaveClass('custom')
  })
})
