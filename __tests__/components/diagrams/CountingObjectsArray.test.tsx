/**
 * Render tests for CountingObjectsArray component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { CountingObjectsArray } from '@/components/math/CountingObjectsArray'
import type { CountingObjectsData } from '@/types/math'

const mockData: CountingObjectsData = {
  objects: [
    { type: 'circle', count: 3, color: '#3b82f6' },
    { type: 'star', count: 4, color: '#ef4444' },
  ],
  operation: 'add',
  total: 7,
  title: 'Adding shapes',
  groupSize: 5,
}

describe('CountingObjectsArray', () => {
  it('renders without crashing', () => {
    const { container } = render(<CountingObjectsArray data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<CountingObjectsArray data={mockData} />)
    expect(screen.getByTestId('counting-objects-array')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<CountingObjectsArray data={mockData} />)
    expect(screen.getByTestId('coa-title')).toBeInTheDocument()
  })

  it('renders background rect', () => {
    render(<CountingObjectsArray data={mockData} />)
    expect(screen.getByTestId('coa-background')).toBeInTheDocument()
  })

  it('renders at step 0 with grid visible', () => {
    render(<CountingObjectsArray data={mockData} currentStep={0} />)
    expect(screen.getByTestId('coa-grid')).toBeInTheDocument()
  })

  it('renders with count operation', () => {
    const countData: CountingObjectsData = {
      objects: [{ type: 'square', count: 6 }],
      operation: 'count',
      total: 6,
    }
    const { container } = render(<CountingObjectsArray data={countData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<CountingObjectsArray data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
