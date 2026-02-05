import { render, screen } from '@testing-library/react'
import { EquationSteps } from '@/components/math/EquationSteps'

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

describe('EquationSteps', () => {
  const baseData = {
    originalEquation: '2x + 3 = 7',
    variable: 'x',
    solution: '2',
    steps: [
      {
        step: 0,
        equation: '2x + 3 = 7',
        operation: 'initial' as const,
        leftSide: '2x + 3',
        rightSide: '7',
        description: 'Start with the equation',
      },
      {
        step: 1,
        equation: '2x = 4',
        operation: 'subtract' as const,
        leftSide: '2x',
        rightSide: '4',
        description: 'Subtract 3 from both sides',
        calculation: '-3',
      },
      {
        step: 2,
        equation: 'x = 2',
        operation: 'divide' as const,
        leftSide: 'x',
        rightSide: '2',
        description: 'Divide both sides by 2',
        calculation: '\u00F72',
      },
    ],
    title: 'Solve for x',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="equation-steps"', () => {
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('equation-steps')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<EquationSteps data={baseData} width={600} />)
      const container = screen.getByTestId('equation-steps')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has dark/light mode wrapper classes', () => {
      render(<EquationSteps data={baseData} />)
      const container = screen.getByTestId('equation-steps')
      expect(container.className).toContain('bg-white')
      expect(container.className).toContain('dark:bg-gray-900')
    })

    it('renders title when provided', () => {
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('es-title')).toBeInTheDocument()
      expect(screen.getByTestId('es-title').textContent).toBe('Solve for x')
    })

    it('does not render title when not provided', () => {
      const { title: _, ...noTitle } = baseData
      render(<EquationSteps data={noTitle} />)
      expect(screen.queryByTestId('es-title')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows first equation step at step 0', () => {
      mockCurrentStep = 0
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('es-step-0')).toBeInTheDocument()
    })

    it('hides second step at step 0', () => {
      mockCurrentStep = 0
      render(<EquationSteps data={baseData} />)
      expect(screen.queryByTestId('es-step-1')).not.toBeInTheDocument()
    })

    it('shows second step at step 1', () => {
      mockCurrentStep = 1
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('es-step-1')).toBeInTheDocument()
    })

    it('shows all steps at final step', () => {
      mockCurrentStep = 2
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('es-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('es-step-1')).toBeInTheDocument()
      expect(screen.getByTestId('es-step-2')).toBeInTheDocument()
    })

    it('accumulates previous steps', () => {
      mockCurrentStep = 1
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('es-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('es-step-1')).toBeInTheDocument()
      expect(screen.queryByTestId('es-step-2')).not.toBeInTheDocument()
    })

    it('displays equation content in visible step', () => {
      mockCurrentStep = 0
      render(<EquationSteps data={baseData} />)
      const step = screen.getByTestId('es-step-0')
      expect(step.textContent).toContain('2x + 3')
      expect(step.textContent).toContain('7')
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<EquationSteps data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (3 equation steps)', () => {
      render(<EquationSteps data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<EquationSteps data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present', () => {
      const errorData = {
        ...baseData,
        errorHighlight: { message: 'Step 2 is wrong' },
      }
      render(<EquationSteps data={errorData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // 3 equation steps + 1 error = 4
      expect(controls.getAttribute('data-total')).toBe('4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      render(<EquationSteps data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      render(<EquationSteps data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      render(<EquationSteps data={baseData} subject="geometry" />)
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
        message: 'Step 2 has an error',
        correctEquation: 'x = 2',
      },
    }

    it('renders error group at correct step', () => {
      // 3 equation steps + errors(3)
      mockCurrentStep = 3
      render(<EquationSteps data={errorData} />)
      expect(screen.getByTestId('es-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 2
      render(<EquationSteps data={errorData} />)
      expect(screen.queryByTestId('es-errors')).not.toBeInTheDocument()
    })

    it('displays error message', () => {
      mockCurrentStep = 3
      render(<EquationSteps data={errorData} />)
      expect(screen.getByTestId('es-errors').textContent).toContain('Step 2 has an error')
    })
  })
})
