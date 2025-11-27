'use client'

import Link from 'next/link'
import Image from 'next/image'
import { Course } from '@/types'

interface CourseCardProps {
  course: Course
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

export default function CourseCard({ course }: CourseCardProps) {
  return (
    <Link
      href={`/course/${course.id}`}
      className="group bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
    >
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
  )
}

// Re-export skeleton from dedicated file for backwards compatibility
export { CourseCardSkeleton } from './CourseCardSkeleton'
