import { render, screen } from '@testing-library/react'
import { CoordinatePlane } from '@/components/math/CoordinatePlane'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion — all SVG motion elements render as plain SVG
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

// Mock useDiagramBase — returns subject-coded colors and controlled step
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => {
    const mockSubjectColors: Record<string, any> = {
      math: { primary: '#6366f1', accent: '#8b5cf6', light: '#c7d2fe', dark: '#4338ca', bg: '#eef2ff', bgDark: '#1e1b4b', curve: '#818cf8', point: '#6366f1', highlight: '#a5b4fc' },
      physics: { primary: '#f97316', accent: '#ef4444', light: '#fed7aa', dark: '#c2410c', bg: '#fff7ed', bgDark: '#431407', curve: '#fb923c', point: '#f97316', highlight: '#fdba74' },
      geometry: { primary: '#ec4899', accent: '#d946ef', light: '#fbcfe8', dark: '#be185d', bg: '#fdf2f8', bgDark: '#500724', curve: '#f472b6', point: '#ec4899', highlight: '#f9a8d4' },
    }
    const mockLineWeights: Record<string, number> = { elementary: 4, middle_school: 3, high_school: 2, advanced: 2 }
    const colors = mockSubjectColors[opts.subject] || mockSubjectColors.math
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
      subject: opts.subject || 'math',
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

// =============================================================================
// Tests
// =============================================================================

describe('CoordinatePlane', () => {
  const baseData = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    showGrid: true,
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="coordinate-plane"', () => {
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('coordinate-plane')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<CoordinatePlane data={baseData} width={600} />)
      const container = screen.getByTestId('coordinate-plane')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<CoordinatePlane data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('-5')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })

    it('renders SVG with width="100%"', () => {
      const { container } = render(<CoordinatePlane data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('width')).toBe('100%')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows grid at step 0', () => {
      mockCurrentStep = 0
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-grid')).toBeInTheDocument()
    })

    it('hides axes at step 0', () => {
      mockCurrentStep = 0
      render(<CoordinatePlane data={baseData} />)
      expect(screen.queryByTestId('cp-axes')).not.toBeInTheDocument()
    })

    it('shows axes at step 1', () => {
      mockCurrentStep = 1
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-axes')).toBeInTheDocument()
    })

    it('hides labels at step 1', () => {
      mockCurrentStep = 1
      render(<CoordinatePlane data={baseData} />)
      // Labels are step 2 for base data (grid, axes, labels)
      expect(screen.queryByTestId('cp-labels')).not.toBeInTheDocument()
    })

    it('shows labels at step 2 for base data', () => {
      mockCurrentStep = 2
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-labels')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-grid')).toBeInTheDocument()
      expect(screen.getByTestId('cp-axes')).toBeInTheDocument()
      expect(screen.getByTestId('cp-labels')).toBeInTheDocument()
    })

    it('shows curves at correct step when curves present', () => {
      const dataWithCurves = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2', color: '#ff0000' }],
      }
      // Steps: grid(0), axes(1), curves(2), labels(3)
      mockCurrentStep = 2
      render(<CoordinatePlane data={dataWithCurves} />)
      expect(screen.getByTestId('cp-curves')).toBeInTheDocument()
    })

    it('hides curves before their step', () => {
      const dataWithCurves = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2', color: '#ff0000' }],
      }
      mockCurrentStep = 1
      render(<CoordinatePlane data={dataWithCurves} />)
      expect(screen.queryByTestId('cp-curves')).not.toBeInTheDocument()
    })

    it('shows points at correct step when points present', () => {
      const dataWithPoints = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      // Steps: grid(0), axes(1), points(2), labels(3)
      mockCurrentStep = 2
      render(<CoordinatePlane data={dataWithPoints} />)
      expect(screen.getByTestId('cp-points')).toBeInTheDocument()
    })

    it('hides points before their step', () => {
      const dataWithPoints = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      mockCurrentStep = 1
      render(<CoordinatePlane data={dataWithPoints} />)
      expect(screen.queryByTestId('cp-points')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps for base data (grid + axes + labels = 3)', () => {
      render(<CoordinatePlane data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<CoordinatePlane data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes curves step when curves present', () => {
      const data = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2', color: '#ff0000' }],
      }
      render(<CoordinatePlane data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // grid + axes + curves + labels = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('includes points step when points present', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      render(<CoordinatePlane data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // grid + axes + points + labels = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('includes all optional steps when all data present', () => {
      const data = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2' }],
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
        errorHighlight: {
          wrongPoints: [{ x: 2, y: 2, errorLabel: 'Wrong' }],
        },
      }
      render(<CoordinatePlane data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // grid + axes + curves + points + labels + errors = 6
      expect(controls.getAttribute('data-total')).toBe('6')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default for point fill', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      // Steps: grid(0), axes(1), points(2), labels(3)
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      const point = screen.getByTestId('cp-point-circle-p1')
      expect(point.getAttribute('fill')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} subject="physics" />)
      const point = screen.getByTestId('cp-point-circle-p1')
      expect(point.getAttribute('fill')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} subject="geometry" />)
      const point = screen.getByTestId('cp-point-circle-p1')
      expect(point.getAttribute('fill')).toBe('#ec4899')
    })

    it('preserves explicit point color over subject color', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P', color: '#ff0000' }],
      }
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      const point = screen.getByTestId('cp-point-circle-p1')
      expect(point.getAttribute('fill')).toBe('#ff0000')
    })

    it('uses subject color for curve stroke', () => {
      const data = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2' }],
      }
      // Steps: grid(0), axes(1), curves(2), labels(3)
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      const curve = screen.getByTestId('cp-curve-0')
      expect(curve.getAttribute('stroke')).toBe('#6366f1')
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid attributes
  // ---------------------------------------------------------------------------

  describe('data-testid', () => {
    it('has coordinate-plane container', () => {
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('coordinate-plane')).toBeInTheDocument()
    })

    it('has cp-background', () => {
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-background')).toBeInTheDocument()
    })

    it('has cp-grid', () => {
      mockCurrentStep = 0
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-grid')).toBeInTheDocument()
    })

    it('has cp-axes', () => {
      mockCurrentStep = 1
      render(<CoordinatePlane data={baseData} />)
      expect(screen.getByTestId('cp-axes')).toBeInTheDocument()
    })

    it('has cp-curves when curves present', () => {
      const data = {
        ...baseData,
        curves: [{ id: 'c1', expression: 'x^2' }],
      }
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      expect(screen.getByTestId('cp-curves')).toBeInTheDocument()
    })

    it('has cp-points when points present', () => {
      const data = {
        ...baseData,
        points: [{ id: 'p1', x: 1, y: 1, label: 'P' }],
      }
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      expect(screen.getByTestId('cp-points')).toBeInTheDocument()
    })

    it('has cp-errors when errors present', () => {
      const data = {
        ...baseData,
        errorHighlight: {
          wrongPoints: [{ x: 1, y: 1, errorLabel: 'Wrong' }],
        },
      }
      // Steps: grid(0), axes(1), labels(2), errors(3)
      mockCurrentStep = 3
      render(<CoordinatePlane data={data} />)
      expect(screen.getByTestId('cp-errors')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      points: [{ id: 'p1', x: 2, y: 2, label: 'P' }],
      errorHighlight: {
        wrongPoints: [{ x: 1, y: 1, errorLabel: 'Wrong!' }],
        correctPoints: [{ x: 3, y: 3, correctLabel: 'Correct' }],
      },
    }

    it('renders error group at correct step', () => {
      // Steps: grid(0), axes(1), points(2), labels(3), errors(4)
      mockCurrentStep = 4
      render(<CoordinatePlane data={errorData} />)
      expect(screen.getByTestId('cp-errors')).toBeInTheDocument()
    })

    it('renders wrong point marker', () => {
      mockCurrentStep = 4
      render(<CoordinatePlane data={errorData} />)
      expect(screen.getByTestId('cp-wrong-0')).toBeInTheDocument()
    })

    it('renders correct point marker', () => {
      mockCurrentStep = 4
      render(<CoordinatePlane data={errorData} />)
      expect(screen.getByTestId('cp-correct-0')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<CoordinatePlane data={errorData} />)
      expect(screen.queryByTestId('cp-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Title
  // ---------------------------------------------------------------------------

  describe('title', () => {
    it('renders title when provided and labels step is visible', () => {
      const data = { ...baseData, title: 'y = x\u00b2' }
      // Base data: grid(0), axes(1), labels(2)
      mockCurrentStep = 2
      render(<CoordinatePlane data={data} />)
      expect(screen.getByTestId('cp-title')).toBeInTheDocument()
      expect(screen.getByTestId('cp-title').textContent).toBe('y = x\u00b2')
    })

    it('does not render title before labels step', () => {
      const data = { ...baseData, title: 'y = x\u00b2' }
      mockCurrentStep = 1
      render(<CoordinatePlane data={data} />)
      expect(screen.queryByTestId('cp-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Grid Visibility
  // ---------------------------------------------------------------------------

  describe('grid visibility', () => {
    it('shows grid when showGrid is true', () => {
      mockCurrentStep = 0
      render(<CoordinatePlane data={{ ...baseData, showGrid: true }} />)
      expect(screen.getByTestId('cp-grid')).toBeInTheDocument()
    })

    it('hides grid when showGrid is false', () => {
      mockCurrentStep = 0
      render(<CoordinatePlane data={{ ...baseData, showGrid: false }} />)
      expect(screen.queryByTestId('cp-grid')).not.toBeInTheDocument()
    })
  })
})
