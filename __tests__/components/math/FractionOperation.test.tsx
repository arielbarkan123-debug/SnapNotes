import { render, screen } from '@testing-library/react'
import { FractionOperation } from '@/components/math/FractionOperation'

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

describe('FractionOperation', () => {
  const baseData = {
    operationType: 'add' as const,
    fraction1: { numerator: 1, denominator: 4 },
    fraction2: { numerator: 1, denominator: 4 },
    result: { numerator: 2, denominator: 4 },
    steps: [
      {
        step: 0,
        type: 'initial' as const,
        fractions: [
          { numerator: 1, denominator: 4 },
          { numerator: 1, denominator: 4 },
        ],
        description: 'Start with two fractions',
      },
      {
        step: 1,
        type: 'operate' as const,
        fractions: [
          { numerator: 1, denominator: 4 },
          { numerator: 1, denominator: 4 },
        ],
        result: { numerator: 2, denominator: 4 },
        description: 'Add the numerators',
        calculation: '1 + 1 = 2',
      },
      {
        step: 2,
        type: 'simplify' as const,
        fractions: [{ numerator: 2, denominator: 4 }],
        result: { numerator: 1, denominator: 2 },
        description: 'Simplify the fraction',
      },
    ],
    title: 'Add Fractions',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="fraction-operation"', () => {
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fraction-operation')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<FractionOperation data={baseData} width={600} />)
      const container = screen.getByTestId('fraction-operation')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has dark/light mode wrapper classes', () => {
      render(<FractionOperation data={baseData} />)
      const container = screen.getByTestId('fraction-operation')
      expect(container.className).toContain('bg-white')
      expect(container.className).toContain('dark:bg-gray-900')
    })

    it('renders title when provided', () => {
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fo-title')).toBeInTheDocument()
      expect(screen.getByTestId('fo-title').textContent).toBe('Add Fractions')
    })

    it('does not render title when not provided', () => {
      const { title: _, ...noTitle } = baseData
      render(<FractionOperation data={noTitle} />)
      expect(screen.queryByTestId('fo-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows operands at step 0', () => {
      mockCurrentStep = 0
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fo-operands')).toBeInTheDocument()
    })

    it('hides operation at step 0', () => {
      mockCurrentStep = 0
      render(<FractionOperation data={baseData} />)
      expect(screen.queryByTestId('fo-operation')).not.toBeInTheDocument()
    })

    it('shows operation at step 1', () => {
      mockCurrentStep = 1
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fo-operation')).toBeInTheDocument()
    })

    it('hides result at step 1', () => {
      mockCurrentStep = 1
      render(<FractionOperation data={baseData} />)
      expect(screen.queryByTestId('fo-result')).not.toBeInTheDocument()
    })

    it('shows result at step 2', () => {
      mockCurrentStep = 2
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fo-result')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('fo-operands')).toBeInTheDocument()
      expect(screen.getByTestId('fo-operation')).toBeInTheDocument()
      expect(screen.getByTestId('fo-result')).toBeInTheDocument()
    })

    it('displays fraction numerators in operands step', () => {
      mockCurrentStep = 0
      render(<FractionOperation data={baseData} />)
      const operands = screen.getByTestId('fo-operands')
      expect(operands.textContent).toContain('1')
      expect(operands.textContent).toContain('4')
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<FractionOperation data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (operands + operation + result = 3)', () => {
      render(<FractionOperation data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<FractionOperation data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present', () => {
      const errorData = {
        ...baseData,
        errorHighlight: { message: 'Wrong answer' },
      }
      render(<FractionOperation data={errorData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // operands + operation + result + errors = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      render(<FractionOperation data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      render(<FractionOperation data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      render(<FractionOperation data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Fraction Line Weight
  // ---------------------------------------------------------------------------

  describe('adaptive line weight', () => {
    it('uses line weight from diagram hook for fraction borders', () => {
      mockCurrentStep = 0
      const { container } = render(<FractionOperation data={baseData} />)
      // The fraction display uses borderBottom with lineWeight
      const spans = container.querySelectorAll('span[style]')
      const hasBorder = Array.from(spans).some(
        (s) => (s as HTMLElement).style.cssText.includes('border-bottom')
      )
      expect(hasBorder).toBe(true)
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errorHighlight: {
        message: 'The answer is incorrect',
        wrongResult: { numerator: 3, denominator: 4 },
        correctResult: { numerator: 2, denominator: 4 },
      },
    }

    it('renders error group at correct step', () => {
      // operands(0) + operation(1) + result(2) + errors(3)
      mockCurrentStep = 3
      render(<FractionOperation data={errorData} />)
      expect(screen.getByTestId('fo-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<FractionOperation data={errorData} />)
      expect(screen.queryByTestId('fo-errors')).not.toBeInTheDocument()
    })

    it('displays error message', () => {
      mockCurrentStep = 3
      render(<FractionOperation data={errorData} />)
      expect(screen.getByTestId('fo-errors').textContent).toContain('The answer is incorrect')
    })
  })
})
