import { render, screen, fireEvent } from '@testing-library/react'
import { InteractiveCollisionDiagram } from '@/components/physics/InteractiveCollisionDiagram'
import type { CollisionDiagramData } from '@/types/physics'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    button: ({ children, whileHover, whileTap, ...props }: Record<string, unknown>) => <button {...props}>{children as React.ReactNode}</button>,
    svg: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <svg {...props}>{children as React.ReactNode}</svg>,
    g: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <g {...props}>{children as React.ReactNode}</g>,
    path: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <path {...props} />,
    rect: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <rect {...props} />,
    circle: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <circle {...props} />,
    text: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <text {...props}>{children as React.ReactNode}</text>,
    line: ({ initial, animate, exit, ...props }: Record<string, unknown>) => <line {...props} />,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Mock the CollisionDiagram component
jest.mock('@/components/physics/CollisionDiagram', () => ({
  CollisionDiagram: ({ data, width, height, language }: {
    data: CollisionDiagramData
    width?: number
    height?: number
    language?: string
  }) => (
    <div
      data-testid="collision-diagram"
      data-width={width}
      data-height={height}
      data-language={language}
      data-collision-type={data.collisionType}
      data-objects-count={data.objects.length}
    >
      Collision Diagram Mock
    </div>
  ),
}))

// Mock the WhatIfMode component
jest.mock('@/components/interactive', () => ({
  WhatIfMode: ({
    parameters,
    values,
    onParameterChange,
    onParametersChange,
    results,
    language,
    subject,
    expanded,
    onToggleExpanded,
    onReset,
  }: {
    parameters: unknown[]
    values: Record<string, number>
    onParameterChange: (name: string, value: number) => void
    onParametersChange: (values: Record<string, number>) => void
    results: unknown[]
    language?: string
    subject?: string
    expanded?: boolean
    onToggleExpanded?: () => void
    onReset?: () => void
  }) => (
    <div
      data-testid="what-if-mode"
      data-language={language}
      data-subject={subject}
      data-expanded={expanded}
      data-parameters-count={parameters.length}
      data-results-count={results.length}
    >
      <span>What-If Mode Mock</span>
      <span data-testid="mass1-value">{values.mass1}</span>
      <span data-testid="mass2-value">{values.mass2}</span>
      <span data-testid="velocity1-value">{values.velocity1}</span>
      <span data-testid="velocity2-value">{values.velocity2}</span>
      <span data-testid="elasticity-value">{values.elasticity}</span>
      <button
        data-testid="change-mass1-btn"
        onClick={() => onParameterChange('mass1', 5)}
      >
        Change Mass 1
      </button>
      <button
        data-testid="change-all-btn"
        onClick={() => onParametersChange({ mass1: 10, mass2: 15 })}
      >
        Change All
      </button>
      <button
        data-testid="reset-btn"
        onClick={onReset}
      >
        Reset
      </button>
      <button
        data-testid="toggle-expanded-btn"
        onClick={onToggleExpanded}
      >
        Toggle Expanded
      </button>
    </div>
  ),
}))

// Mock the visual-learning lib
jest.mock('@/lib/visual-learning', () => ({
  COLLISION_PARAMETERS: [
    { name: 'mass1', label: 'Mass 1', labelHe: 'מסה 1', default: 2, min: 0.1, max: 20, step: 0.1, unit: 'kg', category: 'mass' },
    { name: 'mass2', label: 'Mass 2', labelHe: 'מסה 2', default: 3, min: 0.1, max: 20, step: 0.1, unit: 'kg', category: 'mass' },
    { name: 'velocity1', label: 'Velocity 1', labelHe: 'מהירות 1', default: 5, min: -10, max: 10, step: 0.5, unit: 'm/s', category: 'velocity' },
    { name: 'velocity2', label: 'Velocity 2', labelHe: 'מהירות 2', default: -2, min: -10, max: 10, step: 0.5, unit: 'm/s', category: 'velocity' },
    { name: 'elasticity', label: 'Elasticity', labelHe: 'אלסטיות', default: 1, min: 0, max: 1, step: 0.1, unit: '', category: 'other' },
  ],
  getCollisionResults: jest.fn(() => [
    { value: 1.4, unit: 'm/s', label: 'v1 final', formatted: '1.40 m/s', isPrimary: true },
    { value: 3.6, unit: 'm/s', label: 'v2 final', formatted: '3.60 m/s' },
  ]),
  calculateCollision: jest.fn(() => ({
    v1Final: 1.4,
    v2Final: 3.6,
    momentumInitial: 4,
    momentumFinal: 4,
    kineticEnergyInitial: 31,
    kineticEnergyFinal: 31,
    energyLoss: 0,
  })),
}))

// Mock the useInteractiveParameters hook
const mockSetValue = jest.fn()
const mockSetValues = jest.fn()
const mockReset = jest.fn()

// Track the last parameters passed to useInteractiveParameters
let lastHookParams: { name: string; default: number }[] = []

jest.mock('@/hooks/useInteractiveParameters', () => ({
  useInteractiveParameters: (params: { name: string; default: number }[], options: { onChange?: (values: Record<string, number>) => void }) => {
    // Store params for assertions if needed
    lastHookParams = params

    // Build values from the parameter defaults (which come from initial data)
    const values: Record<string, number> = {}
    params.forEach(p => {
      values[p.name] = p.default
    })

    return {
      values,
      actions: {
        setValue: mockSetValue,
        setValues: mockSetValues,
        reset: mockReset,
      },
      results: [
        { value: 1.4, unit: 'm/s', label: 'v1 final', formatted: '1.40 m/s', isPrimary: true },
        { value: 3.6, unit: 'm/s', label: 'v2 final', formatted: '3.60 m/s' },
      ],
    }
  },
}))

// =============================================================================
// Test Data
// =============================================================================

const mockCollisionData: CollisionDiagramData = {
  objects: [
    {
      object: {
        type: 'block',
        position: { x: 100, y: 150 },
        mass: 2,
        label: 'm1',
        width: 50,
        height: 50,
        color: '#3b82f6',
      },
      velocity: { before: 5, after: 1.4 },
    },
    {
      object: {
        type: 'block',
        position: { x: 300, y: 150 },
        mass: 3,
        label: 'm2',
        width: 60,
        height: 50,
        color: '#ef4444',
      },
      velocity: { before: -2, after: 3.6 },
    },
  ],
  collisionType: 'elastic',
  showBefore: true,
  showAfter: true,
  showMomentum: true,
  title: 'Elastic Collision',
}

const mockInelasticData: CollisionDiagramData = {
  ...mockCollisionData,
  collisionType: 'perfectly_inelastic',
  title: 'Perfectly Inelastic Collision',
}

// =============================================================================
// Tests
// =============================================================================

describe('InteractiveCollisionDiagram', () => {
  const defaultProps = {
    initialData: mockCollisionData,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
      expect(screen.getByTestId('collision-diagram')).toBeInTheDocument()
    })

    it('renders the CollisionDiagram component', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toBeInTheDocument()
      expect(diagram).toHaveAttribute('data-collision-type', 'elastic')
      expect(diagram).toHaveAttribute('data-objects-count', '2')
    })

    it('renders toggle button for What-If mode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
    })

    it('does not show WhatIfMode panel when whatIfEnabled is false (default)', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()
    })

    it('shows WhatIfMode panel when whatIfEnabled is true', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // What-If Mode Toggle
  // ---------------------------------------------------------------------------

  describe('what-if mode toggle', () => {
    it('toggles what-if mode when button is clicked', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      // Initially, WhatIfMode should not be visible
      expect(screen.queryByTestId('what-if-mode')).not.toBeInTheDocument()

      // Click the toggle button
      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton)

      // Now WhatIfMode should be visible
      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
    })

    it('calls onWhatIfToggle callback when toggled', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton)

      expect(onWhatIfToggle).toHaveBeenCalledWith(true)
    })

    it('toggles off when clicked again', () => {
      const onWhatIfToggle = jest.fn()
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          whatIfEnabled={true}
          onWhatIfToggle={onWhatIfToggle}
        />
      )

      const toggleButton = screen.getByText('What-If Mode')
      fireEvent.click(toggleButton)

      expect(onWhatIfToggle).toHaveBeenCalledWith(false)
    })
  })

  // ---------------------------------------------------------------------------
  // RTL/Hebrew Support
  // ---------------------------------------------------------------------------

  describe('RTL/Hebrew support', () => {
    it('renders in English by default', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByText('What-If Mode')).toBeInTheDocument()
      expect(screen.getByTestId('collision-diagram')).toHaveAttribute('data-language', 'en')
      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-language', 'en')
    })

    it('renders Hebrew text when language is he', () => {
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          language="he"
          whatIfEnabled={true}
        />
      )

      // Hebrew toggle text
      expect(screen.getByText('מצב "מה אם"')).toBeInTheDocument()

      // Check language prop passed to children
      expect(screen.getByTestId('collision-diagram')).toHaveAttribute('data-language', 'he')
      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-language', 'he')
    })

    it('applies RTL layout when language is he', () => {
      const { container } = render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          language="he"
          whatIfEnabled={true}
        />
      )

      // Check for flex-row-reverse class which indicates RTL layout
      const layoutContainer = container.querySelector('.flex-row-reverse')
      expect(layoutContainer).toBeInTheDocument()
    })

    it('applies LTR layout when language is en', () => {
      const { container } = render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          language="en"
          whatIfEnabled={true}
        />
      )

      // Check that flex-row-reverse is NOT present (LTR layout)
      const layoutContainer = container.querySelector('.flex-row-reverse')
      expect(layoutContainer).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Changes via WhatIfMode Callbacks
  // ---------------------------------------------------------------------------

  describe('parameter changes via WhatIfMode callbacks', () => {
    it('passes setValue action to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      const changeBtn = screen.getByTestId('change-mass1-btn')
      fireEvent.click(changeBtn)

      // The mock WhatIfMode calls onParameterChange which maps to actions.setValue
      expect(mockSetValue).toHaveBeenCalledWith('mass1', 5)
    })

    it('passes setValues action to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      const changeAllBtn = screen.getByTestId('change-all-btn')
      fireEvent.click(changeAllBtn)

      expect(mockSetValues).toHaveBeenCalledWith({ mass1: 10, mass2: 15 })
    })

    it('passes reset action to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      const resetBtn = screen.getByTestId('reset-btn')
      fireEvent.click(resetBtn)

      expect(mockReset).toHaveBeenCalled()
    })

    it('displays current parameter values in WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      // Values come from initialData.objects[*].object.mass and velocity.before
      // and from collisionType -> elasticity mapping (elastic=1, inelastic=0.5, perfectly_inelastic=0)
      expect(screen.getByTestId('mass1-value')).toHaveTextContent('2')
      expect(screen.getByTestId('mass2-value')).toHaveTextContent('3')
      expect(screen.getByTestId('velocity1-value')).toHaveTextContent('5')
      expect(screen.getByTestId('velocity2-value')).toHaveTextContent('-2')
      expect(screen.getByTestId('elasticity-value')).toHaveTextContent('1') // elastic -> 1
    })
  })

  // ---------------------------------------------------------------------------
  // Initial Data Handling
  // ---------------------------------------------------------------------------

  describe('initial data handling', () => {
    it('respects initialData for elastic collision', () => {
      render(<InteractiveCollisionDiagram initialData={mockCollisionData} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-collision-type', 'elastic')
    })

    it('respects initialData for inelastic collision', () => {
      render(<InteractiveCollisionDiagram initialData={mockInelasticData} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-collision-type', 'perfectly_inelastic')
    })

    it('extracts initial values from data objects', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      // Values should be extracted from initialData.objects
      expect(screen.getByTestId('mass1-value')).toHaveTextContent('2')
      expect(screen.getByTestId('velocity1-value')).toHaveTextContent('5')
    })

    it('respects initialStep prop', () => {
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          initialStep={2}
        />
      )

      // The diagram should be rendered (initialStep is passed through)
      expect(screen.getByTestId('collision-diagram')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Width/Height Props
  // ---------------------------------------------------------------------------

  describe('width/height props', () => {
    it('passes default width to CollisionDiagram', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-width', '500')
    })

    it('passes default height to CollisionDiagram', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-height', '350')
    })

    it('passes custom width to CollisionDiagram', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} width={800} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-width', '800')
    })

    it('passes custom height to CollisionDiagram', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} height={600} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-height', '600')
    })

    it('passes both custom width and height', () => {
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          width={700}
          height={450}
        />
      )

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-width', '700')
      expect(diagram).toHaveAttribute('data-height', '450')
    })
  })

  // ---------------------------------------------------------------------------
  // WhatIfMode Panel Configuration
  // ---------------------------------------------------------------------------

  describe('WhatIfMode panel configuration', () => {
    it('passes physics subject to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-subject', 'physics')
    })

    it('passes parameters count to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      // 5 collision parameters: mass1, mass2, velocity1, velocity2, elasticity
      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-parameters-count', '5')
    })

    it('passes results to WhatIfMode', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-results-count', '2')
    })

    it('starts with expanded state by default', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('data-expanded', 'true')
    })
  })

  // ---------------------------------------------------------------------------
  // onParamsChange Callback
  // ---------------------------------------------------------------------------

  describe('onParamsChange callback', () => {
    it('does not call onParamsChange when what-if is disabled', () => {
      const onParamsChange = jest.fn()
      render(
        <InteractiveCollisionDiagram
          {...defaultProps}
          whatIfEnabled={false}
          onParamsChange={onParamsChange}
        />
      )

      // Since what-if is disabled, no callback should be triggered
      expect(onParamsChange).not.toHaveBeenCalled()
    })
  })

  // ---------------------------------------------------------------------------
  // Visual Styling
  // ---------------------------------------------------------------------------

  describe('visual styling', () => {
    it('applies active styling to toggle button when what-if is enabled', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />)

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-blue-100')
    })

    it('applies inactive styling to toggle button when what-if is disabled', () => {
      render(<InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={false} />)

      const toggleButton = screen.getByText('What-If Mode').closest('button')
      expect(toggleButton).toHaveClass('bg-gray-100')
    })

    it('applies ring styling to diagram when what-if is enabled', () => {
      const { container } = render(
        <InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={true} />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).toBeInTheDocument()
    })

    it('does not apply ring styling when what-if is disabled', () => {
      const { container } = render(
        <InteractiveCollisionDiagram {...defaultProps} whatIfEnabled={false} />
      )

      const diagramContainer = container.querySelector('.ring-2')
      expect(diagramContainer).not.toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // Edge Cases
  // ---------------------------------------------------------------------------

  describe('edge cases', () => {
    it('handles data with minimal objects', () => {
      const minimalData: CollisionDiagramData = {
        objects: [
          {
            object: { type: 'block', position: { x: 0, y: 0 } },
            velocity: { before: 0 },
          },
          {
            object: { type: 'block', position: { x: 100, y: 0 } },
            velocity: { before: 0 },
          },
        ],
        collisionType: 'elastic',
      }

      render(<InteractiveCollisionDiagram initialData={minimalData} />)

      expect(screen.getByTestId('collision-diagram')).toBeInTheDocument()
    })

    it('handles perfectly inelastic collision type', () => {
      const inelasticData: CollisionDiagramData = {
        ...mockCollisionData,
        collisionType: 'perfectly_inelastic',
      }

      render(<InteractiveCollisionDiagram initialData={inelasticData} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-collision-type', 'perfectly_inelastic')
    })

    it('handles inelastic collision type', () => {
      const inelasticData: CollisionDiagramData = {
        ...mockCollisionData,
        collisionType: 'inelastic',
      }

      render(<InteractiveCollisionDiagram initialData={inelasticData} />)

      const diagram = screen.getByTestId('collision-diagram')
      expect(diagram).toHaveAttribute('data-collision-type', 'inelastic')
    })
  })
})
