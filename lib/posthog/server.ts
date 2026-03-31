import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!key) return null

  if (!_client) {
    _client = new PostHog(key, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }

  return _client
}

/**
 * Capture a server-side event.
 * Safe to call even if PostHog is not configured — returns silently.
 */
export function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
): void {
  const client = getServerPostHog()
  if (!client) return
  client.capture({ distinctId, event, properties })
}
