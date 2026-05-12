import nodemailer from 'nodemailer'
import { prisma } from './prisma'

interface EmailConfig {
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_pass: string
  sender_name: string
  sender_email: string
}

export async function getEmailConfig(): Promise<EmailConfig | null> {
  const configs = await prisma.systemConfig.findMany({
    where: {
      key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'sender_name', 'sender_email'] }
    }
  })

  const config: Record<string, string> = {}
  for (const c of configs) {
    config[c.key] = c.value
  }

  if (!config.smtp_host || !config.smtp_user || !config.smtp_pass) {
    return null
  }

  return {
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port || '465',
    smtp_user: config.smtp_user,
    smtp_pass: config.smtp_pass,
    sender_name: config.sender_name || '泡语',
    sender_email: config.sender_email || config.smtp_user,
  }
}

export async function sendTimeMail(
  toEmail: string,
  subject: string,
  content: string,
  senderName: string,
  config: EmailConfig
): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp_host,
      port: parseInt(config.smtp_port) || 465,
      secure: parseInt(config.smtp_port) === 465,
      auth: {
        user: config.smtp_user,
        pass: config.smtp_pass,
      },
    })

    const mailOptions = {
      from: `"${config.sender_name}" <${config.sender_email}>`,
      to: toEmail,
      subject: subject,
      html: `
        <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px 10px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">泡语 - 时光邮件</h1>
          </div>
          <div style="background: #1a1a2e; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="color: #a0a0a0; font-size: 14px; margin-bottom: 10px;">
              来自: ${senderName}
            </p>
            <div style="color: #e0e0e0; font-size: 16px; line-height: 1.8; white-space: pre-wrap;">
              ${content}
            </div>
            <hr style="border: none; border-top: 1px solid #333; margin: 30px 0;">
            <p style="color: #666; font-size: 12px; text-align: center;">
              这是一封来自「泡语」的时光邮件<br>
              请守护彼此的匿名
            </p>
          </div>
        </div>
      `,
    }

    await transporter.sendMail(mailOptions)

    return { success: true }
  } catch (error) {
    console.error('Send email error:', error)
    return { success: false, error: String(error) }
  }
}
