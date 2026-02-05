import { render, screen } from '@testing-library/react'
import { LongDivisionDiagram } from '@/components/math/LongDivisionDiagram'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion — all motion elements render as plain HTML
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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
  labelAppearVariants: { hidden: { opacity: 0 }, visible: { opacity: 1 } },
}))

// =============================================================================
// Tests
// =============================================================================

describe('LongDivisionDiagram', () => {
  const baseData = {
    dividend: 156,
    divisor: 12,
    quotient: 13,
    remainder: 0,
    steps: [
      { step: 0, type: 'setup' as const, position: 0, explanation: 'Set up' },
      { step: 1, type: 'divide' as const, position: 1, quotientDigit: 1, explanation: '12 into 15' },
      { step: 2, type: 'multiply' as const, position: 1, product: 12, explanation: '1 x 12 = 12' },
      { step: 3, type: 'subtract' as const, position: 1, difference: 3, explanation: '15 - 12 = 3' },
      { step: 4, type: 'bring_down' as const, position: 2, workingNumber: 36, explanation: 'Bring down 6' },
      { step: 5, type: 'divide' as const, position: 2, quotientDigit: 3, explanation: '12 into 36' },
      { step: 6, type: 'multiply' as const, position: 2, product: 36, explanation: '3 x 12 = 36' },
      { step: 7, type: 'subtract' as const, position: 2, difference: 0, explanation: '36 - 36 = 0' },
    ],
    title: '156 \u00F7 12',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="long-division"', () => {
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('long-division')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<LongDivisionDiagram data={baseData} width={600} />)
      const container = screen.getByTestId('long-division')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has dark/light mode wrapper classes', () => {
      render(<LongDivisionDiagram data={baseData} />)
      const container = screen.getByTestId('long-division')
      expect(container.className).toContain('bg-white')
      expect(container.className).toContain('dark:bg-gray-900')
    })

    it('renders title when provided', () => {
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('ld-title')).toBeInTheDocument()
      expect(screen.getByTestId('ld-title').textContent).toContain('156')
    })

    it('does not render title when not provided', () => {
      const { title: _, ...noTitle } = baseData
      render(<LongDivisionDiagram data={noTitle} />)
      expect(screen.queryByTestId('ld-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows setup at step 0', () => {
      mockCurrentStep = 0
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('ld-setup')).toBeInTheDocument()
    })

    it('hides division steps at step 0', () => {
      mockCurrentStep = 0
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.queryByTestId('ld-step-0')).not.toBeInTheDocument()
    })

    it('shows first division step at step 1', () => {
      mockCurrentStep = 1
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('ld-step-0')).toBeInTheDocument()
    })

    it('shows result step at correct index', () => {
      // Steps: setup(0), division-0(1), division-1(2), result(3)
      mockCurrentStep = 3
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('ld-result')).toBeInTheDocument()
    })

    it('hides result before its step', () => {
      mockCurrentStep = 2
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.queryByTestId('ld-result')).not.toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      // At step 3 (result), all previous steps should be visible
      mockCurrentStep = 3
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('ld-setup')).toBeInTheDocument()
      expect(screen.getByTestId('ld-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('ld-step-1')).toBeInTheDocument()
      expect(screen.getByTestId('ld-result')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<LongDivisionDiagram data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (setup + 2 division iterations + result = 4)', () => {
      render(<LongDivisionDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<LongDivisionDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present', () => {
      const errorData = {
        ...baseData,
        errorHighlight: { message: 'Wrong quotient', wrongQuotient: 14, correctQuotient: 13 },
      }
      render(<LongDivisionDiagram data={errorData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // setup + 2 division + result + errors = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      render(<LongDivisionDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      render(<LongDivisionDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      render(<LongDivisionDiagram data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        message: 'The quotient is incorrect',
        wrongQuotient: 14,
        correctQuotient: 13,
      },
    }

    it('renders error group at correct step', () => {
      // setup(0) + 2 division + result(3) + errors(4)
      mockCurrentStep = 4
      render(<LongDivisionDiagram data={errorData} />)
      expect(screen.getByTestId('ld-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<LongDivisionDiagram data={errorData} />)
      expect(screen.queryByTestId('ld-errors')).not.toBeInTheDocument()
    })

    it('displays error message', () => {
      mockCurrentStep = 4
      render(<LongDivisionDiagram data={errorData} />)
      expect(screen.getByTestId('ld-errors').textContent).toContain('The quotient is incorrect')
    })
  })
})
