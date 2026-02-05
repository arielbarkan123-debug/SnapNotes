import { render } from '@testing-library/react'
import { CoordinatePlane } from '@/components/math/CoordinatePlane'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    path: (props: any) => <path {...props} />,
    line: (props: any) => <line {...props} />,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
  },
}))

// Mock mathjs
jest.mock('mathjs', () => ({
  parse: (expr: string) => ({
    evaluate: ({ x }: { x: number }) => {
      if (expr.includes('x^2')) return x * x
      if (expr === 'x') return x
      return 0
    },
  }),
}))

// Mock diagram-animations
jest.mock('@/lib/diagram-animations', () => ({
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
  prefersReducedMotion: () => true,
}))

describe('CoordinatePlane', () => {
  const baseData = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    showGrid: true,
  }

  it('renders without crashing', () => {
    const { container } = render(<CoordinatePlane data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <CoordinatePlane data={baseData} subject="geometry" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(
      <CoordinatePlane data={{ ...baseData, title: 'y = x\u00b2' }} />
    )
    expect(container.textContent).toContain('y = x\u00b2')
  })

  it('uses subject color as default for points without explicit color', () => {
    const data = {
      ...baseData,
      points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
    }
    const { container } = render(
      <CoordinatePlane data={data} subject="geometry" />
    )
    // Geometry primary is #ec4899 — used for point fill
    const circles = container.querySelectorAll('circle')
    const geoCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#ec4899'
    )
    expect(geoCircle).toBeTruthy()
  })

  it('preserves explicit point colors over subject color', () => {
    const data = {
      ...baseData,
      points: [{ id: 'p1', x: 1, y: 1, label: 'P', color: '#ff0000' }],
    }
    const { container } = render(
      <CoordinatePlane data={data} subject="geometry" />
    )
    const circles = container.querySelectorAll('circle')
    const redCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#ff0000'
    )
    expect(redCircle).toBeTruthy()
  })

  it('uses adaptive line weight for axes', () => {
    const { container } = render(
      <CoordinatePlane data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const axes = container.querySelectorAll('line')
    const thickAxis = Array.from(axes).find(
      (l) => l.getAttribute('stroke-width') === '4'
    )
    expect(thickAxis).toBeTruthy()
  })

  it('uses default middle_school line weight without complexity prop', () => {
    const { container } = render(
      <CoordinatePlane data={baseData} />
    )
    // middle_school line weight is 3
    const axes = container.querySelectorAll('line')
    const axis = Array.from(axes).find(
      (l) => l.getAttribute('stroke-width') === '3'
    )
    expect(axis).toBeTruthy()
  })
})
