import { render, screen } from '@testing-library/react'
import { UnitCircle } from '@/components/math/UnitCircle'

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
  prefersReducedMotion: () => false,
}))

// Mock DiagramMathLabel (uses katex + DOMPurify not available in JSDOM)
jest.mock('@/components/diagrams/DiagramMathLabel', () => ({
  DiagramMathLabel: ({ latex, x, y, fontSize, ...rest }: any) => (
    <text x={x} y={y} fontSize={fontSize} data-testid="math-label">
      {latex}
    </text>
  ),
}))

// =============================================================================
// Tests
// =============================================================================

describe('UnitCircle', () => {
  const baseData = {
    angles: [
      { degrees: 45, radians: '\u03C0/4', highlight: false, showCoordinates: true },
    ],
    showStandardAngles: false,
    showSinCos: true,
    title: 'Unit Circle',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="unit-circle"', () => {
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('unit-circle')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<UnitCircle data={baseData} width={500} />)
      const container = screen.getByTestId('unit-circle')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('500px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<UnitCircle data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Unit circle')
    })

    it('renders title when provided', () => {
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-title')).toBeInTheDocument()
      expect(screen.getByTestId('uc-title').textContent).toBe('Unit Circle')
    })

    it('does not render title when not provided', () => {
      const noTitleData = { ...baseData, title: undefined }
      render(<UnitCircle data={noTitleData} />)
      expect(screen.queryByTestId('uc-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows circle at step 0', () => {
      mockCurrentStep = 0
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-circle')).toBeInTheDocument()
      expect(screen.getByTestId('uc-circle-path')).toBeInTheDocument()
    })

    it('hides axes at step 0', () => {
      mockCurrentStep = 0
      render(<UnitCircle data={baseData} />)
      expect(screen.queryByTestId('uc-axes')).not.toBeInTheDocument()
    })

    it('shows axes at step 1', () => {
      mockCurrentStep = 1
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-axes')).toBeInTheDocument()
    })

    it('hides angles at step 1', () => {
      mockCurrentStep = 1
      render(<UnitCircle data={baseData} />)
      expect(screen.queryByTestId('uc-angles')).not.toBeInTheDocument()
    })

    it('shows angles at step 2', () => {
      mockCurrentStep = 2
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-angles')).toBeInTheDocument()
      expect(screen.getByTestId('uc-angle-45')).toBeInTheDocument()
    })

    it('shows labels at step 3', () => {
      mockCurrentStep = 3
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-labels')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('uc-circle')).toBeInTheDocument()
      expect(screen.getByTestId('uc-axes')).toBeInTheDocument()
      expect(screen.getByTestId('uc-angles')).toBeInTheDocument()
      expect(screen.getByTestId('uc-labels')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<UnitCircle data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (circle + axes + angles + labels = 4)', () => {
      render(<UnitCircle data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<UnitCircle data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes errors step when errors present', () => {
      const errorData = {
        ...baseData,
        errorHighlight: {
          wrongAngles: [90],
          correctAngles: [45],
        },
      }
      render(<UnitCircle data={errorData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // circle + axes + angles + labels + errors = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      mockCurrentStep = 2
      render(<UnitCircle data={baseData} />)
      const point = screen.getByTestId('uc-angle-45')
      expect(point.getAttribute('fill')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 2
      render(<UnitCircle data={baseData} subject="physics" />)
      const point = screen.getByTestId('uc-angle-45')
      expect(point.getAttribute('fill')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 2
      render(<UnitCircle data={baseData} subject="geometry" />)
      const point = screen.getByTestId('uc-angle-45')
      expect(point.getAttribute('fill')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Axes Content
  // ---------------------------------------------------------------------------

  describe('axes content', () => {
    it('renders x and y axis labels', () => {
      mockCurrentStep = 1
      const { container } = render(<UnitCircle data={baseData} />)
      expect(container.textContent).toContain('x')
      expect(container.textContent).toContain('y')
    })

    it('renders CAST quadrant labels', () => {
      mockCurrentStep = 1
      const { container } = render(<UnitCircle data={baseData} />)
      expect(container.textContent).toContain('All +')
      expect(container.textContent).toContain('Sin +')
      expect(container.textContent).toContain('Cos +')
      expect(container.textContent).toContain('Tan +')
    })

    it('renders axis tick labels (1, -1)', () => {
      mockCurrentStep = 1
      const { container } = render(<UnitCircle data={baseData} />)
      const texts = Array.from(container.querySelectorAll('text'))
      const textContents = texts.map((t) => t.textContent)
      expect(textContents).toContain('1')
      expect(textContents).toContain('-1')
    })
  })

  // ---------------------------------------------------------------------------
  // Quadrant Highlighting
  // ---------------------------------------------------------------------------

  describe('quadrant highlighting', () => {
    it('renders quadrant highlight when specified', () => {
      render(<UnitCircle data={{ ...baseData, highlightQuadrant: 1 }} />)
      expect(screen.getByTestId('uc-quadrant')).toBeInTheDocument()
    })

    it('does not render quadrant highlight when not specified', () => {
      render(<UnitCircle data={baseData} />)
      expect(screen.queryByTestId('uc-quadrant')).not.toBeInTheDocument()
    })

    it('uses subject color for quadrant fill', () => {
      render(
        <UnitCircle
          data={{ ...baseData, highlightQuadrant: 2 }}
          subject="geometry"
        />
      )
      const quadrant = screen.getByTestId('uc-quadrant')
      expect(quadrant.getAttribute('fill')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        wrongAngles: [90],
        correctAngles: [45],
        wrongValues: [{ angle: 60, wrongSin: '1/3', wrongCos: '2/3' }],
      },
    }

    it('renders error group at correct step', () => {
      // circle(0) + axes(1) + angles(2) + labels(3) + errors(4)
      mockCurrentStep = 4
      render(<UnitCircle data={errorData} />)
      expect(screen.getByTestId('uc-errors')).toBeInTheDocument()
    })

    it('renders wrong angle marker', () => {
      mockCurrentStep = 4
      render(<UnitCircle data={errorData} />)
      expect(screen.getByTestId('uc-wrong-90')).toBeInTheDocument()
    })

    it('renders correct angle marker', () => {
      mockCurrentStep = 4
      render(<UnitCircle data={errorData} />)
      expect(screen.getByTestId('uc-correct-45')).toBeInTheDocument()
    })

    it('renders wrong value marker', () => {
      mockCurrentStep = 4
      render(<UnitCircle data={errorData} />)
      expect(screen.getByTestId('uc-wrong-value-60')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<UnitCircle data={errorData} />)
      expect(screen.queryByTestId('uc-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // No Angles (minimal data)
  // ---------------------------------------------------------------------------

  describe('minimal data (no angles)', () => {
    const minimalData = {
      angles: [],
      showStandardAngles: false,
      showSinCos: false,
    }

    it('only shows circle and axes steps', () => {
      render(<UnitCircle data={minimalData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // circle + axes = 2
      expect(controls.getAttribute('data-total')).toBe('2')
    })

    it('does not render angles group', () => {
      mockCurrentStep = 1
      render(<UnitCircle data={minimalData} />)
      expect(screen.queryByTestId('uc-angles')).not.toBeInTheDocument()
    })
  })
})
