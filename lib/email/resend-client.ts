/**
 * Resend Email Client
 *
 * Wrapper around Resend SDK for sending emails.
 */

import { Resend } from 'resend'

let resendClient: Resend | null = null

function getClient(): Resend {
  if (!resendClient) {
    const apiKey = process.env.RESEND_API_KEY
    if (!apiKey) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }
    resendClient = new Resend(apiKey)
  }
  return resendClient
}

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'NoteSnap <reports@notesnap.app>'

export interface SendEmailParams {
  to: string
  subject: string
  html: string
  replyTo?: string
}

export interface SendEmailResult {
  success: boolean
  id?: string
  error?: string
}

/**
 * Send an email using Resend
 */
export async function sendEmail(params: SendEmailParams): Promise<SendEmailResult> {
  try {
    const client = getClient()

    const { data, error } = await client.emails.send({
      from: FROM_EMAIL,
      to: [params.to],
      subject: params.subject,
      html: params.html,
      replyTo: params.replyTo,
    })

    if (error) {
      console.error('[Email] Resend error:', error)
      return { success: false, error: error.message }
    }

    return { success: true, id: data?.id }
  } catch (err) {
    console.error('[Email] Send error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown email error',
    }
  }
}
