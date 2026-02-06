import { render, screen, fireEvent } from '@testing-library/react'
import { WhatIfMode, SUBJECT_COLORS } from '@/components/interactive/WhatIfMode'
import type {
  ParameterDefinition,
  CalculationResult,
  ExplorationSuggestion,
} from '@/types/interactivity'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
    button: ({ children, whileHover, whileTap, ...props }: Record<string, unknown>) => <button {...props}>{children as React.ReactNode}</button>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// =============================================================================
// Test Data
// =============================================================================

const mockParameters: ParameterDefinition[] = [
  {
    name: 'mass',
    label: 'Mass',
    labelHe: 'מסה',
    default: 5,
    min: 0.1,
    max: 100,
    step: 0.1,
    unit: 'kg',
    unitHe: 'ק"ג',
    category: 'mass',
  },
  {
    name: 'angle',
    label: 'Angle',
    labelHe: 'זווית',
    default: 30,
    min: 0,
    max: 90,
    step: 1,
    unit: '°',
    category: 'angle',
  },
]

const mockResults: CalculationResult[] = [
  {
    value: 49,
    unit: 'N',
    description: 'The weight force acting on the object',
    label: 'Weight',
    labelHe: 'משקל',
    formatted: '49.0 N',
    isPrimary: true,
  },
  {
    value: 24.5,
    unit: 'N',
    description: 'Component of weight parallel to incline',
    label: 'Parallel Weight',
    labelHe: 'רכיב מקביל',
    formatted: '24.5 N',
  },
  {
    value: 42.4,
    unit: 'N',
    description: 'Component of weight perpendicular to incline',
    label: 'Perpendicular Weight',
    labelHe: 'רכיב אנכי',
    formatted: '42.4 N',
  },
]

const mockSuggestions: ExplorationSuggestion[] = [
  {
    id: 'suggestion-1',
    question: 'What if the angle was steeper?',
    questionHe: 'מה אם הזווית הייתה תלולה יותר?',
    parameterChanges: { angle: 60 },
    insight: 'A steeper angle increases the parallel component of weight',
  },
  {
    id: 'suggestion-2',
    question: 'What if the mass was doubled?',
    questionHe: 'מה אם המסה הייתה כפולה?',
    parameterChanges: { mass: 10 },
    insight: 'Doubling mass doubles all force magnitudes',
  },
]

// =============================================================================
// Tests
// =============================================================================

describe('WhatIfMode', () => {
  const defaultProps = {
    parameters: mockParameters,
    values: { mass: 5, angle: 30 },
    onParameterChange: jest.fn(),
    onParametersChange: jest.fn(),
    results: mockResults,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders with required props', () => {
      render(<WhatIfMode {...defaultProps} />)

      expect(screen.getByTestId('what-if-mode')).toBeInTheDocument()
      expect(screen.getByText('What If?')).toBeInTheDocument()
    })

    it('renders Hebrew labels when language is he', () => {
      render(<WhatIfMode {...defaultProps} language="he" />)

      expect(screen.getByText('מה אם?')).toBeInTheDocument()
      expect(screen.getByText('פרמטרים')).toBeInTheDocument()
    })

    it('renders primary result always visible', () => {
      render(<WhatIfMode {...defaultProps} />)

      expect(screen.getByText('Weight')).toBeInTheDocument()
      expect(screen.getByText('49.0 N')).toBeInTheDocument()
    })

    it('renders Hebrew result labels when language is he', () => {
      render(<WhatIfMode {...defaultProps} language="he" />)

      expect(screen.getByText('משקל')).toBeInTheDocument()
    })

    it('renders all results when expanded', () => {
      render(<WhatIfMode {...defaultProps} expanded={true} />)

      expect(screen.getByText('Parallel Weight')).toBeInTheDocument()
      expect(screen.getByText('Perpendicular Weight')).toBeInTheDocument()
    })

    it('renders suggestions when provided', () => {
      render(
        <WhatIfMode {...defaultProps} suggestions={mockSuggestions} expanded={true} />
      )

      expect(screen.getByText('What if the angle was steeper?')).toBeInTheDocument()
      expect(screen.getByText('What if the mass was doubled?')).toBeInTheDocument()
    })

    it('renders Hebrew suggestions when language is he', () => {
      render(
        <WhatIfMode
          {...defaultProps}
          suggestions={mockSuggestions}
          language="he"
          expanded={true}
        />
      )

      expect(screen.getByText('מה אם הזווית הייתה תלולה יותר?')).toBeInTheDocument()
      expect(screen.getByText('מה אם המסה הייתה כפולה?')).toBeInTheDocument()
    })

    it('renders parameter sliders', () => {
      render(<WhatIfMode {...defaultProps} expanded={true} />)

      expect(screen.getByText('Mass')).toBeInTheDocument()
      expect(screen.getByText('Angle')).toBeInTheDocument()
    })

    it('applies custom className', () => {
      render(<WhatIfMode {...defaultProps} className="custom-class" />)

      expect(screen.getByTestId('what-if-mode')).toHaveClass('custom-class')
    })
  })

  // ---------------------------------------------------------------------------
  // Subject Theming
  // ---------------------------------------------------------------------------

  describe('subject theming', () => {
    it('applies physics theme by default', () => {
      render(<WhatIfMode {...defaultProps} />)

      const container = screen.getByTestId('what-if-mode')
      expect(container).toHaveClass('border-blue-200')
    })

    it('applies math theme', () => {
      render(<WhatIfMode {...defaultProps} subject="math" />)

      const container = screen.getByTestId('what-if-mode')
      expect(container).toHaveClass('border-purple-200')
    })

    it('applies chemistry theme', () => {
      render(<WhatIfMode {...defaultProps} subject="chemistry" />)

      const container = screen.getByTestId('what-if-mode')
      expect(container).toHaveClass('border-emerald-200')
    })

    it('applies biology theme', () => {
      render(<WhatIfMode {...defaultProps} subject="biology" />)

      const container = screen.getByTestId('what-if-mode')
      expect(container).toHaveClass('border-amber-200')
    })

    it('applies geometry theme', () => {
      render(<WhatIfMode {...defaultProps} subject="geometry" />)

      const container = screen.getByTestId('what-if-mode')
      expect(container).toHaveClass('border-pink-200')
    })
  })

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  describe('interactions', () => {
    it('calls onParameterChange when slider changes', () => {
      const onParameterChange = jest.fn()
      render(
        <WhatIfMode
          {...defaultProps}
          onParameterChange={onParameterChange}
          expanded={true}
        />
      )

      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '10' } })

      expect(onParameterChange).toHaveBeenCalledWith('mass', 10)
    })

    it('calls onParametersChange when reset button is clicked', () => {
      const onParametersChange = jest.fn()
      render(
        <WhatIfMode {...defaultProps} onParametersChange={onParametersChange} />
      )

      fireEvent.click(screen.getByTestId('reset-button'))

      expect(onParametersChange).toHaveBeenCalledWith({
        mass: 5,  // default
        angle: 30, // default
      })
    })

    it('calls onReset callback when reset button is clicked', () => {
      const onReset = jest.fn()
      render(<WhatIfMode {...defaultProps} onReset={onReset} />)

      fireEvent.click(screen.getByTestId('reset-button'))

      expect(onReset).toHaveBeenCalled()
    })

    it('calls onToggleExpanded when toggle button is clicked', () => {
      const onToggleExpanded = jest.fn()
      render(
        <WhatIfMode {...defaultProps} onToggleExpanded={onToggleExpanded} />
      )

      fireEvent.click(screen.getByTestId('toggle-button'))

      expect(onToggleExpanded).toHaveBeenCalled()
    })

    it('applies suggestion parameter changes when suggestion is clicked', () => {
      const onParametersChange = jest.fn()
      render(
        <WhatIfMode
          {...defaultProps}
          onParametersChange={onParametersChange}
          suggestions={mockSuggestions}
          expanded={true}
        />
      )

      fireEvent.click(screen.getByText('What if the angle was steeper?'))

      expect(onParametersChange).toHaveBeenCalledWith({ angle: 60 })
    })
  })

  // ---------------------------------------------------------------------------
  // Expand/Collapse
  // ---------------------------------------------------------------------------

  describe('expand/collapse', () => {
    it('shows content when expanded is true', () => {
      render(<WhatIfMode {...defaultProps} expanded={true} />)

      expect(screen.getByText('Parameters')).toBeInTheDocument()
      expect(screen.getByText('Results')).toBeInTheDocument()
    })

    it('hides content when expanded is false', () => {
      render(<WhatIfMode {...defaultProps} expanded={false} />)

      expect(screen.queryByText('Parameters')).not.toBeInTheDocument()
      expect(screen.queryByText('Results')).not.toBeInTheDocument()
    })

    it('does not render toggle button when onToggleExpanded is not provided', () => {
      render(<WhatIfMode {...defaultProps} onToggleExpanded={undefined} />)

      expect(screen.queryByTestId('toggle-button')).not.toBeInTheDocument()
    })

    it('renders toggle button when onToggleExpanded is provided', () => {
      render(<WhatIfMode {...defaultProps} onToggleExpanded={jest.fn()} />)

      expect(screen.getByTestId('toggle-button')).toBeInTheDocument()
    })
  })

  // ---------------------------------------------------------------------------
  // RTL Support
  // ---------------------------------------------------------------------------

  describe('RTL support', () => {
    it('has LTR direction by default', () => {
      render(<WhatIfMode {...defaultProps} />)

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('dir', 'ltr')
    })

    it('has RTL direction when language is he', () => {
      render(<WhatIfMode {...defaultProps} language="he" />)

      expect(screen.getByTestId('what-if-mode')).toHaveAttribute('dir', 'rtl')
    })
  })

  // ---------------------------------------------------------------------------
  // Empty States
  // ---------------------------------------------------------------------------

  describe('empty states', () => {
    it('handles empty results array', () => {
      render(<WhatIfMode {...defaultProps} results={[]} expanded={true} />)

      expect(screen.queryByText('Results')).not.toBeInTheDocument()
    })

    it('handles empty parameters array', () => {
      render(
        <WhatIfMode {...defaultProps} parameters={[]} values={{}} expanded={true} />
      )

      expect(screen.queryByText('Parameters')).not.toBeInTheDocument()
    })

    it('handles no suggestions', () => {
      render(<WhatIfMode {...defaultProps} expanded={true} />)

      expect(screen.queryByText('Try These')).not.toBeInTheDocument()
    })

    it('handles results without primary', () => {
      const resultsWithoutPrimary = mockResults.map((r) => ({ ...r, isPrimary: false }))
      render(<WhatIfMode {...defaultProps} results={resultsWithoutPrimary} expanded={false} />)

      // When collapsed and no primary, the primary result section should not be visible
      // The results would only appear in the expanded section
      const container = screen.getByTestId('what-if-mode')
      // Check that the primary result section (which appears before expanded content) is not there
      const borderSection = container.querySelector('.border-b.border-gray-100')
      expect(borderSection).toBeNull()
    })
  })

  // ---------------------------------------------------------------------------
  // Parameter Categories
  // ---------------------------------------------------------------------------

  describe('parameter categories', () => {
    it('groups parameters by category', () => {
      const categorizedParams: ParameterDefinition[] = [
        { name: 'mass1', label: 'Mass 1', default: 5, min: 0, max: 10, step: 1, category: 'mass' },
        { name: 'mass2', label: 'Mass 2', default: 10, min: 0, max: 20, step: 1, category: 'mass' },
        { name: 'angle', label: 'Angle', default: 30, min: 0, max: 90, step: 1, category: 'angle' },
      ]

      render(
        <WhatIfMode
          {...defaultProps}
          parameters={categorizedParams}
          values={{ mass1: 5, mass2: 10, angle: 30 }}
          expanded={true}
        />
      )

      // All parameters should be rendered
      expect(screen.getByText('Mass 1')).toBeInTheDocument()
      expect(screen.getByText('Mass 2')).toBeInTheDocument()
      expect(screen.getByText('Angle')).toBeInTheDocument()
    })

    it('handles parameters without category', () => {
      const uncategorizedParams: ParameterDefinition[] = [
        { name: 'param1', label: 'Param 1', default: 5, min: 0, max: 10, step: 1 },
      ]

      render(
        <WhatIfMode
          {...defaultProps}
          parameters={uncategorizedParams}
          values={{ param1: 5 }}
          expanded={true}
        />
      )

      expect(screen.getByText('Param 1')).toBeInTheDocument()
    })
  })
})

// =============================================================================
// SUBJECT_COLORS Export Test
// =============================================================================

describe('SUBJECT_COLORS', () => {
  it('exports subject color configurations', () => {
    expect(SUBJECT_COLORS).toBeDefined()
    expect(SUBJECT_COLORS.physics).toBeDefined()
    expect(SUBJECT_COLORS.math).toBeDefined()
    expect(SUBJECT_COLORS.chemistry).toBeDefined()
    expect(SUBJECT_COLORS.biology).toBeDefined()
    expect(SUBJECT_COLORS.geometry).toBeDefined()
  })

  it('has correct structure for each subject', () => {
    Object.values(SUBJECT_COLORS).forEach((colors) => {
      expect(colors).toHaveProperty('primary')
      expect(colors).toHaveProperty('secondary')
      expect(colors).toHaveProperty('background')
      expect(colors).toHaveProperty('border')
      expect(colors).toHaveProperty('accent')
    })
  })
})
