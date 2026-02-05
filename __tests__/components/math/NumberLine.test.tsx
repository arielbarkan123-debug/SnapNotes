import { render, screen } from '@testing-library/react'
import { NumberLine } from '@/components/math/NumberLine'

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

// Mock useVisualComplexity
jest.mock('@/hooks/useVisualComplexity', () => ({
  useVisualComplexity: ({ forceComplexity }: any = {}) => ({
    complexity: forceComplexity || 'middle_school',
    fontSize: { small: 11, normal: 14, large: 18 },
    showConcreteExamples: forceComplexity === 'elementary',
    colors: { primary: '#6366f1', accent: '#818cf8' },
  }),
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

// Mock visual-learning
jest.mock('@/lib/visual-learning', () => ({
  detectCollisions: () => [],
}))

// Mock visual-complexity constants
jest.mock('@/lib/visual-complexity', () => ({
  CONCRETE_ICONS: { apple: '🍎', star: '⭐' },
}))

// =============================================================================
// Tests
// =============================================================================

describe('NumberLine', () => {
  const baseData = {
    min: -5,
    max: 5,
    points: [{ value: 2, label: '2', style: 'filled' as const }],
    intervals: [],
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="number-line"', () => {
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('number-line')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('nl-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<NumberLine data={baseData} width={600} />)
      const container = screen.getByTestId('number-line')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<NumberLine data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('-5')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })

    it('renders title when provided', () => {
      render(<NumberLine data={{ ...baseData, title: 'My Number Line' }} />)
      expect(screen.getByTestId('nl-title')).toBeInTheDocument()
      expect(screen.getByTestId('nl-title').textContent).toBe('My Number Line')
    })

    it('does not render title when not provided', () => {
      render(<NumberLine data={baseData} />)
      expect(screen.queryByTestId('nl-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows axis at step 0', () => {
      mockCurrentStep = 0
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('nl-axis')).toBeInTheDocument()
      expect(screen.getByTestId('nl-main-line')).toBeInTheDocument()
    })

    it('hides ticks at step 0', () => {
      mockCurrentStep = 0
      render(<NumberLine data={baseData} />)
      expect(screen.queryByTestId('nl-ticks')).not.toBeInTheDocument()
    })

    it('shows ticks at step 1', () => {
      mockCurrentStep = 1
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('nl-ticks')).toBeInTheDocument()
    })

    it('hides points at step 1', () => {
      mockCurrentStep = 1
      render(<NumberLine data={baseData} />)
      expect(screen.queryByTestId('nl-points')).not.toBeInTheDocument()
    })

    it('shows points at step 2', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('nl-points')).toBeInTheDocument()
      expect(screen.getByTestId('nl-point-2')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('nl-axis')).toBeInTheDocument()
      expect(screen.getByTestId('nl-ticks')).toBeInTheDocument()
      expect(screen.getByTestId('nl-points')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<NumberLine data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (axis + ticks + points = 3)', () => {
      render(<NumberLine data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<NumberLine data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes interval step when intervals present', () => {
      const data = {
        min: 0, max: 10,
        points: [{ value: 2, label: '2', style: 'filled' as const }],
        intervals: [{ start: 2, end: 5, startInclusive: true, endInclusive: false }],
      }
      render(<NumberLine data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // axis + ticks + points + intervals = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} />)
      const point = screen.getByTestId('nl-point-2')
      expect(point.getAttribute('fill')).toBe('#6366f1')
      expect(point.getAttribute('stroke')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} subject="physics" />)
      const point = screen.getByTestId('nl-point-2')
      expect(point.getAttribute('fill')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} subject="geometry" />)
      const point = screen.getByTestId('nl-point-2')
      expect(point.getAttribute('fill')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Point Styles
  // ---------------------------------------------------------------------------

  describe('point styles', () => {
    it('renders filled point with subject color', () => {
      mockCurrentStep = 2
      render(<NumberLine data={baseData} />)
      const point = screen.getByTestId('nl-point-2')
      expect(point.getAttribute('fill')).toBe('#6366f1')
    })

    it('renders open point with white fill and subject stroke', () => {
      mockCurrentStep = 2
      const data = {
        ...baseData,
        points: [{ value: 3, label: '3', style: 'open' as const }],
      }
      render(<NumberLine data={data} />)
      const point = screen.getByTestId('nl-point-3')
      expect(point.getAttribute('fill')).toBe('white')
      expect(point.getAttribute('stroke')).toBe('#6366f1')
    })
  })

  // ---------------------------------------------------------------------------
  // Intervals
  // ---------------------------------------------------------------------------

  describe('intervals', () => {
    const intervalData = {
      min: 0,
      max: 10,
      points: [],
      intervals: [{ start: 2, end: 5, startInclusive: true, endInclusive: false }],
    }

    it('renders intervals at correct step', () => {
      // No points → steps: axis(0), ticks(1), intervals(2)
      mockCurrentStep = 2
      render(<NumberLine data={intervalData} />)
      expect(screen.getByTestId('nl-intervals')).toBeInTheDocument()
    })

    it('hides intervals before their step', () => {
      mockCurrentStep = 1
      render(<NumberLine data={intervalData} />)
      expect(screen.queryByTestId('nl-intervals')).not.toBeInTheDocument()
    })

    it('uses subject color for interval fill', () => {
      mockCurrentStep = 2
      const { container } = render(
        <NumberLine data={intervalData} subject="geometry" />
      )
      const rects = container.querySelectorAll('rect')
      const intervalRect = Array.from(rects).find(
        (r) => r.getAttribute('fill') === '#ec4899'
      )
      expect(intervalRect).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      min: -5,
      max: 5,
      points: [{ value: 2, label: '2', style: 'filled' as const }],
      intervals: [],
      errorHighlight: {
        wrongPoints: [{ value: 1, label: '1', style: 'filled' as const, errorLabel: 'Wrong!' }],
        correctPoints: [{ value: 3, label: '3', style: 'filled' as const, correctLabel: 'Correct' }],
      },
    }

    it('renders error group at correct step', () => {
      // points + errors → steps: axis(0), ticks(1), points(2), errors(3)
      mockCurrentStep = 3
      render(<NumberLine data={errorData} />)
      expect(screen.getByTestId('nl-errors')).toBeInTheDocument()
    })

    it('renders wrong point marker', () => {
      mockCurrentStep = 3
      render(<NumberLine data={errorData} />)
      expect(screen.getByTestId('nl-wrong-1')).toBeInTheDocument()
    })

    it('renders correct point marker', () => {
      mockCurrentStep = 3
      render(<NumberLine data={errorData} />)
      expect(screen.getByTestId('nl-correct-3')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<NumberLine data={errorData} />)
      expect(screen.queryByTestId('nl-errors')).not.toBeInTheDocument()
    })
  })
})
