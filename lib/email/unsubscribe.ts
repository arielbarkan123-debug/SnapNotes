import { createHmac } from 'crypto'

const SECRET = process.env.CRON_SECRET || process.env.NEXTAUTH_SECRET || 'notesnap-unsubscribe-secret'

/**
 * Generate a URL-safe HMAC token for one-click unsubscribe links.
 * Format: base64url(userId:emailType:signature)
 */
export function generateUnsubscribeToken(userId: string, emailType: string): string {
  const payload = `${userId}:${emailType}`
  const sig = createHmac('sha256', SECRET).update(payload).digest('base64url')
  return Buffer.from(`${payload}:${sig}`).toString('base64url')
}

/**
 * Verify and decode an unsubscribe token.
 * Returns null if the token is invalid or tampered.
 */
export function verifyUnsubscribeToken(token: string): { userId: string; emailType: string } | null {
  try {
    const decoded = Buffer.from(token, 'base64url').toString('utf8')
    const parts = decoded.split(':')
    if (parts.length < 3) return null

    const sig = parts.pop()!
    const emailType = parts.pop()!
    const userId = parts.join(':') // handles UUIDs with no colons, but safe either way

    const expectedSig = createHmac('sha256', SECRET).update(`${userId}:${emailType}`).digest('base64url')
    if (sig !== expectedSig) return null

    return { userId, emailType }
  } catch {
    return null
  }
}
