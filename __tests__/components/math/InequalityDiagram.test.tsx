import { render, screen } from '@testing-library/react'
import { InequalityDiagram } from '@/components/math/InequalityDiagram'

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
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
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

// =============================================================================
// Tests
// =============================================================================

describe('InequalityDiagram', () => {
  const baseData = {
    originalInequality: '2x + 3 < 7',
    variable: 'x',
    solution: 'x < 2',
    boundaryValue: 2,
    finalOperator: '<' as const,
    intervalNotation: '(-\u221e, 2)',
    numberLineBounds: { min: -3, max: 7 },
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="inequality-diagram"', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('inequality-diagram')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<InequalityDiagram data={baseData} width={600} />)
      const container = screen.getByTestId('inequality-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has default responsive width container (500)', () => {
      render(<InequalityDiagram data={baseData} />)
      const container = screen.getByTestId('inequality-diagram')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('500px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<InequalityDiagram data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('x < 2')
    })

    it('renders title when provided', () => {
      render(<InequalityDiagram data={{ ...baseData, title: 'Solve the inequality' }} />)
      expect(screen.getByText('Solve the inequality')).toBeInTheDocument()
    })

    it('does not render title when not provided', () => {
      const { container } = render(<InequalityDiagram data={baseData} />)
      // No title div should exist outside the SVG
      const titleDivs = container.querySelectorAll('.text-sm.font-medium')
      expect(titleDivs.length).toBe(0)
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows axis at step 0', () => {
      mockCurrentStep = 0
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-axis')).toBeInTheDocument()
    })

    it('hides ticks at step 0', () => {
      mockCurrentStep = 0
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-ticks')).not.toBeInTheDocument()
    })

    it('hides region at step 0', () => {
      mockCurrentStep = 0
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-region')).not.toBeInTheDocument()
    })

    it('hides boundaries at step 0', () => {
      mockCurrentStep = 0
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-boundaries')).not.toBeInTheDocument()
    })

    it('shows ticks at step 1', () => {
      mockCurrentStep = 1
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-ticks')).toBeInTheDocument()
    })

    it('hides region at step 1', () => {
      mockCurrentStep = 1
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-region')).not.toBeInTheDocument()
    })

    it('shows region at step 2', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-region')).toBeInTheDocument()
    })

    it('hides boundaries at step 2', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-boundaries')).not.toBeInTheDocument()
    })

    it('shows boundaries at step 3', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-boundaries')).toBeInTheDocument()
    })

    it('shows solution label when boundaries visible (step 3)', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByText(/x < 2/)).toBeInTheDocument()
      expect(screen.getByText(/\(-\u221e, 2\)/)).toBeInTheDocument()
    })

    it('hides solution label before boundaries step', () => {
      mockCurrentStep = 2
      const { container } = render(<InequalityDiagram data={baseData} />)
      // Solution label is rendered in a div with font-mono class
      const solutionDivs = container.querySelectorAll('.font-mono')
      expect(solutionDivs.length).toBe(0)
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-axis')).toBeInTheDocument()
      expect(screen.getByTestId('ineq-ticks')).toBeInTheDocument()
      expect(screen.getByTestId('ineq-region')).toBeInTheDocument()
      expect(screen.getByTestId('ineq-boundaries')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps without errors (axis + ticks + region + boundaries = 4)', () => {
      render(<InequalityDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<InequalityDiagram data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('includes error step when errors present (total = 5)', () => {
      const dataWithErrors = {
        ...baseData,
        errors: [{ message: 'Wrong boundary' }],
      }
      render(<InequalityDiagram data={dataWithErrors} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('5')
    })

    it('displays current step text', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.textContent).toContain('Step 3 / 4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default', () => {
      mockCurrentStep = 2
      const { container } = render(<InequalityDiagram data={baseData} />)
      // The region shaded rect uses the primary color
      const regionGroup = screen.getByTestId('ineq-region')
      const rects = regionGroup.querySelectorAll('rect')
      const hasColor = Array.from(rects).some(
        (r) => r.getAttribute('fill') === '#6366f1'
      )
      expect(hasColor).toBe(true)
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} subject="physics" />)
      const regionGroup = screen.getByTestId('ineq-region')
      const rects = regionGroup.querySelectorAll('rect')
      const hasColor = Array.from(rects).some(
        (r) => r.getAttribute('fill') === '#f97316'
      )
      expect(hasColor).toBe(true)
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} subject="geometry" />)
      const regionGroup = screen.getByTestId('ineq-region')
      const rects = regionGroup.querySelectorAll('rect')
      const hasColor = Array.from(rects).some(
        (r) => r.getAttribute('fill') === '#ec4899'
      )
      expect(hasColor).toBe(true)
    })

    it('applies subject color to boundary circle stroke', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} subject="physics" />)
      const boundaryGroup = screen.getByTestId('ineq-boundaries')
      const circle = boundaryGroup.querySelector('circle')
      expect(circle?.getAttribute('stroke')).toBe('#f97316')
    })

    it('applies subject color to step controls for each subject', () => {
      render(<InequalityDiagram data={baseData} subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Boundary Point Styles (inclusive vs exclusive)
  // ---------------------------------------------------------------------------

  describe('boundary point styles', () => {
    it('renders open circle for strict less-than (<)', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={{ ...baseData, finalOperator: '<' }} />)
      const boundaryGroup = screen.getByTestId('ineq-boundaries')
      const circle = boundaryGroup.querySelector('circle')
      expect(circle?.getAttribute('fill')).toBe('white')
    })

    it('renders open circle for strict greater-than (>)', () => {
      mockCurrentStep = 3
      const data = { ...baseData, finalOperator: '>' as const, solution: 'x > 2' }
      render(<InequalityDiagram data={data} />)
      const boundaryGroup = screen.getByTestId('ineq-boundaries')
      const circle = boundaryGroup.querySelector('circle')
      expect(circle?.getAttribute('fill')).toBe('white')
    })

    it('renders filled circle for less-than-or-equal (<=)', () => {
      mockCurrentStep = 3
      const data = { ...baseData, finalOperator: '<=' as const, solution: 'x <= 2' }
      render(<InequalityDiagram data={data} />)
      const boundaryGroup = screen.getByTestId('ineq-boundaries')
      const circle = boundaryGroup.querySelector('circle')
      expect(circle?.getAttribute('fill')).toBe('#6366f1')
    })

    it('renders filled circle for greater-than-or-equal (>=)', () => {
      mockCurrentStep = 3
      const data = { ...baseData, finalOperator: '>=' as const, solution: 'x >= 2' }
      render(<InequalityDiagram data={data} />)
      const boundaryGroup = screen.getByTestId('ineq-boundaries')
      const circle = boundaryGroup.querySelector('circle')
      expect(circle?.getAttribute('fill')).toBe('#6366f1')
    })
  })

  // ---------------------------------------------------------------------------
  // Error Highlights
  // ---------------------------------------------------------------------------

  describe('error highlights', () => {
    const errorData = {
      ...baseData,
      errors: [
        { message: 'Wrong boundary value', messageHe: '\u05E2\u05E8\u05DA \u05D2\u05D1\u05D5\u05DC \u05E9\u05D2\u05D5\u05D9' },
        { message: 'Check the sign' },
      ],
    }

    it('renders error group at correct step (step 4)', () => {
      // axis(0), ticks(1), region(2), boundaries(3), errors(4)
      mockCurrentStep = 4
      render(<InequalityDiagram data={errorData} />)
      expect(screen.getByTestId('ineq-errors')).toBeInTheDocument()
    })

    it('hides errors before their step', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={errorData} />)
      expect(screen.queryByTestId('ineq-errors')).not.toBeInTheDocument()
    })

    it('renders error messages in English', () => {
      mockCurrentStep = 4
      render(<InequalityDiagram data={errorData} language="en" />)
      expect(screen.getByText('Wrong boundary value')).toBeInTheDocument()
      expect(screen.getByText('Check the sign')).toBeInTheDocument()
    })

    it('renders error messages in Hebrew when available', () => {
      mockCurrentStep = 4
      render(<InequalityDiagram data={errorData} language="he" />)
      expect(screen.getByText('\u05E2\u05E8\u05DA \u05D2\u05D1\u05D5\u05DC \u05E9\u05D2\u05D5\u05D9')).toBeInTheDocument()
      // Falls back to English when Hebrew not available
      expect(screen.getByText('Check the sign')).toBeInTheDocument()
    })

    it('renders red X marker at boundary in error step', () => {
      mockCurrentStep = 4
      const { container } = render(<InequalityDiagram data={errorData} />)
      const errorGroup = screen.getByTestId('ineq-errors')
      const lines = errorGroup.querySelectorAll('line')
      // Two lines form the X
      expect(lines.length).toBe(2)
      expect(lines[0].getAttribute('stroke')).toBe('#EF4444')
      expect(lines[1].getAttribute('stroke')).toBe('#EF4444')
    })

    it('does not render error group when no errors present', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} />)
      expect(screen.queryByTestId('ineq-errors')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Tick Marks
  // ---------------------------------------------------------------------------

  describe('tick marks', () => {
    it('renders tick marks with numeric labels at step 1', () => {
      mockCurrentStep = 1
      const { container } = render(<InequalityDiagram data={baseData} />)
      const tickGroup = screen.getByTestId('ineq-ticks')
      const texts = tickGroup.querySelectorAll('text')
      // Should have at least the boundary value tick
      const tickValues = Array.from(texts).map((t) => t.textContent)
      expect(tickValues).toContain('2')
    })

    it('always includes the boundary value as a tick', () => {
      mockCurrentStep = 1
      render(
        <InequalityDiagram
          data={{ ...baseData, boundaryValue: 3, numberLineBounds: { min: 0, max: 10 } }}
        />
      )
      const tickGroup = screen.getByTestId('ineq-ticks')
      const texts = tickGroup.querySelectorAll('text')
      const tickValues = Array.from(texts).map((t) => t.textContent)
      expect(tickValues).toContain('3')
    })
  })

  // ---------------------------------------------------------------------------
  // Data-testid Attributes Coverage
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has inequality-diagram on container', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('inequality-diagram')).toBeInTheDocument()
    })

    it('has ineq-background on background rect', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-background')).toBeInTheDocument()
    })

    it('has ineq-axis on axis group', () => {
      mockCurrentStep = 0
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-axis')).toBeInTheDocument()
    })

    it('has ineq-ticks on tick group', () => {
      mockCurrentStep = 1
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-ticks')).toBeInTheDocument()
    })

    it('has ineq-region on region group', () => {
      mockCurrentStep = 2
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-region')).toBeInTheDocument()
    })

    it('has ineq-boundaries on boundary group', () => {
      mockCurrentStep = 3
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('ineq-boundaries')).toBeInTheDocument()
    })

    it('has ineq-errors on error group when errors present', () => {
      mockCurrentStep = 4
      const dataWithErrors = {
        ...baseData,
        errors: [{ message: 'Error' }],
      }
      render(<InequalityDiagram data={dataWithErrors} />)
      expect(screen.getByTestId('ineq-errors')).toBeInTheDocument()
    })

    it('has diagram-step-controls on step controls', () => {
      render(<InequalityDiagram data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })
  })
})
