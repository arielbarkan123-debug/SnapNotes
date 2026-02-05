import { render, screen } from '@testing-library/react'
import { TriangleGeometry } from '@/components/geometry/TriangleGeometry'
import type { TriangleGeometryData } from '@/types/geometry'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion -- all SVG motion elements render as plain SVG
jest.mock('framer-motion', () => ({
  motion: {
    svg: ({ children, ...props }: any) => <svg {...props}>{children}</svg>,
    g: ({ children, ...props }: any) => <g {...props}>{children}</g>,
    circle: (props: any) => <circle {...props} />,
    text: ({ children, ...props }: any) => <text {...props}>{children}</text>,
    path: (props: any) => <path {...props} />,
    polygon: (props: any) => <polygon {...props} />,
    line: (props: any) => <line {...props} />,
    rect: (props: any) => <rect {...props} />,
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

// =============================================================================
// Tests
// =============================================================================

describe('TriangleGeometry', () => {
  const baseData: TriangleGeometryData = {
    type: 'scalene',
    vertices: [
      { x: 0, y: 0, label: 'A' },
      { x: 6, y: 0, label: 'B' },
      { x: 3, y: 5, label: 'C' },
    ] as [any, any, any],
    sides: { a: 5, b: 5.83, c: 6 },
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="triangle-geometry"', () => {
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('triangle-geometry')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('tg-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<TriangleGeometry data={baseData} width={500} />)
      const container = screen.getByTestId('triangle-geometry')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('500px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<TriangleGeometry data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows outline at step 0', () => {
      mockCurrentStep = 0
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('tg-outline')).toBeInTheDocument()
    })

    it('hides vertices at step 0', () => {
      mockCurrentStep = 0
      render(<TriangleGeometry data={baseData} />)
      expect(screen.queryByTestId('tg-vertices')).not.toBeInTheDocument()
    })

    it('shows vertices at step 1', () => {
      mockCurrentStep = 1
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('tg-vertices')).toBeInTheDocument()
    })

    it('hides measurements at step 1', () => {
      mockCurrentStep = 1
      render(<TriangleGeometry data={baseData} />)
      expect(screen.queryByTestId('tg-measurements')).not.toBeInTheDocument()
    })

    it('shows measurements at step 2', () => {
      mockCurrentStep = 2
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('tg-measurements')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('tg-outline')).toBeInTheDocument()
      expect(screen.getByTestId('tg-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('tg-measurements')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<TriangleGeometry data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (outline + vertices + measurements = 3)', () => {
      render(<TriangleGeometry data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<TriangleGeometry data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes constructions step when altitude is present', () => {
      const dataWithAltitude: TriangleGeometryData = {
        ...baseData,
        height: { value: 5, from: 'C', showLine: true },
      }
      render(<TriangleGeometry data={dataWithAltitude} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // outline + vertices + measurements + constructions = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses geometry colors by default', () => {
      mockCurrentStep = 1
      render(<TriangleGeometry data={baseData} />)
      const { container } = render(<TriangleGeometry data={baseData} />)
      // Vertex circles should use geometry primary
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#ec4899'
      )
      expect(primaryCircle).toBeTruthy()
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 1
      const { container } = render(<TriangleGeometry data={baseData} subject="physics" />)
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#f97316'
      )
      expect(primaryCircle).toBeTruthy()
    })

    it('uses math colors when subject="math"', () => {
      mockCurrentStep = 1
      const { container } = render(<TriangleGeometry data={baseData} subject="math" />)
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#6366f1'
      )
      expect(primaryCircle).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Constructions
  // ---------------------------------------------------------------------------

  describe('constructions', () => {
    const dataWithAltitude: TriangleGeometryData = {
      ...baseData,
      height: { value: 5, from: 'C', showLine: true },
    }

    it('shows constructions at correct step', () => {
      // outline(0), vertices(1), measurements(2), constructions(3)
      mockCurrentStep = 3
      render(<TriangleGeometry data={dataWithAltitude} />)
      expect(screen.getByTestId('tg-constructions')).toBeInTheDocument()
    })

    it('hides constructions before their step', () => {
      mockCurrentStep = 2
      render(<TriangleGeometry data={dataWithAltitude} />)
      expect(screen.queryByTestId('tg-constructions')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData: TriangleGeometryData = {
      ...baseData,
      angles: { A: 60, B: 60, C: 60 },
      highlightAngles: ['A'],
    }

    it('shows errors at correct step', () => {
      // outline(0), vertices(1), measurements(2), errors(3)
      mockCurrentStep = 3
      render(<TriangleGeometry data={errorData} />)
      expect(screen.getByTestId('tg-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<TriangleGeometry data={errorData} />)
      expect(screen.queryByTestId('tg-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid
  // ---------------------------------------------------------------------------

  describe('data-testid', () => {
    it('has all required test ids when fully revealed', () => {
      const fullData: TriangleGeometryData = {
        ...baseData,
        height: { value: 5, from: 'C', showLine: true },
        angles: { A: 60, B: 60, C: 60 },
        highlightAngles: ['A'],
      }
      // Set to last step (outline + vertices + measurements + constructions + errors = 5)
      mockCurrentStep = 4
      render(<TriangleGeometry data={fullData} />)
      expect(screen.getByTestId('triangle-geometry')).toBeInTheDocument()
      expect(screen.getByTestId('tg-background')).toBeInTheDocument()
      expect(screen.getByTestId('tg-outline')).toBeInTheDocument()
      expect(screen.getByTestId('tg-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('tg-measurements')).toBeInTheDocument()
      expect(screen.getByTestId('tg-constructions')).toBeInTheDocument()
      expect(screen.getByTestId('tg-errors')).toBeInTheDocument()
    })
  })
})
