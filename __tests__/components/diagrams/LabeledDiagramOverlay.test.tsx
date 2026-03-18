/**
 * Tests for LabeledDiagramOverlay component
 */

import React from 'react'
import { render, screen, fireEvent, act } from '@testing-library/react'
import type { OverlayLabel } from '@/types'

// Mock framer-motion to render children immediately without animation
jest.mock('framer-motion', () => ({
  motion: {
    div: React.forwardRef(({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>, ref: React.Ref<HTMLDivElement>) => {
      // Strip framer-motion-specific props before passing to DOM
      const {
        initial, animate, exit, transition, whileHover, whileTap,
        layout, layoutId, variants, onAnimationComplete,
        ...domProps
      } = props
      return <div ref={ref} {...domProps}>{children}</div>
    }),
  },
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

// Import the component after mocking
import LabeledDiagramOverlay from '@/components/homework/diagram/LabeledDiagramOverlay'

const mockLabels: OverlayLabel[] = [
  {
    text: 'Vertex A',
    textHe: 'קודקוד A',
    x: 20,
    y: 30,
    targetX: 25,
    targetY: 35,
    stepGroup: 1,
    found: true,
  },
  {
    text: 'Side BC',
    textHe: 'צלע BC',
    x: 70,
    y: 50,
    targetX: 65,
    targetY: 55,
    stepGroup: 2,
    found: true,
  },
  {
    text: 'Angle D',
    textHe: 'זווית D',
    x: 40,
    y: 80,
    targetX: 45,
    targetY: 75,
    stepGroup: 1,
    found: true,
  },
]

/** Helper to simulate image load */
function simulateImageLoad() {
  const img = screen.getByTestId('diagram-image')
  act(() => {
    fireEvent.load(img)
  })
}

describe('LabeledDiagramOverlay', () => {
  const defaultProps = {
    imageUrl: 'https://storage.supabase.co/test-diagram.png',
    labels: mockLabels,
    locale: 'en' as const,
    step: null as number | null,
  }

  it('renders image and all labels in English', () => {
    render(<LabeledDiagramOverlay {...defaultProps} />)
    simulateImageLoad()

    expect(screen.getByText('Vertex A')).toBeInTheDocument()
    expect(screen.getByText('Side BC')).toBeInTheDocument()
    expect(screen.getByText('Angle D')).toBeInTheDocument()
  })

  it('shows Hebrew labels when locale is "he"', () => {
    render(<LabeledDiagramOverlay {...defaultProps} locale="he" />)
    simulateImageLoad()

    expect(screen.getByText('קודקוד A')).toBeInTheDocument()
    expect(screen.getByText('צלע BC')).toBeInTheDocument()
    expect(screen.getByText('זווית D')).toBeInTheDocument()
  })

  it('shows only step 1 labels when step=0', () => {
    render(<LabeledDiagramOverlay {...defaultProps} step={0} />)
    simulateImageLoad()

    // stepGroup 1 labels should be visible (step 0 => show stepGroup <= 1)
    expect(screen.getByText('Vertex A')).toBeInTheDocument()
    expect(screen.getByText('Angle D')).toBeInTheDocument()

    // stepGroup 2 labels should NOT be visible
    expect(screen.queryByText('Side BC')).not.toBeInTheDocument()
  })

  it('excludes labels with found=false', () => {
    const labelsWithNotFound: OverlayLabel[] = [
      ...mockLabels,
      {
        text: 'Missing Point',
        x: 50,
        y: 50,
        targetX: 55,
        targetY: 55,
        found: false,
      },
    ]

    render(<LabeledDiagramOverlay {...defaultProps} labels={labelsWithNotFound} />)
    simulateImageLoad()

    expect(screen.queryByText('Missing Point')).not.toBeInTheDocument()
    // Other labels should still appear
    expect(screen.getByText('Vertex A')).toBeInTheDocument()
  })

  it('defaults found to true when absent (backward compat)', () => {
    const labelsWithoutFound: OverlayLabel[] = [
      {
        text: 'Legacy Label',
        x: 30,
        y: 40,
        targetX: 35,
        targetY: 45,
        // No `found` field — should default to true
      },
    ]

    render(<LabeledDiagramOverlay {...defaultProps} labels={labelsWithoutFound} />)
    simulateImageLoad()

    expect(screen.getByText('Legacy Label')).toBeInTheDocument()
  })

  it('shows skeleton before image loads', () => {
    const { container } = render(<LabeledDiagramOverlay {...defaultProps} />)

    // Before image loads, labels should not be visible
    expect(screen.queryByText('Vertex A')).not.toBeInTheDocument()

    // Skeleton pulse should be present
    const skeleton = container.querySelector('.animate-pulse')
    expect(skeleton).toBeInTheDocument()
  })

  it('has accessible role="img" on container', () => {
    render(<LabeledDiagramOverlay {...defaultProps} />)
    simulateImageLoad()

    const container = screen.getByRole('img')
    expect(container).toBeInTheDocument()
  })

  it('calls onLabelClick when a label is clicked', () => {
    const onLabelClick = jest.fn()
    render(<LabeledDiagramOverlay {...defaultProps} onLabelClick={onLabelClick} />)
    simulateImageLoad()

    fireEvent.click(screen.getByText('Vertex A'))
    expect(onLabelClick).toHaveBeenCalledWith(mockLabels[0])
  })
})
