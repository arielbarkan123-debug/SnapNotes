/**
 * Tests for FullScreenDiagramView component
 */

import React from 'react'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import type { DiagramState } from '@/components/homework/diagram/types'

// Mock next-intl
jest.mock('next-intl', () => ({
  useTranslations: () => (key: string, params?: Record<string, unknown>) => {
    const translations: Record<string, string> = {
      back: 'Back',
      close: 'Close',
      stepOf: params ? `Step ${params.current} of ${params.total}` : 'Step X of Y',
      keyboardHint: 'Use arrow keys to navigate',
    }
    return translations[key] || key
  },
  NextIntlClientProvider: ({ children }: { children: React.ReactNode }) => children,
}))

// Mock the DiagramRenderer component
jest.mock('@/components/homework/diagram/DiagramRenderer', () => {
  return function MockDiagramRenderer({ currentStep }: { currentStep: number }) {
    return <div data-testid="diagram-renderer">Diagram at step {currentStep}</div>
  }
})

// Mock the DiagramExplanationPanel component
jest.mock('@/components/diagrams/DiagramExplanationPanel', () => {
  return function MockDiagramExplanationPanel({
    currentStep,
    onNext,
    onPrevious,
  }: {
    currentStep: number
    onNext: () => void
    onPrevious: () => void
  }) {
    return (
      <div data-testid="explanation-panel">
        <span>Step {currentStep}</span>
        <button onClick={onPrevious}>Prev</button>
        <button onClick={onNext}>Next</button>
      </div>
    )
  }
})

// Import the component after mocking
import FullScreenDiagramView from '@/components/diagrams/FullScreenDiagramView'

const renderComponent = (ui: React.ReactElement) => render(ui)

const mockDiagram: DiagramState = {
  type: 'fbd',
  visibleStep: 0,
  totalSteps: 5,
  data: {
    object: { type: 'block', position: { x: 150, y: 150 } },
    forces: [],
  },
}

describe('FullScreenDiagramView', () => {
  const defaultProps = {
    diagram: mockDiagram,
    isOpen: true,
    onClose: jest.fn(),
    initialStep: 0,
    language: 'en' as const,
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('Rendering', () => {
    it('renders nothing when isOpen is false', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} isOpen={false} />)
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    })

    it('renders dialog when isOpen is true', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('dialog')).toBeInTheDocument()
    })

    it('renders the diagram renderer', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByTestId('diagram-renderer')).toBeInTheDocument()
    })

    it('renders explanation panel when totalSteps > 1', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByTestId('explanation-panel')).toBeInTheDocument()
    })

    it('does not render explanation panel when totalSteps is 1', () => {
      const singleStepDiagram = { ...mockDiagram, totalSteps: 1 }
      renderComponent(<FullScreenDiagramView {...defaultProps} diagram={singleStepDiagram} />)
      expect(screen.queryByTestId('explanation-panel')).not.toBeInTheDocument()
    })

    it('renders back button', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByText('Back')).toBeInTheDocument()
    })

    it('renders close button', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      const closeButtons = screen.getAllByRole('button')
      expect(closeButtons.length).toBeGreaterThan(0)
    })

    it('renders keyboard hint', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      // Look for the visible keyboard hint in the footer, not the sr-only description
      const hints = screen.getAllByText(/Use arrow keys to navigate/)
      expect(hints.length).toBeGreaterThanOrEqual(1)
    })
  })

  describe('Interactions', () => {
    it('calls onClose when back button is clicked', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      fireEvent.click(screen.getByText('Back'))
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('calls onClose when clicking backdrop', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      const backdrop = screen.getByRole('dialog').parentElement
      if (backdrop) {
        fireEvent.click(backdrop)
        expect(defaultProps.onClose).toHaveBeenCalled()
      }
    })

    it('does not call onClose when clicking inside the dialog', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      fireEvent.click(screen.getByTestId('diagram-renderer'))
      expect(defaultProps.onClose).not.toHaveBeenCalled()
    })
  })

  describe('Keyboard Navigation', () => {
    it('calls onClose when Escape is pressed', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      fireEvent.keyDown(window, { key: 'Escape' })
      expect(defaultProps.onClose).toHaveBeenCalledTimes(1)
    })

    it('advances step when ArrowRight is pressed', async () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByText('Diagram at step 0')).toBeInTheDocument()

      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowRight' })
      })

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 1')).toBeInTheDocument()
      })
    })

    it('goes back when ArrowLeft is pressed', async () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} initialStep={2} />)

      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowLeft' })
      })

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 1')).toBeInTheDocument()
      })
    })

    it('does not go below step 0', async () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} initialStep={0} />)

      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowLeft' })
      })

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 0')).toBeInTheDocument()
      })
    })

    it('does not exceed max step', async () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} initialStep={4} />)

      act(() => {
        fireEvent.keyDown(window, { key: 'ArrowRight' })
      })

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 4')).toBeInTheDocument()
      })
    })
  })

  describe('RTL Support', () => {
    it('reverses arrow key behavior in RTL mode', async () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} language="he" />)

      act(() => {
        // In RTL, ArrowLeft should advance (opposite of LTR)
        fireEvent.keyDown(window, { key: 'ArrowLeft' })
      })

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 1')).toBeInTheDocument()
      })
    })
  })

  describe('Step Management', () => {
    it('resets to initialStep when diagram changes', async () => {
      const { rerender } = renderComponent(
        <FullScreenDiagramView {...defaultProps} initialStep={3} />
      )

      expect(screen.getByText('Diagram at step 3')).toBeInTheDocument()

      const newDiagram = { ...mockDiagram, type: 'inclined_plane' as const } as unknown as DiagramState
      rerender(
        <FullScreenDiagramView {...defaultProps} diagram={newDiagram} initialStep={0} />
      )

      await waitFor(() => {
        expect(screen.getByText('Diagram at step 0')).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility', () => {
    it('has proper aria-modal attribute', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-modal', 'true')
    })

    it('has proper aria-labelledby attribute', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-labelledby', 'diagram-dialog-title')
    })

    it('has proper aria-describedby attribute', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('dialog')).toHaveAttribute('aria-describedby', 'diagram-dialog-description')
    })

    it('has a region role for diagram area', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('region', { name: /diagram area/i })).toBeInTheDocument()
    })

    it('has live region for step announcements', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('status')).toBeInTheDocument()
    })

    it('has keyboard hints for screen readers', () => {
      renderComponent(<FullScreenDiagramView {...defaultProps} />)
      expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    })
  })
})
