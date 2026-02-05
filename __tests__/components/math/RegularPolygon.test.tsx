import { render, screen } from '@testing-library/react'
import { RegularPolygon } from '@/components/geometry/RegularPolygon'
import type { RegularPolygonData } from '@/types/geometry'

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
    const colors = mockSubjectColors[opts.subject] || mockSubjectColors.geometry
    return {
      currentStep: mockCurrentStep,
      totalSteps: opts.totalSteps,
      next: jest.fn(),
      prev: jest.fn(),
      goToStep: jest.fn(),
      colors,
      lineWeight: 3,
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
  // Hexagon (6 sides) — has diagonals (n>=4), so steps: outline, vertices, diagonals, measurements = 4
  const hexagonData: RegularPolygonData = {
    sides: 6,
    sideLength: 5,
  }

  // Triangle (3 sides) — no diagonals, so steps: outline, vertices, measurements = 3
  const triangleData: RegularPolygonData = {
    sides: 3,
    sideLength: 4,
  }

  // Square (4 sides) — has diagonals, steps: outline, vertices, diagonals, measurements = 4
  const squareData: RegularPolygonData = {
    sides: 4,
    sideLength: 3,
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

    it('uses default width of 400 when not specified', () => {
      render(<RegularPolygon data={hexagonData} />)
      const container = screen.getByTestId('regular-polygon')
      expect(container.style.maxWidth).toBe('400px')
    })

    it('has accessible SVG with role and aria-label', () => {
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('role')).toBe('img')
      expect(svg?.getAttribute('aria-label')).toContain('Hexagon')
      expect(svg?.getAttribute('aria-label')).toContain('5')
    })

    it('uses correct polygon name in aria-label for known polygons', () => {
      const { container } = render(<RegularPolygon data={squareData} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Square')
    })

    it('uses generic name for unknown polygon counts', () => {
      const data: RegularPolygonData = { sides: 12, sideLength: 2 }
      const { container } = render(<RegularPolygon data={data} />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Regular 12-gon')
    })

    it('applies custom className', () => {
      render(<RegularPolygon data={hexagonData} className="my-custom-class" />)
      const container = screen.getByTestId('regular-polygon')
      expect(container.className).toContain('my-custom-class')
    })
  })

  // ---------------------------------------------------------------------------
  // Step-based Progressive Reveal
  // ---------------------------------------------------------------------------

  describe('progressive reveal', () => {
    // Hexagon: 4 steps — outline(0), vertices(1), diagonals(2), measurements(3)

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

    it('hides diagonals at step 0', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-diagonals')).not.toBeInTheDocument()
    })

    it('hides measurements at step 0', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-measurements')).not.toBeInTheDocument()
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

    it('shows diagonals at step 2 for hexagon (n>=4)', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
    })

    it('hides measurements at step 2 for hexagon', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-measurements')).not.toBeInTheDocument()
    })

    it('shows measurements at step 3 for hexagon', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    it('accumulates all previous steps at final step (hexagon step 3)', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    // Triangle: 3 steps — outline(0), vertices(1), measurements(2) — no diagonals
    it('does not render diagonals group for triangle (n<4)', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={triangleData} />)
      expect(screen.queryByTestId('rp-diagonals')).not.toBeInTheDocument()
    })

    it('shows measurements at step 2 for triangle (no diagonals step)', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={triangleData} />)
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    it('accumulates all steps for triangle at final step', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={triangleData} />)
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
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

    it('passes correct total steps for triangle (outline + vertices + measurements = 3)', () => {
      render(<RegularPolygon data={triangleData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-total')).toBe('3')
    })

    it('passes subject color to controls (default geometry)', () => {
      render(<RegularPolygon data={hexagonData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#ec4899')
    })

    it('passes physics subject color to controls', () => {
      render(<RegularPolygon data={hexagonData} subject="physics" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#f97316')
    })

    it('passes math subject color to controls', () => {
      render(<RegularPolygon data={hexagonData} subject="math" />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.getAttribute('data-color')).toBe('#6366f1')
    })

    it('displays correct step counter text', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={hexagonData} />)
      const controls = screen.getByTestId('diagram-step-controls')
      expect(controls.textContent).toContain('Step 3 / 4')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Colors
  // ---------------------------------------------------------------------------

  describe('subject colors', () => {
    it('uses geometry colors by default (primary #ec4899)', () => {
      mockCurrentStep = 0
      const { container } = render(<RegularPolygon data={hexagonData} />)
      // The outline fill uses geometry primary color with fillOpacity
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#ec4899'
      )
      expect(fillPath).toBeTruthy()
    })

    it('uses physics colors when subject="physics" (primary #f97316)', () => {
      mockCurrentStep = 0
      const { container } = render(<RegularPolygon data={hexagonData} subject="physics" />)
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#f97316'
      )
      expect(fillPath).toBeTruthy()
    })

    it('uses math colors when subject="math" (primary #6366f1)', () => {
      mockCurrentStep = 0
      const { container } = render(<RegularPolygon data={hexagonData} subject="math" />)
      const paths = container.querySelectorAll('path')
      const fillPath = Array.from(paths).find(
        (p) => p.getAttribute('fill') === '#6366f1'
      )
      expect(fillPath).toBeTruthy()
    })

    it('applies subject primary color to vertex dots', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const circles = container.querySelectorAll('circle')
      const vertexCircle = Array.from(circles).find(
        (c) => c.getAttribute('fill') === '#ec4899'
      )
      expect(vertexCircle).toBeTruthy()
    })

    it('applies accent color to diagonal strokes', () => {
      mockCurrentStep = 2
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const paths = container.querySelectorAll('path')
      const diagonalPath = Array.from(paths).find(
        (p) => p.getAttribute('stroke') === '#d946ef'
      )
      expect(diagonalPath).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // Vertex Labels
  // ---------------------------------------------------------------------------

  describe('vertex labels', () => {
    it('renders vertex labels A through F for hexagon at step 1', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={hexagonData} />)
      expect(container.textContent).toContain('A')
      expect(container.textContent).toContain('B')
      expect(container.textContent).toContain('C')
      expect(container.textContent).toContain('D')
      expect(container.textContent).toContain('E')
      expect(container.textContent).toContain('F')
    })

    it('renders vertex labels A through C for triangle at step 1', () => {
      mockCurrentStep = 1
      const { container } = render(<RegularPolygon data={triangleData} />)
      expect(container.textContent).toContain('A')
      expect(container.textContent).toContain('B')
      expect(container.textContent).toContain('C')
    })

    it('does not render vertex labels at step 0', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.queryByTestId('rp-vertices')).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Measurements
  // ---------------------------------------------------------------------------

  describe('measurements', () => {
    it('renders side label with default sideLabel "s"', () => {
      mockCurrentStep = 3
      const { container } = render(<RegularPolygon data={hexagonData} />)
      expect(container.textContent).toContain('s = 5')
    })

    it('renders custom sideLabel when provided', () => {
      mockCurrentStep = 3
      const data: RegularPolygonData = { sides: 6, sideLength: 5, sideLabel: 'a' }
      const { container } = render(<RegularPolygon data={data} />)
      expect(container.textContent).toContain('a = 5')
    })

    it('renders apothem value when showApothem is true (default)', () => {
      mockCurrentStep = 3
      const { container } = render(<RegularPolygon data={hexagonData} />)
      // Apothem for hexagon with side 5: 5 / (2 * tan(PI/6)) = 5 / (2 * 0.5774) ~ 4.33
      expect(container.textContent).toMatch(/a = \d+\.\d+/)
    })

    it('does not render apothem when showApothem is false', () => {
      mockCurrentStep = 3
      const data: RegularPolygonData = { sides: 6, sideLength: 5, showApothem: false }
      const { container } = render(<RegularPolygon data={data} />)
      // Check that no apothem label is present (side label "s = 5" will still be there)
      const textElements = container.querySelectorAll('text')
      const apothemText = Array.from(textElements).find(
        (t) => t.textContent?.startsWith('a = ')
      )
      expect(apothemText).toBeFalsy()
    })

    it('renders interior angle when showInteriorAngle is true (default)', () => {
      mockCurrentStep = 3
      const { container } = render(<RegularPolygon data={hexagonData} />)
      // Interior angle for hexagon: (6-2)*180/6 = 120.0 degrees
      expect(container.textContent).toContain('120.0')
    })

    it('does not render interior angle when showInteriorAngle is false', () => {
      mockCurrentStep = 3
      const data: RegularPolygonData = { sides: 6, sideLength: 5, showInteriorAngle: false }
      const { container } = render(<RegularPolygon data={data} />)
      expect(container.textContent).not.toContain('120.0\u00B0')
    })
  })

  // ---------------------------------------------------------------------------
  // Polygon Name Display
  // ---------------------------------------------------------------------------

  describe('polygon names', () => {
    it('uses "Equilateral Triangle" for 3 sides in English', () => {
      const { container } = render(<RegularPolygon data={triangleData} language="en" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Equilateral Triangle')
    })

    it('uses "Square" for 4 sides in English', () => {
      const { container } = render(<RegularPolygon data={squareData} language="en" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Square')
    })

    it('uses "Regular Pentagon" for 5 sides', () => {
      const data: RegularPolygonData = { sides: 5, sideLength: 3 }
      const { container } = render(<RegularPolygon data={data} language="en" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Regular Pentagon')
    })

    it('uses "Regular Hexagon" for 6 sides', () => {
      const { container } = render(<RegularPolygon data={hexagonData} language="en" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Regular Hexagon')
    })

    it('uses Hebrew name for triangle when language="he"', () => {
      const { container } = render(<RegularPolygon data={triangleData} language="he" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('\u05DE\u05E9\u05D5\u05DC\u05E9')
    })

    it('falls back to "Regular N-gon" for unsupported side counts', () => {
      const data: RegularPolygonData = { sides: 10, sideLength: 2 }
      const { container } = render(<RegularPolygon data={data} language="en" />)
      const svg = container.querySelector('svg')
      expect(svg?.getAttribute('aria-label')).toContain('Regular 10-gon')
    })
  })

  // ---------------------------------------------------------------------------
  // Diagonals (only for n >= 4)
  // ---------------------------------------------------------------------------

  describe('diagonals', () => {
    it('renders diagonals group for square (n=4) at diagonals step', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={squareData} />)
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
    })

    it('does not include diagonals step for triangle (n=3)', () => {
      // Triangle has only 3 steps: outline(0), vertices(1), measurements(2)
      const controls = render(<RegularPolygon data={triangleData} />)
      const stepControls = screen.getByTestId('diagram-step-controls')
      expect(stepControls.getAttribute('data-total')).toBe('3')
    })

    it('renders diagonal paths with dashed stroke', () => {
      mockCurrentStep = 2
      const { container } = render(<RegularPolygon data={hexagonData} />)
      const paths = container.querySelectorAll('path')
      const dashedPath = Array.from(paths).find(
        (p) => p.getAttribute('stroke-dasharray') === '4,3' && p.getAttribute('stroke') === '#d946ef'
      )
      expect(dashedPath).toBeTruthy()
    })
  })

  // ---------------------------------------------------------------------------
  // data-testid Coverage
  // ---------------------------------------------------------------------------

  describe('data-testid attributes', () => {
    it('has regular-polygon on root container', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('regular-polygon')).toBeInTheDocument()
    })

    it('has rp-background on background rect', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-background')).toBeInTheDocument()
    })

    it('has rp-outline on polygon outline group', () => {
      mockCurrentStep = 0
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-outline')).toBeInTheDocument()
    })

    it('has rp-vertices on vertices group', () => {
      mockCurrentStep = 1
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-vertices')).toBeInTheDocument()
    })

    it('has rp-diagonals on diagonals group (n>=4)', () => {
      mockCurrentStep = 2
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-diagonals')).toBeInTheDocument()
    })

    it('has rp-measurements on measurements group', () => {
      mockCurrentStep = 3
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('rp-measurements')).toBeInTheDocument()
    })

    it('has diagram-step-controls', () => {
      render(<RegularPolygon data={hexagonData} />)
      expect(screen.getByTestId('diagram-step-controls')).toBeInTheDocument()
    })
  })
})
