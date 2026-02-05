import { render } from '@testing-library/react'
import { NumberLine } from '@/components/math/NumberLine'

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
  },
  AnimatePresence: ({ children }: any) => children,
}))

// Mock useVisualComplexity to avoid context dependency
jest.mock('@/hooks/useVisualComplexity', () => ({
  useVisualComplexity: ({ forceComplexity }: any = {}) => ({
    complexity: forceComplexity || 'middle_school',
    fontSize: { small: 11, normal: 14, large: 18 },
    showConcreteExamples: forceComplexity === 'elementary',
    colors: { primary: '#6366f1', accent: '#818cf8' },
  }),
  useComplexityAnimations: () => ({
    duration: 400,
    stagger: 50,
    enabled: true,
  }),
}))

// Mock visual-learning to avoid dependency
jest.mock('@/lib/visual-learning', () => ({
  detectCollisions: () => [],
}))

// Mock visual-complexity constants
jest.mock('@/lib/visual-complexity', () => ({
  CONCRETE_ICONS: { apple: '🍎', star: '⭐' },
}))

describe('NumberLine', () => {
  const baseData = {
    min: -5,
    max: 5,
    points: [{ value: 2, label: '2', style: 'filled' as const }],
    intervals: [],
  }

  it('renders without crashing', () => {
    const { container } = render(<NumberLine data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('accepts subject prop', () => {
    const { container } = render(
      <NumberLine data={baseData} subject="physics" />
    )
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('uses subject color for filled points when subject provided', () => {
    const { container } = render(
      <NumberLine data={baseData} subject="physics" />
    )
    // Physics primary color is #f97316
    const circles = container.querySelectorAll('circle')
    const filledCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#f97316'
    )
    expect(filledCircle).toBeTruthy()
  })

  it('uses math subject color by default', () => {
    const { container } = render(
      <NumberLine data={baseData} />
    )
    // Math primary is #6366f1
    const circles = container.querySelectorAll('circle')
    const mathCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === '#6366f1'
    )
    expect(mathCircle).toBeTruthy()
  })

  it('renders title when provided', () => {
    const { container } = render(
      <NumberLine data={{ ...baseData, title: 'Test Number Line' }} />
    )
    expect(container.textContent).toContain('Test Number Line')
  })

  it('renders open points correctly', () => {
    const data = {
      ...baseData,
      points: [{ value: 3, label: '3', style: 'open' as const }],
    }
    const { container } = render(<NumberLine data={data} />)
    const circles = container.querySelectorAll('circle')
    const hollowCircle = Array.from(circles).find(
      (c) => c.getAttribute('fill') === 'white'
    )
    expect(hollowCircle).toBeTruthy()
  })

  it('uses adaptive line weight for main line with elementary complexity', () => {
    const { container } = render(
      <NumberLine data={baseData} complexity="elementary" />
    )
    // Elementary line weight is 4
    const lines = container.querySelectorAll('line')
    const thickLine = Array.from(lines).find(
      (l) => l.getAttribute('stroke-width') === '4'
    )
    expect(thickLine).toBeTruthy()
  })

  it('uses default middle_school line weight without complexity prop', () => {
    const { container } = render(
      <NumberLine data={baseData} />
    )
    // middle_school line weight is 3
    const lines = container.querySelectorAll('line')
    const defaultLine = Array.from(lines).find(
      (l) => l.getAttribute('stroke-width') === '3'
    )
    expect(defaultLine).toBeTruthy()
  })

  it('uses subject color for interval default colors', () => {
    const data = {
      min: 0,
      max: 10,
      points: [],
      intervals: [{ start: 2, end: 5, startInclusive: true, endInclusive: false }],
    }
    const { container } = render(
      <NumberLine data={data} subject="geometry" />
    )
    // Geometry primary is #ec4899 — should be used for intervals without explicit color
    const rects = container.querySelectorAll('rect')
    const intervalRect = Array.from(rects).find(
      (r) => r.getAttribute('fill') === '#ec4899'
    )
    expect(intervalRect).toBeTruthy()
  })
})
