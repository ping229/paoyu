import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEmailConfig, sendTimeMail } from '@/lib/email'
import { generateAICommentsForMessageSet, isAIReplyEnabled } from '@/lib/ai'

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

    // 检查 AI 回复是否启用
    const aiEnabled = await isAIReplyEnabled()

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
        // 更新消息集为公开
        const updatedMessageSets = await prisma.messageSet.updateMany({
          where: {
            senderId: task.senderId,
            scheduledAt: task.scheduledAt
          },
          data: {
            isPublic: task.isPublic,
            publicAt: task.isPublic ? now : null
          }
        })

        // 如果是公开消息且 AI 启用，触发 AI 回复
        if (task.isPublic && aiEnabled && updatedMessageSets.count > 0) {
          // 获取消息集详情
          const messageSets = await prisma.messageSet.findMany({
            where: {
              senderId: task.senderId,
              scheduledAt: task.scheduledAt,
              isPublic: true
            },
            include: {
              messages: true
            }
          })

          for (const ms of messageSets) {
            generateAICommentsForMessageSet(
              ms.id,
              ms.messages.map(m => ({
                type: m.type as 'text' | 'image',
                content: m.content
              }))
            ).catch(err => console.error('AI comment error:', err))
          }
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
      // 只取已审核通过、未发送且到期的邮件，按时间排序，限制数量
      // 排除已标记为resent（补发成功）的邮件
      const dueMails = await prisma.timeMail.findMany({
        where: {
          status: 'approved',
          isSent: false,
          scheduledAt: { lte: now },
          deletedAt: null
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
            // 计算公开时间: min(发送时间, 创建时间+1个月)
            let publicAt = null
            if (mail.isPublic) {
              const oneMonthLater = new Date(mail.createdAt)
              oneMonthLater.setMonth(oneMonthLater.getMonth() + 1)
              publicAt = now < oneMonthLater ? oneMonthLater : now
            }

            await prisma.timeMail.update({
              where: { id: mail.id },
              data: {
                status: 'sent',
                isSent: true,
                sentAt: now,
                lastError: null,
                publicAt
              }
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
                // 超过重试次数则标记为失败
                ...(shouldGiveUp && { status: 'failed', isSent: true, sentAt: now })
              }
            })

            return {
              taskId: mail.id,
              type: 'timeMail',
              status: shouldGiveUp ? 'failed' : 'retry',
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
              ...(shouldGiveUp && { status: 'failed', isSent: true, sentAt: now })
            }
          })

          return {
            taskId: mail.id,
            type: 'timeMail',
            status: shouldGiveUp ? 'failed' : 'retry',
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
