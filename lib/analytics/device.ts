// ============================================================================
// Device Detection Utilities
// ============================================================================

import { DeviceInfo } from './types'

/**
 * Detect device type based on user agent and screen size
 */
export function detectDeviceType(): 'desktop' | 'tablet' | 'mobile' {
  if (typeof window === 'undefined') return 'desktop'

  const ua = navigator.userAgent.toLowerCase()
  const screenWidth = window.innerWidth

  // Check for mobile devices
  const isMobile = /android|webos|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)
  const isTablet = /ipad|android(?!.*mobile)/i.test(ua) || (screenWidth >= 768 && screenWidth < 1024)

  if (isTablet) return 'tablet'
  if (isMobile || screenWidth < 768) return 'mobile'
  return 'desktop'
}

/**
 * Parse browser name and version from user agent
 */
export function detectBrowser(): { name: string; version: string } {
  if (typeof window === 'undefined') return { name: 'unknown', version: 'unknown' }

  const ua = navigator.userAgent
  let name = 'unknown'
  let version = 'unknown'

  // Order matters - check more specific browsers first
  if (ua.includes('Firefox')) {
    name = 'Firefox'
    const match = ua.match(/Firefox\/(\d+(\.\d+)?)/)
    if (match) version = match[1]
  } else if (ua.includes('Edg')) {
    name = 'Edge'
    const match = ua.match(/Edg\/(\d+(\.\d+)?)/)
    if (match) version = match[1]
  } else if (ua.includes('Chrome')) {
    name = 'Chrome'
    const match = ua.match(/Chrome\/(\d+(\.\d+)?)/)
    if (match) version = match[1]
  } else if (ua.includes('Safari')) {
    name = 'Safari'
    const match = ua.match(/Version\/(\d+(\.\d+)?)/)
    if (match) version = match[1]
  } else if (ua.includes('Opera') || ua.includes('OPR')) {
    name = 'Opera'
    const match = ua.match(/(?:Opera|OPR)\/(\d+(\.\d+)?)/)
    if (match) version = match[1]
  }

  return { name, version }
}

/**
 * Detect operating system and version
 */
export function detectOS(): { name: string; version: string } {
  if (typeof window === 'undefined') return { name: 'unknown', version: 'unknown' }

  const ua = navigator.userAgent
  let name = 'unknown'
  let version = 'unknown'

  if (ua.includes('Windows NT 10.0')) {
    name = 'Windows'
    version = '10'
  } else if (ua.includes('Windows NT 6.3')) {
    name = 'Windows'
    version = '8.1'
  } else if (ua.includes('Windows NT 6.2')) {
    name = 'Windows'
    version = '8'
  } else if (ua.includes('Windows NT 6.1')) {
    name = 'Windows'
    version = '7'
  } else if (ua.includes('Mac OS X')) {
    name = 'macOS'
    const match = ua.match(/Mac OS X (\d+[._]\d+([._]\d+)?)/)
    if (match) version = match[1].replace(/_/g, '.')
  } else if (ua.includes('Android')) {
    name = 'Android'
    const match = ua.match(/Android (\d+(\.\d+)?)/)
    if (match) version = match[1]
  } else if (ua.includes('iPhone') || ua.includes('iPad')) {
    name = 'iOS'
    const match = ua.match(/OS (\d+[._]\d+([._]\d+)?)/)
    if (match) version = match[1].replace(/_/g, '.')
  } else if (ua.includes('Linux')) {
    name = 'Linux'
    version = 'unknown'
  } else if (ua.includes('CrOS')) {
    name = 'Chrome OS'
    const match = ua.match(/CrOS \S+ (\d+(\.\d+)?)/)
    if (match) version = match[1]
  }

  return { name, version }
}

/**
 * Get complete device information
 */
export function getDeviceInfo(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'desktop',
      browser: 'unknown',
      browserVersion: 'unknown',
      os: 'unknown',
      osVersion: 'unknown',
      screenWidth: 0,
      screenHeight: 0,
      timezone: 'UTC',
      locale: 'en-US',
    }
  }

  const browser = detectBrowser()
  const os = detectOS()

  return {
    deviceType: detectDeviceType(),
    browser: browser.name,
    browserVersion: browser.version,
    os: os.name,
    osVersion: os.version,
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    locale: navigator.language || 'en-US',
  }
}

/**
 * Get UTM parameters from URL
 */
export function getUTMParams(): { source?: string; medium?: string; campaign?: string } {
  if (typeof window === 'undefined') return {}

  const params = new URLSearchParams(window.location.search)

  return {
    source: params.get('utm_source') || undefined,
    medium: params.get('utm_medium') || undefined,
    campaign: params.get('utm_campaign') || undefined,
  }
}

/**
 * Get referrer information
 */
export function getReferrer(): string | undefined {
  if (typeof window === 'undefined') return undefined
  return document.referrer || undefined
}
