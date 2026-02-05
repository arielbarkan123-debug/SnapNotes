import { render, screen } from '@testing-library/react'
import { RegularPolygon } from '@/components/geometry/RegularPolygon'
import type { RegularPolygonData } from '@/types/geometry'

// Mutable step state controlled per-test
let mockCurrentStep = 0

// Mock framer-motion -- all SVG motion elements render as plain SVG
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

// Mock useDiagramBase -- returns subject-coded colors and controlled step
jest.mock('@/hooks/useDiagramBase', () => ({
  useDiagramBase: (opts: any) => {
    const mockSubjectColors: Record<string, any> = {
      math: { primary: '#6366f1', accent: '#8b5cf6', light: '#c7d2fe', dark: '#4338ca', bg: '#eef2ff', bgDark: '#1e1b4b', curve: '#818cf8', point: '#6366f1', highlight: '#a5b4fc' },
      physics: { primary: '#f97316', accent: '#ef4444', light: '#fed7aa', dark: '#c2410c', bg: '#fff7ed', bgDark: '#431407', curve: '#fb923c', point: '#f97316', highlight: '#fdba74' },
      geometry: { primary: '#ec4899', accent: '#d946ef', light: '#fbcfe8', dark: '#be185d', bg: '#fdf2f8', bgDark: '#500724', curve: '#f472b6', point: '#ec4899', highlight: '#f9a8d4' },
    }
    const mockLineWeights: Record<string, number> = { elementary: 4, middle_school: 3, high_school: 2, advanced: 2 }
    const colors = mockSubjectColors[opts.subject] || mockSubjectColors.geometry
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
  prefersReducedMotion: () => false,
}))

// Mock DiagramMathLabel (uses katex + DOMPurify not available in JSDOM)
jest.mock('@/components/diagrams/DiagramMathLabel', () => ({
  DiagramMathLabel: ({ latex, x, y, fontSize, ...rest }: any) => (
    <text x={x} y={y} fontSize={fontSize} data-testid="math-label">
      {latex}
    </text>
  ),
}))

// =============================================================================
// Tests
// =============================================================================

describe('RegularPolygon', () => {
  // Hexagon (6 sides) -- has diagonals
  const hexagonData: RegularPolygonData = {
    sides: 6,
    sideLength: 5,
  }

  // Triangle (3 sides) -- no diagonals
  const triangleData: RegularPolygonData = {
    sides: 3,
    sideLength: 4,
  }

  beforeEach(() => {
    mockCurrentStep = 0
  })

  // ---------------------------------------------------------------------------
  // Container & Structure
  // ---------------------------------------------------------------------------

  describe('container and structure', () => {
    it('renders with data-testid="regular-polygon"', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('regular-polygon')).toBeInTheDocument()
    })

    it('renders background rect', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-background')).toBeInTheDocument()
    })

    it('has responsive width container', () => {
      render(<RegularPolygon data={hexagonData} width={500} />)
      const container = screen.getByTestId('regular-polygon')
      expect(container.style.width).toBe('100%')
      expect(container.style.maxWidth).toBe('500px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Hexagon')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal (Hexagon: 4 steps with diagonals)
  // ---------------------------------------------------------------------------

  describe('progressive reveal (hexagon with diagonals)', () => {
    it('shows outline at step 0', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
    })

    it('hides vertices at step 0', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-vertices')).not.toBeInTheDocument()
    })

    it('shows vertices at step 1', () => {
      mockCurrentStep = 1
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
    })

    it('hides diagonals at step 1', () => {
      mockCurrentStep = 1
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-diagonals')).not.toBeInTheDocument()
    })

    it('shows diagonals at step 2', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
    })

    it('shows measurements at step 3', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    it('accumulates all previous steps', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Progressive Reveal (Triangle: 3 steps, no diagonals)
  // ---------------------------------------------------------------------------

  describe('progressive reveal (triangle, no diagonals)', () => {
    it('has 3 steps (outline + vertices + measurements)', () => {
      render(<RegularPolygon data={triangleData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('shows measurements at step 2 (no diagonal step)', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={triangleData} />)
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    it('does not render diagonals group for triangle', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={triangleData} />)
      expect(screen.queryByTestId('rp-diagonals')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // DiagramStepControls
  // ---------------------------------------------------------------------------

  describe('DiagramStepControls', () => {
    it('renders step controls', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })

    it('passes correct total steps for hexagon (outline + vertices + diagonals + measurements = 4)', () => {
      render(<RegularPolygon data={hexagonData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('4')
    })

    it('passes subject color to controls', () => {
      render(<RegularPolygon data={hexagonData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses geometry colors by default', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#ec4899'
      )
      expect(primaryCircle).toBeTruthy()
    })

    it('uses physics colors when subject="physics"', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={hexagonData} subject="physics" />)
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#f97316'
      )
      expect(primaryCircle).toBeTruthy()
    })

    it('uses math colors when subject="math"', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={hexagonData} subject="math" />)
      const circles = container.querySelectorAll('circle')
      const primaryCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#6366f1'
      )
      expect(primaryCircle).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Measurements content
  // ---------------------------------------------------------------------------

  describe('measurements', () => {
    it('shows side label with value at measurement step', () => {
      mockCurrentStep = 3
      const { container } = render(<RegularPolygon data={hexagonData} />)
      expect(container.textContent).toContain('s = 5')
    })

    it('shows custom side label', () => {
      mockCurrentStep = 3
      const { container } = render(
        <RegularPolygon data={{ ...hexagonData, sideLabel: 'a' }} />
      )
      expect(container.textContent).toContain('a = 5')
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid
  // ---------------------------------------------------------------------------

  describe('data-testid', () => {
    it('has all required test ids when fully revealed (hexagon)', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('regular-polygon')).toBeInTheDocument()
      expect(screen.getByTestId('rp-background')).toBeInTheDocument()
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })
  })
})
