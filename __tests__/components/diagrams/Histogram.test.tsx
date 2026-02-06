/**
 * Render tests for Histogram component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { Histogram } from '@/components/math/Histogram'
import type { HistogramData } from '@/types/math'

const mockData: HistogramData = {
  bins: [
    { min: 0, max: 10, count: 3 },
    { min: 10, max: 20, count: 7 },
    { min: 20, max: 30, count: 12 },
    { min: 30, max: 40, count: 5 },
    { min: 40, max: 50, count: 2 },
  ],
  title: 'Student Scores',
  xAxisLabel: 'Score',
  yAxisLabel: 'Frequency',
}

describe('Histogram', () => {
  it('renders without crashing', () => {
    const { container } = render(<Histogram data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<Histogram data={mockData} />)
    expect(screen.getByTestId('histogram')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<Histogram data={mockData} />)
    expect(screen.getByTestId('hist-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<Histogram data={mockData} initialStep={1} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with single bin', () => {
    const singleBin: HistogramData = {
      bins: [{ min: 0, max: 100, count: 25 }],
      title: 'Single bin',
    }
    const { container } = render(<Histogram data={singleBin} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders an svg element', () => {
    const { container } = render(<Histogram data={mockData} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
