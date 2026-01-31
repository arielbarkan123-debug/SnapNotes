'use client'

import { useTranslations } from 'next-intl'
import { Download } from 'lucide-react'

interface ExportCourseButtonProps {
  courseTitle: string
}

export default function ExportCourseButton({ courseTitle }: ExportCourseButtonProps) {
  const t = useTranslations('export')

  const handleExport = () => {
    // Set document title for PDF filename
    const originalTitle = document.title
    document.title = courseTitle
    window.print()
    document.title = originalTitle
  }

  return (
    <button
      onClick={handleExport}
      className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors print:hidden"
    >
      <Download className="w-4 h-4" />
      {t('exportPDF')}
    </button>
  )
}
