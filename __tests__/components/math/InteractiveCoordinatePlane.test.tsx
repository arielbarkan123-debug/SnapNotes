import { render, screen } from '@testing-library/react'
import { InteractiveCoordinatePlane } from '@/components/math/InteractiveCoordinatePlane'

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
      chemistry: { primary: '#10b981', accent: '#14b8a6', light: '#a7f3d0', dark: '#047857', bg: '#ecfdf5', bgDark: '#022c22', curve: '#34d399', point: '#10b981', highlight: '#6ee7b7' },
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

describe('InteractiveCoordinatePlane', () => {
  const baseData = {
    xMin: -5,
    xMax: 5,
    yMin: -5,
    yMax: 5,
    showGrid: true,
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="interactive-coord-plane"', () => {
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('interactive-coord-plane')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('icp-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<InteractiveCoordinatePlane data={baseData} width={600} />)
      const container = screen.getByTestId('interactive-coord-plane')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('600px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<InteractiveCoordinatePlane data={baseData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('-5')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    it('shows grid at step 0', () => {
      mockCurrentStep = 0
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('icp-grid')).toBeInTheDocument()
    })

    it('hides axes at step 0', () => {
      mockCurrentStep = 0
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.queryByTestId('icp-axes')).not.toBeInTheDocument()
    })

    it('shows axes at step 1', () => {
      mockCurrentStep = 1
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('icp-axes')).toBeInTheDocument()
    })

    it('hides interactive at step 1', () => {
      mockCurrentStep = 1
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.queryByTestId('icp-interactive')).not.toBeInTheDocument()
    })

    it('shows interactive at step 2', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('icp-interactive')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('icp-grid')).toBeInTheDocument()
      expect(screen.getByTestId('icp-axes')).toBeInTheDocument()
      expect(screen.getByTestId('icp-interactive')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<InteractiveCoordinatePlane data={baseData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps (grid + axes + interactive = 3)', () => {
      render(<InteractiveCoordinatePlane data={baseData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls', () => {
      render(<InteractiveCoordinatePlane data={baseData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    const dataWithPoints = {
      ...baseData,
      points: [{ x: 1, y: 1, label: 'A' }],
    }

    it('uses math colors by default', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={dataWithPoints} />)
      const point = screen.getByTestId('icp-point-0')
      expect(point.getAttribute('fill')).toBe('#6366f1')
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={dataWithPoints} subject="physics" />)
      const point = screen.getByTestId('icp-point-0')
      expect(point.getAttribute('fill')).toBe('#f97316')
    })

    it('uses geometry colors when subject="geometry"', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={dataWithPoints} subject="geometry" />)
      const point = screen.getByTestId('icp-point-0')
      expect(point.getAttribute('fill')).toBe('#ec4899')
    })

    it('uses chemistry colors for point labels', () => {
      mockCurrentStep = 2
      const { container } = render(
        <InteractiveCoordinatePlane data={dataWithPoints} subject="chemistry" />
      )
      const texts = container.querySelectorAll('text')
      const chemLabel = Array.from(texts).find(
        (t) => t.getAttribute('fill') === '#10b981' && t.textContent === 'A'
      )
      expect(chemLabel).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Interactive points visibility
  // ---------------------------------------------------------------------------

  describe('interactive points', () => {
    const dataWithPoints = {
      ...baseData,
      points: [{ x: 2, y: 3, label: 'P1' }],
    }

    it('shows points only at interactive step', () => {
      mockCurrentStep = 2
      render(<InteractiveCoordinatePlane data={dataWithPoints} />)
      expect(screen.getByTestId('icp-point-0')).toBeInTheDocument()
    })

    it('hides points before interactive step', () => {
      mockCurrentStep = 1
      render(<InteractiveCoordinatePlane data={dataWithPoints} />)
      expect(screen.queryByTestId('icp-point-0')).not.toBeInTheDocument()
    })
  })
})
