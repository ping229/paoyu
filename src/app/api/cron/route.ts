import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEmailConfig, sendTimeMail } from '@/lib/email'

// 配置
const BATCH_SIZE = 10 // 每次最多处理邮件数
const MAX_RETRIES = 3 // 最大重试次数

export async function GET(request: NextRequest) {
  const startTime = Date.now()

  try {
    // 验证
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET || 'cron-secret'

    if (authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const now = new Date()
    const results = []

    // 1. 处理泡泡定时任务（分批）
    const dueTasks = await prisma.scheduledTask.findMany({
      where: {
        isSent: false,
        scheduledAt: { lte: now }
      },
      take: BATCH_SIZE // 限制每次处理数量
    })

    for (const task of dueTasks) {
      try {
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

    // 2. 处理时光邮件（分批 + 异步）
    const emailConfig = await getEmailConfig()

    if (emailConfig) {
      // 只取未发送且到期的邮件，按时间排序，限制数量
      const dueMails = await prisma.timeMail.findMany({
        where: {
          isSent: false,
          scheduledAt: { lte: now }
        },
        orderBy: { scheduledAt: 'asc' },
        take: BATCH_SIZE
      })

      // 并发发送邮件（但限制并发数）
      const sendPromises = dueMails.map(async (mail) => {
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
              data: { isSent: true, sentAt: now, lastError: null }
            })
            return { taskId: mail.id, type: 'timeMail', status: 'completed' }
          } else {
            // 发送失败，记录错误并增加重试计数
            const newRetryCount = mail.retryCount + 1
            const shouldGiveUp = newRetryCount >= MAX_RETRIES

            await prisma.timeMail.update({
              where: { id: mail.id },
              data: {
                retryCount: newRetryCount,
                lastError: result.error?.slice(0, 500), // 限制错误信息长度
                // 超过重试次数则标记为已发送（放弃）
                ...(shouldGiveUp && { isSent: true, sentAt: now })
              }
            })

            return {
              taskId: mail.id,
              type: 'timeMail',
              status: shouldGiveUp ? 'abandoned' : 'failed',
              error: result.error,
              retryCount: newRetryCount
            }
          }
        } catch (error) {
          console.error(`Send mail ${mail.id} error:`, error)

          const newRetryCount = mail.retryCount + 1
          const shouldGiveUp = newRetryCount >= MAX_RETRIES

          await prisma.timeMail.update({
            where: { id: mail.id },
            data: {
              retryCount: newRetryCount,
              lastError: String(error).slice(0, 500),
              ...(shouldGiveUp && { isSent: true, sentAt: now })
            }
          })

          return {
            taskId: mail.id,
            type: 'timeMail',
            status: shouldGiveUp ? 'abandoned' : 'failed',
            error: String(error),
            retryCount: newRetryCount
          }
        }
      })

      // 等待所有邮件发送完成
      const mailResults = await Promise.all(sendPromises)
      results.push(...mailResults)
    }

    const duration = Date.now() - startTime

    return NextResponse.json({
      success: true,
      data: {
        processedAt: now,
        tasksProcessed: results.length,
        duration: `${duration}ms`,
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
