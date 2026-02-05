import { render } from '@testing-library/react'
import { Triangle } from '@/components/math/Triangle'
import type { TriangleDataWithErrors } from '@/types'

jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    line: (props: any) => <line {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    rect: (props: any) => <rect {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('Triangle', () => {
  const baseData: TriangleDataWithErrors = {
    vertices: [
      { x: 0, y: 0, label: 'A' },
      { x: 4, y: 0, label: 'B' },
      { x: 2, y: 3, label: 'C' },
    ],
    sides: [
      { from: 'A', to: 'B', length: '4' },
    ],
    angles: [],
    title: 'Triangle ABC',
  }

  it('renders without crashing', () => {
    const { container } = render(<Triangle data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<Triangle data={baseData} />)
    expect(container.textContent).toContain('Triangle ABC')
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <Triangle data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for triangle fill', () => {
    const { container } = render(
      <Triangle data={baseData} subject="physics" />
    )
    // Physics primary is #f97316
    const paths = container.querySelectorAll('path')
    const fillPath = Array.from(paths).find(
      (p) => p.getAttribute('fill') === '#f97316'
    )
    expect(fillPath).toBeTruthy()
  })

  it('uses default geometry subject color', () => {
    const { container } = render(<Triangle data={baseData} />)
    // Geometry primary is #ec4899 (default for triangle)
    const paths = container.querySelectorAll('path')
    const fillPath = Array.from(paths).find(
      (p) => p.getAttribute('fill') === '#ec4899'
    )
    expect(fillPath).toBeTruthy()
  })

  it('uses adaptive line weight for triangle outline', () => {
    const { container } = render(
      <Triangle data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const paths = container.querySelectorAll('path')
    const outlinePath = Array.from(paths).find(
      (p) => p.getAttribute('stroke-width') === '4' && p.getAttribute('stroke') === 'currentColor'
    )
    expect(outlinePath).toBeTruthy()
  })

  it('renders vertex labels', () => {
    const { container } = render(<Triangle data={baseData} />)
    expect(container.textContent).toContain('A')
    expect(container.textContent).toContain('B')
    expect(container.textContent).toContain('C')
  })

  it('handles insufficient vertex data gracefully', () => {
    const { container } = render(
      <Triangle data={{ vertices: [{ x: 0, y: 0, label: 'A' }] as any, sides: [], angles: [] }} />
    )
    expect(container.textContent).toContain('Insufficient vertex data')
  })
})
