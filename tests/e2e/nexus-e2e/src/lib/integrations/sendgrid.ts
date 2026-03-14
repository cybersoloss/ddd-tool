// SendGrid email integration client
import sgMail from '@sendgrid/mail'
import { config } from '@/config'
import { createError } from '@/errors'
import { logger } from '@/utils/logger'

sgMail.setApiKey(config.SENDGRID_API_KEY)

export interface EmailMessage {
  to: string | string[]
  from?: string
  subject: string
  text?: string
  html?: string
  templateId?: string
  dynamicTemplateData?: Record<string, unknown>
}

export const sendgridClient = {
  sendEmail: async (msg: EmailMessage) => {
    try {
      await sgMail.send({
        to: msg.to,
        from: msg.from ?? 'noreply@nexus.example.com',
        subject: msg.subject,
        text: msg.text ?? msg.html ?? ' ',
        html: msg.html,
        templateId: msg.templateId,
        dynamicTemplateData: msg.dynamicTemplateData,
      } as any)
      logger.info({ to: msg.to, subject: msg.subject }, 'Email sent via SendGrid')
    } catch (err: any) {
      logger.error({ err, to: msg.to }, 'SendGrid email failed')
      throw createError('SERVICE_UNAVAILABLE', 'Email delivery failed', { service: 'sendgrid' })
    }
  },

  sendBulk: async (messages: EmailMessage[]) => {
    const results = await Promise.allSettled(
      messages.map((msg) => sendgridClient.sendEmail(msg))
    )
    const failed = results.filter((r) => r.status === 'rejected').length
    if (failed > 0) {
      logger.warn({ total: messages.length, failed }, 'Some bulk emails failed')
    }
    return { sent: messages.length - failed, failed }
  },
}
