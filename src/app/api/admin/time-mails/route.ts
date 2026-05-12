import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取时光邮件列表
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
    const status = searchParams.get('status') // 'pending', 'sent', 'failed', 'all'
    const limit = 20
    const skip = (page - 1) * limit

    // 构建查询条件
    const where: any = {}
    if (status === 'pending') {
      where.isSent = false
    } else if (status === 'sent') {
      where.isSent = true
      where.lastError = null
    } else if (status === 'failed') {
      where.isSent = true
      where.lastError = { not: null }
    }
    // 'all' 不添加条件

    const [mails, total] = await Promise.all([
      prisma.timeMail.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.timeMail.count({ where })
    ])

    // 统计各状态数量
    const stats = await Promise.all([
      prisma.timeMail.count({ where: { isSent: false } }),
      prisma.timeMail.count({ where: { isSent: true, lastError: null } }),
      prisma.timeMail.count({ where: { isSent: true, lastError: { not: null } } }),
      prisma.timeMail.count(),
    ])

    return NextResponse.json({
      success: true,
      data: {
        mails,
        total,
        page,
        totalPages: Math.ceil(total / limit),
        stats: {
          pending: stats[0],
          sent: stats[1],
          failed: stats[2],
          total: stats[3],
        }
      }
    })
  } catch (error) {
    console.error('Get time mails error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 更新邮件状态
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
    const { id, isSent, lastError } = body

    if (!id) {
      return NextResponse.json({ error: '缺少邮件ID' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof isSent === 'boolean') {
      updateData.isSent = isSent
      if (isSent) {
        updateData.sentAt = new Date()
      }
    }
    if (lastError !== undefined) {
      updateData.lastError = lastError
    }

    const mail = await prisma.timeMail.update({
      where: { id },
      data: updateData
    })

    return NextResponse.json({
      success: true,
      data: mail
    })
  } catch (error) {
    console.error('Update time mail error:', error)
    return NextResponse.json({ error: '更新失败' }, { status: 500 })
  }
}
