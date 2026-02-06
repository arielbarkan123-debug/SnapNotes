import { render, screen, fireEvent } from '@testing-library/react'
import { ParameterSlider, ParameterSliderGroup, ParameterDef, convertLegacyParameter } from '@/components/interactive/ParameterSlider'
import type { ParameterDefinition, SliderMark } from '@/types/interactivity'

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate, exit, ...props }: Record<string, unknown>) => <div {...props}>{children as React.ReactNode}</div>,
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// =============================================================================
// Test Data
// =============================================================================

const newStyleParameter: ParameterDefinition = {
  name: 'mass',
  label: 'Mass',
  labelHe: 'מסה',
  default: 5,
  min: 0.1,
  max: 100,
  step: 0.1,
  unit: 'kg',
  unitHe: 'ק"ג',
  description: 'Object mass',
  descriptionHe: 'מסת העצם',
  category: 'mass',
  affectsPhysics: true,
  color: '#3b82f6',
}

const legacyParameter: ParameterDef = {
  id: 'angle',
  name: 'Angle',
  symbol: 'θ',
  unit: '°',
  min: 0,
  max: 90,
  step: 1,
  defaultValue: 30,
  description: 'Incline angle',
  color: '#10b981',
  affectsPhysics: true,
}

const testMarks: SliderMark[] = [
  { value: 0, label: 'Min', labelHe: 'מינימום' },
  { value: 45, label: 'Half', labelHe: 'חצי' },
  { value: 90, label: 'Max', labelHe: 'מקסימום' },
]

// =============================================================================
// convertLegacyParameter Tests
// =============================================================================

describe('convertLegacyParameter', () => {
  it('converts legacy ParameterDef to ParameterDefinition', () => {
    const result = convertLegacyParameter(legacyParameter)

    expect(result.name).toBe('angle')
    expect(result.label).toBe('Angle')
    expect(result.default).toBe(30)
    expect(result.min).toBe(0)
    expect(result.max).toBe(90)
    expect(result.step).toBe(1)
    expect(result.unit).toBe('°')
    expect(result.description).toBe('Incline angle')
    expect(result.color).toBe('#10b981')
    expect(result.affectsPhysics).toBe(true)
  })

  it('handles undefined optional fields', () => {
    const minimal: ParameterDef = {
      id: 'test',
      name: 'Test',
      min: 0,
      max: 10,
      step: 1,
      defaultValue: 5,
    }

    const result = convertLegacyParameter(minimal)

    expect(result.name).toBe('test')
    expect(result.label).toBe('Test')
    expect(result.unit).toBeUndefined()
    expect(result.description).toBeUndefined()
    expect(result.color).toBeUndefined()
  })
})

// =============================================================================
// ParameterSlider Tests
// =============================================================================

describe('ParameterSlider', () => {
  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders with new-style ParameterDefinition', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByLabelText('Mass')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toHaveValue('10')
      expect(screen.getByRole('spinbutton')).toHaveValue(10)
      expect(screen.getByText('kg')).toBeInTheDocument()
    })

    it('renders with legacy ParameterDef', () => {
      render(
        <ParameterSlider
          parameter={legacyParameter}
          value={45}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByLabelText('Angle')).toBeInTheDocument()
      expect(screen.getByRole('slider')).toHaveValue('45')
      expect(screen.getByRole('spinbutton')).toHaveValue(45)
      expect(screen.getByText('°')).toBeInTheDocument()
    })

    it('renders Hebrew labels when language is he', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          language="he"
        />
      )

      expect(screen.getByText('מסה')).toBeInTheDocument()
      expect(screen.getByText('ק"ג')).toBeInTheDocument()
    })

    it('renders description when not compact', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          compact={false}
        />
      )

      expect(screen.getByText('Object mass')).toBeInTheDocument()
    })

    it('does not render description when compact', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          compact={true}
        />
      )

      expect(screen.queryByText('Object mass')).not.toBeInTheDocument()
    })

    it('renders Hebrew description when language is he', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          language="he"
          compact={false}
        />
      )

      expect(screen.getByText('מסת העצם')).toBeInTheDocument()
    })

    it('renders marks when provided', () => {
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, min: 0, max: 90 }}
          value={45}
          onChange={jest.fn()}
          marks={testMarks}
        />
      )

      expect(screen.getByText('Min')).toBeInTheDocument()
      expect(screen.getByText('Half')).toBeInTheDocument()
      expect(screen.getByText('Max')).toBeInTheDocument()
    })

    it('renders Hebrew marks when language is he', () => {
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, min: 0, max: 90 }}
          value={45}
          onChange={jest.fn()}
          marks={testMarks}
          language="he"
        />
      )

      expect(screen.getByText('מינימום')).toBeInTheDocument()
      expect(screen.getByText('חצי')).toBeInTheDocument()
      expect(screen.getByText('מקסימום')).toBeInTheDocument()
    })

    it('hides min/max labels when marks are provided', () => {
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, min: 0, max: 90 }}
          value={45}
          onChange={jest.fn()}
          marks={testMarks}
          compact={false}
        />
      )

      // The default min/max labels should not appear
      expect(screen.queryByText('0 kg')).not.toBeInTheDocument()
    })

    it('hides value display when showValue is false', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          showValue={false}
        />
      )

      // Slider still exists but spinbutton (input) and unit should be hidden
      expect(screen.getByRole('slider')).toBeInTheDocument()
      expect(screen.queryByRole('spinbutton')).not.toBeInTheDocument()
      expect(screen.queryByText('kg')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          className="custom-class"
        />
      )

      expect(container.firstChild).toHaveClass('custom-class')
    })
  })

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  describe('interactions', () => {
    it('calls onChange when slider is moved', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={onChange}
        />
      )

      const slider = screen.getByRole('slider')
      fireEvent.change(slider, { target: { value: '25' } })

      expect(onChange).toHaveBeenCalledWith(25)
    })

    it('calls onChange when input value is changed and blurred', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={onChange}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '50' } })
      fireEvent.blur(input)

      expect(onChange).toHaveBeenCalledWith(50)
    })

    it('clamps input value to min/max on blur', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={onChange}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '200' } }) // above max of 100
      fireEvent.blur(input)

      expect(onChange).toHaveBeenCalledWith(100)
    })

    it('rounds input value to step on blur', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, step: 5 }}
          value={10}
          onChange={onChange}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '23' } }) // not a multiple of 5
      fireEvent.blur(input)

      expect(onChange).toHaveBeenCalledWith(25) // rounded to nearest step
    })

    it('calls onChange on Enter key in input', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={onChange}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: '35' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(onChange).toHaveBeenCalledWith(35)
    })

    it('reverts invalid input on blur', () => {
      const onChange = jest.fn()
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={onChange}
        />
      )

      const input = screen.getByRole('spinbutton')
      fireEvent.change(input, { target: { value: 'abc' } }) // invalid
      fireEvent.blur(input)

      // Should not call onChange with invalid value
      expect(onChange).not.toHaveBeenCalled()
      // Input should revert to original value
      expect(input).toHaveValue(10)
    })

    it('disables slider and input when disabled prop is true', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          disabled={true}
        />
      )

      expect(screen.getByRole('slider')).toBeDisabled()
      expect(screen.getByRole('spinbutton')).toBeDisabled()
    })
  })

  // ---------------------------------------------------------------------------
  // Accessibility
  // ---------------------------------------------------------------------------

  describe('accessibility', () => {
    it('has proper aria-label on slider', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-label', 'Object mass')
    })

    it('uses label as aria-label when no description', () => {
      const paramWithoutDesc = { ...newStyleParameter, description: undefined, descriptionHe: undefined }
      render(
        <ParameterSlider
          parameter={paramWithoutDesc}
          value={10}
          onChange={jest.fn()}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-label', 'Mass')
    })

    it('uses Hebrew aria-label when language is he', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          language="he"
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('aria-label', 'מסת העצם')
    })

    it('has correct min, max, step attributes', () => {
      render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
        />
      )

      const slider = screen.getByRole('slider')
      expect(slider).toHaveAttribute('min', '0.1')
      expect(slider).toHaveAttribute('max', '100')
      expect(slider).toHaveAttribute('step', '0.1')
    })

    it('has proper RTL direction when language is he', () => {
      const { container } = render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          language="he"
        />
      )

      expect(container.firstChild).toHaveAttribute('dir', 'rtl')
    })

    it('has proper LTR direction when language is en', () => {
      const { container } = render(
        <ParameterSlider
          parameter={newStyleParameter}
          value={10}
          onChange={jest.fn()}
          language="en"
        />
      )

      expect(container.firstChild).toHaveAttribute('dir', 'ltr')
    })
  })

  // ---------------------------------------------------------------------------
  // Value Display
  // ---------------------------------------------------------------------------

  describe('value display', () => {
    it('formats decimal values correctly', () => {
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, step: 0.01 }}
          value={10.5}
          onChange={jest.fn()}
          showInput={false}
        />
      )

      expect(screen.getByText('10.50')).toBeInTheDocument()
    })

    it('formats integer values without decimals', () => {
      render(
        <ParameterSlider
          parameter={{ ...newStyleParameter, step: 1 }}
          value={10}
          onChange={jest.fn()}
          showInput={false}
        />
      )

      expect(screen.getByText('10')).toBeInTheDocument()
    })
  })
})

// =============================================================================
// ParameterSliderGroup Tests
// =============================================================================

describe('ParameterSliderGroup', () => {
  const parameters: ParameterDefinition[] = [
    {
      name: 'mass',
      label: 'Mass',
      labelHe: 'מסה',
      default: 5,
      min: 0.1,
      max: 100,
      step: 0.1,
      unit: 'kg',
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
    {
      name: 'friction',
      label: 'Friction',
      labelHe: 'חיכוך',
      default: 0.3,
      min: 0,
      max: 1,
      step: 0.01,
      category: 'friction',
    },
  ]

  // ---------------------------------------------------------------------------
  // Rendering
  // ---------------------------------------------------------------------------

  describe('rendering', () => {
    it('renders all parameters', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{ mass: 10, angle: 45, friction: 0.5 }}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Mass')).toBeInTheDocument()
      expect(screen.getByText('Angle')).toBeInTheDocument()
      expect(screen.getByText('Friction')).toBeInTheDocument()
    })

    it('renders title', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          title="Parameters"
        />
      )

      expect(screen.getByText('Parameters')).toBeInTheDocument()
    })

    it('renders Hebrew title when language is he', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          title="Parameters"
          titleHe="פרמטרים"
          language="he"
        />
      )

      expect(screen.getByText('פרמטרים')).toBeInTheDocument()
    })

    it('uses default values when values not provided', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
        />
      )

      // Check that default values are used
      const sliders = screen.getAllByRole('slider')
      expect(sliders[0]).toHaveValue('5') // mass default
      expect(sliders[1]).toHaveValue('30') // angle default
      expect(sliders[2]).toHaveValue('0.3') // friction default
    })

    it('filters by category', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          category="mass"
        />
      )

      expect(screen.getByText('Mass')).toBeInTheDocument()
      expect(screen.queryByText('Angle')).not.toBeInTheDocument()
      expect(screen.queryByText('Friction')).not.toBeInTheDocument()
    })

    it('applies custom className', () => {
      const { container } = render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          className="custom-group"
        />
      )

      expect(container.firstChild).toHaveClass('custom-group')
    })

    it('renders in compact mode', () => {
      const { container } = render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          compact={true}
        />
      )

      expect(container.firstChild).toHaveClass('p-2')
    })
  })

  // ---------------------------------------------------------------------------
  // Interactions
  // ---------------------------------------------------------------------------

  describe('interactions', () => {
    it('calls onChange with parameter name and value', () => {
      const onChange = jest.fn()
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{ mass: 10, angle: 45, friction: 0.5 }}
          onChange={onChange}
        />
      )

      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '20' } })

      expect(onChange).toHaveBeenCalledWith('mass', 20)
    })

    it('disables all sliders when disabled', () => {
      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          disabled={true}
        />
      )

      const sliders = screen.getAllByRole('slider')
      sliders.forEach((slider) => {
        expect(slider).toBeDisabled()
      })
    })
  })

  // ---------------------------------------------------------------------------
  // Legacy Parameter Support
  // ---------------------------------------------------------------------------

  describe('legacy parameter support', () => {
    const legacyParameters: ParameterDef[] = [
      {
        id: 'mass',
        name: 'Mass',
        min: 0.1,
        max: 100,
        step: 0.1,
        defaultValue: 5,
        unit: 'kg',
      },
      {
        id: 'angle',
        name: 'Angle',
        min: 0,
        max: 90,
        step: 1,
        defaultValue: 30,
        unit: '°',
      },
    ]

    it('renders legacy parameters correctly', () => {
      render(
        <ParameterSliderGroup
          parameters={legacyParameters}
          values={{ mass: 10, angle: 45 }}
          onChange={jest.fn()}
        />
      )

      expect(screen.getByText('Mass')).toBeInTheDocument()
      expect(screen.getByText('Angle')).toBeInTheDocument()
    })

    it('calls onChange with legacy parameter id', () => {
      const onChange = jest.fn()
      render(
        <ParameterSliderGroup
          parameters={legacyParameters}
          values={{ mass: 10, angle: 45 }}
          onChange={onChange}
        />
      )

      const sliders = screen.getAllByRole('slider')
      fireEvent.change(sliders[0], { target: { value: '20' } })

      expect(onChange).toHaveBeenCalledWith('mass', 20)
    })

    it('uses legacy defaultValue when value not provided', () => {
      render(
        <ParameterSliderGroup
          parameters={legacyParameters}
          values={{}}
          onChange={jest.fn()}
        />
      )

      const sliders = screen.getAllByRole('slider')
      expect(sliders[0]).toHaveValue('5')
      expect(sliders[1]).toHaveValue('30')
    })
  })

  // ---------------------------------------------------------------------------
  // Marks Support
  // ---------------------------------------------------------------------------

  describe('marks support', () => {
    it('passes marks to individual sliders', () => {
      const marksMap = {
        angle: [
          { value: 0, label: '0°' },
          { value: 45, label: '45°' },
          { value: 90, label: '90°' },
        ],
      }

      render(
        <ParameterSliderGroup
          parameters={parameters}
          values={{}}
          onChange={jest.fn()}
          marks={marksMap}
        />
      )

      expect(screen.getByText('0°')).toBeInTheDocument()
      expect(screen.getByText('45°')).toBeInTheDocument()
      expect(screen.getByText('90°')).toBeInTheDocument()
    })
  })
})
