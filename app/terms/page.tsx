import Link from 'next/link'
import { getTranslations } from 'next-intl/server'

export default async function TermsPage() {
  const t = await getTranslations('legal')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-2xl bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-12">
        <Link
          href="/"
          className="text-xl font-bold text-violet-600 dark:text-violet-400 block text-center mb-8"
        >
          NoteSnap
        </Link>

        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-4">
          {t('termsTitle')}
        </h1>

        <p className="text-gray-600 dark:text-gray-400 text-center mb-8">
          {t('comingSoon')}
        </p>

        <div className="text-center">
          <Link
            href="/"
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
          >
            {t('backToHome')}
          </Link>
        </div>
      </div>
    </div>
  )
}
