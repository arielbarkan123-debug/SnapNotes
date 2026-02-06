/**
 * Render tests for VennDiagram component
 */
import React from 'react'
import { render, screen } from '@testing-library/react'
import './setup'
import { VennDiagram } from '@/components/math/VennDiagram'
import type { VennDiagramData } from '@/types/math'

const mockData: VennDiagramData = {
  sets: [
    { label: 'Set A', elements: ['1', '2', '3', '5'], color: '#3b82f6' },
    { label: 'Set B', elements: ['3', '4', '5', '6'], color: '#ef4444' },
  ],
  intersections: [
    { setIndices: [0, 1], elements: ['3', '5'] },
  ],
  title: 'Two-set Venn',
}

describe('VennDiagram', () => {
  it('renders without crashing', () => {
    const { container } = render(<VennDiagram data={mockData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('has the correct data-testid', () => {
    render(<VennDiagram data={mockData} />)
    expect(screen.getByTestId('venn-diagram')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    render(<VennDiagram data={mockData} />)
    expect(screen.getByTestId('vd-title')).toBeInTheDocument()
  })

  it('renders at different step values', () => {
    const { container } = render(<VennDiagram data={mockData} initialStep={2} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders without intersections', () => {
    const noIntersection: VennDiagramData = {
      sets: [
        { label: 'A', elements: ['1', '2'] },
        { label: 'B', elements: ['3', '4'] },
      ],
      title: 'Disjoint sets',
    }
    const { container } = render(<VennDiagram data={noIntersection} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders with universal set', () => {
    const withUniversal: VennDiagramData = {
      ...mockData,
      universalSet: ['1', '2', '3', '4', '5', '6', '7', '8'],
    }
    const { container } = render(<VennDiagram data={withUniversal} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders an svg element', () => {
    const { container } = render(<VennDiagram data={mockData} />)
    expect(container.querySelector('svg')).toBeTruthy()
  })
})
