import { getRequestConfig } from 'next-intl/server'
import { cookies } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'

// Import messages statically to avoid dynamic import issues
import enMessages from '../messages/en/index'
import heMessages from '../messages/he/index'

const messagesMap = {
  en: enMessages,
  he: heMessages,
}

export default getRequestConfig(async () => {
  // Get locale from cookie, fallback to default
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value

  // Validate locale
  const locale: Locale = locales.includes(localeCookie as Locale)
    ? (localeCookie as Locale)
    : defaultLocale

  return {
    locale,
    messages: messagesMap[locale]
  }
})
