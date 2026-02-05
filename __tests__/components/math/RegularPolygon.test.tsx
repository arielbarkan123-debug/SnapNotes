import { render } from '@testing-library/react'
import { RegularPolygon } from '@/components/geometry/RegularPolygon'
import type { RegularPolygonData } from '@/types/geometry'

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

describe('RegularPolygon', () => {
  const baseData: RegularPolygonData = {
    sides: 6,
    sideLength: 5,
    title: 'Regular Hexagon',
  }

  it('renders without crashing', () => {
    const { container } = render(<RegularPolygon data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided', () => {
    const { container } = render(<RegularPolygon data={baseData} />)
    expect(container.textContent).toContain('Regular Hexagon')
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <RegularPolygon data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for polygon fill (default geometry = #ec4899)', () => {
    const { container } = render(<RegularPolygon data={baseData} />)
    // Geometry primary is #ec4899
    const paths = container.querySelectorAll('path')
    const fillPath = Array.from(paths).find(
      (p) => p.getAttribute('fill') === '#ec4899'
    )
    expect(fillPath).toBeTruthy()
  })

  it('uses subject color for physics (#f97316)', () => {
    const { container } = render(
      <RegularPolygon data={baseData} subject="physics" />
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
      <RegularPolygon data={baseData} complexity="elementary" />
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

  it('renders vertex labels when provided', () => {
    const { container } = render(<RegularPolygon data={baseData} />)
    // Hexagon has 6 vertices, but only first 6 are labeled (all in this case)
    expect(container.textContent).toContain('A')
    expect(container.textContent).toContain('B')
    expect(container.textContent).toContain('C')
    expect(container.textContent).toContain('D')
    expect(container.textContent).toContain('E')
    expect(container.textContent).toContain('F')
  })

  it('renders polygon type info', () => {
    const dataWithoutTitle: RegularPolygonData = {
      sides: 5,
      sideLength: 4,
    }
    const { container } = render(<RegularPolygon data={dataWithoutTitle} />)
    // Without a title, the component uses the polygon name lookup
    expect(container.textContent).toContain('Regular Pentagon')
  })
})
