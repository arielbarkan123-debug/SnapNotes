/**
 * Render tests for ProbabilityTree component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { ProbabilityTree } from '@/components/math/ProbabilityTree'
import type { ProbabilityTreeData } from '@/types/math'

const mockData: ProbabilityTreeData = {
  levels: [
    {
      branches: [
        { label: 'Heads', probability: 0.5, children: [0, 1] },
        { label: 'Tails', probability: 0.5, children: [2, 3] },
      ],
    },
    {
      branches: [
        { label: 'Heads', probability: 0.5 },
        { label: 'Tails', probability: 0.5 },
        { label: 'Heads', probability: 0.5 },
        { label: 'Tails', probability: 0.5 },
      ],
    },
  ],
  outcomes: [
    { path: ['Heads', 'Heads'], probability: 0.25 },
    { path: ['Heads', 'Tails'], probability: 0.25 },
    { path: ['Tails', 'Heads'], probability: 0.25 },
    { path: ['Tails', 'Tails'], probability: 0.25 },
  ],
  title: 'Two Coin Flips',
}

describe('ProbabilityTree', () => {
  it('renders without crashing', () => {
    const { container } = render(<ProbabilityTree data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<ProbabilityTree data={mockData} />)
    expect(screen.getByTestId('probability-tree')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<ProbabilityTree data={mockData} />)
    expect(screen.getByTestId('pt-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<ProbabilityTree data={mockData} initialStep={1} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders single-level tree', () => {
    const singleLevel: ProbabilityTreeData = {
      levels: [
        {
          branches: [
            { label: 'Red', probability: 0.3 },
            { label: 'Blue', probability: 0.5 },
            { label: 'Green', probability: 0.2 },
          ],
        },
      ],
      title: 'Single event',
    }
    const { container } = render(<ProbabilityTree data={singleLevel} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders an svg element', () => {
    const { container } = render(<ProbabilityTree data={mockData} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
