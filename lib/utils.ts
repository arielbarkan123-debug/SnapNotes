import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function getDateLocale(locale: string): string {
  return locale === 'he' ? 'he-IL' : 'en-US'
}

export function formatDate(date: Date | string, locale?: string): string {
  return new Date(date).toLocaleDateString(locale ? getDateLocale(locale) : 'en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text
  return text.slice(0, maxLength) + '...'
}
