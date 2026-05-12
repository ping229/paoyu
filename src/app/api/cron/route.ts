import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEmailConfig, sendTimeMail } from '@/lib/email'

// 这个端点应该由外部cron服务定期调用
// 或者可以使用Vercel Cron Jobs

export async function GET(request: NextRequest) {
  try {
    // 简单的验证（生产环境应该使用更安全的方式）
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'cron-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = []

    // 1. 处理泡泡定时任务
    const dueTasks = await prisma.scheduledTask.findMany({
      where: {
        isSent: false,
        scheduledAt: { lte: now }
      }
    })

    for (const task of dueTasks) {
      try {
        // 站内发送
        if (task.receiverId) {
          await prisma.messageSet.updateMany({
            where: {
              senderId: task.senderId,
              scheduledAt: task.scheduledAt
            },
            data: {
              isPublic: task.isPublic,
              publicAt: task.isPublic ? now : null
            }
          })
        }

        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { isSent: true }
        })

        results.push({ taskId: task.id, type: 'bubble', status: 'completed' })
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error)
        results.push({ taskId: task.id, type: 'bubble', status: 'failed' })
      }
    }

    // 2. 处理时光邮件
    const emailConfig = await getEmailConfig()

    if (emailConfig) {
      const dueMails = await prisma.timeMail.findMany({
        where: {
          isSent: false,
          scheduledAt: { lte: now }
        }
      })

      for (const mail of dueMails) {
        try {
          const result = await sendTimeMail(
            mail.toEmail,
            mail.subject,
            mail.content,
            mail.senderName,
            emailConfig
          )

          if (result.success) {
            await prisma.timeMail.update({
              where: { id: mail.id },
              data: {
                isSent: true,
                sentAt: now
              }
            })
            results.push({ taskId: mail.id, type: 'timeMail', status: 'completed' })
          } else {
            console.error(`Send mail ${mail.id} failed:`, result.error)
            results.push({ taskId: mail.id, type: 'timeMail', status: 'failed', error: result.error })
          }
        } catch (error) {
          console.error(`Send mail ${mail.id} error:`, error)
          results.push({ taskId: mail.id, type: 'timeMail', status: 'failed' })
        }
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        processedAt: now,
        tasksProcessed: results.length,
        results
      }
    })
  } catch (error) {
    console.error('Cron error:', error)
    return NextResponse.json({
      success: false,
      error: 'Cron job failed'
    }, { status: 500 })
  }
}
