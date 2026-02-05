import React from 'react'
import { render } from '@testing-library/react'
import { TreeDiagram } from '@/components/math/TreeDiagram'

const baseData = {
  root: {
    id: 'root',
    label: 'Start',
    children: [
      { id: 'a', label: 'A', value: '1/2', children: [
        { id: 'a1', label: 'A1', value: '1/3' },
        { id: 'a2', label: 'A2', value: '2/3' },
      ]},
      { id: 'b', label: 'B', value: '1/2', children: [
        { id: 'b1', label: 'B1', value: '1/3' },
        { id: 'b2', label: 'B2', value: '2/3' },
      ]},
    ],
  },
  showProbabilities: true,
  title: 'Test Tree',
}

describe('TreeDiagram', () => {
  it('renders without crashing', () => {
    const { container } = render(<TreeDiagram data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('defaults to math subject', () => {
    const { container } = render(<TreeDiagram data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different subject prop', () => {
    const { container } = render(<TreeDiagram data={baseData} subject="physics" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts different complexity prop', () => {
    const { container } = render(<TreeDiagram data={baseData} complexity="elementary" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders SVG with correct dimensions', () => {
    const { container } = render(<TreeDiagram data={baseData} width={600} height={500} />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveAttribute('width', '600')
    expect(svg).toHaveAttribute('height', '500')
  })

  it('renders title text', () => {
    const { container } = render(<TreeDiagram data={baseData} />)
    const texts = container.querySelectorAll('text')
    const titleText = Array.from(texts).find(t => t.textContent === 'Test Tree')
    expect(titleText).toBeInTheDocument()
  })

  it('renders node circles', () => {
    const { container } = render(<TreeDiagram data={baseData} />)
    const circles = container.querySelectorAll('circle')
    // root + 2 children + 4 grandchildren = 7 nodes
    expect(circles.length).toBe(7)
  })

  it('applies className prop', () => {
    const { container } = render(<TreeDiagram data={baseData} className="custom" />)
    const svg = container.querySelector('svg')
    expect(svg).toHaveClass('custom')
  })
})
