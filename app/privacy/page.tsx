import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

export const metadata: Metadata = {
  title: 'Privacy Policy | NoteSnap',
  description: 'Learn how NoteSnap collects, uses, and protects your personal information. We are committed to safeguarding your privacy.',
  alternates: {
    canonical: `${APP_URL}/privacy`,
  },
}

export default async function PrivacyPage() {
  const t = await getTranslations('legal')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-violet-600 dark:text-violet-400 hover:underline font-medium text-sm"
          >
            {t('backToHome')}
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-12">
          <Link
            href="/"
            className="text-xl font-bold text-violet-600 dark:text-violet-400 block text-center mb-2"
          >
            NoteSnap
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('privacyTitle')}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
            {t('lastUpdated', { date: 'February 28, 2026' })}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('privacy.intro')}
            </p>

            {/* Data Collection */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.dataCollectionTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                {t('privacy.dataCollectionIntro')}
              </p>
              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('privacy.dataCollection1Title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('privacy.dataCollection1')}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('privacy.dataCollection2Title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('privacy.dataCollection2')}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('privacy.dataCollection3Title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('privacy.dataCollection3')}
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4">
                  <h3 className="font-medium text-gray-900 dark:text-white mb-1">
                    {t('privacy.dataCollection4Title')}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    {t('privacy.dataCollection4')}
                  </p>
                </div>
              </div>
            </section>

            {/* AI Usage */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.aiTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {t('privacy.aiIntro')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mb-4">
                <li>{t('privacy.ai1')}</li>
                <li>{t('privacy.ai2')}</li>
                <li>{t('privacy.ai3')}</li>
              </ul>
              <div className="bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-700 rounded-xl p-4">
                <p className="text-sm text-violet-800 dark:text-violet-200 font-medium">
                  {t('privacy.aiDisclaimer')}
                </p>
              </div>
            </section>

            {/* Data Storage */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.dataStorageTitle')}
              </h2>
              <ul className="space-y-2 text-gray-600 dark:text-gray-300">
                <li>{t('privacy.dataStorage1')}</li>
                <li>{t('privacy.dataStorage2')}</li>
                <li>{t('privacy.dataStorage3')}</li>
              </ul>
            </section>

            {/* Cookies */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.cookiesTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {t('privacy.cookiesIntro')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1 mb-3">
                <li>{t('privacy.cookie1')}</li>
                <li>{t('privacy.cookie2')}</li>
              </ul>
              <p className="text-sm text-gray-500 dark:text-gray-400 italic">
                {t('privacy.cookiesNote')}
              </p>
            </section>

            {/* User Rights */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.userRightsTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {t('privacy.userRightsIntro')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                <li>{t('privacy.userRight1')}</li>
                <li>{t('privacy.userRight2')}</li>
                <li>{t('privacy.userRight3')}</li>
                <li>{t('privacy.userRight4')}</li>
              </ul>
            </section>

            {/* Children's Privacy */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.childrenTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('privacy.children1')}</p>
                <p>{t('privacy.children2')}</p>
                <p>{t('privacy.children3')}</p>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.retentionTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('privacy.retention1')}</p>
                <p>{t('privacy.retention2')}</p>
                <p>{t('privacy.retention3')}</p>
              </div>
            </section>

            {/* Changes */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.changesTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t('privacy.changes1')}
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('privacy.contactTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {t('privacy.contact1')}
              </p>
              <a
                href={`mailto:${t('privacy.contactEmail')}`}
                className="text-violet-600 dark:text-violet-400 hover:underline font-medium"
              >
                {t('privacy.contactEmail')}
              </a>
            </section>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-8">
          <Link
            href="/terms"
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
          >
            {t('termsTitle')}
          </Link>
        </div>
      </div>
    </div>
  )
}
