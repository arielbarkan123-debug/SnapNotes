import { render } from '@testing-library/react'
import { TriangleGeometry } from '@/components/geometry/TriangleGeometry'
import type { TriangleGeometryData } from '@/types/geometry'

// Mutable step state controlled per-test
let mockCurrentStep = 0

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

// Mock useDiagramBase -- returns subject-coded colors and controlled step
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => {
    const mockSubjectColors: Record<string, any> = {
      math: { primary: '#6366f1', accent: '#8b5cf6', light: '#c7d2fe', dark: '#4338ca', bg: '#eef2ff', bgDark: '#1e1b4b', curve: '#818cf8', point: '#6366f1', highlight: '#a5b4fc' },
      physics: { primary: '#f97316', accent: '#ef4444', light: '#fed7aa', dark: '#c2410c', bg: '#fff7ed', bgDark: '#431407', curve: '#fb923c', point: '#f97316', highlight: '#fdba74' },
      geometry: { primary: '#ec4899', accent: '#d946ef', light: '#fbcfe8', dark: '#be185d', bg: '#fdf2f8', bgDark: '#500724', curve: '#f472b6', point: '#ec4899', highlight: '#f9a8d4' },
    }
    const mockLineWeights: Record<string, number> = { elementary: 4, middle_school: 3, high_school: 2, advanced: 2 }
    const colors = mockSubjectColors[opts.subject] || mockSubjectColors.geometry
    return {
      currentStep: mockCurrentStep,
      totalSteps: opts.totalSteps,
      next: jest.fn(),
      prev: jest.fn(),
      goToStep: jest.fn(),
      colors,
      lineWeight: mockLineWeights[opts.complexity] || 3,
      isRTL: opts.language === 'he',
      isFirstStep: mockCurrentStep === 0,
      isLastStep: mockCurrentStep === opts.totalSteps - 1,
      spotlightElement: opts.stepSpotlights?.[mockCurrentStep] ?? null,
      progress: opts.totalSteps > 1 ? mockCurrentStep / (opts.totalSteps - 1) : 1,
      subject: opts.subject || 'geometry',
      complexity: opts.complexity || 'middle_school',
      backgrounds: {
        light: { fill: '#ffffff', grid: '#e5e7eb' },
        dark: { fill: '#1a1a2e', grid: '#2d2d44' },
      },
    }
  },
}))

// Mock DiagramStepControls
jest.mock('@/components/diagrams/DiagramStepControls', () => ({
  DiagramStepControls: (props: any) => (
    <div
      data-testid="diagram-step-controls"
      data-step={props.currentStep}
      data-total={props.totalSteps}
      data-color={props.subjectColor}
    >
      Step {props.currentStep + 1} / {props.totalSteps}
      {props.stepLabel && <span>{props.stepLabel}</span>}
    </div>
  ),
}))

// Mock diagram-animations
jest.mock('@/lib/diagram-animations', () => ({
  createSpotlightVariants: () => ({
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
    spotlight: { opacity: 1 },
  }),
  lineDrawVariants: { hidden: { pathLength: 0 }, visible: { pathLength: 1 } },
  labelAppearVariants: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
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

  beforeEach(() => {
    mockCurrentStep = 0
  })

  it('renders without crashing', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })

  it('renders step controls with step label', () => {
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.textContent).toContain('Draw the triangle')
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

  it('renders vertex labels at step 1', () => {
    mockCurrentStep = 1
    const { container } = render(<TriangleGeometry data={baseData} />)
    expect(container.textContent).toContain('A')
    expect(container.textContent).toContain('B')
    expect(container.textContent).toContain('C')
  })

  it('renders side measurements at step 2', () => {
    mockCurrentStep = 2
    const { container } = render(<TriangleGeometry data={baseData} />)
    // Side labels show "label = value" format
    expect(container.textContent).toContain('a = 5')
    expect(container.textContent).toContain('b = 4')
    expect(container.textContent).toContain('c = 3')
  })
})
