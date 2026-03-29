import { useEffect } from 'react'
import { useFloatingHelp } from '@/components/help/FloatingHelpButtons'
import { type HelpContext } from '@/types'

/**
 * Registers help context from a page into the global FloatingHelpButtons.
 * When the component unmounts, context is cleared automatically.
 */
export function useHelpContext(context: HelpContext | null, courseId?: string | null, courseName?: string | null) {
  const floating = useFloatingHelp()

  useEffect(() => {
    if (!floating) return
    floating.setHelpContext(context)
    return () => floating.setHelpContext(null)
  }, [floating, context])

  useEffect(() => {
    if (!floating) return
    if (courseId !== undefined) {
      floating.setCourseInfo(courseId ?? null, courseName ?? null)
    }
    return () => floating.setCourseInfo(null, null)
  }, [floating, courseId, courseName])
}
