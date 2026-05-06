import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    // 查找到期的定时任务
    const dueTasks = await prisma.scheduledTask.findMany({
      where: {
        isSent: false,
        scheduledAt: {
          lte: now
        }
      }
    })

    const results = []

    for (const task of dueTasks) {
      try {
        // 站内发送
        if (task.receiverId) {
          // 更新关联的信息集
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

        // 外部邮箱发送（这里可以集成邮件服务）
        if (task.targetEmail) {
          // TODO: 集成邮件发送服务
          // await sendEmail(task.targetEmail, ...)
        }

        // 标记任务已完成
        await prisma.scheduledTask.update({
          where: { id: task.id },
          data: { isSent: true }
        })

        results.push({ taskId: task.id, status: 'completed' })
      } catch (error) {
        console.error(`Task ${task.id} failed:`, error)
        results.push({ taskId: task.id, status: 'failed' })
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
