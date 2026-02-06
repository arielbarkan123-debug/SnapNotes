/**
 * Render tests for TenFrame component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { TenFrame } from '@/components/math/TenFrame'
import type { TenFrameData } from '@/types/math'

const mockData: TenFrameData = {
  filled: 7,
  total: 10,
  color: '#6366f1',
  title: 'Counting to 7',
}

describe('TenFrame', () => {
  it('renders without crashing', () => {
    const { container } = render(<TenFrame data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<TenFrame data={mockData} />)
    expect(screen.getByTestId('ten-frame')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<TenFrame data={mockData} />)
    expect(screen.getByTestId('tf-title')).toBeInTheDocument()
  })

  it('renders without title', () => {
    const dataNoTitle: TenFrameData = { filled: 5, total: 10 }
    render(<TenFrame data={dataNoTitle} />)
    expect(screen.queryByTestId('tf-title')).not.toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<TenFrame data={mockData} currentStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with double frame (total=20)', () => {
    const doubleData: TenFrameData = { filled: 15, total: 20, title: 'Double frame' }
    const { container } = render(<TenFrame data={doubleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<TenFrame data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
    expect(svg.getAttribute('aria-label')).toContain('7')
  })
})
