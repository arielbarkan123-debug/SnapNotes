import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function CourseNotFound() {
  const t = await getTranslations('errors')
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-md mx-auto text-center">
        <div className="text-6xl mb-6">📚</div>
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          {t('courseNotFound')}
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-8">
          {t('courseNotFoundDescription')}
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-6 py-3 bg-violet-600 text-white rounded-lg hover:bg-violet-700 font-medium transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
          {t('backToDashboard')}
        </Link>
      </div>
    </div>
  )
}
