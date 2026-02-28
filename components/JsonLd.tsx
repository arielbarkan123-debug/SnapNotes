const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

/**
 * JSON-LD structured data for Google Search rich results.
 * Content is entirely static/server-side — no user input, no XSS risk.
 */
export default function JsonLd() {
  const webAppSchema = {
    '@context': 'https://schema.org',
    '@type': 'WebApplication',
    name: 'NoteSnap',
    description:
      'AI-powered homework checker and learning assistant. Upload photos of your homework, get instant AI feedback, practice with personalized questions, and visualize concepts with interactive diagrams.',
    url: APP_URL,
    applicationCategory: 'EducationalApplication',
    operatingSystem: 'Any',
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
    ],
    screenshot: `${APP_URL}/og-image.png`,
    author: {
      '@type': 'Organization',
      name: 'NoteSnap',
      url: APP_URL,
    },
  }

  // Safe: content is entirely static, no user input involved
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppSchema) }}
    />
  )
}
