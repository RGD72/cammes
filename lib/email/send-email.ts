'use server'

import { Resend } from 'resend'

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@cammes.app'

export async function sendEmail(params: {
  to: string
  subject: string
  html: string
}): Promise<{ ok: boolean }> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) return { ok: false }
  try {
    const resend = new Resend(apiKey)
    await resend.emails.send({
      from: FROM_EMAIL,
      to: params.to,
      subject: params.subject,
      html: params.html,
    })
    return { ok: true }
  } catch {
    return { ok: false }
  }
}
