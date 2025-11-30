'use client'

import React, { useState, useEffect, useRef, RefObject } from 'react'

interface UseInViewOptions {
  // Margin around the viewport (e.g., '100px' to trigger 100px before element is visible)
  rootMargin?: string
  // Threshold of visibility (0-1, 0 = any pixel visible, 1 = fully visible)
  threshold?: number | number[]
  // Whether to unobserve after first intersection
  triggerOnce?: boolean
  // Initial state (useful for SSR)
  initialInView?: boolean
}

interface UseInViewReturn {
  ref: RefObject<HTMLDivElement>
  inView: boolean
  // For cases where you want to manually control the element
  entry?: IntersectionObserverEntry
}

/**
 * Hook to detect when an element enters the viewport
 * Uses Intersection Observer for performant visibility detection
 */
export function useInView(options: UseInViewOptions = {}): UseInViewReturn {
  const {
    rootMargin = '100px',
    threshold = 0,
    triggerOnce = true,
    initialInView = false,
  } = options

  const ref = useRef<HTMLDivElement>(null) as React.RefObject<HTMLDivElement>
  const [inView, setInView] = useState(initialInView)
  const [entry, setEntry] = useState<IntersectionObserverEntry>()

  useEffect(() => {
    const element = ref.current
    if (!element) return

    // Check if IntersectionObserver is supported
    if (typeof IntersectionObserver === 'undefined') {
      // Fallback: assume in view
      setInView(true)
      return
    }

    const observer = new IntersectionObserver(
      ([observerEntry]) => {
        setEntry(observerEntry)

        if (observerEntry.isIntersecting) {
          setInView(true)

          if (triggerOnce) {
            observer.unobserve(element)
          }
        } else if (!triggerOnce) {
          setInView(false)
        }
      },
      {
        rootMargin,
        threshold,
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [rootMargin, threshold, triggerOnce])

  return { ref, inView, entry }
}

export default useInView
