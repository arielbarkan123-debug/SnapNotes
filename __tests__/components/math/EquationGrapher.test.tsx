import { render, screen } from '@testing-library/react'
import { EquationGrapher } from '@/components/math/EquationGrapher'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion — all SVG motion elements render as plain SVG, plus div for HTML panels
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

// Mock mathjs — supports common expressions used in tests
jest.mock('mathjs', () => ({
  parse: (expr: string) => ({
    compile: () => ({
      evaluate: ({ x }: { x: number }) => {
        if (expr === 'x^2') return x * x
        if (expr === 'x') return x
        if (expr === 'sin(x)') return Math.sin(x)
        if (expr === '2*x+1') return 2 * x + 1
        return 0
      },
    }),
  }),
  evaluate: (val: any) => val,
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

describe('EquationGrapher', () => {
  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="equation-grapher"', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('equation-grapher')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<EquationGrapher width={700} />)
      const container = screen.getByTestId('equation-grapher')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('700px')
    })

    it('uses default width of 500 when not specified', () => {
      render(<EquationGrapher />)
      const container = screen.getByTestId('equation-grapher')
      expect(container.style.maxWidth).toBe('500px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<EquationGrapher />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Graph with')
      expect(svg?.getAttribute('aria-label')).toContain('0 functions')
    })

    it('aria-label reflects number of visible equations', () => {
      const { container } = render(
        <EquationGrapher initialEquations={[{ expression: 'x^2' }, { expression: 'x' }]} />
      )
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('2 functions')
    })

    it('sets dir="ltr" for English', () => {
      render(<EquationGrapher language="en" />)
      const container = screen.getByTestId('equation-grapher')
      expect(container.getAttribute('dir')).toBe('ltr')
    })

    it('sets dir="rtl" for Hebrew', () => {
      render(<EquationGrapher language="he" />)
      const container = screen.getByTestId('equation-grapher')
      expect(container.getAttribute('dir')).toBe('rtl')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows grid at step 0', () => {
      mockCurrentStep = 0
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-grid')).toBeInTheDocument()
    })

    it('hides axes at step 0', () => {
      mockCurrentStep = 0
      render(<EquationGrapher />)
      expect(screen.queryByTestId('eg-axes')).not.toBeInTheDocument()
    })

    it('shows axes at step 1', () => {
      mockCurrentStep = 1
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-axes')).toBeInTheDocument()
    })

    it('hides equations at step 1', () => {
      mockCurrentStep = 1
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.queryByTestId('eg-equations')).not.toBeInTheDocument()
    })

    it('shows equations at step 2', () => {
      mockCurrentStep = 2
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-equations')).toBeInTheDocument()
    })

    it('hides list at step 2', () => {
      mockCurrentStep = 2
      render(<EquationGrapher />)
      expect(screen.queryByTestId('eg-list')).not.toBeInTheDocument()
    })

    it('shows list at step 3', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-list')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-grid')).toBeInTheDocument()
      expect(screen.getByTestId('eg-axes')).toBeInTheDocument()
      expect(screen.getByTestId('eg-equations')).toBeInTheDocument()
      expect(screen.getByTestId('eg-list')).toBeInTheDocument()
    })

    it('does not show grid when showGrid=false', () => {
      mockCurrentStep = 0
      render(<EquationGrapher showGrid={false} />)
      expect(screen.queryByTestId('eg-grid')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (grid + axes + equations + list = 4)', () => {
      render(<EquationGrapher />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<EquationGrapher subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('passes current step to controls', () => {
      mockCurrentStep = 2
      render(<EquationGrapher />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-step')).toBe('2')
    })

    it('displays step text', () => {
      mockCurrentStep = 0
      render(<EquationGrapher />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.textContent).toContain('Step 1 / 4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses math colors by default for add button', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      const btn = screen.getByTestId('eg-add-btn')
      expect(btn.style.backgroundColor).toBe('rgb(99, 102, 241)')
    })

    it('uses physics colors when subject="physics" for add button', () => {
      mockCurrentStep = 3
      render(<EquationGrapher subject="physics" />)
      const btn = screen.getByTestId('eg-add-btn')
      expect(btn.style.backgroundColor).toBe('rgb(249, 115, 22)')
    })

    it('uses geometry colors when subject="geometry" for add button', () => {
      mockCurrentStep = 3
      render(<EquationGrapher subject="geometry" />)
      const btn = screen.getByTestId('eg-add-btn')
      expect(btn.style.backgroundColor).toBe('rgb(236, 72, 153)')
    })

    it('passes math color to DiagramStepControls by default', () => {
      render(<EquationGrapher />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('passes geometry color to DiagramStepControls', () => {
      render(<EquationGrapher subject="geometry" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })
  })

  // ---------------------------------------------------------------------------
  // Equation rendering
  // ---------------------------------------------------------------------------

  describe('equations', () => {
    it('renders equation paths at step 2', () => {
      mockCurrentStep = 2
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-eq-eq-0')).toBeInTheDocument()
    })

    it('hides equation paths before step 2', () => {
      mockCurrentStep = 1
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.queryByTestId('eg-eq-eq-0')).not.toBeInTheDocument()
    })

    it('renders multiple equation paths', () => {
      mockCurrentStep = 2
      render(
        <EquationGrapher
          initialEquations={[{ expression: 'x^2' }, { expression: 'x' }]}
        />
      )
      expect(screen.getByTestId('eg-eq-eq-0')).toBeInTheDocument()
      expect(screen.getByTestId('eg-eq-eq-1')).toBeInTheDocument()
    })

    it('shows equation input only at list step', () => {
      mockCurrentStep = 2
      render(<EquationGrapher />)
      expect(screen.queryByTestId('eg-equation-input')).not.toBeInTheDocument()
    })

    it('shows equation input at step 3', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-equation-input')).toBeInTheDocument()
    })

    it('shows add button at step 3', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-add-btn')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Equation list panel
  // ---------------------------------------------------------------------------

  describe('equation list panel', () => {
    it('shows "No functions yet" when no equations', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByText('No functions yet')).toBeInTheDocument()
    })

    it('shows Hebrew "no functions" label', () => {
      mockCurrentStep = 3
      render(<EquationGrapher language="he" />)
      expect(screen.getByText('\u05D0\u05D9\u05DF \u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D5\u05EA')).toBeInTheDocument()
    })

    it('renders equation list items when equations are provided', () => {
      mockCurrentStep = 3
      render(
        <EquationGrapher initialEquations={[{ expression: 'x^2' }, { expression: 'x' }]} />
      )
      expect(screen.getByTestId('eg-list-item-eq-0')).toBeInTheDocument()
      expect(screen.getByTestId('eg-list-item-eq-1')).toBeInTheDocument()
    })

    it('shows "Functions" heading in English', () => {
      mockCurrentStep = 3
      render(<EquationGrapher language="en" />)
      expect(screen.getByText('Functions')).toBeInTheDocument()
    })

    it('shows "Add function" button text in English', () => {
      mockCurrentStep = 3
      render(<EquationGrapher language="en" />)
      expect(screen.getByText('Add function')).toBeInTheDocument()
    })

    it('shows Hebrew button text', () => {
      mockCurrentStep = 3
      render(<EquationGrapher language="he" />)
      expect(screen.getByText('\u05D4\u05D5\u05E1\u05E3 \u05E4\u05D5\u05E0\u05E7\u05E6\u05D9\u05D4')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid attributes
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has equation-grapher on container', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('equation-grapher')).toBeInTheDocument()
    })

    it('has eg-background on background rect', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-background')).toBeInTheDocument()
    })

    it('has eg-grid on grid group', () => {
      mockCurrentStep = 0
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-grid')).toBeInTheDocument()
    })

    it('has eg-axes on axes group', () => {
      mockCurrentStep = 1
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-axes')).toBeInTheDocument()
    })

    it('has eg-equations on equations group', () => {
      mockCurrentStep = 2
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-equations')).toBeInTheDocument()
    })

    it('has eg-list on equation list panel', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-list')).toBeInTheDocument()
    })

    it('has eg-equation-input on equation input field', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-equation-input')).toBeInTheDocument()
    })

    it('has eg-add-btn on add button', () => {
      mockCurrentStep = 3
      render(<EquationGrapher />)
      expect(screen.getByTestId('eg-add-btn')).toBeInTheDocument()
    })

    it('has eg-eq-{id} on each equation path', () => {
      mockCurrentStep = 2
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-eq-eq-0')).toBeInTheDocument()
    })

    it('has eg-list-item-{id} on each list item', () => {
      mockCurrentStep = 3
      render(<EquationGrapher initialEquations={[{ expression: 'x^2' }]} />)
      expect(screen.getByTestId('eg-list-item-eq-0')).toBeInTheDocument()
    })

    it('has diagram-step-controls on step controls', () => {
      render(<EquationGrapher />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })
  })
})
