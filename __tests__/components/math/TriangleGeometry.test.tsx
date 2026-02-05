import { render } from '@testing-library/react'
import { TriangleGeometry } from '@/components/geometry/TriangleGeometry'
import type { TriangleGeometryData } from '@/types/geometry'

jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    line: (props: any) => <line {...props} />,
    path: (props: any) => <path {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    rect: (props: any) => <rect {...props} />,
    polygon: (props: any) => <polygon {...props} />,
  },
  AnimatePresence: ({ children }: any) => children,
}))

describe('TriangleGeometry', () => {
  const baseData: TriangleGeometryData = {
    type: 'scalene',
    vertices: [
      { x: 0, y: 0, label: 'A' },
      { x: 4, y: 0, label: 'B' },
      { x: 2, y: 3, label: 'C' },
    ],
    sides: {
      a: 5,
      b: 4,
      c: 3,
    },
    title: 'Test Triangle',
  }

  it('renders without crashing', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.textContent).toContain('Test Triangle')
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <TriangleGeometry data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for geometry fill (default geometry = #ec4899)', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    // Default subject is 'geometry', primary color is #ec4899
    const paths = container.querySelectorAll('path')
    const fillPath = Array.from(paths).find(
      (p) => p.getAttribute('fill') === '#ec4899'
    )
    expect(fillPath).toBeTruthy()
  })

  it('uses subject color for physics (#f97316)', () => {
    const { container } = render(
      <TriangleGeometry data={baseData} subject="physics" />
    )
    // Physics primary is #f97316
    const paths = container.querySelectorAll('path')
    const fillPath = Array.from(paths).find(
      (p) => p.getAttribute('fill') === '#f97316'
    )
    expect(fillPath).toBeTruthy()
  })

  it('uses adaptive line weight with elementary (strokeWidth = 4)', () => {
    const { container } = render(
      <TriangleGeometry data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const paths = container.querySelectorAll('path')
    const outlinePath = Array.from(paths).find(
      (p) =>
        p.getAttribute('stroke-width') === '4' &&
        p.getAttribute('stroke') === 'currentColor'
    )
    expect(outlinePath).toBeTruthy()
  })

  it('renders vertex labels', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.textContent).toContain('A')
    expect(container.textContent).toContain('B')
    expect(container.textContent).toContain('C')
  })

  it('renders side measurements when provided', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    // Side labels show "label = value" format
    expect(container.textContent).toContain('a = 5')
    expect(container.textContent).toContain('b = 4')
    expect(container.textContent).toContain('c = 3')
  })
})
