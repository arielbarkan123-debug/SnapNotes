import Link from 'next/link'
import { getTranslations } from 'next-intl/server'
import type { Metadata } from 'next'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

export const metadata: Metadata = {
  title: 'Terms of Service | X+1',
  description: 'Read the Terms of Service for X+1, the AI-powered educational platform.',
  alternates: {
    canonical: `${APP_URL}/terms`,
  },
}

export default async function TermsPage() {
  const t = await getTranslations('legal')

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 px-4 py-12">
      <div className="w-full max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/"
            className="text-violet-600 dark:text-violet-400 underline hover:underline font-medium text-sm"
          >
            {t('backToHome')}
          </Link>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 sm:p-12">
          <Link
            href="/"
            className="text-xl font-bold text-violet-600 dark:text-violet-400 block text-center mb-2"
          >
            X+1
          </Link>

          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white text-center mb-2">
            {t('termsTitle')}
          </h1>

          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-8">
            {t('lastUpdated', { date: 'February 28, 2026' })}
          </p>

          <div className="prose prose-gray dark:prose-invert max-w-none space-y-8">
            {/* Introduction */}
            <p className="text-gray-600 dark:text-gray-300 leading-relaxed">
              {t('terms.intro')}
            </p>

            {/* Service Description */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.serviceTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.service1')}</p>
                <p>{t('terms.service2')}</p>
              </div>
            </section>

            {/* Account Registration */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.accountTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.account1')}</p>
                <p>{t('terms.account2')}</p>
                <p>{t('terms.account3')}</p>
              </div>
            </section>

            {/* Acceptable Use */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.acceptableUseTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-3">
                {t('terms.acceptableUseIntro')}
              </p>
              <ul className="list-disc list-inside text-gray-600 dark:text-gray-300 space-y-1">
                <li>{t('terms.acceptableUse1')}</li>
                <li>{t('terms.acceptableUse2')}</li>
                <li>{t('terms.acceptableUse3')}</li>
                <li>{t('terms.acceptableUse4')}</li>
                <li>{t('terms.acceptableUse5')}</li>
              </ul>
            </section>

            {/* AI Disclaimer */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.aiDisclaimerTitle')}
              </h2>
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-xl p-4 space-y-2">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('terms.aiDisclaimer1')}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('terms.aiDisclaimer2')}
                </p>
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('terms.aiDisclaimer3')}
                </p>
              </div>
            </section>

            {/* Intellectual Property */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.ipTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.ip1')}</p>
                <p>{t('terms.ip2')}</p>
                <p>{t('terms.ip3')}</p>
              </div>
            </section>

            {/* Limitation of Liability */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.liabilityTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.liability1')}</p>
                <p>{t('terms.liability2')}</p>
                <p>{t('terms.liability3')}</p>
              </div>
            </section>

            {/* Termination */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.terminationTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.termination1')}</p>
                <p>{t('terms.termination2')}</p>
              </div>
            </section>

            {/* Changes to Terms */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.changesToTermsTitle')}
              </h2>
              <div className="space-y-2 text-gray-600 dark:text-gray-300">
                <p>{t('terms.changesToTerms1')}</p>
                <p>{t('terms.changesToTerms2')}</p>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.governingLawTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                {t('terms.governingLaw1')}
              </p>
            </section>

            {/* Contact */}
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                {t('terms.contactTitle')}
              </h2>
              <p className="text-gray-600 dark:text-gray-300 mb-2">
                {t('terms.contact1')}
              </p>
              <a
                href={`mailto:${t('terms.contactEmail')}`}
                className="text-violet-600 dark:text-violet-400 underline hover:underline font-medium"
              >
                {t('terms.contactEmail')}
              </a>
            </section>
          </div>
        </div>

        {/* Footer link */}
        <div className="text-center mt-8">
          <Link
            href="/privacy"
            className="text-sm text-gray-500 dark:text-gray-400 underline hover:text-violet-600 dark:hover:text-violet-400 hover:underline"
          >
            {t('privacyTitle')}
          </Link>
        </div>
      </div>
    </div>
  )
}
