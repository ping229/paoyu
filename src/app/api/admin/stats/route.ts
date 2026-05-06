import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // 活跃交互码数（近7天有活动）
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const activeUsers = await prisma.user.count({
      where: {
        OR: [
          { intercodeUpdatedAt: { gte: sevenDaysAgo } },
          {
            sentMessages: {
              some: { createdAt: { gte: sevenDaysAgo } }
            }
          },
          {
            receivedMessages: {
              some: { createdAt: { gte: sevenDaysAgo } }
            }
          }
        ]
      }
    })

    // 信息集总量
    const totalMessageSets = await prisma.messageSet.count()

    // 定时任务数量
    const pendingTasks = await prisma.scheduledTask.count({
      where: { isSent: false }
    })

    // 待处理举报
    const pendingReports = await prisma.report.count({
      where: { status: 'pending' }
    })

    // 用户总数
    const totalUsers = await prisma.user.count()

    return NextResponse.json({
      success: true,
      data: {
        activeUsers,
        totalMessageSets,
        pendingTasks,
        pendingReports,
        totalUsers
      }
    })
  } catch (error) {
    console.error('Get stats error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
