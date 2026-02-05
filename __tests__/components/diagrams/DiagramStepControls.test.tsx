import { render, screen, fireEvent } from '@testing-library/react'
import { DiagramStepControls } from '@/components/diagrams/DiagramStepControls'

describe('DiagramStepControls', () => {
  const defaultProps = {
    currentStep: 0,
    totalSteps: 5,
    onNext: jest.fn(),
    onPrev: jest.fn(),
    stepLabel: 'Draw the base',
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders step label', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('Draw the base')).toBeInTheDocument()
  })

  it('renders step counter (1 / 5)', () => {
    render(<DiagramStepControls {...defaultProps} />)
    expect(screen.getByText('1 / 5')).toBeInTheDocument()
  })

  it('disables prev button on first step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={0} />)
    const prevBtn = screen.getByLabelText('Previous step')
    expect(prevBtn).toBeDisabled()
  })

  it('disables next button on last step', () => {
    render(<DiagramStepControls {...defaultProps} currentStep={4} />)
    const nextBtn = screen.getByLabelText('Next step')
    expect(nextBtn).toBeDisabled()
  })

  it('calls onNext when next button clicked', () => {
    const onNext = jest.fn()
    render(<DiagramStepControls {...defaultProps} onNext={onNext} />)
    fireEvent.click(screen.getByLabelText('Next step'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })

  it('calls onPrev when prev button clicked', () => {
    const onPrev = jest.fn()
    render(<DiagramStepControls {...defaultProps} currentStep={2} onPrev={onPrev} />)
    fireEvent.click(screen.getByLabelText('Previous step'))
    expect(onPrev).toHaveBeenCalledTimes(1)
  })

  it('renders progress dots equal to totalSteps', () => {
    render(<DiagramStepControls {...defaultProps} />)
    const dots = screen.getAllByTestId('step-dot')
    expect(dots).toHaveLength(5)
  })

  it('does not render label when not provided', () => {
    render(<DiagramStepControls currentStep={0} totalSteps={5} onNext={jest.fn()} onPrev={jest.fn()} />)
    expect(screen.queryByText('Draw the base')).not.toBeInTheDocument()
  })

  it('uses subject color for active dot when subjectColor provided', () => {
    const { container } = render(
      <DiagramStepControls {...defaultProps} subjectColor="#ec4899" />
    )
    const activeDot = container.querySelector('[data-testid="step-dot"][data-active="true"]')
    expect(activeDot).toBeInTheDocument()
    // jsdom converts hex to rgb
    expect(activeDot?.getAttribute('style')).toContain('rgb(236, 72, 153)')
  })
})
