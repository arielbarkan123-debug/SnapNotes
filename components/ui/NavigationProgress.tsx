'use client'

import { useEffect, useState } from 'react'
import { usePathname, useSearchParams } from 'next/navigation'

export default function NavigationProgress() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [isNavigating, setIsNavigating] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // Reset on route change complete
    setIsNavigating(false)
    setProgress(0)
  }, [pathname, searchParams])

  useEffect(() => {
    let progressInterval: NodeJS.Timeout
    let completeTimeout: NodeJS.Timeout

    const handleStart = () => {
      setIsNavigating(true)
      setProgress(0)

      // Animate progress bar
      progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 90) return prev
          // Slow down as we approach 90%
          const increment = Math.max(1, (90 - prev) / 10)
          return Math.min(90, prev + increment)
        })
      }, 100)
    }

    const _handleComplete = () => {
      setProgress(100)
      completeTimeout = setTimeout(() => {
        setIsNavigating(false)
        setProgress(0)
      }, 200)
    }

    // Listen for link clicks
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a')

      if (link && link.href && !link.href.startsWith('#') && !link.target) {
        const url = new URL(link.href)
        // Only trigger for internal navigation
        if (url.origin === window.location.origin && url.pathname !== pathname) {
          handleStart()
        }
      }
    }

    document.addEventListener('click', handleClick)

    return () => {
      document.removeEventListener('click', handleClick)
      clearInterval(progressInterval)
      clearTimeout(completeTimeout)
    }
  }, [pathname])

  if (!isNavigating && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] h-1 bg-transparent"
      role="progressbar"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page navigation loading"
    >
      <div
        className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          boxShadow: '0 0 10px rgba(99, 102, 241, 0.7), 0 0 5px rgba(99, 102, 241, 0.5)',
        }}
      />
    </div>
  )
}
