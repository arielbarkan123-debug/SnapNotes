import { type MetadataRoute } from 'next'

const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://notesnap.app'

// Static date — update this when page content meaningfully changes
const LAST_MODIFIED = new Date('2026-03-31')
const LAST_MODIFIED_YEARLY = new Date('2026-01-01')

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: baseUrl,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 1,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/signup`,
      lastModified: LAST_MODIFIED,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/privacy`,
      lastModified: LAST_MODIFIED_YEARLY,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/terms`,
      lastModified: LAST_MODIFIED_YEARLY,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
    {
      url: `${baseUrl}/forgot-password`,
      lastModified: LAST_MODIFIED_YEARLY,
      changeFrequency: 'yearly',
      priority: 0.3,
    },
  ]
}
