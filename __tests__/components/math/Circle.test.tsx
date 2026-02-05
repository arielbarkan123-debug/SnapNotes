import { render, screen } from '@testing-library/react'
import { Circle } from '@/components/math/Circle'

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

describe('Circle', () => {
  const baseData = {
    centerX: 0,
    centerY: 0,
    radius: 5,
    centerLabel: 'O',
    showRadius: true,
    radiusLabel: 'r = 5',
    title: 'Circle with radius 5',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="circle-diagram"', () => {
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('circle-diagram')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('cir-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<Circle data={baseData} width={400} />)
      const container = screen.getByTestId('circle-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('400px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<Circle data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })

    it('renders title when provided', () => {
      render(<Circle data={baseData} />)
      expect(screen.getByText('Circle with radius 5')).toBeInTheDocument()
    })

    it('does not render title when not provided', () => {
      const noTitleData = { ...baseData, title: undefined }
      const { container } = render(<Circle data={noTitleData} />)
      const texts = container.querySelectorAll('text')
      const titleText = Array.from(texts).find(
        (t) => t.textContent === 'Circle with radius 5'
      )
      expect(titleText).toBeFalsy()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows outline at step 0', () => {
      mockCurrentStep = 0
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('cir-outline')).toBeInTheDocument()
    })

    it('hides radii at step 0', () => {
      mockCurrentStep = 0
      render(<Circle data={baseData} />)
      expect(screen.queryByTestId('cir-radii')).not.toBeInTheDocument()
    })

    it('shows radii at step 1', () => {
      mockCurrentStep = 1
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('cir-radii')).toBeInTheDocument()
    })

    it('shows labels at step 2', () => {
      // outline(0), radii(1), labels(2) — no arcs or angles in baseData
      mockCurrentStep = 2
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('cir-labels')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('cir-outline')).toBeInTheDocument()
      expect(screen.getByTestId('cir-radii')).toBeInTheDocument()
      expect(screen.getByTestId('cir-labels')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<Circle data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (outline + radii + labels = 3)', () => {
      render(<Circle data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<Circle data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes arcs and angles steps when centralAngle present', () => {
      const data = {
        ...baseData,
        centralAngle: { start: 0, end: 90, label: '90\u00B0' },
      }
      render(<Circle data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // outline + radii + arcs + angles + labels = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })

    it('includes error step when errors present', () => {
      const data = {
        ...baseData,
        errorHighlight: { wrongRadius: true },
      }
      render(<Circle data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // outline + radii + labels + errors = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses geometry colors by default', () => {
      mockCurrentStep = 0
      const { container } = render(<Circle data={baseData} />)
      const circles = container.querySelectorAll('circle')
      const fillCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#ec4899'
      )
      expect(fillCircle).toBeTruthy()
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 0
      const { container } = render(<Circle data={baseData} subject="physics" />)
      const circles = container.querySelectorAll('circle')
      const fillCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#f97316'
      )
      expect(fillCircle).toBeTruthy()
    })

    it('uses math colors when subject="math"', () => {
      mockCurrentStep = 0
      const { container } = render(<Circle data={baseData} subject="math" />)
      const circles = container.querySelectorAll('circle')
      const fillCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#6366f1'
      )
      expect(fillCircle).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Labels
  // ---------------------------------------------------------------------------

  describe('labels', () => {
    it('renders center label at correct step', () => {
      // outline(0), radii(1), labels(2)
      mockCurrentStep = 2
      render(<Circle data={baseData} />)
      expect(screen.getByText('O')).toBeInTheDocument()
    })

    it('renders radius label at correct step', () => {
      mockCurrentStep = 2
      render(<Circle data={baseData} />)
      expect(screen.getByText('r = 5')).toBeInTheDocument()
    })

    it('hides labels before their step', () => {
      mockCurrentStep = 1
      render(<Circle data={baseData} />)
      expect(screen.queryByTestId('cir-labels')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        wrongRadius: true,
        wrongCenter: true,
      },
    }

    it('renders error group at correct step', () => {
      // outline(0), radii(1), labels(2), errors(3)
      mockCurrentStep = 3
      render(<Circle data={errorData} />)
      expect(screen.getByTestId('cir-errors')).toBeInTheDocument()
    })

    it('renders wrong radius marker', () => {
      mockCurrentStep = 3
      render(<Circle data={errorData} />)
      expect(screen.getByTestId('cir-wrong-radius')).toBeInTheDocument()
    })

    it('renders wrong center marker', () => {
      mockCurrentStep = 3
      render(<Circle data={errorData} />)
      expect(screen.getByTestId('cir-wrong-center')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<Circle data={errorData} />)
      expect(screen.queryByTestId('cir-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid coverage
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has all required testids at full reveal', () => {
      mockCurrentStep = 3
      const data = {
        ...baseData,
        errorHighlight: { wrongRadius: true },
      }
      render(<Circle data={data} />)
      expect(screen.getByTestId('circle-diagram')).toBeInTheDocument()
      expect(screen.getByTestId('cir-background')).toBeInTheDocument()
      expect(screen.getByTestId('cir-outline')).toBeInTheDocument()
      expect(screen.getByTestId('cir-radii')).toBeInTheDocument()
      expect(screen.getByTestId('cir-labels')).toBeInTheDocument()
      expect(screen.getByTestId('cir-errors')).toBeInTheDocument()
    })
  })
})
