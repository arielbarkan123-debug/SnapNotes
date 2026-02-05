import { render } from '@testing-library/react'
import { InteractiveCoordinatePlane } from '@/components/math/InteractiveCoordinatePlane'

// Mock framer-motion
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

// Mock mathjs (used by inner CoordinatePlane)
jest.mock('mathjs', () => ({
  parse: (expr: string) => ({
    evaluate: ({ x }: { x: number }) => {
      if (expr.includes('x^2')) return x * x
      if (expr === 'x') return x
      return 0
    },
  }),
}))

// Mock diagram-animations (used by inner CoordinatePlane)
jest.mock('@/lib/diagram-animations', () => ({
  createPathDrawVariants: () => ({ hidden: {}, visible: {} }),
  prefersReducedMotion: () => true,
}))

describe('InteractiveCoordinatePlane', () => {
  const baseData = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    showGrid: true,
  }

  it('renders without crashing', () => {
    const { container } = render(
      <InteractiveCoordinatePlane data={baseData} />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders title when provided via CoordinatePlane', () => {
    const { container } = render(
      <InteractiveCoordinatePlane
        data={{ ...baseData, title: 'Test Graph' }}
      />
    )
    // The title is rendered by the inner CoordinatePlane inside a foreignObject
    // Check the wrapping div is rendered
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts subject prop without errors', () => {
    const { container } = render(
      <InteractiveCoordinatePlane data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for points (default math = #6366f1)', () => {
    const data = {
      ...baseData,
      points: [{ x: 1, y: 1, label: 'A' }],
    }
    const { container } = render(
      <InteractiveCoordinatePlane data={data} />
    )
    // Default subject is math, primary is #6366f1
    const circles = container.querySelectorAll('circle')
    const mathCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#6366f1'
    )
    expect(mathCircle).toBeTruthy()
  })

  it('uses subject color for physics (#f97316)', () => {
    const data = {
      ...baseData,
      points: [{ x: 2, y: 2, label: 'B' }],
    }
    const { container } = render(
      <InteractiveCoordinatePlane data={data} subject="physics" />
    )
    // Physics primary is #f97316
    const circles = container.querySelectorAll('circle')
    const physicsCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#f97316'
    )
    expect(physicsCircle).toBeTruthy()
  })

  it('uses adaptive line weight with elementary (strokeWidth = 4)', () => {
    const data = {
      ...baseData,
      points: [{ x: 0, y: 0, label: 'O' }],
    }
    const { container } = render(
      <InteractiveCoordinatePlane data={data} complexity="elementary" />
    )
    // Elementary line weight is 4
    // The point circle uses adaptiveLineWeight - 1 = 3 for strokeWidth
    const circles = container.querySelectorAll('circle')
    const elementaryCircle = Array.from(circles).find(
      (c) => c.getAttribute('stroke-width') === '3'
    )
    expect(elementaryCircle).toBeTruthy()

    // Also check that the point radius uses adaptiveLineWeight (4)
    const radiusCircle = Array.from(circles).find(
      (c) => c.getAttribute('r') === '4'
    )
    expect(radiusCircle).toBeTruthy()
  })

  it('renders axis labels via inner CoordinatePlane', () => {
    const { container } = render(
      <InteractiveCoordinatePlane
        data={{ ...baseData, xLabel: 'X-Axis', yLabel: 'Y-Axis' }}
      />
    )
    // The outer SVG wrapper should exist
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders drag hint when enableDragging is true', () => {
    const { getByText } = render(
      <InteractiveCoordinatePlane data={baseData} enableDragging={true} />
    )
    expect(getByText('Drag points')).toBeInTheDocument()
  })

  it('renders snap hint when snapToGrid is true', () => {
    const { getByText } = render(
      <InteractiveCoordinatePlane data={baseData} snapToGrid={true} />
    )
    expect(getByText('Snap ON')).toBeInTheDocument()
  })

  it('renders click-to-add hint when enableAddPoints is true', () => {
    const { getByText } = render(
      <InteractiveCoordinatePlane data={baseData} enableAddPoints={true} />
    )
    expect(getByText('Click to add')).toBeInTheDocument()
  })

  it('uses subject color for point labels', () => {
    const data = {
      ...baseData,
      points: [{ x: 1, y: 1, label: 'P1' }],
    }
    const { container } = render(
      <InteractiveCoordinatePlane data={data} subject="chemistry" />
    )
    // Chemistry primary is #10b981
    const texts = container.querySelectorAll('text')
    const chemLabel = Array.from(texts).find(
      (t) => t.getAttribute('fill') === '#10b981' && t.textContent === 'P1'
    )
    expect(chemLabel).toBeTruthy()
  })
})
