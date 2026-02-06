/**
 * Render tests for BoxPlot component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { BoxPlot } from '@/components/math/BoxPlot'
import type { BoxPlotData } from '@/types/math'

const mockData: BoxPlotData = {
  min: 10,
  q1: 25,
  median: 35,
  q3: 50,
  max: 70,
  title: 'Test Scores',
  showLabels: true,
}

describe('BoxPlot', () => {
  it('renders without crashing', () => {
    const { container } = render(<BoxPlot data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<BoxPlot data={mockData} />)
    expect(screen.getByTestId('box-plot')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<BoxPlot data={mockData} />)
    expect(screen.getByTestId('bp-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<BoxPlot data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with outliers', () => {
    const outlierData: BoxPlotData = {
      ...mockData,
      outliers: [2, 90, 95],
    }
    const { container } = render(<BoxPlot data={outlierData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without title', () => {
    const noTitleData: BoxPlotData = {
      min: 0,
      q1: 10,
      median: 20,
      q3: 30,
      max: 40,
      title: '',
    }
    const { container } = render(<BoxPlot data={noTitleData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders an svg element', () => {
    const { container } = render(<BoxPlot data={mockData} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
