'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Course } from '@/types'
import { useToast } from '@/contexts/ToastContext'
import DeleteConfirmModal from './DeleteConfirmModal'

interface CourseCardProps {
  course: Course
  onDelete?: (courseId: string) => void
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength).trim() + '...'
}

export default function CourseCard({ course, onDelete }: CourseCardProps) {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setShowDeleteModal(true)
  }

  const handleDeleteConfirm = async () => {
    setIsDeleting(true)

    try {
      const response = await fetch(`/api/courses/${course.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to delete course')
      }

      success('Course deleted successfully')
      setShowDeleteModal(false)

      // Notify parent or refresh
      if (onDelete) {
        onDelete(course.id)
      } else {
        router.refresh()
      }
    } catch (err) {
      showError(err instanceof Error ? err.message : 'Failed to delete course')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <>
      <div className="group relative bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
        {/* Delete Button */}
        <button
          onClick={handleDeleteClick}
          className="absolute top-2 right-2 z-10 p-2 bg-white/90 dark:bg-gray-800/90 rounded-full shadow-md opacity-0 group-hover:opacity-100 hover:bg-red-50 dark:hover:bg-red-900/30 transition-all duration-200"
          aria-label="Delete course"
        >
          <svg
            className="w-4 h-4 text-gray-500 hover:text-red-600 dark:text-gray-400 dark:hover:text-red-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
          </svg>
        </button>

        <Link href={`/course/${course.id}`} className="block">
          {/* Thumbnail */}
          <div className="relative aspect-square w-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
            {course.original_image_url ? (
              <Image
                src={course.original_image_url}
                alt={course.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-200"
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-4xl">📚</span>
              </div>
            )}
          </div>

          {/* Content */}
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 dark:text-white mb-1 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
              {truncateText(course.title, 50)}
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {formatDate(course.created_at)}
            </p>
          </div>
        </Link>
      </div>

      {/* Delete Confirmation Modal */}
      <DeleteConfirmModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleting}
        courseTitle={course.title}
      />
    </>
  )
}

// Re-export skeleton from dedicated file for backwards compatibility
export { CourseCardSkeleton } from './CourseCardSkeleton'
