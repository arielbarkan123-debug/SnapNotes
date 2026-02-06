/**
 * Render tests for Base10Blocks component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { Base10Blocks } from '@/components/math/Base10Blocks'
import type { Base10BlocksData } from '@/types/math'

const mockData: Base10BlocksData = {
  number: 253,
  showDecomposition: true,
  title: 'Representing 253',
}

describe('Base10Blocks', () => {
  it('renders without crashing', () => {
    const { container } = render(<Base10Blocks data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<Base10Blocks data={mockData} />)
    expect(screen.getByTestId('base10-blocks')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Base10Blocks data={mockData} />)
    expect(screen.getByTestId('b10-title')).toBeInTheDocument()
  })

  it('renders background rect', () => {
    render(<Base10Blocks data={mockData} />)
    expect(screen.getByTestId('b10-background')).toBeInTheDocument()
  })

  it('renders number display at step 0', () => {
    render(<Base10Blocks data={mockData} currentStep={0} />)
    expect(screen.getByTestId('b10-number')).toBeInTheDocument()
  })

  it('renders with small number (only ones)', () => {
    const smallData: Base10BlocksData = { number: 5, showDecomposition: false }
    const { container } = render(<Base10Blocks data={smallData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with thousands', () => {
    const bigData: Base10BlocksData = {
      number: 1234,
      showDecomposition: true,
      title: 'Big number',
    }
    const { container } = render(<Base10Blocks data={bigData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<Base10Blocks data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
    expect(svg.getAttribute('aria-label')).toContain('253')
  })
})
