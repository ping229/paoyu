import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取 AI 调用日志
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

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const aiConfigId = searchParams.get('aiConfigId')
    const status = searchParams.get('status')
    const limit = 50
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {}
    if (aiConfigId) {
      where.aiConfigId = aiConfigId
    }
    if (status) {
      where.status = status
    }

    const [logs, total] = await Promise.all([
      prisma.aILog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          aiConfig: {
            select: { name: true }
          }
        }
      }),
      prisma.aILog.count({ where })
    ])

    // 统计
    const stats = await Promise.all([
      prisma.aILog.count({ where: { status: 'success' } }),
      prisma.aILog.count({ where: { status: 'failed' } }),
      prisma.aILog.count()
    ])

    return NextResponse.json({
      success: true,
      data: {
        logs,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: {
          success: stats[0],
          failed: stats[1],
          total: stats[2]
        }
      }
    })
  } catch (error) {
    console.error('Get AI logs error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
