import { getRequestConfig } from 'next-intl/server'
import { cookies, headers } from 'next/headers'
import { defaultLocale, locales, type Locale } from './config'

// Import messages statically to avoid dynamic import issues
import enMessages from '../messages/en/index'
import heMessages from '../messages/he/index'

const messagesMap = {
  en: enMessages,
  he: heMessages,
}

export default getRequestConfig(async () => {
  const cookieStore = await cookies()
  const localeCookie = cookieStore.get('NEXT_LOCALE')?.value

  let locale: Locale

  if (locales.includes(localeCookie as Locale)) {
    locale = localeCookie as Locale
  } else {
    // Auto-detect from Accept-Language header
    const headerStore = await headers()
    const acceptLang = headerStore.get('accept-language') || ''
    locale = acceptLang.includes('he') ? 'he' : defaultLocale
  }

  return {
    locale,
    messages: messagesMap[locale]
  }
})
