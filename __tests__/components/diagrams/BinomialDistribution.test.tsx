/**
 * Render tests for BinomialDistribution component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { BinomialDistribution } from '@/components/math/BinomialDistribution'
import type { BinomialDistributionData } from '@/types/math'

const mockData: BinomialDistributionData = {
  n: 10,
  p: 0.5,
  highlightK: 5,
  showMean: true,
  showStd: true,
  title: 'Binomial(10, 0.5)',
}

describe('BinomialDistribution', () => {
  it('renders without crashing', () => {
    const { container } = render(<BinomialDistribution data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<BinomialDistribution data={mockData} />)
    expect(screen.getByTestId('binomial-distribution')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<BinomialDistribution data={mockData} />)
    expect(screen.getByTestId('bd-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<BinomialDistribution data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without highlight', () => {
    const noHighlight: BinomialDistributionData = {
      n: 5,
      p: 0.3,
      title: 'No highlight',
    }
    const { container } = render(<BinomialDistribution data={noHighlight} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with edge case p=0', () => {
    const edgeCase: BinomialDistributionData = {
      n: 4,
      p: 0,
      title: 'p = 0',
    }
    const { container } = render(<BinomialDistribution data={edgeCase} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with large n', () => {
    const largeN: BinomialDistributionData = {
      n: 20,
      p: 0.5,
      showMean: true,
      title: 'Large n',
    }
    const { container } = render(<BinomialDistribution data={largeN} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has an accessible aria-label on the svg', () => {
    render(<BinomialDistribution data={mockData} />)
    const svg = screen.getByRole('img')
    expect(svg).toHaveAttribute('aria-label')
  })
})
