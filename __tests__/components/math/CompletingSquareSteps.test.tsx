import { render, screen } from '@testing-library/react'
import { CompletingSquareSteps } from '@/components/math/CompletingSquareSteps'
import type { CompletingSquareData } from '@/components/math/CompletingSquareSteps'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion -- all HTML motion elements render as plain HTML
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
    p: ({ children, ...props }: any) => <p {...props}>{children}</p>,
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

// =============================================================================
// Tests
// =============================================================================

describe('CompletingSquareSteps', () => {
  const baseData: CompletingSquareData = {
    originalEquation: 'x\u00B2 + 6x + 5 = 0',
    a: 1,
    b: 6,
    c: 5,
    halfB: 3,
    squaredHalfB: 9,
    variable: 'x',
    solutions: ['-1', '-5'],
    vertexForm: '(x + 3)\u00B2 = 4',
    steps: [
      { step: 0, type: 'identify', description: 'Identify coefficients', leftSide: 'x\u00B2 + 6x + 5', rightSide: '0' },
      { step: 1, type: 'isolate', description: 'Move constant', leftSide: 'x\u00B2 + 6x', rightSide: '-5' },
      { step: 2, type: 'add_both', description: 'Add (b/2)\u00B2', leftSide: 'x\u00B2 + 6x + 9', rightSide: '4' },
      { step: 3, type: 'factor_left', description: 'Factor', leftSide: '(x + 3)\u00B2', rightSide: '4' },
    ],
    title: 'Completing the Square',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="completing-square"', () => {
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('completing-square')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<CompletingSquareSteps data={baseData} width={600} />)
      const container = screen.getByTestId('completing-square')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has bg-white dark:bg-gray-900 wrapper', () => {
      render(<CompletingSquareSteps data={baseData} />)
      const container = screen.getByTestId('completing-square')
      expect(container.className).toContain('bg-white')
      expect(container.className).toContain('dark:bg-gray-900')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows equation at step 0', () => {
      mockCurrentStep = 0
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-equation')).toBeInTheDocument()
    })

    it('hides coefficients at step 0', () => {
      mockCurrentStep = 0
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.queryByTestId('cs-coefficients')).not.toBeInTheDocument()
    })

    it('shows coefficients at step 1', () => {
      mockCurrentStep = 1
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-coefficients')).toBeInTheDocument()
    })

    it('shows square term at step 2', () => {
      mockCurrentStep = 2
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-square')).toBeInTheDocument()
    })

    it('shows result at step 3', () => {
      mockCurrentStep = 3
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-result')).toBeInTheDocument()
    })

    it('hides result before its step', () => {
      mockCurrentStep = 2
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.queryByTestId('cs-result')).not.toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-equation')).toBeInTheDocument()
      expect(screen.getByTestId('cs-coefficients')).toBeInTheDocument()
      expect(screen.getByTestId('cs-square')).toBeInTheDocument()
      expect(screen.getByTestId('cs-result')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (equation + coefficients + square + result = 4)', () => {
      render(<CompletingSquareSteps data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<CompletingSquareSteps data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present', () => {
      const dataWithErrors: CompletingSquareData = {
        ...baseData,
        errors: [{ message: 'Missing step' }],
      }
      render(<CompletingSquareSteps data={dataWithErrors} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // equation + coefficients + square + result + errors = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      render(<CompletingSquareSteps data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      render(<CompletingSquareSteps data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      render(<CompletingSquareSteps data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData: CompletingSquareData = {
      ...baseData,
      errors: [
        { message: 'Forgot to add to both sides' },
      ],
    }

    it('renders error group at correct step', () => {
      // equation(0) + coefficients(1) + square(2) + result(3) + errors(4)
      mockCurrentStep = 4
      render(<CompletingSquareSteps data={errorData} />)
      expect(screen.getByTestId('cs-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<CompletingSquareSteps data={errorData} />)
      expect(screen.queryByTestId('cs-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Data-testid attributes
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has cs-equation, cs-coefficients, cs-square, cs-result test ids', () => {
      mockCurrentStep = 3
      render(<CompletingSquareSteps data={baseData} />)
      expect(screen.getByTestId('cs-equation')).toBeInTheDocument()
      expect(screen.getByTestId('cs-coefficients')).toBeInTheDocument()
      expect(screen.getByTestId('cs-square')).toBeInTheDocument()
      expect(screen.getByTestId('cs-result')).toBeInTheDocument()
    })
  })
})
