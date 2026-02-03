'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface LockedLessonRedirectProps {
  courseId: string
}

export default function LockedLessonRedirect({ courseId }: LockedLessonRedirectProps) {
  const router = useRouter()

  useEffect(() => {
    // Redirect to course page after component mounts
    router.replace(`/course/${courseId}`)
  }, [router, courseId])

  // Render a minimal loading state while redirecting
  // This ensures consistent hooks between server and client
  return (
    <div className="min-h-screen bg-transparent flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-600 dark:text-gray-400">Redirecting to course...</p>
      </div>
    </div>
  )
}
