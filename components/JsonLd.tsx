const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://xplus1.ai'

/**
 * JSON-LD structured data for Google Search rich results.
 * Content is entirely static/server-side — no user input, no XSS risk.
 */
export default function JsonLd() {
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'X+1',
    description:
      'AI-powered learning platform. Upload your notes and homework, get instant AI feedback, practice with personalized questions, and visualize concepts with interactive diagrams.',
    url: APP_URL,
    applicationCategory: 'EducationalApplication',
    applicationSubCategory: 'StudyTool',
    operatingSystem: 'Any',
    isAccessibleForFree: true,
    inLanguage: ['en', 'he'],
    audience: {
      '@type': 'EducationalAudience',
      educationalRole: 'student',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'USD',
    },
    featureList: [
      'AI Homework Checking',
      'Practice Question Generation',
      'Interactive Math Diagrams',
      'Multi-language Support (English, Hebrew)',
      'AI Tutoring Assistant',
      'Spaced Repetition Flashcards',
    ],
    screenshot: `${APP_URL}/og-image.png`,
    author: {
      '@type': 'Organization',
      name: 'X+1',
      url: APP_URL,
      logo: `${APP_URL}/icon-192.png`,
    },
  }

  const websiteSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'X+1',
    url: APP_URL,
  }

  // Safe: content is entirely static, no user input involved
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
      />
    </>
  )
}
