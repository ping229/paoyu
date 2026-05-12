import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { getEmailConfig, sendTimeMail } from '@/lib/email'

// 审核时光邮件
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { ids, id, action } = body // action: 'approve' or 'reject'

    const mailIds = ids || (id ? [id] : [])
    if (mailIds.length === 0) {
      return NextResponse.json({ error: '缺少邮件ID' }, { status: 400 })
    }

    if (action !== 'approve' && action !== 'reject') {
      return NextResponse.json({ error: '无效的操作' }, { status: 400 })
    }

    const now = new Date()
    const results = []

    // 获取邮件列表
    const mails = await prisma.timeMail.findMany({
      where: {
        id: { in: mailIds },
        status: 'pending'
      }
    })

    if (action === 'approve') {
      // 审核通过
      const emailConfig = await getEmailConfig()

      for (const mail of mails) {
        try {
          // 如果已过发送时间且有邮件配置，立即发送
          if (mail.scheduledAt <= now && emailConfig) {
            const result = await sendTimeMail(
              mail.toEmail,
              mail.subject,
              mail.content,
              mail.senderName,
              emailConfig
            )

            if (result.success) {
              // 计算公开时间
              const oneMonthLater = new Date(mail.createdAt)
              oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
              const publicAt = mail.isPublic ? (now < oneMonthLater ? oneMonthLater : now) : null

              await prisma.timeMail.update({
                where: { id: mail.id },
                data: {
                  status: 'sent',
                  isSent: true,
                  sentAt: now,
                  reviewedAt: now,
                  reviewedBy: payload.userId,
                  publicAt
                }
              })
              results.push({ id: mail.id, status: 'sent' })
            } else {
              // 发送失败
              await prisma.timeMail.update({
                where: { id: mail.id },
                data: {
                  status: 'approved',
                  reviewedAt: now,
                  reviewedBy: payload.userId,
                  lastError: result.error?.slice(0, 500)
                }
              })
              results.push({ id: mail.id, status: 'approved', error: result.error })
            }
          } else {
            // 未到发送时间或无邮件配置，仅标记为已审核
            await prisma.timeMail.update({
              where: { id: mail.id },
              data: {
                status: 'approved',
                reviewedAt: now,
                reviewedBy: payload.userId
              }
            })
            results.push({ id: mail.id, status: 'approved' })
          }
        } catch (error) {
          console.error(`Approve mail ${mail.id} error:`, error)
          results.push({ id: mail.id, status: 'error', error: String(error) })
        }
      }
    } else {
      // 审核拒绝
      await prisma.timeMail.updateMany({
        where: {
          id: { in: mails.map(m => m.id) }
        },
        data: {
          status: 'rejected',
          reviewedAt: now,
          reviewedBy: payload.userId
        }
      })

      for (const mail of mails) {
        results.push({ id: mail.id, status: 'rejected' })
      }
    }

    return NextResponse.json({
      success: true,
      message: `成功${action === 'approve' ? '通过' : '拒绝'} ${mails.length} 封邮件`,
      results
    })
  } catch (error) {
    console.error('Review time mail error:', error)
    return NextResponse.json({ error: '审核失败' }, { status: 500 })
  }
}
