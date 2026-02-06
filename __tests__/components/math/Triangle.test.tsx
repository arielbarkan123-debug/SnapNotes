import { render, screen } from '@testing-library/react'
import { Triangle } from '@/components/math/Triangle'

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

describe('Triangle', () => {
  const baseData = {
    vertices: [
      { x: 0, y: 0, label: 'A' },
      { x: 4, y: 0, label: 'B' },
      { x: 2, y: 3, label: 'C' },
    ] as [any, any, any],
    sides: [
      { from: 'A', to: 'B', length: '4' },
    ],
    angles: [
      { vertex: 'A', measure: '60\u00B0' },
    ],
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="triangle-diagram"', () => {
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('triangle-diagram')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('tri-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<Triangle data={baseData} width={400} />)
      const container = screen.getByTestId('triangle-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('400px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<Triangle data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('A')
      expect(svg?.getAttribute('aria-label')).toContain('B')
      expect(svg?.getAttribute('aria-label')).toContain('C')
    })

    it('renders title when provided', () => {
      render(<Triangle data={{ ...baseData, title: 'Triangle ABC' }} />)
      expect(screen.getByText('Triangle ABC')).toBeInTheDocument()
    })

    it('handles insufficient vertex data gracefully', () => {
      render(<Triangle data={{ vertices: [{ x: 0, y: 0, label: 'A' }] as any }} />)
      expect(screen.getByTestId('triangle-diagram')).toBeInTheDocument()
      expect(screen.getByText('Insufficient vertex data')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows outline at step 0', () => {
      mockCurrentStep = 0
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('tri-outline')).toBeInTheDocument()
    })

    it('hides sides at step 0', () => {
      mockCurrentStep = 0
      render(<Triangle data={baseData} />)
      expect(screen.queryByTestId('tri-sides')).not.toBeInTheDocument()
    })

    it('shows sides at step 1', () => {
      mockCurrentStep = 1
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('tri-sides')).toBeInTheDocument()
    })

    it('hides angles at step 1', () => {
      mockCurrentStep = 1
      render(<Triangle data={baseData} />)
      expect(screen.queryByTestId('tri-angles')).not.toBeInTheDocument()
    })

    it('shows angles at step 2', () => {
      mockCurrentStep = 2
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('tri-angles')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('tri-outline')).toBeInTheDocument()
      expect(screen.getByTestId('tri-sides')).toBeInTheDocument()
      expect(screen.getByTestId('tri-angles')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<Triangle data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (outline + sides + angles = 3)', () => {
      render(<Triangle data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<Triangle data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes special step when altitude present', () => {
      const data = {
        ...baseData,
        altitude: { from: 'C', to: 'B' },
      }
      render(<Triangle data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // outline + sides + angles + special = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('includes error step when errors present', () => {
      const data = {
        ...baseData,
        errorHighlight: {
          wrongSides: ['AB'],
        },
      }
      render(<Triangle data={data} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // outline + sides + angles + errors = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses geometry colors by default', () => {
      mockCurrentStep = 0
      const { container } = render(<Triangle data={baseData} />)
      // Geometry primary #ec4899 used in triangle fill
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#ec4899'
      )
      expect(fillPath).toBeTruthy()
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 0
      const { container } = render(<Triangle data={baseData} subject="physics" />)
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#f97316'
      )
      expect(fillPath).toBeTruthy()
    })

    it('uses math colors when subject="math"', () => {
      mockCurrentStep = 0
      const { container } = render(<Triangle data={baseData} subject="math" />)
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#6366f1'
      )
      expect(fillPath).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Special lines
  // ---------------------------------------------------------------------------

  describe('special lines', () => {
    const specialData = {
      ...baseData,
      altitude: { from: 'C', to: 'B' },
    }

    it('renders special group at correct step', () => {
      // outline(0), sides(1), angles(2), special(3)
      mockCurrentStep = 3
      render(<Triangle data={specialData} />)
      expect(screen.getByTestId('tri-special')).toBeInTheDocument()
    })

    it('hides special before its step', () => {
      mockCurrentStep = 2
      render(<Triangle data={specialData} />)
      expect(screen.queryByTestId('tri-special')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        wrongSides: ['AB'],
        wrongAngles: ['A'],
      },
    }

    it('renders error group at correct step', () => {
      // outline(0), sides(1), angles(2), errors(3)
      mockCurrentStep = 3
      render(<Triangle data={errorData} />)
      expect(screen.getByTestId('tri-errors')).toBeInTheDocument()
    })

    it('renders wrong side marker', () => {
      mockCurrentStep = 3
      render(<Triangle data={errorData} />)
      expect(screen.getByTestId('tri-wrong-side-AB')).toBeInTheDocument()
    })

    it('renders wrong angle marker', () => {
      mockCurrentStep = 3
      render(<Triangle data={errorData} />)
      expect(screen.getByTestId('tri-wrong-angle-A')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<Triangle data={errorData} />)
      expect(screen.queryByTestId('tri-errors')).not.toBeInTheDocument()
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
        errorHighlight: { wrongSides: ['AB'] },
      }
      render(<Triangle data={data} />)
      expect(screen.getByTestId('triangle-diagram')).toBeInTheDocument()
      expect(screen.getByTestId('tri-background')).toBeInTheDocument()
      expect(screen.getByTestId('tri-outline')).toBeInTheDocument()
      expect(screen.getByTestId('tri-sides')).toBeInTheDocument()
      expect(screen.getByTestId('tri-angles')).toBeInTheDocument()
      expect(screen.getByTestId('tri-errors')).toBeInTheDocument()
    })
  })
})
