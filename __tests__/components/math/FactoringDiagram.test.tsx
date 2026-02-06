import { render, screen } from '@testing-library/react'
import { FactoringDiagram } from '@/components/math/FactoringDiagram'
import type { FactoringData } from '@/components/math/FactoringDiagram'

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

describe('FactoringDiagram', () => {
  const baseData: FactoringData = {
    expression: 'x\u00B2 + 5x + 6',
    a: 1,
    b: 5,
    c: 6,
    product: 6,
    sum: 5,
    factor1: '(x + 2)',
    factor2: '(x + 3)',
    factoredForm: '(x + 2)(x + 3)',
    steps: [
      { step: 0, type: 'identify', description: 'Identify the expression' },
      { step: 1, type: 'find_factors', description: 'Find factor pairs' },
    ],
    method: 'simple',
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="factoring-diagram"', () => {
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('factoring-diagram')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<FactoringDiagram data={baseData} width={600} />)
      const container = screen.getByTestId('factoring-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has bg-white dark:bg-gray-900 wrapper', () => {
      render(<FactoringDiagram data={baseData} />)
      const container = screen.getByTestId('factoring-diagram')
      expect(container.className).toContain('bg-white')
      expect(container.className).toContain('dark:bg-gray-900')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows original expression at step 0', () => {
      mockCurrentStep = 0
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-original')).toBeInTheDocument()
    })

    it('hides factoring steps at step 0', () => {
      mockCurrentStep = 0
      render(<FactoringDiagram data={baseData} />)
      expect(screen.queryByTestId('fd-step-0')).not.toBeInTheDocument()
    })

    it('shows first factoring step at step 1', () => {
      mockCurrentStep = 1
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-step-0')).toBeInTheDocument()
    })

    it('shows second factoring step at step 2', () => {
      mockCurrentStep = 2
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-step-1')).toBeInTheDocument()
    })

    it('shows result at step 3 (original + 2 steps + result)', () => {
      mockCurrentStep = 3
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-result')).toBeInTheDocument()
    })

    it('hides result before its step', () => {
      mockCurrentStep = 2
      render(<FactoringDiagram data={baseData} />)
      expect(screen.queryByTestId('fd-result')).not.toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-original')).toBeInTheDocument()
      expect(screen.getByTestId('fd-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('fd-step-1')).toBeInTheDocument()
      expect(screen.getByTestId('fd-result')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (original + 2 steps + result = 4)', () => {
      render(<FactoringDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<FactoringDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present', () => {
      const dataWithErrors: FactoringData = {
        ...baseData,
        errors: [{ message: 'Wrong factor' }],
      }
      render(<FactoringDiagram data={dataWithErrors} />)
      const controls = screen.getByTestId('diagram-step-controls')
      // original + 2 steps + result + errors = 5
      expect(controls.getAttribute('data-total')).toBe('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      mockCurrentStep = 0
      render(<FactoringDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 0
      render(<FactoringDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 0
      render(<FactoringDiagram data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData: FactoringData = {
      ...baseData,
      errors: [
        { message: 'Wrong factor pair used', messageHe: '\u05D6\u05D5\u05D2 \u05DE\u05DB\u05E4\u05DC\u05D5\u05EA \u05E9\u05D2\u05D5\u05D9' },
      ],
    }

    it('renders error group at correct step', () => {
      // original(0) + step0(1) + step1(2) + result(3) + errors(4)
      mockCurrentStep = 4
      render(<FactoringDiagram data={errorData} />)
      expect(screen.getByTestId('fd-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<FactoringDiagram data={errorData} />)
      expect(screen.queryByTestId('fd-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Data-testid attributes
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has fd-original, fd-step-*, fd-result test ids', () => {
      mockCurrentStep = 3
      render(<FactoringDiagram data={baseData} />)
      expect(screen.getByTestId('fd-original')).toBeInTheDocument()
      expect(screen.getByTestId('fd-step-0')).toBeInTheDocument()
      expect(screen.getByTestId('fd-step-1')).toBeInTheDocument()
      expect(screen.getByTestId('fd-result')).toBeInTheDocument()
    })
  })
})
