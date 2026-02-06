/**
 * Render tests for BarModel component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { BarModel } from '@/components/math/BarModel'
import type { BarModelData } from '@/types/math'

const mockData: BarModelData = {
  parts: [
    { value: 30, label: 'Part A', color: '#6366f1' },
    { value: 20, label: 'Part B', color: '#f59e0b' },
  ],
  total: 50,
  operation: 'add',
  title: 'Addition Bar Model',
}

describe('BarModel', () => {
  it('renders without crashing', () => {
    const { container } = render(<BarModel data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<BarModel data={mockData} />)
    expect(screen.getByTestId('bar-model')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<BarModel data={mockData} />)
    expect(screen.getByTestId('bm-title')).toBeInTheDocument()
  })

  it('renders background rect', () => {
    render(<BarModel data={mockData} />)
    expect(screen.getByTestId('bm-background')).toBeInTheDocument()
  })

  it('renders bar outline at step 0', () => {
    render(<BarModel data={mockData} currentStep={0} />)
    expect(screen.getByTestId('bm-outline')).toBeInTheDocument()
  })

  it('renders with unknown part', () => {
    const unknownData: BarModelData = {
      parts: [
        { value: 30, label: 'Known' },
        { value: 20, label: '?' },
      ],
      total: 50,
      operation: 'subtract',
      unknownPart: 1,
    }
    const { container } = render(<BarModel data={unknownData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<BarModel data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
    expect(svg.getAttribute('aria-label')).toContain('50')
  })
})
